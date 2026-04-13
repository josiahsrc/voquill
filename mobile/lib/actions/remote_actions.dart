import 'dart:async';

import 'package:app/actions/session_actions.dart';
import 'package:app/api/dictation_api.dart';
import 'package:app/model/session_history_entry.dart';
import 'package:app/state/remote_state.dart';
import 'package:app/store/store.dart';
import 'package:app/utils/audio_utils.dart';
import 'package:app/utils/log_utils.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_database/firebase_database.dart';
import 'package:record/record.dart';

final _logger = createNamedLogger('remote_actions');

class _RemoteSessionRuntime {
  AudioRecorder? recorder;
  DictationSession? dictation;
  StreamSubscription? audioSub;
  StreamSubscription? partialSub;
  StreamSubscription<DatabaseEvent>? historySub;
  StreamSubscription<DatabaseEvent>? statusSub;

  Future<void> disposeRecording() async {
    try {
      await recorder?.stop();
      await audioSub?.cancel();
      await partialSub?.cancel();
    } catch (_) {}
    dictation?.dispose();
    recorder?.dispose();
    recorder = null;
    dictation = null;
    audioSub = null;
    partialSub = null;
  }

  Future<void> disposeAll() async {
    await historySub?.cancel();
    await statusSub?.cancel();
    historySub = null;
    statusSub = null;
    await disposeRecording();
  }
}

final Map<String, _RemoteSessionRuntime> _runtimes = {};

_RemoteSessionRuntime _runtime(String sessionId) =>
    _runtimes.putIfAbsent(sessionId, () => _RemoteSessionRuntime());

void _mutateSession(
  String sessionId,
  void Function(RemoteSessionStateDraft session) update,
) {
  produceAppState((draft) {
    final session = draft.remote.sessionById[sessionId];
    if (session == null) return;
    update(session);
  });
}

void subscribeToRemoteSession(String sessionId) {
  final uid = FirebaseAuth.instance.currentUser?.uid;
  if (uid == null) return;

  final runtime = _runtime(sessionId);
  runtime.historySub?.cancel();
  runtime.statusSub?.cancel();

  produceAppState((draft) {
    draft.remote.sessionById.putIfAbsent(
      sessionId,
      () => const RemoteSessionState().draft(),
    );
  });

  final historyRef = FirebaseDatabase.instance.ref(
    'session/$uid/$sessionId/history',
  );
  runtime.historySub = historyRef.onValue.listen((event) {
    final raw = event.snapshot.value;
    final entries = <SessionHistoryEntry>[];
    if (raw is Map) {
      raw.forEach((key, value) {
        if (value is String) {
          final entry = SessionHistoryEntry.tryDecode(
            value,
            id: key as String?,
          );
          if (entry != null) entries.add(entry);
        }
      });
      entries.sort((a, b) => a.time.compareTo(b.time));
    }
    _ingestHistory(sessionId, entries);
  });

  final statusRef = FirebaseDatabase.instance.ref(
    'session/$uid/$sessionId/status',
  );
  runtime.statusSub = statusRef.onValue.listen((event) {
    final value = event.snapshot.value;
    final loading = value is String && value == 'loading';
    _mutateSession(sessionId, (s) => s.isLoading = loading);
  });
}

Future<void> unsubscribeFromRemoteSession(String sessionId) async {
  final runtime = _runtimes.remove(sessionId);
  await runtime?.disposeAll();

  produceAppState((draft) {
    draft.remote.sessionById.remove(sessionId);
  });
}

void _ingestHistory(String sessionId, List<SessionHistoryEntry> entries) {
  String? messageToSend;

  produceAppState((draft) {
    final session = draft.remote.sessionById[sessionId];
    if (session == null) return;

    final previousIds = session.historyIds.toSet();
    final nextIds = <String>[];
    for (final entry in entries) {
      final id = entry.id;
      if (id == null) continue;
      draft.sessionHistoryEntryById[id] = entry.draft();
      nextIds.add(id);
    }
    for (final id in previousIds) {
      if (!nextIds.contains(id)) {
        draft.sessionHistoryEntryById.remove(id);
      }
    }
    session.historyIds = nextIds;

    final pending = entries
        .where((e) => e.isPendingReview)
        .map((e) => e.id!)
        .toList();

    if (!session.batching && pending.isNotEmpty) {
      session.batching = true;
      session.batchReviewIds = pending;
    } else if (session.batching) {
      final merged = {...session.batchReviewIds, ...pending};
      session.batchReviewIds = merged.toList();
    }

    if (session.batching && pending.isEmpty) {
      messageToSend = _compileBatchMessage(
        entries: entries,
        batchIds: session.batchReviewIds.toSet(),
        dictations: session.bufferedDictations,
      );
      session.batching = false;
      session.batchReviewIds = [];
      session.bufferedDictations = [];
    }
  });

  final message = messageToSend;
  if (message != null && message.isNotEmpty) {
    unawaited(sendPasteText(sessionId, message));
  }
}

