import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:uuid/uuid.dart';
import '../../../core/network/api_client.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/database/local_database.dart';
import '../../../core/scanner/real_qr_scanner_sheet.dart';
import 'comprobante_screen.dart';

class CobrarScreen extends StatefulWidget {
  final Map<String, dynamic>? preselectedMerchant;

  const CobrarScreen({super.key, this.preselectedMerchant});

  @override
  State<CobrarScreen> createState() => _CobrarScreenState();
}

class _CobrarScreenState extends State<CobrarScreen> {
  final _searchController = TextEditingController();
  List<dynamic> _searchResults = [];
  bool _isSearching = false;

  Map<String, dynamic>? _selectedMerchant;
  bool _isLoadingObligations = false;
  bool _isUpToDate = false;
  String _statusMessage = '';
  List<dynamic> _pendingObligations = [];
  final Set<String> _selectedObligationIds = {};
  List<dynamic> _recentlyPaid = [];
  bool _forceExtraordinaryPayment = false;

  // Custom concept / amount state
  double _currentAmount = 3.00;
  String _selectedConceptName = 'Alcabala Diaria';
  String _selectedPaymentMethod = 'EFECTIVO';
  bool _isSubmitting = false;

  final List<double> _quickAmounts = [1.00, 2.00, 3.00, 5.00, 6.00, 10.00, 15.00, 16.00, 25.00];

  @override
  void initState() {
    super.initState();
    if (widget.preselectedMerchant != null) {
      _selectMerchant(widget.preselectedMerchant!);
    }
  }

  @override
  void dispose() {
    _searchController.dispose();
    super.dispose();
  }

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
    final fName = (merchant['firstName'] ?? merchant['first_name'] ?? '').toString();
    final lName = (merchant['lastName'] ?? merchant['last_name'] ?? '').toString();
    final fullName = lName.isNotEmpty ? '$lName, $fName' : fName;

    final typeName = (merchant['merchantType']?['name'] ?? merchant['type_name'] ?? merchant['typeName'] ?? '').toString();
    final isSocio = typeName.contains('Socio') || typeName.contains('Titular');

    setState(() {
      _selectedMerchant = merchant;
      _isLoadingObligations = true;
      _isUpToDate = false;
      _statusMessage = '';
      _pendingObligations = [];
      _selectedObligationIds.clear();
      _recentlyPaid = [];
      _forceExtraordinaryPayment = false;
      _searchResults = [];
      _searchController.text = fullName;
      _currentAmount = isSocio ? 16.00 : 3.00;
      _selectedConceptName = isSocio ? 'Cuota Alcabala / Mantenimiento' : 'Alcabala Diaria';
      _selectedPaymentMethod = 'EFECTIVO';
    });

    final offlinePaidObs = await LocalDatabase.instance.getOfflinePaidObligationIds(merchant['id'].toString());

