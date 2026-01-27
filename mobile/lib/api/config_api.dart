import 'package:app/api/firebase_api.dart';
import 'package:app/model/firebase_model.dart';

class GetFullConfigApi extends FirebaseApiNoInput<GetFullConfigOutput> {
  @override
  String get handlerName => 'config/getFullConfig';

  @override
  GetFullConfigOutput parseOutput(Map<String, dynamic> data) =>
      GetFullConfigOutput.fromJson(data);
}
