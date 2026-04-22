/**
 * InputModeToggle
 *
 * Segmented radio-group for selecting AI input modality (text / image /
 * voice). Renders Lucide icons with Arabic labels. Active mode uses the
 * Teal Medica gradient; inactive uses surface color; disabled modes show
 * a tooltip explaining why.
 *
 * In v1, voice is always disabled (tooltip: "قريباً — يتطلب اتصال آمن")
 * because it requires HTTPS + mic permission — tracked as pending work
 * item 8 in CLAUDE.md. The component is v2-ready: once voice is enabled,
 * remove it from PERMANENTLY_DISABLED below.
 *
 * ─── STYLING CONVENTION FOR ALL 8 AI ATOMS ────────────────────────────
 * Styles for every component under frontend/src/components/ai/ live in
 * frontend/src/styles/PatientDashboard.css under the pd-ai-* prefix.
 * Components are className-only — no CSS modules, no inline styles, no
 * styled-components. This keeps Teal Medica theme tokens working via
 * ThemeProvider's runtime CSS variable swap, and matches the
 * PharmacistDashboard/LabDashboard convention of one .css file per
 * dashboard.
 * ──────────────────────────────────────────────────────────────────────
 *
 * Accessibility:
 *   - role="radiogroup" with role="radio" buttons
 *   - Roving tabindex: only the selected option is Tab-focusable
 *   - Arrow keys cycle in visual (RTL-aware) direction
 *   - Home/End jump to first/last enabled option
 *   - Enter/Space select
 *   - Disabled modes use aria-disabled (not HTML `disabled`) so the
 *     tooltip stays discoverable on hover/focus
 *
 * @param {object} props
 * @param {'text'|'image'|'voice'} props.mode - currently selected mode
 * @param {(mode: 'text'|'image'|'voice') => void} props.onChange
 * @param {Array<'text'|'image'|'voice'>} [props.availableModes]
 *   Modes the parent wants clickable. Defaults to ['text', 'image'].
 *   Modes outside this list render disabled. Voice is permanently
 *   disabled in v1 regardless.
 */

import React, { useRef } from 'react';
import { MessageSquare, Image as ImageIcon, Mic } from 'lucide-react';

const MODES = [
  { key: 'text',  icon: MessageSquare, label: 'نص'   },
  { key: 'image', icon: ImageIcon,     label: 'صورة' },
  { key: 'voice', icon: Mic,           label: 'صوت'  },
];

const PERMANENTLY_DISABLED = new Set(['voice']);
const PERMANENTLY_DISABLED_TOOLTIPS = {
  voice: 'قريباً — يتطلب اتصال آمن',
};

export default function InputModeToggle({
  mode,
  onChange,
  availableModes = ['text', 'image'],
}) {
  const containerRef = useRef(null);

  const isEnabled = (key) =>
    !PERMANENTLY_DISABLED.has(key) && availableModes.includes(key);

  const disabledTooltip = (key) => PERMANENTLY_DISABLED_TOOLTIPS[key] || null;

  // Roving tabindex focus target: the active mode (if enabled) or the
  // first enabled mode as a fallback.
  const enabledKeys = MODES.filter((m) => isEnabled(m.key)).map((m) => m.key);

  // Defensive: if parent passed an empty or all-disabled availableModes,
  // render nothing rather than a row of disabled buttons.
  if (enabledKeys.length === 0) {
    return null;
  }

  const focusTargetKey = enabledKeys.includes(mode) ? mode : enabledKeys[0];

  const handleKeyDown = (event, key) => {
    if (!isEnabled(key)) return;

    const container = containerRef.current;
    const rtl =
      (container && getComputedStyle(container).direction === 'rtl') ||
      getComputedStyle(document.body).direction === 'rtl';
    const forwardKey = rtl ? 'ArrowLeft' : 'ArrowRight';
    const backwardKey = rtl ? 'ArrowRight' : 'ArrowLeft';

    let nextIndex = enabledKeys.indexOf(key);

    if (event.key === 'ArrowDown' || event.key === forwardKey) {
      nextIndex = (nextIndex + 1) % enabledKeys.length;
    } else if (event.key === 'ArrowUp' || event.key === backwardKey) {
      nextIndex = (nextIndex - 1 + enabledKeys.length) % enabledKeys.length;
    } else if (event.key === 'Home') {
      nextIndex = 0;
    } else if (event.key === 'End') {
      nextIndex = enabledKeys.length - 1;
    } else if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      onChange(key);
      return;
    } else {
      return;
    }

    event.preventDefault();
    const nextKey = enabledKeys[nextIndex];
    onChange(nextKey);
    const btn = container?.querySelector(`[data-mode-key="${nextKey}"]`);
    btn?.focus();
  };

  return (
    <div
      ref={containerRef}
      className="pd-ai-input-mode-toggle"
      role="radiogroup"
      aria-label="اختر نوع الإدخال"
    >
      {MODES.map(({ key, icon: Icon, label }) => {
        const enabled = isEnabled(key);
        const isActive = mode === key && enabled;
        const tooltip = disabledTooltip(key);

        const classes = [
          'pd-ai-input-mode-btn',
          isActive && 'is-active',
          !enabled && 'is-disabled',
        ]
          .filter(Boolean)
          .join(' ');

        return (
          <button
            key={key}
            type="button"
            role="radio"
            aria-checked={isActive}
            aria-disabled={!enabled}
            aria-label={tooltip ? `${label} — ${tooltip}` : label}
            data-mode-key={key}
            tabIndex={key === focusTargetKey ? 0 : -1}
            title={tooltip || undefined}
            className={classes}
            onClick={() => {
              if (enabled) onChange(key);
            }}
            onKeyDown={(e) => handleKeyDown(e, key)}
          >
            <Icon className="pd-ai-input-mode-icon" aria-hidden="true" size={20} />
            <span className="pd-ai-input-mode-label">{label}</span>
          </button>
        );
      })}
    </div>
  );
}
