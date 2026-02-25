import 'package:app/utils/log_utils.dart';
import 'package:path/path.dart';
import 'package:path_provider/path_provider.dart';
import 'package:sqflite/sqflite.dart';

final _logger = createNamedLogger('database');

class AppDatabase {
  AppDatabase._();

  static final AppDatabase instance = AppDatabase._();

  Database? _db;

  Database get db {
    final db = _db;
    if (db == null) throw StateError('Database not initialized');
    return db;
  }

  Future<void> initialize() async {
    if (_db != null) return;

    final dir = await getApplicationDocumentsDirectory();
    final path = join(dir.path, 'voquill.db');

    _db = await openDatabase(
      path,
      version: 1,
      onCreate: (db, version) async {
        await db.execute('''
          CREATE TABLE transcription_api_keys (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            provider TEXT NOT NULL,
            created_at TEXT NOT NULL,
            salt TEXT NOT NULL,
            key_ciphertext TEXT NOT NULL,
            key_suffix TEXT,
            base_url TEXT,
            model TEXT
          )
        ''');

        await db.execute('''
          CREATE TABLE post_processing_api_keys (
            id TEXT PRIMARY KEY,
            name TEXT NOT NULL,
            provider TEXT NOT NULL,
            created_at TEXT NOT NULL,
            salt TEXT NOT NULL,
            key_ciphertext TEXT NOT NULL,
            key_suffix TEXT,
            base_url TEXT,
            model TEXT
          )
        ''');

        _logger.i('Database tables created');
      },
    );

    _logger.i('Database initialized at $path');
  }
}
