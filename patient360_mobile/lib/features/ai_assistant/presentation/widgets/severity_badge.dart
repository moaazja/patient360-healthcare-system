import 'package:flutter/material.dart';

import '../../../../core/theme/app_radii.dart';
import '../../domain/severity_level.dart';

/// Pill badge shown alongside a triage result. Critical/high levels pulse
/// the icon by default; the pulse is suppressed when the user has
/// requested reduced motion via OS-level accessibility settings.
class SeverityBadge extends StatefulWidget {
  const SeverityBadge({required this.level, super.key});
  final SeverityLevel level;

  @override
  State<SeverityBadge> createState() => _SeverityBadgeState();
}

class _SeverityBadgeState extends State<SeverityBadge>
    with SingleTickerProviderStateMixin {
  late final AnimationController _controller;

  @override
  void initState() {
    super.initState();
    _controller = AnimationController(
      vsync: this,
      duration: const Duration(milliseconds: 1100),
    )..repeat(reverse: true);
  }

  @override
  void dispose() {
    _controller.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final SeverityLevel level = widget.level;
    final Color bg = level.color.withValues(alpha: 0.16);
    final bool reduceMotion = MediaQuery.disableAnimationsOf(context) ||
        MediaQuery.accessibleNavigationOf(context);
    final bool shouldPulse = !reduceMotion && level.isUrgent;

    final Widget icon = Icon(level.icon, size: 16, color: level.color);

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 5),
      decoration: BoxDecoration(
        color: bg,
        borderRadius: AppRadii.radiusMd,
        border: Border.all(
          color: level.color.withValues(alpha: level.isUrgent ? 0.6 : 0.35),
          width: level.isUrgent ? 1.5 : 1,
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: <Widget>[
          if (shouldPulse)
            AnimatedBuilder(
              animation: _controller,
              builder: (BuildContext _, Widget? child) => Opacity(
                opacity: 0.55 + 0.45 * _controller.value,
                child: child,
              ),
              child: icon,
            )
          else
            icon,
          const SizedBox(width: 6),
          Text(
            level.arabicLabel,
            style: TextStyle(
              color: level.color,
              fontWeight: FontWeight.w700,
              fontSize: 12,
              height: 1.0,
            ),
          ),
        ],
      ),
    );
  }
}
