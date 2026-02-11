import 'package:app/utils/theme_utils.dart';
import 'package:app/widgets/common/app_sliver_app_bar.dart';
import 'package:app/widgets/styles/edit_style_dialog.dart';
import 'package:flutter/material.dart';

class _ToneItem {
  const _ToneItem({
    required this.id,
    required this.name,
    required this.prompt,
    this.isSystem = false,
  });

  final String id;
  final String name;
  final String prompt;
  final bool isSystem;
}

const _allTones = [
  _ToneItem(
    id: 'default',
    name: 'Polished',
    prompt: 'Corrects grammar and removes fillers while preserving your voice.',
    isSystem: true,
  ),
  _ToneItem(
    id: 'verbatim',
    name: 'Verbatim',
    prompt: 'Near-exact transcription. Removes only filler words and false starts.',
    isSystem: true,
  ),
  _ToneItem(
    id: 'email',
    name: 'Email',
    prompt: 'Professional email format with greeting and sign-off.',
    isSystem: true,
  ),
  _ToneItem(
    id: 'chat',
    name: 'Chat',
    prompt: 'Casual, conversational tone. No period at the end.',
    isSystem: true,
  ),
  _ToneItem(
    id: 'formal',
    name: 'Formal',
    prompt: 'Professional register. Avoids contractions and colloquialisms.',
    isSystem: true,
  ),
  _ToneItem(
    id: 'disabled',
    name: 'Disabled',
    prompt: 'No post-processing. Raw transcription only.',
    isSystem: true,
  ),
];

class ManageStylesPage extends StatefulWidget {
  const ManageStylesPage({super.key});

  @override
  State<ManageStylesPage> createState() => _ManageStylesPageState();
}

class _ManageStylesPageState extends State<ManageStylesPage> {
  final Set<String> _activeIds = {
    'default',
    'verbatim',
    'email',
    'chat',
  };

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: CustomScrollView(
        slivers: [
          ...const AppSliverAppBar(
            title: Text('Manage Styles'),
            subtitle: Text(
              'Choose which styles appear on your styles page.',
            ),
          ).buildSlivers(context),
          SliverList.list(
            children: _allTones.map((tone) {
              final isActive = _activeIds.contains(tone.id);
              return CheckboxListTile(
                title: Text(tone.name),
                subtitle: Text(
                  tone.prompt,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                ),
                value: isActive,
                controlAffinity: ListTileControlAffinity.leading,
                secondary: tone.isSystem
                    ? null
                    : IconButton(
                        icon: const Icon(Icons.edit),
                        onPressed: () => _showEditDialog(context, tone),
                      ),
                onChanged: (value) {
                  if (value == false && _activeIds.length <= 1) {
                    return;
                  }
                  setState(() {
                    if (value == true) {
                      _activeIds.add(tone.id);
                    } else {
                      _activeIds.remove(tone.id);
                    }
                  });
                },
              );
            }).toList(),
          ),
          SliverToBoxAdapter(
            child: Padding(
              padding: Theming.padding,
              child: SizedBox(
                width: double.infinity,
                child: OutlinedButton.icon(
                  onPressed: () => _showNewStyleDialog(context),
                  icon: const Icon(Icons.add),
                  label: const Text('New Style'),
                ),
              ),
            ),
          ),
          const SliverToBoxAdapter(child: SizedBox(height: 80)),
        ],
      ),
    );
  }

  void _showEditDialog(BuildContext context, _ToneItem tone) {
    showDialog(
      context: context,
      builder: (_) => EditStyleDialog(
        isEditing: true,
        isSystem: tone.isSystem,
        initialName: tone.name,
        initialPrompt: tone.prompt,
      ),
    );
  }

  void _showNewStyleDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (_) => const EditStyleDialog(),
    );
  }
}
