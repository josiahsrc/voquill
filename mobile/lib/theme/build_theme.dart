import 'package:app/theme/app_colors.dart';
import 'package:app/utils/color_utils.dart';
import 'package:app/utils/theme_utils.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';

ThemeData _buildTheme({
  required Brightness brightness,
  required MaterialColor primarySwatch,
  required AppColors colors,
}) {
  final primaryColor = colors.primary;
  final onPrimaryColor = colors.onPrimary;
  final primaryLight = primarySwatch.shade100;
  final trackColor = primaryColor.withApproxOpacity(0.3);
  final systemUi = brightness == Brightness.light
      ? SystemUiOverlayStyle.dark
      : SystemUiOverlayStyle.light;

  const borderWidth = 2.0;
  final buttonShape = RoundedRectangleBorder(
    borderRadius: BorderRadius.circular(16),
  );

  final buttonPadding = const EdgeInsets.symmetric(
    horizontal: 16,
    vertical: 20,
  );
  final buttonTextStyle = TextStyle(fontWeight: FontWeight.w500, fontSize: 16);
  final buttonIconSize = 24.0;
  const buttonMinSize = Size(96, 52);

  final baseTextTheme = TextTheme(
    bodyLarge: TextStyle(color: colors.onLevel0, fontSize: 18, height: 1.5),
    bodyMedium: TextStyle(color: colors.onLevel0, fontSize: 16, height: 1.5),
    bodySmall: TextStyle(color: colors.onLevel0, fontSize: 14, height: 1.5),
    titleLarge: TextStyle(color: colors.onLevel0, fontSize: 22, height: 1.3),
    titleMedium: TextStyle(color: colors.onLevel0, fontSize: 18, height: 1.3),
    titleSmall: TextStyle(color: colors.onLevel0, fontSize: 16, height: 1.3),
    headlineLarge: TextStyle(
      color: colors.onLevel0,
      fontSize: 32,
      fontWeight: FontWeight.bold,
      height: 1.2,
    ),
    headlineMedium: TextStyle(
      color: colors.onLevel0,
      fontSize: 28,
      fontWeight: FontWeight.bold,
      height: 1.2,
    ),
    headlineSmall: TextStyle(
      color: colors.onLevel0,
      fontSize: 24,
      fontWeight: FontWeight.bold,
      height: 1.2,
    ),
    labelLarge: TextStyle(
      color: colors.onLevel0,
      fontSize: 14,
      fontWeight: FontWeight.w500,
    ),
    labelMedium: TextStyle(
      color: colors.onLevel0,
      fontSize: 12,
      fontWeight: FontWeight.w500,
    ),
    labelSmall: TextStyle(
      color: colors.onLevel0,
      fontSize: 10,
      fontWeight: FontWeight.w500,
    ),
  );

  return ThemeData(
    brightness: brightness,
    useMaterial3: true,
    colorScheme: ColorScheme.fromSwatch(
      primarySwatch: primarySwatch,
      backgroundColor: colors.level0,
      cardColor: colors.level0,
      accentColor: primaryColor,
      brightness: brightness,
      errorColor: colors.error,
    ),
    primaryColorLight: primaryLight,
    cardColor: colors.level1,
    chipTheme: ChipThemeData(
      backgroundColor: colors.level1,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.circular(8),
        side: BorderSide(color: colors.level1),
      ),
    ),
    tabBarTheme: TabBarThemeData(
      labelColor: primaryColor,
      unselectedLabelColor: colors.level2,
      dividerColor: colors.level2,
    ),
    cardTheme: const CardThemeData(
      surfaceTintColor: Colors.transparent,
      elevation: 0,
      margin: EdgeInsets.zero,
      shape: RoundedRectangleBorder(
        borderRadius: BorderRadius.all(Theming.radius),
      ),
    ),
    checkboxTheme: const CheckboxThemeData(splashRadius: 26),
    dialogTheme: DialogThemeData(
      backgroundColor: colors.level0,
      surfaceTintColor: Colors.transparent,
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
    ),
    appBarTheme: AppBarTheme(
      surfaceTintColor: Colors.transparent,
      systemOverlayStyle: systemUi,
    ),
    textTheme: GoogleFonts.robotoTextTheme(baseTextTheme),
    buttonTheme: ButtonThemeData(
      shape: buttonShape,
      buttonColor: primaryColor,
      textTheme: ButtonTextTheme.primary,
    ),
    inputDecorationTheme: InputDecorationTheme(
      fillColor: colors.level1,
      filled: true,
      alignLabelWithHint: true,
      contentPadding: const EdgeInsets.all(20),
      enabledBorder: OutlineInputBorder(
        borderSide: BorderSide(
          color: primaryLight.transparent(),
          width: borderWidth,
        ),
        borderRadius: const BorderRadius.all(Theming.radius),
      ),
      hintStyle: TextStyle(color: colors.onLevel2.secondary()),
      border: OutlineInputBorder(
        borderSide: BorderSide(
          color: primaryColor.transparent(),
          width: borderWidth,
        ),
        borderRadius: const BorderRadius.all(Theming.radius),
      ),
      focusedBorder: OutlineInputBorder(
        borderSide: BorderSide(color: primaryColor, width: borderWidth),
        borderRadius: const BorderRadius.all(Theming.radius),
      ),
      errorBorder: OutlineInputBorder(
        borderSide: BorderSide(color: colors.error, width: borderWidth),
        borderRadius: const BorderRadius.all(Theming.radius),
      ),
      focusedErrorBorder: OutlineInputBorder(
        borderSide: BorderSide(color: colors.error, width: borderWidth),
        borderRadius: const BorderRadius.all(Theming.radius),
      ),
      errorStyle: TextStyle(color: colors.error),
      suffixIconColor: colors.onLevel0.secondary(),
      prefixIconColor: colors.onLevel0.secondary(),
    ),
    textButtonTheme: TextButtonThemeData(
      style: TextButton.styleFrom(
        iconSize: buttonIconSize,
        textStyle: buttonTextStyle,
        padding: buttonPadding,
        shape: buttonShape,
        foregroundColor: primaryColor,
        iconColor: primaryColor,
        minimumSize: buttonMinSize,
        backgroundColor: Colors.transparent,
      ),
    ),
    filledButtonTheme: FilledButtonThemeData(
      style: ElevatedButton.styleFrom(
        iconSize: buttonIconSize,
        textStyle: buttonTextStyle,
        padding: buttonPadding,
        shape: buttonShape,
        backgroundColor: primaryColor,
        foregroundColor: onPrimaryColor,
        minimumSize: buttonMinSize,
        iconColor: onPrimaryColor,
      ),
    ),
    segmentedButtonTheme: SegmentedButtonThemeData(
      style: OutlinedButton.styleFrom(
        iconSize: buttonIconSize,
        textStyle: buttonTextStyle,
        padding: buttonPadding,
        shape: buttonShape,
        minimumSize: buttonMinSize,
        side: BorderSide(color: primaryColor),
        tapTargetSize: MaterialTapTargetSize.shrinkWrap,
        visualDensity: const VisualDensity(horizontal: -2, vertical: -2),
      ),
    ),
    elevatedButtonTheme: ElevatedButtonThemeData(
      style: ElevatedButton.styleFrom(
        iconSize: buttonIconSize,
        textStyle: buttonTextStyle,
        padding: buttonPadding,
        shape: buttonShape,
        minimumSize: buttonMinSize,
        backgroundColor: primaryColor,
        foregroundColor: onPrimaryColor,
        iconColor: onPrimaryColor,
      ),
    ),
    outlinedButtonTheme: OutlinedButtonThemeData(
      style: OutlinedButton.styleFrom(
        iconSize: buttonIconSize,
        textStyle: buttonTextStyle,
        padding: buttonPadding,
        minimumSize: buttonMinSize,
        shape: buttonShape,
        foregroundColor: primaryColor,
        iconColor: primaryColor,
        backgroundColor: Colors.transparent,
        side: BorderSide(color: primaryColor),
      ),
    ),
    dividerTheme: DividerThemeData(
      thickness: 1,
      color: colors.level2,
      space: 1,
    ),
    primaryColor: primaryColor,
    sliderTheme: SliderThemeData(
      activeTrackColor: primaryColor,
      inactiveTrackColor: trackColor,
      thumbColor: primaryColor,
      overlayColor: trackColor,
    ),
    progressIndicatorTheme: ProgressIndicatorThemeData(
      color: primaryColor,
      linearTrackColor: trackColor,
      circularTrackColor: trackColor,
    ),
    extensions: [colors],
  );
}

