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
      version: 5,
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

    // 2. Padrón de comerciantes en caché local con código QR y foto
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
        qr_code TEXT UNIQUE,
        photo_url TEXT
      )
    ''');

    // 3. Asambleas / Reuniones en caché
    await db.execute('''
      CREATE TABLE IF NOT EXISTS cached_meetings (
        id TEXT PRIMARY KEY,
        title TEXT,
        description TEXT,
        scheduled_at TEXT,
        time TEXT,
        location TEXT,
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

    // 6. Obligaciones / Cuotas pendientes en caché local
    await db.execute('''
      CREATE TABLE IF NOT EXISTS cached_obligations (
        id TEXT PRIMARY KEY,
        merchant_id TEXT,
        concept_id TEXT,
        concept_code TEXT,
        concept_name TEXT,
        period TEXT,
        amount REAL,
        status TEXT,
        due_date TEXT
      )
    ''');
  }

  Future _upgradeDB(Database db, int oldVersion, int newVersion) async {
    if (oldVersion < 2) {
      try {
        await db.execute('ALTER TABLE cached_merchants ADD COLUMN qr_code TEXT');
      } catch (_) {}
    }
    if (oldVersion < 3) {
      try {
        await db.execute('ALTER TABLE cached_meetings ADD COLUMN time TEXT');
      } catch (_) {}
      try {
        await db.execute('ALTER TABLE cached_meetings ADD COLUMN location TEXT');
      } catch (_) {}
    }
    if (oldVersion < 4) {
      try {
        await db.execute('''
          CREATE TABLE IF NOT EXISTS cached_obligations (
            id TEXT PRIMARY KEY,
            merchant_id TEXT,
            concept_id TEXT,
            concept_code TEXT,
            concept_name TEXT,
            period TEXT,
            amount REAL,
            status TEXT,
            due_date TEXT
          )
        ''');
      } catch (_) {}
    }
    if (oldVersion < 5) {
      try {
        await db.execute('ALTER TABLE cached_merchants ADD COLUMN photo_url TEXT');
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
      final photo = (m['photoUrl'] ?? m['photo_url'] ?? '').toString();
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
          'photo_url': photo,
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
        'photoUrl': m['photo_url'] ?? '',
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

  Future<int> insertOfflinePayment(Map<String, dynamic> row) async {
    final db = await instance.database;
    return await db.insert('offline_payments', row, conflictAlgorithm: ConflictAlgorithm.replace);
  }

  Future<void> insertMerchantLocal(Map<String, dynamic> m) async {
    final db = await instance.database;
    final dni = (m['dni'] ?? '').toString();
    final qr = (m['qrCode'] ?? 'MB-QR-$dni').toString();
    await db.insert(
      'cached_merchants',
      {
        'id': m['id'],
        'internal_code': m['internalCode'] ?? '',
        'first_name': m['firstName'] ?? '',
        'last_name': m['lastName'] ?? '',
        'dni': dni,
        'type_name': m['merchantType']?['name'] ?? m['typeName'] ?? 'Socio',
        'stall_code': m['stall']?['code'] ?? m['stallCode'] ?? '',
        'business_category': m['businessCategory'] ?? '',
        'qr_code': qr,
      },
      conflictAlgorithm: ConflictAlgorithm.replace,
    );
  }

  Future<List<Map<String, dynamic>>> getAllCachedMerchants({String? typeFilter, String? search}) async {
    final db = await instance.database;
    String whereClause = '1=1';
    List<dynamic> whereArgs = [];

    if (typeFilter != null && typeFilter.isNotEmpty && typeFilter != 'ALL') {
      if (typeFilter == 'SOCIO') {
        whereClause += ' AND (type_name LIKE ? OR type_name LIKE ?)';
        whereArgs.addAll(['%Socio%', '%Titular%']);
      } else if (typeFilter == 'INQUILINO') {
        whereClause += ' AND (type_name LIKE ?)';
        whereArgs.add('%Inquilino%');
      } else if (typeFilter == 'AMBULANTE_FIJO') {
        whereClause += ' AND (type_name LIKE ?)';
        whereArgs.add('%Fijo%');
      } else if (typeFilter == 'AMBULANTE_TEMPORAL') {
        whereClause += ' AND (type_name LIKE ?)';
        whereArgs.add('%Temporal%');
      }
    }

    if (search != null && search.trim().isNotEmpty) {
      final s = '%${search.trim()}%';
      whereClause += ' AND (dni LIKE ? OR first_name LIKE ? OR last_name LIKE ? OR stall_code LIKE ? OR internal_code LIKE ? OR qr_code LIKE ?)';
      whereArgs.addAll([s, s, s, s, s, s]);
    }

    return await db.query(
      'cached_merchants',
      where: whereClause,
      whereArgs: whereArgs.isNotEmpty ? whereArgs : null,
      orderBy: 'last_name ASC, first_name ASC',
      limit: 100,
    );
  }

  Future<List<Map<String, dynamic>>> getAllLocalPayments({String? filter}) async {
    final db = await instance.database;
    String? whereClause;
    List<dynamic>? whereArgs;

    if (filter == 'PENDIENTE') {
      whereClause = 'sync_status = ? OR sync_status = ?';
      whereArgs = ['PENDIENTE', 'ERROR'];
    } else if (filter == 'SINCRONIZADO') {
      whereClause = 'sync_status = ?';
      whereArgs = ['SINCRONIZADO'];
    }

    return await db.query(
      'offline_payments',
      where: whereClause,
      whereArgs: whereArgs,
      orderBy: 'created_at DESC',
      limit: 150,
    );
  }

  Future<Map<String, dynamic>> getLocalPaymentsSummary() async {
    final db = await instance.database;
    final now = DateTime.now();
    final todayPrefix = '${now.year}-${now.month.toString().padLeft(2, '0')}-${now.day.toString().padLeft(2, '0')}';

    final totalTodayRes = await db.rawQuery(
      "SELECT SUM(amount) as total, COUNT(*) as count FROM offline_payments WHERE created_at LIKE '$todayPrefix%'",
    );
    final pendingRes = await db.rawQuery(
      "SELECT COUNT(*) as pending FROM offline_payments WHERE sync_status IN ('PENDIENTE', 'ERROR')",
    );
    final syncedRes = await db.rawQuery(
      "SELECT COUNT(*) as synced FROM offline_payments WHERE sync_status = 'SINCRONIZADO'",
    );

    final totalToday = (totalTodayRes.first['total'] as num?)?.toDouble() ?? 0.0;
    final countToday = (totalTodayRes.first['count'] as num?)?.toInt() ?? 0;
    final pendingCount = (pendingRes.first['pending'] as num?)?.toInt() ?? 0;
    final syncedCount = (syncedRes.first['synced'] as num?)?.toInt() ?? 0;

    return {
      'totalToday': totalToday,
      'countToday': countToday,
      'pendingCount': pendingCount,
      'syncedCount': syncedCount,
    };
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
      final scheduledAt = (m['date'] ?? m['scheduledAt'] ?? m['scheduled_at'] ?? '').toString();
      final timeStr = (m['time'] ?? '').toString();
      final locStr = (m['location'] ?? '').toString();
      batch.insert(
        'cached_meetings',
        {
          'id': m['id'].toString(),
          'title': m['title'] ?? '',
          'description': m['description'] ?? '',
          'scheduled_at': scheduledAt,
          'time': timeStr,
          'location': locStr,
          'status': m['status'] ?? 'PROGRAMADA',
          'total_eligible': m['totalEligible'] ?? m['total_eligible'] ?? 350,
        },
        conflictAlgorithm: ConflictAlgorithm.replace,
      );
    }
    await batch.commit(noResult: true);
  }

  Future<void> cacheAttendances(String meetingId, List<dynamic> attendances) async {
    final db = await instance.database;
    final batch = db.batch();
    for (var a in attendances) {
      final merchantId = a['merchantId'] ?? a['merchant']?['id'] ?? a['id'];
      final dni = a['dni'] ?? a['merchant']?['dni'] ?? '';
      final scannedAt = a['scannedAt'] ?? a['scanned_at'] ?? DateTime.now().toIso8601String();
      if (merchantId != null) {
        batch.insert(
          'cached_attendances',
          {
            'meeting_id': meetingId,
            'merchant_id': merchantId.toString(),
            'dni': dni.toString(),
            'scanned_at': scannedAt.toString(),
          },
          conflictAlgorithm: ConflictAlgorithm.replace,
        );
      }
    }
    await batch.commit(noResult: true);
  }

  Future<Map<String, List<Map<String, dynamic>>>> getMeetingAttendanceLists(String meetingId) async {
    final db = await instance.database;

    // 1. Presentes en la reunión
    final attendedRaw = await db.rawQuery('''
      SELECT 
        ca.merchant_id as id,
        ca.scanned_at,
        ca.dni,
        COALESCE(cm.first_name, '') as first_name,
        COALESCE(cm.last_name, '') as last_name,
        COALESCE(cm.stall_code, 'Sin puesto') as stall_code,
        COALESCE(cm.type_name, 'Socio') as type_name,
        COALESCE(cm.business_category, '') as business_category
      FROM cached_attendances ca
      LEFT JOIN cached_merchants cm ON ca.merchant_id = cm.id
      WHERE ca.meeting_id = ?
      ORDER BY ca.scanned_at DESC
    ''', [meetingId]);

    // 2. Ausentes (Socios activos que aún no están registrados en la reunión)
    final absentRaw = await db.rawQuery('''
      SELECT 
        cm.id,
        cm.first_name,
        cm.last_name,
        cm.dni,
        COALESCE(cm.stall_code, 'Sin puesto') as stall_code,
        cm.type_name,
        cm.business_category,
        cm.qr_code
      FROM cached_merchants cm
      WHERE (cm.type_name LIKE '%Socio%' OR cm.type_name LIKE '%Titular%')
        AND cm.id NOT IN (
          SELECT merchant_id FROM cached_attendances WHERE meeting_id = ?
        )
      ORDER BY cm.last_name ASC, cm.first_name ASC
    ''', [meetingId]);

    return {
      'attended': attendedRaw.map((e) => Map<String, dynamic>.from(e)).toList(),
      'absent': absentRaw.map((e) => Map<String, dynamic>.from(e)).toList(),
    };
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

  // --- OBLIGACIONES & CUOTAS PROGRAMADAS ---
  Future<void> cacheObligations(List<dynamic> obligations) async {
    final db = await instance.database;
    final batch = db.batch();
    for (var o in obligations) {
      final id = o['id']?.toString() ?? '';
      if (id.isEmpty) continue;
      batch.insert(
        'cached_obligations',
        {
          'id': id,
          'merchant_id': (o['merchantId'] ?? o['merchant_id'] ?? '').toString(),
          'concept_id': (o['conceptId'] ?? o['concept_id'] ?? o['concept']?['id'] ?? '').toString(),
          'concept_code': (o['concept']?['code'] ?? o['concept_code'] ?? '').toString(),
          'concept_name': (o['concept']?['name'] ?? o['concept_name'] ?? 'Cuota').toString(),
          'period': (o['period'] ?? '').toString(),
          'amount': (num.tryParse(o['amount']?.toString() ?? '0') ?? 0.0).toDouble(),
          'status': (o['status'] ?? 'PENDIENTE').toString(),
          'due_date': (o['dueDate'] ?? o['due_date'] ?? '').toString(),
        },
        conflictAlgorithm: ConflictAlgorithm.replace,
      );
    }
    await batch.commit(noResult: true);
  }

  Future<List<Map<String, dynamic>>> getMerchantPendingObligations(String merchantId) async {
    final db = await instance.database;
    final rows = await db.query(
      'cached_obligations',
      where: 'merchant_id = ? AND status = ?',
      whereArgs: [merchantId, 'PENDIENTE'],
      orderBy: 'due_date ASC, period ASC',
    );
    return rows.map((r) => {
      'id': r['id'],
      'merchantId': r['merchant_id'],
      'conceptId': r['concept_id'],
      'concept': {
        'id': r['concept_id'],
        'code': r['concept_code'],
        'name': r['concept_name'],
      },
      'period': r['period'],
      'amount': r['amount'],
      'status': r['status'],
      'dueDate': r['due_date'],
    }).toList();
  }

  Future<void> markObligationAsPaidLocal(String obligationId) async {
    final db = await instance.database;
    await db.update(
      'cached_obligations',
      {'status': 'PAGADO'},
      where: 'id = ?',
      whereArgs: [obligationId],
    );
  }

  Future<Set<String>> getOfflinePaidObligationIds(String merchantId) async {
    final db = await instance.database;
    final rows = await db.query(
      'offline_payments',
      columns: ['obligation_id'],
      where: 'merchant_id = ? AND obligation_id IS NOT NULL',
      whereArgs: [merchantId],
    );
    return rows
        .map((r) => r['obligation_id']?.toString() ?? '')
        .where((id) => id.isNotEmpty)
        .toSet();
  }

  Future<void> clearAllOfflinePayments() async {
    final db = await instance.database;
    await db.delete('offline_payments');
    await db.delete('cached_obligations');
  }
}
