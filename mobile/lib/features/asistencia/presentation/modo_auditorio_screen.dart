import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:intl/intl.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import 'package:uuid/uuid.dart';
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

class _ModoAuditorioScreenState extends State<ModoAuditorioScreen> with SingleTickerProviderStateMixin {
  late TabController _tabController;
  final TextEditingController _codeController = TextEditingController();
  final TextEditingController _searchPresentController = TextEditingController();
  final TextEditingController _searchAbsentController = TextEditingController();
  final FocusNode _focusNode = FocusNode();
  late MobileScannerController _scannerController;

  bool _isTorchOn = false;
  String? _lastScannedCode;
  DateTime? _lastScanTime;

  int _presentCount = 0;
  int _totalEligible = 350;
  double _quorumPercentage = 0.0;
  bool _quorumReached = false;

  bool _isProcessing = false;
  bool _isLoadingData = true;
  Map<String, dynamic>? _lastResult;

  List<Map<String, dynamic>> _attendedList = [];
  List<Map<String, dynamic>> _absentList = [];
  List<Map<String, dynamic>> _filteredAttendedList = [];
  List<Map<String, dynamic>> _filteredAbsentList = [];

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 3, vsync: this);
    _totalEligible = widget.totalEligible;
    _scannerController = MobileScannerController(
      detectionSpeed: DetectionSpeed.noDuplicates,
      facing: CameraFacing.back,
      torchEnabled: false,
    );

    _searchPresentController.addListener(_filterLists);
    _searchAbsentController.addListener(_filterLists);

    _loadMeetingData();
  }

  @override
  void dispose() {
    _tabController.dispose();
    _scannerController.dispose();
    _codeController.dispose();
    _searchPresentController.dispose();
    _searchAbsentController.dispose();
    _focusNode.dispose();
    super.dispose();
  }

  void _filterLists() {
    final queryP = _searchPresentController.text.trim().toLowerCase();
    final queryA = _searchAbsentController.text.trim().toLowerCase();

    setState(() {
      if (queryP.isEmpty) {
        _filteredAttendedList = List.from(_attendedList);
      } else {
        _filteredAttendedList = _attendedList.where((m) {
          final fullName = '${m['last_name'] ?? ''} ${m['first_name'] ?? ''}'.toLowerCase();
          final dni = (m['dni'] ?? '').toString().toLowerCase();
          final stall = (m['stall_code'] ?? '').toString().toLowerCase();
          return fullName.contains(queryP) || dni.contains(queryP) || stall.contains(queryP);
        }).toList();
      }

      if (queryA.isEmpty) {
        _filteredAbsentList = List.from(_absentList);
      } else {
        _filteredAbsentList = _absentList.where((m) {
          final fullName = '${m['last_name'] ?? ''} ${m['first_name'] ?? ''}'.toLowerCase();
          final dni = (m['dni'] ?? '').toString().toLowerCase();
          final stall = (m['stall_code'] ?? '').toString().toLowerCase();
          return fullName.contains(queryA) || dni.contains(queryA) || stall.contains(queryA);
        }).toList();
      }
    });
  }

  Future<void> _loadMeetingData() async {
    setState(() => _isLoadingData = true);
    try {
      // 1. Cargar datos locales de SQLite
      final localLists = await LocalDatabase.instance.getMeetingAttendanceLists(widget.meetingId);
      final localStats = await LocalDatabase.instance.getMeetingQuorumStats(widget.meetingId, _totalEligible);

      _updateLists(
        attended: localLists['attended'] ?? [],
        absent: localLists['absent'] ?? [],
        total: localStats['totalEligible'] ?? _totalEligible,
      );

      // 2. Intentar actualizar desde el servidor central si hay red
      try {
        final res = await ApiClient().dio.get('/meetings/${widget.meetingId}');
        if (res.data != null) {
          final serverAttended = (res.data['attended'] as List? ?? []).map((a) {
            final m = a['merchant'] ?? {};
            return {
              'id': m['id'] ?? a['merchantId'],
              'first_name': m['firstName'] ?? '',
              'last_name': m['lastName'] ?? '',
              'dni': a['dni'] ?? m['dni'] ?? '',
              'stall_code': m['stall']?['code'] ?? 'Sin puesto',
              'type_name': m['merchantType']?['name'] ?? 'Socio',
              'business_category': m['businessCategory'] ?? '',
              'scanned_at': a['scannedAt'] ?? DateTime.now().toIso8601String(),
            };
          }).toList();

          final serverAbsent = (res.data['absent'] as List? ?? []).map((m) {
            return {
              'id': m['id'],
              'first_name': m['firstName'] ?? '',
              'last_name': m['lastName'] ?? '',
              'dni': m['dni'] ?? '',
              'stall_code': m['stall']?['code'] ?? 'Sin puesto',
              'type_name': m['merchantType']?['name'] ?? 'Socio',
              'business_category': m['businessCategory'] ?? '',
            };
          }).toList();

          // Sincronizar asistencias del servidor al SQLite local
          await LocalDatabase.instance.cacheAttendances(widget.meetingId, res.data['attended'] ?? []);

          final serverTotal = res.data['quorum']?['totalSocios'] ?? (serverAttended.length + serverAbsent.length);

          _updateLists(
            attended: serverAttended,
            absent: serverAbsent,
            total: serverTotal > 0 ? serverTotal : _totalEligible,
          );
        }
      } catch (_) {
        // Modo offline: ya se cargaron los datos de SQLite
      }
    } finally {
      if (mounted) setState(() => _isLoadingData = false);
    }
  }

  void _updateLists({
    required List<Map<String, dynamic>> attended,
    required List<Map<String, dynamic>> absent,
    required int total,
  }) {
    final count = attended.length;
    final totalEligible = total > 0 ? total : 350;
    final pct = totalEligible > 0 ? (count / totalEligible) * 100 : 0.0;

    setState(() {
      _attendedList = List.from(attended);
      _absentList = List.from(absent);
      _presentCount = count;
      _totalEligible = totalEligible;
      _quorumPercentage = pct;
      _quorumReached = pct >= 50.0;
    });

    _filterLists();
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
            'title': 'SOCIO NO ENCONTRADO',
            'message': 'El código o DNI "$code" no figura en el padrón de socios.',
          };
        });
        return;
      }

      final targetMerchant = merchant;
      final merchantId = targetMerchant['id'].toString();
      final merchantDni = (targetMerchant['dni'] ?? '').toString();
      final stallCode = targetMerchant['stall']?['code'] ?? targetMerchant['stall_code'] ?? 'Sin puesto';
      final fullName = '${targetMerchant['lastName']}, ${targetMerchant['firstName']}';

      // 3. Verificar duplicado en la asamblea
      final alreadyRegistered = await LocalDatabase.instance.isMerchantAlreadyAttended(
        widget.meetingId,
        merchantId,
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

      // 4. Registrar asistencia localmente (Offline First)
      final idempotencyKey = const Uuid().v4();
      final recorded = await LocalDatabase.instance.recordAttendanceLocally(
        idempotencyKey: idempotencyKey,
        meetingId: widget.meetingId,
        merchantId: merchantId,
        merchantName: fullName,
        merchantDni: merchantDni,
        merchantCode: targetMerchant['internalCode'] ?? '',
        merchantStall: stallCode,
        verifiedBy: 'Modo Auditorio - Móvil',
      );

      // 5. Sincronización inmediata con backend si hay conexión
      try {
        await ApiClient().dio.post('/meetings/${widget.meetingId}/attendance', data: {
          'merchantIdentifier': merchantDni.isNotEmpty ? merchantDni : merchantId,
          'idempotencyKey': idempotencyKey,
          'deviceId': 'mobile-app',
        });
        await LocalDatabase.instance.updateAttendanceSyncStatus(idempotencyKey, 'SINCRONIZADO');
      } catch (_) {
        // Si no hay red, queda guardado en offline_attendance_events con estado PENDIENTE
      }

      if (recorded) {
        HapticFeedback.lightImpact();

        final nowIso = DateTime.now().toIso8601String();
        final newAttendee = {
          'id': merchantId,
          'first_name': targetMerchant['firstName'] ?? '',
          'last_name': targetMerchant['lastName'] ?? '',
          'dni': merchantDni,
          'stall_code': stallCode,
          'type_name': targetMerchant['merchantType']?['name'] ?? 'Socio',
          'business_category': targetMerchant['businessCategory'] ?? '',
          'scanned_at': nowIso,
        };

        // Mover de ausentes a presentes
        final updatedAttended = [newAttendee, ..._attendedList];
        final updatedAbsent = _absentList.where((m) => m['id'] != merchantId && m['dni'] != merchantDni).toList();

        _updateLists(
          attended: updatedAttended,
          absent: updatedAbsent,
          total: _totalEligible,
        );

        setState(() {
          _lastResult = {
            'type': 'SUCCESS',
            'title': '¡ASISTENCIA REGISTRADA!',
            'merchant': targetMerchant,
            'message': 'Puesto: $stallCode | DNI: $merchantDni',
            'timestamp': DateTime.now(),
          };
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

  void _onDetect(BarcodeCapture capture) {
    if (_isProcessing) return;
    for (final barcode in capture.barcodes) {
      final code = barcode.rawValue?.trim();
      if (code != null && code.isNotEmpty) {
        final now = DateTime.now();
        if (_lastScannedCode == code && _lastScanTime != null) {
          if (now.difference(_lastScanTime!).inMilliseconds < 2500) {
            continue;
          }
        }
        _lastScannedCode = code;
        _lastScanTime = now;
        _processScan(code);
        break;
      }
    }
  }

  void _confirmManualAttendance(Map<String, dynamic> merchant) {
    final name = '${merchant['last_name']}, ${merchant['first_name']}';
    final dni = merchant['dni'] ?? '';
    final stall = merchant['stall_code'] ?? 'Sin puesto';

    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        backgroundColor: const Color(0xFF1E293B),
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
        title: const Row(
          children: [
            Icon(Icons.how_to_reg, color: Colors.greenAccent),
            SizedBox(width: 8),
            Text('Marcar Asistencia', style: TextStyle(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
          ],
        ),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              '¿Desea marcar manualmente la asistencia de este socio?',
              style: TextStyle(color: Colors.white70, fontSize: 13),
            ),
            const SizedBox(height: 12),
            Container(
              padding: const EdgeInsets.all(12),
              decoration: BoxDecoration(
                color: Colors.black26,
                borderRadius: BorderRadius.circular(12),
                border: Border.all(color: Colors.white12),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(name, style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 14)),
                  const SizedBox(height: 4),
                  Text('DNI: $dni • Puesto: $stall', style: const TextStyle(color: Colors.white70, fontSize: 12)),
                ],
              ),
            ),
          ],
        ),
        actions: [
          TextButton(
            child: const Text('Cancelar', style: TextStyle(color: Colors.white54)),
            onPressed: () => Navigator.pop(ctx),
          ),
          ElevatedButton(
            style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF047857)),
            child: const Text('Confirmar Asistencia', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
            onPressed: () {
              Navigator.pop(ctx);
              _processScan(dni.isNotEmpty ? dni : merchant['id'].toString());
            },
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
              'MODO AUDITORIO — ASISTENCIA',
              style: TextStyle(fontSize: 11, fontWeight: FontWeight.w900, color: Colors.greenAccent, letterSpacing: 1.1),
            ),
            Text(
              widget.meetingTitle,
              style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Colors.white),
              overflow: TextOverflow.ellipsis,
            ),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh, color: Colors.white70),
            tooltip: 'Recargar datos',
            onPressed: _loadMeetingData,
          ),
        ],
        bottom: TabBar(
          controller: _tabController,
          indicatorColor: Colors.greenAccent,
          indicatorWeight: 3,
          labelColor: Colors.greenAccent,
          unselectedLabelColor: Colors.white54,
          labelStyle: const TextStyle(fontWeight: FontWeight.bold, fontSize: 11),
          tabs: [
            const Tab(
              icon: Icon(Icons.qr_code_scanner, size: 18),
              text: 'Escáner QR',
            ),
            Tab(
              icon: const Icon(Icons.how_to_reg, size: 18),
              text: 'Presentes (${_attendedList.length})',
            ),
            Tab(
              icon: const Icon(Icons.person_off_outlined, size: 18),
              text: 'Ausentes (${_absentList.length})',
            ),
          ],
        ),
      ),
      body: Column(
        children: [
          // 1. Quorum Live Banner (Always visible on top)
          _buildQuorumHeader(),

          // 2. Tab Views
          Expanded(
            child: _isLoadingData
                ? const Center(child: CircularProgressIndicator(color: Colors.greenAccent))
                : TabBarView(
                    controller: _tabController,
                    children: [
                      _buildScannerTab(),
                      _buildPresentesTab(),
                      _buildAusentesTab(),
                    ],
                  ),
          ),
        ],
      ),
    );
  }

  Widget _buildQuorumHeader() {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 10),
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
                            size: 13,
                            color: _quorumReached ? Colors.greenAccent : Colors.amberAccent,
                          ),
                          const SizedBox(width: 4),
                          Text(
                            _quorumReached ? 'QUÓRUM LEGAL ALCANZADO' : 'EN PROGRESO DE QUÓRUM',
                            style: TextStyle(
                              fontSize: 9,
                              fontWeight: FontWeight.bold,
                              color: _quorumReached ? Colors.greenAccent : Colors.amberAccent,
                            ),
                          ),
                        ],
                      ),
                    ),
                  ],
                ),
                const SizedBox(height: 6),
                ClipRRect(
                  borderRadius: BorderRadius.circular(6),
                  child: LinearProgressIndicator(
                    value: _totalEligible > 0 ? (_presentCount / _totalEligible).clamp(0.0, 1.0) : 0,
                    backgroundColor: Colors.white12,
                    valueColor: AlwaysStoppedAnimation<Color>(
                      _quorumReached ? Colors.greenAccent : Colors.amberAccent,
                    ),
                    minHeight: 6,
                  ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 14),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              RichText(
                text: TextSpan(
                  children: [
                    TextSpan(
                      text: '$_presentCount',
                      style: const TextStyle(
                        fontSize: 22,
                        fontWeight: FontWeight.w900,
                        color: Colors.white,
                      ),
                    ),
                    TextSpan(
                      text: ' / $_totalEligible',
                      style: const TextStyle(
                        fontSize: 12,
                        fontWeight: FontWeight.bold,
                        color: Colors.white54,
                      ),
                    ),
                  ],
                ),
              ),
              Text(
                '${_quorumPercentage.toStringAsFixed(1)}% Quórum (50%+1)',
                style: TextStyle(
                  fontSize: 10,
                  fontWeight: FontWeight.bold,
                  color: _quorumReached ? Colors.greenAccent : Colors.amberAccent,
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }

  // --- TAB 1: ESCÁNER QR EN VIVO ---
  Widget _buildScannerTab() {
    return SingleChildScrollView(
      child: Column(
        children: [
          Container(
            margin: const EdgeInsets.all(14),
            padding: const EdgeInsets.all(14),
            decoration: BoxDecoration(
              color: const Color(0xFF1E293B),
              borderRadius: BorderRadius.circular(20),
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
                  blurRadius: 16,
                  spreadRadius: 2,
                ),
              ],
            ),
            child: Column(
              children: [
                ClipRRect(
                  borderRadius: BorderRadius.circular(14),
                  child: SizedBox(
                    height: 200,
                    width: double.infinity,
                    child: Stack(
                      alignment: Alignment.center,
                      children: [
                        MobileScanner(
                          controller: _scannerController,
                          onDetect: _onDetect,
                          errorBuilder: (context, error) {
                            return Container(
                              color: Colors.black,
                              child: Center(
                                child: Padding(
                                  padding: const EdgeInsets.all(16.0),
                                  child: Column(
                                    mainAxisAlignment: MainAxisAlignment.center,
                                    children: [
                                      const Icon(Icons.videocam_off, color: Colors.amber, size: 32),
                                      const SizedBox(height: 6),
                                      Text(
                                        'Cámara: ${error.errorCode.name}',
                                        textAlign: TextAlign.center,
                                        style: const TextStyle(color: Colors.white70, fontSize: 11),
                                      ),
                                      const SizedBox(height: 4),
                                      const Text(
                                        'Ingrese el DNI manualmente en el campo inferior.',
                                        textAlign: TextAlign.center,
                                        style: TextStyle(color: Colors.white38, fontSize: 10),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            );
                          },
                        ),
                        // Target Reticle Overlay
                        Container(
                          decoration: BoxDecoration(
                            border: Border.all(color: Colors.greenAccent.withOpacity(0.5), width: 2),
                            borderRadius: BorderRadius.circular(14),
                          ),
                        ),
                        // Scanner Line
                        Align(
                          alignment: Alignment.center,
                          child: Container(
                            height: 2,
                            width: double.infinity,
                            margin: const EdgeInsets.symmetric(horizontal: 20),
                            decoration: BoxDecoration(
                              color: Colors.greenAccent,
                              boxShadow: [
                                BoxShadow(
                                  color: Colors.greenAccent.withOpacity(0.8),
                                  blurRadius: 10,
                                  spreadRadius: 2,
                                ),
                              ],
                            ),
                          ),
                        ),
                        // Camera Controls (Torch & Flip)
                        Positioned(
                          top: 8,
                          right: 8,
                          child: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              IconButton(
                                icon: Icon(
                                  _isTorchOn ? Icons.flash_on : Icons.flash_off,
                                  color: _isTorchOn ? Colors.amberAccent : Colors.white70,
                                  size: 18,
                                ),
                                style: IconButton.styleFrom(
                                  backgroundColor: Colors.black54,
                                  padding: const EdgeInsets.all(6),
                                ),
                                onPressed: () {
                                  _scannerController.toggleTorch();
                                  setState(() => _isTorchOn = !_isTorchOn);
                                },
                              ),
                              const SizedBox(width: 4),
                              IconButton(
                                icon: const Icon(Icons.flip_camera_ios, color: Colors.white70, size: 18),
                                style: IconButton.styleFrom(
                                  backgroundColor: Colors.black54,
                                  padding: const EdgeInsets.all(6),
                                ),
                                onPressed: () => _scannerController.switchCamera(),
                              ),
                            ],
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
                const SizedBox(height: 10),

                // Manual Input Field
                Row(
                  children: [
                    Expanded(
                      child: TextField(
                        controller: _codeController,
                        focusNode: _focusNode,
                        style: const TextStyle(color: Colors.white, fontSize: 13, fontFamily: 'monospace'),
                        decoration: InputDecoration(
                          hintText: 'Ingreso manual por DNI...',
                          hintStyle: const TextStyle(color: Colors.white38, fontSize: 12),
                          filled: true,
                          fillColor: Colors.black26,
                          contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                          border: OutlineInputBorder(
                            borderRadius: BorderRadius.circular(12),
                            borderSide: const BorderSide(color: Colors.white24),
                          ),
                          prefixIcon: const Icon(Icons.badge, color: Colors.white54, size: 18),
                          suffixIcon: _codeController.text.isNotEmpty
                              ? IconButton(
                                  icon: const Icon(Icons.send, color: Colors.greenAccent, size: 18),
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
                        backgroundColor: const Color(0xFF047857),
                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                      ),
                      icon: const Icon(Icons.check, color: Colors.white, size: 20),
                      tooltip: 'Validar DNI',
                      onPressed: () => _processScan(_codeController.text),
                    ),
                  ],
                ),
              ],
            ),
          ),

          // Feedback Banner
          if (_lastResult != null)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 14),
              child: Container(
                width: double.infinity,
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: _lastResult!['type'] == 'SUCCESS'
                      ? const Color(0xFF064E3B)
                      : _lastResult!['type'] == 'DUPLICATE'
                          ? const Color(0xFF7F1D1D)
                          : const Color(0xFF78350F),
                  borderRadius: BorderRadius.circular(14),
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
                      size: 32,
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
                              fontSize: 12,
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
                                fontSize: 13,
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

          // Quick Recent 3 Check-ins
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                const Text(
                  'ÚLTIMOS INGRESOS ESCANEADOS',
                  style: TextStyle(color: Colors.white70, fontSize: 11, fontWeight: FontWeight.bold, letterSpacing: 0.8),
                ),
                TextButton(
                  onPressed: () => _tabController.animateTo(1),
                  child: const Text('Ver todos →', style: TextStyle(color: Colors.greenAccent, fontSize: 11)),
                ),
              ],
            ),
          ),

          if (_attendedList.isEmpty)
            const Padding(
              padding: EdgeInsets.all(24.0),
              child: Center(
                child: Text(
                  'Aún no hay socios registrados en esta asamblea.\nApunte la cámara a la credencial QR del socio.',
                  textAlign: TextAlign.center,
                  style: TextStyle(color: Colors.white30, fontSize: 12),
                ),
              ),
            )
          else
            ListView.builder(
              shrinkWrap: true,
              physics: const NeverScrollableScrollPhysics(),
              padding: const EdgeInsets.symmetric(horizontal: 14),
              itemCount: _attendedList.length > 3 ? 3 : _attendedList.length,
              itemBuilder: (ctx, idx) => _buildAttendeeCard(_attendedList[idx], _attendedList.length - idx),
            ),
        ],
      ),
    );
  }

  // --- TAB 2: LISTA DE PRESENTES ---
  Widget _buildPresentesTab() {
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.all(14),
          child: TextField(
            controller: _searchPresentController,
            style: const TextStyle(color: Colors.white, fontSize: 13),
            decoration: InputDecoration(
              hintText: 'Buscar presente por DNI, Nombre o Puesto...',
              hintStyle: const TextStyle(color: Colors.white38, fontSize: 12),
              filled: true,
              fillColor: const Color(0xFF1E293B),
              prefixIcon: const Icon(Icons.search, color: Colors.greenAccent, size: 18),
              contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(color: Colors.white12),
              ),
              suffixIcon: _searchPresentController.text.isNotEmpty
                  ? IconButton(
                      icon: const Icon(Icons.clear, color: Colors.white54, size: 16),
                      onPressed: () => _searchPresentController.clear(),
                    )
                  : null,
            ),
          ),
        ),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'PRESENTES: ${_filteredAttendedList.length} de $_totalEligible socios',
                style: const TextStyle(color: Colors.greenAccent, fontSize: 11, fontWeight: FontWeight.bold),
              ),
              Text(
                'Quórum: ${_quorumPercentage.toStringAsFixed(1)}%',
                style: TextStyle(
                  color: _quorumReached ? Colors.greenAccent : Colors.amberAccent,
                  fontSize: 11,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
        ),
        const SizedBox(height: 8),
        Expanded(
          child: _filteredAttendedList.isEmpty
              ? const Center(
                  child: Text(
                    'No se encontraron socios presentes con ese criterio.',
                    style: TextStyle(color: Colors.white38, fontSize: 12),
                  ),
                )
              : ListView.builder(
                  padding: const EdgeInsets.symmetric(horizontal: 14),
                  itemCount: _filteredAttendedList.length,
                  itemBuilder: (ctx, idx) => _buildAttendeeCard(_filteredAttendedList[idx], _filteredAttendedList.length - idx),
                ),
        ),
      ],
    );
  }

  // --- TAB 3: LISTA DE AUSENTES (FALTANTES) ---
  Widget _buildAusentesTab() {
    return Column(
      children: [
        Padding(
          padding: const EdgeInsets.all(14),
          child: TextField(
            controller: _searchAbsentController,
            style: const TextStyle(color: Colors.white, fontSize: 13),
            decoration: InputDecoration(
              hintText: 'Buscar ausente por DNI, Nombre o Puesto...',
              hintStyle: const TextStyle(color: Colors.white38, fontSize: 12),
              filled: true,
              fillColor: const Color(0xFF1E293B),
              prefixIcon: const Icon(Icons.search, color: Colors.amberAccent, size: 18),
              contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
              border: OutlineInputBorder(
                borderRadius: BorderRadius.circular(12),
                borderSide: const BorderSide(color: Colors.white12),
              ),
              suffixIcon: _searchAbsentController.text.isNotEmpty
                  ? IconButton(
                      icon: const Icon(Icons.clear, color: Colors.white54, size: 16),
                      onPressed: () => _searchAbsentController.clear(),
                    )
                  : null,
            ),
          ),
        ),
        Padding(
          padding: const EdgeInsets.symmetric(horizontal: 16),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.spaceBetween,
            children: [
              Text(
                'AUSENTES / PENDIENTES: ${_filteredAbsentList.length} socios',
                style: const TextStyle(color: Colors.amberAccent, fontSize: 11, fontWeight: FontWeight.bold),
              ),
              const Text(
                'Toque [Marcar] para asistencia manual',
                style: TextStyle(color: Colors.white38, fontSize: 10),
              ),
            ],
          ),
        ),
        const SizedBox(height: 8),
        Expanded(
          child: _filteredAbsentList.isEmpty
              ? const Center(
                  child: Text(
                    '¡Excelente! No hay socios ausentes pendientes.',
                    style: TextStyle(color: Colors.greenAccent, fontSize: 12, fontWeight: FontWeight.bold),
                  ),
                )
              : ListView.builder(
                  padding: const EdgeInsets.symmetric(horizontal: 14),
                  itemCount: _filteredAbsentList.length,
                  itemBuilder: (ctx, idx) => _buildAbsentCard(_filteredAbsentList[idx]),
                ),
        ),
      ],
    );
  }

  // Tarjeta de socio Presente
  Widget _buildAttendeeCard(Map<String, dynamic> item, int orderNumber) {
    final name = '${item['last_name']}, ${item['first_name']}';
    final dni = item['dni'] ?? '';
    final stall = item['stall_code'] ?? 'Sin puesto';
    final timeStr = item['scanned_at'] != null
        ? DateFormat('HH:mm:ss').format(DateTime.tryParse(item['scanned_at'].toString()) ?? DateTime.now())
        : '--:--';

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
              '#$orderNumber',
              style: const TextStyle(color: Colors.greenAccent, fontWeight: FontWeight.bold, fontSize: 11),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  name,
                  style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13),
                ),
                Text(
                  'DNI: $dni • Puesto: $stall',
                  style: const TextStyle(color: Colors.white54, fontSize: 11),
                ),
              ],
            ),
          ),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
                decoration: BoxDecoration(
                  color: Colors.green.shade900,
                  borderRadius: BorderRadius.circular(6),
                ),
                child: const Text(
                  'PRESENTE',
                  style: TextStyle(color: Colors.greenAccent, fontSize: 9, fontWeight: FontWeight.bold),
                ),
              ),
              const SizedBox(height: 3),
              Text(
                timeStr,
                style: const TextStyle(color: Colors.white38, fontSize: 10, fontFamily: 'monospace'),
              ),
            ],
          ),
        ],
      ),
    );
  }

  // Tarjeta de socio Ausente con botón de marcar asistencia rápida
  Widget _buildAbsentCard(Map<String, dynamic> item) {
    final name = '${item['last_name']}, ${item['first_name']}';
    final dni = item['dni'] ?? '';
    final stall = item['stall_code'] ?? 'Sin puesto';
    final category = item['business_category'] ?? '';

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
          CircleAvatar(
            radius: 16,
            backgroundColor: Colors.red.shade900,
            child: const Icon(Icons.person_outline, color: Colors.white70, size: 18),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  name,
                  style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13),
                ),
                Text(
                  'DNI: $dni • Puesto: $stall${category.isNotEmpty ? " ($category)" : ""}',
                  style: const TextStyle(color: Colors.white54, fontSize: 11),
                ),
              ],
            ),
          ),
          ElevatedButton.icon(
            style: ElevatedButton.styleFrom(
              backgroundColor: const Color(0xFF047857),
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
              shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
            ),
            icon: const Icon(Icons.check, size: 14, color: Colors.white),
            label: const Text('Marcar', style: TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.bold)),
            onPressed: () => _confirmManualAttendance(item),
          ),
        ],
      ),
    );
  }
}