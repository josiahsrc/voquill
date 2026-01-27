import 'package:app/theme/app_colors.dart';
import 'package:app/utils/color_utils.dart';
import 'package:app/utils/theme_utils.dart';
import 'package:app/widgets/common/compression.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';

enum CurrencyInputVariant { comfy, compact }

const _duration = Duration(milliseconds: 50);

class CurrencyInput extends StatefulWidget {
  const CurrencyInput({
    super.key,
    this.value = 0,
    this.onChanged,
    this.placeholder,
    this.autofocus = false,
    this.wholeNumbers = false,
    this.variant = CurrencyInputVariant.comfy,
    this.label,
    this.textAlign = TextAlign.center,
    this.style,
    this.showUnderline = false,
  });

  final double value;
  final ValueChanged<double>? onChanged;
  final String? placeholder;
  final bool autofocus;
  final bool wholeNumbers;
  final CurrencyInputVariant variant;
  final String? label;
  final TextAlign textAlign;
  final TextStyle? style;
  final bool showUnderline;

  @override
  State<CurrencyInput> createState() => _CurrencyInputState();
}

class _CurrencyInputState extends State<CurrencyInput>
    with TickerProviderStateMixin {
  late TextEditingController _controller;
  late FocusNode _focusNode;
  late AnimationController _scaleController;
  late AnimationController _highlightController;
  late Animation<double> _scaleAnimation;
  late Animation<double> _highlightAnimation;

  bool _isFocused = false;
  bool _shouldReplaceOnNextInput = false;

  bool get _allowDecimals => !widget.wholeNumbers;

  @override
  void initState() {
    super.initState();
    _controller = TextEditingController(text: _getInitialText());
    _focusNode = FocusNode();

    _scaleController = AnimationController(duration: _duration, vsync: this);
    _highlightController = AnimationController(
      duration: _duration,
      vsync: this,
    );

    _scaleAnimation = Tween<double>(
      begin: 1.0,
      end: 1.05,
    ).animate(CurvedAnimation(parent: _scaleController, curve: Curves.easeOut));
    _highlightAnimation = Tween<double>(begin: 0.0, end: 1.0).animate(
      CurvedAnimation(parent: _highlightController, curve: Curves.easeOut),
    );

    _focusNode.addListener(_onFocusChanged);
    _controller.addListener(
      () => setState(() {}),
    ); // Add this to update display in real-time

    if (widget.autofocus) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        _focusNode.requestFocus();
      });
    }
  }

  @override
  void dispose() {
    _controller.dispose();
    _focusNode.dispose();
    _scaleController.dispose();
    _highlightController.dispose();
    super.dispose();
  }

  @override
  void didUpdateWidget(CurrencyInput oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (!_isFocused && widget.value != oldWidget.value) {
      _updateControllerFromValue();
    }
  }

  String _getInitialText() {
    if (widget.value == 0) return '';
    return _allowDecimals
        ? widget.value.toStringAsFixed(2)
        : widget.value.round().toString();
  }

  void _updateControllerFromValue() {
    if (widget.value == 0) {
      if (_toNumeric(_controller.text) != 0) {
        _controller.text = '';
      }
      return;
    }

    final numericValue = _allowDecimals
        ? double.parse(widget.value.toStringAsFixed(2))
        : widget.value.round().toDouble();
    final numericInternal = _toNumeric(_controller.text);

    if (numericValue == numericInternal) return;

    _controller.text = _allowDecimals
        ? widget.value.toStringAsFixed(2)
        : widget.value.round().toString();
  }

  void _onFocusChanged() {
    setState(() {
      _isFocused = _focusNode.hasFocus;
    });

    if (_isFocused) {
      _scaleController.forward();
      _highlightController.forward();
      _shouldReplaceOnNextInput = true;
    } else {
      _scaleController.reverse();
      _highlightController.reverse();
      _shouldReplaceOnNextInput = false;
      final numeric = _toNumeric(_controller.text);
      _controller.text = numeric > 0
          ? (_allowDecimals
                ? numeric.toStringAsFixed(2)
                : numeric.round().toString())
          : '';
    }
  }

  String _sanitize(String text) {
    if (!_allowDecimals) {
      return text.replaceAll(RegExp(r'[^0-9]'), '');
    }

    String out = text.replaceAll(RegExp(r'[^0-9.]'), '');
    final dotIndex = out.indexOf('.');
    if (dotIndex != -1) {
      final beforeDot = out.substring(0, dotIndex + 1);
      final afterDot = out
          .substring(dotIndex + 1)
          .replaceAll('.', '')
          .substring(0, 2.clamp(0, out.length - dotIndex - 1));
      out = beforeDot + afterDot;
    }
    return out;
  }

  double _toNumeric(String text) {
    if (text.isEmpty) return 0;
    final n = double.tryParse(text);
    return n ?? 0;
  }

  String _formatNumber(double value) {
    final decimals = _allowDecimals ? 2 : 0;
    final fixed = value.toStringAsFixed(decimals);
    final parts = fixed.split('.');
    final intPart = parts[0];
    final decPart = parts.length > 1 ? parts[1] : '';

    // Add commas to integer part
    final withCommas = intPart.replaceAllMapped(
      RegExp(r'\B(?=(\d{3})+(?!\d))'),
      (match) => ',',
    );

    return _allowDecimals ? '\$$withCommas.$decPart' : '\$$withCommas';
  }

  String _formatEditing(String str) {
    if (str.isEmpty) return '';

    if (_allowDecimals) {
      final parts = str.split('.');
      final intPart = parts[0];
      final decPart = parts.length > 1 ? parts[1] : null;

      final withCommas = intPart.replaceAllMapped(
        RegExp(r'\B(?=(\d{3})+(?!\d))'),
        (match) => ',',
      );

      return decPart != null ? '\$$withCommas.$decPart' : '\$$withCommas';
    } else {
      final cleaned = str.replaceAll(RegExp(r'[^0-9]'), '');
      final withCommas = cleaned.replaceAllMapped(
        RegExp(r'\B(?=(\d{3})+(?!\d))'),
        (match) => ',',
      );
      return '\$$withCommas';
    }
  }

  void _onTextChanged(String text) {
    String sanitized;
    if (_shouldReplaceOnNextInput && text.isNotEmpty) {
      final lastChar = text[text.length - 1];
      sanitized = _sanitize(lastChar);
      _shouldReplaceOnNextInput = false;
    } else {
      sanitized = _sanitize(text);
    }

    // Only update if the sanitized text is different from current text
    if (sanitized != _controller.text) {
      _controller.value = _controller.value.copyWith(
        text: sanitized,
        selection: TextSelection.collapsed(offset: sanitized.length),
      );
    }

    final numeric = _toNumeric(sanitized);
    widget.onChanged?.call(numeric);
  }

  String get _displayString {
    if (_controller.text.isEmpty) {
      if (_isFocused) {
        return _allowDecimals ? '\$0.00' : '\$0';
      } else {
        return widget.placeholder ?? (_allowDecimals ? '\$0.00' : '\$0');
      }
    }

    return _isFocused
        ? _formatEditing(_controller.text)
        : _formatNumber(_toNumeric(_controller.text));
  }

  bool get _isPlaceholder => _controller.text.isEmpty && !_isFocused;

  @override
  Widget build(BuildContext context) {
    final colors = context.colors;
    final bgFocused = colors.primary.withApproxOpacity(0.1);
    final bgUnfocused = colors.primary.withApproxOpacity(0.0);

    final inner = Container(
      color: Colors.transparent,
      child: Column(
        crossAxisAlignment: widget.textAlign == TextAlign.center
            ? CrossAxisAlignment.center
            : (widget.textAlign == TextAlign.left
                  ? CrossAxisAlignment.start
                  : CrossAxisAlignment.end),
        mainAxisSize: MainAxisSize.min,
        children: [
          AnimatedBuilder(
            animation: Listenable.merge([_scaleAnimation, _highlightAnimation]),
            builder: (context, child) {
              return Transform.scale(
                scale: _scaleAnimation.value,
                child: AnimatedContainer(
                  duration: _duration,
                  decoration: BoxDecoration(
                    color: Color.lerp(
                      bgUnfocused,
                      bgFocused,
                      _highlightAnimation.value,
                    ),
                    borderRadius: BorderRadius.lerp(
                      BorderRadius.circular(0),
                      BorderRadius.all(Theming.radius),
                      _highlightAnimation.value,
                    ),
                    border: widget.showUnderline
                        ? Border(
                            bottom: BorderSide(
                              color: Color.lerp(
                                colors.primary.withApproxOpacity(0.3),
                                colors.primary.withApproxOpacity(0.0),
                                _highlightAnimation.value,
                              )!,
                              width: 2,
                            ),
                          )
                        : null,
                  ),
                  padding: EdgeInsets.symmetric(
                    horizontal: 16.0 * _highlightAnimation.value,
                    vertical: 2.0 * _highlightAnimation.value,
                  ),
                  child: Text(
                    _displayString,
                    textAlign: widget.textAlign,
                    style: TextStyle(
                      fontSize: widget.variant == CurrencyInputVariant.comfy
                          ? 48
                          : 32,
                      fontWeight: FontWeight.w600,
                      color: _isPlaceholder ? colors.onLevel2 : colors.onLevel0,
                    ).merge(widget.style),
                  ),
                ),
              );
            },
          ),
          Opacity(
            opacity: 0,
            child: SizedBox(
              width: 1,
              height: 1,
              child: TextField(
                controller: _controller,
                focusNode: _focusNode,
                onChanged: _onTextChanged,
                keyboardType: _allowDecimals
                    ? const TextInputType.numberWithOptions(decimal: true)
                    : TextInputType.number,
                inputFormatters: [
                  if (_allowDecimals)
                    FilteringTextInputFormatter.allow(RegExp(r'[0-9.]'))
                  else
                    FilteringTextInputFormatter.digitsOnly,
                ],
                decoration: const InputDecoration(
                  border: InputBorder.none,
                  contentPadding: EdgeInsets.zero,
                ),
                style: const TextStyle(color: Colors.transparent),
              ),
            ),
          ),
          if (widget.label != null) ...[
            SizedBox(
              height: widget.variant == CurrencyInputVariant.comfy ? 8 : 2,
            ),
            Text(
              widget.label!,
              textAlign: widget.textAlign,
              style: TextStyle(color: colors.onLevel1),
            ),
          ],
        ],
      ),
    );

    return PressableCompression(
      child: GestureDetector(
        onTap: () => _focusNode.requestFocus(),
        child: inner,
      ),
    );
  }
}
