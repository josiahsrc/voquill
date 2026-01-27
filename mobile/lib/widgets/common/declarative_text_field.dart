import 'package:app/utils/widget_utils.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

class DeclarativeTextController with ChangeNotifier {
  bool _didSelectEverything = false;

  void selectEverything() {
    _didSelectEverything = true;
    notifyListeners();
  }

  bool consumeSelectEverything() {
    final result = _didSelectEverything;
    _didSelectEverything = false;
    return result;
  }
}

class DeclarativeTextField extends StatefulWidget {
  const DeclarativeTextField({
    super.key,
    required this.value,
    required this.onChanged,
    this.decoration,
    this.maxLength,
    this.maxLines = 1,
    this.minLines,
    this.onSubmitted,
    this.focusNode,
    this.autofocus = false,
    this.textAlign = TextAlign.start,
    this.style,
    this.keyboardType,
    this.inputFormatters,
    this.controller,
    this.enabled,
    this.readOnly,
    this.onTap,
    this.selectEverythingOnTap,
    this.enableSuggestions,
    this.autocorrect,
    this.obscureText,
  });

  final String value;
  final ValueChanged<String>? onChanged;
  final InputDecoration? decoration;
  final int? maxLength;
  final int? maxLines;
  final int? minLines;
  final ValueChanged<String>? onSubmitted;
  final FocusNode? focusNode;
  final bool autofocus;
  final TextAlign textAlign;
  final TextStyle? style;
  final TextInputType? keyboardType;
  final List<TextInputFormatter>? inputFormatters;
  final DeclarativeTextController? controller;
  final bool? enabled;
  final bool? readOnly;
  final VoidCallback? onTap;
  final bool? selectEverythingOnTap;
  final bool? enableSuggestions;
  final bool? autocorrect;
  final bool? obscureText;

  @override
  State<DeclarativeTextField> createState() => _DeclarativeTextFieldState();
}

class _DeclarativeTextFieldState extends State<DeclarativeTextField> {
  final controller = TextEditingController();
  final fallbackNode = FocusNode();

  FocusNode get effectiveFocusNode => widget.focusNode ?? fallbackNode;

  @override
  void initState() {
    super.initState();
    controller.text = widget.value;
    _trySelectEverything();
    widget.controller?.addListener(_trySelectEverything);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (widget.autofocus) {
        effectiveFocusNode.requestFocus();
      }
    });
  }

  @override
  void didUpdateWidget(covariant DeclarativeTextField oldWidget) {
    if (oldWidget.value != widget.value && widget.value != controller.text) {
      controller.text = widget.value;
    }
    super.didUpdateWidget(oldWidget);
  }

  @override
  void dispose() {
    controller.dispose();
    fallbackNode.dispose();
    widget.controller?.removeListener(_trySelectEverything);
    super.dispose();
  }

  void _trySelectEverything() {
    if (widget.controller?.consumeSelectEverything() == true) {
      controller.selection = TextSelection(
        baseOffset: 0,
        extentOffset: controller.text.length,
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    VoidCallback? onTap;
    if (widget.selectEverythingOnTap == true) {
      onTap = () {
        widget.onTap?.call();
        controller.selection = TextSelection(
          baseOffset: 0,
          extentOffset: controller.text.length,
        );
      };
    } else {
      onTap = widget.onTap;
    }

    final decoration = widget.decoration?.copyWith(
      suffixIcon: widget.decoration?.suffixIcon?.padded(
        EdgeInsets.only(right: 12),
      ),
      prefixIcon: widget.decoration?.prefixIcon?.padded(
        EdgeInsets.only(left: 12),
      ),
    );

    return TextField(
      style: widget.style,
      textAlign: widget.textAlign,
      focusNode: effectiveFocusNode,
      controller: controller,
      onChanged: widget.onChanged,
      decoration: decoration ?? const InputDecoration(),
      maxLength: widget.maxLength,
      maxLines: widget.maxLines,
      minLines: widget.minLines,
      onSubmitted: widget.onSubmitted,
      keyboardType: widget.keyboardType,
      inputFormatters: widget.inputFormatters,
      enabled: widget.enabled,
      readOnly: widget.readOnly ?? false,
      enableSuggestions: widget.enableSuggestions ?? true,
      autocorrect: widget.autocorrect ?? true,
      onTap: onTap,
      obscureText: widget.obscureText ?? false,
    );
  }
}
