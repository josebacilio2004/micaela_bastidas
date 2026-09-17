import 'package:flutter/material.dart';

class AppTheme {
  static const Color primary = Color(0xFF047857); // Deep Emerald (Stitch)
  static const Color primaryDark = Color(0xFF005D42);
  static const Color primaryContainer = Color(0xFFD1FAE5);
  static const Color secondary = Color(0xFF0F766E); // Dark Teal (Stitch)
  static const Color secondaryContainer = Color(0xFFCCFBF1);
  static const Color tertiary = Color(0xFF1E3A8A); // Petrol Deep Blue
  static const Color surface = Colors.white;
  static const Color surfaceContainerLow = Color(0xFFEFF4FF);
  static const Color surfaceContainer = Color(0xFFE5EEFF);
  static const Color background = Color(0xFFF8FAFC); // Slate Tint
  static const Color outline = Color(0xFFE2E8F0);
  static const Color accentAmber = Color(0xFFD97706);
  static const Color errorRed = Color(0xFFDC2626);

  static ThemeData get lightTheme {
    return ThemeData(
      useMaterial3: true,
      colorScheme: ColorScheme.fromSeed(
        seedColor: primary,
        primary: primary,
        secondary: secondary,
        surface: surface,
      ),
      scaffoldBackgroundColor: background,
      appBarTheme: const AppBarTheme(
        backgroundColor: secondary,
        foregroundColor: Colors.white,
        elevation: 0,
        centerTitle: true,
        titleTextStyle: TextStyle(
          color: Colors.white,
          fontSize: 16,
          fontWeight: FontWeight.bold,
          letterSpacing: 0.5,
        ),
      ),
      cardTheme: CardThemeData(
        color: surface,
        elevation: 1,
        shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(16)),
      ),
      elevatedButtonTheme: ElevatedButtonThemeData(
        style: ElevatedButton.styleFrom(
          backgroundColor: primary,
          foregroundColor: Colors.white,
          elevation: 2,
          padding: const EdgeInsets.symmetric(vertical: 16, horizontal: 20),
          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
          textStyle: const TextStyle(fontSize: 15, fontWeight: FontWeight.bold),
        ),
      ),
    );
  }
}
