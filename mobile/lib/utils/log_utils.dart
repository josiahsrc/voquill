import 'package:logger/logger.dart';

class CondensedLogPrinter extends LogPrinter {
  CondensedLogPrinter({required this.name});

  final String name;

  @override
  List<String> log(LogEvent event) {
    final now = DateTime.now();
    final level = event.level;
    final msg = event.message;

    String levelString;
    if (level == Level.trace) {
      levelString = '⚪️';
    } else if (level == Level.debug) {
      levelString = '🟣';
    } else if (level == Level.info) {
      levelString = '🔵';
    } else if (level == Level.warning) {
      levelString = '🟡';
    } else if (level == Level.error) {
      levelString = '⛔️';
    } else if (level == Level.fatal) {
      levelString = '🤯';
    } else {
      levelString = '🤷';
    }

    if (event.error == null) {
      return ['$levelString [$name][$now] $msg'];
    } else if (event.stackTrace == null) {
      return ['$levelString [$name][$now] $msg - [${event.error}]'];
    } else {
      return [
        '$levelString [$name][$now] $msg - [${event.error}]',
        event.stackTrace.toString(),
      ];
    }
  }
}

class LevelFilter extends LogFilter {
  @override
  bool shouldLog(LogEvent event) {
    return level != null && event.level.index >= level!.index;
  }
}

class AppLogger {
  final Logger _logger;

  const AppLogger(this._logger);

  void t(dynamic message, [Object? error, StackTrace? stackTrace]) {
    _logger.t(message, error: error, stackTrace: stackTrace);
  }

  void i(dynamic message, [Object? error, StackTrace? stackTrace]) {
    _logger.i(message, error: error, stackTrace: stackTrace);
  }

  void w(dynamic message, [Object? error, StackTrace? stackTrace]) {
    _logger.w(message, error: error, stackTrace: stackTrace);
  }

  void e(dynamic message, [Object? error, StackTrace? stackTrace]) {
    _logger.e(message, error: error, stackTrace: stackTrace);
  }
}

AppLogger createNamedLogger(String name) => AppLogger(
  Logger(
    printer: CondensedLogPrinter(name: name),
    filter: LevelFilter(),
  ),
);

AppLogger createTypedLogger(Type type) => createNamedLogger(type.toString());

mixin Loggable {
  AppLogger get logger => createTypedLogger(runtimeType);
}
