import 'package:flutter/material.dart';
import 'package:intl/intl.dart';
import '../../../core/theme/app_theme.dart';
import '../../../core/network/api_client.dart';
import '../../../core/database/local_database.dart';
import 'modo_auditorio_screen.dart';

class AsistenciaScreen extends StatefulWidget {
  const AsistenciaScreen({super.key});

  @override
  State<AsistenciaScreen> createState() => _AsistenciaScreenState();
}

class _AsistenciaScreenState extends State<AsistenciaScreen> {
  List<dynamic> _meetings = [];
  bool _isLoading = true;

  @override
  void initState() {
    super.initState();
    _loadMeetings();
  }

  Future<void> _loadMeetings() async {
    setState(() => _isLoading = true);
    try {
      final res = await ApiClient().dio.get('/meetings');
      final list = res.data as List;
      await LocalDatabase.instance.cacheMeetings(list);
      setState(() => _meetings = list);
    } catch (_) {
      // Load offline cached meetings
      final cached = await LocalDatabase.instance.getCachedMeetings();
      if (cached.isNotEmpty) {
        setState(() => _meetings = cached);
      } else {
        // Mock fallback active assembly
        setState(() {
          _meetings = [
            {
              'id': 'assembly-001',
              'title': 'Asamblea General Extraordinaria 2026',
              'description': 'Aprobación de balances anuales y mejoras en la red de agua potable.',
              'scheduledAt': DateTime.now().toIso8601String(),
              'status': 'EN_CURSO',
              'totalEligible': 350,
            }
          ];
        });
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  void _openModoAuditorio(Map<String, dynamic> meeting) {
    Navigator.push(
      context,
      MaterialPageRoute(
        builder: (ctx) => ModoAuditorioScreen(
          meetingId: meeting['id'].toString(),
          meetingTitle: meeting['title'] ?? 'Asamblea General',
          totalEligible: meeting['totalEligible'] is int
              ? meeting['totalEligible']
              : int.tryParse(meeting['total_eligible']?.toString() ?? '350') ?? 350,
        ),
      ),
    ).then((_) => _loadMeetings());
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text('Asambleas y Asistencia', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 16)),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: _loadMeetings,
          ),
        ],
      ),
      body: _isLoading
          ? const Center(child: CircularProgressIndicator())
          : _meetings.isEmpty
              ? Center(
                  child: Column(
                    mainAxisAlignment: MainAxisAlignment.center,
                    children: [
                      const Icon(Icons.event_busy, size: 64, color: Colors.black26),
                      const SizedBox(height: 12),
                      const Text(
                        'No hay asambleas registradas.',
                        style: TextStyle(fontWeight: FontWeight.bold, color: Colors.black54),
                      ),
                      const SizedBox(height: 16),
                      ElevatedButton.icon(
                        style: ElevatedButton.styleFrom(backgroundColor: AppTheme.primary),
                        icon: const Icon(Icons.add, color: Colors.white),
                        label: const Text('Crear Asamblea Rápida', style: TextStyle(color: Colors.white)),
                        onPressed: () {
                          _openModoAuditorio({
                            'id': 'assembly-manual-${DateTime.now().millisecondsSinceEpoch}',
                            'title': 'Asamblea General de Socios',
                            'totalEligible': 350,
                          });
                        },
                      ),
                    ],
                  ),
                )
              : ListView.builder(
                  padding: const EdgeInsets.all(16),
                  itemCount: _meetings.length,
                  itemBuilder: (ctx, idx) {
                    final m = _meetings[idx];
                    final isEnCurso = m['status'] == 'EN_CURSO';
                    final dateStr = m['scheduledAt'] ?? m['scheduled_at'] ?? '';
                    DateTime? parsedDate;
                    try {
                      parsedDate = DateTime.parse(dateStr);
                    } catch (_) {}

                    return Card(
                      elevation: 2,
                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                      margin: const EdgeInsets.only(bottom: 16),
                      child: Padding(
                        padding: const EdgeInsets.all(18),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              mainAxisAlignment: MainAxisAlignment.spaceBetween,
                              children: [
                                Container(
                                  padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                  decoration: BoxDecoration(
                                    color: isEnCurso ? Colors.green.shade50 : Colors.blue.shade50,
                                    borderRadius: BorderRadius.circular(20),
                                    border: Border.all(
                                      color: isEnCurso ? Colors.green.shade300 : Colors.blue.shade300,
                                    ),
                                  ),
                                  child: Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      CircleAvatar(
                                        radius: 4,
                                        backgroundColor: isEnCurso ? Colors.green : Colors.blue,
                                      ),
                                      const SizedBox(width: 6),
                                      Text(
                                        m['status'] ?? 'PROGRAMADA',
                                        style: TextStyle(
                                          fontSize: 10,
                                          fontWeight: FontWeight.bold,
                                          color: isEnCurso ? Colors.green.shade800 : Colors.blue.shade800,
                                        ),
                                      ),
                                    ],
                                  ),
                                ),
                                if (parsedDate != null)
                                  Text(
                                    DateFormat('dd/MM/yyyy HH:mm').format(parsedDate),
                                    style: const TextStyle(fontSize: 11, color: Colors.black45, fontWeight: FontWeight.bold),
                                  ),
                              ],
                            ),
                            const SizedBox(height: 12),
                            Text(
                              m['title'] ?? 'Sin título',
                              style: const TextStyle(
                                fontSize: 16,
                                fontWeight: FontWeight.w900,
                                color: Color(0xFF1E293B),
                              ),
                            ),
                            if (m['description'] != null && m['description'].toString().isNotEmpty) ...[
                              const SizedBox(height: 6),
                              Text(
                                m['description'],
                                style: const TextStyle(fontSize: 12, color: Colors.black54),
                                maxLines: 2,
                                overflow: TextOverflow.ellipsis,
                              ),
                            ],
                            const SizedBox(height: 16),
                            const Divider(height: 1),
                            const SizedBox(height: 14),
                            Row(
                              children: [
                                Expanded(
                                  child: Column(
                                    crossAxisAlignment: CrossAxisAlignment.start,
                                    children: [
                                      const Text(
                                        'Padrón Esperado',
                                        style: TextStyle(fontSize: 10, color: Colors.black45, fontWeight: FontWeight.bold),
                                      ),
                                      Text(
                                        '${m['totalEligible'] ?? m['total_eligible'] ?? 350} Socios',
                                        style: const TextStyle(fontSize: 13, fontWeight: FontWeight.bold, color: Colors.black87),
                                      ),
                                    ],
                                  ),
                                ),
                                ElevatedButton.icon(
                                  style: ElevatedButton.styleFrom(
                                    backgroundColor: const Color(0xFF047857),
                                    padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                                    shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                                    elevation: 1,
                                  ),
                                  icon: const Icon(Icons.qr_code_scanner, color: Colors.white, size: 20),
                                  label: const Text(
                                    'Modo Auditorio',
                                    style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 12),
                                  ),
                                  onPressed: () => _openModoAuditorio(m),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    );
                  },
                ),
    );
  }
}