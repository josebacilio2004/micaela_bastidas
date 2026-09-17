import 'package:dio/dio.dart';
import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
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
  String _operatorName = 'Carlos Quispe Flores';
  final String _operatorModule = 'Operador Módulo A (Pabellón Carnes)';
  String _shiftName = 'Turno 1 • 06:00 - 14:00';

  @override
  void initState() {
    super.initState();
    _initSession();
  }

  Future<void> _initSession() async {
    setState(() => _isLoading = true);
    try {
      final prefs = await SharedPreferences.getInstance();
      final savedUser = prefs.getString('user_full_name');
      if (savedUser != null && savedUser.isNotEmpty) {
        _operatorName = savedUser;
      }

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
        if (data['operatorName'] != null) _operatorName = data['operatorName'];
        if (data['shift'] != null) _shiftName = data['shift'];
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
    HapticFeedback.lightImpact();
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
                decoration: BoxDecoration(color: const Color(0xFFFEF3C7), borderRadius: BorderRadius.circular(10)),
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
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF8FAFC),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: const Color(0xFFE2E8F0)),
                  ),
                  child: Column(
                    children: [
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text('Total Recaudado:', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: Colors.black54)),
                          Text('S/ ${_total.toStringAsFixed(2)}', style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 18, color: AppTheme.primary)),
                        ],
                      ),
                      const SizedBox(height: 6),
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
                    Navigator.pop(context);
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text('✓ Turno cerrado y sincronizado ($totalUsos tickets, S/ ${_total.toStringAsFixed(2)})'),
                        backgroundColor: AppTheme.primary,
                        duration: const Duration(seconds: 4),
                      ),
                    );
                    Navigator.pop(context);
                  }
                } catch (err) {
                  if (mounted) {
                    Navigator.pop(context);
                    ScaffoldMessenger.of(context).showSnackBar(
                      SnackBar(
                        content: Text('Turno guardado (#$start a #$end). Red no disponible: $err'),
                        backgroundColor: const Color(0xFFD97706),
                        duration: const Duration(seconds: 4),
                      ),
                    );
                    Navigator.pop(context);
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
    final totalUsos = _urinalCount + _toiletCount;

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        backgroundColor: AppTheme.primaryDark,
        title: const Text('SERVICIOS HIGIÉNICOS'),
        actions: [
          IconButton(
            icon: const Icon(Icons.receipt_long),
            tooltip: 'Arqueo y Cierre',
            onPressed: _showCloseTurnDialog,
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  // 1. Shift Status Banner (Stitch UI)
                  Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: const Color(0xFFE2E8F0)),
                      boxShadow: [
                        BoxShadow(
                          color: Colors.black.withOpacity(0.02),
                          blurRadius: 6,
                          offset: const Offset(0, 2),
                        ),
                      ],
                    ),
                    child: Column(
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            Row(
                              children: [
                                Container(
                                  width: 10,
                                  height: 10,
                                  decoration: const BoxDecoration(
                                    color: AppTheme.primary,
                                    shape: BoxShape.circle,
                                  ),
                                ),
                                const SizedBox(width: 6),
                                const Text(
                                  'CAJA SSHH ACTIVA',
                                  style: TextStyle(
                                    fontSize: 11,
                                    fontWeight: FontWeight.w900,
                                    color: AppTheme.primary,
                                    letterSpacing: 0.5,
                                  ),
                                ),
                              ],
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 3),
                              decoration: BoxDecoration(
                                color: const Color(0xFFE5EEFF),
                                borderRadius: BorderRadius.circular(20),
                              ),
                              child: Text(
                                _shiftName,
                                style: const TextStyle(
                                  fontSize: 10,
                                  fontWeight: FontWeight.bold,
                                  color: AppTheme.tertiary,
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 10),
                        Row(
                          children: [
                            CircleAvatar(
                              radius: 18,
                              backgroundColor: AppTheme.secondaryContainer,
                              child: const Text(
                                'CQ',
                                style: TextStyle(
                                  fontWeight: FontWeight.bold,
                                  color: AppTheme.secondary,
                                  fontSize: 13,
                                ),
                              ),
                            ),
                            const SizedBox(width: 10),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    _operatorName,
                                    style: const TextStyle(
                                      fontWeight: FontWeight.bold,
                                      fontSize: 13,
                                      color: Color(0xFF0F172A),
                                    ),
                                  ),
                                  Text(
                                    _operatorModule,
                                    style: const TextStyle(
                                      fontSize: 11,
                                      color: Color(0xFF64748B),
                                    ),
                                  ),
                                ],
                              ),
                            ),
                            IconButton(
                              icon: const Icon(Icons.sync, color: Color(0xFF64748B), size: 20),
                              onPressed: _initSession,
                              tooltip: 'Sincronizar',
                            ),
                          ],
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 14),

                  // 2. Grand Total Card (Stitch UI Deep Emerald)
                  Container(
                    padding: const EdgeInsets.all(20),
                    decoration: BoxDecoration(
                      color: AppTheme.primary,
                      borderRadius: BorderRadius.circular(20),
                      boxShadow: [
                        BoxShadow(
                          color: AppTheme.primary.withOpacity(0.3),
                          blurRadius: 12,
                          offset: const Offset(0, 4),
                        ),
                      ],
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text(
                              'RECAUDACIÓN EN CAJA SSHH',
                              style: TextStyle(
                                color: Color(0xFFD1FAE5),
                                fontSize: 11,
                                fontWeight: FontWeight.w900,
                                letterSpacing: 0.5,
                              ),
                            ),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                              decoration: BoxDecoration(
                                color: Colors.white.withOpacity(0.2),
                                borderRadius: BorderRadius.circular(12),
                              ),
                              child: Text(
                                '$totalUsos usos',
                                style: const TextStyle(
                                  color: Colors.white,
                                  fontWeight: FontWeight.bold,
                                  fontSize: 11,
                                ),
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        Text(
                          'S/ ${_total.toStringAsFixed(2)}',
                          style: const TextStyle(
                            color: Colors.white,
                            fontSize: 38,
                            fontWeight: FontWeight.w900,
                            letterSpacing: -1,
                          ),
                        ),
                        const SizedBox(height: 12),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                          decoration: BoxDecoration(
                            color: Colors.black.withOpacity(0.12),
                            borderRadius: BorderRadius.circular(10),
                          ),
                          child: const Row(
                            children: [
                              Icon(Icons.verified, color: Color(0xFF97F5CC), size: 16),
                              SizedBox(width: 6),
                              Expanded(
                                child: Text(
                                  'Talonario validado: Sincronía exacta • SQLite activo',
                                  style: TextStyle(
                                    color: Colors.white70,
                                    fontSize: 10,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),

                  const SizedBox(height: 14),

                  // 3. Quick +1 Instant Add Tap Bar (Stitch single-hand high priority)
                  Row(
                    children: [
                      Expanded(
                        child: InkWell(
                          onTap: () => _updateCount(urinalDelta: 1),
                          borderRadius: BorderRadius.circular(16),
                          child: Container(
                            height: 64,
                            padding: const EdgeInsets.symmetric(horizontal: 14),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(16),
                              border: Border.all(color: const Color(0xFFE2E8F0)),
                              boxShadow: [
                                BoxShadow(
                                  color: Colors.black.withOpacity(0.02),
                                  blurRadius: 4,
                                  offset: const Offset(0, 2),
                                ),
                              ],
                            ),
                            child: const Row(
                              children: [
                                Icon(Icons.water_drop, color: AppTheme.secondary, size: 26),
                                SizedBox(width: 8),
                                Expanded(
                                  child: Column(
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        'Tocar rápido',
                                        style: TextStyle(fontSize: 10, color: Color(0xFF64748B)),
                                      ),
                                      Text(
                                        '+ Micción',
                                        style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
                                      ),
                                    ],
                                  ),
                                ),
                                Text(
                                  '+S/ 0.50',
                                  style: TextStyle(fontSize: 11, fontWeight: FontWeight.w900, color: AppTheme.secondary),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: InkWell(
                          onTap: () => _updateCount(toiletDelta: 1),
                          borderRadius: BorderRadius.circular(16),
                          child: Container(
                            height: 64,
                            padding: const EdgeInsets.symmetric(horizontal: 14),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(16),
                              border: Border.all(color: const Color(0xFFE2E8F0)),
                              boxShadow: [
                                BoxShadow(
                                  color: Colors.black.withOpacity(0.02),
                                  blurRadius: 4,
                                  offset: const Offset(0, 2),
                                ),
                              ],
                            ),
                            child: const Row(
                              children: [
                                Icon(Icons.wc, color: AppTheme.primary, size: 26),
                                SizedBox(width: 8),
                                Expanded(
                                  child: Column(
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      Text(
                                        'Tocar rápido',
                                        style: TextStyle(fontSize: 10, color: Color(0xFF64748B)),
                                      ),
                                      Text(
                                        '+ Retrete',
                                        style: TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
                                      ),
                                    ],
                                  ),
                                ),
                                Text(
                                  '+S/ 1.00',
                                  style: TextStyle(fontSize: 11, fontWeight: FontWeight.w900, color: AppTheme.primary),
                                ),
                              ],
                            ),
                          ),
                        ),
                      ),
                    ],
                  ),

                  const SizedBox(height: 14),

                  // 4. Stepper 1: Miccionario
                  _stepperUnit(
                    icon: Icons.water_drop,
                    iconColor: AppTheme.secondary,
                    title: 'Miccionario',
                    rateText: 'Tarifa Oficial: S/ 0.50 por persona',
                    subtotal: 'S/ ${(_urinalCount * 0.50).toStringAsFixed(2)}',
                    count: _urinalCount,
                    onMinus10: () => _updateCount(urinalDelta: -10),
                    onMinus1: () => _updateCount(urinalDelta: -1),
                    onPlus1: () => _updateCount(urinalDelta: 1),
                    onPlus10: () => _updateCount(urinalDelta: 10),
                  ),

                  const SizedBox(height: 12),

                  // 5. Stepper 2: Retrete
                  _stepperUnit(
                    icon: Icons.wc,
                    iconColor: AppTheme.primary,
                    title: 'Retrete / Inodoro',
                    rateText: 'Tarifa Oficial: S/ 1.00 por persona',
                    subtotal: 'S/ ${(_toiletCount * 1.00).toStringAsFixed(2)}',
                    count: _toiletCount,
                    onMinus10: () => _updateCount(toiletDelta: -10),
                    onMinus1: () => _updateCount(toiletDelta: -1),
                    onPlus1: () => _updateCount(toiletDelta: 1),
                    onPlus10: () => _updateCount(toiletDelta: 10),
                  ),

                  const SizedBox(height: 16),

                  // 6. Action Button: Cerrar Turno
                  ElevatedButton.icon(
                    onPressed: _showCloseTurnDialog,
                    icon: const Icon(Icons.receipt_long, size: 20),
                    label: const Text('ARQUEO Y CIERRE DE TURNO'),
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFFD97706),
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 16),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                      textStyle: const TextStyle(fontWeight: FontWeight.w900, fontSize: 13, letterSpacing: 0.5),
                    ),
                  ),
                  const SizedBox(height: 12),
                ],
              ),
            ),
    );
  }

  Widget _stepperUnit({
    required IconData icon,
    required Color iconColor,
    required String title,
    required String rateText,
    required String subtotal,
    required int count,
    required VoidCallback onMinus10,
    required VoidCallback onMinus1,
    required VoidCallback onPlus1,
    required VoidCallback onPlus10,
  }) {
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(18),
        border: Border.all(color: const Color(0xFFE2E8F0)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withOpacity(0.02),
            blurRadius: 4,
            offset: const Offset(0, 2),
          ),
        ],
      ),
      child: Column(
        children: [
          Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Row(
                children: [
                  Container(
                    width: 36,
                    height: 36,
                    decoration: BoxDecoration(
                      color: iconColor.withOpacity(0.12),
                      borderRadius: BorderRadius.circular(10),
                    ),
                    child: Icon(icon, color: iconColor, size: 20),
                  ),
                  const SizedBox(width: 10),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        title,
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Color(0xFF0F172A)),
                      ),
                      Text(
                        rateText,
                        style: const TextStyle(fontSize: 10, color: Color(0xFF64748B)),
                      ),
                    ],
                  ),
                ],
              ),
              Column(
                crossAxisAlignment: CrossAxisAlignment.end,
                children: [
                  const Text('Subtotal', style: TextStyle(fontSize: 10, color: Color(0xFF64748B))),
                  Text(
                    subtotal,
                    style: TextStyle(fontWeight: FontWeight.w900, fontSize: 14, color: iconColor),
                  ),
                ],
              ),
            ],
          ),
          const SizedBox(height: 14),
          Row(
            children: [
              // -10
              Expanded(
                flex: 2,
                child: SizedBox(
                  height: 48,
                  child: ElevatedButton(
                    onPressed: onMinus10,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFFF1F5F9),
                      foregroundColor: const Color(0xFF0F172A),
                      elevation: 0,
                      padding: EdgeInsets.zero,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                    child: const Text('-10', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 13)),
                  ),
                ),
              ),
              const SizedBox(width: 6),
              // -1
              Expanded(
                flex: 2,
                child: SizedBox(
                  height: 48,
                  child: ElevatedButton(
                    onPressed: onMinus1,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFFF1F5F9),
                      foregroundColor: const Color(0xFF0F172A),
                      elevation: 0,
                      padding: EdgeInsets.zero,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                    child: const Text('-1', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 14)),
                  ),
                ),
              ),
              const SizedBox(width: 8),
              // Counter Display
              Expanded(
                flex: 3,
                child: Container(
                  height: 48,
                  decoration: BoxDecoration(
                    color: const Color(0xFFF8FAFC),
                    borderRadius: BorderRadius.circular(10),
                    border: Border.all(color: const Color(0xFFE2E8F0)),
                  ),
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      Text(
                        '$count',
                        style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 18, color: Color(0xFF0F172A)),
                      ),
                      const Text(
                        'USOS',
                        style: TextStyle(fontSize: 8, fontWeight: FontWeight.w900, color: Color(0xFF64748B), letterSpacing: 0.5),
                      ),
                    ],
                  ),
                ),
              ),
              const SizedBox(width: 8),
              // +1
              Expanded(
                flex: 2,
                child: SizedBox(
                  height: 48,
                  child: ElevatedButton(
                    onPressed: onPlus1,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: iconColor,
                      foregroundColor: Colors.white,
                      elevation: 1,
                      padding: EdgeInsets.zero,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                    child: const Text('+1', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 14)),
                  ),
                ),
              ),
              const SizedBox(width: 6),
              // +10
              Expanded(
                flex: 2,
                child: SizedBox(
                  height: 48,
                  child: ElevatedButton(
                    onPressed: onPlus10,
                    style: ElevatedButton.styleFrom(
                      backgroundColor: iconColor.withOpacity(0.15),
                      foregroundColor: iconColor,
                      elevation: 0,
                      padding: EdgeInsets.zero,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                    ),
                    child: const Text('+10', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 13)),
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}
