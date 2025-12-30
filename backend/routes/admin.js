// backend/routes/admin.js
// Admin Routes with Doctor Request Management - FIXED

const express = require('express');
const router = express.Router();
const adminController = require('../controllers/adminController');
const { protect, restrictTo } = require('../middleware/auth');
const { auditLog } = require('../middleware/auditLog');

// Apply protection to all admin routes
router.use(protect);
router.use(restrictTo('admin'));

// ==================== STATISTICS ====================
router.get('/statistics', 
  auditLog('VIEW_STATISTICS'), 
  adminController.getStatistics
);

// ==================== DOCTOR REQUESTS (NEW) ====================
router.get('/doctor-requests',
  auditLog('VIEW_DOCTOR_REQUESTS'),
  adminController.getAllDoctorRequests
);

router.get('/doctor-requests/:id',
  auditLog('VIEW_DOCTOR_REQUEST_DETAILS'),
  adminController.getDoctorRequestById
);

// ✅ FIXED: Changed /approve to /accept to match frontend
router.post('/doctor-requests/:id/accept',
  auditLog('APPROVE_DOCTOR_REQUEST'),
  adminController.approveDoctorRequest
);

router.post('/doctor-requests/:id/reject',
  auditLog('REJECT_DOCTOR_REQUEST'),
  adminController.rejectDoctorRequest
);

// ==================== DOCTORS MANAGEMENT ====================
router.get('/doctors', 
  auditLog('VIEW_DOCTORS'), 
  adminController.getAllDoctors
);

router.get('/doctors/:id', 
  auditLog('VIEW_DOCTOR_DETAILS'), 
  adminController.getDoctorById
);

router.post('/doctors', 
  auditLog('ADD_DOCTOR'), 
  adminController.createDoctor
);

router.patch('/doctors/:id/deactivate', 
  auditLog('DEACTIVATE_DOCTOR'), 
  adminController.deactivateDoctor
);

router.patch('/doctors/:id/activate', 
  auditLog('ACTIVATE_DOCTOR'), 
  adminController.activateDoctor
);

router.patch('/doctors/:id', 
  auditLog('UPDATE_DOCTOR'), 
  adminController.updateDoctor
);

// ==================== PATIENTS MANAGEMENT ====================
router.get('/patients', 
  auditLog('VIEW_PATIENTS'), 
  adminController.getAllPatients
);

router.get('/patients/:id', 
  auditLog('VIEW_PATIENT_DETAILS'), 
  adminController.getPatientById
);

router.patch('/patients/:id/deactivate', 
  auditLog('DEACTIVATE_PATIENT'), 
  adminController.deactivatePatient
);

router.patch('/patients/:id/activate', 
  auditLog('ACTIVATE_PATIENT'), 
  adminController.activatePatient
);

router.patch('/patients/:id', 
  auditLog('UPDATE_PATIENT'), 
  adminController.updatePatient
);

// ==================== AUDIT LOGS ====================
router.get('/audit-logs', 
  auditLog('VIEW_AUDIT_LOGS'), 
  adminController.getAuditLogs
);

router.get('/audit-logs/user/:userId', 
  auditLog('VIEW_USER_AUDIT_LOGS'), 
  adminController.getUserAuditLogs
);

module.exports = router;