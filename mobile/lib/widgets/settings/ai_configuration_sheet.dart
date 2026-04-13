import 'package:app/actions/ai_settings_actions.dart';
import 'package:app/model/api_key_model.dart';
import 'package:app/model/local_transcription_model.dart';
import 'package:app/utils/theme_utils.dart';
import 'package:app/widgets/settings/api_key_list_widget.dart';
import 'package:app/widgets/settings/local_transcription_model_list.dart';
import 'package:flutter/material.dart';

enum AiConfigContext { transcription, postProcessing }

class AiConfigurationSheet extends StatefulWidget {
  final AiConfigContext configContext;

  const AiConfigurationSheet({super.key, required this.configContext});

  static Future<void> show(
    BuildContext context,
    AiConfigContext configContext,
  ) {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (_) => AiConfigurationSheet(configContext: configContext),
    );
  }

  @override
  State<AiConfigurationSheet> createState() => _AiConfigurationSheetState();
}

class _AiConfigurationSheetState extends State<AiConfigurationSheet> {
  AiMode _mode = AiMode.cloud;
  bool _loading = true;

  @override
  void initState() {
    super.initState();
    _loadMode();
  }

  Future<void> _loadMode() async {
    final mode = widget.configContext == AiConfigContext.transcription
        ? await getTranscriptionMode()
        : await getPostProcessingMode();
    if (mounted) {
      setState(() {
        _mode = mode;
        _loading = false;
      });
    }
  }

  Future<void> _setMode(AiMode mode) async {
    final isTranscription =
        widget.configContext == AiConfigContext.transcription;
    if (!isTranscription && mode == AiMode.local) {
      throw ArgumentError.value(
        mode,
        'mode',
        'Post-processing only supports cloud or api modes.',
      );
    }

    if (isTranscription) {
      await setTranscriptionMode(mode);
    } else {
      await setPostProcessingMode(mode);
    }

    if (mounted) {
      setState(() => _mode = mode);
    }
  }

  String get _title => widget.configContext == AiConfigContext.transcription
      ? 'AI Transcription'
      : 'AI Post Processing';

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isTranscription =
        widget.configContext == AiConfigContext.transcription;
    final hasInvalidLocalPostProcessing =
        !isTranscription && _mode == AiMode.local;

    return DraggableScrollableSheet(
      initialChildSize: 0.7,
      minChildSize: 0.4,
      maxChildSize: 0.95,
      expand: false,
      builder: (context, scrollController) {
        return Column(
          children: [
            const SizedBox(height: 8),
            Container(
              width: 36,
              height: 4,
              decoration: BoxDecoration(
                color: theme.colorScheme.onSurface.withAlpha(51),
                borderRadius: BorderRadius.circular(2),
              ),
            ),
            Padding(
              padding: Theming.padding.withBottom(0),
              child: Text(_title, style: theme.textTheme.titleLarge),
            ),
            const SizedBox(height: 16),
            if (!_loading) ...[
              _ModeSelector(
                mode: hasInvalidLocalPostProcessing ? null : _mode,
                onChanged: _setMode,
                includeLocal: isTranscription,
              ),
              const SizedBox(height: 16),
              Expanded(
                child: switch (_mode) {
                  AiMode.cloud => _CloudContent(
                    scrollController: scrollController,
                  ),
                  AiMode.local when isTranscription => _LocalContent(
                    scrollController: scrollController,
                  ),
                  AiMode.local => _InvalidPostProcessingModeContent(
                    scrollController: scrollController,
                  ),
                  AiMode.api => ApiKeyListWidget(
                    configContext: widget.configContext,
                    scrollController: scrollController,
                  ),
                },
              ),
            ],
            if (_loading)
              const Expanded(child: Center(child: CircularProgressIndicator())),
          ],
        );
      },
    );
  }
}

class _ModeSelector extends StatelessWidget {
  final AiMode? mode;
  final ValueChanged<AiMode> onChanged;
  final bool includeLocal;

  const _ModeSelector({
    required this.mode,
    required this.onChanged,
    this.includeLocal = false,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: Theming.padding.onlyHorizontal(),
      child: SegmentedButton<AiMode>(
        segments: [
          const ButtonSegment(value: AiMode.cloud, label: Text('Cloud')),
          if (includeLocal)
            const ButtonSegment(value: AiMode.local, label: Text('Local')),
          const ButtonSegment(value: AiMode.api, label: Text('API Key')),
        ],
        selected: mode == null ? const <AiMode>{} : {mode!},
        emptySelectionAllowed: mode == null,
        onSelectionChanged: (selection) {
          if (selection.isNotEmpty) {
            onChanged(selection.first);
          }
        },
        showSelectedIcon: false,
        style: SegmentedButton.styleFrom(visualDensity: VisualDensity.compact),
      ),
    );
  }
}

class _CloudContent extends StatelessWidget {
  final ScrollController scrollController;

