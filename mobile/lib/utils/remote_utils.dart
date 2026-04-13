import 'package:app/model/session_history_entry.dart';
import 'package:app/state/app_state.dart';

List<SessionHistoryEntry> historyFor(String sessionId, AppState state) {
  final session = state.remote.session(sessionId);
  return session.historyIds
      .map((id) => state.sessionHistoryEntryById[id])
      .whereType<SessionHistoryEntry>()
      .toList();
}

List<SessionHistoryEntry> pendingReviewsFor(String sessionId, AppState state) {
  return historyFor(sessionId, state).where((e) => e.isPendingReview).toList();
}

bool sessionHasUnresolvedReviews(String sessionId, AppState state) {
  return pendingReviewsFor(sessionId, state).isNotEmpty;
}
