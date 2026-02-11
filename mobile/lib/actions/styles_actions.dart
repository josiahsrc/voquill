import 'package:app/actions/snackbar_actions.dart';
import 'package:app/api/tone_api.dart';
import 'package:app/model/common_model.dart';
import 'package:app/model/firebase_model.dart';
import 'package:app/model/tone_model.dart';
import 'package:app/store/store.dart';
import 'package:app/utils/app_utils.dart';
import 'package:app/utils/log_utils.dart';
import 'package:app/utils/tone_utils.dart';
import 'package:uuid/uuid.dart';

final _logger = createNamedLogger('styles_actions');

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
      draft.styles.selectedToneId ??= defaultToneId;
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

void selectTone(String toneId) {
  produceAppState((draft) {
    draft.styles.selectedToneId = toneId;
  });
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

  produceAppState((draft) {
    draft.toneById[tone.id] = tone.draft();
    draft.styles.toneIds = [tone.id, ...draft.styles.toneIds];
    draft.styles.selectedToneId = tone.id;
  });

  try {
    await UpsertMyToneApi().call(UpsertMyToneInput(tone: tone));
  } catch (e) {
    _logger.e('Failed to create tone', e);
    produceAppState((draft) {
      draft.toneById.remove(tone.id);
      draft.styles.toneIds =
          draft.styles.toneIds.where((id) => id != tone.id).toList();
      draft.styles.selectedToneId = defaultToneId;
    });
    showErrorSnackbar(e);
  }
}

Future<void> updateTone(Tone tone) async {
  final previous = getAppState().toneById[tone.id];

  produceAppState((draft) {
    draft.toneById[tone.id] = tone.draft();
  });

  try {
    await UpsertMyToneApi().call(UpsertMyToneInput(tone: tone));
  } catch (e) {
    _logger.e('Failed to update tone', e);
    if (previous != null) {
      produceAppState((draft) {
        draft.toneById[tone.id] = previous.draft();
      });
    }
    showErrorSnackbar(e);
  }
}

Future<void> deleteTone(String toneId) async {
  final previous = getAppState().toneById[toneId];
  final previousIds = List<String>.from(getAppState().styles.toneIds);
  final wasSelected = getAppState().styles.selectedToneId == toneId;

  produceAppState((draft) {
    draft.toneById.remove(toneId);
    draft.styles.toneIds =
        draft.styles.toneIds.where((id) => id != toneId).toList();
    if (wasSelected) {
      draft.styles.selectedToneId = defaultToneId;
    }
  });

  try {
    await DeleteMyToneApi().call(DeleteMyToneInput(toneId: toneId));
  } catch (e) {
    _logger.e('Failed to delete tone', e);
    produceAppState((draft) {
      if (previous != null) {
        draft.toneById[toneId] = previous.draft();
      }
      draft.styles.toneIds = previousIds;
      if (wasSelected) {
        draft.styles.selectedToneId = toneId;
      }
    });
    showErrorSnackbar(e);
  }
}
