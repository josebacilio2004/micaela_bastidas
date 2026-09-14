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
  DateTime? _filterDate;

  @override
  void initState() {
    super.initState();
    _loadMeetings();
  }

  Future<void> _loadMeetings({DateTime? date, bool clearFilter = false}) async {
    setState(() {
      _isLoading = true;
      if (clearFilter) {
        _filterDate = null;
      } else if (date != null) {
        _filterDate = date;
      }
    });

    final dateQuery = _filterDate != null ? DateFormat('yyyy-MM-dd').format(_filterDate!) : null;

    try {
      final res = await ApiClient().dio.get(
        '/meetings',
        queryParameters: dateQuery != null ? {'date': dateQuery} : null,
      );
      final list = res.data as List;
      await LocalDatabase.instance.cacheMeetings(list);
      if (mounted) setState(() => _meetings = list);
    } catch (_) {
      // Cargar reuniones en caché SQLite offline
      final cached = await LocalDatabase.instance.getCachedMeetings();
      if (mounted) {
        if (dateQuery != null) {
          final filtered = cached.where((m) {
            final mDate = (m['date'] ?? m['scheduledAt'] ?? m['scheduled_at'] ?? '').toString();
            return mDate.startsWith(dateQuery);
          }).toList();
          setState(() => _meetings = filtered);
        } else {
          setState(() => _meetings = cached);
        }
      }
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  Future<void> _pickDate() async {
    final now = DateTime.now();
    final picked = await showDatePicker(
      context: context,
      initialDate: _filterDate ?? now,
      firstDate: DateTime(2025),
      lastDate: DateTime(2030),
      helpText: 'SELECCIONAR FECHA DE ASAMBLEA',
    );
    if (picked != null) {
      _loadMeetings(date: picked);
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
    final todayStr = DateFormat('yyyy-MM-dd').format(DateTime.now());
    final isFilteringToday = _filterDate != null && DateFormat('yyyy-MM-dd').format(_filterDate!) == todayStr;

    return Scaffold(
      backgroundColor: const Color(0xFFF8FAFC),
      appBar: AppBar(
        title: const Text('Asambleas y Reuniones', style: TextStyle(fontWeight: FontWeight.w900, fontSize: 16)),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            tooltip: 'Actualizar reuniones',
            onPressed: () => _loadMeetings(),
          ),
        ],
      ),
      body: Column(
        children: [
          // Barra de Filtro de Fechas
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 10),
            color: Colors.white,
            child: Row(
              children: [
                const Icon(Icons.event, size: 18, color: AppTheme.primary),
                const SizedBox(width: 8),
                Expanded(
                  child: SingleChildScrollView(
                    scrollDirection: Axis.horizontal,
                    child: Row(
                      children: [
                        ChoiceChip(
                          label: const Text('Todas las fechas', style: TextStyle(fontSize: 11, fontWeight: FontWeight.bold)),
                          selected: _filterDate == null,
                          onSelected: (_) => _loadMeetings(clearFilter: true),
                        ),
                        const SizedBox(width: 6),
                        ChoiceChip(
                          label: Text(
                            'Hoy (${DateFormat('dd/MM').format(DateTime.now())})',
                            style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold),
                          ),
                          selected: isFilteringToday,
                          onSelected: (_) => _loadMeetings(date: DateTime.now()),
                        ),
                        const SizedBox(width: 6),
                        ActionChip(
                          avatar: const Icon(Icons.calendar_month, size: 15),
                          label: Text(
                            _filterDate != null && !isFilteringToday
                                ? DateFormat('dd/MM/yyyy').format(_filterDate!)
                                : 'Otra fecha...',
                            style: TextStyle(
                              fontSize: 11,
                              fontWeight: FontWeight.bold,
                              color: (_filterDate != null && !isFilteringToday) ? AppTheme.primaryDark : null,
                            ),
                          ),
                          onPressed: _pickDate,
                        ),
                        if (_filterDate != null) ...[
                          const SizedBox(width: 4),
                          IconButton(
                            icon: const Icon(Icons.cancel, size: 18, color: Colors.black45),
                            tooltip: 'Quitar filtro de fecha',
                            onPressed: () => _loadMeetings(clearFilter: true),
                          ),
                        ],
                      ],
                    ),
                  ),
                ),
              ],
            ),
          ),
          const Divider(height: 1),

          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : RefreshIndicator(
                    onRefresh: () => _loadMeetings(),
                    child: _meetings.isEmpty
                        ? Center(
                            child: SingleChildScrollView(
                              physics: const AlwaysScrollableScrollPhysics(),
                              child: Padding(
                                padding: const EdgeInsets.all(24),
                                child: Column(
                                  mainAxisAlignment: MainAxisAlignment.center,
                                  children: [
                                    const Icon(Icons.event_busy, size: 60, color: Colors.black26),
                                    const SizedBox(height: 12),
                                    Text(
                                      _filterDate != null
                                          ? 'No hay asambleas programadas para el ${DateFormat('dd/MM/yyyy').format(_filterDate!)}.'
                                          : 'No hay asambleas registradas.',
                                      textAlign: TextAlign.center,
                                      style: const TextStyle(fontWeight: FontWeight.bold, color: Colors.black54, fontSize: 13),
                                    ),
                                    const SizedBox(height: 16),
                                    if (_filterDate != null)
                                      ElevatedButton.icon(
                                        style: ElevatedButton.styleFrom(backgroundColor: AppTheme.primary),
                                        icon: const Icon(Icons.calendar_view_day, color: Colors.white, size: 18),
                                        label: const Text('Ver Todas las Asambleas', style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold)),
                                        onPressed: () => _loadMeetings(clearFilter: true),
                                      )
                                    else
                                      ElevatedButton.icon(
                                        style: ElevatedButton.styleFrom(backgroundColor: AppTheme.primary),
                                        icon: const Icon(Icons.refresh, color: Colors.white, size: 18),
                                        label: const Text('Reintentar Sincronización', style: TextStyle(color: Colors.white)),
                                        onPressed: () => _loadMeetings(),
                                      ),
                                  ],
                                ),
                              ),
                            ),
                          )
                  : ListView.builder(
                      physics: const AlwaysScrollableScrollPhysics(),
                      padding: const EdgeInsets.all(16),
                      itemCount: _meetings.length,
                      itemBuilder: (ctx, idx) {
                        final m = _meetings[idx];
                        final status = (m['status'] ?? 'PROGRAMADA').toString().toUpperCase();
                        final isEnCurso = status == 'EN_CURSO';
                        final isFinalizada = status == 'FINALIZADA';

                        final dateStr = (m['date'] ?? m['scheduledAt'] ?? m['scheduled_at'] ?? '').toString();
                        final timeStr = (m['time'] ?? '').toString();
                        final locStr = (m['location'] ?? 'Salón Comunal').toString();

                        DateTime? parsedDate;
                        try {
                          parsedDate = DateTime.parse(dateStr);
                        } catch (_) {}

                        final total = m['totalEligible'] ?? m['total_eligible'] ?? 350;
                        final attended = m['attendedCount'] ?? m['attended_count'] ?? 0;
                        final intTotal = total is int ? total : int.tryParse(total.toString()) ?? 350;
                        final intAttended = attended is int ? attended : int.tryParse(attended.toString()) ?? 0;
                        final pct = intTotal > 0 ? (intAttended / intTotal) * 100 : 0.0;
                        final hasQuorum = pct >= 50.0;

                        return Card(
                          elevation: 2,
                          shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(20)),
                          margin: const EdgeInsets.only(bottom: 16),
                          child: Padding(
                            padding: const EdgeInsets.all(18),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                // Status & Date row
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Container(
                                      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
                                      decoration: BoxDecoration(
                                        color: isEnCurso
                                            ? Colors.green.shade50
                                            : isFinalizada
                                                ? Colors.grey.shade100
                                                : Colors.blue.shade50,
                                        borderRadius: BorderRadius.circular(20),
                                        border: Border.all(
                                          color: isEnCurso
                                              ? Colors.green.shade400
                                              : isFinalizada
                                                  ? Colors.grey.shade400
                                                  : Colors.blue.shade400,
                                        ),
                                      ),
                                      child: Row(
                                        mainAxisSize: MainAxisSize.min,
                                        children: [
                                          CircleAvatar(
                                            radius: 4,
                                            backgroundColor: isEnCurso
                                                ? Colors.green
                                                : isFinalizada
                                                    ? Colors.grey
                                                    : Colors.blue,
                                          ),
                                          const SizedBox(width: 6),
                                          Text(
                                            isEnCurso
                                                ? 'EN CURSO'
                                                : isFinalizada
                                                    ? 'FINALIZADA'
                                                    : 'PROGRAMADA',
                                            style: TextStyle(
                                              fontSize: 10,
                                              fontWeight: FontWeight.bold,
                                              color: isEnCurso
                                                  ? Colors.green.shade800
                                                  : isFinalizada
                                                      ? Colors.grey.shade800
                                                      : Colors.blue.shade800,
                                            ),
                                          ),
                                        ],
                                      ),
                                    ),
                                    if (parsedDate != null)
                                      Text(
                                        DateFormat('dd/MM/yyyy').format(parsedDate),
                                        style: const TextStyle(fontSize: 12, color: Colors.black54, fontWeight: FontWeight.bold),
                                      ),
                                  ],
                                ),
                                const SizedBox(height: 12),

                                // Title
                                Text(
                                  m['title'] ?? 'Sin título',
                                  style: const TextStyle(
                                    fontSize: 16,
                                    fontWeight: FontWeight.w900,
                                    color: Color(0xFF1E293B),
                                  ),
                                ),

                                // Time and Location tags
                                const SizedBox(height: 8),
                                Wrap(
                                  spacing: 8,
                                  runSpacing: 4,
                                  children: [
                                    if (timeStr.isNotEmpty)
                                      Row(
                                        mainAxisSize: MainAxisSize.min,
                                        children: [
                                          const Icon(Icons.access_time, size: 14, color: Colors.black45),
                                          const SizedBox(width: 4),
                                          Text(timeStr, style: const TextStyle(fontSize: 11, color: Colors.black54, fontWeight: FontWeight.w600)),
                                        ],
                                      ),
                                    Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        const Icon(Icons.location_on_outlined, size: 14, color: Colors.black45),
                                        const SizedBox(width: 4),
                                        Text(locStr, style: const TextStyle(fontSize: 11, color: Colors.black54, fontWeight: FontWeight.w600)),
                                      ],
                                    ),
                                  ],
                                ),

                                if (m['description'] != null && m['description'].toString().isNotEmpty) ...[
                                  const SizedBox(height: 8),
                                  Text(
                                    m['description'],
                                    style: const TextStyle(fontSize: 12, color: Colors.black54),
                                    maxLines: 2,
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                ],

                                const SizedBox(height: 14),
                                const Divider(height: 1),
                                const SizedBox(height: 12),

                                // Quorum Progress Bar
                                Row(
                                  mainAxisAlignment: MainAxisAlignment.spaceBetween,
                                  children: [
                                    Text(
                                      'Asistencia: $intAttended de $intTotal socios',
                                      style: const TextStyle(fontSize: 11, fontWeight: FontWeight.bold, color: Colors.black87),
                                    ),
                                    Text(
                                      '${pct.toStringAsFixed(1)}% Quórum',
                                      style: TextStyle(
                                        fontSize: 11,
                                        fontWeight: FontWeight.bold,
                                        color: hasQuorum ? Colors.green.shade700 : Colors.amber.shade800,
                                      ),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 6),
                                ClipRRect(
                                  borderRadius: BorderRadius.circular(4),
                                  child: LinearProgressIndicator(
                                    value: intTotal > 0 ? (intAttended / intTotal).clamp(0.0, 1.0) : 0,
                                    backgroundColor: Colors.black12,
                                    valueColor: AlwaysStoppedAnimation<Color>(
                                      hasQuorum ? const Color(0xFF047857) : Colors.amber.shade700,
                                    ),
                                    minHeight: 6,
                                  ),
                                ),

                                const SizedBox(height: 14),

                                // Action button
                                SizedBox(
                                  width: double.infinity,
                                  child: ElevatedButton.icon(
                                    style: ElevatedButton.styleFrom(
                                      backgroundColor: isEnCurso ? const Color(0xFF047857) : const Color(0xFF1E293B),
                                      padding: const EdgeInsets.symmetric(vertical: 12),
                                      shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(14)),
                                      elevation: 1,
                                    ),
                                    icon: const Icon(Icons.qr_code_scanner, color: Colors.white, size: 20),
                                    label: const Text(
                                      'ESCANEAR ASISTENCIA (QR)',
                                      style: TextStyle(color: Colors.white, fontWeight: FontWeight.bold, fontSize: 13, letterSpacing: 0.5),
                                    ),
                                    onPressed: () => _openModoAuditorio(m),
                                  ),
                                ),
                              ],
                            ),
                          ),
                        );
                      },
                    ),
            ),
          ),
        ],
      ),
    );
  }
}