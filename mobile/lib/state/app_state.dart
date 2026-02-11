import 'package:app/model/auth_user_model.dart';
import 'package:app/model/common_model.dart';
import 'package:app/model/term_model.dart';
import 'package:app/model/tone_model.dart';
import 'package:app/model/user_model.dart';
import 'package:app/state/dictionary_state.dart';
import 'package:app/state/onboarding_state.dart';
import 'package:app/state/snackbar_state.dart';
import 'package:app/state/styles_state.dart';
import 'package:draft/draft.dart';
import 'package:equatable/equatable.dart';

part 'app_state.draft.dart';

@draft
class AppState with EquatableMixin {
  final ActionStatus status;
  final String? error;

  final AuthUser? auth;
  final User? user;

  final Map<String, Term> termById;
  final Map<String, Tone> toneById;

  final SnackbarState snackbar;
  final OnboardingState onboarding;
  final DictionaryState dictionary;
  final StylesState styles;

  const AppState({
    this.status = ActionStatus.loading,
    this.error,
    this.auth,
    this.user,
    this.termById = const {},
    this.toneById = const {},
    this.snackbar = const SnackbarState(),
    this.onboarding = const OnboardingState(),
    this.dictionary = const DictionaryState(),
    this.styles = const StylesState(),
  });

  bool get isLoggedIn => auth != null;
  bool get isOnboarded => user?.onboarded ?? false;

  @override
  List<Object?> get props => [
    status,
    error,
    auth,
    user,
    termById,
    toneById,
    snackbar,
    onboarding,
    dictionary,
    styles,
  ];
}
