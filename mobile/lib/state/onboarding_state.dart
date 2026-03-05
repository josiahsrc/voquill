import 'package:draft/draft.dart';
import 'package:equatable/equatable.dart';

part 'onboarding_state.draft.dart';

@draft
class OnboardingState with EquatableMixin {
  final String name;
  final String title;
  final String company;
  final bool submitting;
  final bool nameProvidedByAuth;

  const OnboardingState({
    this.name = '',
    this.title = '',
    this.company = '',
    this.submitting = false,
    this.nameProvidedByAuth = false,
  });

  @override
  List<Object?> get props => [
    name,
    title,
    company,
    submitting,
    nameProvidedByAuth,
  ];
}
