import 'dart:async';

import 'package:app/actions/session_actions.dart';
import 'package:app/api/dictation_api.dart';
import 'package:app/model/session_history_entry.dart';
import 'package:app/store/store.dart';
import 'package:app/theme/app_colors.dart';
import 'package:app/utils/audio_utils.dart';
import 'package:app/utils/log_utils.dart';
import 'package:app/utils/theme_utils.dart';
import 'package:app/widgets/common/app_animated_size.dart';
import 'package:app/widgets/common/app_animated_switcher.dart';
import 'package:app/widgets/common/compression.dart';
import 'package:app/widgets/remote/dictation_cancel_button.dart';
import 'package:app/widgets/remote/dictation_message.dart';
import 'package:app/widgets/remote/dictation_pill.dart';
import 'package:app/widgets/remote/dictation_review_card.dart';
import 'package:flutter_card_swiper/flutter_card_swiper.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_database/firebase_database.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:record/record.dart';

const _holdThreshold = Duration(milliseconds: 250);

final _logger = createNamedLogger('remote_dictation');

enum _DictationMode { waitingForMode, hold, toggle }

class RemoteDictationView extends StatefulWidget {
  const RemoteDictationView({
    super.key,
    required this.sessionId,
    this.onPendingReviewsChanged,
  });

  final String sessionId;
  final ValueChanged<bool>? onPendingReviewsChanged;

  @override
  State<RemoteDictationView> createState() => _RemoteDictationViewState();
}

