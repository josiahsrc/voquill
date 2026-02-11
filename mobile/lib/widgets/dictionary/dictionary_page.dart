import 'package:app/widgets/common/app_sliver_app_bar.dart';
import 'package:app/widgets/dictionary/edit_term_dialog.dart';
import 'package:app/widgets/dictionary/glossary_term_tile.dart';
import 'package:app/widgets/dictionary/replacement_rule_tile.dart';
import 'package:flutter/material.dart';

class DictionaryPage extends StatelessWidget {
  const DictionaryPage({super.key});

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      body: CustomScrollView(
        slivers: [
          ...const AppSliverAppBar(
            title: Text('Dictionary'),
            subtitle: Text(
              'Define glossary terms and replacement rules to improve transcription accuracy.',
            ),
          ).buildSlivers(context),
          SliverList.list(
            children: [
              GlossaryTermTile(
                value: 'API',
                onEdit: () => _showEditDialog(context, source: 'API'),
              ),
              GlossaryTermTile(
                value: 'Kubernetes',
                onEdit: () => _showEditDialog(context, source: 'Kubernetes'),
              ),
              GlossaryTermTile(
                value: 'TypeScript',
                onEdit: () => _showEditDialog(context, source: 'TypeScript'),
              ),
              GlossaryTermTile(
                value: 'Zustand',
                onEdit: () => _showEditDialog(context, source: 'Zustand'),
              ),
              ReplacementRuleTile(
                original: 'gpt',
                replacement: 'ChatGPT',
                onEdit: () => _showEditDialog(context, source: 'gpt', destination: 'ChatGPT', type: TermType.replacement),
              ),
              ReplacementRuleTile(
                original: 'js',
                replacement: 'JavaScript',
                onEdit: () => _showEditDialog(context, source: 'js', destination: 'JavaScript', type: TermType.replacement),
              ),
              ReplacementRuleTile(
                original: 'ts',
                replacement: 'TypeScript',
                onEdit: () => _showEditDialog(context, source: 'ts', destination: 'TypeScript', type: TermType.replacement),
              ),
            ],
          ),
          const SliverToBoxAdapter(child: SizedBox(height: 80)),
        ],
      ),
      floatingActionButton: FloatingActionButton(
        heroTag: 'dictionary_fab',
        onPressed: () => _showCreateDialog(context),
        child: const Icon(Icons.add),
      ),
    );
  }

  void _showCreateDialog(BuildContext context) {
    showDialog(
      context: context,
      builder: (_) => const EditTermDialog(),
    );
  }

  void _showEditDialog(
    BuildContext context, {
    required String source,
    String? destination,
    TermType type = TermType.glossary,
  }) {
    showDialog(
      context: context,
      builder: (_) => EditTermDialog(
        isEditing: true,
        initialSource: source,
        initialDestination: destination,
        initialType: type,
      ),
    );
  }
}
