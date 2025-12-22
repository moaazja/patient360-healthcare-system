// src/pages/PatientDashboard.jsx
// ✅ FINAL VERSION - Uses Backend API with MongoDB - FULLY ENHANCED
// ✅ NEW: AI Medical Consultation "استشيرني" Section

import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/common/Navbar';
import { authAPI } from '../services/api';
import '../styles/PatientDashboard.css';

/**
 * PatientDashboard Component - FINAL ENHANCED VERSION
 * 
 * ✅ Uses Backend API (MongoDB)
 * ✅ Supports minors (childId, parentNationalId)
 * ✅ Real patient data from database
 * ✅ JWT authentication
 * ✅ All signup data displayed (address, blood type, allergies, diseases, family history)
 * ✅ NEW: AI Medical Consultation "استشيرني" - Symptom-based doctor specialty recommendations
 * ✅ No unused variables
 * 
 * @component
 * @author Patient 360° Development Team
 * @version 2.0.0
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
  
  // Visits data
  const [visits, setVisits] = useState([]);
  
  // Active section state
  const [activeSection, setActiveSection] = useState('overview');

  // ========================================
  // AI CONSULTATION STATE - "استشيرني"
  // ========================================
  const [consultationMessages, setConsultationMessages] = useState([
    {
      id: 1,
      type: 'bot',
      text: 'مرحباً بك في خدمة الاستشارة الطبية الذكية! 👋\n\nأنا هنا لمساعدتك في تحديد التخصص الطبي المناسب لحالتك.\n\nيرجى وصف الأعراض التي تشعر بها بالتفصيل، وسأقوم بتوجيهك للتخصص الطبي المناسب.',
      timestamp: new Date()
    }
  ]);
  const [userInput, setUserInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef(null);

  // Medical specialties mapping for AI consultation
  const medicalSpecialties = {
    // Dental
    dental: {
      keywords: ['أسنان', 'سن', 'ضرس', 'لثة', 'فم', 'teeth', 'tooth', 'dental', 'gum', 'mouth', 'أضراس', 'تسوس', 'خلع', 'حشو', 'تقويم'],
      specialty: 'طب الأسنان',
      icon: '🦷',
      description: 'يختص بعلاج جميع مشاكل الأسنان واللثة والفم'
    },
    // Cardiology
    cardiology: {
      keywords: ['قلب', 'صدر', 'ضربات', 'نبض', 'heart', 'chest', 'cardiac', 'خفقان', 'ضغط', 'شرايين', 'أوعية', 'كولسترول'],
      specialty: 'أمراض القلب والأوعية الدموية',
      icon: '❤️',
      description: 'يختص بتشخيص وعلاج أمراض القلب والأوعية الدموية'
    },
    // Dermatology
    dermatology: {
      keywords: ['جلد', 'بشرة', 'حكة', 'طفح', 'skin', 'rash', 'itch', 'شعر', 'أظافر', 'حبوب', 'أكزيما', 'صدفية', 'حروق'],
      specialty: 'الأمراض الجلدية',
      icon: '🧴',
      description: 'يختص بعلاج أمراض الجلد والشعر والأظافر'
    },
    // Ophthalmology
    ophthalmology: {
      keywords: ['عين', 'نظر', 'رؤية', 'eye', 'vision', 'sight', 'عيون', 'إبصار', 'نظارة', 'عدسات', 'ماء أبيض', 'ماء أزرق'],
      specialty: 'طب العيون',
      icon: '👁️',
      description: 'يختص بتشخيص وعلاج أمراض العين ومشاكل النظر'
    },
    // ENT
    ent: {
      keywords: ['أذن', 'أنف', 'حنجرة', 'سمع', 'ear', 'nose', 'throat', 'hearing', 'صوت', 'بلعوم', 'لوزتين', 'جيوب أنفية', 'دوخة', 'طنين'],
      specialty: 'أنف وأذن وحنجرة',
      icon: '👂',
      description: 'يختص بعلاج أمراض الأذن والأنف والحنجرة'
    },
    // Orthopedics
    orthopedics: {
      keywords: ['عظام', 'مفاصل', 'ظهر', 'عمود فقري', 'bone', 'joint', 'spine', 'back', 'ركبة', 'كتف', 'كسر', 'خلع', 'غضروف', 'روماتيزم'],
      specialty: 'جراحة العظام والمفاصل',
      icon: '🦴',
      description: 'يختص بعلاج أمراض العظام والمفاصل والعمود الفقري'
    },
    // Neurology
    neurology: {
      keywords: ['صداع', 'أعصاب', 'دماغ', 'تنميل', 'headache', 'nerve', 'brain', 'numbness', 'شلل', 'رعشة', 'صرع', 'ذاكرة', 'توازن'],
      specialty: 'الأمراض العصبية',
      icon: '🧠',
      description: 'يختص بتشخيص وعلاج أمراض الجهاز العصبي والدماغ'
    },
    // Gastroenterology
    gastroenterology: {
      keywords: ['معدة', 'بطن', 'هضم', 'أمعاء', 'stomach', 'abdomen', 'digestion', 'intestine', 'قولون', 'كبد', 'إسهال', 'إمساك', 'غثيان', 'قيء', 'حموضة'],
      specialty: 'أمراض الجهاز الهضمي',
      icon: '🫁',
      description: 'يختص بعلاج أمراض المعدة والأمعاء والكبد'
    },
    // Urology
    urology: {
      keywords: ['كلى', 'مسالك', 'بول', 'مثانة', 'kidney', 'urinary', 'bladder', 'urine', 'بروستاتا', 'حصوات'],
      specialty: 'المسالك البولية',
      icon: '💧',
      description: 'يختص بعلاج أمراض الكلى والمسالك البولية'
    },
    // Pulmonology
    pulmonology: {
      keywords: ['رئة', 'تنفس', 'سعال', 'كحة', 'lung', 'breathing', 'cough', 'respiratory', 'ضيق تنفس', 'ربو', 'حساسية صدر'],
      specialty: 'أمراض الصدر والجهاز التنفسي',
      icon: '🌬️',
      description: 'يختص بعلاج أمراض الرئة والجهاز التنفسي'
    },
    // Endocrinology
    endocrinology: {
      keywords: ['سكري', 'غدة', 'هرمون', 'درقية', 'diabetes', 'thyroid', 'hormone', 'gland', 'سمنة', 'نحافة'],
      specialty: 'الغدد الصماء والسكري',
      icon: '⚗️',
      description: 'يختص بعلاج أمراض الغدد والسكري والهرمونات'
    },
    // Psychiatry
    psychiatry: {
      keywords: ['اكتئاب', 'قلق', 'نفسي', 'توتر', 'depression', 'anxiety', 'mental', 'stress', 'أرق', 'نوم', 'وسواس', 'هلع', 'فوبيا'],
      specialty: 'الطب النفسي',
      icon: '🧘',
      description: 'يختص بعلاج الاضطرابات النفسية والعقلية'
    },
    // Pediatrics
    pediatrics: {
      keywords: ['طفل', 'أطفال', 'رضيع', 'حديث ولادة', 'child', 'baby', 'infant', 'pediatric', 'تطعيم', 'نمو'],
      specialty: 'طب الأطفال',
      icon: '👶',
      description: 'يختص بعلاج أمراض الأطفال من الولادة حتى البلوغ'
    },
    // Gynecology
    gynecology: {
      keywords: ['نسائي', 'رحم', 'مبيض', 'حمل', 'دورة', 'gynecology', 'pregnancy', 'menstrual', 'uterus', 'ولادة', 'هرمونات أنثوية'],
      specialty: 'أمراض النساء والتوليد',
      icon: '🤰',
      description: 'يختص بصحة المرأة والحمل والولادة'
    },
    // Allergy
    allergy: {
      keywords: ['حساسية', 'تحسس', 'allergy', 'allergic', 'عطس', 'حكة', 'تورم', 'صدمة تحسسية'],
      specialty: 'أمراض الحساسية والمناعة',
      icon: '🤧',
      description: 'يختص بتشخيص وعلاج أمراض الحساسية والمناعة'
    },
    // General
    general: {
      keywords: ['حرارة', 'حمى', 'إرهاق', 'تعب', 'fever', 'fatigue', 'tired', 'عام', 'فحص', 'checkup'],
      specialty: 'الطب العام / الباطني',
      icon: '🩺',
      description: 'يختص بالفحص الشامل والتشخيص الأولي للحالات المختلفة'
    }
  };

  /**
   * Analyzes user symptoms and returns appropriate medical specialty
   * @param {string} text - User's symptom description
   * @returns {Object} - Matched specialty information
   */
  const analyzeSymptoms = (text) => {
    const lowerText = text.toLowerCase();
    let matchedSpecialties = [];
    let maxScore = 0;

    // Check each specialty for keyword matches
    Object.entries(medicalSpecialties).forEach(([key, specialty]) => {
      let score = 0;
      specialty.keywords.forEach(keyword => {
        if (lowerText.includes(keyword.toLowerCase())) {
          score += 1;
        }
      });

      if (score > 0) {
        matchedSpecialties.push({ ...specialty, key, score });
      }

      if (score > maxScore) {
        maxScore = score;
      }
    });

    // Sort by score and return top matches
    matchedSpecialties.sort((a, b) => b.score - a.score);

    if (matchedSpecialties.length === 0) {
      return {
        found: false,
        message: 'لم أتمكن من تحديد التخصص المناسب بناءً على الأعراض المذكورة.\n\nيرجى وصف الأعراض بمزيد من التفصيل، أو يمكنك زيارة طبيب عام للفحص الأولي والتوجيه للتخصص المناسب.'
      };
    }

    return {
      found: true,
      primary: matchedSpecialties[0],
      alternatives: matchedSpecialties.slice(1, 3)
    };
  };

  /**
   * Generates AI response based on symptom analysis
   * @param {string} userMessage - User's message
   * @returns {string} - Bot response
   */
  const generateConsultationResponse = (userMessage) => {
    const analysis = analyzeSymptoms(userMessage);

    if (!analysis.found) {
      return analysis.message;
    }

    let response = `بناءً على الأعراض التي وصفتها، أنصحك بزيارة:\n\n`;
    response += `${analysis.primary.icon} **${analysis.primary.specialty}**\n`;
    response += `📋 ${analysis.primary.description}\n\n`;

    if (analysis.alternatives && analysis.alternatives.length > 0) {
      response += `💡 تخصصات أخرى قد تكون مفيدة:\n`;
      analysis.alternatives.forEach(alt => {
        response += `• ${alt.icon} ${alt.specialty}\n`;
      });
      response += '\n';
    }

    response += `⚠️ **تنبيه هام:**\nهذه التوصية استرشادية فقط ولا تغني عن الاستشارة الطبية المباشرة. في حالة الأعراض الشديدة أو الطوارئ، يرجى التوجه لأقرب مستشفى فوراً.`;

    return response;
  };

  /**
   * Handles sending consultation message
   */
  const handleSendMessage = () => {
    if (!userInput.trim()) return;

    const newUserMessage = {
      id: consultationMessages.length + 1,
      type: 'user',
      text: userInput.trim(),
      timestamp: new Date()
    };

    setConsultationMessages(prev => [...prev, newUserMessage]);
    setUserInput('');
    setIsTyping(true);

    // Simulate AI thinking delay
    setTimeout(() => {
      const botResponse = generateConsultationResponse(newUserMessage.text);
      const newBotMessage = {
        id: consultationMessages.length + 2,
        type: 'bot',
        text: botResponse,
        timestamp: new Date()
      };

      setConsultationMessages(prev => [...prev, newBotMessage]);
      setIsTyping(false);
    }, 1500);
  };

  /**
   * Handles Enter key press in chat input
   */
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  /**
   * Resets consultation chat
   */
  const resetConsultation = () => {
    setConsultationMessages([
      {
        id: 1,
        type: 'bot',
        text: 'مرحباً بك في خدمة الاستشارة الطبية الذكية! 👋\n\nأنا هنا لمساعدتك في تحديد التخصص الطبي المناسب لحالتك.\n\nيرجى وصف الأعراض التي تشعر بها بالتفصيل، وسأقوم بتوجيهك للتخصص الطبي المناسب.',
        timestamp: new Date()
      }
    ]);
  };

  // Auto-scroll to bottom of chat
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [consultationMessages]);

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
      const realVisits = [];
      setVisits(realVisits);
      
      setLoading(false);
    };
    
    loadPatientData();
  }, [navigate]);

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
   * Gets BMI category class for styling
   */
  const getBMICategoryClass = (bmi) => {
    if (!bmi) return '';
    if (bmi < 18.5) return 'underweight';
    if (bmi < 25) return 'normal';
    if (bmi < 30) return 'overweight';
    return 'obese';
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
  const bmiCategoryClass = getBMICategoryClass(parseFloat(bmi));

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
            className={`tab-btn ${activeSection === 'consultation' ? 'active' : ''}`}
            onClick={() => setActiveSection('consultation')}
          >
            <span className="tab-icon">🤖</span>
            استشيرني
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
                <div className={`quick-stat-card bmi ${bmiCategoryClass}`}>
                  <div className="stat-icon-wrapper">
                    <span className="stat-icon-large">⚖️</span>
                  </div>
                  <div className="stat-content">
                    <h3 className="stat-number">{bmi}</h3>
                    <p className="stat-label">مؤشر كتلة الجسم</p>
                    <span className={`stat-badge ${bmiCategoryClass}`}>{bmiCategory}</span>
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

                {/* ✅ NEW: Address Field - Always show if available */}
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
                  <div className={`medical-card bmi-card ${bmiCategoryClass}`}>
                    <div className="medical-card-header">
                      <div className="medical-icon">📊</div>
                      <h3>مؤشر كتلة الجسم</h3>
                    </div>
                    <div className="medical-value-large">{bmi}</div>
                    <div className={`bmi-category-badge ${bmiCategoryClass}`}>{bmiCategory}</div>
                  </div>
                )}

                {patientData.smokingStatus && (
                  <div className="medical-card smoking">
                    <div className="medical-card-header">
                      <div className="medical-icon">🚭</div>
                      <h3>حالة التدخين</h3>
                    </div>
                    <div className="smoking-status">
                      {patientData.smokingStatus === 'non-smoker' && 'غير مدخن ✅'}
                      {patientData.smokingStatus === 'former smoker' && 'مدخن سابق ⚠️'}
                      {patientData.smokingStatus === 'current smoker' && 'مدخن حالي 🚬'}
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* ✅ ENHANCED: Health History Section - Now always visible if any data exists */}
            <div className="data-section">
              <div className="section-header">
                <div className="section-title-wrapper">
                  <span className="section-icon">📜</span>
                  <h2 className="section-title">السجل الصحي</h2>
                </div>
              </div>
              
              <div className="health-history-grid">
                {/* Allergies Card */}
                <div className="history-card allergies-card">
                  <div className="history-header">
                    <div className="history-icon">⚠️</div>
                    <h3>الحساسية</h3>
                    <span className="count-badge">
                      {patientData.allergies?.length || 0}
                    </span>
                  </div>
                  {patientData.allergies && patientData.allergies.length > 0 ? (
                    <ul className="history-list">
                      {patientData.allergies.map((allergy, index) => (
                        <li key={index} className="history-item">
                          <span className="item-bullet">•</span>
                          <span className="item-text">{allergy}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="no-data-message">
                      <span className="no-data-icon">✓</span>
                      <p>لا توجد حساسية مسجلة</p>
                    </div>
                  )}
                </div>

                {/* Chronic Diseases Card */}
                <div className="history-card diseases-card">
                  <div className="history-header">
                    <div className="history-icon">🏥</div>
                    <h3>الأمراض المزمنة</h3>
                    <span className="count-badge">
                      {patientData.chronicDiseases?.length || 0}
                    </span>
                  </div>
                  {patientData.chronicDiseases && patientData.chronicDiseases.length > 0 ? (
                    <ul className="history-list">
                      {patientData.chronicDiseases.map((disease, index) => (
                        <li key={index} className="history-item">
                          <span className="item-bullet">•</span>
                          <span className="item-text">{disease}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="no-data-message">
                      <span className="no-data-icon">✓</span>
                      <p>لا توجد أمراض مزمنة مسجلة</p>
                    </div>
                  )}
                </div>

                {/* Family History Card */}
                <div className="history-card family-card">
                  <div className="history-header">
                    <div className="history-icon">👨‍👩‍👧‍👦</div>
                    <h3>التاريخ العائلي المرضي</h3>
                    <span className="count-badge">
                      {patientData.familyHistory?.length || 0}
                    </span>
                  </div>
                  {patientData.familyHistory && patientData.familyHistory.length > 0 ? (
                    <ul className="history-list">
                      {patientData.familyHistory.map((history, index) => (
                        <li key={index} className="history-item">
                          <span className="item-bullet">•</span>
                          <span className="item-text">{history}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="no-data-message">
                      <span className="no-data-icon">✓</span>
                      <p>لا يوجد تاريخ عائلي مرضي مسجل</p>
                    </div>
                  )}
                </div>
              </div>
            </div>

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
                  يمكنك أيضاً استخدام خدمة <strong>"استشيرني"</strong> للحصول على توصيات حول التخصص الطبي المناسب.
                </p>
              </div>
            </div>
          </div>
        )}

        {/* Visits Section */}
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

        {/* ✅ NEW: AI Consultation Section - "استشيرني" */}
        {activeSection === 'consultation' && (
          <div className="section-content">
            <div className="consultation-container">
              {/* Consultation Header */}
              <div className="consultation-header">
                <div className="consultation-title-wrapper">
                  <span className="consultation-icon">🤖</span>
                  <div className="consultation-title-content">
                    <h2>استشيرني - المساعد الطبي الذكي</h2>
                    <p>صف لي أعراضك وسأساعدك في تحديد التخصص الطبي المناسب</p>
                  </div>
                </div>
                <button className="reset-chat-btn" onClick={resetConsultation}>
                  <span>🔄</span>
                  محادثة جديدة
                </button>
              </div>

              {/* Disclaimer Banner */}
              <div className="consultation-disclaimer">
                <span className="disclaimer-icon">⚠️</span>
                <p>
                  <strong>تنويه هام:</strong> هذه الخدمة استرشادية فقط ولا تغني عن الاستشارة الطبية المباشرة. 
                  في حالة الأعراض الشديدة أو الطوارئ، يرجى التوجه لأقرب مستشفى فوراً.
                </p>
              </div>

              {/* Chat Container */}
              <div className="chat-container">
                <div className="chat-messages">
                  {consultationMessages.map((message) => (
                    <div 
                      key={message.id} 
                      className={`chat-message ${message.type}`}
                    >
                      {message.type === 'bot' && (
                        <div className="message-avatar bot-avatar">
                          <span>🤖</span>
                        </div>
                      )}
                      <div className="message-content">
                        <div className="message-bubble">
                          {message.text.split('\n').map((line, index) => (
                            <React.Fragment key={index}>
                              {line.startsWith('**') && line.endsWith('**') ? (
                                <strong>{line.replace(/\*\*/g, '')}</strong>
                              ) : line.startsWith('•') ? (
                                <span className="bullet-point">{line}</span>
                              ) : (
                                line
                              )}
                              {index < message.text.split('\n').length - 1 && <br />}
                            </React.Fragment>
                          ))}
                        </div>
                        <span className="message-time">
                          {message.timestamp.toLocaleTimeString('ar-EG', { 
                            hour: '2-digit', 
                            minute: '2-digit' 
                          })}
                        </span>
                      </div>
                      {message.type === 'user' && (
                        <div className="message-avatar user-avatar">
                          <span>{user.gender === 'male' ? '👨' : '👩'}</span>
                        </div>
                      )}
                    </div>
                  ))}
                  
                  {/* Typing Indicator */}
                  {isTyping && (
                    <div className="chat-message bot">
                      <div className="message-avatar bot-avatar">
                        <span>🤖</span>
                      </div>
                      <div className="message-content">
                        <div className="typing-indicator">
                          <span></span>
                          <span></span>
                          <span></span>
                        </div>
                      </div>
                    </div>
                  )}
                  
                  <div ref={chatEndRef} />
                </div>

                {/* Chat Input */}
                <div className="chat-input-container">
                  <div className="chat-input-wrapper">
                    <textarea
                      className="chat-input"
                      placeholder="اكتب الأعراض التي تشعر بها هنا... (مثال: أشعر بألم في أسناني)"
                      value={userInput}
                      onChange={(e) => setUserInput(e.target.value)}
                      onKeyPress={handleKeyPress}
                      rows={1}
                      disabled={isTyping}
                    />
                    <button 
                      className="send-message-btn"
                      onClick={handleSendMessage}
                      disabled={!userInput.trim() || isTyping}
                    >
                      <span>إرسال</span>
                      <span className="send-icon">📤</span>
                    </button>
                  </div>
                  <p className="input-hint">
                    اضغط Enter للإرسال أو Shift+Enter لسطر جديد
                  </p>
                </div>
              </div>

              {/* Quick Symptom Suggestions */}
              <div className="quick-symptoms">
                <h4>أمثلة على الأعراض:</h4>
                <div className="symptom-tags">
                  <button 
                    className="symptom-tag"
                    onClick={() => setUserInput('أشعر بألم شديد في أسناني')}
                  >
                    🦷 ألم في الأسنان
                  </button>
                  <button 
                    className="symptom-tag"
                    onClick={() => setUserInput('لدي صداع شديد ودوخة')}
                  >
                    🧠 صداع ودوخة
                  </button>
                  <button 
                    className="symptom-tag"
                    onClick={() => setUserInput('أعاني من ألم في المعدة وغثيان')}
                  >
                    🫁 ألم المعدة
                  </button>
                  <button 
                    className="symptom-tag"
                    onClick={() => setUserInput('لدي طفح جلدي وحكة')}
                  >
                    🧴 مشاكل جلدية
                  </button>
                  <button 
                    className="symptom-tag"
                    onClick={() => setUserInput('أشعر بضيق في التنفس وألم في الصدر')}
                  >
                    ❤️ مشاكل القلب
                  </button>
                  <button 
                    className="symptom-tag"
                    onClick={() => setUserInput('أعاني من ألم في المفاصل والظهر')}
                  >
                    🦴 ألم العظام
                  </button>
                </div>
              </div>

              {/* Available Specialties Info */}
              <div className="specialties-info">
                <h4>التخصصات المتاحة:</h4>
                <div className="specialties-grid">
                  {Object.values(medicalSpecialties).slice(0, 8).map((spec, index) => (
                    <div key={index} className="specialty-chip">
                      <span className="specialty-icon">{spec.icon}</span>
                      <span className="specialty-name">{spec.specialty}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Medications Section */}
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