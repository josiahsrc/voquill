import 'package:app/state/snackbar_state.dart';
import 'package:app/store/store.dart';
import 'package:app/utils/snackbar_utils.dart';

void showSnackbar(
  String message, {
  SnackbarType type = SnackbarType.info,
  Duration duration = const Duration(seconds: 5),
}) {
  produceAppState((draft) {
    applyShowSnackbarToDraft(
      draft,
      message: message,
      type: type,
      duration: duration,
    );
  });
}

void showErrorSnackbar(dynamic error) {
  showSnackbar(error.toString(), type: SnackbarType.error);
}
