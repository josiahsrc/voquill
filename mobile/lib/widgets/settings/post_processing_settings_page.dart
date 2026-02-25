import 'package:app/actions/api_key_actions.dart';
import 'package:app/actions/revenue_cat_actions.dart';
import 'package:app/state/api_key_state.dart';
import 'package:app/store/store.dart';
import 'package:app/utils/member_utils.dart';
import 'package:app/utils/theme_utils.dart';
import 'package:app/widgets/common/app_sliver_app_bar.dart';
import 'package:app/widgets/settings/api_key_list_widget.dart';
import 'package:flutter/material.dart';

class PostProcessingSettingsPage extends StatelessWidget {
  const PostProcessingSettingsPage({super.key});

  @override
  Widget build(BuildContext context) {
    final store = useAppStore();
    final apiKeyState = store.select(context, (s) => s.apiKeys);
    final isPro = store.select(context, (s) => getIsPro(s));
    final theme = Theme.of(context);

    return Scaffold(
      body: CustomScrollView(
        slivers: [
          const AppSliverAppBar(title: Text('AI post-processing')),
          SliverToBoxAdapter(
            child: Padding(
              padding: Theming.padding.onlyHorizontal().withTop(8),
              child: SegmentedButton<PostProcessingMode>(
                segments: const [
                  ButtonSegment(
                    value: PostProcessingMode.cloud,
                    label: Text('Voquill'),
                  ),
                  ButtonSegment(
                    value: PostProcessingMode.api,
                    label: Text('API'),
                  ),
                  ButtonSegment(
                    value: PostProcessingMode.off,
                    label: Text('Off'),
                  ),
                ],
                selected: {apiKeyState.postProcessingMode},
                onSelectionChanged: (selection) {
                  setPostProcessingMode(selection.first);
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
    switch (apiKeyState.postProcessingMode) {
      case PostProcessingMode.cloud:
        return Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(
              'Voquill Cloud handles your text post-processing. '
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
      case PostProcessingMode.api:
        return ApiKeyListWidget(
          apiKeys: apiKeyState.postProcessingApiKeys,
          selectedApiKeyId: apiKeyState.selectedPostProcessingApiKeyId,
          status: apiKeyState.postProcessingApiKeysStatus,
          onSelect: (id) => selectPostProcessingApiKey(id),
          onDelete: (id) => deletePostProcessingApiKey(id),
          onAdd: (result) => createPostProcessingApiKey(
            name: result.name,
            apiKey: result.apiKey,
            baseUrl: result.baseUrl,
            model: result.model,
          ),
        );
      case PostProcessingMode.off:
        return Text(
          'No AI post-processing will run on new transcripts.',
          style: theme.textTheme.bodyMedium?.copyWith(
            color: theme.colorScheme.onSurface.withAlpha(153),
          ),
        );
    }
  }
}
