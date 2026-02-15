import 'package:app/api/base_api.dart';
import 'package:flutter/services.dart';

const _sharedChannel = MethodChannel('com.voquill.mobile/shared');

class GetAppCounterApi extends BaseApi<void, int> {
  @override
  Future<int> call(void input) async {
    final result = await _sharedChannel.invokeMethod<int>('getAppCounter');
    return result ?? 0;
  }
}

class IncrementKeyboardCounterApi extends BaseApi<void, void> {
  @override
  Future<void> call(void input) async {
    await _sharedChannel.invokeMethod('incrementKeyboardCounter');
  }
}
