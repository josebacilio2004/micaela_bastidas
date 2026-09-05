import 'package:flutter_test/flutter_test.dart';
import 'package:micaela_bastidas_app/main.dart';

void main() {
  testWidgets('App smoke test', (WidgetTester tester) async {
    await tester.pumpWidget(const MicaelaBastidasApp());
    expect(find.text('MERCADO DE ABASTOS'), findsOneWidget);
  });
}
