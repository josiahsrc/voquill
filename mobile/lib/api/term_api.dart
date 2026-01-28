import 'package:app/api/firebase_api.dart';
import 'package:app/model/firebase_model.dart';

class ListMyTermsApi extends FirebaseApiNoInput<ListMyTermsOutput> {
  @override
  String get handlerName => 'term/listMyTerms';

  @override
  ListMyTermsOutput parseOutput(Map<String, dynamic> data) =>
      ListMyTermsOutput.fromJson(data);
}

class UpsertMyTermApi extends FirebaseApi<UpsertMyTermInput, EmptyOutput> {
  @override
  String get handlerName => 'term/upsertMyTerm';

  @override
  Map<String, dynamic> serializeInput(UpsertMyTermInput input) =>
      input.toJson();

  @override
  EmptyOutput parseOutput(Map<String, dynamic> data) =>
      EmptyOutput.fromJson(data);
}

class DeleteMyTermApi extends FirebaseApi<DeleteMyTermInput, EmptyOutput> {
  @override
  String get handlerName => 'term/deleteMyTerm';

  @override
  Map<String, dynamic> serializeInput(DeleteMyTermInput input) =>
      input.toJson();

  @override
  EmptyOutput parseOutput(Map<String, dynamic> data) =>
      EmptyOutput.fromJson(data);
}
