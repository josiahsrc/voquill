import 'package:app/utils/log_utils.dart';
import 'package:flutter/foundation.dart';

abstract class BaseApi<I, O> with Loggable {
  Future<O> call(I input);
}

abstract class ComputeApi<I, O> extends BaseApi<I, O> {
  final O Function(I input) callback;

  ComputeApi(this.callback);

  @override
  Future<O> call(I input) async {
    final result = await compute(callback, input);
    return result;
  }
}
