/**
 * ═══════════════════════════════════════════════════════════════════════════
 *  Drug Risk Routes — Patient 360°
 *  ─────────────────────────────────────────────────────────────────────────
 *  Mounted at /api/drug-risk
 *
 *  Routes:
 *    POST  /check                  — patient self-inquiry about a drug
 *    POST  /check-for-patient      — doctor screens a drug against a patient
 *    GET   /my-history             — patient's check history (paginated)
 *    POST  /:id/acknowledge        — doctor confirms an override after warning
 *    GET   /health                 — probe FastAPI reachability
 *
 *  Auth model:
 *    All routes require a valid JWT (protect middleware).
 *    Role gates:
 *      - /check + /my-history          → patient only
 *      - /check-for-patient + acknowledge → doctor only
 *      - /health                       → patient, doctor, admin (debugging)
 *
 *  Why /check is patient-only:
 *    Doctors should use /check-for-patient (which includes a patient
 *    identifier) so the check is correctly attributed to the doctor and
 *    linked to the right patient — never accidentally to the doctor's own
 *    record.
 * ═══════════════════════════════════════════════════════════════════════════
 */

const express = require('express');
const router = express.Router();

const { protect, authorize } = require('../../middleware/auth');
const drugRiskController = require('../../controllers/drugRisk/drugRiskController');

// ── Patient endpoints ──────────────────────────────────────────────────

router.post(
  '/check',
  protect,
  authorize('patient'),
  drugRiskController.checkForSelf
);

router.get(
  '/my-history',
  protect,
  authorize('patient'),
  drugRiskController.myHistory
);

// ── Doctor endpoints ───────────────────────────────────────────────────

router.post(
  '/check-for-patient',
  protect,
  authorize('doctor'),
  drugRiskController.checkForPatient
);

router.post(
  '/:id/acknowledge',
  protect,
  authorize('doctor'),
  drugRiskController.acknowledgeOverride
);

// ── Ops / debugging (open to clinical staff + admin) ───────────────────

router.get(
  '/health',
  protect,
  authorize('patient', 'doctor', 'admin'),
  drugRiskController.health
);

module.exports = router;
