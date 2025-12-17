// src/pages/PatientDashboard.jsx
// ✅ FINAL VERSION - Uses Backend API with MongoDB

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/common/Navbar';
import { authAPI } from '../services/api';
import '../styles/PatientDashboard.css';

/**
 * PatientDashboard Component - FINAL VERSION
 * 
 * ✅ Uses Backend API (MongoDB)
 * ✅ Supports minors (childId, parentNationalId)
 * ✅ Real patient data from database
 * ✅ JWT authentication
 */
const PatientDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Modal state
  const [modal, setModal] = useState({
    isOpen: false,
    type: '',
    title: '',
    message: '',
    onConfirm: null
  });

  // Visit details modal state
  const [selectedVisit, setSelectedVisit] = useState(null);
  const [showVisitDetails, setShowVisitDetails] = useState(false);
  
  // Visits data and filters
  const [visits, setVisits] = useState([]);
  const [filteredVisits, setFilteredVisits] = useState([]);
  const [filters, setFilters] = useState({
    startDate: '',
    endDate: '',
    doctorId: '',
    searchTerm: ''
  });
  
  // Active section state
  const [activeSection, setActiveSection] = useState('overview');
  
  // Doctors list for filter dropdown
  const [doctors, setDoctors] = useState([]);

  /**
   * Opens modal dialog
   */
  const openModal = (type, title, message, onConfirm = null) => {
    setModal({ isOpen: true, type, title, message, onConfirm });
  };

  /**
   * Closes modal dialog
   */
  const closeModal = () => {
    if (modal.onConfirm && modal.type === 'confirm') {
      // User cancelled confirmation
    }
    setModal({ isOpen: false, type: '', title: '', message: '', onConfirm: null });
  };

  /**
   * Handles modal confirmation action
   */
  const handleModalConfirm = () => {
    if (modal.onConfirm) {
      modal.onConfirm();
    }
    closeModal();
  };

  /**
   * ✅ UPDATED: Load patient data from Backend API
   */
  useEffect(() => {
    const loadPatientData = async () => {
      setLoading(true);
      
      // Get current user from localStorage (set by authAPI.login)
      const currentUser = authAPI.getCurrentUser();
      
      // Security Check 1: User must be logged in
      if (!currentUser) {
        openModal('error', 'غير مصرح', 'يجب عليك تسجيل الدخول أولاً', () => navigate('/'));
        return;
      }
      
      // Security Check 2: User must have patient role
      const primaryRole = currentUser.roles && currentUser.roles[0];
      if (primaryRole !== 'patient') {
        openModal('error', 'غير مصرح', 'هذه الصفحة متاحة للمرضى فقط', () => navigate('/'));
        return;
      }
      
      setUser(currentUser);
      
      // Generate visits from patient data (currently empty, will be populated by doctor)
      const realVisits = generateVisitsFromPatientData(currentUser);
      setVisits(realVisits);
      setFilteredVisits(realVisits);
      
      // Load doctors list (mock for now)
      const mockDoctors = generateMockDoctors();
      setDoctors(mockDoctors);
      
      setLoading(false);
    };
    
    loadPatientData();
  }, [navigate]);

  /**
   * Generates visits from patient data
   * Will be populated by doctor visits in the future
   */
  const generateVisitsFromPatientData = (patient) => {
    if (!patient) return [];

    // Currently returns empty array
    // Will be populated when doctor creates visits
    return [];
  };

  /**
   * Generates mock doctors data
   */
  const generateMockDoctors = () => {
    return [
      {
        _id: 1001,
        personId: 2001,
        firstName: 'أحمد',
        lastName: 'محمود',
        specialization: 'Cardiologist',
        medicalLicenseNumber: 'MD12345678'
      },
      {
        _id: 1002,
        personId: 2002,
        firstName: 'سارة',
        lastName: 'العلي',
        specialization: 'Cardiac Surgeon',
        medicalLicenseNumber: 'MD87654321'
      }
    ];
  };

  /**
   * Applies filters to visits list
   */
  useEffect(() => {
    let filtered = [...visits];
    
    // Filter by date range
    if (filters.startDate) {
      filtered = filtered.filter(visit => 
        new Date(visit.visitDate) >= new Date(filters.startDate)
      );
    }
    if (filters.endDate) {
      filtered = filtered.filter(visit => 
        new Date(visit.visitDate) <= new Date(filters.endDate)
      );
    }
    
    // Filter by doctor
    if (filters.doctorId) {
      filtered = filtered.filter(visit => 
        visit.doctorId === parseInt(filters.doctorId)
      );
    }
    
    // Filter by search term
    if (filters.searchTerm) {
      const searchLower = filters.searchTerm.toLowerCase();
      filtered = filtered.filter(visit => 
        (visit.chiefComplaint && visit.chiefComplaint.toLowerCase().includes(searchLower)) ||
        (visit.diagnosis && visit.diagnosis.toLowerCase().includes(searchLower)) ||
        (visit.doctorName && visit.doctorName.toLowerCase().includes(searchLower))
      );
    }
    
    // Sort by date (newest first)
    filtered.sort((a, b) => new Date(b.visitDate) - new Date(a.visitDate));
    
    setFilteredVisits(filtered);
  }, [filters, visits]);

  /**
   * Handles filter changes
   */
  const handleFilterChange = (filterName, value) => {
    setFilters(prev => ({
      ...prev,
      [filterName]: value
    }));
  };

  /**
   * Resets all filters
   */
  const resetFilters = () => {
    setFilters({
      startDate: '',
      endDate: '',
      doctorId: '',
      searchTerm: ''
    });
  };

  /**
   * Opens detailed view for a specific visit
   */
  const openVisitDetails = (visit) => {
    setSelectedVisit(visit);
    setShowVisitDetails(true);
  };

  /**
   * Closes detailed view
   */
  const closeVisitDetails = () => {
    setShowVisitDetails(false);
    setSelectedVisit(null);
  };

  /**
   * ✅ UPDATED: Handles secure logout with Backend API
   */
  const handleLogout = () => {
    openModal(
      'confirm',
      'تأكيد تسجيل الخروج',
      'هل أنت متأكد من رغبتك في تسجيل الخروج؟',
      () => {
        // Use authAPI logout
        authAPI.logout();
        // Will redirect to login automatically
      }
    );
  };

  /**
   * Formats date for display
   */
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('ar-EG', { 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  /**
   * Calculates age from date of birth
   */
  const calculateAge = (dateString) => {
    if (!dateString) return null;
    const today = new Date();
    const birthDate = new Date(dateString);
    let age = today.getFullYear() - birthDate.getFullYear();
    const monthDiff = today.getMonth() - birthDate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birthDate.getDate())) {
      age--;
    }
    return age;
  };

  /**
   * Calculates BMI from height and weight
   */
  const calculateBMI = (height, weight) => {
    if (!height || !weight) return null;
    const heightInMeters = height / 100;
    const bmi = weight / (heightInMeters * heightInMeters);
    return bmi.toFixed(1);
  };

  /**
   * Gets BMI category
   */
  const getBMICategory = (bmi) => {
    if (!bmi) return null;
    if (bmi < 18.5) return 'نقص الوزن';
    if (bmi < 25) return 'وزن طبيعي';
    if (bmi < 30) return 'وزن زائد';
    return 'سمنة';
  };

  /**
   * Calculates health statistics
   */
  const getHealthStats = () => {
    const totalVisits = visits.length;
    const totalMedications = visits.reduce((acc, v) => 
      acc + (v.prescribedMedications ? v.prescribedMedications.length : 0), 0
    );
    
    return { totalVisits, totalMedications };
  };

  if (loading) {
    return (
      <div className="loading-container">
        <div className="loading-spinner"></div>
        <p>جاري التحميل...</p>
      </div>
    );
  }

  if (!user) {
    return null;
  }

  const stats = getHealthStats();
  const age = calculateAge(user.dateOfBirth);
  
  // ✅ UPDATED: Access roleData.patient for patient-specific info
  const patientData = user.roleData?.patient || {};
  const bmi = calculateBMI(patientData.height, patientData.weight);
  const bmiCategory = getBMICategory(bmi);

  return (
    <div className="patient-dashboard">
      <Navbar />
      
      {/* Modal Component */}
      {modal.isOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className={`modal-header ${modal.type}`}>
              {modal.type === 'success' && <div className="modal-icon success-icon">✓</div>}
              {modal.type === 'error' && <div className="modal-icon error-icon">✕</div>}
              {modal.type === 'confirm' && <div className="modal-icon confirm-icon">؟</div>}
              <h2 className="modal-title">{modal.title}</h2>
            </div>
            <div className="modal-body">
              <p className="modal-message">{modal.message}</p>
            </div>
            <div className="modal-footer">
              {modal.type === 'confirm' ? (
                <>
                  <button className="modal-button secondary" onClick={closeModal}>
                    إلغاء
                  </button>
                  <button className="modal-button primary" onClick={handleModalConfirm}>
                    تأكيد
                  </button>
                </>
              ) : (
                <button 
                  className="modal-button primary" 
                  onClick={modal.onConfirm ? handleModalConfirm : closeModal}
                >
                  حسناً
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Visit Details Modal */}
      <VisitDetailsModal 
        visit={selectedVisit}
        isOpen={showVisitDetails}
        onClose={closeVisitDetails}
        formatDate={formatDate}
      />

      <div className="dashboard-container">
        {/* Welcome Header */}
        <div className="welcome-header">
          <div className="welcome-content">
            <h1>مرحباً {user.firstName} {user.lastName} 👋</h1>
            <p>لوحة تحكم المريض - Patient 360°</p>
            {/* ✅ NEW: Show if user is a minor */}
            {user.isMinor && user.childId && (
              <p className="minor-badge">قاصر - معرف الطفل: {user.childId}</p>
            )}
          </div>
          <button className="logout-btn" onClick={handleLogout}>
            تسجيل الخروج 🚪
          </button>
        </div>

        {/* Navigation Tabs */}
        <div className="dashboard-tabs">
          <button 
            className={`tab-btn ${activeSection === 'overview' ? 'active' : ''}`}
            onClick={() => setActiveSection('overview')}
          >
            <span className="tab-icon">📊</span>
            نظرة عامة
          </button>
          <button 
            className={`tab-btn ${activeSection === 'visits' ? 'active' : ''}`}
            onClick={() => setActiveSection('visits')}
          >
            <span className="tab-icon">📋</span>
            سجل الزيارات
          </button>
          <button 
            className={`tab-btn ${activeSection === 'risk' ? 'active' : ''}`}
            onClick={() => setActiveSection('risk')}
          >
            <span className="tab-icon">🤖</span>
            توقع المخاطر الصحية
          </button>
          <button 
            className={`tab-btn ${activeSection === 'medications' ? 'active' : ''}`}
            onClick={() => setActiveSection('medications')}
          >
            <span className="tab-icon">💊</span>
            تقويم الأدوية
          </button>
        </div>

        {/* Overview Section */}
        {activeSection === 'overview' && (
          <div className="section-content">
            {/* Profile Header Card */}
            <div className="profile-header-card">
              <div className="profile-avatar">
                <div className="avatar-circle">
                  <span className="avatar-icon">{user.gender === 'male' ? '👨' : '👩'}</span>
                </div>
                <div className="avatar-badge">
                  <span className="badge-icon">✓</span>
                </div>
              </div>
              <div className="profile-header-info">
                <h1 className="profile-name">{user.firstName} {user.lastName}</h1>
                <p className="profile-role">
                  {user.isMinor ? 'مريض قاصر - Patient 360°' : 'مريض - Patient 360°'}
                </p>
                <div className="profile-meta-info">
                  {age && (
                    <div className="meta-item">
                      <span className="meta-icon">🎂</span>
                      <span className="meta-text">{age} سنة</span>
                    </div>
                  )}
                  {user.gender && (
                    <div className="meta-item">
                      <span className="meta-icon">{user.gender === 'male' ? '♂️' : '♀️'}</span>
                      <span className="meta-text">{user.gender === 'male' ? 'ذكر' : 'أنثى'}</span>
                    </div>
                  )}
                  {patientData.bloodType && (
                    <div className="meta-item">
                      <span className="meta-icon">🩸</span>
                      <span className="meta-text">{patientData.bloodType}</span>
                    </div>
                  )}
                </div>
                <div className="profile-status">
                  <span className="status-indicator active"></span>
                  <span className="status-text">حساب نشط</span>
                </div>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="quick-stats-grid">
              <div className="quick-stat-card visits">
                <div className="stat-icon-wrapper">
                  <span className="stat-icon-large">📋</span>
                </div>
                <div className="stat-content">
                  <h3 className="stat-number">{stats.totalVisits}</h3>
                  <p className="stat-label">زيارة طبية</p>
                </div>
              </div>
              
              <div className="quick-stat-card medications">
                <div className="stat-icon-wrapper">
                  <span className="stat-icon-large">💊</span>
                </div>
                <div className="stat-content">
                  <h3 className="stat-number">{stats.totalMedications}</h3>
                  <p className="stat-label">دواء موصوف</p>
                </div>
              </div>
              
              {bmi && (
                <div className="quick-stat-card bmi">
                  <div className="stat-icon-wrapper">
                    <span className="stat-icon-large">⚖️</span>
                  </div>
                  <div className="stat-content">
                    <h3 className="stat-number">{bmi}</h3>
                    <p className="stat-label">مؤشر كتلة الجسم</p>
                    <span className="stat-badge">{bmiCategory}</span>
                  </div>
                </div>
              )}
              
              {patientData.allergies && patientData.allergies.length > 0 && (
                <div className="quick-stat-card allergies">
                  <div className="stat-icon-wrapper">
                    <span className="stat-icon-large">⚠️</span>
                  </div>
                  <div className="stat-content">
                    <h3 className="stat-number">{patientData.allergies.length}</h3>
                    <p className="stat-label">حساسية مسجلة</p>
                  </div>
                </div>
              )}
            </div>

            {/* Personal Information Section */}
            <div className="data-section">
              <div className="section-header">
                <div className="section-title-wrapper">
                  <span className="section-icon">👤</span>
                  <h2 className="section-title">المعلومات الشخصية</h2>
                </div>
              </div>
              
              <div className="info-cards-grid">
                <div className="info-display-card">
                  <div className="card-icon-header">
                    <div className="icon-circle email">
                      <span>✉️</span>
                    </div>
                    <h3>البريد الإلكتروني</h3>
                  </div>
                  <p className="card-value" dir="ltr">{user.email}</p>
                  <span className="card-subtitle">للتواصل والإشعارات</span>
                </div>

                <div className="info-display-card">
                  <div className="card-icon-header">
                    <div className="icon-circle phone">
                      <span>📱</span>
                    </div>
                    <h3>رقم الهاتف</h3>
                  </div>
                  <p className="card-value" dir="ltr">{user.phoneNumber || 'غير محدد'}</p>
                  <span className="card-subtitle">للاتصال المباشر</span>
                </div>

                {/* ✅ UPDATED: Show nationalId or childId based on isMinor */}
                {user.isMinor ? (
                  <div className="info-display-card">
                    <div className="card-icon-header">
                      <div className="icon-circle id">
                        <span>👶</span>
                      </div>
                      <h3>معرف الطفل</h3>
                    </div>
                    <p className="card-value">{user.childId || 'غير محدد'}</p>
                    <span className="card-subtitle">المعرف الخاص</span>
                  </div>
                ) : (
                  <div className="info-display-card">
                    <div className="card-icon-header">
                      <div className="icon-circle id">
                        <span>🆔</span>
                      </div>
                      <h3>رقم الهوية الوطنية</h3>
                    </div>
                    <p className="card-value">{user.nationalId || 'غير محدد'}</p>
                    <span className="card-subtitle">الرقم الوطني</span>
                  </div>
                )}

                <div className="info-display-card">
                  <div className="card-icon-header">
                    <div className="icon-circle birth">
                      <span>🎂</span>
                    </div>
                    <h3>تاريخ الميلاد</h3>
                  </div>
                  <p className="card-value">{formatDate(user.dateOfBirth)}</p>
                  <span className="card-subtitle">العمر: {age ? age + ' سنة' : 'غير محدد'}</span>
                </div>

                {user.gender && (
                  <div className="info-display-card">
                    <div className="card-icon-header">
                      <div className="icon-circle gender">
                        <span>{user.gender === 'male' ? '👨' : '👩'}</span>
                      </div>
                      <h3>الجنس</h3>
                    </div>
                    <p className="card-value">{user.gender === 'male' ? 'ذكر' : 'أنثى'}</p>
                    <span className="card-subtitle">النوع</span>
                  </div>
                )}

                {user.address && (
                  <div className="info-display-card full-width">
                    <div className="card-icon-header">
                      <div className="icon-circle address">
                        <span>📍</span>
                      </div>
                      <h3>العنوان</h3>
                    </div>
                    <p className="card-value">{user.address}</p>
                    <span className="card-subtitle">محل الإقامة</span>
                  </div>
                )}
              </div>
            </div>

            {/* Medical Information Section */}
            <div className="data-section">
              <div className="section-header">
                <div className="section-title-wrapper">
                  <span className="section-icon">🏥</span>
                  <h2 className="section-title">المعلومات الطبية</h2>
                </div>
              </div>
              
              <div className="medical-info-grid">
                {patientData.bloodType && (
                  <div className="medical-card blood-type">
                    <div className="medical-card-header">
                      <div className="medical-icon">🩸</div>
                      <h3>فصيلة الدم</h3>
                    </div>
                    <div className="medical-value-large">{patientData.bloodType}</div>
                    <div className="medical-footer">مهم في حالات الطوارئ</div>
                  </div>
                )}

                {patientData.height && (
                  <div className="medical-card height">
                    <div className="medical-card-header">
                      <div className="medical-icon">📏</div>
                      <h3>الطول</h3>
                    </div>
                    <div className="medical-value-large">{patientData.height}</div>
                    <div className="medical-unit">سم</div>
                  </div>
                )}

                {patientData.weight && (
                  <div className="medical-card weight">
                    <div className="medical-card-header">
                      <div className="medical-icon">⚖️</div>
                      <h3>الوزن</h3>
                    </div>
                    <div className="medical-value-large">{patientData.weight}</div>
                    <div className="medical-unit">كجم</div>
                  </div>
                )}

                {bmi && (
                  <div className="medical-card bmi-card">
                    <div className="medical-card-header">
                      <div className="medical-icon">📊</div>
                      <h3>مؤشر كتلة الجسم</h3>
                    </div>
                    <div className="medical-value-large">{bmi}</div>
                    <div className="bmi-category-badge">{bmiCategory}</div>
                  </div>
                )}

                {patientData.smokingStatus && (
                  <div className="medical-card smoking">
                    <div className="medical-card-header">
                      <div className="medical-icon">🚭</div>
                      <h3>حالة التدخين</h3>
                    </div>
                    <div className="smoking-status">
                      {patientData.smokingStatus === 'non-smoker' && 'غير مدخن'}
                      {patientData.smokingStatus === 'former smoker' && 'مدخن سابق'}
                      {patientData.smokingStatus === 'current smoker' && 'مدخن حالي'}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Health History Section */}
            {(patientData.allergies?.length > 0 || 
              patientData.chronicDiseases?.length > 0 || 
              patientData.familyHistory?.length > 0) && (
              <div className="data-section">
                <div className="section-header">
                  <div className="section-title-wrapper">
                    <span className="section-icon">📜</span>
                    <h2 className="section-title">السجل الصحي</h2>
                  </div>
                </div>
                
                <div className="health-history-grid">
                  {patientData.allergies?.length > 0 && (
                    <div className="history-card allergies-card">
                      <div className="history-header">
                        <div className="history-icon">⚠️</div>
                        <h3>الحساسية</h3>
                        <span className="count-badge">{patientData.allergies.length}</span>
                      </div>
                      <ul className="history-list">
                        {patientData.allergies.map((allergy, index) => (
                          <li key={index} className="history-item">
                            <span className="item-bullet">•</span>
                            <span className="item-text">{allergy}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {patientData.chronicDiseases?.length > 0 && (
                    <div className="history-card diseases-card">
                      <div className="history-header">
                        <div className="history-icon">🏥</div>
                        <h3>الأمراض المزمنة</h3>
                        <span className="count-badge">{patientData.chronicDiseases.length}</span>
                      </div>
                      <ul className="history-list">
                        {patientData.chronicDiseases.map((disease, index) => (
                          <li key={index} className="history-item">
                            <span className="item-bullet">•</span>
                            <span className="item-text">{disease}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}

                  {patientData.familyHistory?.length > 0 && (
                    <div className="history-card family-card">
                      <div className="history-header">
                        <div className="history-icon">👨‍👩‍👧‍👦</div>
                        <h3>التاريخ العائلي المرضي</h3>
                        <span className="count-badge">{patientData.familyHistory.length}</span>
                      </div>
                      <ul className="history-list">
                        {patientData.familyHistory.map((history, index) => (
                          <li key={index} className="history-item">
                            <span className="item-bullet">•</span>
                            <span className="item-text">{history}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Emergency Contact Section */}
            {patientData.emergencyContact && (
              <div className="data-section">
                <div className="section-header">
                  <div className="section-title-wrapper">
                    <span className="section-icon">🚨</span>
                    <h2 className="section-title">جهة الاتصال في حالات الطوارئ</h2>
                  </div>
                </div>
                
                <div className="emergency-contact-card">
                  <div className="emergency-header">
                    <div className="emergency-icon-large">📞</div>
                    <div className="emergency-info">
                      <h3 className="emergency-name">{patientData.emergencyContact.name}</h3>
                      <p className="emergency-relationship">{patientData.emergencyContact.relationship}</p>
                    </div>
                  </div>
                  <div className="emergency-phone">
                    <span className="phone-icon">📱</span>
                    <span className="phone-number" dir="ltr">{patientData.emergencyContact.phoneNumber}</span>
                  </div>
                  <div className="emergency-note">
                    <span className="note-icon">ℹ️</span>
                    <span className="note-text">سيتم التواصل مع هذا الشخص في حالات الطوارئ الطبية</span>
                  </div>
                </div>
              </div>
            )}

            {/* Welcome Message Card */}
            <div className="welcome-message-card">
              <div className="message-icon">💚</div>
              <div className="message-content">
                <h3>مرحباً بك في Patient 360°</h3>
                <p>
                  نحن سعداء بوجودك معنا يا {user.firstName}. تم تسجيل جميع بياناتك بنجاح في النظام،
                  ويمكنك الآن الاستفادة من جميع خدماتنا الطبية المتقدمة.
                </p>
                <p>
                  للوصول إلى سجل زياراتك الطبية ومتابعة أدويتك، استخدم التبويبات في الأعلى.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Other sections remain the same... */}
        {/* Visits, Risk, Medications sections */}
        
        {activeSection === 'visits' && (
          <div className="section-content">
            <div className="card">
              <div className="card-header">
                <h2>سجل الزيارات الطبية</h2>
                <p className="card-subtitle">لم يتم تسجيل أي زيارات طبية بعد</p>
              </div>
              <div className="empty-state">
                <div className="empty-icon">📋</div>
                <h3>لا توجد زيارات</h3>
                <p>سيتم عرض زياراتك الطبية هنا بعد مراجعة الطبيب</p>
              </div>
            </div>
          </div>
        )}

        {activeSection === 'risk' && (
          <div className="section-content">
            <div className="card risk-card">
              <div className="card-header">
                <h2>🤖 توقع المخاطر الصحية بالذكاء الاصطناعي</h2>
                <p className="card-subtitle">قيد التطوير - سيتم التفعيل قريباً</p>
              </div>
              <div className="empty-state">
                <div className="empty-icon">🤖</div>
                <h3>قيد التطوير</h3>
                <p>سيتم إضافة نموذج الذكاء الاصطناعي قريباً لتوقع المخاطر الصحية</p>
              </div>
            </div>
          </div>
        )}

        {activeSection === 'medications' && (
          <div className="section-content">
            <div className="card">
              <div className="card-header">
                <h2>💊 تقويم الأدوية</h2>
                <p className="card-subtitle">لم يتم وصف أي أدوية بعد</p>
              </div>
              <div className="empty-state">
                <div className="empty-icon">💊</div>
                <h3>لا توجد أدوية</h3>
                <p>سيتم عرض الأدوية الموصوفة هنا بعد زيارة الطبيب</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

/**
 * Visit Details Modal Component
 */
const VisitDetailsModal = ({ visit, isOpen, onClose, formatDate }) => {
  if (!isOpen || !visit) return null;

  return (
    <div className="visit-details-modal-overlay" onClick={onClose}>
      <div className="visit-details-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header-visit">
          <div className="header-content">
            <h2>📋 تفاصيل الزيارة الطبية</h2>
            <p className="visit-date-header">{formatDate(visit.visitDate)} - {visit.visitTime}</p>
          </div>
          <button className="close-btn-visit" onClick={onClose}>✕</button>
        </div>

        <div className="modal-body-visit">
          <div className="detail-card">
            <div className="card-header-detail">
              <span className="card-icon">👨‍⚕️</span>
              <h3>معلومات الزيارة</h3>
            </div>
            <div className="info-grid">
              <div className="info-item">
                <span className="info-label">الطبيب:</span>
                <span className="info-value">{visit.doctorName}</span>
              </div>
              <div className="info-item">
                <span className="info-label">التشخيص:</span>
                <span className="info-value">{visit.diagnosis}</span>
              </div>
            </div>
          </div>
        </div>

        <div className="modal-footer-visit">
          <button className="close-button-visit" onClick={onClose}>
            إغلاق
          </button>
        </div>
      </div>
    </div>
  );
};

export default PatientDashboard;
