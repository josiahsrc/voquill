import 'package:app/model/api_key_model.dart';
import 'package:app/model/common_model.dart';
import 'package:draft/draft.dart';
import 'package:equatable/equatable.dart';

part 'api_key_state.draft.dart';

enum TranscriptionMode { cloud, api }

enum PostProcessingMode { cloud, api, off }

@draft
class ApiKeyState with EquatableMixin {
  final List<ApiKeyEntry> transcriptionApiKeys;
  final List<ApiKeyEntry> postProcessingApiKeys;
  final String? selectedTranscriptionApiKeyId;
  final String? selectedPostProcessingApiKeyId;
  final TranscriptionMode transcriptionMode;
  final PostProcessingMode postProcessingMode;
  final ActionStatus transcriptionApiKeysStatus;
  final ActionStatus postProcessingApiKeysStatus;

  const ApiKeyState({
    this.transcriptionApiKeys = const [],
    this.postProcessingApiKeys = const [],
    this.selectedTranscriptionApiKeyId,
    this.selectedPostProcessingApiKeyId,
    this.transcriptionMode = TranscriptionMode.cloud,
    this.postProcessingMode = PostProcessingMode.cloud,
    this.transcriptionApiKeysStatus = ActionStatus.idle,
    this.postProcessingApiKeysStatus = ActionStatus.idle,
  });

  @override
  List<Object?> get props => [
    transcriptionApiKeys,
    postProcessingApiKeys,
    selectedTranscriptionApiKeyId,
    selectedPostProcessingApiKeyId,
    transcriptionMode,
    postProcessingMode,
    transcriptionApiKeysStatus,
    postProcessingApiKeysStatus,
  ];
}
