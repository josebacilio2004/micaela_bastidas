import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/database/local_database.dart';
import '../../../core/sync/sync_service.dart';
import 'comprobante_screen.dart';

class HistorialCobrosScreen extends StatefulWidget {
  const HistorialCobrosScreen({super.key});

  @override
  State<HistorialCobrosScreen> createState() => _HistorialCobrosScreenState();
}

class _HistorialCobrosScreenState extends State<HistorialCobrosScreen> {
  List<Map<String, dynamic>> _payments = [];
  Map<String, dynamic> _stats = {
    'totalToday': 0.0,
    'countToday': 0,
    'pendingCount': 0,
    'syncedCount': 0,
  };
  String _selectedFilter = 'TODOS'; // 'TODOS' | 'PENDIENTE' | 'SINCRONIZADO'
  bool _isLoading = true;
  bool _isSyncing = false;

  @override
  void initState() {
    super.initState();
    _loadHistory();
  }

  Future<void> _loadHistory() async {
    setState(() => _isLoading = true);
    final payments = await LocalDatabase.instance.getAllLocalPayments(
      filter: _selectedFilter == 'TODOS' ? null : _selectedFilter,
    );
    final stats = await LocalDatabase.instance.getLocalPaymentsSummary();

    if (mounted) {
      setState(() {
        _payments = payments;
        _stats = stats;
        _isLoading = false;
      });
    }
  }

  Future<void> _triggerSync() async {
    if (_isSyncing) return;
    setState(() => _isSyncing = true);

    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Sincronizando cobros pendientes con la base central...')),
    );

    final res = await SyncService.instance.syncAll();
    await _loadHistory();

