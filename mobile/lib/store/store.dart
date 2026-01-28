import 'package:app/state/app_state.dart';
import 'package:flutter_zustand/flutter_zustand.dart';

export 'package:flutter_zustand/flutter_zustand.dart';

class AppStore extends Store<AppState> {
  AppStore() : super(const AppState());

  @override
  void set(AppState value) {
    super.set(value);
  }
}

AppStore useAppStore() => create(() => AppStore());

AppState getAppState() => useAppStore().state;

void setAppState(AppState state) => useAppStore().set(state);

void produceAppState(void Function(AppStateDraft draft) cb) {
  final updated = getAppState().draft();
  cb(updated);
  setAppState(updated.save());
}
