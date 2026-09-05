import 'package:connectivity_plus/connectivity_plus.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:uuid/uuid.dart';
import '../network/api_client.dart';
import '../database/local_database.dart';

class SyncService {
  static final SyncService instance = SyncService._internal();
  factory SyncService() => instance;
  SyncService._internal();

  bool _isSyncing = false;
  bool get isSyncing => _isSyncing;

  Future<String> getOrCreateDeviceId() async {
    final prefs = await SharedPreferences.getInstance();
    var deviceId = prefs.getString('mobile_device_id');
    if (deviceId == null || deviceId.isEmpty) {
      deviceId = 'MB-DEV-${const Uuid().v4().substring(0, 8).toUpperCase()}';
      await prefs.setString('mobile_device_id', deviceId);
    }
    return deviceId;
  }

  Future<bool> hasInternetConnection() async {
    final connectivity = await Connectivity().checkConnectivity();
    return !connectivity.contains(ConnectivityResult.none);
  }

  Future<Map<String, dynamic>> syncAll() async {
    if (_isSyncing) {
      return {'status': 'IN_PROGRESS', 'pushed': 0, 'pulled': 0};
    }

    final hasNet = await hasInternetConnection();
    if (!hasNet) {
      return {'status': 'OFFLINE', 'pushed': 0, 'pulled': 0};
    }

    _isSyncing = true;
    int totalPushed = 0;
    int totalPulled = 0;

    try {
      final pushResult = await pushPendingOperations();
      totalPushed = pushResult['synced'] ?? 0;

      final pullResult = await pullIncrementalData();
      totalPulled = pullResult['totalItems'] ?? 0;

      return {
        'status': 'SUCCESS',
        'pushed': totalPushed,
        'pulled': totalPulled,
        'serverCursor': pullResult['cursor'],
      };
    } catch (e) {
      return {
        'status': 'ERROR',
        'error': e.toString(),
        'pushed': totalPushed,
        'pulled': totalPulled,
      };
    } finally {
      _isSyncing = false;
    }
  }

  Future<Map<String, int>> pushPendingOperations() async {
    final pendingPayments = await LocalDatabase.instance.getPendingPayments();
    final pendingAttendances = await LocalDatabase.instance.getPendingAttendances();

    if (pendingPayments.isEmpty && pendingAttendances.isEmpty) {
      return {'synced': 0, 'errors': 0};
    }

    final deviceId = await getOrCreateDeviceId();
    final operations = <Map<String, dynamic>>[];

    // 1. Convert payments to sync operations
    for (var p in pendingPayments) {
      final idemp = p['idempotency_key'] as String;
      operations.add({
        'operationId': idemp,
        'idempotencyKey': idemp,
        'entity': 'payment',
        'action': 'CREATE',
        'payload': {
          'merchantId': p['merchant_id'],
          'conceptId': p['concept_id'],
          'obligationId': p['obligation_id'],
          'amount': p['amount'],
          'period': p['period'],
          'paymentMethod': p['payment_method'],
          'createdAt': p['created_at'],
        },
      });
    }

    // 2. Convert attendances to sync operations
    for (var a in pendingAttendances) {
      final idemp = a['idempotency_key'] as String;
      operations.add({
        'operationId': idemp,
        'idempotencyKey': idemp,
        'entity': 'attendance',
        'action': 'CREATE',
        'payload': {
          'meetingId': a['meeting_id'],
          'merchantId': a['merchant_id'],
          'dni': a['merchant_dni'],
          'scannedAt': a['scanned_at'],
        },
      });
    }

    int synced = 0;
    int errors = 0;

    try {
      final res = await ApiClient().dio.post(
        '/sync/push',
        data: {
          'deviceId': deviceId,
          'operations': operations,
        },
      );

      final results = res.data['results'] as List? ?? [];
      for (var r in results) {
        final key = r['idempotencyKey'] as String;
        final status = r['status'] as String;

        if (status == 'SYNCED' || status == 'CONFLICT') {
          await LocalDatabase.instance.updatePaymentSyncStatus(key, 'SINCRONIZADO');
          await LocalDatabase.instance.updateAttendanceSyncStatus(key, 'SINCRONIZADO');
          synced++;
        } else {
          await LocalDatabase.instance.updatePaymentSyncStatus(key, 'ERROR');
          await LocalDatabase.instance.updateAttendanceSyncStatus(key, 'ERROR');
          errors++;
        }
      }
    } catch (e) {
      // Fallback single-operation processing if batch fails
      for (var op in operations) {
        final key = op['idempotencyKey'] as String;
        await LocalDatabase.instance.updatePaymentSyncStatus(key, 'ERROR');
        await LocalDatabase.instance.updateAttendanceSyncStatus(key, 'ERROR');
      }
      errors = operations.length;
    }

    return {'synced': synced, 'errors': errors};
  }

  Future<Map<String, dynamic>> pullIncrementalData() async {
    final prefs = await SharedPreferences.getInstance();
    final lastCursor = prefs.getString('last_sync_cursor');

    final deviceId = await getOrCreateDeviceId();
    final url = lastCursor != null && lastCursor.isNotEmpty
        ? '/sync/pull?deviceId=$deviceId&since=${Uri.encodeComponent(lastCursor)}'
        : '/sync/pull?deviceId=$deviceId';

    try {
      final res = await ApiClient().dio.get(url);
      final data = res.data;

      // Cache merchants
      final merchants = data['merchants'] as List? ?? [];
      if (merchants.isNotEmpty) {
        await LocalDatabase.instance.cacheMerchants(merchants);
      }

      // Cache meetings
      final meetings = data['meetings'] as List? ?? [];
      if (meetings.isNotEmpty) {
        await LocalDatabase.instance.cacheMeetings(meetings);
      }

      final newCursor = data['serverCursor'] as String?;
      if (newCursor != null) {
        await prefs.setString('last_sync_cursor', newCursor);
      }

      return {
        'totalItems': merchants.length + meetings.length,
        'cursor': newCursor,
      };
    } catch (e) {
      return {'totalItems': 0, 'error': e.toString()};
    }
  }

  Future<int> getPendingCount() async {
    return await LocalDatabase.instance.getTotalPendingCount();
  }
}

