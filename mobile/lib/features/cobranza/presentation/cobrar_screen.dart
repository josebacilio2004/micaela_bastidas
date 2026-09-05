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
            'concept': {'id': 'alcabala-id', 'name': 'Alcabala'},
            'period': '2026-09',
            'amount': merchant['merchantType']?['code'] == 'SOCIO' ? 10.00 : 3.00,
          },
        ];
        _selectedObligation = _obligations.first;
      });
    }
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
      await LocalDatabase.instance.insertOfflinePayment({
        'idempotency_key': idempotencyKey,
        'merchant_id': _selectedMerchant!['id'],
        'merchant_name': '${_selectedMerchant!['lastName']} ${_selectedMerchant!['firstName']}',
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
      appBar: AppBar(title: const Text('REGISTRAR COBRO')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            const Text(
              '1. BUSCAR COMERCIANTE',
              style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.grey),
            ),
            const SizedBox(height: 6),
            TextField(
              controller: _searchController,
              onChanged: _search,
              decoration: InputDecoration(
                hintText: 'DNI, Apellidos o Puesto...',
                prefixIcon: const Icon(Icons.search, color: AppTheme.primary),
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
                ),
                child: ListView.separated(
                  shrinkWrap: true,
                  itemCount: _searchResults.length,
                  separatorBuilder: (ctx, idx) => const Divider(height: 1),
                  itemBuilder: (context, index) {
                    final m = _searchResults[index];
                    final stall = m['stall']?['code'] ?? m['stall_code'] ?? 'Ambulatorio';
                    final name = m['lastName'] != null
                        ? '${m['lastName']}, ${m['firstName']}'
                        : '${m['last_name']}, ${m['first_name']}';
                    return ListTile(
                      title: Text(name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                      subtitle: Text('DNI: ${m['dni']} | Puesto: $stall', style: const TextStyle(fontSize: 11)),
                      trailing: const Icon(Icons.chevron_right, color: AppTheme.primary),
                      onTap: () {
                        _searchController.clear();
                        _searchResults = [];
                        _selectMerchant(m);
                      },
                    );
                  },
                ),
              ),
            ],

            const SizedBox(height: 20),

            if (_selectedMerchant != null) ...[
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.green.shade50,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AppTheme.primary.withOpacity(0.3)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        Text(
                          '${_selectedMerchant!['lastName']}, ${_selectedMerchant!['firstName']}',
                          style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 15, color: AppTheme.primaryDark),
                        ),
                        Container(
                          padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                          decoration: BoxDecoration(color: AppTheme.primary, borderRadius: BorderRadius.circular(6)),
                          child: Text(
                            _selectedMerchant!['stall']?['code'] ?? 'Ambulatorio',
                            style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 11),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text('DNI: ${_selectedMerchant!['dni']}', style: TextStyle(color: Colors.grey.shade700, fontSize: 12)),
                  ],
                ),
              ),
              const SizedBox(height: 20),

              const Text(
                '2. OBLIGACIÓN PENDIENTE',
                style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.grey),
              ),
              const SizedBox(height: 8),

              if (_obligations.isEmpty)
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(color: Colors.white, borderRadius: BorderRadius.circular(14)),
                  child: const Text('Sin obligaciones pendientes.', style: TextStyle(color: Colors.green, fontWeight: FontWeight.bold)),
                )
              else
                ..._obligations.map((ob) {
                  final isSelected = _selectedObligation?['id'] == ob['id'];
                  return InkWell(
                    onTap: () => setState(() => _selectedObligation = ob),
                    child: Container(
                      margin: const EdgeInsets.only(bottom: 8),
                      padding: const EdgeInsets.all(14),
                      decoration: BoxDecoration(
                        color: isSelected ? Colors.white : Colors.grey.shade50,
                        borderRadius: BorderRadius.circular(14),
                        border: Border.all(color: isSelected ? AppTheme.primary : Colors.grey.shade300, width: isSelected ? 2 : 1),
                      ),
                      child: Row(
                        mainAxisAlignment: MainAxisAlignment.spaceBetween,
                        children: [
                          Column(
                            crossAxisAlignment: CrossAxisAlignment.start,
                            children: [
                              Text(ob['concept']?['name'] ?? 'Alcabala', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                              Text('Período: ${ob['period']}', style: TextStyle(color: Colors.grey.shade600, fontSize: 11)),
                            ],
                          ),
                          Text('S/ ${(ob['amount'] as num).toStringAsFixed(2)}', style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 16, color: AppTheme.primary)),
                        ],
                      ),
                    ),
                  );
                }),

              const SizedBox(height: 28),

              ElevatedButton(
                onPressed: (_selectedObligation == null || _isSubmitting) ? null : _confirmPayment,
                child: _isSubmitting
                    ? const CircularProgressIndicator(color: Colors.white)
                    : Text(
                        'CONFIRMAR COBRO: S/ ${_selectedObligation != null ? (_selectedObligation!['amount'] as num).toStringAsFixed(2) : '0.00'}',
                        style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w900),
                      ),
              ),
            ],
          ],
        ),
      ),
    );
  }
}
