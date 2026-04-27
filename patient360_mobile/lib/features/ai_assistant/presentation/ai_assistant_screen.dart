import 'package:flutter/material.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:image_picker/image_picker.dart';
import 'package:lucide_icons_flutter/lucide_icons.dart';
import 'package:url_launcher/url_launcher.dart';

import '../../../core/theme/app_colors.dart';
import '../../../core/theme/app_radii.dart';
import '../../../core/utils/logger.dart';
import '../../../shared/widgets/page_header.dart';
import '../../home/presentation/providers/home_providers.dart';
import '../domain/emergency_report.dart';
import '../domain/severity_level.dart';
import '../domain/specialist_result.dart';
import 'providers/ai_providers.dart';
import 'widgets/emergency_report_tile.dart';
import 'widgets/input_image.dart';
import 'widgets/input_mode_toggle.dart';
import 'widgets/input_text.dart';
import 'widgets/report_detail_sheet.dart';
import 'widgets/result_card.dart';

/// Sub-tab discriminator for the parent /ai screen.
enum _AiTab { specialist, triage }

const String _ambulanceNumber = '110';

class AIAssistantScreen extends ConsumerStatefulWidget {
  const AIAssistantScreen({super.key});

  @override
  ConsumerState<AIAssistantScreen> createState() =>
      _AIAssistantScreenState();
}

class _AIAssistantScreenState extends ConsumerState<AIAssistantScreen> {
  _AiTab _tab = _AiTab.specialist;
  final TextEditingController _specialistText = TextEditingController();
  final TextEditingController _triageText = TextEditingController();
  AiInputMode _triageMode = AiInputMode.text;
  XFile? _triageImage;

  /// IDs of reports that already triggered the critical AlertDialog this
  /// session — avoids re-prompting the same patient multiple times for one
  /// submission round.
  final Set<String> _criticalDialogShownIds = <String>{};

