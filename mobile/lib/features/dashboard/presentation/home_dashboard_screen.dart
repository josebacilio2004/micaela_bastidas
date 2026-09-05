import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../../core/network/api_client.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/sync/sync_service.dart';
import '../../cobranza/presentation/cobrar_screen.dart';
import '../../servicios_higienicos/presentation/sshh_counter_screen.dart';
import '../../caja/presentation/caja_screen.dart';
import '../../auth/presentation/login_screen.dart';

class HomeDashboardScreen extends StatefulWidget {
  const HomeDashboardScreen({super.key});

  @override
  State<HomeDashboardScreen> createState() => _HomeDashboardScreenState();
}

class _HomeDashboardScreenState extends State<HomeDashboardScreen> {
  Map<String, dynamic>? _dashboardData;
  String _userName = '';
  String _userRole = '';
  

  @override
  void initState() {
    super.initState();
    _loadUser();
    _fetchDashboard();
  }

  Future<void> _loadUser() async {
    final prefs = await SharedPreferences.getInstance();
    setState(() {
      _userName = prefs.getString('user_name') ?? 'Usuario';
      _userRole = prefs.getString('user_role') ?? '';
    });
  }

  Future<void> _fetchDashboard() async {
    
    try {
      final res = await ApiClient().dio.get('/reports/dashboard');
      setState(() {
        _dashboardData = res.data;
      });
    } catch (e) {
      // Offline fallback
    } finally {
      
    }
  }

