import 'package:equatable/equatable.dart';

enum ApiKeyProvider {
  openai,
  groq;

  String get displayName {
    switch (this) {
      case ApiKeyProvider.openai:
        return 'OpenAI';
      case ApiKeyProvider.groq:
        return 'Groq';
    }
  }

  bool get supportsTranscription => true;
  bool get supportsPostProcessing => true;
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

  const ApiKey({
    required this.id,
    required this.name,
    required this.provider,
    required this.keySuffix,
    required this.createdAt,
  });

  Map<String, dynamic> toJson() => {
    'id': id,
    'name': name,
    'provider': provider.name,
    'keySuffix': keySuffix,
    'createdAt': createdAt,
  };

  factory ApiKey.fromJson(Map<String, dynamic> json) => ApiKey(
    id: json['id'] as String,
    name: json['name'] as String,
    provider: ApiKeyProvider.values.firstWhere(
      (p) => p.name == json['provider'],
      orElse: () => ApiKeyProvider.openai,
    ),
    keySuffix: json['keySuffix'] as String,
    createdAt: json['createdAt'] as String,
  );

  @override
  List<Object?> get props => [id, name, provider, keySuffix, createdAt];
}
