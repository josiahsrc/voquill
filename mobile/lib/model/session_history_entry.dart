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
}

enum AssistantReviewStatus {
  @JsonValue('approved')
  approved,
  @JsonValue('denied')
  denied,
}

@JsonSerializable(includeIfNull: false)
class AssistantReview with EquatableMixin {
  final String message;
  final AssistantReviewStatus? status;
  final String? response;

  const AssistantReview({required this.message, this.status, this.response});

  factory AssistantReview.fromJson(Map<String, dynamic> json) =>
      _$AssistantReviewFromJson(json);

  Map<String, dynamic> toJson() => _$AssistantReviewToJson(this);

  AssistantReview copyWith({
    AssistantReviewStatus? status,
    String? response,
    bool clearResponse = false,
  }) => AssistantReview(
    message: message,
    status: status ?? this.status,
    response: clearResponse ? null : (response ?? this.response),
  );

  bool get isPending => status == null;
  bool get isApproved => status == AssistantReviewStatus.approved;
  bool get isDenied => status == AssistantReviewStatus.denied;

  @override
  List<Object?> get props => [message, status, response];
}

@JsonSerializable(includeIfNull: false)
class AssistantQuestion with EquatableMixin {
  final String message;
  final String? response;

  const AssistantQuestion({required this.message, this.response});

  factory AssistantQuestion.fromJson(Map<String, dynamic> json) =>
      _$AssistantQuestionFromJson(json);

  Map<String, dynamic> toJson() => _$AssistantQuestionToJson(this);

  AssistantQuestion copyWith({String? response}) =>
      AssistantQuestion(message: message, response: response ?? this.response);

  bool get isPending => response == null;

  @override
  List<Object?> get props => [message, response];
}

@JsonSerializable(includeIfNull: false)
@draft
class SessionHistoryEntry with EquatableMixin {
  @JsonKey(includeFromJson: false, includeToJson: false)
  final String? id;
  @JsonKey(unknownEnumValue: SessionHistoryEntryType.assistant)
  final SessionHistoryEntryType type;
  final int time;
  final String? message;
  final String? summary;
  final List<AssistantReview>? reviews;
  final List<AssistantQuestion>? questions;

  const SessionHistoryEntry({
    this.id,
    required this.type,
    required this.time,
    this.message,
    this.summary,
    this.reviews,
    this.questions,
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

  bool get isAssistant => type == SessionHistoryEntryType.assistant;
  bool get isUser => type == SessionHistoryEntryType.user;

  List<AssistantReview> get reviewList => reviews ?? const [];
  List<AssistantQuestion> get questionList => questions ?? const [];

  int? get nextPendingReviewIndex {
    for (var i = 0; i < reviewList.length; i++) {
      if (reviewList[i].isPending) return i;
    }
    return null;
  }

  int? get nextPendingQuestionIndex {
    for (var i = 0; i < questionList.length; i++) {
      if (questionList[i].isPending) return i;
    }
    return null;
  }

  bool get hasPendingItems =>
      nextPendingReviewIndex != null || nextPendingQuestionIndex != null;

  bool get hasAnyItems =>
      (summary != null && summary!.isNotEmpty) ||
      reviewList.isNotEmpty ||
      questionList.isNotEmpty;

  @override
  List<Object?> get props => [
    id,
    type,
    time,
    message,
    summary,
    reviews,
    questions,
  ];
}
