import 'dart:async';

import 'package:app/actions/ai_settings_actions.dart';
import 'package:app/actions/session_actions.dart';
import 'package:intl/intl.dart';
import 'package:app/api/dictation_api.dart';
import 'package:app/model/api_key_model.dart';
import 'package:app/store/store.dart';
import 'package:app/theme/app_colors.dart';
import 'package:app/utils/audio_utils.dart';
import 'package:app/utils/log_utils.dart';
import 'package:app/utils/theme_utils.dart';
import 'package:app/widgets/common/audio_waveform.dart';
import 'package:flutter/material.dart';
import 'package:record/record.dart';

final _logger = createNamedLogger('remote_dictation');

const _pillWidth = 240.0;
const _pillHeight = 64.0;
const _pillRadius = 32.0;

enum _DictationMode { waitingForMode, hold, toggle }

enum _PageStatus { idle, recording, processing }

class _SentMessage {
  final String text;
  final DateTime sentAt;

  const _SentMessage({required this.text, required this.sentAt});
}

class RemoteDictationPage extends StatefulWidget {
  const RemoteDictationPage({super.key, required this.sessionId});

  final String sessionId;

  @override
  State<RemoteDictationPage> createState() => _RemoteDictationPageState();
}

class _RemoteDictationPageState extends State<RemoteDictationPage> {
  AudioRecorder? _recorder;
  DictationSession? _session;
  StreamSubscription? _audioSub;
  StreamSubscription? _partialSub;
  AiMode? _transcriptionMode;

  double _audioLevel = 0;
  _PageStatus _status = _PageStatus.idle;
  _DictationMode? _mode;
  Timer? _holdTimer;
  String _partialText = '';
  final _history = <_SentMessage>[];

  bool get _isRecording => _status == _PageStatus.recording;
  bool get _isIdle => _status == _PageStatus.idle;
  bool get _isProcessing => _status == _PageStatus.processing;
  bool get _localModeUnavailable => _transcriptionMode == AiMode.local;

  @override
  void initState() {
    super.initState();
    unawaited(_loadTranscriptionMode());
  }

  @override
  void dispose() {
    _cancel();
    super.dispose();
  }

  Future<void> _loadTranscriptionMode() async {
    final mode = await getTranscriptionMode();
    if (!mounted) return;
    setState(() => _transcriptionMode = mode);
  }

