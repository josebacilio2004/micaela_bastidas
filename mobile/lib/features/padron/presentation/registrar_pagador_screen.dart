import 'package:flutter/material.dart';
import 'package:uuid/uuid.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/database/local_database.dart';
import '../../../core/network/api_client.dart';
import 'carnet_qr_dialog.dart';

class RegistrarPagadorScreen extends StatefulWidget {
  const RegistrarPagadorScreen({super.key});

  @override
  State<RegistrarPagadorScreen> createState() => _RegistrarPagadorScreenState();
}

class _RegistrarPagadorScreenState extends State<RegistrarPagadorScreen> {
  final _formKey = GlobalKey<FormState>();
  final _dniCtrl = TextEditingController();
  final _firstNameCtrl = TextEditingController();
  final _lastNameCtrl = TextEditingController();
  final _phoneCtrl = TextEditingController();
  final _stallCtrl = TextEditingController();
  final _customRubroCtrl = TextEditingController();

  String _selectedTypeCode = 'SOCIO';
  String _selectedRubro = 'Carnes y Pescados';
  bool _isCustomRubro = false;
  bool _isSaving = false;

  final List<String> _rubrosList = [
    'Carnes y Pescados',
    'Frutas y Verduras',
    'Abarrotes y Granos',
    'Comidas y Jugos',
    'Flores y Plantas',
    'Bolsas y Plásticos',
    'Hierbas y Especias',
    'Tubérculos',
  ];

  @override
  void dispose() {
    _dniCtrl.dispose();
    _firstNameCtrl.dispose();
    _lastNameCtrl.dispose();
    _phoneCtrl.dispose();
    _stallCtrl.dispose();
    _customRubroCtrl.dispose();
    super.dispose();
  }

  Future<void> _handleSave() async {
    if (!_formKey.currentState!.validate()) return;

    setState(() => _isSaving = true);
    final dni = _dniCtrl.text.trim();
    final firstName = _firstNameCtrl.text.trim();
    final lastName = _lastNameCtrl.text.trim();
    final phone = _phoneCtrl.text.trim();
    final stallCode = _stallCtrl.text.trim().toUpperCase();
    final rubro = _isCustomRubro ? _customRubroCtrl.text.trim() : _selectedRubro;
    final qrCode = 'MB-QR-$dni';
    final tempId = const Uuid().v4();

    String typeName = 'Socio Titular (Mensual)';
    if (_selectedTypeCode == 'AMBULANTE_FIJO') {
      typeName = 'Ambulante Fijo (Diario)';
    } else if (_selectedTypeCode == 'AMBULANTE_TEMPORAL') {
      typeName = 'Ambulante Temporal (Diario)';
    }

    final localMerchant = {
      'id': tempId,
      'internalCode': 'MB-COM-${dni.length >= 4 ? dni.substring(dni.length - 4) : dni}',
      'firstName': firstName,
      'lastName': lastName,
      'dni': dni,
      'phone': phone,
      'typeName': typeName,
      'merchantType': {'code': _selectedTypeCode, 'name': typeName},
      'stallCode': stallCode,
      'stall': stallCode.isNotEmpty ? {'code': stallCode} : null,
      'businessCategory': rubro,
      'qrCode': qrCode,
    };

    // 1. Guardar de inmediato en SQLite local (100% OFFLINE-FIRST)
    await LocalDatabase.instance.insertMerchantLocal(localMerchant);

    // 2. Si hay conexión, sincronizar con el servidor en segundo plano
    try {
      final typesRes = await ApiClient().dio.get('/merchant-types');
      final typeList = typesRes.data as List;
      final matchedType = typeList.firstWhere(
        (t) => t['code'] == _selectedTypeCode,
        orElse: () => typeList.first,
      );

      await ApiClient().dio.post(
        '/merchants',
        data: {
          'firstName': firstName,
          'lastName': lastName,
          'dni': dni,
          'phone': phone.isNotEmpty ? phone : null,
          'merchantTypeId': matchedType['id'],
          'businessCategory': rubro,
        },
      );
    } catch (_) {
      // Se mantiene en SQLite y se sincronizará luego
    }

    if (mounted) {
      setState(() => _isSaving = false);
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          backgroundColor: AppTheme.primary,
          content: Text('¡Pagador registrado! QR generado: $qrCode'),
        ),
      );

