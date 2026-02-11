import 'package:app/actions/styles_actions.dart' as actions;
import 'package:app/model/tone_model.dart';
import 'package:app/store/store.dart';
import 'package:app/utils/tone_utils.dart';
import 'package:app/widgets/common/app_sliver_app_bar.dart';
import 'package:app/widgets/styles/edit_style_dialog.dart';
import 'package:app/widgets/styles/style_tile.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

class StylesPage extends StatefulWidget {
  const StylesPage({super.key});

  @override
  State<StylesPage> createState() => _StylesPageState();
}

class _StylesPageState extends State<StylesPage> {
  @override
  void initState() {
    super.initState();
    actions.loadStyles();
  }

  @override
  Widget build(BuildContext context) {
    final store = useAppStore();
    final styles = store.select(context, (s) => s.styles);
    final toneById = store.select(context, (s) => s.toneById);
    final toneIds = styles.toneIds;

    return Scaffold(
      body: CustomScrollView(
        slivers: [
          ...const AppSliverAppBar(
            title: Text('Styles'),
            subtitle: Text(
              'Choose how your transcriptions are styled and formatted.',
            ),
          ).buildSlivers(context),
          if (toneIds.isEmpty && styles.status.isLoading)
            const SliverFillRemaining(
              hasScrollBody: false,
              child: Center(child: CircularProgressIndicator()),
            )
          else
            SliverList.builder(
              itemCount: toneIds.length,
              itemBuilder: (context, index) {
                final tone = toneById[toneIds[index]];
                if (tone == null) return const SizedBox.shrink();
                return StyleTile(
                  name: tone.name,
                  promptPreview: formatPromptForPreview(tone.promptTemplate),
                  isSelected: styles.selectedToneId == tone.id,
                  isSystem: tone.isSystem,
                  onSelect: () => actions.selectTone(tone.id),
                  onEdit: tone.isSystem
                      ? null
                      : () => _showEditDialog(context, tone),
                );
              },
            ),
          const SliverToBoxAdapter(child: SizedBox(height: 80)),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        heroTag: 'styles_fab',
        onPressed: () => context.push('/dashboard/manage-styles'),
        icon: const Icon(Icons.tune),
        label: const Text('Manage'),
      ),
    );
  }

  Future<void> _showEditDialog(BuildContext context, Tone tone) async {
    final result = await showDialog(
      context: context,
      builder: (_) => EditStyleDialog(
        isEditing: true,
        isSystem: tone.isSystem,
        initialName: tone.name,
        initialPrompt: tone.promptTemplate,
      ),
    );

    if (result == null) return;

    if (result == EditStyleResult.delete) {
      actions.deleteTone(tone.id);
      return;
    }

    if (result is ({String name, String prompt})) {
      actions.updateTone(Tone(
        id: tone.id,
        name: result.name,
        promptTemplate: result.prompt,
        isSystem: false,
        createdAt: tone.createdAt,
        sortOrder: tone.sortOrder,
      ));
    }
  }
}
