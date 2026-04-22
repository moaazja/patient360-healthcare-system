/**
 * ResultCard
 *
 * Variant-driven card that displays AI analysis results in one of three
 * modes:
 *   - 'specialist' — specialist recommender output (doctor type, disease,
 *     body system). Three stacked rows with thematic Lucide icons.
 *   - 'triage' — emergency triage output (risk level, emergency banner,
 *     first-aid steps, confidence bar, top-5 predictions in a native
 *     <details> accordion for keyboard/SR-friendly disclosure).
 *   - 'empty' — no result yet. Shows an EmptyState inviting the user to
 *     start analysis.
 *
 * Loading and error states take precedence over variant content:
 *   - loading=true → skeleton shimmer (CSS disables animation when
 *     prefers-reduced-motion is set)
 *   - error (truthy) → AlertCircle + Arabic message (falls back through
 *     error.message → hardcoded fallback)
 *
 * Composes four sibling atoms: SeverityBadge, FirstAidSteps,
 * ConfidenceBar, EmptyState. See InputModeToggle.jsx for the AI-atom
 * styling convention.
 *
 * Accessibility:
 *   - Loading state: aria-busy + aria-label="جاري التحليل"
 *   - Error state: role="alert" so AT announces new errors automatically
 *   - Emergency banner: role="alert" (urgent, should interrupt)
 *   - Top-5 accordion: native <details>/<summary> — built-in keyboard
 *     and screen-reader disclosure semantics
 *   - Per-prediction bars: role="progressbar" with aria-valuenow/min/max
 *
 * @param {object} props
 * @param {'specialist'|'triage'|'empty'} props.variant
 * @param {object} [props.result] - variant-specific payload:
 *
 *   Specialist shape:
 *     { specialist: string, disease: string, organ_system: string }
 *
 *   Triage shape (senior redwan response / emergency_reports):
 *     {
 *       aiRiskLevel: 'low'|'moderate'|'high'|'critical',
 *       is_emergency: boolean,
 *       aiFirstAid: string[],
 *       aiConfidence: number (0..1 or 0..100 — we normalize),
 *       top5?: Array<{ class: string, prob: string|number }>
 *     }
 *
 * @param {boolean} [props.loading=false]
 * @param {string|{message:string}|null} [props.error]
 */

import React from 'react';
import {
  Stethoscope,
  Activity,
  HeartPulse,
  AlertCircle,
  AlertOctagon,
  Sparkles,
} from 'lucide-react';

import SeverityBadge from './SeverityBadge';
import FirstAidSteps from './FirstAidSteps';
import ConfidenceBar from './ConfidenceBar';
import EmptyState from './EmptyState';

// ──────────────────────────────────────────────────────────────────────
// Helpers
// ──────────────────────────────────────────────────────────────────────

function formatError(error) {
  if (!error) return null;
  if (typeof error === 'string') return error;
  if (typeof error === 'object' && typeof error.message === 'string') {
    return error.message;
  }
  return 'حدث خطأ أثناء التحليل';
}

// Coerce a probability that might arrive as "85.3%" (senior redwan) or
// 0.853 (normalized) or 85.3 (percentage number) into a 0..1 range.
function parseProb(prob) {
  if (typeof prob === 'number') return prob > 1 ? prob / 100 : prob;
  if (typeof prob === 'string') {
    const n = parseFloat(prob);
    if (Number.isNaN(n)) return 0;
    return n > 1 ? n / 100 : n;
  }
  return 0;
}

// ──────────────────────────────────────────────────────────────────────
// Sub-renders
// ──────────────────────────────────────────────────────────────────────

function ResultCardSkeleton() {
  return (
    <div
      className="pd-ai-result-card pd-ai-result-card--loading"
      aria-busy="true"
      aria-label="جاري التحليل"
    >
      <div className="pd-ai-result-skeleton-row" />
      <div className="pd-ai-result-skeleton-row" />
      <div className="pd-ai-result-skeleton-row" />
    </div>
  );
}

function ResultCardError({ message }) {
  return (
    <div className="pd-ai-result-card pd-ai-result-card--error" role="alert">
      <AlertCircle className="pd-ai-result-error-icon" size={28} aria-hidden="true" />
      <p className="pd-ai-result-error-message">{message}</p>
    </div>
  );
}

