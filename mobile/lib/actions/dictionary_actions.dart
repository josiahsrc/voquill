import 'package:app/actions/snackbar_actions.dart';
import 'package:app/api/term_api.dart';
import 'package:app/model/common_model.dart';
import 'package:app/model/firebase_model.dart';
import 'package:app/model/term_model.dart';
import 'package:app/store/store.dart';
import 'package:app/utils/app_utils.dart';
import 'package:app/utils/log_utils.dart';
import 'package:uuid/uuid.dart';

final _logger = createNamedLogger('dictionary_actions');

Future<void> loadDictionary() async {
  produceAppState((draft) {
    draft.dictionary.status = ActionStatus.loading;
  });

  try {
    final output = await ListMyTermsApi().call(null);
    final terms = List<Term>.from(output.terms)
      ..sort((a, b) => b.createdAt.compareTo(a.createdAt));

    produceAppState((draft) {
      registerTerms(draft, terms);
      draft.dictionary.termIds = terms.map((t) => t.id).toList();
      draft.dictionary.status = ActionStatus.success;
    });
  } catch (e) {
    _logger.e('Failed to load dictionary', e);
    produceAppState((draft) {
      draft.dictionary.status = ActionStatus.error;
    });
    showErrorSnackbar(e);
  }
}

Future<void> createTerm({
  required String sourceValue,
  required String destinationValue,
  required bool isReplacement,
}) async {
  final term = Term(
    id: const Uuid().v4(),
    createdAt: DateTime.now().toUtc().toIso8601String(),
    sourceValue: sourceValue,
    destinationValue: destinationValue,
    isReplacement: isReplacement,
  );

  produceAppState((draft) {
    draft.termById[term.id] = term.draft();
    draft.dictionary.termIds = [term.id, ...draft.dictionary.termIds];
  });

  try {
    await UpsertMyTermApi().call(UpsertMyTermInput(term: term));
  } catch (e) {
    _logger.e('Failed to create term', e);
    produceAppState((draft) {
      draft.termById.remove(term.id);
      draft.dictionary.termIds = draft.dictionary.termIds
          .where((id) => id != term.id)
          .toList();
    });
    showErrorSnackbar(e);
  }
}

Future<void> updateTerm(Term term) async {
  final previous = getAppState().termById[term.id];

  produceAppState((draft) {
    draft.termById[term.id] = term.draft();
  });

  try {
    await UpsertMyTermApi().call(UpsertMyTermInput(term: term));
  } catch (e) {
    _logger.e('Failed to update term', e);
    if (previous != null) {
      produceAppState((draft) {
        draft.termById[term.id] = previous.draft();
      });
    }
    showErrorSnackbar(e);
  }
}

Future<void> deleteTerm(String termId) async {
  final previous = getAppState().termById[termId];
  final previousIds = List<String>.from(getAppState().dictionary.termIds);

  produceAppState((draft) {
    draft.termById.remove(termId);
    draft.dictionary.termIds = draft.dictionary.termIds
        .where((id) => id != termId)
        .toList();
  });

  try {
    await DeleteMyTermApi().call(DeleteMyTermInput(termId: termId));
  } catch (e) {
    _logger.e('Failed to delete term', e);
    produceAppState((draft) {
      if (previous != null) {
        draft.termById[termId] = previous.draft();
      }
      draft.dictionary.termIds = previousIds;
    });
    showErrorSnackbar(e);
  }
}
