import 'package:app/api/base_api.dart';
import 'package:flutter/services.dart';

const _sharedChannel = MethodChannel('com.voquill.app/shared');

class GetDictationLanguagesApi extends BaseApi<void, List<String>> {
  @override
  Future<List<String>> call(void input) async {
    final result = await _sharedChannel.invokeMethod<List>(
      'getDictationLanguages',
    );
    return result?.cast<String>() ?? [];
  }
}

class GetActiveDictationLanguageApi extends BaseApi<void, String?> {
  @override
  Future<String?> call(void input) async {
    final result = await _sharedChannel.invokeMethod<String>(
      'getActiveDictationLanguage',
    );
    return result;
  }
}

class SetDictationLanguagesApi extends BaseApi<List<String>, void> {
  @override
  Future<void> call(List<String> input) async {
    await _sharedChannel.invokeMethod('setDictationLanguages', {
      'languages': input,
    });
  }
}

class SetActiveDictationLanguageApi extends BaseApi<String, void> {
  @override
  Future<void> call(String input) async {
    await _sharedChannel.invokeMethod('setActiveDictationLanguage', {
      'language': input,
    });
  }
}
