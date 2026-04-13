import 'dart:async';

import 'package:animations/animations.dart';
import 'package:app/actions/remote_actions.dart';
import 'package:app/model/session_history_entry.dart';
import 'package:app/state/remote_state.dart';
import 'package:app/store/store.dart';
import 'package:app/utils/remote_utils.dart';
import 'package:app/widgets/remote/dictation_pill_area.dart';
import 'package:app/widgets/remote/dictation_review_actions.dart';
import 'package:app/widgets/remote/dictation_review_card.dart';
import 'package:app/widgets/remote/focus_prompt_view.dart';
import 'package:flutter/material.dart';
import 'package:flutter_card_swiper/flutter_card_swiper.dart';

const _holdThreshold = Duration(milliseconds: 250);

enum _DictationMode { waitingForMode, hold, toggle }

enum _Phase { review, denyReview, question, done }

class RemoteReviewFullscreen extends StatefulWidget {
  const RemoteReviewFullscreen({super.key, required this.sessionId});

  final String sessionId;

  @override
  State<RemoteReviewFullscreen> createState() => _RemoteReviewFullscreenState();
}

class _RemoteReviewFullscreenState extends State<RemoteReviewFullscreen> {
  _DictationMode? _mode;
  Timer? _holdTimer;
  final CardSwiperController _swiperController = CardSwiperController();
  bool _popped = false;

  @override
  void dispose() {
    _holdTimer?.cancel();
    _swiperController.dispose();
    if (getAppState().remote.session(widget.sessionId).isRecording) {
      cancelRemoteRecording(widget.sessionId);
    }
    super.dispose();
  }

  RemoteSessionState _session() =>
      getAppState().remote.session(widget.sessionId);

  void _onTapDown(TapDownDetails _) {
    final session = _session();
    if (session.isIdle) {
      _mode = _DictationMode.waitingForMode;
      startRemoteRecording(widget.sessionId, context: DictationContext.review);
      _holdTimer = Timer(_holdThreshold, () {
        if (_mode == _DictationMode.waitingForMode && mounted) {
          setState(() => _mode = _DictationMode.hold);
        }
      });
    } else if (_mode == _DictationMode.toggle) {
      stopRemoteRecording(widget.sessionId, target: DictationTarget.activeTurn);
      _mode = null;
    }
  }

  void _onTapUp(TapUpDetails _) {
    if (_mode == _DictationMode.waitingForMode) {
      _holdTimer?.cancel();
      setState(() => _mode = _DictationMode.toggle);
    } else if (_mode == _DictationMode.hold) {
      stopRemoteRecording(widget.sessionId, target: DictationTarget.activeTurn);
      _mode = null;
    }
  }

  void _onTapCancel() {
    _holdTimer?.cancel();
    if (_mode == _DictationMode.waitingForMode ||
        _mode == _DictationMode.hold) {
      cancelRemoteRecording(widget.sessionId);
      _mode = null;
    }
  }

  void _handleCancel() {
    final wasDenying = _session().isDenying;
    _holdTimer?.cancel();
    _mode = null;
    cancelRemoteRecording(widget.sessionId);
    if (wasDenying) _swiperController.undo();
  }

  void _handleSwipe(int reviewIndex, CardSwiperDirection direction) {
    if (direction == CardSwiperDirection.right) {
      approveReview(widget.sessionId, reviewIndex);
    } else if (direction == CardSwiperDirection.left) {
      _mode = _DictationMode.toggle;
      denyReview(widget.sessionId, reviewIndex);
    }
  }

  _Phase _resolvePhase(
    RemoteSessionState session,
    SessionHistoryEntry? activeTurn,
  ) {
    if (activeTurn == null || !activeTurn.hasPendingItems) return _Phase.done;
    if (session.isDenying) return _Phase.denyReview;
    if (activeTurn.nextPendingReviewIndex != null) return _Phase.review;
    return _Phase.question;
  }

