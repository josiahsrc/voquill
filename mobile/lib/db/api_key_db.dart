import 'package:app/db/database.dart';
import 'package:app/model/api_key_model.dart';
import 'package:app/utils/crypto_utils.dart';
import 'package:app/utils/log_utils.dart';

final _logger = createNamedLogger('api_key_db');

enum ApiKeyTable {
  transcription('transcription_api_keys'),
  postProcessing('post_processing_api_keys');

  const ApiKeyTable(this.tableName);
  final String tableName;
}

class ApiKeyDb {
  const ApiKeyDb(this.table);

  final ApiKeyTable table;

  Future<List<ApiKeyEntry>> listAll() async {
    final db = AppDatabase.instance.db;
    final rows = await db.query(
      table.tableName,
      orderBy: 'created_at DESC',
    );
    return rows.map(ApiKeyEntry.fromMap).toList();
  }

  Future<ApiKeyEntry> create({
    required String id,
    required String name,
    required String provider,
    required String apiKey,
    String? baseUrl,
    String? model,
  }) async {
    final db = AppDatabase.instance.db;
    final protected = protectApiKey(apiKey);
    final now = DateTime.now().toUtc().toIso8601String();

    final row = {
      'id': id,
      'name': name,
      'provider': provider,
      'created_at': now,
      'salt': protected.saltBase64,
      'key_ciphertext': protected.ciphertextBase64,
      'key_suffix': protected.keySuffix,
      'base_url': baseUrl,
      'model': model,
    };

    await db.insert(table.tableName, row);
    _logger.i('Created API key "$name" in ${table.tableName}');

    return ApiKeyEntry(
      id: id,
      name: name,
      provider: provider,
      createdAt: now,
      keySuffix: protected.keySuffix,
      baseUrl: baseUrl,
      model: model,
    );
  }

  Future<void> delete(String id) async {
    final db = AppDatabase.instance.db;
    await db.delete(table.tableName, where: 'id = ?', whereArgs: [id]);
    _logger.i('Deleted API key $id from ${table.tableName}');
  }

  Future<String> revealKey(String id) async {
    final db = AppDatabase.instance.db;
    final rows = await db.query(
      table.tableName,
      columns: ['salt', 'key_ciphertext'],
      where: 'id = ?',
      whereArgs: [id],
    );

    if (rows.isEmpty) throw StateError('API key $id not found');

    final row = rows.first;
    return revealApiKey(
      row['salt'] as String,
      row['key_ciphertext'] as String,
    );
  }
}
