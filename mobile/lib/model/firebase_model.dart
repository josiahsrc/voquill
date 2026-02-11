import 'package:app/model/config_model.dart';
import 'package:app/model/member_model.dart';
import 'package:app/model/term_model.dart';
import 'package:app/model/tone_model.dart';
import 'package:app/model/user_model.dart';
import 'package:json_annotation/json_annotation.dart';

part 'firebase_model.g.dart';

class EmptyInput {
  const EmptyInput();
  Map<String, dynamic> toJson() => {};
}

class EmptyOutput {
  const EmptyOutput();
  factory EmptyOutput.fromJson(Map<String, dynamic> json) =>
      const EmptyOutput();
}

@JsonSerializable()
class ListMyTermsOutput {
  final List<Term> terms;

  const ListMyTermsOutput({required this.terms});

  factory ListMyTermsOutput.fromJson(Map<String, dynamic> json) =>
      _$ListMyTermsOutputFromJson(json);
}

@JsonSerializable()
class UpsertMyTermInput {
  final Term term;

  const UpsertMyTermInput({required this.term});

  Map<String, dynamic> toJson() => _$UpsertMyTermInputToJson(this);
}

@JsonSerializable()
class DeleteMyTermInput {
  final String termId;

  const DeleteMyTermInput({required this.termId});

  Map<String, dynamic> toJson() => _$DeleteMyTermInputToJson(this);
}

@JsonSerializable()
class ListMyTonesOutput {
  final List<Tone> tones;

  const ListMyTonesOutput({required this.tones});

  factory ListMyTonesOutput.fromJson(Map<String, dynamic> json) =>
      _$ListMyTonesOutputFromJson(json);
}

@JsonSerializable()
class UpsertMyToneInput {
  final Tone tone;

  const UpsertMyToneInput({required this.tone});

  Map<String, dynamic> toJson() => _$UpsertMyToneInputToJson(this);
}

@JsonSerializable()
class DeleteMyToneInput {
  final String toneId;

  const DeleteMyToneInput({required this.toneId});

  Map<String, dynamic> toJson() => _$DeleteMyToneInputToJson(this);
}

@JsonSerializable()
class GetMyMemberOutput {
  final Member? member;

  const GetMyMemberOutput({this.member});

  factory GetMyMemberOutput.fromJson(Map<String, dynamic> json) =>
      _$GetMyMemberOutputFromJson(json);
}

@JsonSerializable()
class TranscribeAudioInput {
  final String? prompt;
  final String audioBase64;
  final String audioMimeType;
  final bool? simulate;
  final String? language;

  const TranscribeAudioInput({
    this.prompt,
    required this.audioBase64,
    required this.audioMimeType,
    this.simulate,
    this.language,
  });

  Map<String, dynamic> toJson() => _$TranscribeAudioInputToJson(this);
}

@JsonSerializable()
class TranscribeAudioOutput {
  final String text;

  const TranscribeAudioOutput({required this.text});

  factory TranscribeAudioOutput.fromJson(Map<String, dynamic> json) =>
      _$TranscribeAudioOutputFromJson(json);
}

@JsonSerializable()
class JsonResponseSchema {
  final String name;
  final String? description;
  final Map<String, dynamic> schema;

  const JsonResponseSchema({
    required this.name,
    this.description,
    required this.schema,
  });

  factory JsonResponseSchema.fromJson(Map<String, dynamic> json) =>
      _$JsonResponseSchemaFromJson(json);
  Map<String, dynamic> toJson() => _$JsonResponseSchemaToJson(this);
}

enum CloudModel {
  @JsonValue('medium')
  medium,
  @JsonValue('large')
  large,
}

@JsonSerializable()
class GenerateTextInput {
  final String? system;
  final String prompt;
  final bool? simulate;
  final JsonResponseSchema? jsonResponse;
  final CloudModel? model;

  const GenerateTextInput({
    this.system,
    required this.prompt,
    this.simulate,
    this.jsonResponse,
    this.model,
  });

  Map<String, dynamic> toJson() => _$GenerateTextInputToJson(this);
}

@JsonSerializable()
class GenerateTextOutput {
  final String text;

  const GenerateTextOutput({required this.text});

  factory GenerateTextOutput.fromJson(Map<String, dynamic> json) =>
      _$GenerateTextOutputFromJson(json);
}

@JsonSerializable()
class SetMyUserInput {
  final User value;

  const SetMyUserInput({required this.value});

  Map<String, dynamic> toJson() => _$SetMyUserInputToJson(this);
}

@JsonSerializable()
class GetMyUserOutput {
  final User? user;

  const GetMyUserOutput({this.user});

  factory GetMyUserOutput.fromJson(Map<String, dynamic> json) =>
      _$GetMyUserOutputFromJson(json);
}

@JsonSerializable()
class CreateCheckoutSessionInput {
  final String priceId;

  const CreateCheckoutSessionInput({required this.priceId});

  Map<String, dynamic> toJson() => _$CreateCheckoutSessionInputToJson(this);
}

@JsonSerializable()
class CreateCheckoutSessionOutput {
  final String sessionId;
  final String clientSecret;

  const CreateCheckoutSessionOutput({
    required this.sessionId,
    required this.clientSecret,
  });

  factory CreateCheckoutSessionOutput.fromJson(Map<String, dynamic> json) =>
      _$CreateCheckoutSessionOutputFromJson(json);
}

@JsonSerializable()
class GetPricesInput {
  final List<String> priceIds;

  const GetPricesInput({required this.priceIds});

  Map<String, dynamic> toJson() => _$GetPricesInputToJson(this);
}

@JsonSerializable()
class PriceInfo {
  final int? unitAmount;
  final String? unitAmountDecimal;
  final String currency;

  const PriceInfo({
    this.unitAmount,
    this.unitAmountDecimal,
    required this.currency,
  });

  factory PriceInfo.fromJson(Map<String, dynamic> json) =>
      _$PriceInfoFromJson(json);
}

@JsonSerializable()
class GetPricesOutput {
  final Map<String, PriceInfo> prices;

  const GetPricesOutput({required this.prices});

  factory GetPricesOutput.fromJson(Map<String, dynamic> json) =>
      _$GetPricesOutputFromJson(json);
}

@JsonSerializable()
class CreateCustomerPortalSessionOutput {
  final String url;

  const CreateCustomerPortalSessionOutput({required this.url});

  factory CreateCustomerPortalSessionOutput.fromJson(
          Map<String, dynamic> json) =>
      _$CreateCustomerPortalSessionOutputFromJson(json);
}

@JsonSerializable()
class CreateApiTokenOutput {
  final String apiToken;
  final String apiRefreshToken;

  const CreateApiTokenOutput({
    required this.apiToken,
    required this.apiRefreshToken,
  });

  factory CreateApiTokenOutput.fromJson(Map<String, dynamic> json) =>
      _$CreateApiTokenOutputFromJson(json);
}

@JsonSerializable()
class GetFullConfigOutput {
  final FullConfig config;

  const GetFullConfigOutput({required this.config});

  factory GetFullConfigOutput.fromJson(Map<String, dynamic> json) =>
      _$GetFullConfigOutputFromJson(json);
}
