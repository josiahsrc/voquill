import 'package:app/utils/theme_utils.dart';
import 'package:app/widgets/common/app_dialog.dart';
import 'package:flutter/material.dart';

enum EditStyleResult { delete }

class EditStyleDialog extends StatefulWidget {
  const EditStyleDialog({
    super.key,
    this.initialName,
    this.initialPrompt,
    this.isEditing = false,
    this.isSystem = false,
  });

  final String? initialName;
  final String? initialPrompt;
  final bool isEditing;
  final bool isSystem;

  @override
  State<EditStyleDialog> createState() => _EditStyleDialogState();
}

class _EditStyleDialogState extends State<EditStyleDialog> {
  late final TextEditingController _nameController;
  late final TextEditingController _promptController;

  @override
  void initState() {
    super.initState();
    _nameController = TextEditingController(text: widget.initialName ?? '');
    _promptController = TextEditingController(text: widget.initialPrompt ?? '');
  }

  @override
  void dispose() {
    _nameController.dispose();
    _promptController.dispose();
    super.dispose();
  }

  bool get _isValid {
    return _nameController.text.trim().isNotEmpty &&
        _promptController.text.trim().isNotEmpty;
  }

  @override
  Widget build(BuildContext context) {
    return AppDialog(
      title: Text(widget.isEditing ? 'Edit Style' : 'New Style'),
      content: Padding(
        padding: Theming.padding.onlyVertical(),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          spacing: Theming.paddingValue,
          children: [
            Padding(
              padding: Theming.padding.onlyHorizontal(),
              child: TextField(
                controller: _nameController,
                decoration: const InputDecoration(
                  labelText: 'Name',
                  border: OutlineInputBorder(),
                ),
                maxLength: 120,
                readOnly: widget.isSystem,
                onChanged: (_) => setState(() {}),
              ),
            ),
            Padding(
              padding: Theming.padding.onlyHorizontal(),
              child: TextField(
                controller: _promptController,
                decoration: const InputDecoration(
                  labelText: 'Prompt template',
                  border: OutlineInputBorder(),
                  alignLabelWithHint: true,
                ),
                maxLines: 5,
                minLines: 3,
                maxLength: 1000,
                readOnly: widget.isSystem,
                onChanged: (_) => setState(() {}),
              ),
            ),
          ],
        ),
      ),
      actions: [
        Row(
          children: [
            if (widget.isEditing && !widget.isSystem)
              IconButton(
                icon: const Icon(Icons.delete_outline),
                color: Theme.of(context).colorScheme.error,
                onPressed: () =>
                    Navigator.of(context).pop(EditStyleResult.delete),
              ),
            const Spacer(),
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('Cancel'),
            ),
            const SizedBox(width: 8),
            if (!widget.isSystem)
              FilledButton(
                onPressed: _isValid
                    ? () {
                        Navigator.of(context).pop((
                          name: _nameController.text.trim(),
                          prompt: _promptController.text.trim(),
                        ));
                      }
                    : null,
                child: Text(widget.isEditing ? 'Save' : 'Create'),
              ),
          ],
        ),
      ],
    );
  }
}
