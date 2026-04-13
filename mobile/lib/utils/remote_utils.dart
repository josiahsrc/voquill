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
  if (history.isEmpty) return null;
  final last = history.last;
  if (last.isAssistant && last.hasPendingItems) return last;
  return null;
}