function ResultCardSpecialist({ result }) {
  const rows = [
    { icon: Stethoscope, label: 'الطبيب المختص',   value: result?.specialist  },
    { icon: Activity,    label: 'التشخيص المحتمل', value: result?.disease     },
    { icon: HeartPulse,  label: 'الجهاز',           value: result?.organ_system },
  ];

  return (
    <div className="pd-ai-result-card pd-ai-result-card--specialist">
      <h3 className="pd-ai-result-title">نتيجة التحليل</h3>
      <ul className="pd-ai-result-rows">
        {rows.map(({ icon: Icon, label, value }) => (
          <li key={label} className="pd-ai-result-row">
            <div className="pd-ai-result-row-icon">
              <Icon size={20} aria-hidden="true" />
            </div>
            <div className="pd-ai-result-row-text">
              <span className="pd-ai-result-row-label">{label}</span>
              <span className="pd-ai-result-row-value" dir="auto">
                {value || '—'}
              </span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}

function ResultCardTriage({ result }) {
  const riskLevel = result?.aiRiskLevel || 'low';
  const isEmergency = !!result?.is_emergency;
  const steps = Array.isArray(result?.aiFirstAid) ? result.aiFirstAid : [];
  const confidenceRaw =
    typeof result?.aiConfidence === 'number' ? result.aiConfidence : 0;
  // Normalize confidence to 0..1 just like top5 probs
  const confidence = confidenceRaw > 1 ? confidenceRaw / 100 : confidenceRaw;
  const top5 = Array.isArray(result?.top5) ? result.top5 : [];

  return (
    <div className="pd-ai-result-card pd-ai-result-card--triage">
      <div className="pd-ai-result-triage-header">
        <h3 className="pd-ai-result-title">نتيجة التحليل</h3>
        <SeverityBadge severity={riskLevel} />
      </div>

      {isEmergency && (
        <div className="pd-ai-result-emergency-banner" role="alert">
          <AlertOctagon size={20} aria-hidden="true" />
          <p>
            <strong>حالة طارئة</strong>
            <span> — اتصل بالإسعاف فوراً</span>
          </p>
        </div>
      )}

      {steps.length > 0 && (
        <div className="pd-ai-result-first-aid">
          <h4 className="pd-ai-result-subtitle">خطوات الإسعاف الأولي</h4>
          <FirstAidSteps steps={steps} />
        </div>
      )}

      <div className="pd-ai-result-confidence">
        <ConfidenceBar confidence={confidence} />
      </div>

      {top5.length > 0 && (
        <details className="pd-ai-result-top5">
          <summary className="pd-ai-result-top5-summary">عرض التفاصيل</summary>
          <ul className="pd-ai-result-top5-list">
            {top5.map((p, idx) => {
              const parsed = parseProb(p?.prob);
              const percentage = (parsed * 100).toFixed(1);
              return (
                <li key={`${p?.class}-${idx}`} className="pd-ai-result-top5-item">
                  <span className="pd-ai-result-top5-class" dir="auto">
                    {p?.class || '—'}
                  </span>
                  <div
                    className="pd-ai-result-top5-bar"
                    role="progressbar"
                    aria-valuenow={Number(percentage)}
                    aria-valuemin={0}
                    aria-valuemax={100}
                    aria-label={`${p?.class || ''}: ${percentage}%`}
                  >
                    <div
                      className="pd-ai-result-top5-bar-fill"
                      style={{ width: `${percentage}%` }}
                    />
                  </div>
                  <span className="pd-ai-result-top5-pct">{percentage}%</span>
                </li>
              );
            })}
          </ul>
        </details>
      )}
    </div>
  );
}

function ResultCardEmpty() {
  return (
    <div className="pd-ai-result-card pd-ai-result-card--empty">
      <EmptyState
        icon={Sparkles}
        title="ابدأ التحليل"
        subtitle="أدخل أعراضك أو ارفع صورة طبية لبدء الاستشارة الذكية."
      />
    </div>
  );
}

// ──────────────────────────────────────────────────────────────────────
// Public component
// ──────────────────────────────────────────────────────────────────────

export default function ResultCard({
  variant,
  result,
  loading = false,
  error = null,
}) {
  if (loading) return <ResultCardSkeleton />;

  const errMessage = formatError(error);
  if (errMessage) return <ResultCardError message={errMessage} />;

  if (variant === 'empty' || !result) return <ResultCardEmpty />;
  if (variant === 'specialist') return <ResultCardSpecialist result={result} />;
  if (variant === 'triage') return <ResultCardTriage result={result} />;

  // Unknown variant: degrade gracefully to empty.
  return <ResultCardEmpty />;
}
