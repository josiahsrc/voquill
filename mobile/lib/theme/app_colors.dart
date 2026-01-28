import 'package:equatable/equatable.dart';
import 'package:flutter/material.dart';

extension AppColorsContextX on BuildContext {
  AppColors get colors => Theme.of(this).extension<AppColors>()!;
}

@immutable
class AppColors extends ThemeExtension<AppColors> with EquatableMixin {
  final Color primary;
  final Color onPrimary;

  final Color error;
  final Color onError;

  final Color success;
  final Color onSuccess;

  final Color level0;
  final Color onLevel0;

  final Color level1;
  final Color onLevel1;

  final Color level2;
  final Color onLevel2;

  const AppColors({
    required this.primary,
    required this.onPrimary,
    required this.error,
    required this.onError,
    required this.success,
    required this.onSuccess,
    required this.level0,
    required this.onLevel0,
    required this.level1,
    required this.onLevel1,
    required this.level2,
    required this.onLevel2,
  });

  @override
  AppColors copyWith({
    Color? primary,
    Color? onPrimary,
    Color? error,
    Color? onError,
    Color? success,
    Color? onSuccess,
    Color? level0,
    Color? onLevel0,
    Color? level1,
    Color? onLevel1,
    Color? level2,
    Color? onLevel2,
  }) {
    return AppColors(
      primary: primary ?? this.primary,
      onPrimary: onPrimary ?? this.onPrimary,
      error: error ?? this.error,
      onError: onError ?? this.onError,
      success: success ?? this.success,
      onSuccess: onSuccess ?? this.onSuccess,
      level0: level0 ?? this.level0,
      onLevel0: onLevel0 ?? this.onLevel0,
      level1: level1 ?? this.level1,
      onLevel1: onLevel1 ?? this.onLevel1,
      level2: level2 ?? this.level2,
      onLevel2: onLevel2 ?? this.onLevel2,
    );
  }

  @override
  AppColors lerp(AppColors? other, double t) {
    if (other is! AppColors) {
      return this;
    }

    return AppColors(
      primary: Color.lerp(primary, other.primary, t)!,
      onPrimary: Color.lerp(onPrimary, other.onPrimary, t)!,
      error: Color.lerp(error, other.error, t)!,
      onError: Color.lerp(onError, other.onError, t)!,
      success: Color.lerp(success, other.success, t)!,
      onSuccess: Color.lerp(onSuccess, other.onSuccess, t)!,
      level0: Color.lerp(level0, other.level0, t)!,
      onLevel0: Color.lerp(onLevel0, other.onLevel0, t)!,
      level1: Color.lerp(level1, other.level1, t)!,
      onLevel1: Color.lerp(onLevel1, other.onLevel1, t)!,
      level2: Color.lerp(level2, other.level2, t)!,
      onLevel2: Color.lerp(onLevel2, other.onLevel2, t)!,
    );
  }

  @override
  List<Object?> get props => [
    primary,
    onPrimary,
    error,
    onError,
    success,
    onSuccess,
    level0,
    onLevel0,
    level1,
    onLevel1,
    level2,
    onLevel2,
  ];
}
