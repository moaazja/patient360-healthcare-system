// src/pages/PatientDashboard.jsx
// ✅ AI Medical Consultation "استشيرني" - CONNECTED TO BACKEND

import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/common/Navbar';
import { authAPI } from '../services/api';
import '../styles/PatientDashboard.css';

/**
 * AI SERVICE CONFIG - NOW CONNECTED TO BACKEND! ✅
 */
const AI_SERVICE_CONFIG = {
  isEnabled: true,  // ✅ CHANGED TO TRUE
  apiEndpoint: '/api/patient/ai-symptom-analysis',  // ✅ REAL BACKEND ENDPOINT
  timeout: 30000
};

/**
 * MAP AI RESPONSE TO SPECIALIZATIONS
 */
const SPECIALIZATION_MAPPING = {
  // Your AI model returns these specialist names:
  'Cardiologist': 'cardiologist',
  'Pulmonologist': 'pulmonologist',
  'General Practitioner': 'general_practitioner',
  'Infectious Disease Specialist': 'infectious_disease',
  'Intensive Care Specialist': 'intensive_care',
  'Rheumatologist': 'rheumatologist',
  'Orthopedic Surgeon': 'orthopedic_surgeon',
  'Neurologist': 'neurologist',
  'Endocrinologist': 'endocrinologist',
  'Dermatologist': 'dermatologist',
  'Gastroenterologist': 'gastroenterologist',
  'General Surgeon': 'general_surgeon',
  'Hepatologist': 'hepatologist',
  'Urologist': 'urologist',
  'Gynecologist': 'gynecologist',
  'Psychiatrist': 'psychiatrist',
  'Hematologist': 'hematologist',
  'Hematologist/Oncologist': 'hematologist_oncologist',
  'ENT Specialist': 'ent_specialist',
  'Ophthalmologist': 'ophthalmologist'
};

/**
 * ALL 20 MEDICAL SPECIALIZATIONS
 */
const MEDICAL_SPECIALIZATIONS = [
  { id: 'cardiologist', nameEn: 'Cardiologist', nameAr: 'طبيب قلب', icon: '❤️', color: '#ef4444', description: 'متخصص في تشخيص وعلاج أمراض القلب والأوعية الدموية' },
  { id: 'pulmonologist', nameEn: 'Pulmonologist', nameAr: 'طبيب أمراض الرئة', icon: '🫁', color: '#3b82f6', description: 'متخصص في أمراض الجهاز التنفسي والرئتين' },
  { id: 'general_practitioner', nameEn: 'General Practitioner', nameAr: 'طبيب عام', icon: '🩺', color: '#10b981', description: 'طبيب للفحص الشامل والتشخيص الأولي' },
  { id: 'infectious_disease', nameEn: 'Infectious Disease Specialist', nameAr: 'طبيب أمراض معدية', icon: '🦠', color: '#f59e0b', description: 'متخصص في الأمراض المعدية والعدوى' },
  { id: 'intensive_care', nameEn: 'Intensive Care Specialist', nameAr: 'طبيب عناية مركزة', icon: '🏥', color: '#dc2626', description: 'متخصص في رعاية الحالات الحرجة' },
  { id: 'rheumatologist', nameEn: 'Rheumatologist', nameAr: 'طبيب روماتيزم', icon: '🦴', color: '#8b5cf6', description: 'متخصص في أمراض المفاصل والروماتيزم' },
  { id: 'orthopedic_surgeon', nameEn: 'Orthopedic Surgeon', nameAr: 'جراح عظام', icon: '🦿', color: '#6366f1', description: 'متخصص في جراحة العظام والمفاصل' },
  { id: 'neurologist', nameEn: 'Neurologist', nameAr: 'طبيب أعصاب', icon: '🧠', color: '#ec4899', description: 'متخصص في أمراض الجهاز العصبي' },
  { id: 'endocrinologist', nameEn: 'Endocrinologist', nameAr: 'طبيب غدد صماء', icon: '⚗️', color: '#14b8a6', description: 'متخصص في أمراض الغدد والهرمونات' },
  { id: 'dermatologist', nameEn: 'Dermatologist', nameAr: 'طبيب جلدية', icon: '🧴', color: '#f97316', description: 'متخصص في أمراض الجلد والشعر' },
  { id: 'gastroenterologist', nameEn: 'Gastroenterologist', nameAr: 'طبيب جهاز هضمي', icon: '🫃', color: '#eab308', description: 'متخصص في أمراض الجهاز الهضمي' },
  { id: 'general_surgeon', nameEn: 'General Surgeon', nameAr: 'جراح عام', icon: '🔪', color: '#64748b', description: 'متخصص في العمليات الجراحية العامة' },
  { id: 'hepatologist', nameEn: 'Hepatologist', nameAr: 'طبيب كبد', icon: '🫀', color: '#a855f7', description: 'متخصص في أمراض الكبد والمرارة' },
  { id: 'urologist', nameEn: 'Urologist', nameAr: 'طبيب مسالك بولية', icon: '💧', color: '#0ea5e9', description: 'متخصص في أمراض الكلى والمسالك البولية' },
  { id: 'gynecologist', nameEn: 'Gynecologist', nameAr: 'طبيب نساء وتوليد', icon: '🤰', color: '#db2777', description: 'متخصص في صحة المرأة والحمل والولادة' },
  { id: 'psychiatrist', nameEn: 'Psychiatrist', nameAr: 'طبيب نفسي', icon: '🧘', color: '#7c3aed', description: 'متخصص في الصحة النفسية' },
  { id: 'hematologist', nameEn: 'Hematologist', nameAr: 'طبيب دم', icon: '🩸', color: '#be123c', description: 'متخصص في أمراض الدم' },
  { id: 'hematologist_oncologist', nameEn: 'Hematologist/Oncologist', nameAr: 'طبيب دم/أورام', icon: '🎗️', color: '#9333ea', description: 'متخصص في أمراض الدم والأورام' },
  { id: 'ent_specialist', nameEn: 'ENT Specialist', nameAr: 'طبيب أنف أذن حنجرة', icon: '👂', color: '#059669', description: 'متخصص في أمراض الأذن والأنف والحنجرة' },
  { id: 'ophthalmologist', nameEn: 'Ophthalmologist', nameAr: 'طبيب عيون', icon: '👁️', color: '#0284c7', description: 'متخصص في أمراض العيون' }
];

