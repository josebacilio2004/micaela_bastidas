import 'package:flutter/material.dart';
import '../../../core/network/api_client.dart';
import '../../../core/theme/app_theme.dart';

class CajaScreen extends StatefulWidget {
  const CajaScreen({super.key});

  @override
  State<CajaScreen> createState() => _CajaScreenState();
}

class _CajaScreenState extends State<CajaScreen> {
  Map<String, dynamic>? _currentRegister;
  Map<String, dynamic>? _summary;
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _fetchCaja();
  }

  Future<void> _fetchCaja() async {
    setState(() => _isLoading = true);
    try {
      final res = await ApiClient().dio.get('/cash-registers/current');
      _currentRegister = res.data;
      if (_currentRegister != null) {
        final sumRes = await ApiClient().dio.get('/cash-registers/${_currentRegister!['id']}/summary');
        _summary = sumRes.data;
      }
    } catch (_) {}
    if (mounted) setState(() => _isLoading = false);
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('CAJA Y RENDICIONES')),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  if (_currentRegister != null) ...[
                    Container(
                      padding: const EdgeInsets.all(20),
                      decoration: BoxDecoration(
                        color: Colors.white,
                        borderRadius: BorderRadius.circular(20),
                        border: Border.all(color: Colors.grey.shade200),
                      ),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Text(_currentRegister!['name'] ?? 'Caja Abierta', style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 16)),
                              Container(
                                padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                decoration: BoxDecoration(color: Colors.green.shade100, borderRadius: BorderRadius.circular(8)),
                                child: const Text('ABIERTO', style: TextStyle(color: AppTheme.primary, fontWeight: FontWeight.bold, fontSize: 11)),
                              ),
                            ],
                          ),
                          const SizedBox(height: 16),
                          const Divider(),
                          const SizedBox(height: 12),
                          _row('Monto de Apertura:', 'S/ ${(_summary?['openingAmount'] ?? 0.0).toStringAsFixed(2)}'),
                          _row('Cobranza Alcabala/Agua:', 'S/ ${((_summary?['alcabalaSum'] ?? 0.0) + (_summary?['waterSum'] ?? 0.0)).toStringAsFixed(2)}'),
                          _row('Servicios Higiénicos:', 'S/ ${(_summary?['sanitarySum'] ?? 0.0).toStringAsFixed(2)}'),
                          const SizedBox(height: 8),
                          const Divider(),
                          const SizedBox(height: 8),
                          _row('EFECTIVO ESPERADO:', 'S/ ${(_summary?['expectedCash'] ?? 0.0).toStringAsFixed(2)}', isTotal: true),
                        ],
                      ),
                    ),
                  ] else ...[
                    const Center(child: Text('No hay una caja abierta actualmente.')),
                  ],
                ],
              ),
            ),
    );
  }

  Widget _row(String label, String value, {bool isTotal = false}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: TextStyle(fontWeight: isTotal ? FontWeight.w900 : FontWeight.w500, fontSize: isTotal ? 14 : 12)),
          Text(
            value,
            style: TextStyle(
              fontWeight: FontWeight.w900,
              fontSize: isTotal ? 18 : 13,
              color: isTotal ? AppTheme.primary : Colors.black87,
            ),
          ),
        ],
      ),
    );
  }
}