  @override
  Widget build(BuildContext context) {
    final session = useAppStore().select(
      context,
      (s) => s.remote.session(widget.sessionId),
    );
    final activeTurn = useAppStore().select(
      context,
      (s) => activeTurnFor(widget.sessionId, s),
    );

    final phase = _resolvePhase(session, activeTurn);

    if (phase == _Phase.done && !_popped) {
      _popped = true;
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (mounted) Navigator.of(context).maybePop();
      });
    }

    final theme = Theme.of(context);
    final reviewRecording = session.isRecordingFor(DictationContext.review);
    final showReviewButtons = phase == _Phase.review && !reviewRecording;

    return Scaffold(
      backgroundColor: theme.colorScheme.surface,
      body: SafeArea(
        child: Column(
          children: [
            Align(
              alignment: Alignment.topRight,
              child: Padding(
                padding: const EdgeInsets.all(8),
                child: IconButton(
                  icon: const Icon(Icons.close_rounded),
                  onPressed: () => Navigator.of(context).maybePop(),
                ),
              ),
            ),
            Expanded(
              flex: 3,
              child: PageTransitionSwitcher(
                duration: const Duration(milliseconds: 320),
                transitionBuilder: (child, primary, secondary) =>
                    SharedAxisTransition(
                      animation: primary,
                      secondaryAnimation: secondary,
                      transitionType: SharedAxisTransitionType.horizontal,
                      fillColor: Colors.transparent,
                      child: child,
                    ),
                child: _buildBody(phase, session, activeTurn),
              ),
            ),
            Expanded(
              child: PageTransitionSwitcher(
                duration: const Duration(milliseconds: 180),
                transitionBuilder: (child, primary, secondary) =>
                    FadeThroughTransition(
                      animation: primary,
                      secondaryAnimation: secondary,
                      fillColor: Colors.transparent,
                      child: child,
                    ),
                child: showReviewButtons
                    ? DictationReviewActions(
                        key: const ValueKey('review-buttons'),
                        swiperController: _swiperController,
                      )
                    : DictationPillArea(
                        key: const ValueKey('pill-area'),
                        status: session.statusFor(DictationContext.review),
                        audioLevel: session.audioLevelFor(
                          DictationContext.review,
                        ),
                        isRecording: reviewRecording,
                        onTapDown: _onTapDown,
                        onTapUp: _onTapUp,
                        onTapCancel: _onTapCancel,
                        onCancelRecording: _handleCancel,
                      ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Widget _buildBody(
    _Phase phase,
    RemoteSessionState session,
    SessionHistoryEntry? activeTurn,
  ) {
    if (activeTurn == null) {
      return const SizedBox.shrink(key: ValueKey('empty'));
    }

    switch (phase) {
      case _Phase.review:
        final startIndex = activeTurn.nextPendingReviewIndex ?? 0;
        return _ReviewSwiperArea(
          key: ValueKey('review-${activeTurn.id}'),
          reviews: activeTurn.reviewList,
          startIndex: startIndex,
          controller: _swiperController,
          onSwipe: _handleSwipe,
        );
      case _Phase.denyReview:
        final idx = activeTurn.nextPendingReviewIndex ?? 0;
        return FocusPromptView(
          key: ValueKey('deny-${activeTurn.id}-$idx'),
          label: 'What should change',
          prompt: activeTurn.reviewList[idx].message,
          partialText: session.partialTextFor(DictationContext.review),
        );
      case _Phase.question:
        final idx = activeTurn.nextPendingQuestionIndex ?? 0;
        return FocusPromptView(
          key: ValueKey('question-${activeTurn.id}-$idx'),
          label: 'Question',
          prompt: activeTurn.questionList[idx].message,
          partialText: session.partialTextFor(DictationContext.review),
        );
      case _Phase.done:
        return const SizedBox.shrink(key: ValueKey('done'));
    }
  }
}

class _ReviewSwiperArea extends StatefulWidget {
  const _ReviewSwiperArea({
    super.key,
    required this.reviews,
    required this.startIndex,
    required this.controller,
    required this.onSwipe,
  });

  final List<AssistantReview> reviews;
  final int startIndex;
  final CardSwiperController controller;
  final void Function(int reviewIndex, CardSwiperDirection direction) onSwipe;

  @override
  State<_ReviewSwiperArea> createState() => _ReviewSwiperAreaState();
}

class _ReviewSwiperAreaState extends State<_ReviewSwiperArea> {
  late final List<_Pending> _pending;

  @override
  void initState() {
    super.initState();
    _pending = [
      for (var i = widget.startIndex; i < widget.reviews.length; i++)
        if (widget.reviews[i].isPending) _Pending(i, widget.reviews[i]),
    ];
  }

  @override
  Widget build(BuildContext context) {
    if (_pending.isEmpty) return const SizedBox.shrink();

    return Padding(
      padding: const EdgeInsets.symmetric(horizontal: 32, vertical: 24),
      child: Column(
        children: [
          Expanded(
            child: CardSwiper(
              duration: const Duration(milliseconds: 150),
              controller: widget.controller,
              cardsCount: _pending.length,
              numberOfCardsDisplayed: _pending.length.clamp(1, 3),
              backCardOffset: const Offset(0, 20),
              padding: EdgeInsets.zero,
              isLoop: false,
              allowedSwipeDirection: const AllowedSwipeDirection.only(
                left: true,
                right: true,
              ),
              onSwipe: (prev, _, direction) {
                widget.onSwipe(_pending[prev].index, direction);
                return true;
              },
              cardBuilder: (context, i, percentX, _) => DictationReviewCard(
                message: _pending[i].review.message,
                approveProgress: (percentX / 100).clamp(0.0, 1.0),
                denyProgress: (-percentX / 100).clamp(0.0, 1.0),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _Pending {
  final int index;
  final AssistantReview review;
  const _Pending(this.index, this.review);
}
