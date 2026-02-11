import 'package:app/model/common_model.dart';
import 'package:draft/draft.dart';
import 'package:equatable/equatable.dart';

part 'styles_state.draft.dart';

@draft
class StylesState with EquatableMixin {
  final List<String> toneIds;
  final String? selectedToneId;
  final ActionStatus status;

  const StylesState({
    this.toneIds = const [],
    this.selectedToneId,
    this.status = ActionStatus.idle,
  });

  @override
  List<Object?> get props => [toneIds, selectedToneId, status];
}