  @override
  void dispose() {
    _specialistText.dispose();
    _triageText.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final int unread = ref
            .watch(dashboardOverviewProvider)
            .value
            ?.unreadNotifications ??
        0;

    // Listen for a new triage report → prompt the critical dialog when
    // applicable. ref.listen runs in the build method per Riverpod docs.
    ref.listen<AsyncValue<EmergencyReport?>>(
      triageControllerProvider,
      (AsyncValue<EmergencyReport?>? _, AsyncValue<EmergencyReport?> next) {
        final EmergencyReport? r = next.value;
        if (r == null) return;
        if (r.aiRiskLevel != SeverityLevel.critical) return;
        if (_criticalDialogShownIds.contains(r.id)) return;
        _criticalDialogShownIds.add(r.id);
        _showCriticalDialog(r);
      },
    );

    return Scaffold(
      appBar: PageHeader(
        title: 'المساعد الذكي',
        subtitle: 'استشارة الأخصائي والإسعاف الأولي',
        unreadCount: unread,
      ),
      body: Column(
        children: <Widget>[
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 12, 16, 8),
            child: _SubTabRow(
              current: _tab,
              onChange: (_AiTab t) => setState(() => _tab = t),
            ),
          ),
          Expanded(
            child: IndexedStack(
              index: _tab.index,
              children: <Widget>[
                _SpecialistTab(controller: _specialistText),
                _TriageTab(
                  textController: _triageText,
                  mode: _triageMode,
                  onModeChange: (AiInputMode m) =>
                      setState(() => _triageMode = m),
                  pickedImage: _triageImage,
                  onImageChange: (XFile? f) =>
                      setState(() => _triageImage = f),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _showCriticalDialog(EmergencyReport r) async {
    if (!mounted) return;
    await showDialog<void>(
      context: context,
      barrierDismissible: false,
      builder: (BuildContext ctx) {
        return AlertDialog(
          icon: const Icon(LucideIcons.octagonAlert,
              color: AppColors.error, size: 36),
          title: const Text('حالة حرجة',
              style: TextStyle(fontWeight: FontWeight.w800)),
          content: const Text(
            'الإسعاف الأولي بدأ الآن. اتصل بالإسعاف فوراً.',
            style: TextStyle(height: 1.6),
            textAlign: TextAlign.center,
          ),
          actionsAlignment: MainAxisAlignment.center,
          actions: <Widget>[
            ElevatedButton.icon(
              icon: const Icon(LucideIcons.phone, size: 18),
              label: const Text('اتصل بالإسعاف $_ambulanceNumber'),
              style: ElevatedButton.styleFrom(
                backgroundColor: AppColors.error,
                foregroundColor: Colors.white,
              ),
              onPressed: () async {
                Navigator.of(ctx).pop();
                await _dialAmbulance();
              },
            ),
            TextButton(
              onPressed: () => Navigator.of(ctx).pop(),
              child: const Text('إغلاق'),
            ),
          ],
        );
      },
    );
  }
}

Future<void> _dialAmbulance() async {
  final Uri tel = Uri(scheme: 'tel', path: _ambulanceNumber);
  try {
    await launchUrl(tel);
  } catch (e, st) {
    appLogger.w('tel: launch failed', error: e, stackTrace: st);
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Sub-tab row
// ═══════════════════════════════════════════════════════════════════════════

class _SubTabRow extends StatelessWidget {
  const _SubTabRow({required this.current, required this.onChange});
  final _AiTab current;
  final ValueChanged<_AiTab> onChange;

  @override
  Widget build(BuildContext context) {
    final ColorScheme scheme = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.all(4),
      decoration: BoxDecoration(
        color: scheme.surfaceContainer,
        borderRadius: AppRadii.radiusLg,
        border: Border.all(color: scheme.outline),
      ),
      child: Row(
        children: <Widget>[
          Expanded(
            child: _SubTabButton(
              icon: LucideIcons.stethoscope,
              label: 'استشارة الأخصائي',
              selected: current == _AiTab.specialist,
              onTap: () => onChange(_AiTab.specialist),
            ),
          ),
          Expanded(
            child: _SubTabButton(
              icon: LucideIcons.siren,
              label: 'الإسعاف الأولي',
              selected: current == _AiTab.triage,
              onTap: () => onChange(_AiTab.triage),
            ),
          ),
        ],
      ),
    );
  }
}

class _SubTabButton extends StatelessWidget {
  const _SubTabButton({
    required this.icon,
    required this.label,
    required this.selected,
    required this.onTap,
  });
  final IconData icon;
  final String label;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final ColorScheme scheme = Theme.of(context).colorScheme;
    final Color fg = selected ? Colors.white : scheme.onSurfaceVariant;
    return Material(
      color: selected ? AppColors.action : Colors.transparent,
      borderRadius: AppRadii.radiusMd,
      child: InkWell(
        borderRadius: AppRadii.radiusMd,
        onTap: onTap,
        child: Padding(
          padding: const EdgeInsets.symmetric(vertical: 10, horizontal: 8),
          child: Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: <Widget>[
              Icon(icon, size: 16, color: fg),
              const SizedBox(width: 6),
              Flexible(
                child: Text(
                  label,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: TextStyle(
                    color: fg,
                    fontWeight:
                        selected ? FontWeight.w700 : FontWeight.w500,
                    fontSize: 13,
                  ),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Specialist tab
// ═══════════════════════════════════════════════════════════════════════════

class _SpecialistTab extends ConsumerWidget {
  const _SpecialistTab({required this.controller});
  final TextEditingController controller;

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final AsyncValue<SpecialistResult?> async =
        ref.watch(specialistControllerProvider);
    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
      children: <Widget>[
        const _IntroCard(
          icon: LucideIcons.stethoscope,
          title: 'اختر الأخصائي المناسب لأعراضك',
          body: 'هذه النتيجة للإرشاد فقط ولا تحل محل الاستشارة الطبية.',
          tone: _IntroTone.info,
        ),
        const SizedBox(height: 12),
        InputText(
          controller: controller,
          maxLength: 2000,
          disabled: async.isLoading,
          onSubmit: () {
            final String text = controller.text.trim();
            if (text.isEmpty) return;
            // ignore: discarded_futures
            ref
                .read(specialistControllerProvider.notifier)
                .submit(text);
          },
        ),
        const SizedBox(height: 16),
        if (async.isLoading)
          const ResultCard.loading()
        else if (async.hasError)
          ResultCard.error(error: async.error!)
        else if (async.value != null)
          ResultCard.specialist(result: async.value!)
        else
          const ResultCard.empty(),
      ],
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Triage tab
// ═══════════════════════════════════════════════════════════════════════════

class _TriageTab extends ConsumerWidget {
  const _TriageTab({
    required this.textController,
    required this.mode,
    required this.onModeChange,
    required this.pickedImage,
    required this.onImageChange,
  });

  final TextEditingController textController;
  final AiInputMode mode;
  final ValueChanged<AiInputMode> onModeChange;
  final XFile? pickedImage;
  final ValueChanged<XFile?> onImageChange;

  void _alert(BuildContext context, String message) {
    ScaffoldMessenger.maybeOf(context)
      ?..clearSnackBars()
      ..showSnackBar(SnackBar(content: Text(message)));
  }

  @override
  Widget build(BuildContext context, WidgetRef ref) {
    final AsyncValue<EmergencyReport?> async =
        ref.watch(triageControllerProvider);
    final AsyncValue<List<EmergencyReport>> historyAsync =
        ref.watch(emergencyReportsProvider);
    final bool busy = async.isLoading;

    return ListView(
      padding: const EdgeInsets.fromLTRB(16, 8, 16, 32),
      children: <Widget>[
        const _AmbulanceCallout(),
        const SizedBox(height: 12),
        InputModeToggle(
          current: mode,
          onChanged: onModeChange,
          disabled: busy,
        ),
        const SizedBox(height: 12),
        if (mode == AiInputMode.text)
          InputText(
            controller: textController,
            maxLength: 2000,
            disabled: busy,
            hintText: 'صف الحالة وموقع الألم وشدّته...',
            onSubmit: () {
              final String text = textController.text.trim();
              if (text.isEmpty) return;
              // ignore: discarded_futures
              ref
                  .read(triageControllerProvider.notifier)
                  .submitText(text);
            },
          )
        else
          Column(
            crossAxisAlignment: CrossAxisAlignment.stretch,
            children: <Widget>[
              InputImage(
                value: pickedImage,
                onChanged: onImageChange,
                onAlert: (String msg) => _alert(context, msg),
                disabled: busy,
              ),
              const SizedBox(height: 8),
              ElevatedButton.icon(
                onPressed: (pickedImage == null || busy)
                    ? null
                    : () {
                        // ignore: discarded_futures
                        ref
                            .read(triageControllerProvider.notifier)
                            .submitImage(pickedImage!);
                      },
                icon: const Icon(LucideIcons.send, size: 16),
                label: const Text('إرسال للتحليل'),
                style: ElevatedButton.styleFrom(
                  backgroundColor: AppColors.action,
                  foregroundColor: Colors.white,
                  padding: const EdgeInsets.symmetric(vertical: 12),
                ),
              ),
            ],
          ),
        const SizedBox(height: 16),
        if (async.isLoading)
          const ResultCard.loading()
        else if (async.hasError)
          ResultCard.error(error: async.error!)
        else if (async.value != null)
          ResultCard.triage(report: async.value!)
        else
          const ResultCard.empty(
            emptyTitle: 'ابدأ بوصف الحالة الطارئة',
            emptySubtitle:
                'سيقوم المساعد الذكي بتقييم الخطورة واقتراح خطوات الإسعاف الأولي.',
          ),
        const SizedBox(height: 24),
        _HistorySection(historyAsync: historyAsync),
      ],
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// Intro / callout cards
// ═══════════════════════════════════════════════════════════════════════════

enum _IntroTone { info, warning }

class _IntroCard extends StatelessWidget {
  const _IntroCard({
    required this.icon,
    required this.title,
    required this.body,
    required this.tone,
  });
  final IconData icon;
  final String title;
  final String body;
  final _IntroTone tone;

  @override
  Widget build(BuildContext context) {
    final ColorScheme scheme = Theme.of(context).colorScheme;
    final Color tint = tone == _IntroTone.warning
        ? AppColors.warning
        : AppColors.action;
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: tint.withValues(alpha: 0.10),
        borderRadius: AppRadii.radiusLg,
        border: Border.all(color: tint.withValues(alpha: 0.45)),
      ),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Icon(icon, size: 20, color: tint),
          const SizedBox(width: 10),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: <Widget>[
                Text(
                  title,
                  style: Theme.of(context)
                      .textTheme
                      .titleSmall
                      ?.copyWith(fontWeight: FontWeight.w800),
                ),
                const SizedBox(height: 2),
                Text(
                  body,
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: scheme.onSurfaceVariant,
                        height: 1.5,
                      ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _AmbulanceCallout extends StatelessWidget {
  const _AmbulanceCallout();

  Future<void> _dial() async {
    await _dialAmbulance();
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(14),
      decoration: BoxDecoration(
        color: AppColors.warning.withValues(alpha: 0.12),
        borderRadius: AppRadii.radiusLg,
        border: Border.all(color: AppColors.warning.withValues(alpha: 0.55)),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: <Widget>[
              const Icon(LucideIcons.triangleAlert,
                  size: 20, color: AppColors.warning),
              const SizedBox(width: 10),
              Expanded(
                child: Text(
                  'الإسعاف الأولي الذكي',
                  style: Theme.of(context)
                      .textTheme
                      .titleSmall
                      ?.copyWith(fontWeight: FontWeight.w800),
                ),
              ),
            ],
          ),
          const SizedBox(height: 4),
          Text(
            'في حالة الطوارئ الحقيقية، اتصل بالإسعاف فوراً.',
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                  height: 1.5,
                ),
          ),
          const SizedBox(height: 8),
          Row(
            children: <Widget>[
              const Text(
                'الرقم: ',
                style: TextStyle(fontWeight: FontWeight.w600),
              ),
              InkWell(
                onTap: _dial,
                borderRadius: AppRadii.radiusSm,
                child: Container(
                  padding: const EdgeInsets.symmetric(
                    horizontal: 8,
                    vertical: 2,
                  ),
                  decoration: BoxDecoration(
                    color: AppColors.warning.withValues(alpha: 0.20),
                    borderRadius: AppRadii.radiusSm,
                  ),
                  child: const Row(
                    mainAxisSize: MainAxisSize.min,
                    children: <Widget>[
                      Icon(LucideIcons.phone,
                          size: 14, color: AppColors.warning),
                      SizedBox(width: 4),
                      Text(
                        _ambulanceNumber,
                        textDirection: TextDirection.ltr,
                        style: TextStyle(
                          color: AppColors.warning,
                          fontWeight: FontWeight.w800,
                          fontFamily: 'Inter',
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

// ═══════════════════════════════════════════════════════════════════════════
// History
// ═══════════════════════════════════════════════════════════════════════════

class _HistorySection extends StatelessWidget {
  const _HistorySection({required this.historyAsync});
  final AsyncValue<List<EmergencyReport>> historyAsync;

  @override
  Widget build(BuildContext context) {
    final ColorScheme scheme = Theme.of(context).colorScheme;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: <Widget>[
        Row(
          children: <Widget>[
            Icon(LucideIcons.clock, size: 18, color: scheme.onSurfaceVariant),
            const SizedBox(width: 6),
            Text(
              'السجل السابق',
              style: Theme.of(context)
                  .textTheme
                  .titleSmall
                  ?.copyWith(fontWeight: FontWeight.w800),
            ),
          ],
        ),
        const SizedBox(height: 8),
        historyAsync.when(
          loading: () => const Padding(
            padding: EdgeInsets.all(20),
            child: Center(
              child: SizedBox(
                width: 20,
                height: 20,
                child: CircularProgressIndicator(strokeWidth: 2),
              ),
            ),
          ),
          error: (Object _, __) => Padding(
            padding: const EdgeInsets.symmetric(vertical: 12),
            child: Text(
              'تعذر تحميل السجل.',
              style: TextStyle(color: scheme.onSurfaceVariant),
            ),
          ),
          data: (List<EmergencyReport> list) {
            if (list.isEmpty) {
              return Container(
                padding: const EdgeInsets.all(16),
                decoration: BoxDecoration(
                  color: scheme.surfaceContainer,
                  borderRadius: AppRadii.radiusLg,
                  border: Border.all(color: scheme.outline),
                ),
                child: Text(
                  'لا توجد بلاغات سابقة.',
                  style: TextStyle(color: scheme.onSurfaceVariant),
                ),
              );
            }
            return Column(
              children: <Widget>[
                for (final EmergencyReport r in list)
                  EmergencyReportTile(
                    report: r,
                    onTap: () => ReportDetailSheet.show(context, r),
                  ),
              ],
            );
          },
        ),
      ],
    );
  }
}

