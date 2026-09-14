import 'package:flutter/material.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/database/local_database.dart';
import '../../../core/network/api_client.dart';
import '../../../core/constants/api_constants.dart';
import '../../cobranza/presentation/cobrar_screen.dart';
import 'carnet_qr_dialog.dart';
import 'registrar_pagador_screen.dart';

class PadronListScreen extends StatefulWidget {
  const PadronListScreen({super.key});

  @override
  State<PadronListScreen> createState() => _PadronListScreenState();
}

class _PadronListScreenState extends State<PadronListScreen> {
  final _searchCtrl = TextEditingController();
  List<Map<String, dynamic>> _merchants = [];
  bool _isLoading = true;
  String _selectedTab = 'ALL'; // 'ALL' | 'SOCIO' | 'AMBULANTE_FIJO' | 'AMBULANTE_TEMPORAL'

  @override
  void initState() {
    super.initState();
    _loadMerchants();
  }

  @override
  void dispose() {
    _searchCtrl.dispose();
    super.dispose();
  }

  Future<void> _loadMerchants() async {
    setState(() => _isLoading = true);

    // 1. Cargar desde SQLite local
    final localList = await LocalDatabase.instance.getAllCachedMerchants(
      typeFilter: _selectedTab,
      search: _searchCtrl.text,
    );

    if (mounted) {
      setState(() {
        _merchants = List<Map<String, dynamic>>.from(localList);
        _isLoading = false;
      });
    }

    // 2. Refrescar desde el backend en segundo plano si hay red
    try {
      final res = await ApiClient().dio.get('/merchants');
      final remoteList = res.data as List;
      await LocalDatabase.instance.cacheMerchants(remoteList);

      final updatedLocal = await LocalDatabase.instance.getAllCachedMerchants(
        typeFilter: _selectedTab,
        search: _searchCtrl.text,
      );

      if (mounted) {
        setState(() {
          _merchants = List<Map<String, dynamic>>.from(updatedLocal);
        });
      }
    } catch (_) {}
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text(
          'PADRÓN DE PAGADORES',
          style: TextStyle(fontSize: 15, fontWeight: FontWeight.w900),
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            tooltip: 'Recargar',
            onPressed: _loadMerchants,
          ),
        ],
      ),
      body: Column(
        children: [
          // 1. Search Bar
          Container(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
            color: Colors.white,
            child: TextField(
              controller: _searchCtrl,
              decoration: InputDecoration(
                hintText: 'Buscar por DNI, Nombres o Puesto...',
                hintStyle: const TextStyle(fontSize: 12, color: Colors.black38),
                prefixIcon: const Icon(Icons.search, size: 20, color: Colors.black45),
                suffixIcon: _searchCtrl.text.isNotEmpty
                    ? IconButton(
                        icon: const Icon(Icons.clear, size: 18),
                        onPressed: () {
                          _searchCtrl.clear();
                          _loadMerchants();
                        },
                      )
                    : null,
                contentPadding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
                filled: true,
                fillColor: const Color(0xFFF1F5F9),
                border: OutlineInputBorder(
                  borderRadius: BorderRadius.circular(14),
                  borderSide: BorderSide.none,
                ),
              ),
              onChanged: (_) => _loadMerchants(),
            ),
          ),

          // 2. Tabs / Filter Pills
          Container(
            color: Colors.white,
            padding: const EdgeInsets.fromLTRB(16, 0, 16, 12),
            child: SingleChildScrollView(
              scrollDirection: Axis.horizontal,
              child: Row(
                children: [
                  _filterPill('ALL', 'Todos (${_merchants.length})'),
                  const SizedBox(width: 8),
                  _filterPill('SOCIO', '🏛️ Socios (Mensual)'),
                  const SizedBox(width: 8),
                  _filterPill('AMBULANTE_FIJO', '🛒 Amb. Fijos (Diario)'),
                  const SizedBox(width: 8),
                  _filterPill('AMBULANTE_TEMPORAL', '🎪 Temporales (Diario)'),
                ],
              ),
            ),
          ),
          const Divider(height: 1, color: Color(0xFFE2E8F0)),

          // 3. Merchants List
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : _merchants.isEmpty
                    ? Center(
                        child: Column(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            const Icon(Icons.people_outline, size: 54, color: Colors.black26),
                            const SizedBox(height: 12),
                            const Text(
                              'No se encontraron pagadores',
                              style: TextStyle(fontWeight: FontWeight.bold, fontSize: 14, color: Colors.black54),
                            ),
                            const SizedBox(height: 6),
                            const Text(
                              'Presione el botón inferior para registrar uno nuevo con QR.',
                              style: TextStyle(fontSize: 12, color: Colors.black38),
                            ),
                            const SizedBox(height: 16),
                            ElevatedButton.icon(
                              style: ElevatedButton.styleFrom(backgroundColor: AppTheme.primary),
                              icon: const Icon(Icons.person_add, color: Colors.white, size: 18),
                              label: const Text('Registrar Nuevo Pagador', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                              onPressed: () async {
                                await Navigator.push(
                                  context,
                                  MaterialPageRoute(builder: (_) => const RegistrarPagadorScreen()),
                                );
                                _loadMerchants();
                              },
                            ),
                          ],
                        ),
                      )
                    : ListView.separated(
                        padding: const EdgeInsets.all(16),
                        itemCount: _merchants.length,
                        separatorBuilder: (ctx, i) => const SizedBox(height: 10),
                        itemBuilder: (context, index) {
                          final m = _merchants[index];
                          final firstName = (m['first_name'] ?? m['firstName'] ?? '').toString();
                          final lastName = (m['last_name'] ?? m['lastName'] ?? '').toString();
                          final dni = (m['dni'] ?? '').toString();
                          final stall = (m['stall_code'] ?? m['stallCode'] ?? 'Ambulante').toString();
                          final category = (m['business_category'] ?? m['businessCategory'] ?? 'Comercio').toString();
                          final typeName = (m['type_name'] ?? m['typeName'] ?? 'Socio').toString();
                          final initials = (firstName.isNotEmpty ? firstName[0] : '') + (lastName.isNotEmpty ? lastName[0] : '');
                          final rawPhoto = (m['photo_url'] ?? m['photoUrl'] ?? '').toString();
                          final photoUrl = rawPhoto.isNotEmpty
                              ? (rawPhoto.startsWith('http') ? rawPhoto : '${ApiConstants.hostOrigin}$rawPhoto')
                              : '';

                          return Container(
                            padding: const EdgeInsets.all(14),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(16),
                              border: Border.all(color: const Color(0xFFE2E8F0)),
                              boxShadow: [
                                BoxShadow(color: Colors.black.withValues(alpha: 0.02), blurRadius: 4),
                              ],
                            ),
                            child: Column(
                              children: [
                                Row(
                                  children: [
                                    ClipRRect(
                                      borderRadius: BorderRadius.circular(10),
                                      child: photoUrl.isNotEmpty
                                          ? Image.network(
                                              photoUrl,
                                              width: 40,
                                              height: 40,
                                              fit: BoxFit.cover,
                                              errorBuilder: (_, __, ___) => CircleAvatar(
                                                radius: 20,
                                                backgroundColor: AppTheme.primary.withValues(alpha: 0.12),
                                                child: Text(
                                                  initials.toUpperCase(),
                                                  style: const TextStyle(color: AppTheme.primary, fontWeight: FontWeight.bold, fontSize: 13),
                                                ),
                                              ),
                                            )
                                          : CircleAvatar(
                                              radius: 20,
                                              backgroundColor: AppTheme.primary.withValues(alpha: 0.12),
                                              child: Text(
                                                initials.toUpperCase(),
                                                style: const TextStyle(color: AppTheme.primary, fontWeight: FontWeight.bold, fontSize: 13),
                                              ),
                                            ),
                                    ),
                                    const SizedBox(width: 12),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Text(
                                            '$lastName, $firstName',
                                            style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 13, color: Color(0xFF0F172A)),
                                          ),
                                          const SizedBox(height: 2),
                                          Row(
                                            children: [
                                              Text('DNI: $dni', style: const TextStyle(fontSize: 11, fontFamily: 'monospace', color: Colors.black54)),
                                              const SizedBox(width: 8),
                                              Container(
                                                padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 1),
                                                decoration: BoxDecoration(
                                                  color: const Color(0xFFF1F5F9),
                                                  borderRadius: BorderRadius.circular(4),
                                                ),
                                                child: Text('Pto. $stall', style: const TextStyle(fontSize: 10, fontWeight: FontWeight.bold, color: Color(0xFF0F172A))),
                                              ),
                                            ],
                                          ),
                                        ],
                                      ),
                                    ),
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                                      decoration: BoxDecoration(
                                        color: typeName.contains('Socio')
                                            ? Colors.green.shade50
                                            : Colors.amber.shade50,
                                        borderRadius: BorderRadius.circular(8),
                                        border: Border.all(
                                          color: typeName.contains('Socio')
                                              ? Colors.green.shade200
                                              : Colors.amber.shade200,
                                        ),
                                      ),
                                      child: Text(
                                        typeName.contains('Socio') ? 'Mensual' : 'Diario',
                                        style: TextStyle(
                                          fontSize: 10,
                                          fontWeight: FontWeight.bold,
                                          color: typeName.contains('Socio') ? Colors.green.shade900 : Colors.amber.shade900,
                                        ),
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 10),
                                const Divider(height: 1, color: Color(0xFFF1F5F9)),
                                const SizedBox(height: 8),
                                Row(
                                  children: [
                                    Icon(Icons.category_outlined, size: 14, color: Colors.grey.shade500),
                                    const SizedBox(width: 4),
                                    Expanded(
                                      child: Text(category, style: TextStyle(fontSize: 11, color: Colors.grey.shade600)),
                                    ),
                                    // Botón Carnet QR
                                    OutlinedButton.icon(
                                      style: OutlinedButton.styleFrom(
                                        padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                        visualDensity: VisualDensity.compact,
                                        side: const BorderSide(color: Color(0xFFCBD5E1)),
                                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                      ),
                                      icon: const Icon(Icons.qr_code, size: 14, color: AppTheme.primary),
                                      label: const Text('Carnet QR', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: AppTheme.primary)),
                                      onPressed: () => CarnetQrDialog.show(context, m),
                                    ),
                                    const SizedBox(width: 8),
                                    // Botón Cobrar
                                    ElevatedButton.icon(
                                      style: ElevatedButton.styleFrom(
                                        backgroundColor: AppTheme.primary,
                                        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
                                        visualDensity: VisualDensity.compact,
                                        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(8)),
                                      ),
                                      icon: const Icon(Icons.payments_outlined, size: 14, color: Colors.white),
                                      label: const Text('Cobrar', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.white)),
                                      onPressed: () {
                                        Navigator.push(
                                          context,
                                          MaterialPageRoute(
                                            builder: (_) => CobrarScreen(preselectedMerchant: m),
                                          ),
                                        );
                                      },
                                    ),
                                  ],
                                ),
                              ],
                            ),
                          );
                        },
                      ),
          ),
        ],
      ),
      floatingActionButton: FloatingActionButton.extended(
        backgroundColor: AppTheme.primary,
        icon: const Icon(Icons.person_add, color: Colors.white),
        label: const Text('NUEVO PAGADOR', style: TextStyle(fontWeight: FontWeight.bold, color: Colors.white, fontSize: 12)),
        onPressed: () async {
          await Navigator.push(
            context,
            MaterialPageRoute(builder: (_) => const RegistrarPagadorScreen()),
          );
          _loadMerchants();
        },
      ),
    );
  }

  Widget _filterPill(String code, String label) {
    final isSelected = _selectedTab == code;
    return InkWell(
      onTap: () {
        setState(() => _selectedTab = code);
        _loadMerchants();
      },
      borderRadius: BorderRadius.circular(20),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 6),
        decoration: BoxDecoration(
          color: isSelected ? AppTheme.primary : const Color(0xFFF1F5F9),
          borderRadius: BorderRadius.circular(20),
        ),
        child: Text(
          label,
          style: TextStyle(
            fontSize: 11,
            fontWeight: isSelected ? FontWeight.bold : FontWeight.w500,
            color: isSelected ? Colors.white : const Color(0xFF475569),
          ),
        ),
      ),
    );
  }
}
