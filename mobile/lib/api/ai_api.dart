import 'package:app/api/firebase_api.dart';
import 'package:app/model/firebase_model.dart';

class TranscribeAudioApi
    extends FirebaseApi<TranscribeAudioInput, TranscribeAudioOutput> {
  @override
  String get handlerName => 'ai/transcribeAudio';

  @override
  Map<String, dynamic> serializeInput(TranscribeAudioInput input) =>
      input.toJson();

  @override
  TranscribeAudioOutput parseOutput(Map<String, dynamic> data) =>
      TranscribeAudioOutput.fromJson(data);
}

class GenerateTextApi
    extends FirebaseApi<GenerateTextInput, GenerateTextOutput> {
  @override
  String get handlerName => 'ai/generateText';

  @override
  Map<String, dynamic> serializeInput(GenerateTextInput input) =>
      input.toJson();

  @override
  GenerateTextOutput parseOutput(Map<String, dynamic> data) =>
      GenerateTextOutput.fromJson(data);
}
