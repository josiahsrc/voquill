import 'dart:async';

import 'package:app/actions/remote_actions.dart';
import 'package:app/model/session_history_entry.dart';
import 'package:app/state/remote_state.dart';
import 'package:app/store/store.dart';
import 'package:app/utils/remote_utils.dart';
import 'package:app/widgets/common/app_animated_switcher.dart';
import 'package:app/widgets/remote/dictation_empty_state.dart';
import 'package:app/widgets/remote/dictation_history.dart';
import 'package:app/widgets/remote/dictation_pill_area.dart';
import 'package:app/widgets/remote/dictation_review_actions.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:flutter_card_swiper/flutter_card_swiper.dart';

const _holdThreshold = Duration(milliseconds: 250);

enum _DictationMode { waitingForMode, hold, toggle }

class RemoteDictationView extends StatefulWidget {
  const RemoteDictationView({super.key, required this.sessionId});

  final String sessionId;

  @override
  State<RemoteDictationView> createState() => _RemoteDictationViewState();
}

class _RemoteDictationViewState extends State<RemoteDictationView>
    with AutomaticKeepAliveClientMixin {
  _DictationMode? _mode;
  Timer? _holdTimer;
  final CardSwiperController _swiperController = CardSwiperController();

  @override
  bool get wantKeepAlive => true;

  @override
  void initState() {
    super.initState();
    subscribeToRemoteSession(widget.sessionId);
  }

  @override
  void dispose() {
    _holdTimer?.cancel();
    _swiperController.dispose();
    unsubscribeFromRemoteSession(widget.sessionId);
    super.dispose();
  }

  RemoteSessionState _session() =>
      getAppState().remote.session(widget.sessionId);

  void _onTapDown(TapDownDetails _) {
    HapticFeedback.mediumImpact();
    final session = _session();
    if (session.isIdle) {
      _mode = _DictationMode.waitingForMode;
      startRemoteRecording(widget.sessionId);
      _holdTimer = Timer(_holdThreshold, () {
        if (_mode == _DictationMode.waitingForMode && mounted) {
          HapticFeedback.mediumImpact();
          setState(() => _mode = _DictationMode.hold);
        }
      });
    } else if (_mode == _DictationMode.toggle) {
      stopRemoteRecording(widget.sessionId);
      _mode = null;
    }
  }

  void _onTapUp(TapUpDetails _) {
    if (_mode == _DictationMode.waitingForMode) {
      _holdTimer?.cancel();
      setState(() => _mode = _DictationMode.toggle);
    } else if (_mode == _DictationMode.hold) {
      HapticFeedback.lightImpact();
      stopRemoteRecording(widget.sessionId);
      _mode = null;
    }
  }

  void _onTapCancel() {
    _holdTimer?.cancel();
    if (_mode == _DictationMode.waitingForMode ||
        _mode == _DictationMode.hold) {
      stopRemoteRecording(widget.sessionId);
      _mode = null;
    }
  }

  void _handleCancel() {
    final wasDenying = _session().pendingDenialId != null;
    _holdTimer?.cancel();
    _mode = null;
    cancelRemoteRecording(widget.sessionId);
    if (wasDenying) _swiperController.undo();
  }

  void _handleSwipe(SessionHistoryEntry entry, CardSwiperDirection direction) {
    if (direction == CardSwiperDirection.right) {
      approveReview(widget.sessionId, entry);
    } else if (direction == CardSwiperDirection.left) {
      _mode = _DictationMode.toggle;
      denyReview(widget.sessionId, entry);
    }
  }

  @override
  Widget build(BuildContext context) {
    super.build(context);

    final session = useAppStore().select(
      context,
      (s) => s.remote.session(widget.sessionId),
    );
    final history = useAppStore().select(
      context,
      (s) => historyFor(widget.sessionId, s),
    );
    final pendingReviews = history.where((e) => e.isPendingReview).toList();

    final hasHistory =
        session.partialText.isNotEmpty ||
        history.isNotEmpty ||
        session.isLoading;
    final showReviewButtons =
        pendingReviews.isNotEmpty && !session.isRecording;

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
                ? DictationHistory(
                    history: history,
                    partialText: session.partialText,
                    isLoading: session.isLoading,
                    swiperController: _swiperController,
                    onSwipe: _handleSwipe,
                  )
                : const DictationEmptyState(),
          ),
        ),
        Expanded(
          child: AppAnimatedSwitcher(
            child: showReviewButtons
                ? DictationReviewActions(
                    key: const ValueKey('review-buttons'),
                    swiperController: _swiperController,
                  )
                : DictationPillArea(
                    key: const ValueKey('pill-area'),
                    status: session.status,
                    audioLevel: session.audioLevel,
                    isRecording: session.isRecording,
                    denying: session.pendingDenialId != null,
                    onTapDown: _onTapDown,
                    onTapUp: _onTapUp,
                    onTapCancel: _onTapCancel,
                    onCancelRecording: _handleCancel,
                  ),
          ),
        ),
      ],
    );
  }
}
