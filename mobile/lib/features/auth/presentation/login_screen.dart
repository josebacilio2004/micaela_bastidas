import 'package:flutter/material.dart';
import 'package:shared_preferences/shared_preferences.dart';
import '../../../core/network/api_client.dart';
import '../../../core/constants/api_constants.dart';
import '../../../core/theme/app_theme.dart';
import '../../dashboard/presentation/home_dashboard_screen.dart';

class LoginScreen extends StatefulWidget {
  const LoginScreen({super.key});

  @override
  State<LoginScreen> createState() => _LoginScreenState();
}

class _LoginScreenState extends State<LoginScreen> {
  final _usernameController = TextEditingController(text: 'tesorera');
  final _passwordController = TextEditingController(text: 'Micaela2026!');
  bool _isLoading = false;
  bool _obscurePassword = true;
  String? _errorMessage;
  String _currentServerUrl = ApiConstants.defaultBaseUrl;

  @override
  void initState() {
    super.initState();
    _loadSavedServer();
  }

  Future<void> _loadSavedServer() async {
    final prefs = await SharedPreferences.getInstance();
    final saved = prefs.getString('custom_server_url');
    if (saved != null && saved.isNotEmpty) {
      ApiClient().updateBaseUrl(saved);
      setState(() => _currentServerUrl = saved);
    }
  }

