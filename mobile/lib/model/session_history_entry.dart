import 'dart:convert';

import 'package:equatable/equatable.dart';

enum SessionHistoryEntryType {
  user,
  assistant;

  String toWire() => name;

  static SessionHistoryEntryType fromWire(String? value) {
    return SessionHistoryEntryType.values.firstWhere(
      (t) => t.name == value,
      orElse: () => SessionHistoryEntryType.user,
    );
  }
}

class SessionHistoryEntry with EquatableMixin {
  final SessionHistoryEntryType type;
  final int time;
  final String message;

  const SessionHistoryEntry({
    required this.type,
    required this.time,
    required this.message,
  });

  factory SessionHistoryEntry.fromJson(Map<String, dynamic> json) {
    return SessionHistoryEntry(
      type: SessionHistoryEntryType.fromWire(json['type'] as String?),
      time: (json['time'] as num?)?.toInt() ?? 0,
      message: json['message'] as String? ?? '',
    );
  }

  Map<String, dynamic> toJson() => {
    'type': type.toWire(),
    'time': time,
    'message': message,
  };

  String encode() => jsonEncode(toJson());

  static SessionHistoryEntry? tryDecode(String raw) {
    try {
      final decoded = jsonDecode(raw);
      if (decoded is Map<String, dynamic>) {
        return SessionHistoryEntry.fromJson(decoded);
      }
    } catch (_) {}
    return null;
  }

  DateTime get sentAt => DateTime.fromMillisecondsSinceEpoch(time);

  @override
  List<Object?> get props => [type, time, message];
}
