import 'package:app/model/term_model.dart';
import 'package:app/state/app_state.dart';

void registerTerms(AppStateDraft draft, Iterable<Term> terms) {
  for (final term in terms) {
    draft.termById[term.id] = term.draft();
  }
}