    if (mounted) {
      setState(() => _isSyncing = false);
      if (res['status'] == 'SUCCESS') {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            backgroundColor: AppTheme.primary,
            content: Text('Sincronizado: ${res['pushed']} cobros enviados al servidor.'),
          ),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            backgroundColor: Colors.amber,
            content: Text('Sin conexión al servidor. Los cobros permanecen seguros en SQLite.'),
          ),
        );
      }
    }
  }

  String _formatMoney(dynamic val) {
    try {
      final num n = (val is num) ? val : (num.tryParse(val?.toString() ?? '0') ?? 0);
      return 'S/ ${NumberFormat("#,##0.00", "es_PE").format(n)}';
    } catch (_) {
      return 'S/ $val';
    }
  }

  @override
  Widget build(BuildContext context) {
    final totalToday = _stats['totalToday'] ?? 0.0;
    final countToday = _stats['countToday'] ?? 0;
    final pendingCount = _stats['pendingCount'] ?? 0;
    final syncedCount = _stats['syncedCount'] ?? 0;

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text(
          'HISTORIAL DE COBROS LOCALES',
          style: TextStyle(fontSize: 14, fontWeight: FontWeight.w900),
        ),
        actions: [
          IconButton(
            icon: _isSyncing
                ? const SizedBox(width: 18, height: 18, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                : const Icon(Icons.sync),
            tooltip: 'Sincronizar Cobros',
            onPressed: _triggerSync,
          ),
        ],
      ),
      body: Column(
        children: [
          // 1. Resumen de Recaudación en este Celular
          Container(
            padding: const EdgeInsets.all(16),
            color: Colors.white,
            child: Column(
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: AppTheme.primary.withValues(alpha: 0.08),
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(color: AppTheme.primary.withValues(alpha: 0.2)),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('COBRADO HOY EN ESTE MÓVIL', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: AppTheme.primary)),
                            const SizedBox(height: 4),
                            Text(_formatMoney(totalToday), style: const TextStyle(fontSize: 20, fontWeight: FontWeight.w900, color: AppTheme.primary)),
                            Text('$countToday cobros realizados', style: const TextStyle(fontSize: 10, color: Colors.black54)),
                          ],
                        ),
                      ),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: pendingCount > 0 ? Colors.amber.shade50 : Colors.green.shade50,
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(
                            color: pendingCount > 0 ? Colors.amber.shade300 : Colors.green.shade200,
                          ),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              pendingCount > 0 ? 'PENDIENTES DE SUBIR' : 'SINCRONIZACIÓN',
                              style: TextStyle(
                                fontSize: 10,
                                fontWeight: FontWeight.bold,
                                color: pendingCount > 0 ? Colors.amber.shade900 : Colors.green.shade900,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              '$pendingCount offline',
                              style: TextStyle(
                                fontSize: 18,
                                fontWeight: FontWeight.w900,
                                color: pendingCount > 0 ? Colors.amber.shade900 : Colors.green.shade900,
                              ),
                            ),
                            Text('$syncedCount subidos al servidor', style: const TextStyle(fontSize: 10, color: Colors.black54)),
                          ],
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),

                // Filter chips
                Row(
                  children: [
                    _filterChip('TODOS', 'Todos (${_payments.length})'),
                    const SizedBox(width: 8),
                    _filterChip('PENDIENTE', 'Pendientes ($pendingCount)'),
                    const SizedBox(width: 8),
                    _filterChip('SINCRONIZADO', 'Sincronizados ($syncedCount)'),
                  ],
                ),
              ],
            ),
          ),
          const Divider(height: 1, color: Color(0xFFE2E8F0)),

          // 2. Payments List
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : _payments.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: const [
                            Icon(Icons.receipt_long_outlined, size: 54, color: Colors.black26),
                            SizedBox(height: 12),
                            Text(
                              'Sin cobros registrados en esta sección',
                              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Colors.black54),
                            ),
                            SizedBox(height: 4),
                            Text(
                              'Los cobros efectuados desde el celular se listarán aquí con su estado de sincronización.',
                              textAlign: TextAlign.center,
                              style: TextStyle(fontSize: 11, color: Colors.black38),
                            ),
                          ],
                        ),
                      )
                    : ListView.separated(
                        padding: const EdgeInsets.all(16),
                        itemCount: _payments.length,
                        separatorBuilder: (ctx, i) => const SizedBox(height: 10),
                        itemBuilder: (context, index) {
                          final p = _payments[index];
                          final idemp = (p['idempotency_key'] ?? '').toString();
                          final opNumber = (p['operation_number'] ?? 'REC-${idemp.length >= 8 ? idemp.substring(0, 8).toUpperCase() : idemp}').toString();
                          final merchantName = (p['merchant_name'] ?? 'Comerciante').toString();
                          final conceptName = (p['concept_name'] ?? 'Alcabala / Cuota').toString();
                          final amount = p['amount'] ?? 0.0;
                          final method = (p['payment_method'] ?? 'EFECTIVO').toString();
                          final status = (p['sync_status'] ?? 'PENDIENTE').toString();
                          final createdAt = (p['created_at'] ?? '').toString();

                          String formattedDate = createdAt;
                          try {
                            final dt = DateTime.parse(createdAt);
                            formattedDate = DateFormat('dd/MM/yyyy HH:mm').format(dt);
                          } catch (_) {}

                          final isSynced = status == 'SINCRONIZADO';

                          return InkWell(
                            onTap: () {
                              Navigator.push(
                                context,
                                MaterialPageRoute(
                                  builder: (_) => ComprobanteScreen(
                                    payment: {
                                      'operationNumber': opNumber,
                                      'merchant': {'lastName': merchantName, 'firstName': ''},
                                      'concept': {'name': conceptName},
                                      'amount': amount,
                                      'period': p['period'] ?? '',
                                      'paymentMethod': method,
                                      'paidAt': createdAt,
                                      'isOffline': !isSynced,
                                    },
                                  ),
                                ),
                              );
                            },
                            borderRadius: BorderRadius.circular(16),
                            child: Container(
                              padding: const EdgeInsets.all(14),
                              decoration: BoxDecoration(
                                color: Colors.white,
                                borderRadius: BorderRadius.circular(16),
                                border: Border.all(color: const Color(0xFFE2E8F0)),
                                boxShadow: [
                                  BoxShadow(color: Colors.black.withValues(alpha: 0.02), blurRadius: 4),
                                ],
                              ),
                              child: Column(
                                children: [
                                  Row(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Container(
                                        padding: const EdgeInsets.all(8),
                                        decoration: BoxDecoration(
                                          color: isSynced ? Colors.green.shade50 : Colors.amber.shade50,
                                          borderRadius: BorderRadius.circular(10),
                                        ),
                                        child: Icon(
                                          isSynced ? Icons.cloud_done : Icons.cloud_off,
                                          color: isSynced ? AppTheme.primary : Colors.amber.shade800,
                                          size: 20,
                                        ),
                                      ),
                                      const SizedBox(width: 12),
                                      Expanded(
                                        child: Column(
                                          crossAxisAlignment: CrossAxisAlignment.start,
                                          children: [
                                            Text(
                                              merchantName,
                                              style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Color(0xFF0F172A)),
                                            ),
                                            const SizedBox(height: 2),
                                            Text(
                                              '$conceptName • $formattedDate',
                                              style: const TextStyle(fontSize: 11, color: Colors.black54),
                                            ),
                                            const SizedBox(height: 4),
                                            Text(
                                              opNumber,
                                              style: const TextStyle(fontSize: 10, fontFamily: 'monospace', color: Colors.black38, fontWeight: FontWeight.bold),
                                            ),
                                          ],
                                        ),
                                      ),
                                      Column(
                                        crossAxisAlignment: CrossAxisAlignment.end,
                                        children: [
                                          Text(
                                            _formatMoney(amount),
                                            style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w900, color: AppTheme.primary),
                                          ),
                                          const SizedBox(height: 4),
                                          Container(
                                            padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                                            decoration: BoxDecoration(
                                              color: isSynced ? Colors.green.shade100 : Colors.amber.shade100,
                                              borderRadius: BorderRadius.circular(6),
                                            ),
                                            child: Text(
                                              isSynced ? 'EN SERVIDOR' : 'COLA LOCAL',
                                              style: TextStyle(
                                                fontSize: 9,
                                                fontWeight: FontWeight.w900,
                                                color: isSynced ? Colors.green.shade900 : Colors.amber.shade900,
                                              ),
                                            ),
                                          ),
                                        ],
                                      ),
                                    ],
                                  ),
                                ],
                              ),
                            ),
                          );
                        },
                      ),
          ),
        ],
      ),
    );
  }

  Widget _filterChip(String filter, String label) {
    final isSelected = _selectedFilter == filter;
    return ChoiceChip(
      label: Text(label, style: TextStyle(fontSize: 11, fontWeight: isSelected ? FontWeight.bold : FontWeight.normal)),
      selected: isSelected,
      selectedColor: AppTheme.primary.withValues(alpha: 0.15),
      labelStyle: TextStyle(color: isSelected ? AppTheme.primary : const Color(0xFF475569)),
      backgroundColor: const Color(0xFFF1F5F9),
      onSelected: (_) {
        setState(() => _selectedFilter = filter);
        _loadHistory();
      },
    );
  }
}
