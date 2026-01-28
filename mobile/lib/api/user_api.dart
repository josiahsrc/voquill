import 'package:app/api/firebase_api.dart';
import 'package:app/model/firebase_model.dart';

class GetMyUserApi extends FirebaseApiNoInput<GetMyUserOutput> {
  @override
  String get handlerName => 'user/getMyUser';

  @override
  GetMyUserOutput parseOutput(Map<String, dynamic> data) =>
      GetMyUserOutput.fromJson(data);
}

class SetMyUserApi extends FirebaseApi<SetMyUserInput, EmptyOutput> {
  @override
  String get handlerName => 'user/setMyUser';

  @override
  Map<String, dynamic> serializeInput(SetMyUserInput input) => input.toJson();

  @override
  EmptyOutput parseOutput(Map<String, dynamic> data) =>
      EmptyOutput.fromJson(data);
}
