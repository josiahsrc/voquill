import 'package:json_annotation/json_annotation.dart';

part 'member_model.g.dart';

enum MemberPlan {
  @JsonValue('free')
  free,
  @JsonValue('pro')
  pro,
}

@JsonSerializable()
class Member {
  final String id;
  final String type;
  final String createdAt;
  final String updatedAt;
  final MemberPlan plan;
  final String? stripeCustomerId;
  final String? priceId;
  final int wordsToday;
  final int wordsThisMonth;
  final int wordsTotal;
  final int tokensToday;
  final int tokensThisMonth;
  final int tokensTotal;
  final String todayResetAt;
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
    required this.wordsThisMonth,
    required this.wordsTotal,
    required this.tokensToday,
    required this.tokensThisMonth,
    required this.tokensTotal,
    required this.todayResetAt,
    required this.thisMonthResetAt,
    this.isOnTrial,
    this.trialEndsAt,
  });

  factory Member.fromJson(Map<String, dynamic> json) => _$MemberFromJson(json);
  Map<String, dynamic> toJson() => _$MemberToJson(this);
}
