import 'package:flutter/material.dart';
import 'package:qr_flutter/qr_flutter.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/constants/api_constants.dart';
import '../../cobranza/presentation/cobrar_screen.dart';

class CarnetQrDialog extends StatelessWidget {
  final Map<String, dynamic> merchant;

  const CarnetQrDialog({super.key, required this.merchant});

  static void show(BuildContext context, Map<String, dynamic> merchant) {
    showDialog(
      context: context,
      builder: (_) => CarnetQrDialog(merchant: merchant),
    );
  }

  @override
  Widget build(BuildContext context) {
    final firstName = (merchant['firstName'] ?? '').toString();
    final lastName = (merchant['lastName'] ?? '').toString();
    final dni = (merchant['dni'] ?? '').toString();
    final internalCode = (merchant['internalCode'] ?? '').toString();
    final stallCode = (merchant['stall']?['code'] ?? merchant['stall_code'] ?? merchant['stallCode'] ?? 'Ambulatorio').toString();
    final category = (merchant['businessCategory'] ?? merchant['business_category'] ?? 'Comercio').toString();
    final typeName = (merchant['merchantType']?['name'] ?? merchant['type_name'] ?? merchant['typeName'] ?? 'Socio').toString();
    final qrData = (merchant['qrCode'] ?? merchant['qr_code'] ?? 'MB-QR-$dni').toString();

    final rawPhoto = (merchant['photoUrl'] ?? merchant['photo_url'] ?? '').toString();
    final photoUrl = rawPhoto.isNotEmpty
        ? (rawPhoto.startsWith('http') ? rawPhoto : '${ApiConstants.hostOrigin}$rawPhoto')
        : '';

    final initials = (firstName.isNotEmpty ? firstName[0] : '') + (lastName.isNotEmpty ? lastName[0] : '');

    return Dialog(
      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(24)),
      backgroundColor: Colors.white,
      insetPadding: const EdgeInsets.symmetric(horizontal: 20, vertical: 24),
      child: SingleChildScrollView(
        padding: const EdgeInsets.all(20),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.stretch,
          children: [
            // Header
            Row(
              children: [
                const Icon(Icons.verified_user, color: AppTheme.primary, size: 20),
                const SizedBox(width: 8),
                const Expanded(
                  child: Text(
                    'CREDENCIAL OFICIAL',
                    style: TextStyle(
                      fontSize: 12,
                      fontWeight: FontWeight.w900,
                      color: AppTheme.primary,
                      letterSpacing: 1.0,
                    ),
                  ),
                ),
                IconButton(
                  icon: const Icon(Icons.close, size: 20, color: Colors.black45),
                  onPressed: () => Navigator.pop(context),
                  padding: EdgeInsets.zero,
                  constraints: const BoxConstraints(),
                ),
              ],
            ),
            const SizedBox(height: 16),

            // Card Frame
            Container(
              padding: const EdgeInsets.all(16),
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  colors: [Colors.green.shade50.withValues(alpha: 0.5), Colors.white],
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                ),
                borderRadius: BorderRadius.circular(20),
                border: Border.all(color: AppTheme.primary.withValues(alpha: 0.3), width: 1.5),
                boxShadow: [
                  BoxShadow(color: Colors.black.withValues(alpha: 0.04), blurRadius: 10, offset: const Offset(0, 4)),
                ],
              ),
              child: Column(
                children: [
                  // Merchant Photo & Identification Row
                  Row(
                    crossAxisAlignment: CrossAxisAlignment.center,
                    children: [
                      ClipRRect(
                        borderRadius: BorderRadius.circular(14),
                        child: photoUrl.isNotEmpty
                            ? Image.network(
                                photoUrl,
                                width: 72,
                                height: 86,
                                fit: BoxFit.cover,
                                errorBuilder: (_, __, ___) => _fallbackAvatar(initials),
                              )
                            : _fallbackAvatar(initials),
                      ),
                      const SizedBox(width: 12),
                      Expanded(
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              '$lastName, $firstName',
                              style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w900, color: Color(0xFF0F172A)),
                            ),
                            const SizedBox(height: 4),
                            Container(
                              padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 2),
                              decoration: BoxDecoration(
                                color: AppTheme.primary.withValues(alpha: 0.1),
                                borderRadius: BorderRadius.circular(6),
                              ),
                              child: Text(
                                typeName,
                                style: const TextStyle(color: AppTheme.primary, fontSize: 10, fontWeight: FontWeight.bold),
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              'Puesto: $stallCode',
                              style: const TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Color(0xFF0F172A)),
                            ),
                          ],
                        ),
                      ),
                    ],
                  ),
                  const SizedBox(height: 14),

                  // Info grid
                  Container(
                    padding: const EdgeInsets.all(10),
                    decoration: BoxDecoration(
                      color: const Color(0xFFF8FAFC),
                      borderRadius: BorderRadius.circular(12),
                      border: Border.all(color: const Color(0xFFE2E8F0)),
                    ),
                    child: Column(
                      children: [
                        _infoRow('DNI:', dni, isMono: true),
                        const Divider(height: 12),
                        if (internalCode.isNotEmpty) ...[
                          _infoRow('Código:', internalCode, isMono: true),
                          const Divider(height: 12),
                        ],
                        _infoRow('Puesto:', stallCode),
                        const Divider(height: 12),
                        _infoRow('Rubro:', category),
                      ],
                    ),
                  ),
                  const SizedBox(height: 16),

                  // QR Code
                  Container(
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: Colors.white,
                      borderRadius: BorderRadius.circular(16),
                      border: Border.all(color: const Color(0xFFE2E8F0)),
                      boxShadow: [
                        BoxShadow(color: Colors.black.withValues(alpha: 0.03), blurRadius: 6),
                      ],
                    ),
                    child: Column(
                      children: [
                        QrImageView(
                          data: qrData,
                          version: QrVersions.auto,
                          size: 160,
                          backgroundColor: Colors.white,
                        ),
                        const SizedBox(height: 6),
                        Text(
                          qrData,
                          style: const TextStyle(fontSize: 10, fontFamily: 'monospace', color: Colors.black54, fontWeight: FontWeight.bold),
                        ),
                      ],
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),

            // Action button: Cobrar a este pagador
            ElevatedButton.icon(
              style: ElevatedButton.styleFrom(
                backgroundColor: AppTheme.primary,
                padding: const EdgeInsets.symmetric(vertical: 14),
                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                elevation: 1,
              ),
              icon: const Icon(Icons.payments_outlined, color: Colors.white, size: 20),
              label: const Text(
                'COBRAR A ESTE PAGADOR',
                style: TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 13),
              ),
              onPressed: () {
                Navigator.pop(context);
                Navigator.push(
                  context,
                  MaterialPageRoute(
                    builder: (_) => CobrarScreen(preselectedMerchant: merchant),
                  ),
                );
              },
            ),
          ],
        ),
      ),
    );
  }

  Widget _infoRow(String label, String value, {bool isMono = false}) {
    return Row(
      mainAxisAlignment: MainAxisAlignment.spaceBetween,
      children: [
        Text(label, style: const TextStyle(color: Colors.black54, fontSize: 11, fontWeight: FontWeight.w600)),
        Text(
          value,
          style: TextStyle(
            color: const Color(0xFF0F172A),
            fontSize: 11,
            fontWeight: FontWeight.bold,
            fontFamily: isMono ? 'monospace' : null,
          ),
        ),
      ],
    );
  }

  Widget _fallbackAvatar(String initials) {
    return Container(
      width: 72,
      height: 86,
      decoration: BoxDecoration(
        color: AppTheme.primary,
        borderRadius: BorderRadius.circular(14),
      ),
      alignment: Alignment.center,
      child: Text(
        initials.toUpperCase(),
        style: const TextStyle(
          color: Colors.white,
          fontSize: 22,
          fontWeight: FontWeight.w900,
        ),
      ),
    );
  }
}