  Future<void> _login() async {
    setState(() {
      _isLoading = true;
      _errorMessage = null;
    });

    try {
      final response = await ApiClient().dio.post(
        '/auth/login',
        data: {
          'username': _usernameController.text.trim(),
          'password': _passwordController.text.trim(),
        },
      );

      final token = response.data['accessToken'];
      final user = response.data['user'];

      final prefs = await SharedPreferences.getInstance();
      await prefs.setString('auth_token', token);
      await prefs.setString('user_name', user['fullName'] ?? '');
      await prefs.setString('user_role', (user['roles'] as List).join(', '));

      if (mounted) {
        Navigator.of(context).pushReplacement(
          MaterialPageRoute(builder: (_) => const HomeDashboardScreen()),
        );
      }
    } catch (e) {
      setState(() {
        _errorMessage = 'Credenciales inválidas o sin conexión a $_currentServerUrl';
      });
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  void _fill(String user) {
    _usernameController.text = user;
    _passwordController.text = 'Micaela2026!';
    setState(() => _errorMessage = null);
  }

  void _showServerDialog() {
    final serverCtrl = TextEditingController(text: _currentServerUrl);
    showDialog(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Configurar Servidor API', style: TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            const Text(
              'Seleccione o ingrese la URL del backend:\n• Emulador Android: http://10.0.2.2/api\n• Dispositivo Wi-Fi: http://[IP_DE_TU_PC]/api',
              style: TextStyle(fontSize: 11, color: Colors.black54),
            ),
            const SizedBox(height: 12),
            TextField(
              controller: serverCtrl,
              decoration: const InputDecoration(
                labelText: 'URL del Servidor',
                border: OutlineInputBorder(),
                prefixIcon: Icon(Icons.link),
              ),
            ),
            const SizedBox(height: 10),
            Wrap(
              spacing: 6,
              children: [
                ActionChip(
                  label: const Text('10.0.2.2 (Emulador)', style: TextStyle(fontSize: 10)),
                  onPressed: () => serverCtrl.text = 'http://10.0.2.2/api',
                ),
                ActionChip(
                  label: const Text('localhost (PC)', style: TextStyle(fontSize: 10)),
                  onPressed: () => serverCtrl.text = 'http://localhost/api',
                ),
              ],
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
            onPressed: () async {
              final newUrl = serverCtrl.text.trim();
              if (newUrl.isNotEmpty) {
                final prefs = await SharedPreferences.getInstance();
                await prefs.setString('custom_server_url', newUrl);
                ApiClient().updateBaseUrl(newUrl);
                setState(() => _currentServerUrl = newUrl);
              }
              if (ctx.mounted) Navigator.pop(ctx);
            },
            child: const Text('Guardar', style: TextStyle(color: Colors.white)),
          ),
        ],
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: AppTheme.secondary,
      body: SafeArea(
        child: Center(
          child: SingleChildScrollView(
            padding: const EdgeInsets.symmetric(horizontal: 24, vertical: 16),
            child: Column(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                // Logo Oficial Mercado Micaela Bastidas
                Container(
                  width: 86,
                  height: 86,
                  decoration: BoxDecoration(
                    borderRadius: BorderRadius.circular(22),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.35),
                        blurRadius: 18,
                        offset: const Offset(0, 8),
                      ),
                    ],
                  ),
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(22),
                    child: Image.asset('assets/logo.png', fit: BoxFit.cover),
                  ),
                ),
                const SizedBox(height: 12),
                const Text(
                  'MERCADO DE ABASTOS',
                  style: TextStyle(
                    color: Colors.white,
                    fontSize: 16,
                    fontWeight: FontWeight.w900,
                    letterSpacing: 1.2,
                  ),
                ),
                const Text(
                  'MICAELA BASTIDAS',
                  style: TextStyle(
                    color: AppTheme.primary,
                    fontSize: 14,
                    fontWeight: FontWeight.bold,
                    letterSpacing: 0.8,
                  ),
                ),
                const SizedBox(height: 12),

                // Selector de Servidor
                InkWell(
                  onTap: _showServerDialog,
                  borderRadius: BorderRadius.circular(20),
                  child: Container(
                    padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 5),
                    decoration: BoxDecoration(
                      color: Colors.white12,
                      borderRadius: BorderRadius.circular(20),
                      border: Border.all(color: Colors.white24),
                    ),
                    child: Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        const Icon(Icons.dns, size: 12, color: Colors.greenAccent),
                        const SizedBox(width: 6),
                        Text(
                          _currentServerUrl,
                          style: const TextStyle(color: Colors.white70, fontSize: 11, fontFamily: 'monospace'),
                        ),
                        const SizedBox(width: 4),
                        const Icon(Icons.edit, size: 11, color: Colors.white38),
                      ],
                    ),
                  ),
                ),

                const SizedBox(height: 20),

                // Card de Login
                Container(
                  padding: const EdgeInsets.all(22),
                  decoration: BoxDecoration(
                    color: Colors.white,
                    borderRadius: BorderRadius.circular(24),
                    boxShadow: [
                      BoxShadow(
                        color: Colors.black.withValues(alpha: 0.2),
                        blurRadius: 20,
                        offset: const Offset(0, 10),
                      ),
                    ],
                  ),
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.stretch,
                    children: [
                      if (_errorMessage != null) ...[
                        Container(
                          padding: const EdgeInsets.all(12),
                          decoration: BoxDecoration(
                            color: Colors.red.shade50,
                            borderRadius: BorderRadius.circular(10),
                            border: Border.all(color: Colors.red.shade200),
                          ),
                          child: Text(
                            _errorMessage!,
                            style: TextStyle(color: Colors.red.shade800, fontSize: 11),
                          ),
                        ),
                        const SizedBox(height: 14),
                      ],

                      TextField(
                        controller: _usernameController,
                        decoration: InputDecoration(
                          labelText: 'Usuario',
                          prefixIcon: const Icon(Icons.person_outline),
                          border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                        ),
                      ),
                      const SizedBox(height: 14),

                      TextField(
                        controller: _passwordController,
                        obscureText: _obscurePassword,
                        decoration: InputDecoration(
                          labelText: 'Contraseña',
                          prefixIcon: const Icon(Icons.lock_outline),
                          suffixIcon: IconButton(
                            icon: Icon(_obscurePassword ? Icons.visibility_off : Icons.visibility, size: 20),
                            onPressed: () => setState(() => _obscurePassword = !_obscurePassword),
                          ),
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
                        onPressed: _isLoading ? null : _login,
                        child: _isLoading
                            ? const SizedBox(
                                height: 20,
                                width: 20,
                                child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                              )
                            : const Text(
                                'INGRESAR AL SISTEMA',
                                style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13),
                              ),
                      ),

                      const SizedBox(height: 18),
                      const Divider(),
                      const SizedBox(height: 8),
                      const Text(
                        'Seleccione un perfil para ingresar:',
                        textAlign: TextAlign.center,
                        style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.grey),
                      ),
                      const SizedBox(height: 8),

                      Row(
                        children: [
                          Expanded(
                            child: OutlinedButton(
                              onPressed: () => _fill('tesorera'),
                              style: OutlinedButton.styleFrom(
                                padding: const EdgeInsets.symmetric(vertical: 10),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                              ),
                              child: Column(
                                children: const [
                                  Text('Tesorera', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                                  Text('tesorera', style: TextStyle(fontSize: 9, color: Colors.grey)),
                                ],
                              ),
                            ),
                          ),
                          const SizedBox(width: 6),
                          Expanded(
                            child: OutlinedButton(
                              onPressed: () => _fill('admin'),
                              style: OutlinedButton.styleFrom(
                                padding: const EdgeInsets.symmetric(vertical: 10),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                              ),
                              child: Column(
                                children: const [
                                  Text('Admin', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                                  Text('admin', style: TextStyle(fontSize: 9, color: Colors.grey)),
                                ],
                              ),
                            ),
                          ),
                          const SizedBox(width: 6),
                          Expanded(
                            child: OutlinedButton(
                              onPressed: () => _fill('sshh_operador'),
                              style: OutlinedButton.styleFrom(
                                padding: const EdgeInsets.symmetric(vertical: 10),
                                shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(10)),
                              ),
                              child: Column(
                                children: const [
                                  Text('SS.HH.', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                                  Text('sshh_operador', style: TextStyle(fontSize: 9, color: Colors.grey)),
                                ],
                              ),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 6),
                      const Center(
                        child: Text(
                          'Contraseña para todos: Micaela2026!',
                          style: TextStyle(fontSize: 10, color: Colors.black45, fontWeight: FontWeight.bold),
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}