  Future<void> _startRecording() async {
    if (_isRecording || _localModeUnavailable) return;

    setState(() => _status = _PageStatus.recording);

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
      _status = _PageStatus.processing;
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
        setState(() => _history.add(_SentMessage(text: text, sentAt: DateTime.now())));
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
          _status = _PageStatus.idle;
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
    final session = useAppStore().select(
      context,
      (s) => s.desktopSessionById[widget.sessionId],
    );
    final theme = Theme.of(context);
    final colors = context.colors;

    return Scaffold(
      appBar: AppBar(title: Text(session?.name ?? 'Session')),
      body: SafeArea(
        child: Column(
          children: [
            // Message history / empty state
            Expanded(
              flex: 3,
              child: ShaderMask(
                shaderCallback: (bounds) => LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [
                    Colors.transparent,
                    Colors.black,
                    Colors.black,
                    Colors.transparent,
                  ],
                  stops: const [0, 0.04, 0.96, 1],
                ).createShader(bounds),
                blendMode: BlendMode.dstIn,
                child: _partialText.isNotEmpty || _history.isNotEmpty
                    ? _buildHistory(theme)
                    : _buildEmptyState(theme, colors),
              ),
            ),

            // Pill area
            Expanded(child: Center(child: _buildPill(theme, colors))),
          ],
        ),
      ),
    );
  }

  Widget _buildEmptyState(ThemeData theme, AppColors colors) {
    if (_localModeUnavailable) {
      return Center(
        child: Padding(
          padding: Theming.padding.copyWith(top: 32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(
                Icons.phonelink_erase_rounded,
                size: 72,
                color: theme.colorScheme.onSurface.withValues(alpha: 0.4),
              ),
              const SizedBox(height: 32),
              Text(
                'Local transcription stays on device',
                textAlign: TextAlign.center,
                style: theme.textTheme.headlineSmall?.copyWith(
                  color: theme.colorScheme.onSurface.withValues(alpha: 0.4),
                ),
              ),
              const SizedBox(height: 16),
              Text(
                'Air Transcription does not support local mode yet. Use the Voquill keyboard or switch AI Transcription to Cloud or API Key.',
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

  Widget _buildHistory(ThemeData theme) {
    final hasPartial = _partialText.isNotEmpty;
    final totalCount = _history.length + (hasPartial ? 1 : 0);
    final timeFormat = DateFormat.jm();

    return ListView.separated(
      padding: Theming.padding.copyWith(top: 16, bottom: 16),
      reverse: true,
      itemCount: totalCount,
      separatorBuilder: (_, _) => const Divider(height: 1),
      itemBuilder: (context, index) {
        final reversedIndex = totalCount - 1 - index;
        final isPartial = hasPartial && reversedIndex == totalCount - 1;

        if (isPartial) {
          return Padding(
            padding: const EdgeInsets.symmetric(vertical: 20),
            child: Text(
              _partialText,
              style: theme.textTheme.bodyMedium?.copyWith(
                color: theme.colorScheme.onSurface.withValues(alpha: 0.4),
                fontStyle: FontStyle.italic,
              ),
            ),
          );
        }

        final entry = _history[reversedIndex];

        return Padding(
          padding: const EdgeInsets.symmetric(vertical: 20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                entry.text,
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: theme.colorScheme.onSurface.withValues(alpha: 0.5),
                ),
              ),
              const SizedBox(height: 6),
              Row(
                children: [
                  Icon(
                    Icons.check_circle_outline_rounded,
                    size: 14,
                    color: theme.colorScheme.onSurface.withValues(alpha: 0.3),
                  ),
                  const SizedBox(width: 4),
                  Text(
                    'Sent ${timeFormat.format(entry.sentAt)}',
                    style: theme.textTheme.bodySmall?.copyWith(
                      color: theme.colorScheme.onSurface
                          .withValues(alpha: 0.3),
                    ),
                  ),
                ],
              ),
            ],
          ),
        );
      },
    );
  }

  Widget _buildPill(ThemeData theme, AppColors colors) {
    if (_localModeUnavailable) {
      return Container(
        width: _pillWidth,
        height: _pillHeight,
        decoration: BoxDecoration(
          color: colors.level2,
          borderRadius: BorderRadius.circular(_pillRadius),
        ),
        alignment: Alignment.center,
        padding: const EdgeInsets.symmetric(horizontal: 20),
        child: Text(
          'Local mode unavailable here',
          textAlign: TextAlign.center,
          style: theme.textTheme.bodyLarge?.copyWith(
            color: colors.onLevel2.withValues(alpha: 0.8),
            fontWeight: FontWeight.w500,
          ),
        ),
      );
    }

    return GestureDetector(
      onTapDown: _onTapDown,
      onTapUp: _onTapUp,
      onTapCancel: _onTapCancel,
      child: AnimatedContainer(
        duration: const Duration(milliseconds: 200),
        curve: Curves.easeOut,
        width: _pillWidth,
        height: _pillHeight,
        decoration: BoxDecoration(
          color: colors.primary,
          borderRadius: BorderRadius.circular(_pillRadius),
        ),
        clipBehavior: Clip.antiAlias,
        child: Stack(
          alignment: Alignment.center,
          children: [
            // Idle: "Tap to dictate"
            AnimatedOpacity(
              opacity: _isIdle ? 1 : 0,
              duration: const Duration(milliseconds: 150),
              child: Row(
                mainAxisSize: MainAxisSize.max,
                mainAxisAlignment: MainAxisAlignment.center,
                children: [
                  Icon(Icons.mic_rounded, size: 28, color: colors.onPrimary),
                  const SizedBox(width: 8),
                  Flexible(
                    child: Text(
                      'Tap to dictate',
                      overflow: TextOverflow.fade,
                      softWrap: false,
                      style: theme.textTheme.bodyLarge?.copyWith(
                        color: colors.onPrimary,
                        fontWeight: FontWeight.w500,
                      ),
                    ),
                  ),
                ],
              ),
            ),

            // Recording: waveform
            AnimatedOpacity(
              opacity: _isRecording ? 1 : 0,
              duration: const Duration(milliseconds: 150),
              child: Padding(
                padding: const EdgeInsets.symmetric(horizontal: 4),
                child: AudioWaveform(
                  audioLevel: _audioLevel,
                  active: _isRecording,
                  strokeColor: colors.onPrimary,
                ),
              ),
            ),

            // Processing: linear progress (full width, behind edge fades)
            AnimatedOpacity(
              opacity: _isProcessing ? 1 : 0,
              duration: const Duration(milliseconds: 150),
              child: SizedBox(
                width: _pillWidth,
                child: LinearProgressIndicator(
                  backgroundColor: colors.onPrimary.withValues(alpha: 0.2),
                  valueColor: AlwaysStoppedAnimation(colors.onPrimary),
                ),
              ),
            ),

            // Gradient edge fades (over waveform and progress)
            if (_isRecording || _isProcessing)
              Positioned.fill(
                child: IgnorePointer(
                  child: DecoratedBox(
                    decoration: BoxDecoration(
                      borderRadius: BorderRadius.circular(_pillRadius),
                      gradient: LinearGradient(
                        colors: [
                          colors.primary,
                          colors.primary.withValues(alpha: 0),
                          colors.primary.withValues(alpha: 0),
                          colors.primary,
                        ],
                        stops: const [0, 0.15, 0.85, 1],
                      ),
                    ),
                  ),
                ),
              ),
          ],
        ),
      ),
    );
  }
}
