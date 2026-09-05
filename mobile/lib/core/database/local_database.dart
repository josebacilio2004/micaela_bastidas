import 'package:sqflite/sqflite.dart';
import 'package:path/path.dart';

class LocalDatabase {
  static final LocalDatabase instance = LocalDatabase._init();
  static Database? _database;

  LocalDatabase._init();

  Future<Database> get database async {
    if (_database != null) return _database!;
    _database = await _initDB('micaela_bastidas.db');
    return _database!;
  }

  Future<Database> _initDB(String filePath) async {
    final dbPath = await getDatabasesPath();
    final path = join(dbPath, filePath);

    return await openDatabase(
      path,
      version: 1,
      onCreate: _createDB,
    );
  }

  Future _createDB(Database db, int version) async {
    // Tabla para pagos en cola de sincronización offline
    await db.execute('''
      CREATE TABLE offline_payments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        idempotency_key TEXT UNIQUE,
        merchant_id TEXT,
        merchant_name TEXT,
        concept_id TEXT,
        concept_name TEXT,
        obligation_id TEXT,
        amount REAL,
        period TEXT,
        payment_method TEXT,
        created_at TEXT,
        sync_status TEXT
      )
    ''');

    // Tabla para caché offline de comerciantes
    await db.execute('''
      CREATE TABLE cached_merchants (
        id TEXT PRIMARY KEY,
        internal_code TEXT,
        first_name TEXT,
        last_name TEXT,
        dni TEXT,
        type_name TEXT,
        stall_code TEXT,
        business_category TEXT
      )
    ''');
  }

  Future<int> insertOfflinePayment(Map<String, dynamic> row) async {
    final db = await instance.database;
    return await db.insert('offline_payments', row);
  }

  Future<List<Map<String, dynamic>>> getPendingPayments() async {
    final db = await instance.database;
    return await db.query(
      'offline_payments',
      where: 'sync_status = ?',
      whereArgs: ['PENDIENTE'],
      orderBy: 'created_at ASC',
    );
  }

  Future<int> updatePaymentSyncStatus(String idempotencyKey, String status) async {
    final db = await instance.database;
    return await db.update(
      'offline_payments',
      {'sync_status': status},
      where: 'idempotency_key = ?',
      whereArgs: [idempotencyKey],
    );
  }

  Future<void> cacheMerchants(List<dynamic> merchants) async {
    final db = await instance.database;
    final batch = db.batch();
    batch.delete('cached_merchants');
    for (var m in merchants) {
      batch.insert('cached_merchants', {
        'id': m['id'],
        'internal_code': m['internalCode'],
        'first_name': m['firstName'],
        'last_name': m['lastName'],
        'dni': m['dni'],
        'type_name': m['merchantType']?['name'] ?? '',
        'stall_code': m['stall']?['code'] ?? '',
        'business_category': m['businessCategory'] ?? '',
      });
    }
    await batch.commit(noResult: true);
  }

  Future<List<Map<String, dynamic>>> searchCachedMerchants(String query) async {
    final db = await instance.database;
    if (query.isEmpty) {
      return await db.query('cached_merchants', limit: 30);
    }
    return await db.query(
      'cached_merchants',
      where: 'dni LIKE ? OR first_name LIKE ? OR last_name LIKE ? OR stall_code LIKE ? OR internal_code LIKE ?',
      whereArgs: ['%$query%', '%$query%', '%$query%', '%$query%', '%$query%'],
      limit: 30,
    );
  }
}
