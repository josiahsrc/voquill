import 'package:app/model/auth_user_model.dart';
import 'package:app/model/common_model.dart';
import 'package:app/model/user_model.dart';
import 'package:app/state/snackbar_state.dart';
import 'package:draft/draft.dart';
import 'package:equatable/equatable.dart';

part 'app_state.draft.dart';

@draft
class AppState with EquatableMixin {
  final ActionStatus status;
  final String? error;

  final AuthUser? auth;
  final User? user;

  final SnackbarState snackbar;

  const AppState({
    this.status = ActionStatus.loading,
    this.error,
    this.auth,
    this.user,
    this.snackbar = const SnackbarState(),
  });

  bool get isLoggedIn => auth != null;
  bool get isOnboarded => user?.onboarded ?? false;

  @override
  List<Object?> get props => [status, error, auth, user, snackbar];
}
