import 'package:app/api/firebase_api.dart';
import 'package:app/model/firebase_model.dart';

class CreateApiTokenApi extends FirebaseApiNoInput<CreateApiTokenOutput> {
  @override
  String get handlerName => 'auth/createApiToken';

  @override
  CreateApiTokenOutput parseOutput(Map<String, dynamic> data) =>
      CreateApiTokenOutput.fromJson(data);
}
