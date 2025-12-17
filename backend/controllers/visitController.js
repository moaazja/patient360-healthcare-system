const visitService = require('../services/visitService');

/**
 * Visit Controller
 * Handles HTTP requests for visit operations
 */

/**
 * @route   GET /api/patient/visits
 * @desc    Get all patient visits with filters
 * @access  Private (Patient only)
 */
exports.getVisits = async (req, res) => {
  try {
    const patientId = req.user.patientId;
    const filters = {
      startDate: req.query.startDate,
      endDate: req.query.endDate,
      doctorId: req.query.doctorId,
      searchTerm: req.query.search,
      status: req.query.status,
      page: req.query.page || 1,
      limit: req.query.limit || 50
    };

    const result = await visitService.getPatientVisits(patientId, filters);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.status(200).json(result);
  } catch (error) {
    console.error('Error in getVisits controller:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء جلب الزيارات'
    });
  }
};

/**
 * @route   GET /api/patient/visits/:visitId
 * @desc    Get single visit details
 * @access  Private (Patient only - ownership verified in middleware)
 */
exports.getVisitDetails = async (req, res) => {
  try {
    const patientId = req.user.patientId;
    const visitId = req.params.visitId;

    const result = await visitService.getVisitById(visitId, patientId);

    if (!result.success) {
      return res.status(404).json(result);
    }

    res.status(200).json(result);
  } catch (error) {
    console.error('Error in getVisitDetails controller:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء جلب تفاصيل الزيارة'
    });
  }
};

/**
 * @route   GET /api/patient/visits/stats
 * @desc    Get visit statistics
 * @access  Private (Patient only)
 */
exports.getVisitStats = async (req, res) => {
  try {
    const patientId = req.user.patientId;

    const result = await visitService.getVisitStats(patientId);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.status(200).json(result);
  } catch (error) {
    console.error('Error in getVisitStats controller:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء حساب إحصائيات الزيارات'
    });
  }
};

/**
 * @route   GET /api/patient/visits/by-doctor
 * @desc    Get visits grouped by doctor
 * @access  Private (Patient only)
 */
exports.getVisitsByDoctor = async (req, res) => {
  try {
    const patientId = req.user.patientId;

    const result = await visitService.getVisitsByDoctor(patientId);

    if (!result.success) {
      return res.status(400).json(result);
    }

    res.status(200).json(result);
  } catch (error) {
    console.error('Error in getVisitsByDoctor controller:', error);
    res.status(500).json({
      success: false,
      message: 'حدث خطأ أثناء تجميع الزيارات'
    });
  }
};