import 'package:flutter/material.dart';
import 'package:intl/intl.dart' as intl;
import 'package:lucide_icons_flutter/lucide_icons.dart';

import '../../../../core/network/api_exception.dart';
import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_radii.dart';
import '../../../../shared/widgets/empty_state.dart';
import '../../domain/emergency_report.dart';
import '../../domain/specialist_result.dart';
import 'confidence_bar.dart';
import 'first_aid_steps.dart';
import 'severity_badge.dart';

/// Multi-variant result panel rendered below the AI inputs. Hosts loading,
/// error, empty, specialist, and triage variants in one widget so the
/// surrounding layout doesn't churn between async states.
class ResultCard extends StatelessWidget {
  const ResultCard.empty({this.emptyTitle, this.emptySubtitle, super.key})
      : variant = _ResultCardVariant.empty,
        loading = false,
        error = null,
        specialist = null,
        triage = null;

  const ResultCard.loading({super.key})
      : variant = _ResultCardVariant.loading,
        loading = true,
        error = null,
        specialist = null,
        triage = null,
        emptyTitle = null,
        emptySubtitle = null;

  const ResultCard.error({required this.error, super.key})
      : variant = _ResultCardVariant.error,
        loading = false,
        specialist = null,
        triage = null,
        emptyTitle = null,
        emptySubtitle = null;

  const ResultCard.specialist({required SpecialistResult result, super.key})
      : variant = _ResultCardVariant.specialist,
        loading = false,
        error = null,
        specialist = result,
        triage = null,
        emptyTitle = null,
        emptySubtitle = null;

  const ResultCard.triage({required EmergencyReport report, super.key})
      : variant = _ResultCardVariant.triage,
        loading = false,
        error = null,
        specialist = null,
        triage = report,
        emptyTitle = null,
        emptySubtitle = null;

  // ignore: library_private_types_in_public_api
  final _ResultCardVariant variant;
  final bool loading;
  final Object? error;
  final SpecialistResult? specialist;
  final EmergencyReport? triage;
  final String? emptyTitle;
  final String? emptySubtitle;

  @override
  Widget build(BuildContext context) {
    final ColorScheme scheme = Theme.of(context).colorScheme;
    return Container(
      padding: const EdgeInsets.all(16),
      decoration: BoxDecoration(
        color: scheme.surfaceContainer,
        borderRadius: AppRadii.radiusLg,
        border: Border.all(color: scheme.outline),
      ),
      child: switch (variant) {
        _ResultCardVariant.empty => _EmptyVariant(
            title: emptyTitle ?? 'ابدأ بإدخال أعراضك',
            subtitle: emptySubtitle ??
                'سيظهر اقتراح الذكاء الاصطناعي هنا بعد الإرسال.',
          ),
        _ResultCardVariant.loading => const _LoadingVariant(),
        _ResultCardVariant.error => _ErrorVariant(error: error!),
        _ResultCardVariant.specialist =>
          _SpecialistVariant(result: specialist!),
        _ResultCardVariant.triage => _TriageVariant(report: triage!),
      },
    );
  }
}

enum _ResultCardVariant { empty, loading, error, specialist, triage }

class _EmptyVariant extends StatelessWidget {
  const _EmptyVariant({required this.title, required this.subtitle});
  final String title;
  final String subtitle;

  @override
  Widget build(BuildContext context) {
    return EmptyState(
      icon: LucideIcons.sparkles,
      title: title,
      subtitle: subtitle,
    );
  }
}

class _LoadingVariant extends StatelessWidget {
  const _LoadingVariant();
  @override
  Widget build(BuildContext context) {
    return Column(
      children: <Widget>[
        const SizedBox(height: 8),
        Row(
          mainAxisAlignment: MainAxisAlignment.center,
          children: <Widget>[
            const SizedBox(
              width: 18,
              height: 18,
              child: CircularProgressIndicator(strokeWidth: 2),
            ),
            const SizedBox(width: 12),
            Text(
              'جارٍ التحليل بواسطة الذكاء الاصطناعي...',
              style: Theme.of(context).textTheme.bodyMedium,
            ),
          ],
        ),
        const SizedBox(height: 8),
      ],
    );
  }
}

class _ErrorVariant extends StatelessWidget {
  const _ErrorVariant({required this.error});
  final Object error;

  @override
  Widget build(BuildContext context) {
    final String msg = error is ApiException
        ? (error as ApiException).toDisplayMessage()
        : error.toString();
    return EmptyState(
      icon: LucideIcons.circleAlert,
      title: 'تعذر الحصول على نتيجة',
      subtitle: msg,
    );
  }
}

class _SpecialistVariant extends StatelessWidget {
  const _SpecialistVariant({required this.result});
  final SpecialistResult result;

