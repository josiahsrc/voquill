Future<R> retry<R>(
  Future<R> Function() action, {
  int retries = 3,
  int delay = 100,
}) async {
  for (var attempt = 0; attempt < retries; attempt++) {
    try {
      return await action();
    } catch (e) {
      if (attempt == retries - 1) {
        rethrow;
      }

      final falloffDelay = delay * (1 << attempt);
      await Future.delayed(Duration(milliseconds: falloffDelay));
    }
  }

  throw Exception('Unreachable code reached in retry utility');
}
