import 'package:app/model/local_transcription_model.dart';
import 'package:app/widgets/common/app_radio.dart';
import 'package:flutter/material.dart';

class LocalTranscriptionModelList extends StatelessWidget {
  final List<LocalTranscriptionModel> models;
  final Future<void> Function(String slug) onDownload;
  final Future<void> Function(String slug) onDelete;
  final Future<void> Function(String slug) onSelect;

  const LocalTranscriptionModelList({
    super.key,
    required this.models,
    required this.onDownload,
    required this.onDelete,
    required this.onSelect,
  });

  @override
  Widget build(BuildContext context) {
    return Column(
      children: [
        for (final model in models) ...[
          _LocalTranscriptionModelTile(
            model: model,
            onDownload: onDownload,
            onDelete: onDelete,
            onSelect: onSelect,
          ),
          if (model != models.last) const SizedBox(height: 12),
        ],
      ],
    );
  }
}

class _LocalTranscriptionModelTile extends StatelessWidget {
  final LocalTranscriptionModel model;
  final Future<void> Function(String slug) onDownload;
  final Future<void> Function(String slug) onDelete;
  final Future<void> Function(String slug) onSelect;

  const _LocalTranscriptionModelTile({
    required this.model,
    required this.onDownload,
    required this.onDelete,
    required this.onSelect,
  });

  bool get _isDownloading =>
      !model.downloaded && model.downloadProgress != null;

  String get _statusLabel {
    if (_isDownloading) {
      return '${(model.downloadProgress!.clamp(0.0, 1.0) * 100).round()}% downloaded';
    }
    if (model.selected) {
      return 'Currently selected';
    }
    if (model.downloaded && model.valid) {
      return 'Ready to use';
    }
    if (model.downloaded && !model.valid) {
      return model.validationError ?? 'Downloaded but unavailable';
    }
    return 'Not downloaded';
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final metadataStyle = theme.textTheme.bodySmall?.copyWith(
      color: theme.colorScheme.onSurface.withAlpha(153),
    );
    final statusColor = switch ((
      model.downloaded,
      model.valid,
      model.selected,
    )) {
      (_, _, true) => theme.colorScheme.primary,
      (true, true, false) => theme.colorScheme.secondary,
      (true, false, false) => theme.colorScheme.error,
      _ => theme.colorScheme.onSurface.withAlpha(153),
    };

    return Card(
      margin: EdgeInsets.zero,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(12),
        side: model.selected
            ? BorderSide(color: theme.colorScheme.primary, width: 2)
            : BorderSide(color: theme.colorScheme.outlineVariant),
      ),
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                AppRadio(model.selected),
                const SizedBox(width: 8),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Expanded(
                            child: Text(
                              model.label,
                              style: theme.textTheme.titleSmall,
                            ),
                          ),
                          if (model.selected)
                            Container(
                              padding: const EdgeInsets.symmetric(
                                horizontal: 10,
                                vertical: 4,
                              ),
                              decoration: BoxDecoration(
                                color: theme.colorScheme.primaryContainer,
                                borderRadius: BorderRadius.circular(999),
                              ),
                              child: Text(
                                'Selected',
                                style: theme.textTheme.labelSmall?.copyWith(
                                  color: theme.colorScheme.onPrimaryContainer,
                                  fontWeight: FontWeight.w600,
                                ),
                              ),
                            ),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Text(model.helper, style: metadataStyle),
                    ],
                  ),
                ),
              ],
            ),
            const SizedBox(height: 12),
            Wrap(
              spacing: 12,
              runSpacing: 4,
              children: [
                formatLocalTranscriptionModelSize(model.sizeBytes),
                model.languageSupport.label,
              ].map((text) => Text(text, style: metadataStyle)).toList(),
            ),
            const SizedBox(height: 8),
            Text(
              _statusLabel,
              style: theme.textTheme.bodySmall?.copyWith(
                color: statusColor,
                fontWeight: model.selected ? FontWeight.w600 : FontWeight.w500,
              ),
            ),
            if (_isDownloading) ...[
              const SizedBox(height: 8),
              LinearProgressIndicator(
                value: model.downloadProgress?.clamp(0.0, 1.0),
              ),
            ],
            const SizedBox(height: 12),
            Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                if (!model.downloaded || !model.valid)
                  FilledButton(
                    onPressed: _isDownloading
                        ? null
                        : () => onDownload(model.slug),
                    child: Text(
                      _isDownloading
                          ? 'Downloading...'
                          : (model.downloaded ? 'Download again' : 'Download'),
                    ),
                  ),
                if (model.downloaded && model.valid && !model.selected)
                  FilledButton.tonal(
                    onPressed: () => onSelect(model.slug),
                    child: const Text('Select'),
                  ),
                if (model.downloaded)
                  TextButton(
                    onPressed: _isDownloading
                        ? null
                        : () => onDelete(model.slug),
                    style: TextButton.styleFrom(
                      foregroundColor: theme.colorScheme.error,
                    ),
                    child: const Text('Delete'),
                  ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}

String formatLocalTranscriptionModelSize(int sizeBytes) {
  const bytesPerKb = 1024;
  const bytesPerMb = bytesPerKb * 1024;
  const bytesPerGb = bytesPerMb * 1024;

  if (sizeBytes < bytesPerKb) {
    return '$sizeBytes B';
  }

  if (sizeBytes < bytesPerMb) {
    return '${(sizeBytes / bytesPerKb).toStringAsFixed(1)} KB';
  }

  if (sizeBytes < bytesPerGb) {
    return '${(sizeBytes / bytesPerMb).toStringAsFixed(2)} MB';
  }

  return '${(sizeBytes / bytesPerGb).toStringAsFixed(2)} GB';
}
