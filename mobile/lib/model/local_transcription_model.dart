import 'package:equatable/equatable.dart';

enum LocalTranscriptionLanguageSupport {
  englishOnly,
  multilingual;

  String get label {
    switch (this) {
      case LocalTranscriptionLanguageSupport.englishOnly:
        return 'English only';
      case LocalTranscriptionLanguageSupport.multilingual:
        return 'Multilingual';
    }
  }
}

class LocalTranscriptionModel with EquatableMixin {
  static const supportedSlugs = ['tiny', 'base', 'small', 'medium', 'turbo', 'large'];

  final String slug;
  final String label;
  final String helper;
  final int sizeBytes;
  final LocalTranscriptionLanguageSupport languageSupport;
  final bool downloaded;
  final bool valid;
  final bool selected;
  final double? downloadProgress;
  final String? validationError;

  const LocalTranscriptionModel({
    required this.slug,
    required this.label,
    required this.helper,
    required this.sizeBytes,
    required this.languageSupport,
    required this.downloaded,
    required this.valid,
    required this.selected,
    this.downloadProgress,
    this.validationError,
  });

  LocalTranscriptionModel copyWith({
    String? slug,
    String? label,
    String? helper,
    int? sizeBytes,
    LocalTranscriptionLanguageSupport? languageSupport,
    bool? downloaded,
    bool? valid,
    bool? selected,
    double? downloadProgress,
    String? validationError,
    bool clearDownloadProgress = false,
    bool clearValidationError = false,
  }) {
    return LocalTranscriptionModel(
      slug: slug ?? this.slug,
      label: label ?? this.label,
      helper: helper ?? this.helper,
      sizeBytes: sizeBytes ?? this.sizeBytes,
      languageSupport: languageSupport ?? this.languageSupport,
      downloaded: downloaded ?? this.downloaded,
      valid: valid ?? this.valid,
      selected: selected ?? this.selected,
      downloadProgress: clearDownloadProgress
          ? null
          : (downloadProgress ?? this.downloadProgress),
      validationError: clearValidationError
          ? null
          : (validationError ?? this.validationError),
    );
  }

  @override
  List<Object?> get props => [
    slug,
    label,
    helper,
    sizeBytes,
    languageSupport,
    downloaded,
    valid,
    selected,
    downloadProgress,
    validationError,
  ];
}
