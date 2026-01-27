import 'package:app/api/firebase_api.dart';
import 'package:app/model/firebase_model.dart';

class TryInitializeMemberApi extends FirebaseApiNoInput<EmptyOutput> {
  @override
  String get handlerName => 'member/tryInitialize';

  @override
  EmptyOutput parseOutput(Map<String, dynamic> data) =>
      EmptyOutput.fromJson(data);
}

class GetMyMemberApi extends FirebaseApiNoInput<GetMyMemberOutput> {
  @override
  String get handlerName => 'member/getMyMember';

  @override
  GetMyMemberOutput parseOutput(Map<String, dynamic> data) =>
      GetMyMemberOutput.fromJson(data);
}
