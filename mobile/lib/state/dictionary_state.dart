import 'package:app/model/common_model.dart';
import 'package:draft/draft.dart';
import 'package:equatable/equatable.dart';

part 'dictionary_state.draft.dart';

@draft
class DictionaryState with EquatableMixin {
  final List<String> termIds;
  final ActionStatus status;

  const DictionaryState({
    this.termIds = const [],
    this.status = ActionStatus.idle,
  });

  @override
  List<Object?> get props => [termIds, status];
}
