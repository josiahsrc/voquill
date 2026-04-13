import 'package:app/utils/channel_utils.dart';
import 'package:app/utils/log_utils.dart';
import 'package:shared_preferences/shared_preferences.dart';

final _logger = createNamedLogger('idle_timeout');

const _kIdleTimeoutSeconds = 'idle_timeout_seconds';
const _kIdleTimeoutKeepRunning = 'idle_timeout_keep_running';
const _defaultIdleTimeoutSeconds = 120;

Future<int> getIdleTimeoutSeconds() async {
  final prefs = await SharedPreferences.getInstance();
  return prefs.getInt(_kIdleTimeoutSeconds) ?? _defaultIdleTimeoutSeconds;
}

Future<bool> getIdleTimeoutKeepRunning() async {
  final prefs = await SharedPreferences.getInstance();
  return prefs.getBool(_kIdleTimeoutKeepRunning) ?? false;
}

Future<void> setIdleTimeout({
  required int seconds,
  required bool keepRunning,
}) async {
  final prefs = await SharedPreferences.getInstance();
  await prefs.setInt(_kIdleTimeoutSeconds, seconds);
  await prefs.setBool(_kIdleTimeoutKeepRunning, keepRunning);
  await syncIdleTimeoutToNative(keepRunning ? 0 : seconds);
}

Future<void> syncIdleTimeoutToNative(int seconds) async {
  try {
    await syncIdleTimeout(timeoutSeconds: seconds);
  } catch (e) {
    _logger.w('Failed to sync idle timeout', e);
  }
}