const consultationAPI = {
  analyzeSymptoms: async (symptoms) => {
    if (!AI_SERVICE_CONFIG.isEnabled) throw new Error('AI_SERVICE_NOT_ENABLED');
    
    const token = localStorage.getItem('token');
    const response = await fetch(`http://localhost:5000${AI_SERVICE_CONFIG.apiEndpoint}`, {
      method: 'POST',
      headers: { 
        'Content-Type': 'application/json', 
        'Authorization': `Bearer ${token}` 
      },
      body: JSON.stringify({ symptoms }),
      signal: AbortSignal.timeout(AI_SERVICE_CONFIG.timeout)
    });
    
    if (!response.ok) throw new Error(`API_ERROR_${response.status}`);
    return await response.json();
  },
  
  getSpecializationByName: (specialistName) => {
    // Map AI specialist name to our specialization ID
    const specializationId = SPECIALIZATION_MAPPING[specialistName];
    if (!specializationId) return null;
    
    return MEDICAL_SPECIALIZATIONS.find(s => s.id === specializationId) || null;
  }
};

const PatientDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState({ isOpen: false, type: '', title: '', message: '', onConfirm: null });
  const [visits, setVisits] = useState([]);
const [loadingVisits, setLoadingVisits] = useState(false);
const [selectedVisit, setSelectedVisit] = useState(null);
const [showVisitDetails, setShowVisitDetails] = useState(false);
  const [activeSection, setActiveSection] = useState('overview');
  const [symptoms, setSymptoms] = useState('');
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [consultationResult, setConsultationResult] = useState(null);
  const [consultationError, setConsultationError] = useState(null);
  const resultRef = useRef(null);

  const handleAnalyzeSymptoms = async () => {
    if (!symptoms.trim()) { 
      setConsultationError('Please enter your symptoms'); 
      return; 
    }
    
    if (!AI_SERVICE_CONFIG.isEnabled) { 
      setConsultationError('SERVICE_NOT_AVAILABLE'); 
      return; 
    }
    
    setIsAnalyzing(true); 
    setConsultationError(null); 
    setConsultationResult(null);
    
    try {
      console.log('📝 Analyzing symptoms:', symptoms);
      
      const response = await consultationAPI.analyzeSymptoms(symptoms);
      
      console.log('✅ AI Response:', response);
      
      if (response.success && response.data) {
        // AI returns: { disease, organ_system, specialist }
        const specialistName = response.data.specialist;
        
        console.log('🔍 Looking for specialist:', specialistName);
        
        const spec = consultationAPI.getSpecializationByName(specialistName);
        
        if (spec) {
          console.log('✅ Found specialization:', spec);
          
          setConsultationResult({ 
            specialization: spec, 
            disease: response.data.disease,
            organSystem: response.data.organ_system,
            inputSymptoms: symptoms 
          });
          
          setTimeout(() => resultRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }), 100);
        } else {
          console.error('❌ Specialization not found for:', specialistName);
          setConsultationError('SPECIALIZATION_NOT_FOUND');
        }
      } else {
        console.error('❌ Invalid response:', response);
        setConsultationError('INVALID_RESPONSE');
      }
    } catch (error) { 
      console.error('❌ AI Analysis Error:', error);
      
      if (error.message.includes('503')) {
        setConsultationError('AI service unavailable. Please try again later.');
      } else if (error.message.includes('504')) {
        setConsultationError('Request timeout. Please try again.');
      } else {
        setConsultationError('An error occurred during analysis.');
      }
    }
    finally { 
      setIsAnalyzing(false); 
    }
  };

  const resetConsultation = () => { setSymptoms(''); setConsultationResult(null); setConsultationError(null); };
  const openModal = (type, title, message, onConfirm = null) => setModal({ isOpen: true, type, title, message, onConfirm });
  const closeModal = () => setModal({ isOpen: false, type: '', title: '', message: '', onConfirm: null });
  const handleModalConfirm = () => { if (modal.onConfirm) modal.onConfirm(); closeModal(); };

  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      const currentUser = authAPI.getCurrentUser();
      if (!currentUser) { openModal('error', 'غير مصرح', 'يجب عليك تسجيل الدخول أولاً', () => navigate('/')); return; }
      if (currentUser.roles?.[0] !== 'patient') { openModal('error', 'غير مصرح', 'هذه الصفحة متاحة للمرضى فقط', () => navigate('/')); return; }
      setUser(currentUser); setVisits([]); setLoading(false);
    };
    loadData();
  }, [navigate]);


  useEffect(() => {
  const loadVisits = async () => {
    if (!user) return;
    
    setLoadingVisits(true);
    
    try {
      const token = localStorage.getItem('token');
      
      console.log('📋 Loading patient visits...');
      
      const response = await fetch('http://localhost:5000/api/patient/visits', {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      
      const data = await response.json();
      
      console.log('📥 Visits response:', data);
      
      if (response.ok && data.success) {
        setVisits(data.visits || []);
      } else {
        console.error('Failed to load visits:', data.message);
        setVisits([]);
      }
    } catch (error) {
      console.error('❌ Error loading visits:', error);
      setVisits([]);
    } finally {
      setLoadingVisits(false);
    }
  };
  
  loadVisits();
}, [user]);

  const handleLogout = () => openModal('confirm', 'تأكيد تسجيل الخروج', 'هل أنت متأكد من رغبتك في تسجيل الخروج؟', () => authAPI.logout());
  const formatDate = (d) => d ? new Date(d).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' }) : '-';
  const calculateAge = (d) => { if (!d) return null; const t = new Date(), b = new Date(d); let a = t.getFullYear() - b.getFullYear(); if (t.getMonth() < b.getMonth() || (t.getMonth() === b.getMonth() && t.getDate() < b.getDate())) a--; return a; };
  const calculateBMI = (h, w) => (h && w) ? (w / ((h/100) ** 2)).toFixed(1) : null;
  const getBMICategory = (b) => !b ? null : b < 18.5 ? 'نقص الوزن' : b < 25 ? 'وزن طبيعي' : b < 30 ? 'وزن زائد' : 'سمنة';
  const formatDateTime = (date) => {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('ar-EG', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
};

const handleViewVisitDetails = (visit) => {
  setSelectedVisit(visit);
  setShowVisitDetails(true);
};

const closeVisitDetails = () => {
  setShowVisitDetails(false);
  setSelectedVisit(null);
};
  const getBMICategoryClass = (b) => !b ? '' : b < 18.5 ? 'underweight' : b < 25 ? 'normal' : b < 30 ? 'overweight' : 'obese';

  if (loading) return <div className="loading-container"><div className="loading-spinner"></div><p>جاري التحميل...</p></div>;
  if (!user) return null;

  const age = calculateAge(user.dateOfBirth);
  const patientData = user.roleData?.patient || {};
  const bmi = calculateBMI(patientData.height, patientData.weight);
  const bmiCategory = getBMICategory(bmi);
  const bmiCategoryClass = getBMICategoryClass(parseFloat(bmi));

  return (
    <div className="patient-dashboard">
      <Navbar />
      
      {modal.isOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-container" onClick={e => e.stopPropagation()}>
            <div className={`modal-header ${modal.type}`}>
              <div className="modal-icon">{modal.type === 'success' ? '✓' : modal.type === 'error' ? '✕' : '؟'}</div>
              <h2>{modal.title}</h2>
            </div>
            <div className="modal-body"><p>{modal.message}</p></div>
            <div className="modal-footer">
              {modal.type === 'confirm' ? (
                <><button className="modal-button secondary" onClick={closeModal}>إلغاء</button><button className="modal-button primary" onClick={handleModalConfirm}>تأكيد</button></>
              ) : <button className="modal-button primary" onClick={modal.onConfirm ? handleModalConfirm : closeModal}>حسناً</button>}
            </div>
          </div>
        </div>
      )}

      <div className="dashboard-container">
        <div className="welcome-header">
          <div className="welcome-content">
            <h1>مرحباً {user.firstName} {user.lastName} 👋</h1>
            <p>لوحة تحكم المريض - Patient 360°</p>
          </div>
          <button className="logout-btn" onClick={handleLogout}>تسجيل الخروج 🚪</button>
        </div>

        <div className="dashboard-tabs">
          {['overview', 'visits', 'consultation', 'medications'].map(section => (
            <button key={section} className={`tab-btn ${activeSection === section ? 'active' : ''}`} onClick={() => setActiveSection(section)}>
              <span className="tab-icon">{section === 'overview' ? '📊' : section === 'visits' ? '📋' : section === 'consultation' ? '🤖' : '💊'}</span>
              {section === 'overview' ? 'نظرة عامة' : section === 'visits' ? 'سجل الزيارات' : section === 'consultation' ? 'استشيرني' : 'تقويم الأدوية'}
            </button>
          ))}
        </div>

        {activeSection === 'overview' && (
          <div className="section-content">
            <div className="profile-header-card">
              <div className="profile-avatar">
                <div className="avatar-circle"><span>{user.gender === 'male' ? '👨' : '👩'}</span></div>
                <div className="avatar-badge"><span>✓</span></div>
              </div>
              <div className="profile-header-info">
                <h1>{user.firstName} {user.lastName}</h1>
                <p className="profile-role">مريض - Patient 360°</p>
                <div className="profile-meta-info">
                  {age && <div className="meta-item"><span>🎂</span><span>{age} سنة</span></div>}
                  {user.gender && <div className="meta-item"><span>{user.gender === 'male' ? '♂️' : '♀️'}</span><span>{user.gender === 'male' ? 'ذكر' : 'أنثى'}</span></div>}
                  {patientData.bloodType && <div className="meta-item"><span>🩸</span><span>{patientData.bloodType}</span></div>}
                </div>
              </div>
            </div>

            <div className="quick-stats-grid">
              <div className="quick-stat-card visits"><div className="stat-icon-wrapper"><span>📋</span></div><div className="stat-content"><h3>{visits.length}</h3><p>زيارة طبية</p></div></div>
              {bmi && <div className={`quick-stat-card bmi ${bmiCategoryClass}`}><div className="stat-icon-wrapper"><span>⚖️</span></div><div className="stat-content"><h3>{bmi}</h3><p>مؤشر كتلة الجسم</p><span className={`stat-badge ${bmiCategoryClass}`}>{bmiCategory}</span></div></div>}
            </div>

            <div className="data-section">
              <div className="section-header"><div className="section-title-wrapper"><span className="section-icon">👤</span><h2>المعلومات الشخصية</h2></div></div>
              <div className="info-cards-grid">
                <div className="info-display-card"><div className="card-icon-header"><div className="icon-circle email"><span>✉️</span></div><h3>البريد الإلكتروني</h3></div><p className="card-value" dir="ltr">{user.email}</p></div>
                <div className="info-display-card"><div className="card-icon-header"><div className="icon-circle phone"><span>📱</span></div><h3>رقم الهاتف</h3></div><p className="card-value" dir="ltr">{user.phoneNumber || 'غير محدد'}</p></div>
                <div className="info-display-card"><div className="card-icon-header"><div className="icon-circle id"><span>🆔</span></div><h3>رقم الهوية</h3></div><p className="card-value">{user.nationalId || 'غير محدد'}</p></div>
                <div className="info-display-card"><div className="card-icon-header"><div className="icon-circle birth"><span>🎂</span></div><h3>تاريخ الميلاد</h3></div><p className="card-value">{formatDate(user.dateOfBirth)}</p></div>
                {user.address && <div className="info-display-card full-width"><div className="card-icon-header"><div className="icon-circle address"><span>📍</span></div><h3>العنوان</h3></div><p className="card-value">{user.address}</p></div>}
              </div>
            </div>

            {(patientData.bloodType || patientData.height || patientData.weight) && (
              <div className="data-section">
                <div className="section-header"><div className="section-title-wrapper"><span className="section-icon">🏥</span><h2>المعلومات الطبية</h2></div></div>
                <div className="medical-info-grid">
                  {patientData.bloodType && <div className="medical-card"><div className="medical-card-header"><div className="medical-icon">🩸</div><h3>فصيلة الدم</h3></div><div className="medical-value-large">{patientData.bloodType}</div></div>}
                  {patientData.height && <div className="medical-card"><div className="medical-card-header"><div className="medical-icon">📏</div><h3>الطول</h3></div><div className="medical-value-large">{patientData.height}</div><div className="medical-unit">سم</div></div>}
                  {patientData.weight && <div className="medical-card"><div className="medical-card-header"><div className="medical-icon">⚖️</div><h3>الوزن</h3></div><div className="medical-value-large">{patientData.weight}</div><div className="medical-unit">كجم</div></div>}
                </div>
              </div>
            )}

            <div className="data-section">
              <div className="section-header"><div className="section-title-wrapper"><span className="section-icon">📜</span><h2>السجل الصحي</h2></div></div>
              <div className="health-history-grid">
                <div className="history-card allergies-card">
                  <div className="history-header"><div className="history-icon">⚠️</div><h3>الحساسية</h3><span className="count-badge">{patientData.allergies?.length || 0}</span></div>
                  {patientData.allergies?.length > 0 ? <ul className="history-list">{patientData.allergies.map((a, i) => <li key={i} className="history-item"><span>•</span><span>{a}</span></li>)}</ul> : <div className="no-data-message"><span>✓</span><p>لا توجد حساسية مسجلة</p></div>}
                </div>
                <div className="history-card diseases-card">
                  <div className="history-header"><div className="history-icon">🏥</div><h3>الأمراض المزمنة</h3><span className="count-badge">{patientData.chronicDiseases?.length || 0}</span></div>
                  {patientData.chronicDiseases?.length > 0 ? <ul className="history-list">{patientData.chronicDiseases.map((d, i) => <li key={i} className="history-item"><span>•</span><span>{d}</span></li>)}</ul> : <div className="no-data-message"><span>✓</span><p>لا توجد أمراض مزمنة</p></div>}
                </div>
                <div className="history-card family-card">
                  <div className="history-header"><div className="history-icon">👨‍👩‍👧‍👦</div><h3>التاريخ العائلي</h3><span className="count-badge">{patientData.familyHistory?.length || 0}</span></div>
                  {patientData.familyHistory?.length > 0 ? <ul className="history-list">{patientData.familyHistory.map((h, i) => <li key={i} className="history-item"><span>•</span><span>{h}</span></li>)}</ul> : <div className="no-data-message"><span>✓</span><p>لا يوجد تاريخ عائلي مسجل</p></div>}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeSection === 'visits' && (
  <div className="section-content">
    <div className="visits-page-container">
      {/* Header */}
      <div className="visits-page-header">
        <div className="visits-header-content">
          <div className="visits-icon-box">
            <span>📋</span>
            <div className="pulse-ring"></div>
          </div>
          <div className="visits-header-text">
            <h1>سجل الزيارات الطبية</h1>
            <p>Medical Visits History</p>
          </div>
        </div>
        <div className="visits-count-badge">
          <span className="count-number">{visits.length}</span>
          <span>زيارة</span>
        </div>
      </div>

      {/* Loading State */}
      {loadingVisits && (
        <div className="loading-state">
          <div className="spinner"></div>
          <p>جاري تحميل الزيارات...</p>
        </div>
      )}

      {/* Empty State */}
      {!loadingVisits && visits.length === 0 && (
        <div className="empty-state-card">
          <div className="empty-icon">📋</div>
          <h3>لا توجد زيارات طبية</h3>
          <p>سيتم عرض زياراتك الطبية هنا بعد مراجعة الطبيب</p>
          <div className="empty-info">
            <span>💡</span>
            <p>سجل الزيارات يتضمن التشخيص والأدوية وملاحظات الطبيب</p>
          </div>
        </div>
      )}

      {/* Visits List */}
      {!loadingVisits && visits.length > 0 && (
        <div className="visits-timeline">
          {visits.map((visit, index) => (
            <div key={visit._id || index} className="visit-timeline-card">
              {/* Visit Header */}
              <div className="visit-card-header">
                <div className="visit-date-section">
                  <span className="visit-date-icon">📅</span>
                  <div className="visit-date-info">
                    <span className="visit-date">{formatDateTime(visit.visitDate)}</span>
                    <span className="visit-type-badge">
                      {visit.visitType === 'regular' ? 'زيارة عادية' : 
                       visit.visitType === 'emergency' ? 'طوارئ' : 
                       visit.visitType === 'followup' ? 'متابعة' : 'زيارة'}
                    </span>
                  </div>
                </div>
                <div className="visit-doctor-section">
                  <span className="doctor-icon">👨‍⚕️</span>
                  <span className="doctor-name">
                    {visit.doctorId?.firstName && visit.doctorId?.lastName 
                      ? `د. ${visit.doctorId.firstName} ${visit.doctorId.lastName}`
                      : 'طبيب'}
                  </span>
                  {visit.doctorId?.specialization && (
                    <span className="doctor-spec">{visit.doctorId.specialization}</span>
                  )}
                </div>
              </div>

              {/* Visit Content Preview */}
              <div className="visit-card-content">
                {/* Chief Complaint */}
                {visit.chiefComplaint && (
                  <div className="visit-field-preview">
                    <span className="field-label">💬 الشكوى الرئيسية:</span>
                    <p className="field-value">{visit.chiefComplaint}</p>
                  </div>
                )}

                {/* Diagnosis */}
                {visit.diagnosis && (
                  <div className="visit-field-preview diagnosis">
                    <span className="field-label">🔬 التشخيص:</span>
                    <p className="field-value">{visit.diagnosis}</p>
                  </div>
                )}

                {/* Medications Preview */}
                {visit.prescribedMedications && visit.prescribedMedications.length > 0 && (
                  <div className="visit-meds-preview">
                    <span className="field-label">💊 الأدوية الموصوفة:</span>
                    <div className="meds-preview-tags">
                      {visit.prescribedMedications.slice(0, 3).map((med, i) => (
                        <span key={i} className="med-preview-tag">
                          💊 {med.medicationName}
                        </span>
                      ))}
                      {visit.prescribedMedications.length > 3 && (
                        <span className="more-meds-badge">
                          +{visit.prescribedMedications.length - 3} المزيد
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* View Details Button */}
              <div className="visit-card-footer">
                <button 
                  className="view-details-btn"
                  onClick={() => handleViewVisitDetails(visit)}
                >
                  <span>👁️</span>
                  <span>عرض التفاصيل الكاملة</span>
                  <span>←</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  </div>
)}


        {activeSection === 'consultation' && (
          <div className="section-content">
            <div className="consultation-main-container">
              <div className="consultation-page-header">
                <div className="consultation-header-content">
                  <div className="consultation-icon-box"><span className="ai-icon">🤖</span><div className="ai-pulse-ring"></div></div>
                  <div className="consultation-header-text"><h1>استشيرني</h1><p>AI Medical Consultation Assistant</p></div>
                </div>
                <div className="consultation-header-badge"><span>🏥</span><span>{MEDICAL_SPECIALIZATIONS.length} تخصص طبي</span></div>
              </div>

              <div className="consultation-disclaimer-banner">
                <span>⚠️</span>
                <p><strong>Important:</strong> This service provides guidance only and does not replace professional medical consultation.</p>
              </div>
              
              <div className="symptoms-input-card">
                <div className="input-card-header"><span>💬</span><div><h3>Describe Your Symptoms</h3><p>صف أعراضك باللغة الإنجليزية</p></div></div>
                <div className="input-card-body">
                  <textarea 
                    className="symptoms-textarea-main" 
                    placeholder="Example: I have chest pain and shortness of breath..." 
                    value={symptoms} 
                    onChange={e => setSymptoms(e.target.value)} 
                    rows={4} 
                    disabled={isAnalyzing} 
                    dir="ltr" 
                  />
                  <div className="input-actions">
                    {consultationResult && <button className="reset-btn" onClick={resetConsultation}><span>🔄</span><span>استشارة جديدة</span></button>}
                    <button className="analyze-main-btn" onClick={handleAnalyzeSymptoms} disabled={!symptoms.trim() || isAnalyzing}>
                      {isAnalyzing ? <><span className="spinner"></span><span>Analyzing...</span></> : <><span>🔍</span><span>Analyze Symptoms</span></>}
                    </button>
                  </div>
                </div>
                {consultationError && (
                  <div className="consultation-error-message">
                    <span>❌</span>
                    <p>{consultationError}</p>
                  </div>
                )}
              </div>
              
              {consultationResult && (
                <div className="consultation-result-card" ref={resultRef}>
                  <div className="result-card-header">
                    <div className="result-success-icon">✅</div>
                    <div>
                      <h3>Analysis Results</h3>
                      <p>نتائج التحليل</p>
                    </div>
                  </div>
                  <div className="result-card-body">
                    {/* Disease Result */}
                    <div className="result-info-row">
                      <span className="result-label">🩺 Possible Condition:</span>
                      <span className="result-value">{consultationResult.disease}</span>
                    </div>
                    
                    {/* Organ System Result */}
                    <div className="result-info-row">
                      <span className="result-label">🫀 Affected System:</span>
                      <span className="result-value">{consultationResult.organSystem}</span>
                    </div>
                    
                    {/* Recommended Specialist */}
                    <div className="result-specialization-card" style={{ borderColor: consultationResult.specialization.color }}>
                      <div className="result-spec-icon" style={{ background: `${consultationResult.specialization.color}20` }}><span>{consultationResult.specialization.icon}</span></div>
                      <div className="result-spec-info">
                        <div className="result-label">👨‍⚕️ Recommended Specialist:</div>
                        <h4>{consultationResult.specialization.nameAr}</h4>
                        <p className="result-spec-en">{consultationResult.specialization.nameEn}</p>
                        <p className="result-spec-desc">{consultationResult.specialization.description}</p>
                      </div>
                    </div>
                    
                    <div className="result-symptoms-ref"><span>💡</span><div><strong>Based on:</strong><p>"{consultationResult.inputSymptoms}"</p></div></div>
                  </div>
                </div>
              )}

              <div className="all-specializations-section">
                <div className="specializations-section-header">
                  <div className="spec-section-title"><span>🏥</span><div><h2>التخصصات الطبية المتاحة</h2><p>All Available Medical Specializations</p></div></div>
                  <div className="spec-count-badge"><span className="count-num">{MEDICAL_SPECIALIZATIONS.length}</span><span>تخصص</span></div>
                </div>
                <div className="specializations-elegant-grid">
                  {MEDICAL_SPECIALIZATIONS.map((spec, i) => (
                    <div key={spec.id} className="spec-elegant-card" style={{ '--spec-color': spec.color, '--delay': `${i * 0.03}s` }}>
                      <div className="spec-card-top-accent" style={{ background: spec.color }}></div>
                      <div className="spec-card-content">
                        <div className="spec-icon-wrapper" style={{ background: `${spec.color}15` }}><span>{spec.icon}</span></div>
                        <div className="spec-text-content"><h4>{spec.nameAr}</h4><p>{spec.nameEn}</p></div>
                      </div>
                      <div className="spec-hover-description"><p>{spec.description}</p></div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="how-service-works">
                <div className="how-works-header"><span>📖</span><div><h3>كيف تعمل الخدمة؟</h3><p>How does it work?</p></div></div>
                <div className="how-steps-container">
                  <div className="how-step-item"><div className="step-num-circle"><span>1</span></div><div className="step-info"><h4>Describe Symptoms</h4><p>وصف الأعراض</p></div></div>
                  <div className="step-arrow">→</div>
                  <div className="how-step-item"><div className="step-num-circle"><span>2</span></div><div className="step-info"><h4>AI Analysis</h4><p>تحليل الذكاء الاصطناعي</p></div></div>
                  <div className="step-arrow">→</div>
                  <div className="how-step-item"><div className="step-num-circle"><span>3</span></div><div className="step-info"><h4>Get Recommendation</h4><p>الحصول على التوصية</p></div></div>
                </div>
              </div>

              <div className="important-notice-box">
                <div className="notice-icon-wrap">⚠️</div>
                <div className="notice-content">
                  <h4>تنبيه هام / Important Notice</h4>
                  <p>هذه الخدمة استرشادية فقط ولا تغني عن الاستشارة الطبية المباشرة. في حالة الطوارئ، توجه لأقرب مستشفى فوراً.</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {activeSection === 'medications' && (
          <div className="section-content">
            <div className="card">
              <div className="card-header"><h2>💊 تقويم الأدوية</h2></div>
              <div className="empty-state"><div className="empty-icon">💊</div><h3>لا توجد أدوية</h3><p>سيتم عرض الأدوية الموصوفة هنا بعد زيارة الطبيب</p></div>
            </div>
          </div>
        )}
              {/* Visit Details Modal */}
      {showVisitDetails && selectedVisit && (
        <div className="modal-overlay" onClick={closeVisitDetails}>
          <div className="visit-details-modal" onClick={e => e.stopPropagation()}>
            {/* Modal Header */}
            <div className="visit-modal-header">
              <div className="modal-header-content">
                <span className="modal-header-icon">📋</span>
                <div>
                  <h2>تفاصيل الزيارة</h2>
                  <p>{formatDateTime(selectedVisit.visitDate)}</p>
                </div>
              </div>
              <button className="close-modal-btn" onClick={closeVisitDetails}>
                ✕
              </button>
            </div>

            {/* Modal Body */}
            <div className="visit-modal-body">
              {/* Doctor Info */}
              <div className="modal-section">
                <div className="modal-section-header">
                  <span>👨‍⚕️</span>
                  <h3>معلومات الطبيب</h3>
                </div>
                <div className="modal-info-grid">
                  <div className="modal-info-item">
                    <span className="info-label">الاسم:</span>
                    <span className="info-value">
                      {selectedVisit.doctorId?.firstName && selectedVisit.doctorId?.lastName 
                        ? `د. ${selectedVisit.doctorId.firstName} ${selectedVisit.doctorId.lastName}`
                        : 'طبيب'}
                    </span>
                  </div>
                  {selectedVisit.doctorId?.specialization && (
                    <div className="modal-info-item">
                      <span className="info-label">التخصص:</span>
                      <span className="info-value">{selectedVisit.doctorId.specialization}</span>
                    </div>
                  )}
                  {selectedVisit.doctorId?.institution && (
                    <div className="modal-info-item">
                      <span className="info-label">المؤسسة:</span>
                      <span className="info-value">{selectedVisit.doctorId.institution}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Chief Complaint */}
              {selectedVisit.chiefComplaint && (
                <div className="modal-section">
                  <div className="modal-section-header">
                    <span>💬</span>
                    <h3>الشكوى الرئيسية</h3>
                  </div>
                  <div className="modal-text-content">
                    <p>{selectedVisit.chiefComplaint}</p>
                  </div>
                </div>
              )}

              {/* Diagnosis */}
              {selectedVisit.diagnosis && (
                <div className="modal-section diagnosis-section">
                  <div className="modal-section-header">
                    <span>🔬</span>
                    <h3>التشخيص</h3>
                  </div>
                  <div className="modal-text-content diagnosis-text">
                    <p>{selectedVisit.diagnosis}</p>
                  </div>
                </div>
              )}

              {/* Vital Signs */}
              {selectedVisit.vitalSigns && Object.keys(selectedVisit.vitalSigns).some(k => selectedVisit.vitalSigns[k]) && (
                <div className="modal-section">
                  <div className="modal-section-header">
                    <span>🩺</span>
                    <h3>العلامات الحيوية</h3>
                  </div>
                  <div className="vitals-grid-modal">
                    {selectedVisit.vitalSigns.bloodPressureSystolic && (
                      <div className="vital-item">
                        <span className="vital-icon">🩺</span>
                        <div className="vital-info">
                          <span className="vital-label">ضغط الدم</span>
                          <span className="vital-value">
                            {selectedVisit.vitalSigns.bloodPressureSystolic}/{selectedVisit.vitalSigns.bloodPressureDiastolic} mmHg
                          </span>
                        </div>
                      </div>
                    )}
                    {selectedVisit.vitalSigns.heartRate && (
                      <div className="vital-item">
                        <span className="vital-icon">💓</span>
                        <div className="vital-info">
                          <span className="vital-label">معدل ضربات القلب</span>
                          <span className="vital-value">{selectedVisit.vitalSigns.heartRate} BPM</span>
                        </div>
                      </div>
                    )}
                    {selectedVisit.vitalSigns.temperature && (
                      <div className="vital-item">
                        <span className="vital-icon">🌡️</span>
                        <div className="vital-info">
                          <span className="vital-label">درجة الحرارة</span>
                          <span className="vital-value">{selectedVisit.vitalSigns.temperature}°C</span>
                        </div>
                      </div>
                    )}
                    {selectedVisit.vitalSigns.spo2 && (
                      <div className="vital-item">
                        <span className="vital-icon">🫁</span>
                        <div className="vital-info">
                          <span className="vital-label">نسبة الأكسجين</span>
                          <span className="vital-value">{selectedVisit.vitalSigns.spo2}%</span>
                        </div>
                      </div>
                    )}
                    {selectedVisit.vitalSigns.bloodGlucose && (
                      <div className="vital-item">
                        <span className="vital-icon">🩸</span>
                        <div className="vital-info">
                          <span className="vital-label">مستوى السكر</span>
                          <span className="vital-value">{selectedVisit.vitalSigns.bloodGlucose} mg/dL</span>
                        </div>
                      </div>
                    )}
                    {selectedVisit.vitalSigns.weight && (
                      <div className="vital-item">
                        <span className="vital-icon">⚖️</span>
                        <div className="vital-info">
                          <span className="vital-label">الوزن</span>
                          <span className="vital-value">{selectedVisit.vitalSigns.weight} kg</span>
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Medications */}
              {selectedVisit.prescribedMedications && selectedVisit.prescribedMedications.length > 0 && (
                <div className="modal-section">
                  <div className="modal-section-header">
                    <span>💊</span>
                    <h3>الأدوية الموصوفة</h3>
                    <span className="count-badge">{selectedVisit.prescribedMedications.length}</span>
                  </div>
                  <div className="medications-list-modal">
                    {selectedVisit.prescribedMedications.map((med, index) => (
                      <div key={index} className="medication-card-modal">
                        <div className="med-card-header">
                          <span className="med-icon">💊</span>
                          <h4>{med.medicationName}</h4>
                        </div>
                        <div className="med-card-details">
                          <div className="med-detail-item">
                            <span className="med-detail-label">الجرعة:</span>
                            <span className="med-detail-value">{med.dosage}</span>
                          </div>
                          <div className="med-detail-item">
                            <span className="med-detail-label">التكرار:</span>
                            <span className="med-detail-value">{med.frequency}</span>
                          </div>
                          {med.duration && (
                            <div className="med-detail-item">
                              <span className="med-detail-label">المدة:</span>
                              <span className="med-detail-value">{med.duration}</span>
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Doctor Notes */}
              {selectedVisit.doctorNotes && (
                <div className="modal-section">
                  <div className="modal-section-header">
                    <span>📝</span>
                    <h3>ملاحظات الطبيب</h3>
                  </div>
                  <div className="modal-text-content notes-text">
                    <p>{selectedVisit.doctorNotes}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Modal Footer */}
            <div className="visit-modal-footer">
              <button className="close-details-btn" onClick={closeVisitDetails}>
                إغلاق
              </button>
            </div>
          </div>
        </div>
      )}

      </div>
    </div>
  );
};

export default PatientDashboard;
