import 'package:flutter/material.dart';
import 'package:intl/date_symbol_data_local.dart';
import 'core/theme/app_theme.dart';
import 'features/auth/presentation/login_screen.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  try {
    await initializeDateFormatting('es_PE', null);
    await initializeDateFormatting('es', null);
  } catch (_) {}
  runApp(const MicaelaBastidasApp());
}

class MicaelaBastidasApp extends StatelessWidget {
  const MicaelaBastidasApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'Mercado Micaela Bastidas',
      debugShowCheckedModeBanner: false,
      theme: AppTheme.lightTheme,
      home: const LoginScreen(),
    );
  }
}
