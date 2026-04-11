import 'package:app/actions/ai_settings_actions.dart';
import 'package:app/model/api_key_model.dart';
import 'package:app/utils/theme_utils.dart';
import 'package:app/widgets/settings/api_key_list_widget.dart';
import 'package:flutter/material.dart';

enum AiConfigContext { transcription, postProcessing }

class AiConfigurationSheet extends StatefulWidget {
  final AiConfigContext configContext;

  const AiConfigurationSheet({super.key, required this.configContext});

  static Future<void> show(BuildContext context, AiConfigContext configContext) {
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
    setState(() => _mode = mode);
    if (widget.configContext == AiConfigContext.transcription) {
      await setTranscriptionMode(mode);
    } else {
      await setPostProcessingMode(mode);
    }
  }

  String get _title => widget.configContext == AiConfigContext.transcription
      ? 'AI Transcription'
      : 'AI Post Processing';

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isTranscription = widget.configContext == AiConfigContext.transcription;

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
              child: Text(
                _title,
                style: theme.textTheme.titleLarge,
              ),
            ),
            const SizedBox(height: 16),
            if (!_loading) ...[
              _ModeSelector(
                mode: _mode,
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
                  _ => ApiKeyListWidget(
                    configContext: widget.configContext,
                    scrollController: scrollController,
                  ),
                },
              ),
            ],
            if (_loading)
              const Expanded(
                child: Center(child: CircularProgressIndicator()),
              ),
          ],
        );
      },
    );
  }
}

class _ModeSelector extends StatelessWidget {
  final AiMode mode;
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
        selected: {mode},
        onSelectionChanged: (selection) => onChanged(selection.first),
        showSelectedIcon: false,
        style: SegmentedButton.styleFrom(
          visualDensity: VisualDensity.compact,
        ),
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
        Icon(
          Icons.cloud_outlined,
          size: 48,
          color: theme.colorScheme.primary,
        ),
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

class _LocalContent extends StatelessWidget {
  final ScrollController scrollController;

  const _LocalContent({required this.scrollController});

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    return ListView(
      controller: scrollController,
      padding: Theming.padding,
      children: [
        Icon(
          Icons.memory_outlined,
          size: 48,
          color: theme.colorScheme.primary,
        ),
        const SizedBox(height: 16),
        Text(
          'On-device transcription',
          style: theme.textTheme.titleMedium,
          textAlign: TextAlign.center,
        ),
        const SizedBox(height: 8),
        Text(
          'Local transcription is selected. Model download and device setup controls will land in a follow-up task.',
          style: theme.textTheme.bodyMedium?.copyWith(
            color: theme.colorScheme.onSurface.withAlpha(153),
          ),
          textAlign: TextAlign.center,
        ),
      ],
    );
  }
}
