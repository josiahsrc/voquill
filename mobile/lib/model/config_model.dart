import 'package:draft/draft.dart';
import 'package:equatable/equatable.dart';
import 'package:json_annotation/json_annotation.dart';

part 'config_model.g.dart';
part 'config_model.draft.dart';

@JsonSerializable()
@draft
class FullConfig with EquatableMixin {
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

  @override
  List<Object?> get props => [
    freeWordsPerDay,
    freeWordsPerMonth,
    freeTokensPerDay,
    freeTokensPerMonth,
    proWordsPerDay,
    proWordsPerMonth,
    proTokensPerDay,
    proTokensPerMonth,
  ];
}
