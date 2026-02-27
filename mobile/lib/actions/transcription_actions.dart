import 'package:app/api/transcription_api.dart';
import 'package:app/store/store.dart';
import 'package:app/utils/app_utils.dart';
import 'package:app/utils/log_utils.dart';

final _logger = createNamedLogger('transcription_actions');

Future<void> loadTranscriptions() async {
  try {
    final transcriptions = await LoadTranscriptionsApi().call(null);
    transcriptions.sort(
      (a, b) => b.createdAtDate.compareTo(a.createdAtDate),
    );
    produceAppState((draft) {
      registerTranscriptions(draft, transcriptions);
      draft.sortedTranscriptionIds = transcriptions.map((t) => t.id).toList();
    });
  } catch (e) {
    _logger.w('Failed to load transcriptions', e);
  }
}
