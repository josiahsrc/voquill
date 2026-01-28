import 'package:app/state/app_state.dart';
import 'package:app/state/snackbar_state.dart';

void applyShowSnackbarToDraft(
  AppStateDraft draft, {
  required String message,
  SnackbarType type = SnackbarType.info,
  Duration duration = const Duration(seconds: 5),
}) {
  draft.snackbar.counter++;
  draft.snackbar.message = message;
  draft.snackbar.type = type;
  draft.snackbar.duration = duration;
}