ThemeData buildLightTheme() {
  const int primaryValue = 0xFF12151C;
  const primarySwatch = MaterialColor(primaryValue, {
    50: Color(0xFFE3E3E4),
    100: Color(0xFFB8B9BB),
    200: Color(0xFF898A8E),
    300: Color(0xFF595B60),
    400: Color(0xFF36383E),
    500: Color(primaryValue),
    600: Color(0xFF101219),
    700: Color(0xFF0D0F14),
    800: Color(0xFF0A0C11),
    900: Color(0xFF050609),
  });

  return _buildTheme(
    brightness: Brightness.light,
    primarySwatch: primarySwatch,
    colors: AppColors(
      primary: primarySwatch,
      onPrimary: Colors.white,
      error: Colors.red.shade600,
      onError: Colors.white,
      success: Colors.green.shade600,
      onSuccess: Colors.white,
      level0: Colors.white,
      onLevel0: Colors.black,
      level1: Colors.grey.shade200,
      onLevel1: Colors.black,
      level2: Colors.grey.shade300,
      onLevel2: Colors.black,
    ),
  );
}

ThemeData buildDarkTheme() {
  const primaryValue = 0xFFf9fafd;
  const primarySwatch = MaterialColor(primaryValue, {
    50: Color(0xFFfefefe),
    100: Color(0xFFfdfdfe),
    200: Color(0xFFfbfcfe),
    300: Color(0xFFf9fafd),
    400: Color(0xFFf7f8fd),
    500: Color(primaryValue),
    600: Color(0xFFf5f6fc),
    700: Color(0xFFf3f4fc),
    800: Color(0xFFf1f2fb),
    900: Color(0xFFeff0fb),
  });

  const bg0 = Color(0xff1e2124);
  const bg1 = Color(0xff282b30);
  const bg2 = Color(0xff36393e);

  return _buildTheme(
    brightness: Brightness.dark,
    primarySwatch: primarySwatch,
    colors: AppColors(
      primary: primarySwatch,
      onPrimary: Colors.black,
      error: Colors.red.shade400,
      onError: Colors.white,
      success: Colors.green.shade600,
      onSuccess: Colors.white,
      level0: bg0,
      onLevel0: Colors.white,
      level1: bg1,
      onLevel1: Colors.white,
      level2: bg2,
      onLevel2: Colors.white,
    ),
  );
}
