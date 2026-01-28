import 'dart:math';

extension IterableX<T> on Iterable<T> {
  /// Join the elements with a separator of type T
  Iterable<T> joinWith(T separator) {
    final result = <T>[];
    var i = 0;
    for (final element in this) {
      if (i > 0) {
        result.add(separator);
      }
      result.add(element);
      i++;
    }
    return result;
  }
}

extension MapX<K, V> on Map<K, V> {
  void tryInsert(K? key, V value) {
    if (key != null) {
      this[key] = value;
    }
  }
}

extension ListX<T> on List<T> {
  void toggle(T value) {
    if (contains(value)) {
      remove(value);
    } else {
      add(value);
    }
  }

  T getRandomElement() {
    final randomIndex = Random().nextInt(length);
    return this[randomIndex];
  }

  void addIfMissing(T value) {
    if (!contains(value)) {
      add(value);
    }
  }

  void insertIfMissing(int index, T value) {
    if (!contains(value)) {
      insert(index, value);
    }
  }
}

List<T> listify<T>(T? value) {
  if (value == null) {
    return [];
  }
  return [value];
}