  const _CloudContent({required this.scrollController});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return ListView(
      controller: scrollController,
      padding: Theming.padding,
      children: [
        Icon(Icons.cloud_outlined, size: 48, color: theme.colorScheme.primary),
        const SizedBox(height: 16),
        Text(
          'Voquill Cloud',
          style: theme.textTheme.titleMedium,
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: 8),
        Text(
          'Transcription and post-processing are handled by Voquill\'s cloud service. No configuration needed.',
          style: theme.textTheme.bodyMedium?.copyWith(
            color: theme.colorScheme.onSurface.withAlpha(153),
          ),
          textAlign: TextAlign.center,
        ),
      ],
    );
  }
}

class _LocalContent extends StatefulWidget {
  final ScrollController scrollController;

  const _LocalContent({required this.scrollController});

  @override
  State<_LocalContent> createState() => _LocalContentState();
}

class _LocalContentState extends State<_LocalContent> {
  List<LocalTranscriptionModel> _models = [];
  bool _loading = true;
  bool _refreshing = false;
  bool _unavailable = false;

  @override
  void initState() {
    super.initState();
    _loadModels();
  }

  Future<void> _loadModels({bool showSpinner = true}) async {
    if (mounted) {
      setState(() {
        if (showSpinner && _models.isEmpty) {
          _loading = true;
        } else {
          _refreshing = true;
        }
      });
    }

    if (!isLocalTranscriptionBridgeAvailable()) {
      if (mounted) {
        setState(() {
          _models = [];
          _unavailable = true;
          _loading = false;
          _refreshing = false;
        });
      }
      return;
    }

    try {
      final models = await listLocalTranscriptionModels();
      if (!mounted) return;
      if (models == null) {
        setState(() {
          _models = [];
          _unavailable = true;
        });
      } else {
        setState(() {
          _models = models;
          _unavailable = false;
        });
      }
    } catch (_) {
      if (!mounted) return;
      setState(() {
        _models = [];
        _unavailable = true;
      });
    } finally {
      if (mounted) {
        setState(() {
          _loading = false;
          _refreshing = false;
        });
      }
    }
  }

  Future<T> _runAndRefresh<T>(Future<T> Function() action) async {
    if (!mounted) return action();
    setState(() => _refreshing = true);
    try {
      return await action();
    } finally {
      await _loadModels(showSpinner: false);
    }
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    if (_loading) {
      return const Center(child: CircularProgressIndicator());
    }

    return ListView(
      controller: widget.scrollController,
      padding: Theming.padding,
      children: [
        Text(
          'Choose a local model to run on-device transcription.',
          style: theme.textTheme.bodyMedium?.copyWith(
            color: theme.colorScheme.onSurface.withAlpha(153),
          ),
        ),
        if (_refreshing) ...[
          const SizedBox(height: 12),
          Row(
            children: [
              SizedBox(
                width: 16,
                height: 16,
                child: CircularProgressIndicator(
                  strokeWidth: 2,
                  color: theme.colorScheme.primary,
                ),
              ),
              const SizedBox(width: 8),
              Text(
                'Refreshing model status...',
                style: theme.textTheme.bodySmall?.copyWith(
                  color: theme.colorScheme.onSurface.withAlpha(153),
                ),
              ),
            ],
          ),
        ],
        const SizedBox(height: 8),
        if (_models.isEmpty)
          Padding(
            padding: const EdgeInsets.symmetric(vertical: 24),
            child: Text(
              _unavailable
                  ? 'Local models are unavailable on this device right now.'
                  : 'No local models available right now.',
              style: theme.textTheme.bodyMedium?.copyWith(
                color: theme.colorScheme.onSurface.withAlpha(153),
              ),
              textAlign: TextAlign.center,
            ),
          )
        else
          LocalTranscriptionModelList(
            models: _models,
            onDownload: (slug) =>
                _runAndRefresh(() => downloadLocalTranscriptionModel(slug)),
            onDelete: (slug) =>
                _runAndRefresh(() => deleteLocalTranscriptionModel(slug)),
            onSelect: (slug) async {
              final selected = await _runAndRefresh(
                () => selectLocalTranscriptionModel(slug),
              );
              if (!mounted || selected) return;
              ScaffoldMessenger.of(context).showSnackBar(
                const SnackBar(
                  content: Text('Could not select this model. Try again.'),
                ),
              );
            },
          ),
      ],
    );
  }
}

class _InvalidPostProcessingModeContent extends StatelessWidget {
  final ScrollController scrollController;

  const _InvalidPostProcessingModeContent({required this.scrollController});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return ListView(
      controller: scrollController,
      padding: Theming.padding,
      children: [
        Icon(
          Icons.warning_amber_rounded,
          size: 48,
          color: theme.colorScheme.error,
        ),
        const SizedBox(height: 16),
        Text(
          'Local post-processing is unavailable',
          style: theme.textTheme.titleMedium,
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: 8),
        Text(
          'Choose Cloud or API Key to continue.',
          style: theme.textTheme.bodyMedium?.copyWith(
            color: theme.colorScheme.onSurface.withAlpha(153),
          ),
          textAlign: TextAlign.center,
        ),
      ],
    );
  }
}
