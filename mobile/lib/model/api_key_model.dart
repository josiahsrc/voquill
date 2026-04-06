import 'package:equatable/equatable.dart';

enum ApiKeyProvider {
  openai,
  groq,
  deepseek,
  openRouter,
  openaiCompatible,
  speaches,
  gemini,
  claude,
  cerebras,
  ollama,
  azure;

  String get displayName {
    switch (this) {
      case ApiKeyProvider.openai:
        return 'OpenAI';
      case ApiKeyProvider.groq:
        return 'Groq';
      case ApiKeyProvider.deepseek:
        return 'Deepseek';
      case ApiKeyProvider.openRouter:
        return 'OpenRouter';
      case ApiKeyProvider.openaiCompatible:
        return 'OpenAI-Compatible';
      case ApiKeyProvider.speaches:
        return 'Speaches';
      case ApiKeyProvider.gemini:
        return 'Google Gemini';
      case ApiKeyProvider.claude:
        return 'Anthropic Claude';
      case ApiKeyProvider.cerebras:
        return 'Cerebras';
      case ApiKeyProvider.ollama:
        return 'Ollama';
      case ApiKeyProvider.azure:
        return 'Azure';
    }
  }

  bool get supportsTranscription {
    switch (this) {
      case ApiKeyProvider.openai:
      case ApiKeyProvider.groq:
      case ApiKeyProvider.openaiCompatible:
      case ApiKeyProvider.speaches:
      case ApiKeyProvider.gemini:
      case ApiKeyProvider.ollama:
      case ApiKeyProvider.azure:
        return true;
      case ApiKeyProvider.deepseek:
      case ApiKeyProvider.openRouter:
      case ApiKeyProvider.claude:
      case ApiKeyProvider.cerebras:
        return false;
    }
  }

  bool get supportsPostProcessing {
    switch (this) {
      case ApiKeyProvider.openai:
      case ApiKeyProvider.groq:
      case ApiKeyProvider.deepseek:
      case ApiKeyProvider.openRouter:
      case ApiKeyProvider.openaiCompatible:
      case ApiKeyProvider.gemini:
      case ApiKeyProvider.claude:
      case ApiKeyProvider.cerebras:
      case ApiKeyProvider.ollama:
      case ApiKeyProvider.azure:
        return true;
      case ApiKeyProvider.speaches:
        return false;
    }
  }

  bool get needsBaseUrl {
    switch (this) {
      case ApiKeyProvider.openaiCompatible:
      case ApiKeyProvider.speaches:
      case ApiKeyProvider.ollama:
      case ApiKeyProvider.azure:
        return true;
      default:
        return false;
    }
  }

  bool get needsAzureRegion {
    return this == ApiKeyProvider.azure;
  }

  bool get isApiKeyOptional {
    return this == ApiKeyProvider.ollama;
  }

  String get serializedName {
    switch (this) {
      case ApiKeyProvider.openRouter:
        return 'openRouter';
      case ApiKeyProvider.openaiCompatible:
        return 'openaiCompatible';
      default:
        return name;
    }
  }

  static ApiKeyProvider fromSerializedName(String value) {
    return ApiKeyProvider.values.firstWhere(
      (p) => p.serializedName == value,
      orElse: () => ApiKeyProvider.openai,
    );
  }
}

enum AiMode {
  cloud,
  api;

  String get displayName {
    switch (this) {
      case AiMode.cloud:
        return 'Cloud';
      case AiMode.api:
        return 'API';
    }
  }
}

class ApiKey with EquatableMixin {
  final String id;
  final String name;
  final ApiKeyProvider provider;
  final String keySuffix;
  final String createdAt;
  final String? baseUrl;
  final String? transcriptionModel;
  final String? postProcessingModel;
  final String? azureRegion;

  const ApiKey({
    required this.id,
    required this.name,
    required this.provider,
    required this.keySuffix,
    required this.createdAt,
    this.baseUrl,
    this.transcriptionModel,
    this.postProcessingModel,
    this.azureRegion,
  });

  ApiKey copyWith({
    String? name,
    String? keySuffix,
    String? baseUrl,
    String? transcriptionModel,
    String? postProcessingModel,
    String? azureRegion,
    bool clearBaseUrl = false,
    bool clearTranscriptionModel = false,
    bool clearPostProcessingModel = false,
    bool clearAzureRegion = false,
  }) {
    return ApiKey(
      id: id,
      name: name ?? this.name,
      provider: provider,
      keySuffix: keySuffix ?? this.keySuffix,
      createdAt: createdAt,
      baseUrl: clearBaseUrl ? null : (baseUrl ?? this.baseUrl),
      transcriptionModel: clearTranscriptionModel
          ? null
          : (transcriptionModel ?? this.transcriptionModel),
      postProcessingModel: clearPostProcessingModel
          ? null
          : (postProcessingModel ?? this.postProcessingModel),
      azureRegion: clearAzureRegion ? null : (azureRegion ?? this.azureRegion),
    );
  }

  Map<String, dynamic> toJson() => {
    'id': id,
    'name': name,
    'provider': provider.serializedName,
    'keySuffix': keySuffix,
    'createdAt': createdAt,
    if (baseUrl != null) 'baseUrl': baseUrl,
    if (transcriptionModel != null) 'transcriptionModel': transcriptionModel,
    if (postProcessingModel != null) 'postProcessingModel': postProcessingModel,
    if (azureRegion != null) 'azureRegion': azureRegion,
  };

  factory ApiKey.fromJson(Map<String, dynamic> json) => ApiKey(
    id: json['id'] as String,
    name: json['name'] as String,
    provider: ApiKeyProvider.fromSerializedName(json['provider'] as String),
    keySuffix: json['keySuffix'] as String,
    createdAt: json['createdAt'] as String,
    baseUrl: json['baseUrl'] as String?,
    transcriptionModel: json['transcriptionModel'] as String?,
    postProcessingModel: json['postProcessingModel'] as String?,
    azureRegion: json['azureRegion'] as String?,
  );

  @override
  List<Object?> get props => [
    id,
    name,
    provider,
    keySuffix,
    createdAt,
    baseUrl,
    transcriptionModel,
    postProcessingModel,
    azureRegion,
  ];
}