class _RemoteDictationViewState extends State<RemoteDictationView>
    with AutomaticKeepAliveClientMixin {
  AudioRecorder? _recorder;
  DictationSession? _session;
  StreamSubscription? _audioSub;
  StreamSubscription? _partialSub;
  StreamSubscription<DatabaseEvent>? _historySub;
  StreamSubscription<DatabaseEvent>? _sessionStatusSub;

  double _audioLevel = 0;
  DictationPillStatus _status = DictationPillStatus.idle;
  _DictationMode? _mode;
  Timer? _holdTimer;
  String _partialText = '';
  List<SessionHistoryEntry> _history = const [];
  bool _isLoading = false;
  SessionHistoryEntry? _pendingDenial;
  bool _lastReportedHasPending = false;
  Set<String>? _batchReviewIds;
  final List<String> _bufferedDictations = [];
  final CardSwiperController _swiperController = CardSwiperController();

  bool get _isRecording => _status == DictationPillStatus.recording;
  bool get _isIdle => _status == DictationPillStatus.idle;

  @override
  bool get wantKeepAlive => true;

  @override
  void initState() {
    super.initState();
    _subscribeToHistory();
    _subscribeToStatus();
  }

  @override
  void dispose() {
    _historySub?.cancel();
    _sessionStatusSub?.cancel();
    _swiperController.dispose();
    _cancel();
    super.dispose();
  }

  void _subscribeToHistory() {
    final uid = FirebaseAuth.instance.currentUser?.uid;
    if (uid == null) return;

    final historyRef = FirebaseDatabase.instance.ref(
      'session/$uid/${widget.sessionId}/history',
    );
    _historySub = historyRef.onValue.listen((event) {
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
      if (mounted) {
        setState(() => _history = entries);
        _updateBatchState();
        _reportPendingReviews();
      }
    });
  }

  void _subscribeToStatus() {
    final uid = FirebaseAuth.instance.currentUser?.uid;
    if (uid == null) return;

    final statusRef = FirebaseDatabase.instance.ref(
      'session/$uid/${widget.sessionId}/status',
    );
    _sessionStatusSub = statusRef.onValue.listen((event) {
      final value = event.snapshot.value;
      final loading = value is String && value == 'loading';
      if (mounted && loading != _isLoading) {
        setState(() => _isLoading = loading);
      }
    });
  }

  void _reportPendingReviews() {
    final hasPending = _pendingReviews.isNotEmpty;
    if (hasPending == _lastReportedHasPending) return;
    _lastReportedHasPending = hasPending;
    widget.onPendingReviewsChanged?.call(hasPending);
  }

  void _updateBatchState() {
    final pending = _pendingReviews;

    if (_batchReviewIds == null && pending.isNotEmpty) {
      _batchReviewIds = pending.map((e) => e.id!).toSet();
      return;
    }

    if (_batchReviewIds == null) return;

    for (final p in pending) {
      if (p.id != null) _batchReviewIds!.add(p.id!);
    }

    if (pending.isEmpty) {
      _compileAndSendBatch();
      _batchReviewIds = null;
      _bufferedDictations.clear();
    }
  }

  void _compileAndSendBatch() {
    final ids = _batchReviewIds;
    if (ids == null) return;

    final reviewsInBatch = _history
        .where((e) => e.id != null && ids.contains(e.id))
        .toList()
      ..sort((a, b) => a.time.compareTo(b.time));
    final denied = reviewsInBatch
        .where((e) => e.status == SessionHistoryEntryStatus.denied)
        .toList();

    final dictations = _bufferedDictations
        .map((d) => d.trim())
        .where((d) => d.isNotEmpty)
        .toList();

    if (denied.isEmpty && dictations.isEmpty) return;

    final buf = StringBuffer();
    if (denied.isNotEmpty) {
      buf.writeln('Sounds good, but a few things:');
      buf.writeln();
      for (final d in denied) {
        buf.writeln('Feedback: ${d.message}');
        buf.writeln('Answer: ${d.response ?? ''}');
        buf.writeln();
      }
    } else if (dictations.isNotEmpty) {
      buf.writeln('Everything looks good.');
      buf.writeln();
    }

    if (dictations.isNotEmpty) {
      buf.writeln(dictations.join('\n\n'));
    }

    final message = buf.toString().trim();
    if (message.isEmpty) return;

    unawaited(sendPasteText(widget.sessionId, message));
  }

  Future<void> _startRecording() async {
    if (_isRecording) return;

    setState(() => _status = DictationPillStatus.recording);

    try {
      _recorder = AudioRecorder();
      _session = await createDictationSession();

      final glossary = getAppState().termById.values
          .map((t) => t.sourceValue)
          .toList();
      final language = getAppState().activeDictationLanguage;

      await _session!.start(
        sampleRate: 16000,
        glossary: glossary,
        language: language,
      );

      final stream = await _recorder!.startStream(
        const RecordConfig(
          encoder: AudioEncoder.pcm16bits,
          sampleRate: 16000,
          numChannels: 1,
        ),
      );

      _audioSub = stream.listen((chunk) {
        _session?.sendAudio(chunk);
        final level = computeAudioLevel(chunk);
        if (mounted) setState(() => _audioLevel = level);
      });

      _partialSub = _session!.partialTranscripts.listen((text) {
        if (mounted) setState(() => _partialText = text);
      });
    } catch (e) {
      _logger.e('Failed to start recording: $e');
      _cancel();
    }
  }

  Future<void> _stopRecording() async {
    if (!_isRecording) return;

    final recorder = _recorder;
    final session = _session;
    final audioSub = _audioSub;
    final partialSub = _partialSub;

    _recorder = null;
    _session = null;
    _audioSub = null;
    _partialSub = null;

    setState(() {
      _status = DictationPillStatus.idle;
      _audioLevel = 0;
      _partialText = '';
    });

    unawaited(_finalizeInBackground(recorder, session, audioSub, partialSub));
  }

  Future<void> _finalizeInBackground(
    AudioRecorder? recorder,
    DictationSession? session,
    StreamSubscription? audioSub,
    StreamSubscription? partialSub,
  ) async {
    final denial = _pendingDenial;
    _pendingDenial = null;

    try {
      await recorder?.stop();
      await audioSub?.cancel();
      await partialSub?.cancel();

      if (session == null) return;
      final result = await session.finalize();
      final text = result.text.trim();
      if (text.isEmpty) return;

      if (denial != null) {
        await updateHistoryEntry(
          sessionId: widget.sessionId,
          entry: denial.produce((d) {
            d.status = SessionHistoryEntryStatus.denied;
            d.response = text;
          }),
        );
      } else if (_batchReviewIds != null) {
        _bufferedDictations.add(text);
      } else {
        await sendPasteText(widget.sessionId, text);
      }
    } catch (e) {
      _logger.e('Failed to finalize: $e');
    } finally {
      session?.dispose();
      recorder?.dispose();
    }
  }

  void _cancelRecording() {
    if (!_isRecording) return;

    final recorder = _recorder;
    final session = _session;
    final audioSub = _audioSub;
    final partialSub = _partialSub;
    final wasDenying = _pendingDenial != null;

    _recorder = null;
    _session = null;
    _audioSub = null;
    _partialSub = null;
    _mode = null;
    _holdTimer?.cancel();
    _pendingDenial = null;

    if (wasDenying) {
      _swiperController.undo();
    }

    setState(() {
      _status = DictationPillStatus.idle;
      _audioLevel = 0;
      _partialText = '';
    });

    unawaited(() async {
      try {
        await recorder?.stop();
        await audioSub?.cancel();
        await partialSub?.cancel();
      } catch (_) {}
      session?.dispose();
      recorder?.dispose();
    }());
  }

  void _cancel() {
    _holdTimer?.cancel();
    _audioSub?.cancel();
    _partialSub?.cancel();
    _recorder?.stop().catchError((_) => '');
    _recorder?.dispose();
    _session?.dispose();
    _recorder = null;
    _session = null;
    _mode = null;
    _audioLevel = 0;
    _partialText = '';
  }

  void _onTapDown(TapDownDetails _) {
    HapticFeedback.mediumImpact();
    if (_isIdle) {
      _mode = _DictationMode.waitingForMode;
      _startRecording();
      _holdTimer = Timer(_holdThreshold, () {
        if (_mode == _DictationMode.waitingForMode) {
          HapticFeedback.mediumImpact();
          setState(() => _mode = _DictationMode.hold);
        }
      });
    } else if (_mode == _DictationMode.toggle) {
      _stopRecording();
      _mode = null;
    }
  }

  void _onTapUp(TapUpDetails _) {
    if (_mode == _DictationMode.waitingForMode) {
      _holdTimer?.cancel();
      setState(() => _mode = _DictationMode.toggle);
    } else if (_mode == _DictationMode.hold) {
      HapticFeedback.lightImpact();
      _stopRecording();
      _mode = null;
    }
  }

  void _onTapCancel() {
    _holdTimer?.cancel();
    if (_mode == _DictationMode.waitingForMode ||
        _mode == _DictationMode.hold) {
      _stopRecording();
      _mode = null;
    }
  }

  List<SessionHistoryEntry> get _pendingReviews => _history
      .where(
        (e) =>
            e.type == SessionHistoryEntryType.review &&
            e.status == null &&
            e.id != null,
      )
      .toList();

  void _approveReview(SessionHistoryEntry entry) {
    final approved = entry.produce(
      (d) => d.status = SessionHistoryEntryStatus.approved,
    );
    unawaited(
      updateHistoryEntry(sessionId: widget.sessionId, entry: approved),
    );
  }

  void _denyReview(SessionHistoryEntry entry) {
    _pendingDenial = entry;
    _mode = _DictationMode.toggle;
    _startRecording();
  }

  @override
  Widget build(BuildContext context) {
    super.build(context);

    final theme = Theme.of(context);
    final colors = context.colors;
    final hasHistory =
        _partialText.isNotEmpty || _history.isNotEmpty || _isLoading;
    final pendingReviews = _pendingReviews;
    final showReviewButtons = pendingReviews.isNotEmpty && !_isRecording;
    final denying = _pendingDenial != null;

    return Column(
      children: [
        Expanded(
          flex: 3,
          child: ShaderMask(
            shaderCallback: (bounds) => LinearGradient(
              begin: Alignment.topCenter,
              end: Alignment.bottomCenter,
              colors: const [
                Colors.transparent,
                Colors.black,
                Colors.black,
                Colors.transparent,
              ],
              stops: const [0, 0.04, 0.96, 1],
            ).createShader(bounds),
            blendMode: BlendMode.dstIn,
            child: hasHistory
                ? _buildHistory()
                : _buildEmptyState(theme, colors),
          ),
        ),
        Expanded(
          child: AppAnimatedSwitcher(
            child: showReviewButtons
                ? Row(
                    key: const ValueKey('review-buttons'),
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      _ReviewActionButton(
                        icon: Icons.close_rounded,
                        background: colors.error,
                        foreground: colors.onError,
                        onTap: () => _swiperController.swipe(
                          CardSwiperDirection.left,
                        ),
                      ),
                      const SizedBox(width: 24),
                      _ReviewActionButton(
                        icon: Icons.check_rounded,
                        background: colors.success,
                        foreground: colors.onSuccess,
                        onTap: () => _swiperController.swipe(
                          CardSwiperDirection.right,
                        ),
                      ),
                    ],
                  )
                : Column(
                    key: const ValueKey('pill-area'),
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      AppAnimatedSize(
                        child: denying
                            ? Padding(
                                padding: const EdgeInsets.only(bottom: 16),
                                child: Text(
                                  'Describe what you want changed',
                                  style: theme.textTheme.bodyMedium?.copyWith(
                                    color: theme.colorScheme.onSurface
                                        .withValues(alpha: 0.7),
                                  ),
                                ),
                              )
                            : const SizedBox.shrink(),
                      ),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          DictationPill(
                            status: _status,
                            audioLevel: _audioLevel,
                            onTapDown: _onTapDown,
                            onTapUp: _onTapUp,
                            onTapCancel: _onTapCancel,
                          ),
                          AppAnimatedSize(
                            child: AppAnimatedSwitcher(
                              child: _isRecording
                                  ? Padding(
                                      key: const ValueKey('cancel'),
                                      padding: const EdgeInsets.only(left: 12),
                                      child: DictationCancelButton(
                                        onTap: _cancelRecording,
                                      ),
                                    )
                                  : const SizedBox.shrink(
                                      key: ValueKey('cancel-empty'),
                                    ),
                            ),
                          ),
                        ],
                      ),
                    ],
                  ),
          ),
        ),
      ],
    );
  }

  Widget _buildEmptyState(ThemeData theme, AppColors colors) {
    return Center(
      child: Padding(
        padding: Theming.padding.copyWith(top: 32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            Icon(
              Icons.airplay_rounded,
              size: 72,
              color: theme.colorScheme.onSurface.withValues(alpha: 0.4),
            ),
            const SizedBox(height: 32),
            Text(
              'Air Transcription',
              style: theme.textTheme.headlineSmall?.copyWith(
                color: theme.colorScheme.onSurface.withValues(alpha: 0.4),
              ),
            ),
            const SizedBox(height: 16),
            Text(
              'Focus a text field on your desktop then dictate your message over the air.',
              textAlign: TextAlign.center,
              style: theme.textTheme.bodyMedium?.copyWith(
                color: theme.colorScheme.onSurface.withValues(alpha: 0.4),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildHistory() {
    final items = _buildHistoryItems();
    if (_partialText.isNotEmpty) {
      items.add(_HistoryItem.partial(_partialText));
    }
    if (_isLoading) {
      items.add(const _HistoryItem.loading());
    }

    return ListView.separated(
      padding: Theming.padding.copyWith(top: 16, bottom: 16),
      reverse: true,
      itemCount: items.length,
      separatorBuilder: (_, _) => const Divider(height: 1),
      itemBuilder: (context, index) {
        final item = items[items.length - 1 - index];
        return switch (item) {
          _PartialItem(:final text) => DictationMessage(text: text),
          _LoadingItem() => const _LoadingIndicator(),
          _MessageItem(:final entry) => DictationMessage(
            text: entry.message,
            sentAt: entry.sentAt,
          ),
          _ReviewSwiperItem(:final reviews) => Padding(
            padding: const EdgeInsets.symmetric(vertical: 12),
            child: SizedBox(
              height: 220,
              child: CardSwiper(
                controller: _swiperController,
                cardsCount: reviews.length,
                numberOfCardsDisplayed: reviews.length.clamp(1, 3),
                backCardOffset: const Offset(0, 12),
                padding: EdgeInsets.zero,
                isLoop: false,
                allowedSwipeDirection: const AllowedSwipeDirection.only(
                  left: true,
                  right: true,
                ),
                onSwipe: (prev, _, direction) {
                  final entry = reviews[prev];
                  if (direction == CardSwiperDirection.right) {
                    _approveReview(entry);
                  } else if (direction == CardSwiperDirection.left) {
                    _denyReview(entry);
                  }
                  return true;
                },
                cardBuilder: (context, i, percentX, _) => DictationReviewCard(
                  message: reviews[i].message,
                  approveProgress: (percentX / 100).clamp(0.0, 1.0),
                  denyProgress: (-percentX / 100).clamp(0.0, 1.0),
                ),
              ),
            ),
          ),
        };
      },
    );
  }

  List<_HistoryItem> _buildHistoryItems() {
    final items = <_HistoryItem>[];
    var i = 0;
    while (i < _history.length) {
      final entry = _history[i];
      final isPending =
          entry.type == SessionHistoryEntryType.review &&
          entry.status == null &&
          entry.id != null;

      if (isPending) {
        final batch = <SessionHistoryEntry>[];
        while (i < _history.length) {
          final e = _history[i];
          final pending =
              e.type == SessionHistoryEntryType.review &&
              e.status == null &&
              e.id != null;
          if (!pending) break;
          batch.add(e);
          i++;
        }
        items.add(_HistoryItem.swiper(batch));
      } else {
        items.add(_HistoryItem.message(entry));
        i++;
      }
    }
    return items;
  }
}

sealed class _HistoryItem {
  const _HistoryItem();

  factory _HistoryItem.message(SessionHistoryEntry entry) = _MessageItem;
  factory _HistoryItem.partial(String text) = _PartialItem;
  const factory _HistoryItem.loading() = _LoadingItem;
  factory _HistoryItem.swiper(List<SessionHistoryEntry> reviews) =
      _ReviewSwiperItem;
}

class _MessageItem extends _HistoryItem {
  final SessionHistoryEntry entry;
  const _MessageItem(this.entry);
}

class _PartialItem extends _HistoryItem {
  final String text;
  const _PartialItem(this.text);
}

class _LoadingItem extends _HistoryItem {
  const _LoadingItem();
}

class _LoadingIndicator extends StatelessWidget {
  const _LoadingIndicator();

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 4),
      child: Row(
        children: [
          SizedBox(
            width: 16,
            height: 16,
            child: CircularProgressIndicator(
              strokeWidth: 2,
              color: theme.colorScheme.onSurface.withValues(alpha: 0.5),
            ),
          ),
        ],
      ),
    );
  }
}

class _ReviewSwiperItem extends _HistoryItem {
  final List<SessionHistoryEntry> reviews;
  const _ReviewSwiperItem(this.reviews);
}

class _ReviewActionButton extends StatelessWidget {
  const _ReviewActionButton({
    required this.icon,
    required this.background,
    required this.foreground,
    required this.onTap,
  });

  final IconData icon;
  final Color background;
  final Color foreground;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return PressableCompression(
      child: GestureDetector(
        onTapDown: (_) => HapticFeedback.mediumImpact(),
        onTap: onTap,
        child: Container(
          width: DictationPill.height,
          height: DictationPill.height,
          decoration: BoxDecoration(
            shape: BoxShape.circle,
            color: background,
          ),
          child: Icon(icon, size: 36, color: foreground),
        ),
      ),
    );
  }
}