  Future<void> _triggerSync() async {
    ScaffoldMessenger.of(context).showSnackBar(
      const SnackBar(content: Text('Sincronizando operaciones con el servidor...')),
    );
    final count = await SyncService.instance.syncPendingPayments();
    _fetchDashboard();
    if (mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text('$count operaciones sincronizadas.')),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final todayFormatted = DateFormat("EEEE d 'de' MMMM, y", 'es_PE').format(DateTime.now());

    final totalToday = _dashboardData?['today']?['total'] ?? 0.0;
    final alcabalaToday = _dashboardData?['today']?['alcabala'] ?? 0.0;
    final waterToday = _dashboardData?['today']?['water'] ?? 0.0;
    final urinalToday = _dashboardData?['today']?['urinal'] ?? 0.0;
    final toiletToday = _dashboardData?['today']?['toilet'] ?? 0.0;

    return Scaffold(
      appBar: AppBar(
        title: Column(
          children: [
            const Text('MICAELA BASTIDAS', style: TextStyle(fontSize: 14, fontWeight: FontWeight.w900)),
            Text(todayFormatted, style: const TextStyle(fontSize: 11, color: Colors.white70)),
          ],
        ),
        actions: [
          IconButton(
            icon: const Icon(Icons.sync),
            tooltip: 'Sincronizar',
            onPressed: _triggerSync,
          ),
          IconButton(
            icon: const Icon(Icons.logout),
            tooltip: 'Cerrar sesión',
            onPressed: () async {
              final prefs = await SharedPreferences.getInstance();
              await prefs.clear();
              if (context.mounted) {
                Navigator.of(context).pushReplacement(
                  MaterialPageRoute(builder: (_) => const LoginScreen()),
                );
              }
            },
          ),
        ],
      ),
      body: RefreshIndicator(
        onRefresh: _fetchDashboard,
        child: SingleChildScrollView(
          physics: const AlwaysScrollableScrollPhysics(),
          padding: const EdgeInsets.all(16),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: [
              // Welcome User Card
              Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: Colors.white,
                  borderRadius: BorderRadius.circular(16),
                  border: Border.all(color: Colors.grey.shade200),
                ),
                child: Row(
                  children: [
                    CircleAvatar(
                      backgroundColor: AppTheme.primary.withOpacity(0.15),
                      child: const Icon(Icons.person, color: AppTheme.primary),
                    ),
                    const SizedBox(width: 12),
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(_userName, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14)),
                          Text('Rol: $_userRole', style: TextStyle(color: Colors.grey.shade600, fontSize: 12)),
                        ],
                      ),
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 16),

              // Recaudación del Día (Card Principal)
              Container(
                padding: const EdgeInsets.all(20),
                decoration: BoxDecoration(
                  gradient: const LinearGradient(
                    colors: [AppTheme.primaryDark, AppTheme.primary],
                    begin: Alignment.topLeft,
                    end: Alignment.bottomRight,
                  ),
                  borderRadius: BorderRadius.circular(20),
                  boxShadow: [
                    BoxShadow(
                      color: AppTheme.primary.withOpacity(0.35),
                      blurRadius: 14,
                      offset: const Offset(0, 6),
                    ),
                  ],
                ),
                child: Column(
                  children: [
                    const Text(
                      'RECAUDACIÓN DEL DÍA',
                      style: TextStyle(color: Colors.white70, fontSize: 12, fontWeight: FontWeight.bold, letterSpacing: 1),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      'S/ ${NumberFormat("#,##0.00", "es_PE").format(totalToday)}',
                      style: const TextStyle(color: Colors.white, fontSize: 34, fontWeight: FontWeight.w900),
                    ),
                    const SizedBox(height: 16),
                    const Divider(color: Colors.white24),
                    const SizedBox(height: 8),

                    // Desglose
                    Row(
                      mainAxisAlignment: MainAxisAlignment.spaceAround,
                      children: [
                        _subStat('Alcabala', alcabalaToday),
                        _subStat('Agua', waterToday),
                        _subStat('Miccionario', urinalToday),
                        _subStat('Retrete', toiletToday),
                      ],
                    ),
                  ],
                ),
              ),
              const SizedBox(height: 24),

              const Text(
                'OPERACIONES PRINCIPALES',
                style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.grey, letterSpacing: 1),
              ),
              const SizedBox(height: 12),

              // Botones Grandes de Acción
              Row(
                children: [
                  Expanded(
                    child: _actionButton(
                      title: 'COBRAR',
                      subtitle: 'Alcabala / Agua',
                      icon: Icons.point_of_sale,
                      color: AppTheme.primary,
                      onTap: () => Navigator.push(
                        context,
                        MaterialPageRoute(builder: (_) => const CobrarScreen()),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: _actionButton(
                      title: 'SERVICIOS HIGIÉNICOS',
                      subtitle: 'Micc. / Retrete',
                      icon: Icons.wc,
                      color: const Color(0xFF0284C7),
                      onTap: () => Navigator.push(
                        context,
                        MaterialPageRoute(builder: (_) => const SshhCounterScreen()),
                      ),
                    ),
                  ),
                ],
              ),
              const SizedBox(height: 12),

              Row(
                children: [
                  Expanded(
                    child: _actionButton(
                      title: 'CAJA Y ARQUEO',
                      subtitle: 'Cierre de turno',
                      icon: Icons.account_balance_wallet,
                      color: const Color(0xFFD97706),
                      onTap: () => Navigator.push(
                        context,
                        MaterialPageRoute(builder: (_) => const CajaScreen()),
                      ),
                    ),
                  ),
                  const SizedBox(width: 12),
                  Expanded(
                    child: _actionButton(
                      title: 'SINCRONIZAR',
                      subtitle: 'Cola offline',
                      icon: Icons.cloud_sync,
                      color: AppTheme.secondary,
                      onTap: _triggerSync,
                    ),
                  ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _subStat(String label, dynamic value) {
    return Column(
      children: [
        Text(label, style: const TextStyle(color: Colors.white70, fontSize: 10)),
        const SizedBox(height: 2),
        Text(
          'S/ ${NumberFormat("#,##0.00", "es_PE").format(value)}',
          style: const TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12),
        ),
      ],
    );
  }

  Widget _actionButton({
    required String title,
    required String subtitle,
    required IconData icon,
    required Color color,
    required VoidCallback onTap,
  }) {
    return InkWell(
      onTap: onTap,
      borderRadius: BorderRadius.circular(18),
      child: Container(
        padding: const EdgeInsets.symmetric(vertical: 20, horizontal: 16),
        decoration: BoxDecoration(
          color: Colors.white,
          borderRadius: BorderRadius.circular(18),
          border: Border.all(color: color.withOpacity(0.2), width: 1.5),
          boxShadow: [
            BoxShadow(
              color: color.withOpacity(0.08),
              blurRadius: 10,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: Column(
          children: [
            CircleAvatar(
              backgroundColor: color.withOpacity(0.12),
              radius: 24,
              child: Icon(icon, color: color, size: 26),
            ),
            const SizedBox(height: 12),
            Text(
              title,
              textAlign: TextAlign.center,
              style: TextStyle(
                fontWeight: FontWeight.w900,
                fontSize: 13,
                color: color,
                letterSpacing: 0.5,
              ),
            ),
            const SizedBox(height: 2),
            Text(
              subtitle,
              textAlign: TextAlign.center,
              style: TextStyle(fontSize: 11, color: Colors.grey.shade600),
            ),
          ],
        ),
      ),
    );
  }
}
