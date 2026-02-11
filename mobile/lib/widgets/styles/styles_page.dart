import 'package:app/widgets/common/app_sliver_app_bar.dart';
import 'package:app/widgets/styles/edit_style_dialog.dart';
import 'package:app/widgets/styles/style_tile.dart';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

class _ToneData {
  const _ToneData({
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

const _activeTones = [
  _ToneData(
    id: 'default',
    name: 'Polished',
    prompt: 'Corrects grammar and removes fillers while preserving your voice.',
    isSystem: true,
  ),
  _ToneData(
    id: 'verbatim',
    name: 'Verbatim',
    prompt: 'Near-exact transcription. Removes only filler words and false starts.',
    isSystem: true,
  ),
  _ToneData(
    id: 'email',
    name: 'Email',
    prompt: 'Professional email format with greeting and sign-off.',
    isSystem: true,
  ),
  _ToneData(
    id: 'chat',
    name: 'Chat',
    prompt: 'Casual, conversational tone. No period at the end.',
    isSystem: true,
  ),
];

class StylesPage extends StatefulWidget {
  const StylesPage({super.key});

  @override
  State<StylesPage> createState() => _StylesPageState();
}

class _StylesPageState extends State<StylesPage> {
  String _selectedId = 'default';

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: CustomScrollView(
        slivers: [
          ...const AppSliverAppBar(
            title: Text('Styles'),
            subtitle: Text(
              'Choose how your transcriptions are styled and formatted.',
            ),
          ).buildSlivers(context),
          SliverList.list(
            children: _activeTones.map((tone) {
              return StyleTile(
                name: tone.name,
                promptPreview: tone.prompt,
                isSelected: _selectedId == tone.id,
                isSystem: tone.isSystem,
                onSelect: () => setState(() => _selectedId = tone.id),
                onEdit: tone.isSystem
                    ? null
                    : () => _showEditDialog(context, tone),
              );
            }).toList(),
          ),
          const SliverToBoxAdapter(child: SizedBox(height: 80)),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        heroTag: 'styles_fab',
        onPressed: () => _showManagePage(context),
        icon: const Icon(Icons.tune),
        label: const Text('Manage'),
      ),
    );
  }

  void _showManagePage(BuildContext context) {
    context.push('/dashboard/manage-styles');
  }

  void _showEditDialog(BuildContext context, _ToneData tone) {
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
}
