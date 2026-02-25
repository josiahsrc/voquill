import 'dart:convert';
import 'dart:math';
import 'dart:typed_data';

import 'package:crypto/crypto.dart';
import 'package:pointycastle/export.dart';

const _appSecret = 'voquill-mobile-key-store-v1';
const _nonceLength = 12;
const _tagLength = 16;

class ProtectedApiKey {
  const ProtectedApiKey({
    required this.saltBase64,
    required this.ciphertextBase64,
    required this.keySuffix,
  });

  final String saltBase64;
  final String ciphertextBase64;
  final String keySuffix;
}

Uint8List _deriveKey(Uint8List salt) {
  final input = utf8.encode(_appSecret) + salt;
  final hash = sha256.convert(input);
  return Uint8List.fromList(hash.bytes);
}

Uint8List _randomBytes(int length) {
  final rng = Random.secure();
  return Uint8List.fromList(List.generate(length, (_) => rng.nextInt(256)));
}

ProtectedApiKey protectApiKey(String key) {
  final salt = _randomBytes(16);
  final derivedKey = _deriveKey(salt);
  final nonce = _randomBytes(_nonceLength);
  final plaintext = utf8.encode(key);

  final cipher = GCMBlockCipher(AESEngine())
    ..init(
      true,
      AEADParameters(
        KeyParameter(derivedKey),
        _tagLength * 8,
        nonce,
        Uint8List(0),
      ),
    );

  final output = Uint8List(plaintext.length + _tagLength);
  final len = cipher.processBytes(
    Uint8List.fromList(plaintext),
    0,
    plaintext.length,
    output,
    0,
  );
  cipher.doFinal(output, len);

  final combined = Uint8List.fromList(nonce + output);

  final suffix = key.length >= 4 ? key.substring(key.length - 4) : key;

  return ProtectedApiKey(
    saltBase64: base64Encode(salt),
    ciphertextBase64: base64Encode(combined),
    keySuffix: suffix,
  );
}

String revealApiKey(String saltBase64, String ciphertextBase64) {
  final salt = base64Decode(saltBase64);
  final derivedKey = _deriveKey(Uint8List.fromList(salt));
  final combined = base64Decode(ciphertextBase64);

  final nonce = Uint8List.fromList(combined.sublist(0, _nonceLength));
  final ciphertextWithTag = Uint8List.fromList(combined.sublist(_nonceLength));

  final cipher = GCMBlockCipher(AESEngine())
    ..init(
      false,
      AEADParameters(
        KeyParameter(derivedKey),
        _tagLength * 8,
        nonce,
        Uint8List(0),
      ),
    );

  final output = Uint8List(ciphertextWithTag.length - _tagLength);
  final len = cipher.processBytes(
    ciphertextWithTag,
    0,
    ciphertextWithTag.length,
    output,
    0,
  );
  cipher.doFinal(output, len);

  return utf8.decode(output);
}
