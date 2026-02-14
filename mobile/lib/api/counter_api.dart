import 'package:app/api/base_api.dart';
import 'package:flutter/services.dart';

const _sharedChannel = MethodChannel('com.voquill.app/shared');

class GetUpdateCounterApi extends BaseApi<void, int> {
  @override
  Future<int> call(void input) async {
    final result = await _sharedChannel.invokeMethod<int>('getUpdateCounter');
    return result ?? 0;
  }
}
