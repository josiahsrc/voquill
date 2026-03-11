import 'package:flutter/services.dart';

abstract class AutoCorrectEngine {
  bool get isLoaded;
  Future<void> load();

  /// Returns a corrected/completed word, or null if no correction needed.
  String? correct(String word);
}

class DictionaryAutoCorrectEngine extends AutoCorrectEngine {
  final String assetPath;
  List<String> _words = [];
  Map<String, int> _wordRank = {};
  bool _loaded = false;

  DictionaryAutoCorrectEngine({required this.assetPath});

  @override
  bool get isLoaded => _loaded;

  @override
  Future<void> load() async {
    if (_loaded) return;
    final data = await rootBundle.loadString(assetPath);
    loadFromString(data);
  }

  void loadFromString(String data) {
    _words = data
        .split('\n')
        .map((w) => w.trim().toLowerCase())
        .where((w) => w.isNotEmpty)
        .toList();
    _wordRank = {for (var i = 0; i < _words.length; i++) _words[i]: i};
    _loaded = true;
  }

  @override
  String? correct(String word) {
    if (!_loaded || word.isEmpty) return null;

    final lower = word.toLowerCase();

    // Already a valid word — no correction.
    if (_wordRank.containsKey(lower)) return null;

    final isCapitalized = word[0] == word[0].toUpperCase();

    String? best;
    var bestScore = double.infinity;

    for (var i = 0; i < _words.length; i++) {
      final candidate = _words[i];
      final lengthDiff = (candidate.length - lower.length).abs();

      // Prefix completion (>= 3 chars typed).
      if (lower.length >= 3 && lengthDiff > 0 && candidate.startsWith(lower)) {
        final score = i.toDouble() + (candidate.length - lower.length) * 100;
        if (score < bestScore) {
          bestScore = score;
          best = candidate;
        }
        continue;
      }

      // Edit distance correction (max distance 2).
      if (lengthDiff > 2) continue;
      final dist = _editDistance(lower, candidate);
      if (dist > 0 && dist <= 2) {
        final score = dist * 1000 + i.toDouble();
        if (score < bestScore) {
          bestScore = score;
          best = candidate;
        }
      }
    }

    if (best == null) return null;

    if (isCapitalized) {
      return best[0].toUpperCase() + best.substring(1);
    }
    return best;
  }

  static int _editDistance(String a, String b) {
    if (a == b) return 0;
    if (a.isEmpty) return b.length;
    if (b.isEmpty) return a.length;

    final m = a.length;
    final n = b.length;

    var prev = List.generate(n + 1, (j) => j);
    var curr = List.filled(n + 1, 0);

    for (var i = 1; i <= m; i++) {
      curr[0] = i;
      for (var j = 1; j <= n; j++) {
        final cost = a[i - 1] == b[j - 1] ? 0 : 1;
        curr[j] = [
          prev[j] + 1,
          curr[j - 1] + 1,
          prev[j - 1] + cost,
        ].reduce((a, b) => a < b ? a : b);
      }
      final temp = prev;
      prev = curr;
      curr = temp;
    }

    return prev[n];
  }
}
