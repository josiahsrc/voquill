import 'package:equatable/equatable.dart';

enum ApiKeyProvider {
  openai,
  groq,
  deepseek,
  openRouter,
  openaiCompatible,
  speaches;

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
    }
  }

  bool get supportsTranscription {
    switch (this) {
      case ApiKeyProvider.openai:
      case ApiKeyProvider.groq:
      case ApiKeyProvider.openaiCompatible:
      case ApiKeyProvider.speaches:
        return true;
      case ApiKeyProvider.deepseek:
      case ApiKeyProvider.openRouter:
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
        return true;
      case ApiKeyProvider.speaches:
        return false;
    }
  }

  bool get needsBaseUrl {
    switch (this) {
      case ApiKeyProvider.openaiCompatible:
      case ApiKeyProvider.speaches:
        return true;
      default:
        return false;
    }
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

  const ApiKey({
    required this.id,
    required this.name,
    required this.provider,
    required this.keySuffix,
    required this.createdAt,
    this.baseUrl,
  });

  Map<String, dynamic> toJson() => {
    'id': id,
    'name': name,
    'provider': provider.serializedName,
    'keySuffix': keySuffix,
    'createdAt': createdAt,
    if (baseUrl != null) 'baseUrl': baseUrl,
  };

  factory ApiKey.fromJson(Map<String, dynamic> json) => ApiKey(
    id: json['id'] as String,
    name: json['name'] as String,
    provider: ApiKeyProvider.fromSerializedName(json['provider'] as String),
    keySuffix: json['keySuffix'] as String,
    createdAt: json['createdAt'] as String,
    baseUrl: json['baseUrl'] as String?,
  );

  @override
  List<Object?> get props => [id, name, provider, keySuffix, createdAt, baseUrl];
}
