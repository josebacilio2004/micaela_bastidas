import 'package:dio/dio.dart';
import 'package:connectivity_plus/connectivity_plus.dart';
import '../network/api_client.dart';
import '../database/local_database.dart';

class SyncService {
  static final SyncService instance = SyncService._internal();
  factory SyncService() => instance;
  SyncService._internal();

  bool _isSyncing = false;

  Future<int> syncPendingPayments() async {
    if (_isSyncing) return 0;

    // Check connectivity
    final connectivity = await Connectivity().checkConnectivity();
    if (connectivity.contains(ConnectivityResult.none)) {
      return 0;
    }

    _isSyncing = true;
    int syncedCount = 0;

    try {
      final pending = await LocalDatabase.instance.getPendingPayments();
      final dio = ApiClient().dio;

      for (var row in pending) {
        final idempotencyKey = row['idempotency_key'] as String;
        try {
          await LocalDatabase.instance.updatePaymentSyncStatus(idempotencyKey, 'SINCRONIZANDO');

          await dio.post(
            '/payments',
            data: {
              'merchantId': row['merchant_id'],
              'conceptId': row['concept_id'],
              'obligationId': row['obligation_id'],
              'amount': row['amount'],
              'period': row['period'],
              'paymentMethod': row['payment_method'],
              'idempotencyKey': idempotencyKey,
            },
            options: Options(headers: {'Idempotency-Key': idempotencyKey}),
          );

          await LocalDatabase.instance.updatePaymentSyncStatus(idempotencyKey, 'SINCRONIZADO');
          syncedCount++;
        } catch (e) {
          await LocalDatabase.instance.updatePaymentSyncStatus(idempotencyKey, 'ERROR');
        }
      }
    } finally {
      _isSyncing = false;
    }

    return syncedCount;
  }
}
