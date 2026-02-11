import 'package:app/utils/theme_utils.dart';
import 'package:app/widgets/common/app_animated_size.dart';
import 'package:app/widgets/common/app_animated_switcher.dart';
import 'package:app/widgets/common/app_dialog.dart';
import 'package:flutter/material.dart';

enum TermType { glossary, replacement }

enum EditTermResult { delete }

class EditTermDialog extends StatefulWidget {
  const EditTermDialog({
    super.key,
    this.initialSource,
    this.initialDestination,
    this.initialType,
    this.isEditing = false,
  });

  final String? initialSource;
  final String? initialDestination;
  final TermType? initialType;
  final bool isEditing;

  @override
  State<EditTermDialog> createState() => _EditTermDialogState();
}

class _EditTermDialogState extends State<EditTermDialog> {
  late TermType _type;
  late final TextEditingController _sourceController;
  late final TextEditingController _destinationController;

  @override
  void initState() {
    super.initState();
    _type = widget.initialType ?? TermType.glossary;
    _sourceController = TextEditingController(text: widget.initialSource ?? '');
    _destinationController =
        TextEditingController(text: widget.initialDestination ?? '');
  }

  @override
  void dispose() {
    _sourceController.dispose();
    _destinationController.dispose();
    super.dispose();
  }

  bool get _isValid {
    if (_sourceController.text.trim().isEmpty) {
      return false;
    }
    if (_type == TermType.replacement &&
        _destinationController.text.trim().isEmpty) {
      return false;
    }
    return true;
  }

  @override
  Widget build(BuildContext context) {
    final isReplacement = _type == TermType.replacement;

    return AppDialog(
      title: Text(widget.isEditing ? 'Edit Term' : 'Add Term'),
      content: Column(
        mainAxisSize: MainAxisSize.min,
        spacing: Theming.paddingValue,
        children: [
          Padding(
            padding: Theming.padding.onlyHorizontal(),
            child: TextField(
              controller: _sourceController,
              decoration: InputDecoration(
                labelText: isReplacement ? 'Original' : 'Glossary term',
                border: const OutlineInputBorder(),
              ),
              onChanged: (_) => setState(() {}),
            ),
          ),
          AppAnimatedSize(
            child: AppAnimatedSwitcher.page(
              child: isReplacement
                  ? Padding(
                      key: const ValueKey('destination'),
                      padding: Theming.padding.onlyHorizontal(),
                      child: TextField(
                        controller: _destinationController,
                        decoration: const InputDecoration(
                          labelText: 'Replacement',
                          border: OutlineInputBorder(),
                        ),
                        onChanged: (_) => setState(() {}),
                      ),
                    )
                  : const SizedBox(),
            ),
          ),
          CheckboxListTile(
            title: const Text('Is replacement'),
            value: isReplacement,
            controlAffinity: ListTileControlAffinity.leading,
            onChanged: (value) {
              setState(() {
                _type =
                    value == true ? TermType.replacement : TermType.glossary;
              });
            },
          ),
        ],
      ),
      actions: [
        Row(
          children: [
            if (widget.isEditing)
              IconButton(
                icon: const Icon(Icons.delete_outline),
                color: Theme.of(context).colorScheme.error,
                onPressed: () =>
                    Navigator.of(context).pop(EditTermResult.delete),
              ),
            const Spacer(),
            TextButton(
              onPressed: () => Navigator.of(context).pop(),
              child: const Text('Cancel'),
            ),
            const SizedBox(width: 8),
            FilledButton(
              onPressed: _isValid
                  ? () {
                      Navigator.of(context).pop((
                        type: _type,
                        source: _sourceController.text.trim(),
                        destination: _destinationController.text.trim(),
                      ));
                    }
                  : null,
              child: Text(widget.isEditing ? 'Save' : 'Add'),
            ),
          ],
        ),
      ],
    );
  }
}
