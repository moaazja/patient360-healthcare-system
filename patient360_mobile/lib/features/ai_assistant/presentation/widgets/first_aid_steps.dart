import 'package:flutter/material.dart';

import '../../../../core/theme/app_colors.dart';
import '../../../../core/theme/app_radii.dart';

/// Numbered ordered list. Each step animates in with a 200 ms × index
/// stagger. When the user has reduced motion enabled the stagger is
/// skipped — every step appears instantly to keep the screen scannable.
class FirstAidSteps extends StatelessWidget {
  const FirstAidSteps({required this.steps, super.key});

  final List<String> steps;

  @override
  Widget build(BuildContext context) {
    if (steps.isEmpty) {
      return Padding(
        padding: const EdgeInsets.symmetric(vertical: 8),
        child: Text(
          'لا توجد خطوات إسعاف أولي.',
          style: Theme.of(context)
              .textTheme
              .bodyMedium
              ?.copyWith(color: Theme.of(context).colorScheme.onSurfaceVariant),
        ),
      );
    }

    final bool reduceMotion = MediaQuery.disableAnimationsOf(context);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.stretch,
      children: <Widget>[
        for (int i = 0; i < steps.length; i++)
          _Step(
            index: i,
            text: steps[i],
            reduceMotion: reduceMotion,
          ),
      ],
    );
  }
}

class _Step extends StatelessWidget {
  const _Step({
    required this.index,
    required this.text,
    required this.reduceMotion,
  });
  final int index;
  final String text;
  final bool reduceMotion;

  @override
  Widget build(BuildContext context) {
    final ColorScheme scheme = Theme.of(context).colorScheme;
    final Widget row = Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: <Widget>[
          Container(
            width: 26,
            height: 26,
            decoration: BoxDecoration(
              color: AppColors.action.withValues(alpha: 0.18),
              borderRadius: AppRadii.radiusSm,
            ),
            alignment: Alignment.center,
            child: Text(
              '${index + 1}',
              textDirection: TextDirection.ltr,
              style: const TextStyle(
                color: AppColors.action,
                fontWeight: FontWeight.w800,
                fontSize: 13,
              ),
            ),
          ),
          const SizedBox(width: 10),
          Expanded(
            child: Padding(
              padding: const EdgeInsets.only(top: 2),
              child: Text(
                text,
                style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                      color: scheme.onSurface,
                      height: 1.5,
                    ),
              ),
            ),
          ),
        ],
      ),
    );

    if (reduceMotion) return row;

    final Duration delay = Duration(milliseconds: 200 * index);
    return TweenAnimationBuilder<double>(
      key: ValueKey<int>(index),
      tween: Tween<double>(begin: 0.0, end: 1.0),
      duration: const Duration(milliseconds: 320),
      // The delay is approximated via a curve that holds at zero until the
      // staggered window opens.
      curve: _DelayedEaseOut(
        delayFraction: delay.inMilliseconds / 320,
      ),
      builder: (BuildContext _, double t, Widget? child) => Opacity(
        opacity: t.clamp(0.0, 1.0),
        child: Transform.translate(
          offset: Offset(0, (1 - t.clamp(0.0, 1.0)) * 8),
          child: child,
        ),
      ),
      child: row,
    );
  }
}

/// Curve that returns 0 until [delayFraction] of the duration has elapsed,
/// then ease-outs from 0 to 1 over the remainder. Lets the parent express
/// stagger without spawning N AnimationControllers.
class _DelayedEaseOut extends Curve {
  const _DelayedEaseOut({required this.delayFraction});
  final double delayFraction;

  @override
  double transformInternal(double t) {
    if (t <= delayFraction) return 0;
    if (delayFraction >= 1) return 1;
    final double remapped = (t - delayFraction) / (1 - delayFraction);
    return Curves.easeOut.transform(remapped.clamp(0.0, 1.0));
  }
}
