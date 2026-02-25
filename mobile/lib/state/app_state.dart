import 'package:app/model/auth_user_model.dart';
import 'package:app/model/common_model.dart';
import 'package:app/model/config_model.dart';
import 'package:app/model/member_model.dart';
import 'package:app/model/term_model.dart';
import 'package:app/model/tone_model.dart';
import 'package:app/model/transcription_model.dart';
import 'package:app/model/user_model.dart';
import 'package:app/state/dictionary_state.dart';
import 'package:app/state/onboarding_state.dart';
import 'package:app/state/snackbar_state.dart';
import 'package:app/state/api_key_state.dart';
import 'package:app/state/styles_state.dart';
import 'package:draft/draft.dart';
import 'package:equatable/equatable.dart';

part 'app_state.draft.dart';

@draft
class AppState with EquatableMixin {
  final ActionStatus status;
  final String? error;
  final List<String> sortedTranscriptionIds;

  final AuthUser? auth;
  final User? user;
  final Member? member;
  final FullConfig? config;

  final Map<String, Term> termById;
  final Map<String, Tone> toneById;
  final Map<String, Transcription> transcriptionById;

  final SnackbarState snackbar;
  final OnboardingState onboarding;
  final DictionaryState dictionary;
  final StylesState styles;
  final ApiKeyState apiKeys;

  final List<String> dictationLanguages;
  final String? activeDictationLanguage;

  final bool hasMicrophonePermission;
  final bool hasKeyboardPermission;

  const AppState({
    this.status = ActionStatus.loading,
    this.error,
    this.auth,
    this.user,
    this.member,
    this.config,
    this.termById = const {},
    this.toneById = const {},
    this.transcriptionById = const {},
    this.sortedTranscriptionIds = const [],
    this.snackbar = const SnackbarState(),
    this.onboarding = const OnboardingState(),
    this.dictionary = const DictionaryState(),
    this.styles = const StylesState(),
    this.apiKeys = const ApiKeyState(),
    this.dictationLanguages = const ['en'],
    this.activeDictationLanguage,
    this.hasMicrophonePermission = false,
    this.hasKeyboardPermission = false,
  });

  bool get isLoggedIn => auth != null;
  bool get isOnboarded => user?.onboarded ?? false;
  bool get hasPermissions => hasMicrophonePermission && hasKeyboardPermission;

  @override
  List<Object?> get props => [
    status,
    error,
    auth,
    user,
    member,
    config,
    termById,
    toneById,
    transcriptionById,
    sortedTranscriptionIds,
    snackbar,
    onboarding,
    dictionary,
    styles,
    apiKeys,
    dictationLanguages,
    activeDictationLanguage,
    hasMicrophonePermission,
    hasKeyboardPermission,
  ];
}
