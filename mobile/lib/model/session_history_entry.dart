import 'dart:convert';

import 'package:draft/draft.dart';
import 'package:equatable/equatable.dart';
import 'package:json_annotation/json_annotation.dart';

part 'session_history_entry.g.dart';
part 'session_history_entry.draft.dart';

enum SessionHistoryEntryType {
  @JsonValue('user')
  user,
  @JsonValue('assistant')
  assistant,
  @JsonValue('summary')
  summary,
  @JsonValue('review')
  review,
  @JsonValue('question')
  question,
}

enum SessionHistoryEntryStatus {
  @JsonValue('approved')
  approved,
  @JsonValue('denied')
  denied,
  @JsonValue('answered')
  answered,
}

@JsonSerializable(includeIfNull: false)
@draft
class SessionHistoryEntry with EquatableMixin {
  @JsonKey(includeFromJson: false, includeToJson: false)
  final String? id;
  @JsonKey(unknownEnumValue: SessionHistoryEntryType.assistant)
  final SessionHistoryEntryType type;
  final int time;
  final String message;
  final SessionHistoryEntryStatus? status;
  final String? response;

  const SessionHistoryEntry({
    this.id,
    required this.type,
    required this.time,
    required this.message,
    this.status,
    this.response,
  });

  factory SessionHistoryEntry.fromJson(Map<String, dynamic> json) =>
      _$SessionHistoryEntryFromJson(json);

  Map<String, dynamic> toJson() => _$SessionHistoryEntryToJson(this);

  String encode() => jsonEncode(toJson());

  static SessionHistoryEntry? tryDecode(String raw, {String? id}) {
    try {
      final decoded = jsonDecode(raw);
      if (decoded is Map<String, dynamic>) {
        final entry = SessionHistoryEntry.fromJson(decoded);
        return id != null ? entry.produce((d) => d.id = id) : entry;
      }
    } catch (_) {}
    return null;
  }

  DateTime get sentAt => DateTime.fromMillisecondsSinceEpoch(time);

  @override
  List<Object?> get props => [id, type, time, message, status, response];
}
