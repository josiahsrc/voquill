import 'package:draft/draft.dart';
import 'package:equatable/equatable.dart';

part 'snackbar_state.draft.dart';

enum SnackbarType {
  info,
  error,
}

@draft
class SnackbarState with EquatableMixin {
  final String message;
  final SnackbarType type;
  final Duration duration;
  final int counter;

  const SnackbarState({
    this.message = '',
    this.type = SnackbarType.info,
    this.duration = const Duration(seconds: 5),
    this.counter = 0,
  });

  @override
  List<Object?> get props => [message, type, duration, counter];
}
