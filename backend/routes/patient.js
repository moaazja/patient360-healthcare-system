const express = require('express');
const router = express.Router();

// Import controllers
const patientController = require('../controllers/patientController');
const visitController = require('../controllers/visitController');
const medicationController = require('../controllers/medicationController');

// Import middleware
const { protect, restrictTo, verifyPatientOwnership } = require('../middleware/auth');
const { auditLog } = require('../middleware/auditLog');
const { 
  profileLimiter, 
  visitsLimiter, 
  medicationsLimiter 
} = require('../middleware/rateLimiter');

/**
 * ALL ROUTES REQUIRE:
 * 1. Authentication (protect)
 * 2. Patient role only (restrictTo('patient'))
 * 3. Ownership verification (verifyPatientOwnership)
 * 4. Audit logging
 * 5. Rate limiting
 */

// ==========================================
// PATIENT PROFILE ROUTES
// ==========================================

/**
 * @route   GET /api/patient/profile
 * @desc    Get complete patient profile
 * @access  Private (Patient only)
 */
router.get(
  '/profile',
  protect,
  restrictTo('patient'),
  verifyPatientOwnership,
  profileLimiter,
  auditLog('PATIENT_PROFILE'),
  patientController.getProfile
);

/**
 * @route   PUT /api/patient/profile
 * @desc    Update patient profile (limited fields)
 * @access  Private (Patient only)
 */
router.put(
  '/profile',
  protect,
  restrictTo('patient'),
  verifyPatientOwnership,
  profileLimiter,
  auditLog('PATIENT_PROFILE'),
  patientController.updateProfile
);

/**
 * @route   GET /api/patient/medical-history
 * @desc    Get medical history summary
 * @access  Private (Patient only)
 */
router.get(
  '/medical-history',
  protect,
  restrictTo('patient'),
  verifyPatientOwnership,
  profileLimiter,
  auditLog('MEDICAL_HISTORY'),
  patientController.getMedicalHistory
);

// ==========================================
// VISIT ROUTES
// ==========================================

/**
 * @route   GET /api/patient/visits/stats
 * @desc    Get visit statistics
 * @access  Private (Patient only)
 * @note    This route MUST come before /:visitId to avoid conflicts
 */
router.get(
  '/visits/stats',
  protect,
  restrictTo('patient'),
  verifyPatientOwnership,
  visitsLimiter,
  auditLog('VISIT'),
  visitController.getVisitStats
);

/**
 * @route   GET /api/patient/visits/by-doctor
 * @desc    Get visits grouped by doctor
 * @access  Private (Patient only)
 */
router.get(
  '/visits/by-doctor',
  protect,
  restrictTo('patient'),
  verifyPatientOwnership,
  visitsLimiter,
  auditLog('VISIT'),
  visitController.getVisitsByDoctor
);

/**
 * @route   GET /api/patient/visits
 * @desc    Get all patient visits with filters
 * @access  Private (Patient only)
 * @query   startDate, endDate, doctorId, search, status, page, limit
 */
router.get(
  '/visits',
  protect,
  restrictTo('patient'),
  verifyPatientOwnership,
  visitsLimiter,
  auditLog('VISIT'),
  visitController.getVisits
);

/**
 * @route   GET /api/patient/visits/:visitId
 * @desc    Get single visit details
 * @access  Private (Patient only - ownership verified)
 */
router.get(
  '/visits/:visitId',
  protect,
  restrictTo('patient'),
  verifyPatientOwnership, // This will verify visit ownership
  visitsLimiter,
  auditLog('VISIT'),
  visitController.getVisitDetails
);

// ==========================================
// MEDICATION ROUTES
// ==========================================

/**
 * @route   GET /api/patient/medications/schedule
 * @desc    Get weekly medication schedule
 * @access  Private (Patient only)
 * @note    This route MUST come before /medications/:id to avoid conflicts
 */
router.get(
  '/medications/schedule',
  protect,
  restrictTo('patient'),
  verifyPatientOwnership,
  medicationsLimiter,
  auditLog('MEDICATION'),
  medicationController.getMedicationSchedule
);

/**
 * @route   GET /api/patient/medications/history
 * @desc    Get medication history with filters
 * @access  Private (Patient only)
 * @query   startDate, endDate, medicationName, page, limit
 */
router.get(
  '/medications/history',
  protect,
  restrictTo('patient'),
  verifyPatientOwnership,
  medicationsLimiter,
  auditLog('MEDICATION'),
  medicationController.getMedicationHistory
);

/**
 * @route   GET /api/patient/medications/interactions
 * @desc    Check for medication interactions
 * @access  Private (Patient only)
 */
router.get(
  '/medications/interactions',
  protect,
  restrictTo('patient'),
  verifyPatientOwnership,
  medicationsLimiter,
  auditLog('MEDICATION'),
  medicationController.checkInteractions
);

/**
 * @route   GET /api/patient/medications
 * @desc    Get current active medications
 * @access  Private (Patient only)
 */
router.get(
  '/medications',
  protect,
  restrictTo('patient'),
  verifyPatientOwnership,
  medicationsLimiter,
  auditLog('MEDICATION'),
  medicationController.getCurrentMedications
);

// ==========================================
// AI RISK PREDICTION ROUTE (Placeholder)
// ==========================================

/**
 * @route   POST /api/patient/ai-risk-prediction
 * @desc    Get AI-based health risk prediction
 * @access  Private (Patient only)
 * @note    Placeholder for future AI model integration
 */
router.post(
  '/ai-risk-prediction',
  protect,
  restrictTo('patient'),
  verifyPatientOwnership,
  profileLimiter,
  auditLog('PATIENT_PROFILE'),
  (req, res) => {
    // Placeholder response
    res.status(200).json({
      success: true,
      message: 'AI model integration coming soon',
      status: 'pending',
      note: 'This endpoint is ready for your AI model integration'
    });
  }
);

module.exports = router;