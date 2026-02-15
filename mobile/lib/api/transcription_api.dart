import 'package:app/api/base_api.dart';
import 'package:app/model/transcription_model.dart';
import 'package:flutter/services.dart';

const _sharedChannel = MethodChannel('com.voquill.mobile/shared');

class LoadTranscriptionsApi extends BaseApi<void, List<Transcription>> {
  @override
  Future<List<Transcription>> call(void input) async {
    final result = await _sharedChannel.invokeMethod('getTranscriptions');
    if (result == null) return [];
    final list = (result as List).cast<Map>();
    return list
        .map((e) => Transcription.fromJson(Map<String, dynamic>.from(e)))
        .toList();
  }
}
