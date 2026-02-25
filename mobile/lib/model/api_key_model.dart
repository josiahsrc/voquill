import 'package:equatable/equatable.dart';

class ApiKeyEntry with EquatableMixin {
  const ApiKeyEntry({
    required this.id,
    required this.name,
    required this.provider,
    required this.createdAt,
    this.keySuffix,
    this.baseUrl,
    this.model,
  });

  final String id;
  final String name;
  final String provider;
  final String createdAt;
  final String? keySuffix;
  final String? baseUrl;
  final String? model;

  factory ApiKeyEntry.fromMap(Map<String, dynamic> map) {
    return ApiKeyEntry(
      id: map['id'] as String,
      name: map['name'] as String,
      provider: map['provider'] as String,
      createdAt: map['created_at'] as String,
      keySuffix: map['key_suffix'] as String?,
      baseUrl: map['base_url'] as String?,
      model: map['model'] as String?,
    );
  }

  Map<String, dynamic> toMap() {
    return {
      'id': id,
      'name': name,
      'provider': provider,
      'created_at': createdAt,
      'key_suffix': keySuffix,
      'base_url': baseUrl,
      'model': model,
    };
  }

  @override
  List<Object?> get props => [
    id,
    name,
    provider,
    createdAt,
    keySuffix,
    baseUrl,
    model,
  ];
}
