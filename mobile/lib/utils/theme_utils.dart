import 'package:app/utils/color_utils.dart';
import 'package:flutter/material.dart';

class Theming {
  const Theming._();

  static const double paddingValue = 16.0;
  static const double radiusValue = 16.0;

  static const EdgeInsets padding = EdgeInsets.all(paddingValue);
  static const Radius radius = Radius.circular(radiusValue);
  static const Duration duration = Duration(milliseconds: 200);
}

BorderRadiusGeometry? getListTileBorderRadiusFromContext(BuildContext context) {
  final theme = Theme.of(context);
  final tileTheme = ListTileTheme.of(context);
  final listTileShape = tileTheme.shape ?? theme.listTileTheme.shape;
  return listTileShape is RoundedRectangleBorder
      ? listTileShape.borderRadius
      : null;
}

extension EdgeInsetsX on EdgeInsets {
  EdgeInsets onlyHorizontal() => EdgeInsets.only(left: left, right: right);
  EdgeInsets onlyVertical() => EdgeInsets.only(top: top, bottom: bottom);

  EdgeInsets onlyLeft() => EdgeInsets.only(left: left);
  EdgeInsets onlyRight() => EdgeInsets.only(right: right);
  EdgeInsets onlyTop() => EdgeInsets.only(top: top);
  EdgeInsets onlyBottom() => EdgeInsets.only(bottom: bottom);

  EdgeInsets withoutTop() => copyWith(top: 0);
  EdgeInsets withoutBottom() => copyWith(bottom: 0);
  EdgeInsets withoutLeft() => copyWith(left: 0);
  EdgeInsets withoutRight() => copyWith(right: 0);

  EdgeInsets withVertical(double vertical) =>
      copyWith(top: vertical, bottom: vertical);
  EdgeInsets withHorizontal(double horizontal) =>
      copyWith(left: horizontal, right: horizontal);

  EdgeInsets withLeft(double left) => copyWith(left: left);
  EdgeInsets withRight(double right) => copyWith(right: right);
  EdgeInsets withTop(double top) => copyWith(top: top);
  EdgeInsets withBottom(double bottom) => copyWith(bottom: bottom);
}

extension TextStyleX on TextStyle {
  TextStyle withColor(Color? color) => copyWith(color: color);
  TextStyle withFontSize(double size) => copyWith(fontSize: size);
  TextStyle withFontWeight(FontWeight weight) => copyWith(fontWeight: weight);
  TextStyle withLetterSpacing(double spacing) =>
      copyWith(letterSpacing: spacing);
  TextStyle withLineHeight(double height) => copyWith(height: height);
  TextStyle secondary() => withColor(color?.secondary());
}

/// Ink wells don't have knowledge of what shape they should be in a given
/// list. This utility applies themes to each element based on where they are
/// in the list. The corner radius should match the corner radius of the
/// surrounding container.
List<Widget> applyColumnListTheme({
  required BuildContext context,
  required List<Widget> children,
  Radius? topRadius,
  Radius? bottomRadius,
  Color? backgroundColor,
  Color? highlightColor,
}) {
  topRadius ??= Theming.radius;
  bottomRadius ??= Theming.radius;
  const height = 64.0;

  final theme = Theme.of(context);
  final effTheme = theme.copyWith(
    listTileTheme: theme.listTileTheme.copyWith(tileColor: backgroundColor),
    highlightColor: highlightColor,
  );

  // We want the corners of the first and last list tiles to be rounded,
  // but not the corners of the section itself. To achieve this, we wrap
  // the list tiles theme.
  final result = <Widget>[];
  if (children.length == 1) {
    result.add(
      Theme(
        data: effTheme.copyWith(
          listTileTheme: effTheme.listTileTheme.copyWith(
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.vertical(
                top: topRadius,
                bottom: bottomRadius,
              ),
            ),
          ),
          textButtonTheme: TextButtonThemeData(
            style: TextButton.styleFrom(
              padding: EdgeInsets.zero,
              minimumSize: const Size(double.infinity, height),
              iconSize: theme.textButtonTheme.style?.iconSize?.resolve({
                WidgetState.focused,
              }),
              textStyle: theme.textButtonTheme.style?.textStyle?.resolve({
                WidgetState.focused,
              }),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.vertical(
                  top: topRadius,
                  bottom: bottomRadius,
                ),
              ),
            ),
          ),
        ),
        child: Container(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.vertical(
              top: topRadius,
              bottom: bottomRadius,
            ),
            color: backgroundColor,
          ),
          child: children.first,
        ),
      ),
    );
  } else if (children.isNotEmpty) {
    result.addAll([
      Theme(
        data: effTheme.copyWith(
          listTileTheme: effTheme.listTileTheme.copyWith(
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.vertical(top: topRadius),
            ),
          ),
          textButtonTheme: TextButtonThemeData(
            style: TextButton.styleFrom(
              padding: EdgeInsets.zero,
              minimumSize: const Size(double.infinity, height),
              iconSize: theme.textButtonTheme.style?.iconSize?.resolve({
                WidgetState.focused,
              }),
              textStyle: theme.textButtonTheme.style?.textStyle?.resolve({
                WidgetState.focused,
              }),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.vertical(top: topRadius),
              ),
            ),
          ),
        ),
        child: Container(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.vertical(top: topRadius),
            color: backgroundColor,
          ),
          child: children.first,
        ),
      ),
      ...children
          .sublist(1, children.length - 1)
          .map(
            (e) => Theme(
              data: effTheme,
              child: Container(
                decoration: BoxDecoration(
                  borderRadius: BorderRadius.zero,
                  color: backgroundColor,
                ),
                child: e,
              ),
            ),
          ),
      Theme(
        data: effTheme.copyWith(
          listTileTheme: effTheme.listTileTheme.copyWith(
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.vertical(bottom: bottomRadius),
            ),
          ),
          textButtonTheme: TextButtonThemeData(
            style: TextButton.styleFrom(
              padding: EdgeInsets.zero,
              minimumSize: const Size(double.infinity, height),
              iconSize: theme.textButtonTheme.style?.iconSize?.resolve({
                WidgetState.focused,
              }),
              textStyle: theme.textButtonTheme.style?.textStyle?.resolve({
                WidgetState.focused,
              }),
              shape: RoundedRectangleBorder(
                borderRadius: BorderRadius.vertical(bottom: bottomRadius),
              ),
            ),
          ),
        ),
        child: Container(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.vertical(bottom: bottomRadius),
            color: backgroundColor,
          ),
          child: children.last,
        ),
      ),
    ]);
  }

  return result;
}
