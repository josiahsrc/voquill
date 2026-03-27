import 'package:draft/draft.dart';
import 'package:equatable/equatable.dart';
import 'package:json_annotation/json_annotation.dart';

part 'member_model.g.dart';
part 'member_model.draft.dart';

enum MemberPlan {
  @JsonValue('free')
  free,
  @JsonValue('pro')
  pro,
}

@JsonSerializable()
@draft
class Member with EquatableMixin {
  final String id;
  final String type;
  final String createdAt;
  final String updatedAt;
  final MemberPlan plan;
  final String? stripeCustomerId;
  final String? priceId;
  final int wordsToday;
  final int? wordsThisWeek;
  final int wordsThisMonth;
  final int wordsTotal;
  final int tokensToday;
  final int? tokensThisWeek;
  final int tokensThisMonth;
  final int tokensTotal;
  final String todayResetAt;
  final String? thisWeekResetAt;
  final String thisMonthResetAt;
  final bool? isOnTrial;
  final String? trialEndsAt;

  const Member({
    required this.id,
    required this.type,
    required this.createdAt,
    required this.updatedAt,
    required this.plan,
    this.stripeCustomerId,
    this.priceId,
    required this.wordsToday,
    this.wordsThisWeek,
    required this.wordsThisMonth,
    required this.wordsTotal,
    required this.tokensToday,
    this.tokensThisWeek,
    required this.tokensThisMonth,
    required this.tokensTotal,
    required this.todayResetAt,
    this.thisWeekResetAt,
    required this.thisMonthResetAt,
    this.isOnTrial,
    this.trialEndsAt,
  });

  factory Member.fromJson(Map<String, dynamic> json) => _$MemberFromJson(json);
  Map<String, dynamic> toJson() => _$MemberToJson(this);

  @override
  List<Object?> get props => [
    id,
    type,
    createdAt,
    updatedAt,
    plan,
    stripeCustomerId,
    priceId,
    wordsToday,
    wordsThisWeek,
    wordsThisMonth,
    wordsTotal,
    tokensToday,
    tokensThisWeek,
    tokensThisMonth,
    tokensTotal,
    todayResetAt,
    thisWeekResetAt,
    thisMonthResetAt,
    isOnTrial,
    trialEndsAt,
  ];
}