    try {
      final res = await ApiClient().dio.get('/obligations/merchant/${merchant['id']}/pending');
      final data = res.data;
      if (data['pendingObligations'] != null && (data['pendingObligations'] as List).isNotEmpty) {
        await LocalDatabase.instance.cacheObligations(data['pendingObligations']);
      }
      if (mounted) {
        setState(() {
          final List<dynamic> rawObs = data['pendingObligations'] ?? [];
          // Filtrar obligaciones que ya se cobraron en este dispositivo
          _pendingObligations = rawObs.where((o) => !offlinePaidObs.contains(o['id'].toString())).toList();
          _isUpToDate = data['isUpToDate'] == true || (rawObs.isNotEmpty && _pendingObligations.isEmpty);
          _statusMessage = _isUpToDate && _pendingObligations.isEmpty && offlinePaidObs.isNotEmpty
              ? '¡AL DÍA! Pagos registrados en este dispositivo (cola local)'
              : (data['statusMessage'] ?? '');
          _recentlyPaid = data['recentlyPaid'] ?? [];

          // Seleccionar todas las obligaciones pendientes por defecto
          _selectedObligationIds.clear();
          double totalAmt = 0.0;
          for (final ob in _pendingObligations) {
            _selectedObligationIds.add(ob['id'].toString());
            totalAmt += (num.tryParse(ob['amount'].toString()) ?? 0).toDouble();
          }

          if (_pendingObligations.isNotEmpty) {
            _currentAmount = totalAmt;
            final firstOb = _pendingObligations.first;
            final firstConcept = (firstOb['conceptName'] ?? firstOb['concept']?['name'] ?? firstOb['concept_name'] ?? 'Cuota').toString();
            _selectedConceptName = _pendingObligations.length == 1
                ? firstConcept
                : 'Pagos Programados (${_pendingObligations.length})';
          }
        });
      }
    } catch (_) {
      // Fallback offline: consultar SQLite local o generar deudas por defecto
      final localObs = await LocalDatabase.instance.getMerchantPendingObligations(merchant['id'].toString());
      final filteredLocal = localObs.where((o) => !offlinePaidObs.contains(o['id'].toString())).toList();

      if (mounted) {
        setState(() {
          if (filteredLocal.isNotEmpty) {
            _isUpToDate = false;
            _statusMessage = 'Registra ${filteredLocal.length} cuota(s) pendiente(s) (Modo Local)';
            _pendingObligations = filteredLocal;
          } else if (offlinePaidObs.isNotEmpty) {
            _isUpToDate = true;
            _statusMessage = '¡AL DÍA! Pagos registrados en este dispositivo (cola local)';
            _pendingObligations = [];
          } else {
            // Generar cuotas pendientes reales de acuerdo al tipo de comerciante
            _isUpToDate = false;
            _statusMessage = 'Deudas programadas vigentes (Modo Local)';
            _pendingObligations = isSocio
                ? [
                    {
                      'id': 'off-ob-socio-mantenimiento',
                      'conceptId': 'con-mantenimiento',
                      'conceptName': 'Cuota Alcabala / Mantenimiento',
                      'period': DateFormat('yyyy-MM').format(DateTime.now()),
                      'amount': 10.00,
                    },
                    {
                      'id': 'off-ob-socio-agua',
                      'conceptId': 'con-agua',
                      'conceptName': 'Cuota Mensual de Agua',
                      'period': DateFormat('yyyy-MM').format(DateTime.now()),
                      'amount': 6.00,
                    },
                  ]
                : [
                    {
                      'id': 'off-ob-ambulante-alcabala',
                      'conceptId': 'con-alcabala',
                      'conceptName': 'Alcabala Diaria',
                      'period': DateFormat('yyyy-MM-dd').format(DateTime.now()),
                      'amount': 3.00,
                    },
                  ];
          }

          _selectedObligationIds.clear();
          double totalAmt = 0.0;
          for (final ob in _pendingObligations) {
            _selectedObligationIds.add(ob['id'].toString());
            totalAmt += (num.tryParse(ob['amount'].toString()) ?? 0).toDouble();
          }

          _currentAmount = totalAmt;
          if (_pendingObligations.isNotEmpty) {
            final firstOb = _pendingObligations.first;
            final firstConcept = (firstOb['conceptName'] ?? firstOb['concept']?['name'] ?? firstOb['concept_name'] ?? 'Cuota').toString();
            _selectedConceptName = _pendingObligations.length == 1
                ? firstConcept
                : 'Pagos Programados (${_pendingObligations.length})';
          }
        });
      }
    } finally {
      if (mounted) setState(() => _isLoadingObligations = false);
    }
  }

  void _toggleObligation(Map<String, dynamic> ob) {
    final id = ob['id'].toString();
    setState(() {
      if (_selectedObligationIds.contains(id)) {
        _selectedObligationIds.remove(id);
      } else {
        _selectedObligationIds.add(id);
      }
      _recalculateSelectedAmount();
    });
  }

  void _recalculateSelectedAmount() {
    double total = 0.0;
    for (final ob in _pendingObligations) {
      if (_selectedObligationIds.contains(ob['id'].toString())) {
        total += (num.tryParse(ob['amount'].toString()) ?? 0).toDouble();
      }
    }
    _currentAmount = total;
    if (_selectedObligationIds.length == 1) {
      final sel = _pendingObligations.firstWhere((o) => o['id'].toString() == _selectedObligationIds.first);
      _selectedConceptName = (sel['conceptName'] ?? sel['concept']?['name'] ?? sel['concept_name'] ?? 'Pago').toString();
    } else if (_selectedObligationIds.length > 1) {
      _selectedConceptName = 'Pagos Programados (${_selectedObligationIds.length})';
    }
  }

  Future<void> _openRealCameraScanner() async {
    final scannedCode = await RealQrScannerSheet.scan(
      context,
      title: 'Escanear Credencial del Pagador',
    );

    if (scannedCode != null && scannedCode.isNotEmpty) {
      _processQrCode(scannedCode);
    }
  }

  Future<void> _processQrCode(String rawCode) async {
    final code = rawCode.trim();
    if (code.isEmpty) return;

    Map<String, dynamic>? merchant = await LocalDatabase.instance.findMerchantByQr(code);

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
            content: Text('Comerciante identificado: ${merchant['lastName']}, ${merchant['firstName']}'),
          ),
        );
      }
    } else {
      if (mounted) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(
            backgroundColor: Colors.redAccent,
            content: Text('Código "$code" no corresponde a ningún comerciante en el padrón.'),
          ),
        );
      }
    }
  }

  Future<void> _confirmPayment() async {
    if (_selectedMerchant == null) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Por favor identifique o seleccione a un comerciante primero.')),
      );
      return;
    }

    if (!_forceExtraordinaryPayment && _isUpToDate) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(
          backgroundColor: AppTheme.primary,
          content: Text('El comerciante ya se encuentra al día. Cobro duplicado prevenido.'),
        ),
      );
      return;
    }

    if (_currentAmount <= 0) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Seleccione al menos una obligación o ingrese un monto mayor a 0.')),
      );
      return;
    }

    setState(() => _isSubmitting = true);
    final now = DateTime.now();
    final nowIso = now.toIso8601String();
    final fName = (_selectedMerchant!['firstName'] ?? _selectedMerchant!['first_name'] ?? '').toString();
    final lName = (_selectedMerchant!['lastName'] ?? _selectedMerchant!['last_name'] ?? '').toString();
    final merchantName = lName.isNotEmpty ? '$lName, $fName' : fName;

    final selectedObs = _pendingObligations
        .where((o) => _selectedObligationIds.contains(o['id'].toString()))
        .toList();

    Map<String, dynamic>? lastPaymentResult;
    bool syncedSuccessfully = false;

    try {
      if (selectedObs.isNotEmpty && !_forceExtraordinaryPayment) {
        // Pagar cada obligación seleccionada
        for (final ob in selectedObs) {
          final idempotencyKey = const Uuid().v4();
          final obAmt = (num.tryParse(ob['amount'].toString()) ?? 0).toDouble();
          final conceptId = (ob['conceptId'] ?? ob['concept_id'] ?? ob['concept']?['id'] ?? 'concept-default').toString();
          final conceptName = (ob['conceptName'] ?? ob['concept']?['name'] ?? ob['concept_name'] ?? 'Pago').toString();
          final period = (ob['period'] ?? DateFormat('yyyy-MM-dd').format(now)).toString();

          // 1. Guardar en SQLite local
          final localRow = {
            'idempotency_key': idempotencyKey,
            'merchant_id': _selectedMerchant!['id'],
            'merchant_name': merchantName,
            'concept_id': conceptId,
            'concept_name': conceptName,
            'obligation_id': ob['id'],
            'amount': obAmt,
            'period': period,
            'payment_method': _selectedPaymentMethod,
            'created_at': nowIso,
            'sync_status': 'PENDIENTE',
          };
          await LocalDatabase.instance.insertOfflinePayment(localRow);
          await LocalDatabase.instance.markObligationAsPaidLocal(ob['id'].toString());

          // 2. Enviar al backend si hay conexión
          try {
            final res = await ApiClient().dio.post(
              '/payments',
              data: {
                'merchantId': _selectedMerchant!['id'],
                'conceptId': conceptId,
                'obligationId': ob['id'],
                'amount': obAmt,
                'period': period,
                'paymentMethod': _selectedPaymentMethod,
                'idempotencyKey': idempotencyKey,
              },
            );
            lastPaymentResult = res.data['payment'];
            syncedSuccessfully = true;
            await LocalDatabase.instance.updatePaymentSyncStatus(idempotencyKey, 'SINCRONIZADO');
          } catch (_) {}
        }
      } else {
        // Pago extraordinario único
        final idempotencyKey = const Uuid().v4();
        final period = DateFormat('yyyy-MM-dd').format(now);
        final localRow = {
          'idempotency_key': idempotencyKey,
          'merchant_id': _selectedMerchant!['id'],
          'merchant_name': merchantName,
          'concept_id': 'concept-extra',
          'concept_name': _selectedConceptName,
          'obligation_id': null,
          'amount': _currentAmount,
          'period': period,
          'payment_method': _selectedPaymentMethod,
          'created_at': nowIso,
          'sync_status': 'PENDIENTE',
        };
        await LocalDatabase.instance.insertOfflinePayment(localRow);

        try {
          final res = await ApiClient().dio.post(
            '/payments',
            data: {
              'merchantId': _selectedMerchant!['id'],
              'conceptId': 'concept-extra',
              'amount': _currentAmount,
              'period': period,
              'paymentMethod': _selectedPaymentMethod,
              'idempotencyKey': idempotencyKey,
            },
          );
          lastPaymentResult = res.data['payment'];
          syncedSuccessfully = true;
          await LocalDatabase.instance.updatePaymentSyncStatus(idempotencyKey, 'SINCRONIZADO');
        } catch (_) {}
      }
    } finally {
      if (mounted) {
        setState(() {
          _isSubmitting = false;
          _isUpToDate = true;
          _statusMessage = '¡AL DÍA! Pagos registrados exitosamente.';
          _pendingObligations = [];
          _selectedObligationIds.clear();
        });
      }
    }

    final opNumber = 'REC-${now.year}${now.month.toString().padLeft(2, '0')}${now.day.toString().padLeft(2, '0')}-${const Uuid().v4().substring(0, 5).toUpperCase()}';

    if (mounted) {
      Navigator.pushReplacement(
        context,
        MaterialPageRoute(
          builder: (_) => ComprobanteScreen(
            payment: lastPaymentResult ?? {
              'operationNumber': opNumber,
              'merchant': _selectedMerchant,
              'concept': {'name': _selectedConceptName},
              'amount': _currentAmount,
              'period': DateFormat('yyyy-MM-dd').format(now),
              'paymentMethod': _selectedPaymentMethod,
              'paidAt': nowIso,
              'isOffline': !syncedSuccessfully,
            },
          ),
        ),
      );
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
    final isSocio = (_selectedMerchant?['merchantType']?['name'] ?? _selectedMerchant?['type_name'] ?? '').toString().contains('Socio');

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text(
          'REGISTRAR COBRO',
          style: TextStyle(fontWeight: FontWeight.w900, fontSize: 15),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // 1. Botón de Cámara Real Escáner QR
            ElevatedButton.icon(
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.primary,
                padding: const EdgeInsets.symmetric(vertical: 16),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                elevation: 2,
              ),
              icon: const Icon(Icons.qr_code_scanner, color: Colors.white, size: 24),
              label: const Text(
                'ESCANEAR CREDENCIAL QR',
                style: TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 13, letterSpacing: 0.8),
              ),
              onPressed: _openRealCameraScanner,
            ),
            const SizedBox(height: 14),

            // 2. Buscador en padrón
            TextField(
              controller: _searchController,
              decoration: InputDecoration(
                hintText: 'Buscar por DNI, Nombres o Puesto...',
                hintStyle: const TextStyle(fontSize: 12, color: Colors.black38),
                prefixIcon: const Icon(Icons.search, size: 20, color: Colors.black45),
                suffixIcon: _isSearching
                    ? const Padding(
                        padding: EdgeInsets.all(12),
                        child: SizedBox(
                          width: 16,
                          height: 16,
                          child: CircularProgressIndicator(strokeWidth: 2, color: AppTheme.primary),
                        ),
                      )
                    : _searchController.text.isNotEmpty
                        ? IconButton(
                            icon: const Icon(Icons.clear, size: 18),
                            onPressed: () {
                              _searchController.clear();
                              setState(() {
                                _searchResults = [];
                                _selectedMerchant = null;
                                _isUpToDate = false;
                                _pendingObligations = [];
                              });
                            },
                          )
                        : null,
                contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
                filled: true,
                fillColor: Colors.white,
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(14),
                  borderSide: const BorderSide(color: Color(0xFFE2E8F0)),
                ),
              ),
              onChanged: _search,
            ),

            // Resultados de búsqueda
            if (_searchResults.isNotEmpty)
              Container(
                margin: const EdgeInsets.only(top: 6),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(14),
                  border: Border.all(color: const Color(0xFFE2E8F0)),
                  boxShadow: [
                    BoxShadow(color: Colors.black.withOpacity(0.05), blurRadius: 10),
                  ],
                ),
                child: ListView.separated(
                  shrinkWrap: true,
                  physics: const NeverScrollableScrollPhysics(),
                  itemCount: _searchResults.length > 5 ? 5 : _searchResults.length,
                  separatorBuilder: (ctx, i) => const Divider(height: 1),
                  itemBuilder: (context, idx) {
                    final m = _searchResults[idx];
                    final stall = (m['stall']?['code'] ?? m['stall_code'] ?? 'Ambulante').toString();
                    return ListTile(
                      dense: true,
                      leading: const Icon(Icons.person, color: AppTheme.primary),
                      title: Text('${m['lastName']}, ${m['firstName']}', style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                      subtitle: Text('DNI: ${m['dni']} • Pto: $stall', style: const TextStyle(fontSize: 11)),
                      trailing: const Icon(Icons.chevron_right, size: 18),
                      onTap: () => _selectMerchant(m),
                    );
                  },
                ),
              ),
            const SizedBox(height: 18),

            // 3. Tarjeta de Comerciante Seleccionado
            if (_selectedMerchant != null) ...[
              Row(
                children: const [
                  Icon(Icons.badge_outlined, color: AppTheme.primary, size: 18),
                  SizedBox(width: 6),
                  Text(
                    'COMERCIANTE SELECCIONADO',
                    style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.black54, letterSpacing: 0.8),
                  ),
                ],
              ),
              const SizedBox(height: 8),
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(18),
                  border: Border.all(color: const Color(0xFFE2E8F0)),
                  boxShadow: [
                    BoxShadow(color: Colors.black.withOpacity(0.03), blurRadius: 8),
                  ],
                ),
                child: Builder(
                  builder: (context) {
                    final fName = (_selectedMerchant!['firstName'] ?? _selectedMerchant!['first_name'] ?? '').toString();
                    final lName = (_selectedMerchant!['lastName'] ?? _selectedMerchant!['last_name'] ?? '').toString();
                    final initials = (fName.isNotEmpty ? fName[0] : '') + (lName.isNotEmpty ? lName[0] : '');
                    final fullName = lName.isNotEmpty ? '$lName, $fName' : fName;

                    return Column(
                      children: [
                        Row(
                          children: [
                            CircleAvatar(
                              radius: 24,
                              backgroundColor: AppTheme.primary,
                              child: Text(
                                initials.toUpperCase().isEmpty ? 'MB' : initials.toUpperCase(),
                                style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 15),
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    fullName,
                                    style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 14, color: Color(0xFF0F172A)),
                                  ),
                                  const SizedBox(height: 2),
                                  Text(
                                    'DNI ${_selectedMerchant!['dni']} • Pto. ${_selectedMerchant!['stall']?['code'] ?? _selectedMerchant!['stall_code'] ?? 'Ambulante'} (${_selectedMerchant!['businessCategory'] ?? _selectedMerchant!['business_category'] ?? 'Giro'})',
                                    style: const TextStyle(fontSize: 11, color: Colors.black54),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                        const SizedBox(height: 12),
                        Row(
                          children: [
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                              decoration: BoxDecoration(
                                color: isSocio ? Colors.green.shade50 : Colors.amber.shade50,
                                borderRadius: BorderRadius.circular(8),
                                border: Border.all(color: isSocio ? Colors.green.shade200 : Colors.amber.shade200),
                              ),
                              child: Text(
                                isSocio ? '🏛️ SOCIO TITULAR (COBRO MENSUAL)' : '🛒 AMBULANTE (COBRO DIARIO)',
                                style: TextStyle(
                                  fontSize: 10,
                                  fontWeight: FontWeight.bold,
                                  color: isSocio ? Colors.green.shade900 : Colors.amber.shade900,
                                ),
                              ),
                            ),
                          ],
                        ),
                      ],
                    );
                  },
                ),
              ),
              const SizedBox(height: 18),

              // Indicador de carga de obligaciones
              if (_isLoadingObligations) ...[
                const Padding(
                  padding: EdgeInsets.all(24),
                  child: Center(child: CircularProgressIndicator(color: AppTheme.primary)),
                ),
              ] else if (_isUpToDate && !_forceExtraordinaryPayment) ...[
                // ==========================================
                // BANNER: COMERCIANTE AL DÍA (PREVENCIÓN DOBLE COBRO)
                // ==========================================
                Container(
                  padding: const EdgeInsets.all(20),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(20),
                    border: Border.all(color: Colors.green.shade300, width: 2),
                    boxShadow: [
                      BoxShadow(color: Colors.green.withOpacity(0.08), blurRadius: 14, offset: const Offset(0, 4)),
                    ],
                  ),
                  child: Column(
                    children: [
                      CircleAvatar(
                        radius: 30,
                        backgroundColor: Colors.green.shade50,
                        child: const Icon(Icons.check_circle, color: AppTheme.primary, size: 40),
                      ),
                      const SizedBox(height: 12),
                      const Text(
                        '¡COMERCIANTE AL DÍA!',
                        style: TextStyle(fontSize: 16, fontWeight: FontWeight.w900, color: AppTheme.primaryDark),
                      ),
                      const SizedBox(height: 6),
                      Text(
                        _statusMessage.isNotEmpty
                            ? _statusMessage
                            : 'No registra obligaciones ni cuotas pendientes para este período.',
                        textAlign: TextAlign.center,
                        style: const TextStyle(fontSize: 12, color: Colors.black87, fontWeight: FontWeight.w500),
                      ),
                      const SizedBox(height: 14),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                        decoration: BoxDecoration(
                          color: const Color(0xFFF1F5F9),
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: Row(
                          children: const [
                            Icon(Icons.shield_outlined, size: 16, color: AppTheme.primary),
                            SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                'El cobro duplicado está bloqueado automáticamente.',
                                style: TextStyle(fontSize: 11, color: Colors.black54, fontWeight: FontWeight.bold),
                              ),
                            ),
                          ],
                        ),
                      ),
                      if (_recentlyPaid.isNotEmpty) ...[
                        const SizedBox(height: 14),
                        const Align(
                          alignment: Alignment.centerLeft,
                          child: Text('Últimos pagos registrados hoy/mes:', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.black54)),
                        ),
                        const SizedBox(height: 6),
                        ..._recentlyPaid.map((p) => Padding(
                              padding: const EdgeInsets.symmetric(vertical: 2),
                              child: Row(
                                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                children: [
                                  Text('• ${p['concept']?['name'] ?? 'Pago'}', style: const TextStyle(fontSize: 11, color: Colors.black87)),
                                  Text(_formatMoney(p['amount']), style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppTheme.primary)),
                                ],
                              ),
                            )),
                      ],
                      const SizedBox(height: 16),
                      TextButton.icon(
                        style: TextButton.styleFrom(foregroundColor: Colors.grey.shade700),
                        icon: const Icon(Icons.add_circle_outline, size: 16),
                        label: const Text('¿Registrar cobro extraordinario o adelanto?', style: TextStyle(fontSize: 11, decoration: TextDecoration.underline)),
                        onPressed: () => setState(() => _forceExtraordinaryPayment = true),
                      ),
                    ],
                  ),
                ),
              ] else ...[
                // ==========================================
                // SECCIÓN: OBLIGACIONES PROGRAMADAS PENDIENTES
                // ==========================================
                if (_pendingObligations.isNotEmpty && !_forceExtraordinaryPayment) ...[
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text(
                        'PAGOS PROGRAMADOS PENDIENTES',
                        style: TextStyle(fontSize: 11, fontWeight: FontWeight.w900, color: Colors.grey, letterSpacing: 0.8),
                      ),
                      Text(
                        '${_selectedObligationIds.length} seleccionados',
                        style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppTheme.primary),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  ..._pendingObligations.map((ob) {
                    final id = ob['id'].toString();
                    final isSelected = _selectedObligationIds.contains(id);
                    final amt = (num.tryParse(ob['amount'].toString()) ?? 0).toDouble();
                    final conceptName = (ob['conceptName'] ?? ob['concept']?['name'] ?? ob['concept_name'] ?? 'Cuota Programada').toString();
                    final period = ob['period'] ?? '';

                    return InkWell(
                      onTap: () => _toggleObligation(ob),
                      borderRadius: BorderRadius.circular(14),
                      child: Container(
                        margin: const EdgeInsets.only(bottom: 8),
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: isSelected ? Colors.green.shade50.withOpacity(0.5) : Colors.white,
                          borderRadius: BorderRadius.circular(14),
                          border: Border.all(
                            color: isSelected ? AppTheme.primary : const Color(0xFFE2E8F0),
                            width: isSelected ? 1.5 : 1,
                          ),
                        ),
                        child: Row(
                          children: [
                            Checkbox(
                              value: isSelected,
                              activeColor: AppTheme.primary,
                              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(4)),
                              onChanged: (_) => _toggleObligation(ob),
                            ),
                            const SizedBox(width: 6),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(conceptName, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                                  Text('Período: $period', style: const TextStyle(fontSize: 11, color: Colors.black54)),
                                ],
                              ),
                            ),
                            Text(
                              _formatMoney(amt),
                              style: TextStyle(
                                fontWeight: FontWeight.w900,
                                fontSize: 14,
                                color: isSelected ? AppTheme.primary : Colors.black87,
                              ),
                            ),
                          ],
                        ),
                      ),
                    );
                  }),
                  const SizedBox(height: 12),
                ],

                // Formulario Extraordinario si se fuerza
                if (_forceExtraordinaryPayment) ...[
                  Container(
                    padding: const EdgeInsets.all(16),
                    decoration: BoxDecoration(
                      color: Colors.amber.shade50.withOpacity(0.5),
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: Colors.amber.shade300),
                    ),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Row(
                          mainAxisAlignment: MainAxisAlignment.spaceBetween,
                          children: [
                            const Text('COBRO EXTRAORDINARIO / ADELANTO', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.amber)),
                            InkWell(
                              onTap: () => setState(() => _forceExtraordinaryPayment = false),
                              child: const Icon(Icons.close, size: 18, color: Colors.black54),
                            ),
                          ],
                        ),
                        const SizedBox(height: 8),
                        DropdownButtonFormField<String>(
                          value: _selectedConceptName,
                          decoration: const InputDecoration(
                            border: OutlineInputBorder(),
                            contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                          ),
                          items: const [
                            DropdownMenuItem(value: 'Alcabala Diaria', child: Text('Alcabala Diaria')),
                            DropdownMenuItem(value: 'Cuota Social Mensual', child: Text('Cuota Social Mensual')),
                            DropdownMenuItem(value: 'Servicio de Agua Potable', child: Text('Servicio de Agua Potable')),
                            DropdownMenuItem(value: 'Multa de Asamblea', child: Text('Multa de Asamblea')),
                            DropdownMenuItem(value: 'Otro Ingreso', child: Text('Otro Ingreso')),
                          ],
                          onChanged: (val) {
                            if (val != null) setState(() => _selectedConceptName = val);
                          },
                        ),
                        const SizedBox(height: 12),
                        Wrap(
                          spacing: 8,
                          children: _quickAmounts.map((amt) {
                            final isSel = _currentAmount == amt;
                            return ChoiceChip(
                              label: Text(_formatMoney(amt), style: TextStyle(fontSize: 11, fontWeight: isSel ? FontWeight.bold : FontWeight.normal)),
                              selected: isSel,
                              selectedColor: AppTheme.primary.withOpacity(0.15),
                              labelStyle: TextStyle(color: isSel ? AppTheme.primary : const Color(0xFF475569)),
                              onSelected: (_) => setState(() => _currentAmount = amt),
                            );
                          }).toList(),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(height: 14),
                ],

                // Método de pago (Efectivo por defecto)
                Container(
                  padding: const EdgeInsets.all(16),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(18),
                    border: Border.all(color: const Color(0xFFE2E8F0)),
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('MÉTODO DE PAGO (PREDETERMINADO: EFECTIVO)', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.black54)),
                      const SizedBox(height: 10),
                      Row(
                        children: [
                          _paymentMethodChip('EFECTIVO', '💵 Efectivo'),
                          const SizedBox(width: 8),
                          _paymentMethodChip('YAPE', '🟣 Yape'),
                          const SizedBox(width: 8),
                          _paymentMethodChip('PLIN', '🔵 Plin'),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 20),

                // Botón Gigante de Cobro
                SizedBox(
                  height: 54,
                  child: ElevatedButton(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: _currentAmount > 0 ? AppTheme.primary : Colors.grey,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                      elevation: 3,
                    ),
                    onPressed: (_isSubmitting || _currentAmount <= 0) ? null : _confirmPayment,
                    child: _isSubmitting
                        ? const CircularProgressIndicator(color: Colors.white, strokeWidth: 2)
                        : Text(
                            'CONFIRMAR COBRO • ${_formatMoney(_currentAmount)}',
                            style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 14, letterSpacing: 0.8),
                          ),
                  ),
                ),
              ],
            ],
          ],
        ),
      ),
    );
  }

  Widget _paymentMethodChip(String method, String label) {
    final isSelected = _selectedPaymentMethod == method;
    return Expanded(
      child: InkWell(
        onTap: () => setState(() => _selectedPaymentMethod = method),
        borderRadius: BorderRadius.circular(12),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 10),
          decoration: BoxDecoration(
            color: isSelected ? AppTheme.primary.withOpacity(0.12) : const Color(0xFFF1F5F9),
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: isSelected ? AppTheme.primary : const Color(0xFFCBD5E1),
              width: isSelected ? 2 : 1,
            ),
          ),
          child: Center(
            child: Text(
              label,
              style: TextStyle(
                fontSize: 11,
                fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
                color: isSelected ? AppTheme.primary : const Color(0xFF0F172A),
              ),
            ),
          ),
        ),
      ),
    );
  }
}