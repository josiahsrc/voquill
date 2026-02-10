import 'package:flutter/material.dart';

const _kSpinnerSize = 20.0;
const _kSpinnerStroke = 2.0;

class AppButton extends StatelessWidget {
  const AppButton.filled({
    super.key,
    required this.onPressed,
    required this.child,
    this.loading = false,
    this.icon,
  }) : _variant = _Variant.filled;

  const AppButton.outlined({
    super.key,
    required this.onPressed,
    required this.child,
    this.loading = false,
    this.icon,
  }) : _variant = _Variant.outlined;

  const AppButton.text({
    super.key,
    required this.onPressed,
    required this.child,
    this.loading = false,
    this.icon,
  }) : _variant = _Variant.text;

  const AppButton.elevated({
    super.key,
    required this.onPressed,
    required this.child,
    this.loading = false,
    this.icon,
  }) : _variant = _Variant.elevated;

  const AppButton.tonal({
    super.key,
    required this.onPressed,
    required this.child,
    this.loading = false,
    this.icon,
  }) : _variant = _Variant.tonal;

  final VoidCallback onPressed;
  final Widget child;
  final bool loading;
  final Widget? icon;
  final _Variant _variant;

  @override
  Widget build(BuildContext context) {
    final effectiveOnPressed = loading ? null : onPressed;
    final effectiveChild = loading
        ? const SizedBox(
            width: _kSpinnerSize,
            height: _kSpinnerSize,
            child: CircularProgressIndicator(strokeWidth: _kSpinnerStroke),
          )
        : child;

    return switch (_variant) {
      _Variant.filled => icon != null
          ? FilledButton.icon(
              onPressed: effectiveOnPressed,
              icon: icon!,
              label: effectiveChild,
            )
          : FilledButton(
              onPressed: effectiveOnPressed,
              child: effectiveChild,
            ),
      _Variant.outlined => icon != null
          ? OutlinedButton.icon(
              onPressed: effectiveOnPressed,
              icon: icon!,
              label: effectiveChild,
            )
          : OutlinedButton(
              onPressed: effectiveOnPressed,
              child: effectiveChild,
            ),
      _Variant.text => icon != null
          ? TextButton.icon(
              onPressed: effectiveOnPressed,
              icon: icon!,
              label: effectiveChild,
            )
          : TextButton(
              onPressed: effectiveOnPressed,
              child: effectiveChild,
            ),
      _Variant.elevated => icon != null
          ? ElevatedButton.icon(
              onPressed: effectiveOnPressed,
              icon: icon!,
              label: effectiveChild,
            )
          : ElevatedButton(
              onPressed: effectiveOnPressed,
              child: effectiveChild,
            ),
      _Variant.tonal => icon != null
          ? FilledButton.tonalIcon(
              onPressed: effectiveOnPressed,
              icon: icon!,
              label: effectiveChild,
            )
          : FilledButton.tonal(
              onPressed: effectiveOnPressed,
              child: effectiveChild,
            ),
    };
  }
}

enum _Variant { filled, outlined, text, elevated, tonal }
