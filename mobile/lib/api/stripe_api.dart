import 'package:app/api/firebase_api.dart';
import 'package:app/model/firebase_model.dart';

class CreateCheckoutSessionApi
    extends FirebaseApi<CreateCheckoutSessionInput, CreateCheckoutSessionOutput> {
  @override
  String get handlerName => 'stripe/createCheckoutSession';

  @override
  Map<String, dynamic> serializeInput(CreateCheckoutSessionInput input) =>
      input.toJson();

  @override
  CreateCheckoutSessionOutput parseOutput(Map<String, dynamic> data) =>
      CreateCheckoutSessionOutput.fromJson(data);
}

class GetPricesApi extends FirebaseApi<GetPricesInput, GetPricesOutput> {
  @override
  String get handlerName => 'stripe/getPrices';

  @override
  Map<String, dynamic> serializeInput(GetPricesInput input) => input.toJson();

  @override
  GetPricesOutput parseOutput(Map<String, dynamic> data) =>
      GetPricesOutput.fromJson(data);
}

class CreateCustomerPortalSessionApi
    extends FirebaseApiNoInput<CreateCustomerPortalSessionOutput> {
  @override
  String get handlerName => 'stripe/createCustomerPortalSession';

  @override
  CreateCustomerPortalSessionOutput parseOutput(Map<String, dynamic> data) =>
      CreateCustomerPortalSessionOutput.fromJson(data);
}
