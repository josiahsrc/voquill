import 'package:app/actions/api_key_actions.dart';
import 'package:app/actions/revenue_cat_actions.dart';
import 'package:app/state/api_key_state.dart';
import 'package:app/store/store.dart';
import 'package:app/utils/member_utils.dart';
import 'package:app/utils/theme_utils.dart';
import 'package:app/widgets/common/app_sliver_app_bar.dart';
import 'package:app/widgets/settings/api_key_list_widget.dart';
import 'package:flutter/material.dart';

class TranscriptionSettingsPage extends StatelessWidget {
  const TranscriptionSettingsPage({super.key});

  @override
  Widget build(BuildContext context) {
    final store = useAppStore();
    final apiKeyState = store.select(context, (s) => s.apiKeys);
    final isPro = store.select(context, (s) => getIsPro(s));
    final theme = Theme.of(context);

    return Scaffold(
      body: CustomScrollView(
        slivers: [
          const AppSliverAppBar(title: Text('AI transcription')),
          SliverToBoxAdapter(
            child: Padding(
              padding: Theming.padding.onlyHorizontal().withTop(8),
              child: SegmentedButton<TranscriptionMode>(
                segments: const [
                  ButtonSegment(
                    value: TranscriptionMode.cloud,
                    label: Text('Voquill'),
                  ),
                  ButtonSegment(
                    value: TranscriptionMode.api,
                    label: Text('API'),
                  ),
                ],
                selected: {apiKeyState.transcriptionMode},
                onSelectionChanged: (selection) {
                  setTranscriptionMode(selection.first);
                },
              ),
            ),
          ),
          SliverToBoxAdapter(
            child: Padding(
              padding: Theming.padding.withTop(24),
              child: _buildModeContent(context, apiKeyState, isPro, theme),
            ),
          ),
        ],
      ),
    );
  }

  Widget _buildModeContent(
    BuildContext context,
    ApiKeyState apiKeyState,
    bool isPro,
    ThemeData theme,
  ) {
    if (apiKeyState.transcriptionMode == TranscriptionMode.cloud) {
      return Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            'Voquill Cloud handles your audio transcription. '
            'Usage is included with your plan.',
            style: theme.textTheme.bodyMedium?.copyWith(
              color: theme.colorScheme.onSurface.withAlpha(153),
            ),
          ),
          if (!isPro) ...[
            const SizedBox(height: 16),
            FilledButton(
              onPressed: () => presentPaywall(),
              child: const Text('Upgrade to Pro'),
            ),
          ],
        ],
      );
    }

    return ApiKeyListWidget(
      apiKeys: apiKeyState.transcriptionApiKeys,
      selectedApiKeyId: apiKeyState.selectedTranscriptionApiKeyId,
      status: apiKeyState.transcriptionApiKeysStatus,
      onSelect: (id) => selectTranscriptionApiKey(id),
      onDelete: (id) => deleteTranscriptionApiKey(id),
      onAdd: (result) => createTranscriptionApiKey(
        name: result.name,
        apiKey: result.apiKey,
        baseUrl: result.baseUrl,
        model: result.model,
      ),
    );
  }
}
