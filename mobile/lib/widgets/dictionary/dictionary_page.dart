import 'package:app/actions/dictionary_actions.dart';
import 'package:app/model/term_model.dart';
import 'package:app/store/store.dart';
import 'package:app/widgets/common/app_sliver_app_bar.dart';
import 'package:app/widgets/dictionary/edit_term_dialog.dart';
import 'package:app/widgets/dictionary/glossary_term_tile.dart';
import 'package:app/widgets/dictionary/replacement_rule_tile.dart';
import 'package:flutter/material.dart';

class DictionaryPage extends StatefulWidget {
  const DictionaryPage({super.key});

  @override
  State<DictionaryPage> createState() => _DictionaryPageState();
}

class _DictionaryPageState extends State<DictionaryPage> {
  @override
  void initState() {
    super.initState();
    loadDictionary();
  }

  @override
  Widget build(BuildContext context) {
    final dictionary = useAppStore().select(context, (s) => s.dictionary);
    final termById = useAppStore().select(context, (s) => s.termById);
    final termIds = dictionary.termIds;

    return Scaffold(
      body: CustomScrollView(
        slivers: [
          ...const AppSliverAppBar(
            title: Text('Dictionary'),
            subtitle: Text(
              'Define glossary terms and replacement rules to improve transcription accuracy.',
            ),
          ).buildSlivers(context),
          if (termIds.isEmpty && dictionary.status.isSuccess)
            const SliverFillRemaining(
              hasScrollBody: false,
              child: Center(child: Text('No terms yet. Tap + to add one.')),
            )
          else if (termIds.isEmpty && dictionary.status.isLoading)
            const SliverFillRemaining(
              hasScrollBody: false,
              child: Center(child: CircularProgressIndicator()),
            )
          else
            SliverList.builder(
              itemCount: termIds.length,
              itemBuilder: (context, index) {
                final term = termById[termIds[index]];
                if (term == null) return const SizedBox.shrink();
                if (term.isReplacement) {
                  return ReplacementRuleTile(
                    original: term.sourceValue,
                    replacement: term.destinationValue,
                    onEdit: () => _showEditDialog(context, term),
                  );
                }
                return GlossaryTermTile(
                  value: term.sourceValue,
                  onEdit: () => _showEditDialog(context, term),
                );
              },
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

  Future<void> _showCreateDialog(BuildContext context) async {
    final result = await showDialog(
      context: context,
      builder: (_) => const EditTermDialog(),
    );

    if (result == null) return;
    if (result is! ({TermType type, String source, String destination})) return;

    createTerm(
      sourceValue: result.source,
      destinationValue: result.destination,
      isReplacement: result.type == TermType.replacement,
    );
  }

  Future<void> _showEditDialog(BuildContext context, Term term) async {
    final result = await showDialog(
      context: context,
      builder: (_) => EditTermDialog(
        isEditing: true,
        initialSource: term.sourceValue,
        initialDestination: term.isReplacement ? term.destinationValue : null,
        initialType: term.isReplacement
            ? TermType.replacement
            : TermType.glossary,
      ),
    );

    if (result == null) return;

    if (result == EditTermResult.delete) {
      deleteTerm(term.id);
      return;
    }

    if (result is ({TermType type, String source, String destination})) {
      updateTerm(
        Term(
          id: term.id,
          createdAt: term.createdAt,
          sourceValue: result.source,
          destinationValue: result.destination,
          isReplacement: result.type == TermType.replacement,
        ),
      );
    }
  }
}
