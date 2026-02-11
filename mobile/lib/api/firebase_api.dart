import 'dart:convert';

import 'package:app/api/base_api.dart';
import 'package:cloud_functions/cloud_functions.dart';

Map<String, dynamic> _deepCast(Map data) {
  return data.map((key, value) {
    if (value is Map) {
      return MapEntry(key as String, _deepCast(value));
    } else if (value is List) {
      return MapEntry(key as String, _deepCastList(value));
    }
    return MapEntry(key as String, value);
  });
}

List<dynamic> _deepCastList(List data) {
  return data.map((value) {
    if (value is Map) return _deepCast(value);
    if (value is List) return _deepCastList(value);
    return value;
  }).toList();
}

abstract class FirebaseApi<I, O> extends BaseApi<I, O> {
  String get handlerName;

  O parseOutput(Map<String, dynamic> data);

  Map<String, dynamic> serializeInput(I input);

  @override
  Future<O> call(I input) async {
    final callable = FirebaseFunctions.instance.httpsCallable('handler');
    final params = jsonDecode(
      jsonEncode({'name': handlerName, 'args': serializeInput(input)}),
    );
    final result = await callable.call(params);
    return parseOutput(_deepCast(result.data as Map));
  }
}

abstract class FirebaseApiNoInput<O> extends BaseApi<void, O> {
  String get handlerName;

  O parseOutput(Map<String, dynamic> data);

  @override
  Future<O> call(void input) async {
    final callable = FirebaseFunctions.instance.httpsCallable('handler');
    final result = await callable.call({
      'name': handlerName,
      'args': <String, dynamic>{},
    });
    return parseOutput(_deepCast(result.data as Map));
  }
}
