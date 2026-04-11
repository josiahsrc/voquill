import 'package:app/actions/idle_timeout_actions.dart';
import 'package:app/utils/theme_utils.dart';
import 'package:flutter/material.dart';

class IdleTimeoutSheet extends StatefulWidget {
  const IdleTimeoutSheet({super.key});

  static Future<void> show(BuildContext context) {
    return showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      useSafeArea: true,
      builder: (_) => const IdleTimeoutSheet(),
    );
  }

  @override
  State<IdleTimeoutSheet> createState() => _IdleTimeoutSheetState();
}

class _IdleTimeoutSheetState extends State<IdleTimeoutSheet> {
  static const _presets = [60, 120, 300]; // 1m, 2m, 5m
  static const _presetLabels = ['1 min', '2 min', '5 min'];

  int _selectedSeconds = 120;
  bool _keepRunning = false;
  bool _loading = true;
  final _customController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _load();
  }

  @override
  void dispose() {
    _customController.dispose();
    super.dispose();
  }

  Future<void> _load() async {
    final seconds = await getIdleTimeoutSeconds();
    final keepRunning = await getIdleTimeoutKeepRunning();
    if (mounted) {
      setState(() {
        _selectedSeconds = seconds;
        _keepRunning = keepRunning;
        if (!_presets.contains(seconds)) {
          _customController.text = (seconds / 60).round().toString();
        }
        _loading = false;
      });
    }
  }

  Future<void> _save() async {
    await setIdleTimeout(seconds: _selectedSeconds, keepRunning: _keepRunning);
    if (mounted) Navigator.pop(context);
  }

  void _selectPreset(int seconds) {
    setState(() {
      _selectedSeconds = seconds;
      _customController.clear();
    });
  }

  void _onCustomChanged(String value) {
    final minutes = int.tryParse(value);
    if (minutes != null && minutes > 0) {
      setState(() {
        _selectedSeconds = minutes * 60;
      });
    }
  }

  Future<void> _toggleKeepRunning(bool value) async {
    if (value) {
      final confirmed = await showDialog<bool>(
        context: context,
        builder: (ctx) => AlertDialog(
          title: const Text('Keep microphone running?'),
          content: const Text(
            'Keeping the microphone active indefinitely will drain battery '
            'and show a persistent mic indicator. Are you sure?',
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(ctx, false),
              child: const Text('Cancel'),
            ),
            TextButton(
              onPressed: () => Navigator.pop(ctx, true),
              child: const Text('Enable'),
            ),
          ],
        ),
      );
      if (confirmed != true) return;
    }
    setState(() => _keepRunning = value);
  }

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);

    if (_loading) {
      return const SizedBox(
        height: 200,
        child: Center(child: CircularProgressIndicator()),
      );
    }

    return Padding(
      padding: EdgeInsets.only(
        bottom: MediaQuery.of(context).viewInsets.bottom,
      ),
      child: SafeArea(
        child: Padding(
          padding: Theming.padding.withTop(24).withBottom(16),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text('Idle Timeout', style: theme.textTheme.titleLarge),
              const SizedBox(height: 4),
              Text(
                'Auto-stop dictation after inactivity to save battery',
                style: theme.textTheme.bodyMedium?.copyWith(
                  color: theme.colorScheme.onSurface.withAlpha(153),
                ),
              ),
              const SizedBox(height: 20),

              // Preset chips
              Wrap(
                spacing: 8,
                children: List.generate(_presets.length, (i) {
                  final selected =
                      _selectedSeconds == _presets[i] && !_keepRunning;
                  return ChoiceChip(
                    label: Text(_presetLabels[i]),
                    selected: selected,
                    onSelected: _keepRunning
                        ? null
                        : (_) => _selectPreset(_presets[i]),
                  );
                }),
              ),
              const SizedBox(height: 16),

              // Custom input
              TextField(
                controller: _customController,
                enabled: !_keepRunning,
                keyboardType: TextInputType.number,
                decoration: InputDecoration(
                  labelText: 'Custom (minutes)',
                  hintText: 'e.g. 10',
                  border: const OutlineInputBorder(),
                  suffixText: 'min',
                  filled: _keepRunning,
                  fillColor: _keepRunning
                      ? theme.colorScheme.surfaceContainerHighest
                      : null,
                ),
                onChanged: _onCustomChanged,
              ),
              const SizedBox(height: 16),

              // Keep running toggle
              SwitchListTile(
                contentPadding: EdgeInsets.zero,
                title: const Text('Keep running'),
                subtitle: const Text('Microphone stays active until you stop'),
                value: _keepRunning,
                onChanged: _toggleKeepRunning,
              ),
              const SizedBox(height: 16),

              // Current selection summary
              if (!_keepRunning)
                Text(
                  'Dictation will auto-stop after ${_formatDuration(_selectedSeconds)} of inactivity',
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: theme.colorScheme.onSurface.withAlpha(102),
                  ),
                ),
              if (_keepRunning)
                Text(
                  '⚠️ Microphone will stay active until you manually stop — battery drain expected',
                  style: theme.textTheme.bodySmall?.copyWith(
                    color: theme.colorScheme.error,
                  ),
                ),
              const SizedBox(height: 16),

              // Save button
              SizedBox(
                width: double.infinity,
                child: FilledButton(
                  onPressed: _save,
                  child: const Text('Save'),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  String _formatDuration(int seconds) {
    if (seconds < 60) return '${seconds}s';
    final minutes = seconds ~/ 60;
    final remaining = seconds % 60;
    if (remaining == 0) return '$minutes min';
    return '$minutes min ${remaining}s';
  }
}
