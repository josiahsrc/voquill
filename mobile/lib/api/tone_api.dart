import 'package:app/api/firebase_api.dart';
import 'package:app/model/firebase_model.dart';

class ListMyTonesApi extends FirebaseApiNoInput<ListMyTonesOutput> {
  @override
  String get handlerName => 'tone/listMyTones';

  @override
  ListMyTonesOutput parseOutput(Map<String, dynamic> data) =>
      ListMyTonesOutput.fromJson(data);
}

class UpsertMyToneApi extends FirebaseApi<UpsertMyToneInput, EmptyOutput> {
  @override
  String get handlerName => 'tone/upsertMyTone';

  @override
  Map<String, dynamic> serializeInput(UpsertMyToneInput input) =>
      input.toJson();

  @override
  EmptyOutput parseOutput(Map<String, dynamic> data) =>
      EmptyOutput.fromJson(data);
}

class DeleteMyToneApi extends FirebaseApi<DeleteMyToneInput, EmptyOutput> {
  @override
  String get handlerName => 'tone/deleteMyTone';

  @override
  Map<String, dynamic> serializeInput(DeleteMyToneInput input) =>
      input.toJson();

  @override
  EmptyOutput parseOutput(Map<String, dynamic> data) =>
      EmptyOutput.fromJson(data);
}