String? _compileBatchMessage({
  required List<SessionHistoryEntry> entries,
  required Set<String> batchIds,
  required List<String> dictations,
}) {
  final reviewsInBatch =
      entries.where((e) => e.id != null && batchIds.contains(e.id)).toList()
        ..sort((a, b) => a.time.compareTo(b.time));
  final denied = reviewsInBatch
      .where((e) => e.status == SessionHistoryEntryStatus.denied)
      .toList();

  final cleanedDictations = dictations
      .map((d) => d.trim())
      .where((d) => d.isNotEmpty)
      .toList();

  if (denied.isEmpty && cleanedDictations.isEmpty) return null;

  final buf = StringBuffer();
  if (denied.isNotEmpty) {
    buf.writeln('Sounds good, but a few things:');
    buf.writeln();
    for (final d in denied) {
      buf.writeln('Feedback: ${d.message}');
      buf.writeln('Answer: ${d.response ?? ''}');
      buf.writeln();
    }
  } else if (cleanedDictations.isNotEmpty) {
    buf.writeln('Everything looks good.');
    buf.writeln();
  }

  if (cleanedDictations.isNotEmpty) {
    buf.writeln(cleanedDictations.join('\n\n'));
  }

  final message = buf.toString().trim();
  return message.isEmpty ? null : message;
}

Future<void> startRemoteRecording(String sessionId) async {
  final state = getAppState();
  if (state.remote.session(sessionId).isRecording) return;

  _mutateSession(sessionId, (s) => s.status = DictationPillStatus.recording);

  final runtime = _runtime(sessionId);
  try {
    final recorder = AudioRecorder();
    final dictation = await createDictationSession();
    runtime.recorder = recorder;
    runtime.dictation = dictation;

    final currentState = getAppState();
    final glossary = currentState.termById.values
        .map((t) => t.sourceValue)
        .toList();
    final language = currentState.activeDictationLanguage;

    await dictation.start(
      sampleRate: 16000,
      glossary: glossary,
      language: language,
    );

    final stream = await recorder.startStream(
      const RecordConfig(
        encoder: AudioEncoder.pcm16bits,
        sampleRate: 16000,
        numChannels: 1,
      ),
    );

    runtime.audioSub = stream.listen((chunk) {
      dictation.sendAudio(chunk);
      final level = computeAudioLevel(chunk);
      _mutateSession(sessionId, (s) => s.audioLevel = level);
    });

    runtime.partialSub = dictation.partialTranscripts.listen((text) {
      _mutateSession(sessionId, (s) => s.partialText = text);
    });
  } catch (e) {
    _logger.e('Failed to start recording: $e');
    cancelRemoteRecording(sessionId);
  }
}

Future<void> stopRemoteRecording(String sessionId) async {
  final session = getAppState().remote.session(sessionId);
  if (!session.isRecording) return;

  final runtime = _runtime(sessionId);
  final recorder = runtime.recorder;
  final dictation = runtime.dictation;
  final audioSub = runtime.audioSub;
  final partialSub = runtime.partialSub;
  runtime.recorder = null;
  runtime.dictation = null;
  runtime.audioSub = null;
  runtime.partialSub = null;

  final denialId = session.pendingDenialId;

  _mutateSession(sessionId, (s) {
    s.status = DictationPillStatus.idle;
    s.audioLevel = 0;
    s.partialText = '';
    s.pendingDenialId = null;
  });

  unawaited(
    _finalizeInBackground(
      sessionId: sessionId,
      recorder: recorder,
      dictation: dictation,
      audioSub: audioSub,
      partialSub: partialSub,
      denialId: denialId,
    ),
  );
}

Future<void> _finalizeInBackground({
  required String sessionId,
  AudioRecorder? recorder,
  DictationSession? dictation,
  StreamSubscription? audioSub,
  StreamSubscription? partialSub,
  String? denialId,
}) async {
  try {
    await recorder?.stop();
    await audioSub?.cancel();
    await partialSub?.cancel();

    if (dictation == null) return;
    final result = await dictation.finalize();
    final text = result.text.trim();
    if (text.isEmpty) return;

    final denial = denialId != null
        ? getAppState().sessionHistoryEntryById[denialId]
        : null;

    if (denial != null) {
      await updateHistoryEntry(
        sessionId: sessionId,
        entry: denial.produce((d) {
          d.status = SessionHistoryEntryStatus.denied;
          d.response = text;
        }),
      );
    } else if (getAppState().remote.session(sessionId).batching) {
      _mutateSession(sessionId, (s) {
        s.bufferedDictations = [...s.bufferedDictations, text];
      });
    } else {
      await sendPasteText(sessionId, text);
    }
  } catch (e) {
    _logger.e('Failed to finalize: $e');
  } finally {
    dictation?.dispose();
    recorder?.dispose();
  }
}

void cancelRemoteRecording(String sessionId) {
  final runtime = _runtimes[sessionId];
  _mutateSession(sessionId, (s) {
    s.status = DictationPillStatus.idle;
    s.audioLevel = 0;
    s.partialText = '';
    s.pendingDenialId = null;
  });
  if (runtime != null) {
    unawaited(runtime.disposeRecording());
  }
}

void approveReview(String sessionId, SessionHistoryEntry entry) {
  final approved = entry.produce(
    (d) => d.status = SessionHistoryEntryStatus.approved,
  );
  unawaited(updateHistoryEntry(sessionId: sessionId, entry: approved));
}

void denyReview(String sessionId, SessionHistoryEntry entry) {
  _mutateSession(sessionId, (s) => s.pendingDenialId = entry.id);
  startRemoteRecording(sessionId);
}
