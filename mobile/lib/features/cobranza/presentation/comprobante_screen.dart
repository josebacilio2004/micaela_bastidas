import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:qr_flutter/qr_flutter.dart';
import '../../../core/theme/app_theme.dart';
import '../../dashboard/presentation/home_dashboard_screen.dart';
import 'cobrar_screen.dart';

class ComprobanteScreen extends StatelessWidget {
  final Map<String, dynamic> payment;

  const ComprobanteScreen({super.key, required this.payment});

  @override
  Widget build(BuildContext context) {
    final opNumber = payment['operationNumber'] ?? 'REC-202609-00000';
    final merchant = payment['merchant'];
    final concept = payment['concept'];
    final double amount = (payment['amount'] is num) ? (payment['amount'] as num).toDouble() : (double.tryParse(payment['amount']?.toString() ?? '0') ?? 0.0);
    final paidAtStr = payment['paidAt'];
    final paidAt = paidAtStr != null ? DateTime.tryParse(paidAtStr.toString()) ?? DateTime.now() : DateTime.now();
    final isOffline = payment['isOffline'] == true;

    final String lastName = merchant?['lastName'] ?? merchant?['last_name'] ?? '';
    final String firstName = merchant?['firstName'] ?? merchant?['first_name'] ?? '';
    final String payerName = ('$lastName $firstName').trim().isNotEmpty
        ? ('$lastName $firstName').trim().toUpperCase()
        : (payment['merchantName'] ?? 'PAGADOR').toString().toUpperCase();

    final String dni = merchant?['dni'] ?? payment['merchantDni'] ?? '-';
    final String stallCode = merchant?['stall']?['code'] ?? merchant?['stall_code'] ?? 'Ambulante';
    final String conceptName = concept?['name'] ?? payment['conceptName'] ?? payment['concept_name'] ?? 'Cuota Programada';
    final String paymentMethod = (payment['paymentMethod'] ?? 'EFECTIVO').toString().toUpperCase();

    final qrPayload = 'MB-REC|$opNumber|$dni|S/${amount.toStringAsFixed(2)}|${paidAt.toIso8601String()}';

    return Scaffold(
      backgroundColor: const Color(0xFFE2E8F0),
      appBar: AppBar(
        title: const Text('TICKET DE COBRO', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 14, letterSpacing: 1.1)),
        automaticallyImplyLeading: false,
        backgroundColor: const Color(0xFF1E293B),
        foregroundColor: Colors.white,
        centerTitle: true,
      ),
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 20),
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 350),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                // Ticket Card (Estilo Térmico 58mm)
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(16),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withOpacity(0.12),
                        blurRadius: 20,
                        offset: const Offset(0, 8),
                      ),
                    ],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.center,
                    children: [
                      // Encabezado Térmico
                      const Text(
                        'ASOCIACIÓN DE COMERCIANTES',
                        style: TextStyle(fontWeight: FontWeight.w900, fontSize: 13, letterSpacing: 0.5),
                        textAlign: TextAlign.center,
                      ),
                      const Text(
                        'MICAELA BASTIDAS',
                        style: TextStyle(fontWeight: FontWeight.w900, fontSize: 16, color: AppTheme.primaryDark),
                        textAlign: TextAlign.center,
                      ),
                      const SizedBox(height: 2),
                      const Text(
                        'R.U.C. 20456789012 • SJL - LIMA',
                        style: TextStyle(fontSize: 10, color: Colors.black54, fontWeight: FontWeight.bold),
                      ),
                      const Text(
                        'CONTROL INTERNO DE APORTES',
                        style: TextStyle(fontSize: 10, color: Colors.black45, fontWeight: FontWeight.bold),
                      ),

                      const SizedBox(height: 10),
                      _dashedDivider(),
                      const SizedBox(height: 8),

                      // Número de Ticket & Fecha
                      _ticketRow('N° TICKET:', opNumber, isBold: true, isMono: true),
                      _ticketRow('FECHA / HORA:', DateFormat('dd/MM/yyyy HH:mm').format(paidAt)),
                      _ticketRow('MEDIO:', paymentMethod),

                      const SizedBox(height: 6),
                      _dashedDivider(),
                      const SizedBox(height: 6),

                      // Datos del Pagador
                      _ticketRow('PAGADOR:', payerName, isBold: true),
                      _ticketRow('DNI / DOC:', dni),
                      _ticketRow('PUESTO / ÁREA:', stallCode),

                      if (payment['items'] != null && (payment['items'] as List).isNotEmpty) ...[
                        const SizedBox(height: 6),
                        _dashedDivider(),
                        const SizedBox(height: 6),
                        const Align(
                          alignment: Alignment.centerLeft,
                          child: Text(
                            'DETALLE DE CUOTAS / CONCEPTOS:',
                            style: TextStyle(fontSize: 10, fontWeight: FontWeight.w900, color: Colors.black87),
                          ),
                        ),
                        const SizedBox(height: 4),
                        ...((payment['items'] as List).map((item) {
                          final cName = (item['conceptName'] ?? 'Concepto').toString();
                          final pName = (item['period'] ?? '').toString();
                          final iAmt = (item['amount'] is num)
                              ? (item['amount'] as num).toDouble()
                              : (double.tryParse(item['amount']?.toString() ?? '0') ?? 0.0);
                          return Padding(
                            padding: const EdgeInsets.symmetric(vertical: 2.0),
                            child: Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Expanded(
                                  child: Text(
                                    '$cName ${pName.isNotEmpty ? "($pName)" : ""}',
                                    style: const TextStyle(fontSize: 11, fontWeight: FontWeight.w600, color: Colors.black87),
                                  ),
                                ),
                                Text(
                                  'S/ ${iAmt.toStringAsFixed(2)}',
                                  style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, fontFamily: 'monospace'),
                                ),
                              ],
                            ),
                          );
                        })),
                      ] else ...[
                        _ticketRow('CONCEPTO:', conceptName),
                        if (payment['period'] != null)
                          _ticketRow('PERÍODO:', payment['period'].toString()),
                      ],

                      const SizedBox(height: 8),
                      _dashedDivider(),
                      const SizedBox(height: 10),

                      // Monto Total Prominente
                      Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          const Text(
                            'TOTAL PAGADO:',
                            style: TextStyle(fontWeight: FontWeight.w900, fontSize: 13, color: Colors.black87),
                          ),
                          Text(
                            'S/ ${amount.toStringAsFixed(2)}',
                            style: const TextStyle(
                              fontWeight: FontWeight.w900,
                              fontSize: 22,
                              color: Color(0xFF047857),
                            ),
                          ),
                        ],
                      ),

                      if (isOffline) ...[
                        const SizedBox(height: 8),
                        Container(
                          width: double.infinity,
                          padding: const EdgeInsets.symmetric(vertical: 4, horizontal: 8),
                          decoration: BoxDecoration(
                            color: Colors.amber.shade50,
                            borderRadius: BorderRadius.circular(6),
                            border: Border.all(color: Colors.amber.shade400),
                          ),
                          child: const Text(
                            '• PAGO REGISTRADO LOCALMENTE (OFFLINE) •',
                            textAlign: TextAlign.center,
                            style: TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: Colors.amber),
                          ),
                        ),
                      ],

                      const SizedBox(height: 12),
                      _dashedDivider(),
                      const SizedBox(height: 12),

                      // QR de Validación
                      Center(
                        child: QrImageView(
                          data: qrPayload,
                          version: QrVersions.auto,
                          size: 90,
                          backgroundColor: Colors.white,
                        ),
                      ),
                      const SizedBox(height: 4),
                      const Text(
                        '¡GRACIAS POR SU PAGO PUNTUAL!',
                        style: TextStyle(fontSize: 9, fontWeight: FontWeight.bold, color: Colors.black45, letterSpacing: 0.5),
                        textAlign: TextAlign.center,
                      ),
                    ],
                  ),
                ),

                const SizedBox(height: 20),

                // Botones de Acción
                Row(
                  children: [
                    Expanded(
                      child: ElevatedButton.icon(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppTheme.primary,
                          foregroundColor: Colors.white,
                          padding: const EdgeInsets.symmetric(vertical: 13),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                          elevation: 2,
                        ),
                        icon: const Icon(Icons.qr_code_scanner, size: 18),
                        label: const Text('NUEVO COBRO', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                        onPressed: () {
                          Navigator.pushReplacement(
                            context,
                            MaterialPageRoute(builder: (_) => const CobrarScreen()),
                          );
                        },
                      ),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: OutlinedButton.icon(
                        style: OutlinedButton.styleFrom(
                          backgroundColor: Colors.white,
                          foregroundColor: const Color(0xFF1E293B),
                          padding: const EdgeInsets.symmetric(vertical: 13),
                          side: const BorderSide(color: Color(0xFFCBD5E1)),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                        ),
                        icon: const Icon(Icons.home_outlined, size: 18),
                        label: const Text('MENÚ INICIO', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                        onPressed: () {
                          Navigator.of(context).pushAndRemoveUntil(
                            MaterialPageRoute(builder: (_) => const HomeDashboardScreen()),
                            (route) => false,
                          );
                        },
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _dashedDivider() {
    return LayoutBuilder(
      builder: (context, constraints) {
        final count = (constraints.maxWidth / 8).floor();
        return Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: List.generate(
            count,
            (_) => const SizedBox(
              width: 4,
              height: 1.2,
              child: DecoratedBox(decoration: BoxDecoration(color: Colors.black26)),
            ),
          ),
        );
      },
    );
  }

  Widget _ticketRow(String label, String value, {bool isBold = false, bool isMono = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2.5),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: const TextStyle(color: Colors.black54, fontSize: 11, fontWeight: FontWeight.bold)),
          const SizedBox(width: 8),
          Flexible(
            child: Text(
              value,
              textAlign: TextAlign.right,
              style: TextStyle(
                fontWeight: isBold ? FontWeight.bold : FontWeight.w600,
                fontFamily: isMono ? 'monospace' : null,
                fontSize: 11,
                color: Colors.black87,
              ),
            ),
          ),
        ],
      ),
    );
  }
}