      // Mostrar de inmediato el carnet digital generado
      CarnetQrDialog.show(context, localMerchant);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text(
          'REGISTRAR NUEVO PAGADOR',
          style: TextStyle(fontSize: 15, fontWeight: FontWeight.w900),
        ),
      ),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Form(
          key: _formKey,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Banner informativo
              Container(
                padding: const EdgeInsets.all(14),
                decoration: BoxDecoration(
                  color: AppTheme.primary.withValues(alpha: 0.08),
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: AppTheme.primary.withValues(alpha: 0.2)),
                ),
                child: Row(
                  children: const [
                    Icon(Icons.qr_code_2, color: AppTheme.primary, size: 28),
                    SizedBox(width: 12),
                    Expanded(
                      child: Text(
                        'Al registrar al pagador se generará automáticamente su código QR oficial scannable y se guardará al instante en el móvil.',
                        style: TextStyle(color: Color(0xFF0F172A), fontSize: 11, fontWeight: FontWeight.w600),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 18),

              // Esquema de Pagador (Subdivisión)
              const Text(
                'TIPO DE PAGADOR Y ESQUEMA DE COBRO',
                style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.black54, letterSpacing: 0.8),
              ),
              const SizedBox(height: 8),
              Row(
                children: [
                  _typeOption('SOCIO', '🏛️ Socio', 'Mensual'),
                  const SizedBox(width: 8),
                  _typeOption('AMBULANTE_FIJO', '🛒 Amb. Fijo', 'Diario'),
                  const SizedBox(width: 8),
                  _typeOption('AMBULANTE_TEMPORAL', '🎪 Temporal', 'Diario'),
                ],
              ),
              const SizedBox(height: 18),

              // Datos Personales
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: const Color(0xFFE2E8F0)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('DATOS DEL COMERCIANTE', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppTheme.primary)),
                    const SizedBox(height: 14),

                    // DNI y Celular
                    Row(
                      children: [
                        Expanded(
                          child: TextFormField(
                            controller: _dniCtrl,
                            keyboardType: TextInputType.number,
                            maxLength: 8,
                            style: const TextStyle(fontFamily: 'monospace', fontWeight: FontWeight.bold),
                            decoration: const InputDecoration(
                              labelText: 'DNI (8 dígitos) *',
                              prefixIcon: Icon(Icons.badge_outlined, size: 20),
                              counterText: '',
                            ),
                            validator: (val) {
                              if (val == null || val.trim().length != 8) {
                                return '8 dígitos';
                              }
                              return null;
                            },
                          ),
                        ),
                        const SizedBox(width: 12),
                        Expanded(
                          child: TextFormField(
                            controller: _phoneCtrl,
                            keyboardType: TextInputType.phone,
                            maxLength: 9,
                            style: const TextStyle(fontFamily: 'monospace'),
                            decoration: const InputDecoration(
                              labelText: 'Celular',
                              prefixIcon: Icon(Icons.phone_android, size: 20),
                              counterText: '',
                            ),
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 12),

                    // Nombres
                    TextFormField(
                      controller: _firstNameCtrl,
                      textCapitalization: TextCapitalization.words,
                      decoration: const InputDecoration(
                        labelText: 'Nombres *',
                        prefixIcon: Icon(Icons.person_outline, size: 20),
                      ),
                      validator: (val) => val == null || val.trim().isEmpty ? 'Obligatorio' : null,
                    ),
                    const SizedBox(height: 12),

                    // Apellidos
                    TextFormField(
                      controller: _lastNameCtrl,
                      textCapitalization: TextCapitalization.words,
                      decoration: const InputDecoration(
                        labelText: 'Apellidos *',
                        prefixIcon: Icon(Icons.person_outline, size: 20),
                      ),
                      validator: (val) => val == null || val.trim().isEmpty ? 'Obligatorio' : null,
                    ),
                    const SizedBox(height: 12),

                    // Puesto asignado (opcional)
                    TextFormField(
                      controller: _stallCtrl,
                      textCapitalization: TextCapitalization.characters,
                      decoration: const InputDecoration(
                        labelText: 'Puesto asignado (ej: A-15, vacío si es ambulatorio)',
                        prefixIcon: Icon(Icons.storefront_outlined, size: 20),
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 18),

              // Rubro / Giro comercial
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(20),
                  border: Border.all(color: const Color(0xFFE2E8F0)),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceBetween,
                      children: [
                        const Text('RUBRO / GIRO COMERCIAL', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: AppTheme.primary)),
                        TextButton(
                          style: TextButton.styleFrom(padding: EdgeInsets.zero, visualDensity: VisualDensity.compact),
                          onPressed: () => setState(() => _isCustomRubro = !_isCustomRubro),
                          child: Text(_isCustomRubro ? 'Seleccionar de lista' : '+ Otro rubro', style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                        ),
                      ],
                    ),
                    const SizedBox(height: 10),

                    if (!_isCustomRubro)
                      Wrap(
                        spacing: 8,
                        runSpacing: 8,
                        children: _rubrosList.map((r) {
                          final isSelected = _selectedRubro == r;
                          return ChoiceChip(
                            label: Text(r, style: TextStyle(fontSize: 11, fontWeight: isSelected ? FontWeight.bold : FontWeight.normal)),
                            selected: isSelected,
                            selectedColor: AppTheme.primary.withValues(alpha: 0.15),
                            labelStyle: TextStyle(color: isSelected ? AppTheme.primary : const Color(0xFF475569)),
                            backgroundColor: const Color(0xFFF1F5F9),
                            onSelected: (_) => setState(() => _selectedRubro = r),
                          );
                        }).toList(),
                      )
                    else
                      TextFormField(
                        controller: _customRubroCtrl,
                        textCapitalization: TextCapitalization.sentences,
                        decoration: const InputDecoration(
                          labelText: 'Escriba el nombre del nuevo rubro',
                          prefixIcon: Icon(Icons.category_outlined, size: 20),
                        ),
                        validator: (val) {
                          if (_isCustomRubro && (val == null || val.trim().isEmpty)) {
                            return 'Ingrese el rubro';
                          }
                          return null;
                        },
                      ),
                  ],
                ),
              ),
              const SizedBox(height: 24),

              // Botón Guardar y Generar QR
              ElevatedButton.icon(
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppTheme.primary,
                  padding: const EdgeInsets.symmetric(vertical: 16),
                  shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
                  elevation: 2,
                ),
                icon: _isSaving
                    ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(color: Colors.white, strokeWidth: 2))
                    : const Icon(Icons.qr_code, color: Colors.white),
                label: Text(
                  _isSaving ? 'GUARDANDO Y GENERANDO QR...' : 'REGISTRAR Y GENERAR QR',
                  style: const TextStyle(color: Colors.white, fontWeight: FontWeight.w900, fontSize: 13, letterSpacing: 0.8),
                ),
                onPressed: _isSaving ? null : _handleSave,
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _typeOption(String code, String label, String period) {
    final isSelected = _selectedTypeCode == code;
    return Expanded(
      child: InkWell(
        onTap: () => setState(() => _selectedTypeCode = code),
        borderRadius: BorderRadius.circular(12),
        child: Container(
          padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 6),
          decoration: BoxDecoration(
            color: isSelected ? AppTheme.primary : Colors.white,
            borderRadius: BorderRadius.circular(12),
            border: Border.all(
              color: isSelected ? AppTheme.primary : const Color(0xFFCBD5E1),
              width: 1.5,
            ),
          ),
          child: Column(
            children: [
              Text(
                label,
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.bold,
                  color: isSelected ? Colors.white : const Color(0xFF0F172A),
                ),
              ),
              const SizedBox(height: 2),
              Container(
                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1.5),
                decoration: BoxDecoration(
                  color: isSelected ? Colors.white.withValues(alpha: 0.2) : const Color(0xFFF1F5F9),
                  borderRadius: BorderRadius.circular(6),
                ),
                child: Text(
                  period,
                  style: TextStyle(
                    fontSize: 9,
                    fontWeight: FontWeight.bold,
                    color: isSelected ? Colors.white : Colors.black54,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}
