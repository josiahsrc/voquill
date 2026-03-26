import 'package:draft/draft.dart';
import 'package:equatable/equatable.dart';
import 'package:json_annotation/json_annotation.dart';

part 'config_model.g.dart';
part 'config_model.draft.dart';

@JsonSerializable()
@draft
class FullConfig with EquatableMixin {
  final int freeWordsPerDay;
  final int freeWordsPerWeek;
  final int freeWordsPerMonth;
  final int freeTokensPerDay;
  final int freeTokensPerWeek;
  final int freeTokensPerMonth;
  final int proWordsPerDay;
  final int proWordsPerWeek;
  final int proWordsPerMonth;
  final int proTokensPerDay;
  final int proTokensPerWeek;
  final int proTokensPerMonth;
  final Map<String, String>? toneOverrides;

  const FullConfig({
    required this.freeWordsPerDay,
    required this.freeWordsPerWeek,
    required this.freeWordsPerMonth,
    required this.freeTokensPerDay,
    required this.freeTokensPerWeek,
    required this.freeTokensPerMonth,
    required this.proWordsPerDay,
    required this.proWordsPerWeek,
    required this.proWordsPerMonth,
    required this.proTokensPerDay,
    required this.proTokensPerWeek,
    required this.proTokensPerMonth,
    this.toneOverrides,
  });

  factory FullConfig.fromJson(Map<String, dynamic> json) =>
      _$FullConfigFromJson(json);
  Map<String, dynamic> toJson() => _$FullConfigToJson(this);

  @override
  List<Object?> get props => [
    freeWordsPerDay,
    freeWordsPerWeek,
    freeWordsPerMonth,
    freeTokensPerDay,
    freeTokensPerWeek,
    freeTokensPerMonth,
    proWordsPerDay,
    proWordsPerWeek,
    proWordsPerMonth,
    proTokensPerDay,
    proTokensPerWeek,
    proTokensPerMonth,
    toneOverrides,
  ];
}
