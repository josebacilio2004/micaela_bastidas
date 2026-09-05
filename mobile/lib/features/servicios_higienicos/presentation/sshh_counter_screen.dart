import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import '../../../core/network/api_client.dart';
import '../../../core/theme/app_theme.dart';

class SshhCounterScreen extends StatefulWidget {
  const SshhCounterScreen({super.key});

  @override
  State<SshhCounterScreen> createState() => _SshhCounterScreenState();
}

class _SshhCounterScreenState extends State<SshhCounterScreen> {
  int _urinalCount = 0;
  int _toiletCount = 0;
  double _total = 0.0;
  String? _sessionId;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _initSession();
  }

  Future<void> _initSession() async {
    setState(() => _isLoading = true);
    try {
      Response? res;
      try {
        res = await ApiClient().dio.get('/sanitary-services/active');
      } catch (_) {}
      if (res == null || res.data == null) {
        res = await ApiClient().dio.post('/sanitary-services/start', data: {});
      }
      final data = res.data;
      setState(() {
        _sessionId = data['id'];
        _urinalCount = data['urinalCount'] ?? 0;
        _toiletCount = data['toiletCount'] ?? 0;
        _recalculate();
      });
    } catch (e) {
      _sessionId = 'offline-sshh-session';
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  void _recalculate() {
    _total = (_urinalCount * 0.50) + (_toiletCount * 1.00);
  }

  Future<void> _updateCount({int urinalDelta = 0, int toiletDelta = 0}) async {
    setState(() {
      _urinalCount = (_urinalCount + urinalDelta).clamp(0, 9999);
      _toiletCount = (_toiletCount + toiletDelta).clamp(0, 9999);
      _recalculate();
    });

    if (_sessionId != null && !_sessionId!.startsWith('offline')) {
      try {
        await ApiClient().dio.post(
          '/sanitary-services/$_sessionId/counts',
          data: {
            'exactUrinals': _urinalCount,
            'exactToilets': _toiletCount,
          },
        );
      } catch (_) {}
    }
  }

  void _showCloseTurnDialog() {
    final initTicketCtrl = TextEditingController();
    final finalTicketCtrl = TextEditingController();
    final discReasonCtrl = TextEditingController();

    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          title: const Text('Cierre de Turno SSHH', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text('Total: S/ ${_total.toStringAsFixed(2)}', style: const TextStyle(fontWeight: FontWeight.bold, color: AppTheme.primary)),
                const SizedBox(height: 12),
                TextField(controller: initTicketCtrl, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Ticket Inicial')),
                const SizedBox(height: 8),
                TextField(controller: finalTicketCtrl, keyboardType: TextInputType.number, decoration: const InputDecoration(labelText: 'Ticket Final')),
                const SizedBox(height: 8),
                TextField(controller: discReasonCtrl, decoration: const InputDecoration(labelText: 'Motivo si hay diferencia')),
              ],
            ),
          ),
          actions: [
            TextButton(onPressed: () => Navigator.pop(context), child: const Text('Cancelar')),
            ElevatedButton(
              onPressed: () async {
                Navigator.pop(context);
                if (_sessionId != null && !_sessionId!.startsWith('offline')) {
                  try {
                    await ApiClient().dio.post(
                      '/sanitary-services/$_sessionId/close',
                      data: {
                        'initialTicketNumber': int.tryParse(initTicketCtrl.text),
                        'finalTicketNumber': int.tryParse(finalTicketCtrl.text),
                        'declaredTicketCount': _toiletCount + _urinalCount,
                        'discrepancyReason': discReasonCtrl.text.isNotEmpty ? discReasonCtrl.text : null,
                      },
                    );
                  } catch (_) {}
                }
                if (mounted) Navigator.pop(context);
              },
              child: const Text('Cerrar Turno'),
            ),
          ],
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('SERVICIOS HIGIÉNICOS'),
        actions: [
          IconButton(icon: const Icon(Icons.check_box_outlined), tooltip: 'Cerrar Turno', onPressed: _showCloseTurnDialog),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : Padding(
              padding: const EdgeInsets.all(20),
              child: Column(
                children: [
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.symmetric(vertical: 20),
                    decoration: BoxDecoration(color: AppTheme.secondary, borderRadius: BorderRadius.circular(20)),
                    child: Column(
                      children: [
                        const Text('TOTAL RECAUDADO EN EL TURNO', style: TextStyle(color: Colors.white70, fontSize: 11, fontWeight: FontWeight.bold)),
                        const SizedBox(height: 6),
                        Text('S/ ${_total.toStringAsFixed(2)}', style: const TextStyle(color: Colors.white, fontSize: 36, fontWeight: FontWeight.w900)),
                      ],
                    ),
                  ),
                  const SizedBox(height: 24),
                  Expanded(
                    child: _counterCard(
                      title: 'MICCIONARIO',
                      price: 'S/ 0.50',
                      count: _urinalCount,
                      subtotal: (_urinalCount * 0.50).toStringAsFixed(2),
                      color: const Color(0xFF0284C7),
                      onDecrement: () => _updateCount(urinalDelta: -1),
                      onIncrement: () => _updateCount(urinalDelta: 1),
                    ),
                  ),
                  const SizedBox(height: 16),
                  Expanded(
                    child: _counterCard(
                      title: 'RETRETE / INODORO',
                      price: 'S/ 1.00',
                      count: _toiletCount,
                      subtotal: (_toiletCount * 1.00).toStringAsFixed(2),
                      color: AppTheme.primary,
                      onDecrement: () => _updateCount(toiletDelta: -1),
                      onIncrement: () => _updateCount(toiletDelta: 1),
                    ),
                  ),
                  const SizedBox(height: 16),
                  ElevatedButton(
                    onPressed: _showCloseTurnDialog,
                    style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFFD97706), padding: const EdgeInsets.symmetric(vertical: 16)),
                    child: const Text('REGISTRAR Y CERRAR TURNO'),
                  ),
                ],
              ),
            ),
    );
  }

  Widget _counterCard({
    required String title,
    required String price,
    required int count,
    required String subtotal,
    required Color color,
    required VoidCallback onDecrement,
    required VoidCallback onIncrement,
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: color.withOpacity(0.3), width: 1.5),
      ),
      child: Column(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(title, style: TextStyle(fontWeight: FontWeight.w900, color: color, fontSize: 15)),
              Text('$price c/u', style: TextStyle(color: Colors.grey.shade600, fontSize: 12, fontWeight: FontWeight.bold)),
            ],
          ),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              IconButton.filled(onPressed: onDecrement, icon: const Icon(Icons.remove, size: 28), style: IconButton.styleFrom(backgroundColor: Colors.grey.shade200, foregroundColor: Colors.black87)),
              Padding(padding: const EdgeInsets.symmetric(horizontal: 28), child: Text('$count', style: const TextStyle(fontSize: 40, fontWeight: FontWeight.w900))),
              IconButton.filled(onPressed: onIncrement, icon: const Icon(Icons.add, size: 28), style: IconButton.styleFrom(backgroundColor: color, foregroundColor: Colors.white)),
            ],
          ),
          Text('Subtotal: S/ $subtotal', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: color)),
        ],
      ),
    );
  }
}
