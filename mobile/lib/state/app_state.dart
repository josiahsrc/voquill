import 'package:app/model/common_model.dart';
import 'package:app/state/snackbar_state.dart';
import 'package:draft/draft.dart';
import 'package:equatable/equatable.dart';

part 'app_state.draft.dart';

@draft
class AppState with EquatableMixin {
  final ActionStatus status;
  final String? error;

  final SnackbarState snackbar;

  const AppState({
    this.status = ActionStatus.loading,
    this.error,

    this.snackbar = const SnackbarState(),
  });

  @override
  List<Object?> get props => [status, error, snackbar];
}
