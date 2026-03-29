import 'package:app/utils/log_utils.dart';
import 'package:firebase_auth/firebase_auth.dart';
import 'package:firebase_database/firebase_database.dart';

final _logger = createNamedLogger('session_actions');

Future<void> sendPasteText(String sessionId, String text) async {
  final uid = FirebaseAuth.instance.currentUser?.uid;
  if (uid == null) return;

  final sessionRef = FirebaseDatabase.instance.ref('session/$uid/$sessionId');
  await sessionRef.update({
    'pasteText': text,
    'pasteTimestamp': ServerValue.timestamp,
    'lastActive': ServerValue.timestamp,
  });

  _logger.i('Sent paste text to session $sessionId');
}
