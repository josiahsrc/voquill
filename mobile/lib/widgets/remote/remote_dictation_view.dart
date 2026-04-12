import 'dart:async';

import 'package:app/actions/session_actions.dart';
import 'package:app/api/dictation_api.dart';
import 'package:app/store/store.dart';
import 'package:app/theme/app_colors.dart';
import 'package:app/utils/audio_utils.dart';
import 'package:app/utils/log_utils.dart';
import 'package:app/utils/theme_utils.dart';
import 'package:app/widgets/remote/dictation_message.dart';
import 'package:app/widgets/remote/dictation_pill.dart';
import 'package:flutter/material.dart';
import 'package:record/record.dart';

final _logger = createNamedLogger('remote_dictation');

enum _DictationMode { waitingForMode, hold, toggle }

class _SentMessage {
  final String text;
  final DateTime sentAt;

  const _SentMessage({required this.text, required this.sentAt});
}

class RemoteDictationView extends StatefulWidget {
  const RemoteDictationView({super.key, required this.sessionId});

  final String sessionId;

  @override
  State<RemoteDictationView> createState() => _RemoteDictationViewState();
}

class _RemoteDictationViewState extends State<RemoteDictationView>
    with AutomaticKeepAliveClientMixin {
  AudioRecorder? _recorder;
  DictationSession? _session;
  StreamSubscription? _audioSub;
  StreamSubscription? _partialSub;

  double _audioLevel = 0;
  DictationPillStatus _status = DictationPillStatus.idle;
  _DictationMode? _mode;
  Timer? _holdTimer;
  String _partialText = '';
  final _history = <_SentMessage>[];

  bool get _isRecording => _status == DictationPillStatus.recording;
  bool get _isIdle => _status == DictationPillStatus.idle;
  bool get _isProcessing => _status == DictationPillStatus.processing;

  @override
  bool get wantKeepAlive => true;

  @override
  void dispose() {
    _cancel();
    super.dispose();
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

    setState(() {
      _status = DictationPillStatus.processing;
      _audioLevel = 0;
    });

    try {
      await _recorder?.stop();
      _audioSub?.cancel();
      _partialSub?.cancel();

      final result = await _session!.finalize();
      final text = result.text.trim();

      if (text.isNotEmpty) {
        await sendPasteText(widget.sessionId, text);
        setState(
          () =>
              _history.add(_SentMessage(text: text, sentAt: DateTime.now())),
        );
      }
    } catch (e) {
      _logger.e('Failed to finalize: $e');
    } finally {
      _session?.dispose();
      _recorder?.dispose();
      _recorder = null;
      _session = null;
      _audioSub = null;
      _partialSub = null;
      if (mounted) {
        setState(() {
          _status = DictationPillStatus.idle;
          _partialText = '';
        });
      }
    }
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
    if (_isProcessing) return;

    if (_isIdle) {
      _mode = _DictationMode.waitingForMode;
      _startRecording();
      _holdTimer = Timer(const Duration(seconds: 1), () {
        if (_mode == _DictationMode.waitingForMode) {
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

  @override
  Widget build(BuildContext context) {
    super.build(context);

    final theme = Theme.of(context);
    final colors = context.colors;
    final hasHistory = _partialText.isNotEmpty || _history.isNotEmpty;

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
          child: Center(
            child: DictationPill(
              status: _status,
              audioLevel: _audioLevel,
              onTapDown: _onTapDown,
              onTapUp: _onTapUp,
              onTapCancel: _onTapCancel,
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
    final hasPartial = _partialText.isNotEmpty;
    final totalCount = _history.length + (hasPartial ? 1 : 0);

    return ListView.separated(
      padding: Theming.padding.copyWith(top: 16, bottom: 16),
      reverse: true,
      itemCount: totalCount,
      separatorBuilder: (_, _) => const Divider(height: 1),
      itemBuilder: (context, index) {
        final reversedIndex = totalCount - 1 - index;
        final isPartial = hasPartial && reversedIndex == totalCount - 1;

        if (isPartial) {
          return DictationMessage(text: _partialText);
        }

        final entry = _history[reversedIndex];
        return DictationMessage(text: entry.text, sentAt: entry.sentAt);
      },
    );
  }
}
