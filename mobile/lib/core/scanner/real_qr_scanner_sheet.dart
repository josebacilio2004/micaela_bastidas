import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:mobile_scanner/mobile_scanner.dart';
import '../theme/app_theme.dart';

class RealQrScannerSheet extends StatefulWidget {
  final String title;
  final String hintText;

  const RealQrScannerSheet({
    super.key,
    this.title = 'Escanear Credencial QR',
    this.hintText = 'Apunte la cámara al código QR de la credencial',
  });

  static Future<String?> scan(BuildContext context, {String title = 'Escanear Credencial QR'}) {
    return Navigator.push<String>(
      context,
      MaterialPageRoute(
        builder: (_) => RealQrScannerSheet(title: title),
        fullscreenDialog: true,
      ),
    );
  }

  @override
  State<RealQrScannerSheet> createState() => _RealQrScannerSheetState();
}

class _RealQrScannerSheetState extends State<RealQrScannerSheet> with SingleTickerProviderStateMixin {
  late MobileScannerController _controller;
  final _manualInputController = TextEditingController();
  bool _isTorchOn = false;
  bool _hasDetected = false;
  late AnimationController _animController;

  @override
  void initState() {
    super.initState();
    _controller = MobileScannerController(
      detectionSpeed: DetectionSpeed.noDuplicates,
      facing: CameraFacing.back,
      torchEnabled: false,
    );

    _animController = AnimationController(
      vsync: this,
      duration: const Duration(seconds: 2),
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    _animController.dispose();
    _manualInputController.dispose();
    _controller.dispose();
    super.dispose();
  }

  void _onDetect(BarcodeCapture capture) {
    if (_hasDetected) return;
    final barcodes = capture.barcodes;
    for (final barcode in barcodes) {
      final code = barcode.rawValue?.trim();
      if (code != null && code.isNotEmpty) {
        _hasDetected = true;
        HapticFeedback.mediumImpact();
        Navigator.pop(context, code);
        break;
      }
    }
  }

  void _submitManual() {
    final code = _manualInputController.text.trim();
    if (code.isNotEmpty) {
      _hasDetected = true;
      HapticFeedback.lightImpact();
      Navigator.pop(context, code);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: Colors.black,
      appBar: AppBar(
        backgroundColor: Colors.black,
        elevation: 0,
        title: Text(
          widget.title,
          style: const TextStyle(fontSize: 15, fontWeight: FontWeight.w900, color: Colors.white),
        ),
        leading: IconButton(
          icon: const Icon(Icons.close, color: Colors.white),
          onPressed: () => Navigator.pop(context),
        ),
        actions: [
          IconButton(
            icon: Icon(
              _isTorchOn ? Icons.flash_on : Icons.flash_off,
              color: _isTorchOn ? Colors.amberAccent : Colors.white,
            ),
            tooltip: 'Linterna',
            onPressed: () async {
              await _controller.toggleTorch();
              setState(() => _isTorchOn = !_isTorchOn);
            },
          ),
          IconButton(
            icon: const Icon(Icons.flip_camera_ios, color: Colors.white),
            tooltip: 'Cambiar cámara',
            onPressed: () => _controller.switchCamera(),
          ),
        ],
      ),
      body: Stack(
        children: [
          // 1. Live Camera View
            MobileScanner(
              controller: _controller,
              onDetect: _onDetect,
              errorBuilder: (context, error) {
                return Container(
                color: const Color(0xFF0F172A),
                padding: const EdgeInsets.all(24),
                child: Center(
                  child: Column(
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Icon(Icons.camera_alt_outlined, color: Colors.white54, size: 54),
                      const SizedBox(height: 14),
                      const Text(
                        'Cámara en espera o no disponible en este entorno',
                        textAlign: TextAlign.center,
                        style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13),
                      ),
                      const SizedBox(height: 8),
                      const Text(
                        'Puede usar el buscador por DNI o código manual que se encuentra en la parte inferior.',
                        textAlign: TextAlign.center,
                        style: TextStyle(color: Colors.white54, fontSize: 11),
                      ),
                    ],
                  ),
                ),
              );
            },
          ),

          // 2. Viewfinder Overlay
          Center(
            child: SizedBox(
              width: 260,
              height: 260,
              child: Stack(
                children: [
                  // Corner borders
                  Container(
                    decoration: BoxDecoration(
                      border: Border.all(color: Colors.white24, width: 1),
                      borderRadius: BorderRadius.circular(20),
                    ),
                  ),
                  // Glowing corners
                  Positioned(
                    top: 0,
                    left: 0,
                    child: Container(
                      width: 32,
                      height: 32,
                      decoration: const BoxDecoration(
                        border: Border(
                          top: BorderSide(color: AppTheme.primary, width: 4),
                          left: BorderSide(color: AppTheme.primary, width: 4),
                        ),
                        borderRadius: BorderRadius.only(topLeft: Radius.circular(18)),
                      ),
                    ),
                  ),
                  Positioned(
                    top: 0,
                    right: 0,
                    child: Container(
                      width: 32,
                      height: 32,
                      decoration: const BoxDecoration(
                        border: Border(
                          top: BorderSide(color: AppTheme.primary, width: 4),
                          right: BorderSide(color: AppTheme.primary, width: 4),
                        ),
                        borderRadius: BorderRadius.only(topRight: Radius.circular(18)),
                      ),
                    ),
                  ),
                  Positioned(
                    bottom: 0,
                    left: 0,
                    child: Container(
                      width: 32,
                      height: 32,
                      decoration: const BoxDecoration(
                        border: Border(
                          bottom: BorderSide(color: AppTheme.primary, width: 4),
                          left: BorderSide(color: AppTheme.primary, width: 4),
                        ),
                        borderRadius: BorderRadius.only(bottomLeft: Radius.circular(18)),
                      ),
                    ),
                  ),
                  Positioned(
                    bottom: 0,
                    right: 0,
                    child: Container(
                      width: 32,
                      height: 32,
                      decoration: const BoxDecoration(
                        border: Border(
                          bottom: BorderSide(color: AppTheme.primary, width: 4),
                          right: BorderSide(color: AppTheme.primary, width: 4),
                        ),
                        borderRadius: BorderRadius.only(bottomRight: Radius.circular(18)),
                      ),
                    ),
                  ),

                  // Animated laser line
                  AnimatedBuilder(
                    animation: _animController,
                    builder: (context, child) {
                      return Positioned(
                        top: 20 + (_animController.value * 220),
                        left: 12,
                        right: 12,
                        child: Container(
                          height: 2,
                          decoration: BoxDecoration(
                            gradient: const LinearGradient(
                              colors: [Colors.transparent, AppTheme.primary, Colors.transparent],
                            ),
                            boxShadow: [
                              BoxShadow(
                                color: AppTheme.primary.withValues(alpha: 0.8),
                                blurRadius: 8,
                                spreadRadius: 1,
                              ),
                            ],
                          ),
                        ),
                      );
                    },
                  ),
                ],
              ),
            ),
          ),

          // 3. Hint Text
          Positioned(
            top: 20,
            left: 20,
            right: 20,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 8),
              decoration: BoxDecoration(
                color: Colors.black54,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Text(
                widget.hintText,
                textAlign: TextAlign.center,
                style: const TextStyle(color: Colors.white, fontSize: 11, fontWeight: FontWeight.w600),
              ),
            ),
          ),

          // 4. Bottom manual input bar
          Positioned(
            bottom: 0,
            left: 0,
            right: 0,
            child: Container(
              padding: const EdgeInsets.fromLTRB(16, 16, 16, 24),
              decoration: const BoxDecoration(
                color: Color(0xFF0F172A),
                borderRadius: BorderRadius.only(
                  topLeft: Radius.circular(24),
                  topRight: Radius.circular(24),
                ),
              ),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                crossAxisAlignment: CrossAxisAlignment.stretch,
                children: [
                  const Text(
                    '¿Dificultad con la credencial? Ingrese DNI o Código:',
                    style: TextStyle(color: Colors.white70, fontSize: 11, fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 10),
                  Row(
                    children: [
                      Expanded(
                        child: TextField(
                          controller: _manualInputController,
                          style: const TextStyle(color: Colors.white, fontSize: 13, fontFamily: 'monospace'),
                          decoration: InputDecoration(
                            hintText: 'ej: 42891023 o MB-QR-42891023',
                            hintStyle: const TextStyle(color: Colors.white38, fontSize: 12),
                            filled: true,
                            fillColor: const Color(0xFF1E293B),
                            contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                            border: OutlineInputBorder(
                              borderRadius: BorderRadius.circular(12),
                              borderSide: const BorderSide(color: Colors.white24),
                            ),
                            prefixIcon: const Icon(Icons.qr_code, color: Colors.white54, size: 18),
                          ),
                          onSubmitted: (_) => _submitManual(),
                        ),
                      ),
                      const SizedBox(width: 8),
                      ElevatedButton(
                        style: ElevatedButton.styleFrom(
                          backgroundColor: AppTheme.primary,
                          padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                        onPressed: _submitManual,
                        child: const Text('Identificar', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12)),
                      ),
                    ],
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}
