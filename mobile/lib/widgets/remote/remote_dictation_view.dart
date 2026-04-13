import 'dart:async';

import 'package:app/actions/remote_actions.dart';
import 'package:app/state/remote_state.dart';
import 'package:app/store/store.dart';
import 'package:app/utils/remote_utils.dart';
import 'package:app/widgets/remote/dictation_empty_state.dart';
import 'package:app/widgets/remote/dictation_history.dart';
import 'package:app/widgets/remote/dictation_pill_area.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

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
      startRemoteRecording(widget.sessionId, context: DictationContext.main);
      _holdTimer = Timer(_holdThreshold, () {
        if (_mode == _DictationMode.waitingForMode && mounted) {
          HapticFeedback.mediumImpact();
          setState(() => _mode = _DictationMode.hold);
        }
      });
    } else if (_mode == _DictationMode.toggle) {
      stopRemoteRecording(widget.sessionId, target: DictationTarget.freeForm);
      _mode = null;
    }
  }

  void _onTapUp(TapUpDetails _) {
    if (_mode == _DictationMode.waitingForMode) {
      _holdTimer?.cancel();
      setState(() => _mode = _DictationMode.toggle);
    } else if (_mode == _DictationMode.hold) {
      HapticFeedback.lightImpact();
      stopRemoteRecording(widget.sessionId, target: DictationTarget.freeForm);
      _mode = null;
    }
  }

  void _onTapCancel() {
    _holdTimer?.cancel();
    if (_mode == _DictationMode.waitingForMode ||
        _mode == _DictationMode.hold) {
      stopRemoteRecording(widget.sessionId, target: DictationTarget.freeForm);
      _mode = null;
    }
  }

  void _handleCancel() {
    _holdTimer?.cancel();
    _mode = null;
    cancelRemoteRecording(widget.sessionId);
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
    final activeTurn = useAppStore().select(
      context,
      (s) => activeTurnFor(widget.sessionId, s),
    );

    final mainPartial = session.partialTextFor(DictationContext.main);
    final hasHistory =
        mainPartial.isNotEmpty ||
        history.isNotEmpty ||
        session.isLoading;

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
                    sessionId: widget.sessionId,
                    history: history,
                    activeTurnId: activeTurn?.id,
                    partialText: mainPartial,
                    isLoading: session.isLoading,
                  )
                : const DictationEmptyState(),
          ),
        ),
        Padding(
          padding: const EdgeInsets.only(top: 16, bottom: 24),
          child: DictationPillArea(
            status: session.statusFor(DictationContext.main),
            audioLevel: session.audioLevelFor(DictationContext.main),
            isRecording: session.isRecordingFor(DictationContext.main),
            onTapDown: _onTapDown,
            onTapUp: _onTapUp,
            onTapCancel: _onTapCancel,
            onCancelRecording: _handleCancel,
          ),
        ),
      ],
    );
  }
}
