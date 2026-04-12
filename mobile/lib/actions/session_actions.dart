import 'package:app/model/session_history_entry.dart';
import 'package:app/utils/log_utils.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_database/firebase_database.dart';

final _logger = createNamedLogger('session_actions');

Future<void> sendPasteText(String sessionId, String text) async {
  final uid = FirebaseAuth.instance.currentUser?.uid;
  if (uid == null) return;

  final sessionRef = FirebaseDatabase.instance.ref('session/$uid/$sessionId');
  final entryId = sessionRef.child('history').push().key!;

  final entry = SessionHistoryEntry(
    type: SessionHistoryEntryType.user,
    time: DateTime.now().millisecondsSinceEpoch,
    message: text,
  );

  await sessionRef.update({
    'pasteText': text,
    'pasteTimestamp': ServerValue.timestamp,
    'lastActive': ServerValue.timestamp,
    'history/$entryId': entry.encode(),
  });

  _logger.i('Sent paste to session $sessionId (history $entryId)');
}
