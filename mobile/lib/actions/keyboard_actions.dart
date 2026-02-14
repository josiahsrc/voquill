import 'package:app/model/tone_model.dart';
import 'package:app/store/store.dart';
import 'package:app/utils/channel_utils.dart';
import 'package:app/utils/tone_utils.dart';
import 'package:app/utils/user_utils.dart';

void syncTonesToKeyboard() {
  final state = getAppState();
  final selectedToneId = getManuallySelectedToneId(state);
  final activeToneIds = getActiveSortedToneIds(state);
  final toneById = <String, SharedTone>{};
  for (final entry in state.toneById.entries) {
    toneById[entry.key] = SharedTone(
      name: entry.value.name,
      promptTemplate: entry.value.promptTemplate,
    );
  }
  syncKeyboardTones(
    selectedToneId: selectedToneId,
    activeToneIds: activeToneIds,
    toneById: toneById,
  );
}

void syncUserToKeyboard() {
  final state = getAppState();
  final user = state.user;
  if (user != null) {
    syncKeyboardUser(
      userName: user.name,
      dictationLanguage: getMyPrimaryDictationLanguage(state),
    );
  }
}

void syncKeyboardOnInit() {
  syncTonesToKeyboard();
  syncUserToKeyboard();
}
