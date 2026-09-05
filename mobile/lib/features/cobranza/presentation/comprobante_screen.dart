import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
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
    final amount = payment['amount'] ?? 0.0;
    final paidAtStr = payment['paidAt'];
    final paidAt = paidAtStr != null ? DateTime.parse(paidAtStr) : DateTime.now();
    final isOffline = payment['isOffline'] == true;

    return Scaffold(
      backgroundColor: AppTheme.background,
      appBar: AppBar(
        title: const Text('COMPROBANTE DE PAGO'),
        automaticallyImplyLeading: false,
      ),
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                padding: const EdgeInsets.all(24),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(20),
                  boxShadow: [
                    BoxShadow(color: Colors.black.withOpacity(0.08), blurRadius: 16, offset: const Offset(0, 6)),
                  ],
                ),
                child: Column(
                  children: [
                    CircleAvatar(
                      radius: 28,
                      backgroundColor: Colors.green.shade50,
                      child: const Icon(Icons.check_circle, color: AppTheme.primary, size: 36),
                    ),
                    const SizedBox(height: 12),
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
                    const SizedBox(height: 16),
                    const Divider(),
                    const SizedBox(height: 12),

                    _ticketRow('N° de Operación:', opNumber, isBold: true, isMono: true),
                    _ticketRow('Fecha y Hora:', DateFormat('dd/MM/yyyy HH:mm').format(paidAt)),
                    if (merchant != null) ...[
                      _ticketRow('Comerciante:', '${merchant['lastName']}, ${merchant['firstName']}'),
                      _ticketRow('DNI:', merchant['dni'] ?? '-'),
                      _ticketRow('Puesto:', merchant['stall']?['code'] ?? 'Ambulatorio'),
                    ],
                    _ticketRow('Concepto:', concept?['name'] ?? 'Alcabala'),
                    _ticketRow('Período:', payment['period'] ?? '2026-09'),

                    const SizedBox(height: 12),
                    const Divider(color: Colors.black26),
                    const SizedBox(height: 8),

                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('MONTO PAGADO:', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 14)),
                        Text(
                          'S/ ${(amount as num).toStringAsFixed(2)}',
                          style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 22, color: AppTheme.primary),
                        ),
                      ],
                    ),
                  ],
                ),
              ),

              const SizedBox(height: 24),

              ElevatedButton(
                onPressed: () {
                  Navigator.of(context).pushAndRemoveUntil(
                    MaterialPageRoute(builder: (_) => const HomeDashboardScreen()),
                    (route) => false,
                  );
                },
                child: const Text('FINALIZAR Y VOLVER AL INICIO'),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _ticketRow(String label, String value, {bool isBold = false, bool isMono = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
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
