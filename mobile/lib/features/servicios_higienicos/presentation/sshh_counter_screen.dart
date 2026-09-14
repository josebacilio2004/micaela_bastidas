import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
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

  Future<void> _showCloseTurnDialog() async {
    final prefs = await SharedPreferences.getInstance();
    final lastTicket = prefs.getInt('sshh_last_ticket_number') ?? 1000;
    final totalUsos = _urinalCount + _toiletCount;
    final startTicket = lastTicket + 1;
    final endTicket = totalUsos > 0 ? (lastTicket + totalUsos) : startTicket;

    final initTicketCtrl = TextEditingController(text: startTicket.toString());
    final finalTicketCtrl = TextEditingController(text: endTicket.toString());
    final discReasonCtrl = TextEditingController();

    if (!mounted) return;

    showDialog(
      context: context,
      builder: (context) {
        return AlertDialog(
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
          title: Row(
            children: [
              Container(
                padding: const EdgeInsets.all(8),
                decoration: BoxDecoration(color: Colors.amber.shade100, borderRadius: BorderRadius.circular(10)),
                child: const Icon(Icons.receipt_long, color: Color(0xFFD97706), size: 22),
              ),
              const SizedBox(width: 10),
              const Expanded(
                child: Text('Cierre de Turno SSHH', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 16)),
              ),
            ],
          ),
          content: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  width: double.infinity,
                  padding: const EdgeInsets.all(12),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF1F5F9),
                    borderRadius: BorderRadius.circular(12),
                  ),
                  child: Column(
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text('Total Recaudado:', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: Colors.black54)),
                          Text('S/ ${_total.toStringAsFixed(2)}', style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 18, color: AppTheme.primaryDark)),
                        ],
                      ),
                      const SizedBox(height: 4),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text('Total Usos Registrados:', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 11, color: Colors.black54)),
                          Text('$totalUsos boletos', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: Colors.black87)),
                        ],
                      ),
                      const SizedBox(height: 2),
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text('Desglose:', style: TextStyle(fontSize: 10, color: Colors.black45)),
                          Text('$_urinalCount micc. + $_toiletCount inod.', style: const TextStyle(fontSize: 10, color: Colors.black54)),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 14),
                const Text(
                  'RANGO DE BOLETOS CORRELATIVO:',
                  style: TextStyle(fontSize: 11, fontWeight: FontWeight.w900, color: Colors.black54, letterSpacing: 0.5),
                ),
                const SizedBox(height: 8),
                Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: initTicketCtrl,
                        keyboardType: TextInputType.number,
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                        decoration: InputDecoration(
                          labelText: 'Ticket Inicial',
                          labelStyle: const TextStyle(fontSize: 12),
                          prefixIcon: const Icon(Icons.confirmation_number_outlined, size: 18),
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                          contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                        ),
                      ),
                    ),
                    const Padding(
                      padding: EdgeInsets.symmetric(horizontal: 6),
                      child: Text('al', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.black45)),
                    ),
                    Expanded(
                      child: TextField(
                        controller: finalTicketCtrl,
                        keyboardType: TextInputType.number,
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
                        decoration: InputDecoration(
                          labelText: 'Ticket Final',
                          labelStyle: const TextStyle(fontSize: 12),
                          prefixIcon: const Icon(Icons.confirmation_number, size: 18),
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                          contentPadding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
                        ),
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 12),
                TextField(
                  controller: discReasonCtrl,
                  decoration: InputDecoration(
                    labelText: 'Observación o Justificación (opcional)',
                    labelStyle: const TextStyle(fontSize: 12),
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(10)),
                    contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                  ),
                ),
              ],
            ),
          ),
          actions: [
            TextButton(
              onPressed: () => Navigator.pop(context),
              child: const Text('Cancelar', style: TextStyle(color: Colors.black54, fontWeight: FontWeight.bold)),
            ),
            ElevatedButton(
              style: ElevatedButton.styleFrom(
                backgroundColor: const Color(0xFFD97706),
                foregroundColor: Colors.white,
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
              ),
              onPressed: () async {
                final start = int.tryParse(initTicketCtrl.text) ?? startTicket;
                final end = int.tryParse(finalTicketCtrl.text) ?? endTicket;

                // Guardar correlativo final para el siguiente turno
                await prefs.setInt('sshh_last_ticket_number', end);

                final targetId = (_sessionId != null && !_sessionId!.startsWith('offline'))
                    ? _sessionId!
                    : 'active';

                try {
                  await ApiClient().dio.post(
                    '/sanitary-services/$targetId/close',
                    data: {
                      'initialTicketNumber': start,
                      'finalTicketNumber': end,
                      'declaredTicketCount': totalUsos,
                      'urinalCount': _urinalCount,
                      'toiletCount': _toiletCount,
                      'discrepancyReason': discReasonCtrl.text.isNotEmpty ? discReasonCtrl.text : null,
                    },
                  );

                  if (mounted) {
                    Navigator.pop(context); // cerrar diálogo
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text('✓ Turno cerrado y sincronizado ($totalUsos tickets, S/ ${_total.toStringAsFixed(2)})'),
                        backgroundColor: const Color(0xFF047857),
                        duration: const Duration(seconds: 4),
                      ),
                    );
                    Navigator.pop(context); // volver a dashboard
                  }
                } catch (err) {
                  if (mounted) {
                    Navigator.pop(context); // cerrar diálogo
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text('Turno guardado (#$start a #$end). Red no disponible: $err'),
                        backgroundColor: const Color(0xFFD97706),
                        duration: const Duration(seconds: 4),
                      ),
                    );
                    Navigator.pop(context); // volver a dashboard
                  }
                }
              },
              child: const Text('Confirmar y Cerrar Turno', style: TextStyle(fontWeight: FontWeight.bold)),
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
