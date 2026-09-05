import 'package:flutter/material.dart';
import 'package:uuid/uuid.dart';
import '../../../core/network/api_client.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/database/local_database.dart';
import 'comprobante_screen.dart';

class CobrarScreen extends StatefulWidget {
  const CobrarScreen({super.key});

  @override
  State<CobrarScreen> createState() => _CobrarScreenState();
}

class _CobrarScreenState extends State<CobrarScreen> {
  final _searchController = TextEditingController();
  List<dynamic> _searchResults = [];
  bool _isSearching = false;

  Map<String, dynamic>? _selectedMerchant;
  List<dynamic> _obligations = [];
  Map<String, dynamic>? _selectedObligation;
  bool _isSubmitting = false;

  Future<void> _search(String query) async {
    if (query.trim().isEmpty) {
      setState(() => _searchResults = []);
      return;
    }
    setState(() => _isSearching = true);
    try {
      final res = await ApiClient().dio.get('/merchants?search=${Uri.encodeComponent(query)}');
      setState(() {
        _searchResults = res.data;
      });
    } catch (e) {
      final local = await LocalDatabase.instance.searchCachedMerchants(query);
      setState(() {
        _searchResults = local;
      });
    } finally {
      if (mounted) setState(() => _isSearching = false);
    }
  }

  Future<void> _selectMerchant(Map<String, dynamic> merchant) async {
    setState(() {
      _selectedMerchant = merchant;
      _selectedObligation = null;
      _obligations = [];
      _searchResults = [];
      _searchController.text = '${merchant['lastName']}, ${merchant['firstName']}';
    });

    try {
      final res = await ApiClient().dio.get('/obligations/merchant/${merchant['id']}');
      setState(() {
        _obligations = (res.data as List).where((o) => o['status'] == 'PENDIENTE').toList();
        if (_obligations.isNotEmpty) {
          _selectedObligation = _obligations.first;
        }
      });
    } catch (e) {
      setState(() {
        _obligations = [
          {
            'id': 'off-ob-1',
            'concept': {'id': 'alcabala-id', 'name': 'Alcabala Diaria'},
            'period': '2026-09',
            'amount': merchant['merchantType']?['code'] == 'SOCIO' ? 10.00 : 3.00,
          },
          {
            'id': 'off-ob-2',
            'concept': {'id': 'agua-id', 'name': 'Cuota Agua'},
            'period': '2026-09',
            'amount': 5.00,
          },
        ];
        _selectedObligation = _obligations.first;
      });
    }
  }

