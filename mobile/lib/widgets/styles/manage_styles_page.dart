import 'package:app/actions/styles_actions.dart' as actions;
import 'package:app/model/tone_model.dart';
import 'package:app/store/store.dart';
import 'package:app/utils/theme_utils.dart';
import 'package:app/utils/tone_utils.dart';
import 'package:app/widgets/common/app_button.dart';
import 'package:app/widgets/common/app_checkbox_list_tile.dart';
import 'package:app/widgets/common/app_sliver_app_bar.dart';
import 'package:app/widgets/styles/edit_style_dialog.dart';
import 'package:flutter/material.dart';

class ManageStylesPage extends StatelessWidget {
  const ManageStylesPage({super.key});

  @override
  Widget build(BuildContext context) {
    final store = useAppStore();
    final toneById = store.select(context, (s) => s.toneById);
    final toneIds = store.select(context, getSortedToneIds);
    final activeToneIds = store.select(context, getActiveManualToneIds);

    return Scaffold(
      body: CustomScrollView(
        slivers: [
          ...const AppSliverAppBar(
            title: Text('Manage Styles'),
            subtitle: Text('Choose which styles appear in your style list.'),
          ).buildSlivers(context),
          SliverList.builder(
            itemCount: toneIds.length,
            itemBuilder: (context, index) {
              final tone = toneById[toneIds[index]];
              if (tone == null) return const SizedBox.shrink();
              final isActive = activeToneIds.contains(tone.id);
              return AppCheckboxListTile(
                value: isActive,
                onChanged: (checked) {
                  final updated = checked == true
                      ? [...activeToneIds, tone.id]
                      : activeToneIds.where((id) => id != tone.id).toList();
                  actions.setActiveToneIds(updated);
                },
                title: Text(tone.name),
                subtitle: Text(
                  formatPromptForPreview(tone.promptTemplate),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                secondary: tone.isSystem
                    ? null
                    : IconButton(
                        icon: const Icon(Icons.edit),
                        onPressed: () => _showEditDialog(context, tone),
                      ),
              );
            },
          ),
          SliverToBoxAdapter(
            child: Padding(
              padding: Theming.padding,
              child: SizedBox(
                width: double.infinity,
                child: AppButton.text(
                  onPressed: () => _showNewStyleDialog(context),
                  icon: const Icon(Icons.add),
                  child: const Text('New Style'),
                ),
              ),
            ),
          ),
          const SliverToBoxAdapter(child: SizedBox(height: 80)),
        ],
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
      actions.updateTone(
        (tone.draft()
              ..name = result.name
              ..promptTemplate = result.prompt)
            .save(),
      );
    }
  }

  Future<void> _showNewStyleDialog(BuildContext context) async {
    final result = await showDialog(
      context: context,
      builder: (_) => const EditStyleDialog(),
    );

    if (result == null) return;
    if (result is! ({String name, String prompt})) return;

    actions.createTone(name: result.name, promptTemplate: result.prompt);
  }
}
