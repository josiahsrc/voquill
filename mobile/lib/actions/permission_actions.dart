import 'package:app/store/store.dart';
import 'package:app/utils/channel_utils.dart';
import 'package:permission_handler/permission_handler.dart';

Future<void> checkPermissions() async {
  final micStatus = await Permission.microphone.status;
  final keyboardEnabled = await isKeyboardEnabled();

  produceAppState((draft) {
    draft.hasMicrophonePermission = micStatus.isGranted;
    draft.hasKeyboardPermission = keyboardEnabled;
  });
}
