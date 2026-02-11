import 'package:app/utils/theme_utils.dart';
import 'package:app/widgets/common/app_dialog.dart';
import 'package:flutter/material.dart';

class EditProfileDialog extends StatefulWidget {
  const EditProfileDialog({super.key, this.initialName});

  final String? initialName;

  @override
  State<EditProfileDialog> createState() => _EditProfileDialogState();
}

class _EditProfileDialogState extends State<EditProfileDialog> {
  late final TextEditingController _nameController;

  @override
  void initState() {
    super.initState();
    _nameController = TextEditingController(text: widget.initialName ?? '');
  }

  @override
  void dispose() {
    _nameController.dispose();
    super.dispose();
  }

  bool get _isValid => _nameController.text.trim().isNotEmpty;

  @override
  Widget build(BuildContext context) {
    return AppDialog(
      title: const Text('Edit Profile'),
      content: Padding(
        padding: Theming.padding.onlyVertical(),
        child: Padding(
          padding: Theming.padding.onlyHorizontal(),
          child: TextField(
            controller: _nameController,
            decoration: const InputDecoration(
              labelText: 'Name',
              border: OutlineInputBorder(),
            ),
            autofocus: true,
            textCapitalization: TextCapitalization.words,
            onChanged: (_) => setState(() {}),
          ),
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.of(context).pop(),
          child: const Text('Cancel'),
        ),
        const SizedBox(width: 8),
        FilledButton(
          onPressed: _isValid
              ? () => Navigator.of(context).pop(_nameController.text.trim())
              : null,
          child: const Text('Save'),
        ),
      ],
    );
  }
}
