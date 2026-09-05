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
      version: 2,
      onCreate: _createDB,
      onUpgrade: _upgradeDB,
    );
  }

  Future _createDB(Database db, int version) async {
    // 1. Pagos offline pendientes
    await db.execute('''
      CREATE TABLE IF NOT EXISTS offline_payments (
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

    // 2. Padrón de comerciantes en caché local con código QR
    await db.execute('''
      CREATE TABLE IF NOT EXISTS cached_merchants (
        id TEXT PRIMARY KEY,
        internal_code TEXT,
        first_name TEXT,
        last_name TEXT,
        dni TEXT UNIQUE,
        type_name TEXT,
        stall_code TEXT,
        business_category TEXT,
        qr_code TEXT UNIQUE
      )
    ''');

    // 3. Asambleas / Reuniones en caché
    await db.execute('''
      CREATE TABLE IF NOT EXISTS cached_meetings (
        id TEXT PRIMARY KEY,
        title TEXT,
        description TEXT,
        scheduled_at TEXT,
        status TEXT,
        total_eligible INTEGER
      )
    ''');

    // 4. Registro de asistencias en asamblea (evita duplicados localmente)
    await db.execute('''
      CREATE TABLE IF NOT EXISTS cached_attendances (
        meeting_id TEXT,
        merchant_id TEXT,
        dni TEXT,
        scanned_at TEXT,
        PRIMARY KEY (meeting_id, merchant_id)
      )
    ''');

    // 5. Cola de asistencias pendientes de sincronizar con el servidor
    await db.execute('''
      CREATE TABLE IF NOT EXISTS offline_attendance_events (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        idempotency_key TEXT UNIQUE,
        meeting_id TEXT,
        merchant_id TEXT,
        merchant_name TEXT,
        merchant_dni TEXT,
        merchant_code TEXT,
        merchant_stall TEXT,
        scanned_at TEXT,
        sync_status TEXT,
        verified_by TEXT
      )
    ''');
  }

  Future _upgradeDB(Database db, int oldVersion, int newVersion) async {
    if (oldVersion < 2) {
      await _createDB(db, newVersion);
      try {
        await db.execute('ALTER TABLE cached_merchants ADD COLUMN qr_code TEXT');
      } catch (_) {}
    }
  }

  // --- COMERCIANTES & QR ---
  Future<void> cacheMerchants(List<dynamic> merchants) async {
    final db = await instance.database;
    final batch = db.batch();
    batch.delete('cached_merchants');
    for (var m in merchants) {
      final dni = (m['dni'] ?? '').toString();
      final qr = (m['qrCode'] ?? 'MB-QR-$dni').toString();
      batch.insert(
        'cached_merchants',
        {
          'id': m['id'],
          'internal_code': m['internalCode'] ?? '',
          'first_name': m['firstName'] ?? '',
          'last_name': m['lastName'] ?? '',
          'dni': dni,
          'type_name': m['merchantType']?['name'] ?? 'Socio',
          'stall_code': m['stall']?['code'] ?? '',
          'business_category': m['businessCategory'] ?? '',
          'qr_code': qr,
        },
        conflictAlgorithm: ConflictAlgorithm.replace,
      );
    }
    await batch.commit(noResult: true);
  }

  Future<Map<String, dynamic>?> findMerchantByQr(String qrCode) async {
    final db = await instance.database;
    final cleanQr = qrCode.trim();

    var res = await db.query(
      'cached_merchants',
      where: 'qr_code = ?',
      whereArgs: [cleanQr],
      limit: 1,
    );

    if (res.isEmpty) {
      final dniMatch = cleanQr.replaceAll('MB-QR-', '');
      res = await db.query(
        'cached_merchants',
        where: 'dni = ? OR internal_code = ?',
        whereArgs: [dniMatch, cleanQr],
        limit: 1,
      );
    }

    if (res.isNotEmpty) {
      final m = Map<String, dynamic>.from(res.first);
      return {
        'id': m['id'],
        'internalCode': m['internal_code'],
        'firstName': m['first_name'],
        'lastName': m['last_name'],
        'dni': m['dni'],
        'merchantType': {'name': m['type_name']},
        'stall': m['stall_code'].toString().isNotEmpty ? {'code': m['stall_code']} : null,
        'businessCategory': m['business_category'],
        'qrCode': m['qr_code'],
      };
    }
    return null;
  }

  Future<List<Map<String, dynamic>>> searchCachedMerchants(String query) async {
    final db = await instance.database;
    final clean = query.trim();
    if (clean.isEmpty) {
      return await db.query('cached_merchants', limit: 30);
    }
    return await db.query(
      'cached_merchants',
      where: 'dni LIKE ? OR first_name LIKE ? OR last_name LIKE ? OR stall_code LIKE ? OR internal_code LIKE ? OR qr_code LIKE ?',
      whereArgs: ['%$clean%', '%$clean%', '%$clean%', '%$clean%', '%$clean%', '%$clean%'],
      limit: 30,
    );
  }

  // --- PAGOS OFFLINE ---
  Future<int> insertOfflinePayment(Map<String, dynamic> row) async {
    final db = await instance.database;
    return await db.insert('offline_payments', row, conflictAlgorithm: ConflictAlgorithm.replace);
  }

  Future<List<Map<String, dynamic>>> getPendingPayments() async {
    final db = await instance.database;
    return await db.query(
      'offline_payments',
      where: 'sync_status = ? OR sync_status = ?',
      whereArgs: ['PENDIENTE', 'ERROR'],
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

  // --- ASAMBLEAS & REUNIONES ---
  Future<void> cacheMeetings(List<dynamic> meetings) async {
    final db = await instance.database;
    final batch = db.batch();
    for (var m in meetings) {
      batch.insert(
        'cached_meetings',
        {
          'id': m['id'],
          'title': m['title'] ?? '',
          'description': m['description'] ?? '',
          'scheduled_at': m['scheduledAt'] ?? '',
          'status': m['status'] ?? 'PROGRAMADA',
          'total_eligible': m['totalEligible'] ?? 350,
        },
        conflictAlgorithm: ConflictAlgorithm.replace,
      );
    }
    await batch.commit(noResult: true);
  }

  Future<List<Map<String, dynamic>>> getCachedMeetings() async {
    final db = await instance.database;
    return await db.query('cached_meetings', orderBy: 'scheduled_at DESC');
  }

  Future<bool> isMerchantAlreadyAttended(String meetingId, String merchantId) async {
    final db = await instance.database;
    final res = await db.query(
      'cached_attendances',
      where: 'meeting_id = ? AND merchant_id = ?',
      whereArgs: [meetingId, merchantId],
      limit: 1,
    );
    return res.isNotEmpty;
  }

  Future<bool> recordAttendanceLocally({
    required String idempotencyKey,
    required String meetingId,
    required String merchantId,
    required String merchantName,
    required String merchantDni,
    required String merchantCode,
    required String merchantStall,
    required String verifiedBy,
  }) async {
    final db = await instance.database;

    final exists = await isMerchantAlreadyAttended(meetingId, merchantId);
    if (exists) return false;

    final now = DateTime.now().toIso8601String();

    await db.transaction((txn) async {
      await txn.insert('cached_attendances', {
        'meeting_id': meetingId,
        'merchant_id': merchantId,
        'dni': merchantDni,
        'scanned_at': now,
      });

      await txn.insert('offline_attendance_events', {
        'idempotency_key': idempotencyKey,
        'meeting_id': meetingId,
        'merchant_id': merchantId,
        'merchant_name': merchantName,
        'merchant_dni': merchantDni,
        'merchant_code': merchantCode,
        'merchant_stall': merchantStall,
        'scanned_at': now,
        'sync_status': 'PENDIENTE',
        'verified_by': verifiedBy,
      });
    });

    return true;
  }

  Future<Map<String, dynamic>> getMeetingQuorumStats(String meetingId, int defaultEligible) async {
    final db = await instance.database;

    final countRes = await db.rawQuery(
      'SELECT COUNT(*) as count FROM cached_attendances WHERE meeting_id = ?',
      [meetingId],
    );
    final count = Sqflite.firstIntValue(countRes) ?? 0;

    final meetingRes = await db.query(
      'cached_meetings',
      where: 'id = ?',
      whereArgs: [meetingId],
      limit: 1,
    );

    final totalEligible = meetingRes.isNotEmpty
        ? (meetingRes.first['total_eligible'] as int? ?? defaultEligible)
        : defaultEligible;

    final quorumPercentage = totalEligible > 0 ? (count / totalEligible) * 100 : 0.0;
    final quorumReached = quorumPercentage >= 50.0;

    return {
      'presentCount': count,
      'totalEligible': totalEligible,
      'absentCount': totalEligible > count ? totalEligible - count : 0,
      'quorumPercentage': quorumPercentage,
      'quorumReached': quorumReached,
    };
  }

  Future<List<Map<String, dynamic>>> getPendingAttendances() async {
    final db = await instance.database;
    return await db.query(
      'offline_attendance_events',
      where: 'sync_status = ? OR sync_status = ?',
      whereArgs: ['PENDIENTE', 'ERROR'],
      orderBy: 'scanned_at ASC',
    );
  }

  Future<int> updateAttendanceSyncStatus(String idempotencyKey, String status) async {
    final db = await instance.database;
    return await db.update(
      'offline_attendance_events',
      {'sync_status': status},
      where: 'idempotency_key = ?',
      whereArgs: [idempotencyKey],
    );
  }

  Future<int> getTotalPendingCount() async {
    final db = await instance.database;
    final pRes = await db.rawQuery(
      "SELECT COUNT(*) as c FROM offline_payments WHERE sync_status IN ('PENDIENTE', 'ERROR')",
    );
    final aRes = await db.rawQuery(
      "SELECT COUNT(*) as c FROM offline_attendance_events WHERE sync_status IN ('PENDIENTE', 'ERROR')",
    );

    final pCount = Sqflite.firstIntValue(pRes) ?? 0;
    final aCount = Sqflite.firstIntValue(aRes) ?? 0;
    return pCount + aCount;
  }
}
