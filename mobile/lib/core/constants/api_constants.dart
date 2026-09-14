import 'dart:io';
import 'package:flutter/foundation.dart';

class ApiConstants {
  // Default to emulator 10.0.2.2 for Android emulator, localhost for Web/Desktop/iOS
  static String get defaultBaseUrl {
    if (kIsWeb) {
      return 'http://localhost/api';
    } else if (Platform.isAndroid) {
      return 'http://10.0.2.2/api';
    } else {
      return 'http://localhost/api';
    }
  }

  static String get hostOrigin {
    final base = defaultBaseUrl;
    final uri = Uri.parse(base);
    final portPart = (uri.hasPort && uri.port != 80 && uri.port != 443) ? ':${uri.port}' : '';
    return '${uri.scheme}://${uri.host}$portPart';
  }

  static const String login = '/auth/login';
  static const String dashboard = '/reports/dashboard';
  static const String merchants = '/merchants';
  static const String payments = '/payments';
  static const String obligations = '/obligations';
  static const String sshhActive = '/sanitary-services/active';
  static const String sshhStart = '/sanitary-services/start';
  static const String sshhCounts = '/sanitary-services';
  static const String sshhClose = '/sanitary-services';
  static const String currentCash = '/cash-registers/current';
  static const String cashSummary = '/cash-registers';
}
