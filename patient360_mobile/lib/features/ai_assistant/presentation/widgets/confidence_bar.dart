import 'package:flutter/material.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_radii.dart';

/// Horizontal progress bar with a color that shifts by confidence band:
///   * `<50%` → warning amber
///   * `50–75%` → accent teal
///   * `≥75%` → success green
///
/// Accepts [value] in the inclusive range 0.0..1.0; out-of-range inputs
/// are clamped silently rather than throwing.
class ConfidenceBar extends StatelessWidget {
  const ConfidenceBar({required this.value, super.key});

  final double value;

  @override
  Widget build(BuildContext context) {
    final double clamped = value.clamp(0.0, 1.0);
    final int pct = (clamped * 100).round();
    final Color barColor = _colorFor(clamped);
    final ColorScheme scheme = Theme.of(context).colorScheme;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: <Widget>[
        Row(
          children: <Widget>[
            Text(
              'مستوى الثقة',
              style: Theme.of(context).textTheme.labelMedium?.copyWith(
                    color: scheme.onSurfaceVariant,
                  ),
            ),
            const Spacer(),
            Text(
              '$pct٪',
              textDirection: TextDirection.ltr,
              style: TextStyle(
                color: barColor,
                fontWeight: FontWeight.w800,
                fontSize: 13,
              ),
            ),
          ],
        ),
        const SizedBox(height: 6),
        ClipRRect(
          borderRadius: AppRadii.radiusSm,
          child: SizedBox(
            height: 8,
            child: Stack(
              children: <Widget>[
                Container(color: scheme.outline.withValues(alpha: 0.30)),
                FractionallySizedBox(
                  alignment: AlignmentDirectional.centerStart,
                  widthFactor: clamped,
                  child: Container(
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        colors: <Color>[
                          barColor.withValues(alpha: 0.70),
                          barColor,
                        ],
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ],
    );
  }

  static Color _colorFor(double v) {
    if (v >= 0.75) return AppColors.success;
    if (v >= 0.50) return AppColors.accent;
    return AppColors.warning;
  }
}
