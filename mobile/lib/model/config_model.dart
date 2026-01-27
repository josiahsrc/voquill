import 'package:json_annotation/json_annotation.dart';

part 'config_model.g.dart';

@JsonSerializable()
class FullConfig {
  final int freeWordsPerDay;
  final int freeWordsPerMonth;
  final int freeTokensPerDay;
  final int freeTokensPerMonth;
  final int proWordsPerDay;
  final int proWordsPerMonth;
  final int proTokensPerDay;
  final int proTokensPerMonth;

  const FullConfig({
    required this.freeWordsPerDay,
    required this.freeWordsPerMonth,
    required this.freeTokensPerDay,
    required this.freeTokensPerMonth,
    required this.proWordsPerDay,
    required this.proWordsPerMonth,
    required this.proTokensPerDay,
    required this.proTokensPerMonth,
  });

  factory FullConfig.fromJson(Map<String, dynamic> json) =>
      _$FullConfigFromJson(json);
  Map<String, dynamic> toJson() => _$FullConfigToJson(this);
}
