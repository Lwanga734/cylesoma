import 'package:flutter/material.dart';

/// CyleSoma brand colours. Schools can later override [primary] from `schools.primary_color`.
class Brand {
  static const navy = Color(0xFF053065);
  static const blue = Color(0xFF0075E7);
  static const sky = Color(0xFF148FF9);
  static const ink = Color(0xFF001E44);
}

class AppTheme {
  static ThemeData light({Color primary = Brand.navy}) {
    final scheme = ColorScheme.fromSeed(seedColor: primary)
        .copyWith(primary: primary, secondary: Brand.blue);
    return ThemeData(
      useMaterial3: true,
      colorScheme: scheme,
      appBarTheme: AppBarTheme(backgroundColor: primary, foregroundColor: Colors.white),
      inputDecorationTheme: const InputDecorationTheme(border: OutlineInputBorder()),
      filledButtonTheme: FilledButtonThemeData(
        style: FilledButton.styleFrom(minimumSize: const Size.fromHeight(48)),
      ),
    );
  }
}

/// Parses "#RRGGBB"; returns [fallback] for anything else.
Color parseHexColor(String? hex, {Color fallback = Brand.navy}) {
  if (hex == null) return fallback;
  final h = hex.replaceFirst('#', '');
  if (!RegExp(r'^[0-9a-fA-F]{6}$').hasMatch(h)) return fallback;
  return Color(0xFF000000 | int.parse(h, radix: 16));
}
