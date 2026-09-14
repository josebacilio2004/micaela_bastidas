import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../../core/network/api_client.dart';
import '../../../core/theme/app_theme.dart';

class CajaScreen extends StatefulWidget {
  const CajaScreen({super.key});

  @override
  State<CajaScreen> createState() => _CajaScreenState();
}

class _CajaScreenState extends State<CajaScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  Map<String, dynamic>? _currentRegister;
  Map<String, dynamic>? _summary;
  Map<String, dynamic>? _consolidated;
  bool _isLoading = true;
  bool _isSubmitting = false;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _loadAll();
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  Future<void> _loadAll() async {
    setState(() => _isLoading = true);
    await Future.wait([
      _fetchCaja(),
      _fetchConsolidated(),
    ]);
    if (mounted) setState(() => _isLoading = false);
  }

  Future<void> _fetchCaja() async {
    try {
      final res = await ApiClient().dio.get('/cash-registers/current');
      _currentRegister = res.data;
      if (_currentRegister != null) {
        final sumRes = await ApiClient().dio.get('/cash-registers/${_currentRegister!['id']}/summary');
        _summary = sumRes.data;
      } else {
        _summary = null;
      }
    } catch (_) {
      _currentRegister = null;
      _summary = null;
    }
  }

  Future<void> _fetchConsolidated() async {
    try {
      final res = await ApiClient().dio.get('/cash-registers/daily-consolidated');
      _consolidated = res.data;
    } catch (_) {
      _consolidated = null;
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

  // ==========================================
  // APERTURA DE CAJA
  // ==========================================
  void _showOpenRegisterDialog() {
    final nameCtrl = TextEditingController(text: 'Caja General - Cobranza del Día');
    final notesCtrl = TextEditingController();
    double openingAmount = 50.0;
    final presets = [0.0, 20.0, 50.0, 100.0, 200.0];

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setModalState) => Container(
          padding: EdgeInsets.only(
            top: 20,
            left: 20,
            right: 20,
            bottom: MediaQuery.of(context).viewInsets.bottom + 20,
          ),
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(color: Colors.grey.shade300, borderRadius: BorderRadius.circular(2)),
                ),
              ),
              const SizedBox(height: 14),
              Row(
                children: const [
                  Icon(Icons.add_card, color: AppTheme.primary, size: 22),
                  SizedBox(width: 8),
                  Text('APERTURA DE CAJA DIARIA', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w900, color: Color(0xFF0F172A))),
                ],
              ),
              const SizedBox(height: 14),
              const Text('Servicio o Tipo de Caja', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.black54)),
              const SizedBox(height: 6),
              DropdownButtonFormField<String>(
                value: nameCtrl.text,
                decoration: InputDecoration(
                  contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                ),
                items: const [
                  DropdownMenuItem(value: 'Caja General - Cobranza del Día', child: Text('Caja General (Alcabala y Servicios)')),
                  DropdownMenuItem(value: 'Caja Alcabala / Cuotas Sociales', child: Text('Caja Alcabala / Cuotas')),
                  DropdownMenuItem(value: 'Caja Servicio de Agua Potable', child: Text('Caja Servicio de Agua')),
                  DropdownMenuItem(value: 'Caja Servicios Higiénicos', child: Text('Caja Servicios Higiénicos')),
                ],
                onChanged: (v) {
                  if (v != null) setModalState(() => nameCtrl.text = v);
                },
              ),
              const SizedBox(height: 14),
              const Text('Monto de Apertura en Sencillo (para vueltos)', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.black54)),
              const SizedBox(height: 8),
              Wrap(
                spacing: 8,
                children: presets.map((p) {
                  final isSel = openingAmount == p;
                  return ChoiceChip(
                    label: Text(_formatMoney(p), style: TextStyle(fontWeight: isSel ? FontWeight.bold : FontWeight.normal, fontSize: 12)),
                    selected: isSel,
                    selectedColor: AppTheme.primary.withOpacity(0.15),
                    labelStyle: TextStyle(color: isSel ? AppTheme.primary : Colors.black87),
                    onSelected: (_) => setModalState(() => openingAmount = p),
                  );
                }).toList(),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: notesCtrl,
                decoration: InputDecoration(
                  labelText: 'Observaciones de apertura (opcional)',
                  contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                ),
              ),
              const SizedBox(height: 20),
              ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.primary,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                onPressed: _isSubmitting
                    ? null
                    : () async {
                        Navigator.pop(ctx);
                        await _submitOpenRegister(nameCtrl.text, openingAmount, notesCtrl.text);
                      },
                child: const Text('CONFIRMAR APERTURA', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _submitOpenRegister(String name, double openingAmount, String notes) async {
    setState(() => _isSubmitting = true);
    try {
      await ApiClient().dio.post(
        '/cash-registers/open',
        data: {
          'name': name,
          'openingAmount': openingAmount,
          'notes': notes,
        },
      );
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(backgroundColor: AppTheme.primary, content: Text('Caja abierta correctamente con éxito.')),
      );
      await _loadAll();
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(backgroundColor: Colors.redAccent, content: Text('Error al abrir caja: ${e.toString()}')),
      );
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  // ==========================================
  // REGISTRAR MOVIMIENTO (INGRESO / EGRESO)
  // ==========================================
  void _showMovementDialog() {
    if (_currentRegister == null) return;
    String type = 'EGRESO';
    final amountCtrl = TextEditingController();
    final descCtrl = TextEditingController();

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setModalState) => Container(
          padding: EdgeInsets.only(
            top: 20,
            left: 20,
            right: 20,
            bottom: MediaQuery.of(context).viewInsets.bottom + 20,
          ),
          decoration: const BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
          ),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(color: Colors.grey.shade300, borderRadius: BorderRadius.circular(2)),
                ),
              ),
              const SizedBox(height: 14),
              const Text('REGISTRAR MOVIMIENTO EXTRAORDINARIO', style: TextStyle(fontSize: 15, fontWeight: FontWeight.w900, color: Color(0xFF0F172A))),
              const SizedBox(height: 14),
              Row(
                children: [
                  Expanded(
                    child: InkWell(
                      onTap: () => setModalState(() => type = 'EGRESO'),
                      borderRadius: BorderRadius.circular(10),
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 10),
                        decoration: BoxDecoration(
                          color: type == 'EGRESO' ? Colors.red.shade50 : Colors.grey.shade100,
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: type == 'EGRESO' ? Colors.red : Colors.transparent),
                        ),
                        child: Center(
                          child: Text('🔴 EGRESO / GASTO', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: type == 'EGRESO' ? Colors.red : Colors.black54)),
                        ),
                      ),
                    ),
                  ),
                  const SizedBox(width: 10),
                  Expanded(
                    child: InkWell(
                      onTap: () => setModalState(() => type = 'INGRESO'),
                      borderRadius: BorderRadius.circular(10),
                      child: Container(
                        padding: const EdgeInsets.symmetric(vertical: 10),
                        decoration: BoxDecoration(
                          color: type == 'INGRESO' ? Colors.green.shade50 : Colors.grey.shade100,
                          borderRadius: BorderRadius.circular(10),
                          border: Border.all(color: type == 'INGRESO' ? Colors.green : Colors.transparent),
                        ),
                        child: Center(
                          child: Text('🟢 INGRESO EXTRA', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12, color: type == 'INGRESO' ? Colors.green : Colors.black54)),
                        ),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 14),
              TextField(
                controller: amountCtrl,
                keyboardType: const TextInputType.numberWithOptions(decimal: true),
                decoration: InputDecoration(
                  labelText: 'Monto (S/.)',
                  prefixText: 'S/ ',
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                ),
              ),
              const SizedBox(height: 12),
              TextField(
                controller: descCtrl,
                decoration: InputDecoration(
                  labelText: 'Motivo o justificación (ej. Compra de bolsas, útiles)',
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                ),
              ),
              const SizedBox(height: 20),
              ElevatedButton(
                style: ElevatedButton.styleFrom(
                  backgroundColor: type == 'EGRESO' ? Colors.red.shade700 : AppTheme.primary,
                  padding: const EdgeInsets.symmetric(vertical: 14),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                ),
                onPressed: () async {
                  final amt = double.tryParse(amountCtrl.text.trim()) ?? 0;
                  if (amt <= 0 || descCtrl.text.trim().isEmpty) {
                    ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Ingrese un monto válido y motivo.')));
                    return;
                  }
                  Navigator.pop(ctx);
                  await _submitMovement(type, amt, descCtrl.text.trim());
                },
                child: const Text('GUARDAR MOVIMIENTO', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Future<void> _submitMovement(String type, double amount, String description) async {
    setState(() => _isSubmitting = true);
    try {
      await ApiClient().dio.post(
        '/cash-registers/${_currentRegister!['id']}/movement',
        data: {
          'type': type,
          'amount': amount,
          'description': description,
        },
      );
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(backgroundColor: AppTheme.primary, content: Text('Movimiento registrado correctamente.')),
      );
      await _loadAll();
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(backgroundColor: Colors.redAccent, content: Text('Error al registrar movimiento: ${e.toString()}')),
      );
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  // ==========================================
  // ARQUEO Y CIERRE DE CAJA
  // ==========================================
  void _showArqueoCierreDialog() {
    if (_currentRegister == null || _summary == null) return;
    final expectedCash = (_summary!['expectedCash'] as num?)?.toDouble() ?? 0.0;
    final countedCtrl = TextEditingController(text: expectedCash.toStringAsFixed(2));
    final justifCtrl = TextEditingController();
    double countedCash = expectedCash;

    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (ctx) => StatefulBuilder(
        builder: (context, setModalState) {
          final diff = countedCash - expectedCash;
          final isExact = (diff.abs() < 0.01);
          final isOver = diff > 0.01;

          return Container(
            padding: EdgeInsets.only(
              top: 20,
              left: 20,
              right: 20,
              bottom: MediaQuery.of(context).viewInsets.bottom + 20,
            ),
            decoration: const BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.vertical(top: Radius.circular(24)),
            ),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.stretch,
              children: [
                Center(
                  child: Container(
                    width: 40,
                    height: 4,
                    decoration: BoxDecoration(color: Colors.grey.shade300, borderRadius: BorderRadius.circular(2)),
                  ),
                ),
                const SizedBox(height: 14),
                Row(
                  children: const [
                    Icon(Icons.lock_clock, color: Colors.purple, size: 22),
                    SizedBox(width: 8),
                    Text('ARQUEO Y CIERRE DE TURNO', style: TextStyle(fontSize: 16, fontWeight: FontWeight.w900, color: Color(0xFF0F172A))),
                  ],
                ),
                const SizedBox(height: 16),
                Container(
                  padding: const EdgeInsets.all(14),
                  decoration: BoxDecoration(
                    color: const Color(0xFFF1F5F9),
                    borderRadius: BorderRadius.circular(14),
                    border: Border.all(color: const Color(0xFFCBD5E1)),
                  ),
                  child: Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      const Text('Efectivo Esperado en Gaveta:', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                      Text(_formatMoney(expectedCash), style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 16, color: AppTheme.primary)),
                    ],
                  ),
                ),
                const SizedBox(height: 14),
                TextField(
                  controller: countedCtrl,
                  keyboardType: const TextInputType.numberWithOptions(decimal: true),
                  decoration: InputDecoration(
                    labelText: 'Efectivo Físico Contado (S/.)',
                    prefixText: 'S/ ',
                    border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  onChanged: (v) {
                    setModalState(() {
                      countedCash = double.tryParse(v) ?? 0.0;
                    });
                  },
                ),
                const SizedBox(height: 12),
                Container(
                  padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                  decoration: BoxDecoration(
                    color: isExact ? Colors.green.shade50 : (isOver ? Colors.amber.shade50 : Colors.red.shade50),
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: isExact ? Colors.green.shade200 : (isOver ? Colors.amber.shade300 : Colors.red.shade200)),
                  ),
                  child: Row(
                    children: [
                      Icon(
                        isExact ? Icons.check_circle : (isOver ? Icons.warning_amber : Icons.error),
                        color: isExact ? Colors.green.shade700 : (isOver ? Colors.amber.shade800 : Colors.red.shade700),
                        size: 20,
                      ),
                      const SizedBox(width: 10),
                      Expanded(
                        child: Text(
                          isExact
                              ? 'CUADRE EXACTO: Sin diferencias'
                              : (isOver ? 'SOBRANTE: +${_formatMoney(diff)}' : 'FALTANTE: -${_formatMoney(diff.abs())}'),
                          style: TextStyle(
                            fontWeight: FontWeight.bold,
                            fontSize: 12,
                            color: isExact ? Colors.green.shade900 : (isOver ? Colors.amber.shade900 : Colors.red.shade900),
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                if (!isExact) ...[
                  const SizedBox(height: 12),
                  TextField(
                    controller: justifCtrl,
                    maxLines: 2,
                    decoration: InputDecoration(
                      labelText: 'Justificación obligatoria del descuadre *',
                      border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                    ),
                  ),
                ],
                const SizedBox(height: 20),
                ElevatedButton(
                  style: ElevatedButton.styleFrom(
                    backgroundColor: const Color(0xFF7C3AED),
                    padding: const EdgeInsets.symmetric(vertical: 14),
                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                  ),
                  onPressed: () async {
                    if (!isExact && justifCtrl.text.trim().isEmpty) {
                      ScaffoldMessenger.of(context).showSnackBar(
                        const SnackBar(content: Text('Debe ingresar la justificación obligatoria del descuadre.')),
                      );
                      return;
                    }
                    Navigator.pop(ctx);
                    await _submitCloseRegister(countedCash, justifCtrl.text.trim());
                  },
                  child: const Text('CONFIRMAR ARQUEO Y CERRAR', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                ),
              ],
            ),
          );
        },
      ),
    );
  }

  Future<void> _submitCloseRegister(double countedCash, String notes) async {
    setState(() => _isSubmitting = true);
    try {
      await ApiClient().dio.post(
        '/cash-registers/${_currentRegister!['id']}/close',
        data: {
          'closingAmount': countedCash,
          'notes': notes,
        },
      );
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(backgroundColor: AppTheme.primary, content: Text('Caja cerrada y arqueo completado exitosamente.')),
      );
      await _loadAll();
    } catch (e) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(backgroundColor: Colors.redAccent, content: Text('Error al cerrar caja: ${e.toString()}')),
      );
    } finally {
      if (mounted) setState(() => _isSubmitting = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text('CAJA Y ARQUEO DIARIO', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 15)),
        bottom: TabBar(
          controller: _tabController,
          labelColor: Colors.white,
          unselectedLabelColor: Colors.white60,
          indicatorColor: Colors.amber,
          indicatorWeight: 3,
          tabs: const [
            Tab(icon: Icon(Icons.point_of_sale, size: 18), text: 'MI CAJA'),
            Tab(icon: Icon(Icons.analytics, size: 18), text: 'CONSOLIDADO'),
          ],
        ),
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : TabBarView(
              controller: _tabController,
              children: [
                _buildMiCajaTab(),
                _buildConsolidadoTab(),
              ],
            ),
    );
  }

  // ==========================================
  // TAB 1: MI CAJA
  // ==========================================
  Widget _buildMiCajaTab() {
    if (_currentRegister == null) {
      return Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              Container(
                width: 80,
                height: 80,
                decoration: BoxDecoration(
                  color: Colors.amber.shade50,
                  shape: BoxShape.circle,
                  border: Border.all(color: Colors.amber.shade200, width: 2),
                ),
                child: const Icon(Icons.account_balance_wallet_outlined, size: 40, color: Colors.amber),
              ),
              const SizedBox(height: 18),
              const Text(
                'NO TIENES UNA CAJA ABIERTA',
                style: TextStyle(fontSize: 16, fontWeight: FontWeight.w900, color: Color(0xFF0F172A)),
              ),
              const SizedBox(height: 8),
              const Text(
                'Para registrar cobros y rendiciones en el mercado debes abrir tu turno con el sencillo inicial.',
                textAlign: TextAlign.center,
                style: TextStyle(fontSize: 12, color: Colors.black54),
              ),
              const SizedBox(height: 24),
              ElevatedButton.icon(
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.primary,
                  padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 14),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                  elevation: 2,
                ),
                icon: const Icon(Icons.add_card, color: Colors.white, size: 20),
                label: const Text('ABRIR CAJA DEL DÍA', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13)),
                onPressed: _showOpenRegisterDialog,
              ),
            ],
          ),
        ),
      );
    }

    final opening = (_summary?['openingAmount'] as num?)?.toDouble() ?? 0.0;
    final alcabala = (_summary?['alcabalaSum'] as num?)?.toDouble() ?? 0.0;
    final water = (_summary?['waterSum'] as num?)?.toDouble() ?? 0.0;
    final sanitary = (_summary?['sanitarySum'] as num?)?.toDouble() ?? 0.0;
    final other = (_summary?['otherSum'] as num?)?.toDouble() ?? 0.0;
    final totalCobrado = alcabala + water + sanitary + other;
    final extraIncome = (_summary?['extraIncome'] as num?)?.toDouble() ?? 0.0;
    final extraExpense = (_summary?['extraExpense'] as num?)?.toDouble() ?? 0.0;
    final expectedCash = (_summary?['expectedCash'] as num?)?.toDouble() ?? 0.0;

    return RefreshIndicator(
      onRefresh: _loadAll,
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Header Card
            Container(
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: const Color(0xFFE2E8F0)),
                boxShadow: [BoxShadow(color: Colors.black.withOpacity(0.03), blurRadius: 10)],
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceBetween,
                    children: [
                      Expanded(
                        child: Text(
                          _currentRegister!['name'] ?? 'Caja Abierta',
                          style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 16, color: Color(0xFF0F172A)),
                        ),
                      ),
                      Container(
                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                        decoration: BoxDecoration(
                          color: Colors.green.shade100,
                          borderRadius: BorderRadius.circular(10),
                        ),
                        child: const Text('ABIERTA', style: TextStyle(color: AppTheme.primary, fontWeight: FontWeight.w900, fontSize: 11)),
                      ),
                    ],
                  ),
                  const SizedBox(height: 6),
                  Text(
                    'Apertura: ${DateFormat('dd/MM/yyyy HH:mm').format(DateTime.parse(_currentRegister!['openedAt']))}',
                    style: const TextStyle(fontSize: 11, color: Colors.black45),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 14),

            // Card de Totales y Desglose
            Container(
              padding: const EdgeInsets.all(18),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  const Text('DESGLOSE DE CAJA', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.black45, letterSpacing: 0.8)),
                  const SizedBox(height: 12),
                  _row('Sencillo Inicial (Apertura):', _formatMoney(opening)),
                  _row('Cobranza Alcabala / Cuotas:', _formatMoney(alcabala)),
                  _row('Servicio de Agua:', _formatMoney(water)),
                  _row('Servicios Higiénicos:', _formatMoney(sanitary)),
                  if (other > 0) _row('Otros Conceptos:', _formatMoney(other)),
                  const Divider(height: 16),
                  _row('Total Recaudado en Cobranzas:', _formatMoney(totalCobrado), isBold: true),
                  if (extraIncome > 0) _row('Ingresos Extraordinarios (+):', '+${_formatMoney(extraIncome)}', color: Colors.green.shade700),
                  if (extraExpense > 0) _row('Egresos / Gastos (-):', '-${_formatMoney(extraExpense)}', color: Colors.red.shade700),
                  const Divider(height: 20),
                  Container(
                    padding: const EdgeInsets.all(14),
                    decoration: BoxDecoration(
                      color: AppTheme.primary.withOpacity(0.08),
                      borderRadius: BorderRadius.circular(14),
                      border: Border.all(color: AppTheme.primary.withOpacity(0.25)),
                    ),
                    child: Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('EFECTIVO ESPERADO:', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 13, color: AppTheme.primary)),
                        Text(_formatMoney(expectedCash), style: const TextStyle(fontWeight: FontWeight.w900, fontSize: 20, color: AppTheme.primary)),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 18),

            // Botones de Acción
            Row(
              children: [
                Expanded(
                  child: OutlinedButton.icon(
                    style: OutlinedButton.styleFrom(
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                      side: const BorderSide(color: Color(0xFFCBD5E1)),
                    ),
                    icon: const Icon(Icons.swap_horiz, size: 18),
                    label: const Text('+ Movimiento', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 12)),
                    onPressed: _showMovementDialog,
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: ElevatedButton.icon(
                    style: ElevatedButton.styleFrom(
                      backgroundColor: const Color(0xFF7C3AED),
                      padding: const EdgeInsets.symmetric(vertical: 14),
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                      elevation: 2,
                    ),
                    icon: const Icon(Icons.lock_clock, color: Colors.white, size: 18),
                    label: const Text('Arqueo & Cierre', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12)),
                    onPressed: _showArqueoCierreDialog,
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }

  // ==========================================
  // TAB 2: CONSOLIDADO GENERAL DIARIO
  // ==========================================
  Widget _buildConsolidadoTab() {
    if (_consolidated == null) {
      return const Center(child: Text('No hay datos consolidados para el día de hoy.'));
    }

    final breakdown = _consolidated!['breakdown'] ?? {};
    final alcabala = (breakdown['alcabala'] as num?)?.toDouble() ?? 0.0;
    final water = (breakdown['water'] as num?)?.toDouble() ?? 0.0;
    final sanitary = (breakdown['sanitary'] as num?)?.toDouble() ?? 0.0;
    final totalCollected = (breakdown['totalCollected'] as num?)?.toDouble() ?? 0.0;
    final openingTotal = (breakdown['openingTotal'] as num?)?.toDouble() ?? 0.0;
    final expectedTotal = (breakdown['expectedTotal'] as num?)?.toDouble() ?? 0.0;
    final activeRegisters = (_consolidated!['activeRegisters'] as List?) ?? [];
    final closedRegisters = (_consolidated!['closedRegisters'] as List?) ?? [];

    return RefreshIndicator(
      onRefresh: _loadAll,
      child: SingleChildScrollView(
        physics: const AlwaysScrollableScrollPhysics(),
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Card Principal Consolidado
            Container(
              padding: const EdgeInsets.all(20),
              decoration: BoxDecoration(
                gradient: const LinearGradient(
                  colors: [AppTheme.primaryDark, AppTheme.primary],
                  begin: Alignment.topLeft,
                  end: Alignment.bottomRight,
                ),
                borderRadius: BorderRadius.circular(20),
                boxShadow: [BoxShadow(color: AppTheme.primary.withOpacity(0.35), blurRadius: 14, offset: const Offset(0, 6))],
              ),
              child: Column(
                children: [
                  const Text('RECAUDACIÓN GENERAL DEL MERCADO', style: TextStyle(color: Colors.white70, fontSize: 11, fontWeight: FontWeight.bold, letterSpacing: 0.8)),
                  const SizedBox(height: 6),
                  Text(_formatMoney(totalCollected), style: const TextStyle(color: Colors.white, fontSize: 32, fontWeight: FontWeight.w900)),
                  const SizedBox(height: 14),
                  const Divider(color: Colors.white24),
                  const SizedBox(height: 8),
                  Row(
                    mainAxisAlignment: MainAxisAlignment.spaceAround,
                    children: [
                      _subMetric('Alcabala', alcabala),
                      _subMetric('Agua', water),
                      _subMetric('SS.HH.', sanitary),
                      _subMetric('Sencillos', openingTotal),
                    ],
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Card Resumen Bóveda
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                color: Colors.white,
                borderRadius: BorderRadius.circular(18),
                border: Border.all(color: const Color(0xFFE2E8F0)),
              ),
              child: Row(
                mainAxisAlignment: MainAxisAlignment.spaceBetween,
                children: [
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      const Text('EFECTIVO TOTAL ESPERADO (BÓVEDA)', style: TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Colors.black54)),
                      const SizedBox(height: 4),
                      Text(_formatMoney(expectedTotal), style: const TextStyle(fontSize: 18, fontWeight: FontWeight.w900, color: Color(0xFF0F172A))),
                    ],
                  ),
                  Container(
                    padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
                    decoration: BoxDecoration(color: Colors.purple.shade50, borderRadius: BorderRadius.circular(10)),
                    child: Text(
                      '${activeRegisters.length} Activas / ${closedRegisters.length} Cerradas',
                      style: TextStyle(color: Colors.purple.shade700, fontWeight: FontWeight.bold, fontSize: 11),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 18),

            // Lista de Cajas del Día
            const Text('CAJAS DEL DÍA EN EL MERCADO', style: TextStyle(fontSize: 11, fontWeight: FontWeight.w900, color: Colors.grey, letterSpacing: 0.8)),
            const SizedBox(height: 10),

            if (activeRegisters.isEmpty && closedRegisters.isEmpty)
              const Padding(
                padding: EdgeInsets.symmetric(vertical: 20),
                child: Center(child: Text('No hay cajas registradas el día de hoy.')),
              ),

            ...activeRegisters.map((r) => _registerCard(r, isActive: true)),
            ...closedRegisters.map((r) => _registerCard(r, isActive: false)),
          ],
        ),
      ),
    );
  }

  Widget _registerCard(Map<String, dynamic> r, {required bool isActive}) {
    final name = r['name'] ?? 'Caja';
    final cashier = r['openedBy']?['fullName'] ?? 'Cajero';
    final opening = (num.tryParse(r['openingAmount']?.toString() ?? '0') ?? 0).toDouble();

    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(14),
        border: Border.all(color: isActive ? Colors.green.shade200 : const Color(0xFFCBD5E1)),
      ),
      child: Row(
        children: [
          CircleAvatar(
            backgroundColor: isActive ? Colors.green.shade50 : Colors.grey.shade100,
            child: Icon(isActive ? Icons.lock_open : Icons.lock_outline, color: isActive ? AppTheme.primary : Colors.grey, size: 20),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13)),
                Text('Resp: $cashier • Sencillo: ${_formatMoney(opening)}', style: const TextStyle(fontSize: 11, color: Colors.black54)),
              ],
            ),
          ),
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
            decoration: BoxDecoration(
              color: isActive ? Colors.green.shade50 : Colors.grey.shade200,
              borderRadius: BorderRadius.circular(8),
            ),
            child: Text(
              isActive ? 'ABIERTA' : 'CERRADA',
              style: TextStyle(
                fontSize: 10,
                fontWeight: FontWeight.bold,
                color: isActive ? AppTheme.primary : Colors.black54,
              ),
            ),
          ),
        ],
      ),
    );
  }

  Widget _subMetric(String label, double val) {
    return Column(
      children: [
        Text(label, style: const TextStyle(color: Colors.white70, fontSize: 10)),
        const SizedBox(height: 2),
        Text(_formatMoney(val), style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 11)),
      ],
    );
  }

  Widget _row(String label, String value, {bool isBold = false, Color? color}) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          Text(label, style: TextStyle(fontWeight: isBold ? FontWeight.w900 : FontWeight.w500, fontSize: 12)),
          Text(
            value,
            style: TextStyle(
              fontWeight: FontWeight.w900,
              fontSize: isBold ? 13 : 12,
              color: color ?? Colors.black87,
            ),
          ),
        ],
      ),
    );
  }
}