  @override
  Widget build(BuildContext context) {
    final ColorScheme scheme = Theme.of(context).colorScheme;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: <Widget>[
        Row(
          children: <Widget>[
            Container(
              width: 36,
              height: 36,
              decoration: BoxDecoration(
                color: AppColors.action.withValues(alpha: 0.18),
                borderRadius: AppRadii.radiusMd,
              ),
              alignment: Alignment.center,
              child: const Icon(
                LucideIcons.stethoscope,
                size: 20,
                color: AppColors.action,
              ),
            ),
            const SizedBox(width: 12),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: <Widget>[
                  Text(
                    result.arabicSpecialization.isEmpty
                        ? result.specialization
                        : result.arabicSpecialization,
                    style: Theme.of(context)
                        .textTheme
                        .titleLarge
                        ?.copyWith(fontWeight: FontWeight.w800),
                  ),
                  if (result.specialization.isNotEmpty &&
                      result.arabicSpecialization.isNotEmpty)
                    Text(
                      result.specialization,
                      textDirection: TextDirection.ltr,
                      style: Theme.of(context).textTheme.labelMedium?.copyWith(
                            color: scheme.onSurfaceVariant,
                            fontFamily: 'Inter',
                          ),
                    ),
                ],
              ),
            ),
          ],
        ),
        if (result.reasoning.isNotEmpty) ...<Widget>[
          const SizedBox(height: 12),
          Text(
            result.reasoning,
            style: Theme.of(context)
                .textTheme
                .bodyMedium
                ?.copyWith(height: 1.6, color: scheme.onSurface),
          ),
        ],
        if (result.arabicDisease != null && result.arabicDisease!.isNotEmpty) ...<Widget>[
          const SizedBox(height: 12),
          _DiseaseChip(arabic: result.arabicDisease!, latin: result.diseaseGuess),
        ],
        const SizedBox(height: 14),
        ConfidenceBar(value: result.confidence),
        const SizedBox(height: 8),
        const _DisclaimerLine(),
      ],
    );
  }
}

class _TriageVariant extends StatelessWidget {
  const _TriageVariant({required this.report});
  final EmergencyReport report;

  @override
  Widget build(BuildContext context) {
    final ColorScheme scheme = Theme.of(context).colorScheme;
    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: <Widget>[
        Row(
          children: <Widget>[
            Expanded(
              child: Text(
                'نتيجة الإسعاف الأولي',
                style: Theme.of(context)
                    .textTheme
                    .titleMedium
                    ?.copyWith(fontWeight: FontWeight.w700),
              ),
            ),
            SeverityBadge(level: report.aiRiskLevel),
          ],
        ),
        const SizedBox(height: 12),
        FirstAidSteps(steps: report.aiFirstAid),
        if (report.aiConfidence != null) ...<Widget>[
          const SizedBox(height: 4),
          ConfidenceBar(value: report.aiConfidence!),
        ],
        const SizedBox(height: 10),
        Row(
          children: <Widget>[
            Icon(LucideIcons.clock, size: 14, color: scheme.onSurfaceVariant),
            const SizedBox(width: 6),
            Text(
              intl.DateFormat('yyyy-MM-dd HH:mm').format(report.reportedAt),
              textDirection: TextDirection.ltr,
              style: Theme.of(context)
                  .textTheme
                  .labelMedium
                  ?.copyWith(color: scheme.onSurfaceVariant),
            ),
            if (report.location != null) ...<Widget>[
              const SizedBox(width: 12),
              Icon(LucideIcons.mapPin, size: 14, color: scheme.onSurfaceVariant),
              const SizedBox(width: 4),
              Text(
                '${report.location!.lat.toStringAsFixed(4)}, '
                '${report.location!.lng.toStringAsFixed(4)}',
                textDirection: TextDirection.ltr,
                style: Theme.of(context).textTheme.labelMedium?.copyWith(
                      color: scheme.onSurfaceVariant,
                      fontFamily: 'Inter',
                    ),
              ),
            ],
          ],
        ),
        const SizedBox(height: 6),
        const _DisclaimerLine(),
      ],
    );
  }
}

class _DiseaseChip extends StatelessWidget {
  const _DiseaseChip({required this.arabic, this.latin});
  final String arabic;
  final String? latin;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: AppColors.accent.withValues(alpha: 0.20),
        borderRadius: AppRadii.radiusMd,
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: <Widget>[
          const Icon(LucideIcons.stethoscope, size: 14, color: AppColors.primary),
          const SizedBox(width: 6),
          Text(
            arabic,
            style: const TextStyle(
              color: AppColors.primary,
              fontWeight: FontWeight.w700,
              fontSize: 12,
            ),
          ),
          if (latin != null && latin!.isNotEmpty) ...<Widget>[
            const SizedBox(width: 6),
            Text(
              '($latin)',
              textDirection: TextDirection.ltr,
              style: TextStyle(
                color: AppColors.primary.withValues(alpha: 0.70),
                fontSize: 11,
                fontFamily: 'Inter',
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _DisclaimerLine extends StatelessWidget {
  const _DisclaimerLine();

  @override
  Widget build(BuildContext context) {
    final ColorScheme scheme = Theme.of(context).colorScheme;
    return Row(
      children: <Widget>[
        Icon(LucideIcons.info, size: 12, color: scheme.onSurfaceVariant),
        const SizedBox(width: 4),
        Expanded(
          child: Text(
            'هذه النتيجة للإرشاد فقط ولا تحل محل الاستشارة الطبية.',
            style: Theme.of(context).textTheme.labelSmall?.copyWith(
                  color: scheme.onSurfaceVariant,
                ),
          ),
        ),
      ],
    );
  }
}
