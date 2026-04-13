import 'package:app/model/session_history_entry.dart';
import 'package:app/state/app_state.dart';

List<SessionHistoryEntry> historyFor(String sessionId, AppState state) {
  final session = state.remote.session(sessionId);
  return session.historyIds
      .map((id) => state.sessionHistoryEntryById[id])
      .whereType<SessionHistoryEntry>()
      .toList();
}

SessionHistoryEntry? activeTurnFor(String sessionId, AppState state) {
  final history = historyFor(sessionId, state);
  for (var i = history.length - 1; i >= 0; i--) {
    final entry = history[i];
    if (entry.isAssistant && entry.hasPendingItems) return entry;
  }
  return null;
}
