extension NullableStringX on String? {
  bool get isNullOrEmpty {
    final self = this;
    return self == null || self.isEmpty;
  }

  String whenNullOrEmpty(String defaultValue) {
    return isNullOrEmpty ? defaultValue : this!;
  }
}
