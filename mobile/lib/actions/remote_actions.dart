import 'dart:async';

import 'package:app/actions/session_actions.dart';
import 'package:app/api/dictation_api.dart';
import 'package:app/model/session_history_entry.dart';
import 'package:app/state/remote_state.dart';
import 'package:app/store/store.dart';
import 'package:app/utils/audio_utils.dart';
import 'package:app/utils/log_utils.dart';
import 'package:app/utils/remote_utils.dart';
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
  });
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

  final wasDenying = session.isDenying;

  _mutateSession(sessionId, (s) {
    s.status = DictationPillStatus.idle;
    s.audioLevel = 0;
    s.partialText = '';
    s.isDenying = false;
  });

  unawaited(
    _finalizeInBackground(
      sessionId: sessionId,
      recorder: recorder,
      dictation: dictation,
      audioSub: audioSub,
      partialSub: partialSub,
      wasDenying: wasDenying,
    ),
  );
}

Future<void> _finalizeInBackground({
  required String sessionId,
  AudioRecorder? recorder,
  DictationSession? dictation,
  StreamSubscription? audioSub,
  StreamSubscription? partialSub,
  required bool wasDenying,
}) async {
  try {
    await recorder?.stop();
    await audioSub?.cancel();
    await partialSub?.cancel();

    if (dictation == null) return;
    final result = await dictation.finalize();
    final text = result.text.trim();
    if (text.isEmpty) return;

    await _routeDictation(sessionId, text, wasDenying: wasDenying);
  } catch (e) {
    _logger.e('Failed to finalize: $e');
  } finally {
    dictation?.dispose();
    recorder?.dispose();
  }
}

Future<void> _routeDictation(
  String sessionId,
  String text, {
  required bool wasDenying,
}) async {
  final turn = activeTurnFor(sessionId, getAppState());

  if (turn == null) {
    await sendPasteText(sessionId, text);
    return;
  }

  if (wasDenying) {
    final reviewIndex = turn.nextPendingReviewIndex;
    if (reviewIndex != null) {
      final updated = _updateReview(
        turn,
        reviewIndex,
        (r) => r.copyWith(
          status: AssistantReviewStatus.denied,
          response: text,
        ),
      );
      await _persistAndMaybeReply(sessionId, updated);
      return;
    }
  }

  final questionIndex = turn.nextPendingQuestionIndex;
  if (questionIndex != null) {
    final updated = _updateQuestion(
      turn,
      questionIndex,
      (q) => q.copyWith(response: text),
    );
    await _persistAndMaybeReply(sessionId, updated);
    return;
  }

  await sendPasteText(sessionId, text);
}

SessionHistoryEntry _updateReview(
  SessionHistoryEntry entry,
  int index,
  AssistantReview Function(AssistantReview) update,
) {
  final list = [...entry.reviewList];
  list[index] = update(list[index]);
  return entry.produce((d) => d.reviews = list);
}

SessionHistoryEntry _updateQuestion(
  SessionHistoryEntry entry,
  int index,
  AssistantQuestion Function(AssistantQuestion) update,
) {
  final list = [...entry.questionList];
  list[index] = update(list[index]);
  return entry.produce((d) => d.questions = list);
}

Future<void> _persistAndMaybeReply(
  String sessionId,
  SessionHistoryEntry entry,
) async {
  await updateHistoryEntry(sessionId: sessionId, entry: entry);
  if (!entry.hasPendingItems) {
    final reply = _compileReply(entry);
    if (reply.isNotEmpty) {
      await sendPasteText(sessionId, reply);
    }
  }
}

String _compileReply(SessionHistoryEntry entry) {
  final denied = entry.reviewList.where((r) => r.isDenied).toList();
  final questions = entry.questionList;
  final hasDenied = denied.isNotEmpty;
  final hasQuestions = questions.isNotEmpty;

  final buf = StringBuffer();

  if (hasDenied) {
    buf.writeln("Let's change a few things:");
    buf.writeln();
    for (final r in denied) {
      buf.writeln('- ${r.message}');
      buf.writeln('  → ${r.response ?? ''}');
    }
  }

  if (hasQuestions) {
    if (buf.isNotEmpty) buf.writeln();
    buf.writeln('Answers:');
    for (final q in questions) {
      buf.writeln('- ${q.message}');
      buf.writeln('  → ${q.response ?? ''}');
    }
  }

  return buf.toString().trim();
}

void cancelRemoteRecording(String sessionId) {
  final runtime = _runtimes[sessionId];
  _mutateSession(sessionId, (s) {
    s.status = DictationPillStatus.idle;
    s.audioLevel = 0;
    s.partialText = '';
    s.isDenying = false;
  });
  if (runtime != null) {
    unawaited(runtime.disposeRecording());
  }
}

Future<void> approveReview(String sessionId, int reviewIndex) async {
  final turn = activeTurnFor(sessionId, getAppState());
  if (turn == null) return;
  final updated = _updateReview(
    turn,
    reviewIndex,
    (r) => r.copyWith(status: AssistantReviewStatus.approved),
  );
  await _persistAndMaybeReply(sessionId, updated);
}

Future<void> denyReview(String sessionId, int reviewIndex) async {
  _mutateSession(sessionId, (s) => s.isDenying = true);
  await startRemoteRecording(sessionId);
}
