import 'package:draft/draft.dart';
import 'package:equatable/equatable.dart';
import 'package:json_annotation/json_annotation.dart';

part 'transcription_model.g.dart';
part 'transcription_model.draft.dart';

@JsonSerializable()
@draft
class Transcription with EquatableMixin {
  final String id;
  final String text;
  final String rawTranscript;
  final String? toneId;
  final String? toneName;
  final String createdAt;
  final String? audioPath;

  const Transcription({
    required this.id,
    required this.text,
    required this.rawTranscript,
    this.toneId,
    this.toneName,
    required this.createdAt,
    this.audioPath,
  });

  factory Transcription.fromJson(Map<String, dynamic> json) =>
      _$TranscriptionFromJson(json);
  Map<String, dynamic> toJson() => _$TranscriptionToJson(this);

  DateTime get createdAtDate => DateTime.parse(createdAt);

  @override
  List<Object?> get props => [
    id,
    text,
    rawTranscript,
    toneId,
    toneName,
    createdAt,
    audioPath,
  ];
}
