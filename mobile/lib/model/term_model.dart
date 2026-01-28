import 'package:draft/draft.dart';
import 'package:equatable/equatable.dart';
import 'package:json_annotation/json_annotation.dart';

part 'term_model.g.dart';
part 'term_model.draft.dart';

@JsonSerializable()
@draft
class Term with EquatableMixin {
  final String id;
  final String createdAt;
  final String sourceValue;
  final String destinationValue;
  final bool isReplacement;

  const Term({
    required this.id,
    required this.createdAt,
    required this.sourceValue,
    required this.destinationValue,
    required this.isReplacement,
  });

  factory Term.fromJson(Map<String, dynamic> json) => _$TermFromJson(json);
  Map<String, dynamic> toJson() => _$TermToJson(this);

  @override
  List<Object?> get props => [
    id,
    createdAt,
    sourceValue,
    destinationValue,
    isReplacement,
  ];
}
