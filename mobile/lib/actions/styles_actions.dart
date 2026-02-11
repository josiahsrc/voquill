import 'package:app/actions/snackbar_actions.dart';
import 'package:app/api/tone_api.dart';
import 'package:app/api/user_api.dart';
import 'package:app/model/common_model.dart';
import 'package:app/model/firebase_model.dart';
import 'package:app/model/tone_model.dart';
import 'package:app/model/user_model.dart';
import 'package:app/store/store.dart';
import 'package:app/utils/app_utils.dart';
import 'package:app/utils/log_utils.dart';
import 'package:app/utils/tone_utils.dart';
import 'package:uuid/uuid.dart';

final _logger = createNamedLogger('styles_actions');

Future<void> _saveUser(User user) async {
  await SetMyUserApi().call(SetMyUserInput(value: user));
}

User _currentUser() => getAppState().user!;

String _now() => DateTime.now().toUtc().toIso8601String();

Future<void> loadStyles() async {
  produceAppState((draft) {
    draft.styles.status = ActionStatus.loading;
  });

  try {
    final output = await ListMyTonesApi().call(null);
    final allTones = mergeSystemTones(output.tones);
    final sorted = sortTones(allTones);

    produceAppState((draft) {
      registerTones(draft, allTones);
      draft.styles.toneIds = sorted.map((t) => t.id).toList();
      draft.styles.status = ActionStatus.success;
    });
  } catch (e) {
    _logger.e('Failed to load styles', e);
    produceAppState((draft) {
      draft.styles.status = ActionStatus.error;
    });
    showErrorSnackbar(e);
  }
}

Future<void> selectTone(String toneId) async {
  final previous = _currentUser();
  final updated = (previous.draft()
        ..updatedAt = _now()
        ..selectedToneId = toneId)
      .save();

  produceAppState((draft) {
    draft.user = updated;
  });

  try {
    await _saveUser(updated);
  } catch (e) {
    _logger.e('Failed to select tone', e);
    produceAppState((draft) {
      draft.user = previous;
    });
    showErrorSnackbar(e);
  }
}

Future<void> setActiveToneIds(List<String> toneIds) async {
  final previous = _currentUser();
  final updated = (previous.draft()
        ..updatedAt = _now()
        ..activeToneIds = toneIds)
      .save();

  produceAppState((draft) {
    draft.user = updated;
  });

  try {
    await _saveUser(updated);
  } catch (e) {
    _logger.e('Failed to update active tone IDs', e);
    produceAppState((draft) {
      draft.user = previous;
    });
    showErrorSnackbar(e);
  }
}

Future<void> createTone({
  required String name,
  required String promptTemplate,
}) async {
  final tone = Tone(
    id: const Uuid().v4(),
    name: name,
    promptTemplate: promptTemplate,
    isSystem: false,
    createdAt: DateTime.now().millisecondsSinceEpoch,
    sortOrder: 0,
  );

  final previous = _currentUser();
  final currentActive = previous.activeToneIds ?? [];
  final updated = (previous.draft()
        ..updatedAt = _now()
        ..selectedToneId = tone.id
        ..activeToneIds = [tone.id, ...currentActive])
      .save();

  produceAppState((draft) {
    draft.toneById[tone.id] = tone.draft();
    draft.styles.toneIds = [tone.id, ...draft.styles.toneIds];
    draft.user = updated;
  });

  try {
    await UpsertMyToneApi().call(UpsertMyToneInput(tone: tone));
    await _saveUser(updated);
  } catch (e) {
    _logger.e('Failed to create tone', e);
    produceAppState((draft) {
      draft.toneById.remove(tone.id);
      draft.styles.toneIds =
          draft.styles.toneIds.where((id) => id != tone.id).toList();
      draft.user = previous;
    });
    showErrorSnackbar(e);
  }
}

Future<void> updateTone(Tone tone) async {
  final previousTone = getAppState().toneById[tone.id];

  produceAppState((draft) {
    draft.toneById[tone.id] = tone.draft();
  });

  try {
    await UpsertMyToneApi().call(UpsertMyToneInput(tone: tone));
  } catch (e) {
    _logger.e('Failed to update tone', e);
    if (previousTone != null) {
      produceAppState((draft) {
        draft.toneById[tone.id] = previousTone.draft();
      });
    }
    showErrorSnackbar(e);
  }
}

Future<void> deleteTone(String toneId) async {
  final previousTone = getAppState().toneById[toneId];
  final previousToneIds = List<String>.from(getAppState().styles.toneIds);
  final previous = _currentUser();
  final currentActive = previous.activeToneIds ?? [];
  final wasSelected = previous.selectedToneId == toneId;

  final updated = (previous.draft()
        ..updatedAt = _now()
        ..selectedToneId = wasSelected ? defaultToneId : previous.selectedToneId
        ..activeToneIds = currentActive.where((id) => id != toneId).toList())
      .save();

  produceAppState((draft) {
    draft.toneById.remove(toneId);
    draft.styles.toneIds =
        draft.styles.toneIds.where((id) => id != toneId).toList();
    draft.user = updated;
  });

  try {
    await DeleteMyToneApi().call(DeleteMyToneInput(toneId: toneId));
    await _saveUser(updated);
  } catch (e) {
    _logger.e('Failed to delete tone', e);
    produceAppState((draft) {
      if (previousTone != null) {
        draft.toneById[toneId] = previousTone.draft();
      }
      draft.styles.toneIds = previousToneIds;
      draft.user = previous;
    });
    showErrorSnackbar(e);
  }
}
