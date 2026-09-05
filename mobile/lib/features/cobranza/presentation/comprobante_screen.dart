import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:qr_flutter/qr_flutter.dart';
import '../../../core/theme/app_theme.dart';
import '../../dashboard/presentation/home_dashboard_screen.dart';

class ComprobanteScreen extends StatelessWidget {
  final Map<String, dynamic> payment;

  const ComprobanteScreen({super.key, required this.payment});

  @override
  Widget build(BuildContext context) {
    final opNumber = payment['operationNumber'] ?? 'MB-20260904-00000';
    final merchant = payment['merchant'];
    final concept = payment['concept'];
    final double amount = (payment['amount'] is num) ? (payment['amount'] as num).toDouble() : 0.0;
    final paidAtStr = payment['paidAt'];
    final paidAt = paidAtStr != null ? DateTime.parse(paidAtStr) : DateTime.now();
    final isOffline = payment['isOffline'] == true;

    final dni = merchant?['dni'] ?? '';
    final qrPayload = 'MB-REC|$opNumber|$dni|S/${amount.toStringAsFixed(2)}|${paidAt.toIso8601String()}';

    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: const Text('COMPROBANTE DE PAGO', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 15)),
        automaticallyImplyLeading: false,
      ),
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                padding: const EdgeInsets.all(22),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(24),
                  boxShadow: [
                    BoxShadow(color: Colors.black.withOpacity(0.08), blurRadius: 16, offset: const Offset(0, 6)),
                  ],
                ),
                child: Column(
                  children: [
                    CircleAvatar(
                      radius: 26,
                      backgroundColor: Colors.green.shade50,
                      child: const Icon(Icons.check_circle, color: AppTheme.primary, size: 34),
                    ),
                    const SizedBox(height: 10),
                    const Text(
                      'PAGO REGISTRADO EXITOSAMENTE',
                      textAlign: TextAlign.center,
                      style: TextStyle(fontWeight: FontWeight.w900, fontSize: 13, color: AppTheme.primaryDark),
                    ),
                    if (isOffline) ...[
                      const SizedBox(height: 4),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 2),
                        decoration: BoxDecoration(color: Colors.amber.shade100, borderRadius: BorderRadius.circular(6)),
                        child: const Text('MODO OFFLINE (PENDIENTE SYNC)', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.amber)),
                      ),
                    ],
                    const SizedBox(height: 14),
                    const Divider(),
                    const SizedBox(height: 10),

                    _ticketRow('N° de Operación:', opNumber, isBold: true, isMono: true),
                    _ticketRow('Fecha y Hora:', DateFormat('dd/MM/yyyy HH:mm').format(paidAt)),
                    if (merchant != null) ...[
                      _ticketRow('Comerciante:', '${merchant['lastName']}, ${merchant['firstName']}'),
                      _ticketRow('DNI:', merchant['dni'] ?? '-'),
                      _ticketRow('Puesto:', merchant['stall']?['code'] ?? 'Ambulatorio'),
                    ],
                    _ticketRow('Concepto:', concept?['name'] ?? 'Alcabala'),
                    _ticketRow('Período:', payment['period'] ?? '2026-09'),

                    const SizedBox(height: 10),
                    const Divider(color: Colors.black26),
                    const SizedBox(height: 8),

                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('MONTO PAGADO:', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 13)),
                        Text(
                          'S/ ${amount.toStringAsFixed(2)}',
                          style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 22, color: AppTheme.primary),
                        ),
                      ],
                    ),

                    const SizedBox(height: 16),

                    // QR de Verificación
                    Container(
                      padding: const EdgeInsets.all(10),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(16),
                        border: Border.all(color: Colors.grey.shade200),
                      ),
                      child: QrImageView(
                        data: qrPayload,
                        version: QrVersions.auto,
                        size: 130,
                        backgroundColor: Colors.white,
                      ),
                    ),
                    const SizedBox(height: 6),
                    const Text(
                      'QR Oficial de Verificación y Control',
                      style: TextStyle(fontSize: 10, color: Colors.black45, fontWeight: FontWeight.bold),
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 20),

              Row(
                children: [
                  Expanded(
                    child: OutlinedButton.icon(
                      style: OutlinedButton.styleFrom(
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                      ),
                      icon: const Icon(Icons.print, size: 18),
                      label: const Text('Imprimir (58mm)', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                      onPressed: () {
                        ScaffoldMessenger.of(context).showSnackBar(
                          const SnackBar(content: Text('Enviando comprobante a impresora térmica bluetooth...')),
                        );
                      },
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: ElevatedButton.icon(
                      style: ElevatedButton.styleFrom(
                        backgroundColor: AppTheme.primary,
                        padding: const EdgeInsets.symmetric(vertical: 14),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                      ),
                      icon: const Icon(Icons.check, color: Colors.white, size: 18),
                      label: const Text('Volver al Inicio', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12)),
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
    );
  }

  Widget _ticketRow(String label, String value, {bool isBold = false, bool isMono = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 3),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: TextStyle(color: Colors.grey.shade600, fontSize: 12)),
          Flexible(
            child: Text(
              value,
              textAlign: TextAlign.right,
              style: TextStyle(
                fontWeight: isBold ? FontWeight.bold : FontWeight.w500,
                fontFamily: isMono ? 'monospace' : null,
                fontSize: 12,
                color: Colors.black87,
              ),
            ),
          ),
        ],
      ),
    );
  }
}