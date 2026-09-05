import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:uuid/uuid.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/database/local_database.dart';
import '../../../core/network/api_client.dart';

class ModoAuditorioScreen extends StatefulWidget {
  final String meetingId;
  final String meetingTitle;
  final int totalEligible;

  const ModoAuditorioScreen({
    super.key,
    required this.meetingId,
    required this.meetingTitle,
    this.totalEligible = 350,
  });

  @override
  State<ModoAuditorioScreen> createState() => _ModoAuditorioScreenState();
}

class _ModoAuditorioScreenState extends State<ModoAuditorioScreen> {
  final TextEditingController _codeController = TextEditingController();
  final FocusNode _focusNode = FocusNode();

  int _presentCount = 0;
  int _totalEligible = 350;
  double _quorumPercentage = 0.0;
  bool _quorumReached = false;

  bool _isProcessing = false;
  Map<String, dynamic>? _lastResult;
  final List<Map<String, dynamic>> _recentAttendees = [];

  @override
  void initState() {
    super.initState();
    _totalEligible = widget.totalEligible;
    _refreshStats();
  }

  @override
  void dispose() {
    _codeController.dispose();
    _focusNode.dispose();
    super.dispose();
  }

  Future<void> _refreshStats() async {
    final stats = await LocalDatabase.instance.getMeetingQuorumStats(
      widget.meetingId,
      _totalEligible,
    );
    setState(() {
      _presentCount = stats['presentCount'];
      _totalEligible = stats['totalEligible'];
      _quorumPercentage = (stats['quorumPercentage'] as num).toDouble();
      _quorumReached = stats['quorumReached'];
    });
  }

  Future<void> _processScan(String rawCode) async {
    final code = rawCode.trim();
    if (code.isEmpty || _isProcessing) return;

    setState(() {
      _isProcessing = true;
      _lastResult = null;
    });

    try {
      // 1. Buscar comerciante en caché local SQLite
      Map<String, dynamic>? merchant = await LocalDatabase.instance.findMerchantByQr(code);

      // 2. Si no está en SQLite, intentar resolver por API si hay red
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

      if (merchant == null) {
        HapticFeedback.vibrate();
        setState(() {
          _lastResult = {
            'type': 'NOT_FOUND',
            'title': 'NO ENCONTRADO',
            'message': 'Código: $code no corresponde a ningún socio en el padrón.',
          };
        });
        return;
      }

      final targetMerchant = merchant;

      // 3. Verificar duplicado en la asamblea
      final alreadyRegistered = await LocalDatabase.instance.isMerchantAlreadyAttended(
        widget.meetingId,
        targetMerchant['id'],
      );

      if (alreadyRegistered) {
        HapticFeedback.heavyImpact();
        setState(() {
          _lastResult = {
            'type': 'DUPLICATE',
            'title': '¡SOCIO YA REGISTRADO!',
            'merchant': targetMerchant,
            'message': 'Este socio ya marcó su asistencia anteriormente en esta asamblea.',
          };
        });
        return;
      }

      // 4. Registrar asistencia localmente
      final recorded = await LocalDatabase.instance.recordAttendanceLocally(
        idempotencyKey: const Uuid().v4(),
        meetingId: widget.meetingId,
        merchantId: targetMerchant['id'],
        merchantName: '${targetMerchant['lastName']}, ${targetMerchant['firstName']}',
        merchantDni: targetMerchant['dni'] ?? '',
        merchantCode: targetMerchant['internalCode'] ?? '',
        merchantStall: targetMerchant['stall']?['code'] ?? 'Ambulatorio',
        verifiedBy: 'Modo Auditorio - Móvil',
      );

      if (recorded) {
        HapticFeedback.lightImpact();
        await _refreshStats();
        setState(() {
          _lastResult = {
            'type': 'SUCCESS',
            'title': '¡ASISTENCIA REGISTRADA!',
            'merchant': targetMerchant,
            'message': 'Puesto: ${targetMerchant['stall']?['code'] ?? 'Ambulante'} | DNI: ${targetMerchant['dni']}',
            'timestamp': DateTime.now(),
          };
          _recentAttendees.insert(0, {
            'name': '${targetMerchant['lastName']}, ${targetMerchant['firstName']}',
            'dni': targetMerchant['dni'],
            'stall': targetMerchant['stall']?['code'] ?? 'Ambulante',
            'time': '${DateTime.now().hour.toString().padLeft(2, '0')}:${DateTime.now().minute.toString().padLeft(2, '0')}:${DateTime.now().second.toString().padLeft(2, '0')}',
            'number': _presentCount,
          });
        });
      }
    } finally {
      setState(() {
        _isProcessing = false;
        _codeController.clear();
      });
      _focusNode.requestFocus();
    }
  }

