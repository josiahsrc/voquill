import 'package:app/api/base_api.dart';
import 'package:cloud_functions/cloud_functions.dart';

abstract class FirebaseApi<I, O> extends BaseApi<I, O> {
  String get handlerName;

  O parseOutput(Map<String, dynamic> data);

  Map<String, dynamic> serializeInput(I input);

  @override
  Future<O> call(I input) async {
    final callable = FirebaseFunctions.instance.httpsCallable('handler');
    final result = await callable.call<Map<String, dynamic>>({
      'name': handlerName,
      'args': serializeInput(input),
    });
    return parseOutput(Map<String, dynamic>.from(result.data));
  }
}

abstract class FirebaseApiNoInput<O> extends BaseApi<void, O> {
  String get handlerName;

  O parseOutput(Map<String, dynamic> data);

  @override
  Future<O> call(void input) async {
    final callable = FirebaseFunctions.instance.httpsCallable('handler');
    final result = await callable.call<Map<String, dynamic>>({
      'name': handlerName,
      'args': <String, dynamic>{},
    });
    return parseOutput(Map<String, dynamic>.from(result.data));
  }
}
