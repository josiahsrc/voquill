import 'package:json_annotation/json_annotation.dart';

part 'user_model.g.dart';

@JsonSerializable()
class User {
  final String id;
  final String createdAt;
  final String updatedAt;
  final String name;
  final String? bio;
  final String? company;
  final String? title;
  final bool onboarded;
  final String? onboardedAt;
  final String? timezone;
  final String? preferredLanguage;
  final String? preferredMicrophone;
  final bool playInteractionChime;
  final bool hasFinishedTutorial;
  final int wordsThisMonth;
  final String? wordsThisMonthMonth;
  final int wordsTotal;
  final bool? hasMigratedPreferredMicrophone;
  final String? cohort;
  final bool? shouldShowUpgradeDialog;

  const User({
    required this.id,
    required this.createdAt,
    required this.updatedAt,
    required this.name,
    this.bio,
    this.company,
    this.title,
    required this.onboarded,
    this.onboardedAt,
    this.timezone,
    this.preferredLanguage,
    this.preferredMicrophone,
    required this.playInteractionChime,
    required this.hasFinishedTutorial,
    required this.wordsThisMonth,
    this.wordsThisMonthMonth,
    required this.wordsTotal,
    this.hasMigratedPreferredMicrophone,
    this.cohort,
    this.shouldShowUpgradeDialog,
  });

  factory User.fromJson(Map<String, dynamic> json) => _$UserFromJson(json);
  Map<String, dynamic> toJson() => _$UserToJson(this);
}