  void _showSimulatedScanDialog() {
    final searchCtrl = TextEditingController();
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Simulador de Lector QR / Barcode', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Text(
              'Ingrese el DNI o Código QR del socio para simular la lectura de la credencial física:',
              style: TextStyle(fontSize: 12, color: Colors.black54),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: searchCtrl,
              autofocus: true,
              decoration: const InputDecoration(
                labelText: 'DNI o Código (ej. MB-QR-10000001)',
                border: OutlineInputBorder(),
                prefixIcon: Icon(Icons.qr_code),
              ),
              onSubmitted: (val) {
                Navigator.pop(ctx);
                _processScan(val);
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
              _processScan(searchCtrl.text);
            },
            child: const Text('Escanear', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFF0F172A),
      appBar: AppBar(
        backgroundColor: const Color(0xFF1E293B),
        elevation: 0,
        leading: IconButton(
          icon: const Icon(Icons.arrow_back, color: Colors.white),
          onPressed: () => Navigator.pop(context),
        ),
        title: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'MODO AUDITORIO — ESCANEO CONTINUO',
              style: TextStyle(fontSize: 12, fontWeight: FontWeight.w900, color: Colors.greenAccent, letterSpacing: 1.1),
            ),
            Text(
              widget.meetingTitle,
              style: const TextStyle(fontSize: 14, fontWeight: FontWeight.bold, color: Colors.white),
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, color: Colors.white70),
            onPressed: _refreshStats,
          ),
        ],
      ),
      body: Column(
        children: [
          // 1. Quorum Live Banner
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
            color: const Color(0xFF1E293B),
            child: Row(
              children: [
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Row(
                        children: [
                          Container(
                            padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                            decoration: BoxDecoration(
                              color: _quorumReached ? Colors.green.shade900 : Colors.amber.shade900,
                              borderRadius: BorderRadius.circular(20),
                              border: Border.all(
                                color: _quorumReached ? Colors.greenAccent : Colors.amberAccent,
                              ),
                            ),
                            child: Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                Icon(
                                  _quorumReached ? Icons.check_circle : Icons.hourglass_top,
                                  size: 14,
                                  color: _quorumReached ? Colors.greenAccent : Colors.amberAccent,
                                ),
                                const SizedBox(width: 4),
                                Text(
                                  _quorumReached ? 'QUÓRUM LEGAL ALCANZADO' : 'EN PROGRESO DE QUÓRUM',
                                  style: TextStyle(
                                    fontSize: 10,
                                    fontWeight: FontWeight.bold,
                                    color: _quorumReached ? Colors.greenAccent : Colors.amberAccent,
                                  ),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 8),
                      ClipRRect(
                        borderRadius: BorderRadius.circular(6),
                        child: LinearProgressIndicator(
                          value: _totalEligible > 0 ? (_presentCount / _totalEligible).clamp(0.0, 1.0) : 0,
                          backgroundColor: Colors.white12,
                          valueColor: AlwaysStoppedAnimation<Color>(
                            _quorumReached ? Colors.greenAccent : Colors.amberAccent,
                          ),
                          minHeight: 8,
                        ),
                      ),
                    ],
                  ),
                ),
                const SizedBox(width: 16),
                Column(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    RichText(
                      text: TextSpan(
                        children: [
                          TextSpan(
                            text: '$_presentCount',
                            style: const TextStyle(
                              fontSize: 26,
                              fontWeight: FontWeight.w900,
                              color: Colors.white,
                            ),
                          ),
                          TextSpan(
                            text: ' / $_totalEligible',
                            style: const TextStyle(
                              fontSize: 14,
                              fontWeight: FontWeight.bold,
                              color: Colors.white54,
                            ),
                          ),
                        ],
                      ),
                    ),
                    Text(
                      '${_quorumPercentage.toStringAsFixed(1)}% Quórum',
                      style: TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                        color: _quorumReached ? Colors.greenAccent : Colors.amberAccent,
                      ),
                    ),
                  ],
                ),
              ],
            ),
          ),

          // 2. Continuous Scanner Frame
          Container(
            margin: const EdgeInsets.all(16),
            padding: const EdgeInsets.all(16),
            decoration: BoxDecoration(
              color: const Color(0xFF1E293B),
              borderRadius: BorderRadius.circular(24),
              border: Border.all(
                color: _lastResult == null
                    ? Colors.white24
                    : _lastResult!['type'] == 'SUCCESS'
                        ? Colors.greenAccent
                        : _lastResult!['type'] == 'DUPLICATE'
                            ? Colors.redAccent
                            : Colors.amberAccent,
                width: 2,
              ),
              boxShadow: [
                BoxShadow(
                  color: _lastResult == null
                      ? Colors.black26
                      : _lastResult!['type'] == 'SUCCESS'
                          ? Colors.greenAccent.withOpacity(0.2)
                          : Colors.redAccent.withOpacity(0.2),
                  blurRadius: 20,
                  spreadRadius: 2,
                ),
              ],
            ),
            child: Column(
              children: [
                Container(
                  height: 130,
                  width: double.infinity,
                  decoration: BoxDecoration(
                    color: Colors.black45,
                    borderRadius: BorderRadius.circular(16),
                    border: Border.all(color: Colors.white12),
                  ),
                  child: Stack(
                    alignment: Alignment.center,
                    children: [
                      Container(
                        height: 2,
                        width: 200,
                        decoration: BoxDecoration(
                          color: Colors.greenAccent,
                          boxShadow: [
                            BoxShadow(color: Colors.greenAccent.withOpacity(0.8), blurRadius: 10, spreadRadius: 2),
                          ],
                        ),
                      ),
                      Column(
                        mainAxisAlignment: MainAxisAlignment.center,
                        children: [
                          const Icon(Icons.qr_code_scanner, color: Colors.white70, size: 48),
                          const SizedBox(height: 6),
                          const Text(
                            'APUNTE EL CÓDIGO QR DE LA CREDENCIAL',
                            style: TextStyle(
                              color: Colors.white,
                              fontSize: 11,
                              fontWeight: FontWeight.bold,
                              letterSpacing: 1.0,
                            ),
                          ),
                          Text(
                            _isProcessing ? 'Procesando lectura...' : 'Lector activo y listo',
                            style: const TextStyle(color: Colors.white38, fontSize: 10),
                          ),
                        ],
                      ),
                    ],
                  ),
                ),
                const SizedBox(height: 12),

                Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: _codeController,
                        focusNode: _focusNode,
                        style: const TextStyle(color: Colors.white, fontSize: 13, fontFamily: 'monospace'),
                        decoration: InputDecoration(
                          hintText: 'Escanee o ingrese DNI / QR...',
                          hintStyle: const TextStyle(color: Colors.white38, fontSize: 12),
                          filled: true,
                          fillColor: Colors.black26,
                          contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                            borderSide: const BorderSide(color: Colors.white24),
                          ),
                          suffixIcon: _codeController.text.isNotEmpty
                              ? IconButton(
                                  icon: const Icon(Icons.send, color: Colors.greenAccent),
                                  onPressed: () => _processScan(_codeController.text),
                                )
                              : null,
                        ),
                        onSubmitted: (val) => _processScan(val),
                      ),
                    ),
                    const SizedBox(width: 8),
                    IconButton.filled(
                      style: IconButton.styleFrom(
                        backgroundColor: AppTheme.primary,
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      icon: const Icon(Icons.add_a_photo, color: Colors.white),
                      tooltip: 'Simular Escaneo Manual',
                      onPressed: _showSimulatedScanDialog,
                    ),
                  ],
                ),
              ],
            ),
          ),

          // 3. Last Result Feedback Banner
          if (_lastResult != null)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16),
              child: Container(
                width: double.infinity,
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: _lastResult!['type'] == 'SUCCESS'
                      ? const Color(0xFF064E3B)
                      : _lastResult!['type'] == 'DUPLICATE'
                          ? const Color(0xFF7F1D1D)
                          : const Color(0xFF78350F),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(
                    color: _lastResult!['type'] == 'SUCCESS'
                        ? Colors.greenAccent
                        : _lastResult!['type'] == 'DUPLICATE'
                            ? Colors.redAccent
                            : Colors.amberAccent,
                  ),
                ),
                child: Row(
                  children: [
                    Icon(
                      _lastResult!['type'] == 'SUCCESS'
                          ? Icons.check_circle
                          : _lastResult!['type'] == 'DUPLICATE'
                              ? Icons.error
                              : Icons.warning,
                      color: Colors.white,
                      size: 36,
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            _lastResult!['title'],
                            style: const TextStyle(
                              color: Colors.white,
                              fontWeight: FontWeight.w900,
                              fontSize: 13,
                              letterSpacing: 0.8,
                            ),
                          ),
                          if (_lastResult!['merchant'] != null) ...[
                            const SizedBox(height: 2),
                            Text(
                              '${_lastResult!['merchant']['lastName']}, ${_lastResult!['merchant']['firstName']}',
                              style: const TextStyle(
                                color: Colors.white,
                                fontWeight: FontWeight.bold,
                                fontSize: 14,
                              ),
                            ),
                          ],
                          const SizedBox(height: 2),
                          Text(
                            _lastResult!['message'],
                            style: const TextStyle(color: Colors.white70, fontSize: 11),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
            ),

          const SizedBox(height: 12),

          // 4. Live Log of Attendees in this Assembly
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'ÚLTIMOS INGRESOS REGISTRADOS',
                  style: TextStyle(
                    color: Colors.white70,
                    fontSize: 11,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 1.0,
                  ),
                ),
                Text(
                  'Total registrados hoy: $_presentCount',
                  style: const TextStyle(color: Colors.greenAccent, fontSize: 11, fontWeight: FontWeight.bold),
                ),
              ],
            ),
          ),
          const SizedBox(height: 8),

          Expanded(
            child: _recentAttendees.isEmpty
                ? const Center(
                    child: Text(
                      'No se han registrado ingresos en esta sesión.\nApunte la cámara a una credencial QR.',
                      textAlign: TextAlign.center,
                      style: TextStyle(color: Colors.white24, fontSize: 12),
                    ),
                  )
                : ListView.builder(
                    padding: const EdgeInsets.symmetric(horizontal: 16),
                    itemCount: _recentAttendees.length,
                    itemBuilder: (ctx, idx) {
                      final item = _recentAttendees[idx];
                      return Container(
                        margin: const EdgeInsets.only(bottom: 8),
                        padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                        decoration: BoxDecoration(
                          color: const Color(0xFF1E293B),
                          borderRadius: BorderRadius.circular(12),
                          border: Border.all(color: Colors.white10),
                        ),
                        child: Row(
                          children: [
                            Container(
                              width: 32,
                              height: 32,
                              decoration: BoxDecoration(
                                color: Colors.green.shade900,
                                borderRadius: BorderRadius.circular(8),
                              ),
                              alignment: Alignment.center,
                              child: Text(
                                '#${item['number']}',
                                style: const TextStyle(
                                  color: Colors.greenAccent,
                                  fontWeight: FontWeight.bold,
                                  fontSize: 11,
                                ),
                              ),
                            ),
                            const SizedBox(width: 12),
                            Expanded(
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  Text(
                                    item['name'],
                                    style: const TextStyle(
                                      color: Colors.white,
                                      fontWeight: FontWeight.bold,
                                      fontSize: 13,
                                    ),
                                  ),
                                  Text(
                                    'DNI: ${item['dni']} • Puesto: ${item['stall']}',
                                    style: const TextStyle(color: Colors.white54, fontSize: 11),
                                  ),
                                ],
                              ),
                            ),
                            Text(
                              item['time'],
                              style: const TextStyle(
                                color: Colors.white38,
                                fontSize: 11,
                                fontFamily: 'monospace',
                              ),
                            ),
                          ],
                        ),
                      );
                    },
                  ),
          ),
        ],
      ),
    );
  }
}