  Future<void> _processQrCode(String rawCode) async {
    final code = rawCode.trim();
    if (code.isEmpty) return;

    // 1. Buscar en SQLite local
    Map<String, dynamic>? merchant = await LocalDatabase.instance.findMerchantByQr(code);

    // 2. Si no está en SQLite, consultar API
    if (merchant == null) {
      try {
        final res = await ApiClient().dio.get('/merchants/qr/${Uri.encodeComponent(code)}');
        if (res.data != null) {
          merchant = {
            'id': res.data['id'],
            'internalCode': res.data['internalCode'],
            'firstName': res.data['firstName'],
            'lastName': res.data['lastName'],
            'dni': res.data['dni'],
            'merchantType': {'name': res.data['merchantType']?['name'] ?? 'Socio'},
            'stall': res.data['stall'],
            'businessCategory': res.data['businessCategory'],
            'qrCode': res.data['qrCode'],
          };
        }
      } catch (_) {}
    }

    if (merchant != null) {
      _selectMerchant(merchant);
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            backgroundColor: AppTheme.primary,
            content: Text('Comerciante identificado por QR: ${merchant['lastName']}, ${merchant['firstName']}'),
          ),
        );
      }
    } else {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(
            backgroundColor: Colors.redAccent,
            content: Text('Código QR no corresponde a ningún comerciante activo en el padrón.'),
          ),
        );
      }
    }
  }

  void _showQrScanDialog() {
    final qrInputCtrl = TextEditingController();
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: Row(
          children: const [
            Icon(Icons.qr_code_scanner, color: AppTheme.primary),
            SizedBox(width: 8),
            Text('Escanear QR de Comerciante', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Apunte la cámara a la credencial del comerciante o ingrese el código/DNI:',
              style: TextStyle(fontSize: 12, color: Colors.black54),
            ),
            const SizedBox(height: 14),
            TextField(
              controller: qrInputCtrl,
              autofocus: true,
              decoration: const InputDecoration(
                labelText: 'Código QR o DNI (ej: MB-QR-10000001)',
                border: OutlineInputBorder(),
                prefixIcon: Icon(Icons.qr_code),
              ),
              onSubmitted: (val) {
                Navigator.pop(ctx);
                _processQrCode(val);
              },
            ),
          ],
        ),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Cancelar'),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: AppTheme.primary),
            onPressed: () {
              Navigator.pop(ctx);
              _processQrCode(qrInputCtrl.text);
            },
            child: const Text('Identificar', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }

  Future<void> _confirmPayment() async {
    if (_selectedMerchant == null || _selectedObligation == null) return;

    setState(() => _isSubmitting = true);
    final idempotencyKey = const Uuid().v4();

    final payload = {
      'merchantId': _selectedMerchant!['id'],
      'conceptId': _selectedObligation!['concept']['id'],
      'obligationId': _selectedObligation!['id'],
      'amount': _selectedObligation!['amount'],
      'period': _selectedObligation!['period'],
      'paymentMethod': 'EFECTIVO',
      'idempotencyKey': idempotencyKey,
    };

    try {
      final res = await ApiClient().dio.post(
        '/payments',
        data: payload,
      );

      final payment = res.data['payment'];
      if (mounted) {
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(
            builder: (_) => ComprobanteScreen(payment: payment),
          ),
        );
      }
    } catch (e) {
      // 100% OFFLINE-FIRST: Guardar en cola SQLite
      await LocalDatabase.instance.insertOfflinePayment({
        'idempotency_key': idempotencyKey,
        'merchant_id': _selectedMerchant!['id'],
        'merchant_name': '${_selectedMerchant!['lastName']}, ${_selectedMerchant!['firstName']}',
        'concept_id': _selectedObligation!['concept']['id'],
        'concept_name': _selectedObligation!['concept']['name'],
        'obligation_id': _selectedObligation!['id'],
        'amount': _selectedObligation!['amount'],
        'period': _selectedObligation!['period'],
        'payment_method': 'EFECTIVO',
        'created_at': DateTime.now().toIso8601String(),
        'sync_status': 'PENDIENTE',
      });

      if (mounted) {
        Navigator.pushReplacement(
          context,
          MaterialPageRoute(
            builder: (_) => ComprobanteScreen(
              payment: {
                'operationNumber': 'OFFLINE-${idempotencyKey.substring(0, 8).toUpperCase()}',
                'merchant': _selectedMerchant,
                'concept': _selectedObligation!['concept'],
                'amount': _selectedObligation!['amount'],
                'period': _selectedObligation!['period'],
                'paidAt': DateTime.now().toIso8601String(),
                'isOffline': true,
              },
            ),
          ),
        );
      }
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('REGISTRAR COBRO', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 16))),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Botón de Escaneo Rápido QR
            Container(
              margin: const EdgeInsets.only(bottom: 16),
              child: ElevatedButton.icon(
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.primary,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  elevation: 2,
                ),
                icon: const Icon(Icons.qr_code_scanner, color: Colors.white, size: 22),
                label: const Text(
                  'COBRO RÁPIDO CON QR',
                  style: TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 13, letterSpacing: 0.8),
                ),
                onPressed: _showQrScanDialog,
              ),
            ),

            const Text(
              '1. BUSCAR EN PADRÓN O ESCANEAR CREDENCIAL',
              style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.grey),
            ),
            const SizedBox(height: 6),
            TextField(
              controller: _searchController,
              onChanged: _search,
              decoration: InputDecoration(
                hintText: 'DNI, Apellidos, Puesto o Código...',
                prefixIcon: const Icon(Icons.search, color: AppTheme.primary),
                suffixIcon: IconButton(
                  icon: const Icon(Icons.qr_code, color: AppTheme.primary),
                  tooltip: 'Escanear QR',
                  onPressed: _showQrScanDialog,
                ),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(14)),
                filled: true,
                fillColor: Colors.white,
              ),
            ),
            if (_isSearching)
              const Padding(padding: EdgeInsets.all(12), child: Center(child: CircularProgressIndicator())),

            if (_searchResults.isNotEmpty) ...[
              const SizedBox(height: 8),
              Container(
                constraints: const BoxConstraints(maxHeight: 200),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: Colors.grey.shade200),
                  boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.04), blurRadius: 8)],
                ),
                child: ListView.separated(
                  shrinkWrap: true,
                  itemCount: _searchResults.length,
                  separatorBuilder: (_, __) => const Divider(height: 1),
                  itemBuilder: (ctx, idx) {
                    final m = _searchResults[idx];
                    final stall = m['stall']?['code'] ?? m['stall_code'] ?? 'Ambulante';
                    final type = m['merchantType']?['name'] ?? m['type_name'] ?? 'Socio';
                    return ListTile(
                      dense: true,
                      leading: CircleAvatar(
                        backgroundColor: AppTheme.primary.withOpacity(0.1),
                        child: Text(
                          (m['firstName'] ?? m['first_name'] ?? 'C')[0],
                          style: const TextStyle(color: AppTheme.primary, fontWeight: FontWeight.bold),
                        ),
                      ),
                      title: Text(
                        '${m['lastName'] ?? m['last_name']}, ${m['firstName'] ?? m['first_name']}',
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                      ),
                      subtitle: Text('DNI: ${m['dni']} • Puesto: $stall ($type)', style: const TextStyle(fontSize: 11)),
                      trailing: const Icon(Icons.chevron_right, size: 18, color: Colors.grey),
                      onTap: () => _selectMerchant(m),
                    );
                  },
                ),
              ),
            ],

            const SizedBox(height: 20),

            // Comerciante Seleccionado
            if (_selectedMerchant != null) ...[
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.green.shade50,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: Colors.green.shade200),
                ),
                child: Row(
                  children: [
                    const CircleAvatar(
                      backgroundColor: AppTheme.primary,
                      radius: 20,
                      child: Icon(Icons.check, color: Colors.white, size: 20),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            '${_selectedMerchant!['lastName'] ?? _selectedMerchant!['last_name']}, ${_selectedMerchant!['firstName'] ?? _selectedMerchant!['first_name']}',
                            style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 14, color: Color(0xFF1E293B)),
                          ),
                          Text(
                            'DNI: ${_selectedMerchant!['dni']} • Puesto: ${_selectedMerchant!['stall']?['code'] ?? _selectedMerchant!['stall_code'] ?? 'Ambulante'}',
                            style: const TextStyle(fontSize: 11, color: Colors.black54),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 20),

              const Text(
                '2. SELECCIONAR CONCEPTO / CUOTA PENDIENTE',
                style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.grey),
              ),
              const SizedBox(height: 8),

              if (_obligations.isEmpty)
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: Colors.grey.shade200),
                  ),
                  child: const Center(
                    child: Text('Sin cuotas pendientes registradas.', style: TextStyle(fontSize: 12, color: Colors.black45)),
                  ),
                )
              else
                Column(
                  children: _obligations.map((ob) {
                    final isSelected = _selectedObligation?['id'] == ob['id'];
                    final amount = ob['amount'] is num ? ob['amount'] : (double.tryParse(ob['amount'].toString()) ?? 0.0);

                    return Container(
                      margin: const EdgeInsets.only(bottom: 8),
                      child: InkWell(
                        onTap: () => setState(() => _selectedObligation = ob),
                        borderRadius: BorderRadius.circular(14),
                        child: Container(
                          padding: const EdgeInsets.all(14),
                          decoration: BoxDecoration(
                            color: isSelected ? Colors.green.shade50 : Colors.white,
                            borderRadius: BorderRadius.circular(14),
                            border: Border.all(
                              color: isSelected ? AppTheme.primary : Colors.grey.shade200,
                              width: isSelected ? 2 : 1,
                            ),
                          ),
                          child: Row(
                            mainAxisAlignment: MainAxisAlignment.spaceBetween,
                            children: [
                              Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    ob['concept']?['name'] ?? 'Alcabala',
                                    style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13),
                                  ),
                                  Text('Período: ${ob['period']}', style: const TextStyle(fontSize: 11, color: Colors.black45)),
                                ],
                              ),
                              Text(
                                'S/ ${amount.toStringAsFixed(2)}',
                                style: TextStyle(
                                  fontWeight: FontWeight.w900,
                                  fontSize: 16,
                                  color: isSelected ? AppTheme.primary : Colors.black87,
                                ),
                              ),
                            ],
                          ),
                        ),
                      ),
                    );
                  }).toList(),
                ),

              const SizedBox(height: 24),

              // Botón de Confirmación
              ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.primary,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                ),
                onPressed: _isSubmitting || _selectedObligation == null ? null : _confirmPayment,
                child: _isSubmitting
                    ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                    : Text(
                        'CONFIRMAR COBRO (S/ ${(_selectedObligation?['amount'] ?? 0).toString()})',
                        style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 14),
                      ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}