// src/pages/AdminDashboard.jsx
// 🏛️ Health Ministry Admin Dashboard - Government Healthcare Platform
// Patient 360° - وزارة الصحة - الجمهورية العربية السورية
// Database Schema Compliant Version with Doctor Requests Management

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/common/Navbar';
import { authAPI } from '../services/api';
import '../styles/AdminDashboard.css';

/**
 * ============================================
 * DATABASE SCHEMA REFERENCE (from metadata)
 * ============================================
 * 
 * DOCTORS COLLECTION:
 * - personId: objectId (required)
 * - medicalLicenseNumber: string, pattern ^[A-Z0-9]{8,20}$ (required)
 * - specialization: string, 3-100 chars, pattern ^[a-zA-Z\s-]+$ (required)
 * - subSpecialization: string|null, 3-100 chars
 * - yearsOfExperience: int, 0-60
 * - hospitalAffiliation: string, 3-150 chars
 * - availableDays: array[1-7], enum ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"]
 * - consultationFee: int|double, 0-1000000
 * - createdAt: date (required)
 * - updatedAt: date
 * 
 * ACCOUNTS COLLECTION:
 * - email: unique
 * - password: hashed
 * - personId: objectId, unique
 * - roles: array
 * - isActive: boolean
 * 
 * PERSONS COLLECTION:
 * - nationalId: unique
 * - firstName, lastName
 * - Other personal info
 * 
 * DOCTOR_REQUESTS COLLECTION (NEW):
 * - All doctor fields + personal fields
 * - status: 'pending' | 'accepted' | 'rejected'
 * - rejectionReason: string | null
 * - requestId: unique string
 * - createdAt, reviewedAt, reviewedBy
 */

// ============================================
// CONSTANTS - MATCHING DATABASE ENUMS
// ============================================

/**
 * Syrian Governorates
 */
const SYRIAN_GOVERNORATES = [
  { id: 'damascus', nameAr: 'دمشق', nameEn: 'Damascus' },
  { id: 'rif_dimashq', nameAr: 'ريف دمشق', nameEn: 'Rif Dimashq' },
  { id: 'aleppo', nameAr: 'حلب', nameEn: 'Aleppo' },
  { id: 'homs', nameAr: 'حمص', nameEn: 'Homs' },
  { id: 'hama', nameAr: 'حماة', nameEn: 'Hama' },
  { id: 'latakia', nameAr: 'اللاذقية', nameEn: 'Latakia' },
  { id: 'tartus', nameAr: 'طرطوس', nameEn: 'Tartus' },
  { id: 'idlib', nameAr: 'إدلب', nameEn: 'Idlib' },
  { id: 'deir_ez_zor', nameAr: 'دير الزور', nameEn: 'Deir ez-Zor' },
  { id: 'hasakah', nameAr: 'الحسكة', nameEn: 'Al-Hasakah' },
  { id: 'raqqa', nameAr: 'الرقة', nameEn: 'Raqqa' },
  { id: 'daraa', nameAr: 'درعا', nameEn: 'Daraa' },
  { id: 'suwayda', nameAr: 'السويداء', nameEn: 'As-Suwayda' },
  { id: 'quneitra', nameAr: 'القنيطرة', nameEn: 'Quneitra' }
];

/**
 * Medical Specializations
 * IMPORTANT: id must match pattern ^[a-zA-Z\s-]+$ (English only, letters/spaces/hyphens)
 */
const MEDICAL_SPECIALIZATIONS = [
  { id: 'Cardiologist', nameAr: 'طبيب قلب', icon: '❤️', hasECG: true },
  { id: 'Pulmonologist', nameAr: 'طبيب أمراض الرئة', icon: '🫁', hasECG: false },
  { id: 'General Practitioner', nameAr: 'طبيب عام', icon: '🩺', hasECG: false },
  { id: 'Infectious Disease Specialist', nameAr: 'طبيب أمراض معدية', icon: '🦠', hasECG: false },
  { id: 'Intensive Care Specialist', nameAr: 'طبيب عناية مركزة', icon: '🏥', hasECG: false },
  { id: 'Rheumatologist', nameAr: 'طبيب روماتيزم', icon: '🦴', hasECG: false },
  { id: 'Orthopedic Surgeon', nameAr: 'جراح عظام', icon: '🦿', hasECG: false },
  { id: 'Neurologist', nameAr: 'طبيب أعصاب', icon: '🧠', hasECG: false },
  { id: 'Endocrinologist', nameAr: 'طبيب غدد صماء', icon: '⚗️', hasECG: false },
  { id: 'Dermatologist', nameAr: 'طبيب جلدية', icon: '🧴', hasECG: false },
  { id: 'Gastroenterologist', nameAr: 'طبيب جهاز هضمي', icon: '🫃', hasECG: false },
  { id: 'General Surgeon', nameAr: 'جراح عام', icon: '🔪', hasECG: false },
  { id: 'Hepatologist', nameAr: 'طبيب كبد', icon: '🫀', hasECG: false },
  { id: 'Urologist', nameAr: 'طبيب مسالك بولية', icon: '💧', hasECG: false },
  { id: 'Gynecologist', nameAr: 'طبيب نساء وتوليد', icon: '🤰', hasECG: false },
  { id: 'Psychiatrist', nameAr: 'طبيب نفسي', icon: '🧘', hasECG: false },
  { id: 'Hematologist', nameAr: 'طبيب دم', icon: '🩸', hasECG: false },
  { id: 'Oncologist', nameAr: 'طبيب أورام', icon: '🎗️', hasECG: false },
  { id: 'ENT Specialist', nameAr: 'طبيب أنف أذن حنجرة', icon: '👂', hasECG: false },
  { id: 'Ophthalmologist', nameAr: 'طبيب عيون', icon: '👁️', hasECG: false },
  { id: 'Pediatrician', nameAr: 'طبيب أطفال', icon: '👶', hasECG: false },
  { id: 'Nephrologist', nameAr: 'طبيب كلى', icon: '🫘', hasECG: false },
  { id: 'Internal Medicine', nameAr: 'طبيب باطنية', icon: '🏨', hasECG: false },
  { id: 'Emergency Medicine', nameAr: 'طبيب طوارئ', icon: '🚑', hasECG: false }
];

/**
 * Available Days - MUST match database enum exactly
 * Database: ["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday","Sunday"]
 */
const WEEKDAYS = [
  { id: 'Sunday', nameAr: 'الأحد' },
  { id: 'Monday', nameAr: 'الإثنين' },
  { id: 'Tuesday', nameAr: 'الثلاثاء' },
  { id: 'Wednesday', nameAr: 'الأربعاء' },
  { id: 'Thursday', nameAr: 'الخميس' },
  { id: 'Friday', nameAr: 'الجمعة' },
  { id: 'Saturday', nameAr: 'السبت' }
];

/**
 * Deactivation Reasons
 */
const DEACTIVATION_REASONS = [
  { id: 'death', nameAr: 'وفاة', icon: '🕊️' },
  { id: 'license_revoked', nameAr: 'إلغاء الترخيص', icon: '🚫' },
  { id: 'user_request', nameAr: 'طلب المستخدم', icon: '📝' },
  { id: 'fraud', nameAr: 'احتيال', icon: '⚠️' },
  { id: 'retirement', nameAr: 'تقاعد', icon: '🏖️' },
  { id: 'transfer', nameAr: 'نقل', icon: '🔄' },
  { id: 'other', nameAr: 'سبب آخر', icon: '📋' }
];

/**
 * Rejection Reasons for Doctor Requests
 */
const REJECTION_REASONS = [
  { id: 'invalid_license', nameAr: 'رقم ترخيص غير صالح', icon: '🚫' },
  { id: 'incomplete_documents', nameAr: 'وثائق غير مكتملة', icon: '📄' },
  { id: 'unverifiable_info', nameAr: 'معلومات غير قابلة للتحقق', icon: '❓' },
  { id: 'duplicate_request', nameAr: 'طلب مكرر', icon: '🔄' },
  { id: 'suspended_license', nameAr: 'ترخيص موقوف', icon: '⏸️' },
  { id: 'other', nameAr: 'سبب آخر', icon: '📋' }
];

// ============================================
// UTILITY FUNCTIONS
// ============================================

/**
 * Arabic to English transliteration for email generation
 */
const transliterateArabic = (text) => {
  const map = {
    'ا': 'a', 'أ': 'a', 'إ': 'e', 'آ': 'a', 'ب': 'b', 'ت': 't', 'ث': 'th',
    'ج': 'j', 'ح': 'h', 'خ': 'kh', 'د': 'd', 'ذ': 'th', 'ر': 'r', 'ز': 'z',
    'س': 's', 'ش': 'sh', 'ص': 's', 'ض': 'd', 'ط': 't', 'ظ': 'z', 'ع': 'a',
    'غ': 'gh', 'ف': 'f', 'ق': 'q', 'ك': 'k', 'ل': 'l', 'م': 'm', 'ن': 'n',
    'ه': 'h', 'و': 'w', 'ي': 'y', 'ى': 'a', 'ة': 'a', 'ء': '', 'ئ': 'y', 'ؤ': 'w'
  };
  return text.split('').map(char => map[char] || char).join('').replace(/[^a-z]/g, '').toLowerCase() || 'user';
};

/**
 * Generate doctor email: firstname.lastname.LICENSE@patient360.gov.sy
 */
const generateDoctorEmail = (firstName, lastName, licenseNumber) => {
  let firstEn = firstName.toLowerCase().replace(/[^a-z]/g, '');
  let lastEn = lastName.toLowerCase().replace(/[^a-z]/g, '');
  if (!firstEn) firstEn = transliterateArabic(firstName);
  if (!lastEn) lastEn = transliterateArabic(lastName);
  return `${firstEn}.${lastEn}.${licenseNumber.toUpperCase()}@patient360.gov.sy`;
};

/**
 * Generate secure 12-character password
 */
const generatePassword = () => {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$%';
  return Array.from({ length: 12 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
};

/**
 * Format date for display
 */
const formatDate = (date) => {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('ar-EG', { year: 'numeric', month: 'long', day: 'numeric' });
};

const formatDateTime = (date) => {
  if (!date) return '-';
  return new Date(date).toLocaleDateString('ar-EG', { year: 'numeric', month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
};

/**
 * Get specialization display info
 */
const getSpecializationInfo = (specId) => {
  const spec = MEDICAL_SPECIALIZATIONS.find(s => s.id === specId);
  return spec || { id: specId, nameAr: specId, icon: '🩺', hasECG: false };
};

/**
 * Get governorate display name
 */
const getGovernorateName = (govId) => {
  const gov = SYRIAN_GOVERNORATES.find(g => g.id === govId);
  return gov ? gov.nameAr : govId;
};

// ============================================
// COMPONENTS
// ============================================

const StatCard = ({ icon, value, label, sublabel, color, onClick, badge }) => (
  <div className={`stat-card ${color}`} onClick={onClick} style={{ cursor: onClick ? 'pointer' : 'default' }}>
    <div className="stat-card-icon"><span>{icon}</span></div>
    <div className="stat-card-content">
      <h3 className="stat-value">{value}</h3>
      <p className="stat-label">{label}</p>
      {sublabel && <span className="stat-sublabel">{sublabel}</span>}
    </div>
    {badge && <span className="stat-badge">{badge}</span>}
  </div>
);

// ============================================
// MAIN COMPONENT
// ============================================

const AdminDashboard = () => {
  const navigate = useNavigate();
  
  // Core State
  const [admin, setAdmin] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('statistics');
  
  // Modal
  const [modal, setModal] = useState({ isOpen: false, type: '', title: '', message: '', onConfirm: null });
  
  // Statistics
  const [statistics, setStatistics] = useState({
    totalDoctors: 0, activeDoctors: 0, inactiveDoctors: 0,
    totalPatients: 0, activePatients: 0, inactivePatients: 0,
    totalVisits: 0, todayVisits: 0,
    pendingRequests: 0
  });
  
  // Doctors
  const [doctors, setDoctors] = useState([]);
  const [doctorsLoading, setDoctorsLoading] = useState(false);
  const [doctorSearchTerm, setDoctorSearchTerm] = useState('');
  const [doctorFilter, setDoctorFilter] = useState('all');
  const [selectedDoctor, setSelectedDoctor] = useState(null);
  const [showDoctorDetails, setShowDoctorDetails] = useState(false);
  
  // Patients
  const [patients, setPatients] = useState([]);
  const [patientsLoading, setPatientsLoading] = useState(false);
  const [patientSearchTerm, setPatientSearchTerm] = useState('');
  const [patientFilter, setPatientFilter] = useState('all');
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [showPatientDetails, setShowPatientDetails] = useState(false);
  
  // ═══════════════════════════════════════════════════════════════
  // NEW: DOCTOR REQUESTS STATE
  // ═══════════════════════════════════════════════════════════════
  const [doctorRequests, setDoctorRequests] = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [requestSearchTerm, setRequestSearchTerm] = useState('');
  const [requestFilter, setRequestFilter] = useState('pending');
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showRequestDetails, setShowRequestDetails] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectReason, setRejectReason] = useState('');
  const [rejectNotes, setRejectNotes] = useState('');
  const [processingRequest, setProcessingRequest] = useState(false);
  const [showAcceptConfirm, setShowAcceptConfirm] = useState(false);
  const [generatedCredentials, setGeneratedCredentials] = useState(null);
  
  // Add Doctor Form - Fields matching database schema
  const [showAddDoctorForm, setShowAddDoctorForm] = useState(false);
  const [addDoctorLoading, setAddDoctorLoading] = useState(false);
  const [newDoctor, setNewDoctor] = useState({
    // === PERSONS COLLECTION FIELDS ===
    firstName: '',
    lastName: '',
    nationalId: '',           // unique in persons
    phoneNumber: '',
    gender: 'male',
    dateOfBirth: '',
    address: '',
    governorate: '',
    city: '',
    
    // === DOCTORS COLLECTION FIELDS (strict schema) ===
    medicalLicenseNumber: '', // required, pattern: ^[A-Z0-9]{8,20}$
    specialization: '',       // required, pattern: ^[a-zA-Z\s-]+$, 3-100 chars
    subSpecialization: '',    // optional, 3-100 chars or null
    yearsOfExperience: '',    // int, 0-60
    hospitalAffiliation: '',  // string, 3-150 chars
    availableDays: [],        // array[1-7], enum weekdays
    consultationFee: ''       // int|double, 0-1000000
  });
  const [newDoctorCredentials, setNewDoctorCredentials] = useState(null);
  
  // Deactivation
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [deactivateTarget, setDeactivateTarget] = useState(null);
  const [deactivateType, setDeactivateType] = useState('');
  const [deactivateReason, setDeactivateReason] = useState('');
  const [deactivateNotes, setDeactivateNotes] = useState('');
  
  // Audit Logs
  const [auditLogs, setAuditLogs] = useState([]);
  const [auditLoading, setAuditLoading] = useState(false);

  // ============================================
  // MODAL FUNCTIONS
  // ============================================

  const openModal = (type, title, message, onConfirm = null) => {
    setModal({ isOpen: true, type, title, message, onConfirm });
  };

  const closeModal = () => {
    if (modal.onConfirm) modal.onConfirm();
    setModal({ isOpen: false, type: '', title: '', message: '', onConfirm: null });
  };

  // ============================================
  // INITIALIZATION
  // ============================================
  
  useEffect(() => {
    const init = async () => {
      setLoading(true);
      const currentUser = authAPI.getCurrentUser();
      
      if (!currentUser) {
        openModal('error', 'غير مصرح', 'يجب عليك تسجيل الدخول أولاً', () => navigate('/'));
        return;
      }
      
      if (currentUser.roles?.[0] !== 'admin') {
        openModal('error', 'غير مصرح', 'هذه الصفحة متاحة للمسؤولين فقط', () => navigate('/'));
        return;
      }
      
      setAdmin(currentUser);
      await loadStatistics();
      setLoading(false);
    };
    init();
  }, [navigate]);

  // ============================================
  // API CALLS
  // ============================================

  const loadStatistics = async () => {
    try {
      const token = localStorage.getItem('token');
      const headers = { 'Authorization': `Bearer ${token}` };
      
      const [doctorsRes, patientsRes, statsRes, requestsRes] = await Promise.all([
        fetch('http://localhost:5000/api/admin/doctors', { headers }),
        fetch('http://localhost:5000/api/admin/patients', { headers }),
        fetch('http://localhost:5000/api/admin/statistics', { headers }),
        fetch('http://localhost:5000/api/admin/doctor-requests', { headers })
      ]);
      
      const [doctorsData, patientsData, statsData, requestsData] = await Promise.all([
        doctorsRes.json(), patientsRes.json(), statsRes.json(), requestsRes.json()
      ]);
      
      const allDoctors = doctorsData.success ? (doctorsData.doctors || []) : [];
      const allPatients = patientsData.success ? (patientsData.patients || []) : [];
      const allRequests = requestsData.success ? (requestsData.requests || []) : [];
      const pendingRequests = allRequests.filter(r => r.status === 'pending');
      setDoctorRequests(allRequests);
      
      setStatistics({
        totalDoctors: allDoctors.length,
        activeDoctors: allDoctors.filter(d => d.isActive !== false).length,
        inactiveDoctors: allDoctors.filter(d => d.isActive === false).length,
        totalPatients: allPatients.length,
        activePatients: allPatients.filter(p => p.isActive !== false).length,
        inactivePatients: allPatients.filter(p => p.isActive === false).length,
        totalVisits: statsData.totalVisits || 0,
        todayVisits: statsData.todayVisits || 0,
        pendingRequests: pendingRequests.length
      });
    } catch (error) {
      console.error('Error loading statistics:', error);
    }
  };

  const loadDoctors = async () => {
    setDoctorsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5000/api/admin/doctors', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) setDoctors(data.doctors || []);
    } catch (error) {
      console.error('Error loading doctors:', error);
    } finally {
      setDoctorsLoading(false);
    }
  };

  const loadPatients = async () => {
    setPatientsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5000/api/admin/patients', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) setPatients(data.patients || []);
    } catch (error) {
      console.error('Error loading patients:', error);
    } finally {
      setPatientsLoading(false);
    }
  };

  // ═══════════════════════════════════════════════════════════════
  // NEW: LOAD DOCTOR REQUESTS
  // ═══════════════════════════════════════════════════════════════
  const loadDoctorRequests = async () => {
    setRequestsLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5000/api/admin/doctor-requests', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) setDoctorRequests(data.requests || []);
    } catch (error) {
      console.error('Error loading doctor requests:', error);
    } finally {
      setRequestsLoading(false);
    }
  };

  const loadAuditLogs = async () => {
    setAuditLoading(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5000/api/admin/audit-logs', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) setAuditLogs(data.logs || []);
    } catch (error) {
      console.error('Error loading audit logs:', error);
    } finally {
      setAuditLoading(false);
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    if (tab === 'doctors' && doctors.length === 0) loadDoctors();
    else if (tab === 'patients' && patients.length === 0) loadPatients();
    else if (tab === 'doctor_requests' && doctorRequests.length === 0) loadDoctorRequests();
    else if (tab === 'audit' && auditLogs.length === 0) loadAuditLogs();
  };

  // ============================================
  // AUDIT LOGGING
  // ============================================

  const logAuditAction = async (action, details) => {
    try {
      const token = localStorage.getItem('token');
      await fetch('http://localhost:5000/api/admin/audit-logs', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          action,
          details,
          adminId: admin?._id,
          timestamp: new Date().toISOString()
        })
      });
    } catch (error) {
      console.error('Error logging audit action:', error);
    }
  };

  // ============================================
  // FORM VALIDATION - Matching Database Schema
  // ============================================

  const validateDoctorForm = () => {
    // === PERSON VALIDATION ===
    if (!newDoctor.firstName.trim()) {
      openModal('error', 'خطأ', 'الرجاء إدخال الاسم الأول');
      return false;
    }
    if (!newDoctor.lastName.trim()) {
      openModal('error', 'خطأ', 'الرجاء إدخال الكنية');
      return false;
    }
    if (!newDoctor.nationalId.trim() || newDoctor.nationalId.length !== 11) {
      openModal('error', 'خطأ', 'الرجاء إدخال الرقم الوطني (11 رقم)');
      return false;
    }
    if (!newDoctor.phoneNumber.trim()) {
      openModal('error', 'خطأ', 'الرجاء إدخال رقم الهاتف');
      return false;
    }
    if (!newDoctor.governorate) {
      openModal('error', 'خطأ', 'الرجاء اختيار المحافظة');
      return false;
    }

    // === DOCTOR VALIDATION (matching database schema) ===
    
    // medicalLicenseNumber: pattern ^[A-Z0-9]{8,20}$
    const license = newDoctor.medicalLicenseNumber.toUpperCase().trim();
    if (!license) {
      openModal('error', 'خطأ', 'الرجاء إدخال رقم الترخيص الطبي');
      return false;
    }
    if (!/^[A-Z0-9]{8,20}$/.test(license)) {
      openModal('error', 'خطأ في رقم الترخيص', 
        'رقم الترخيص يجب أن يكون:\n• 8-20 حرف/رقم\n• أحرف إنجليزية كبيرة (A-Z) وأرقام (0-9) فقط\n• مثال: SY12345678');
      return false;
    }

    // specialization: pattern ^[a-zA-Z\s-]+$, 3-100 chars
    if (!newDoctor.specialization) {
      openModal('error', 'خطأ', 'الرجاء اختيار التخصص');
      return false;
    }
    if (newDoctor.specialization.length < 3 || newDoctor.specialization.length > 100) {
      openModal('error', 'خطأ', 'التخصص يجب أن يكون بين 3-100 حرف');
      return false;
    }

    // hospitalAffiliation: 3-150 chars (required in our form)
    if (!newDoctor.hospitalAffiliation.trim()) {
      openModal('error', 'خطأ', 'الرجاء إدخال اسم المستشفى أو المركز الصحي');
      return false;
    }
    if (newDoctor.hospitalAffiliation.length < 3 || newDoctor.hospitalAffiliation.length > 150) {
      openModal('error', 'خطأ', 'اسم المستشفى يجب أن يكون بين 3-150 حرف');
      return false;
    }

    // availableDays: array 1-7 items
    if (newDoctor.availableDays.length === 0) {
      openModal('error', 'خطأ', 'الرجاء اختيار أيام العمل (يوم واحد على الأقل)');
      return false;
    }
    if (newDoctor.availableDays.length > 7) {
      openModal('error', 'خطأ', 'لا يمكن اختيار أكثر من 7 أيام');
      return false;
    }

    // subSpecialization: if provided, must be 3-100 chars
    if (newDoctor.subSpecialization.trim() && 
        (newDoctor.subSpecialization.length < 3 || newDoctor.subSpecialization.length > 100)) {
      openModal('error', 'خطأ', 'التخصص الفرعي يجب أن يكون بين 3-100 حرف');
      return false;
    }

    // yearsOfExperience: 0-60
    const years = parseInt(newDoctor.yearsOfExperience) || 0;
    if (years < 0 || years > 60) {
      openModal('error', 'خطأ', 'سنوات الخبرة يجب أن تكون بين 0-60');
      return false;
    }

    // consultationFee: 0-1000000
    const fee = parseFloat(newDoctor.consultationFee) || 0;
    if (fee < 0 || fee > 1000000) {
      openModal('error', 'خطأ', 'رسوم الكشف يجب أن تكون بين 0-1,000,000');
      return false;
    }

    // Clinic address
    if (!newDoctor.address.trim()) {
      openModal('error', 'خطأ', 'الرجاء إدخال عنوان العيادة');
      return false;
    }

    return true;
  };

  // ============================================
  // ADD DOCTOR
  // ============================================

  const handleAddDoctor = async () => {
    if (!validateDoctorForm()) return;

    setAddDoctorLoading(true);

    try {
      const email = generateDoctorEmail(newDoctor.firstName, newDoctor.lastName, newDoctor.medicalLicenseNumber);
      const password = generatePassword();

      // Structure matching database collections
      const payload = {
        // For PERSONS collection
        person: {
          firstName: newDoctor.firstName.trim(),
          lastName: newDoctor.lastName.trim(),
          nationalId: newDoctor.nationalId.trim(),
          phoneNumber: newDoctor.phoneNumber.trim(),
          gender: newDoctor.gender,
          dateOfBirth: newDoctor.dateOfBirth || null,
          address: newDoctor.address.trim(),
          governorate: newDoctor.governorate,
          city: newDoctor.city.trim() || null
        },
        
        // For ACCOUNTS collection
        account: {
          email: email,
          password: password, // Backend will hash this
          roles: ['doctor'],
          isActive: true
        },
        
        // For DOCTORS collection (matching exact schema)
        doctor: {
          medicalLicenseNumber: newDoctor.medicalLicenseNumber.toUpperCase().trim(),
          specialization: newDoctor.specialization,
          subSpecialization: newDoctor.subSpecialization.trim() || null,
          yearsOfExperience: parseInt(newDoctor.yearsOfExperience) || 0,
          hospitalAffiliation: newDoctor.hospitalAffiliation.trim(),
          availableDays: newDoctor.availableDays,
          consultationFee: parseFloat(newDoctor.consultationFee) || 0
        }
      };

      const token = localStorage.getItem('token');
      const res = await fetch('http://localhost:5000/api/admin/doctors', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(payload)
      });

      const data = await res.json();

      if (data.success) {
        setNewDoctorCredentials({
          email,
          password,
          doctorName: `${newDoctor.firstName} ${newDoctor.lastName}`
        });
        
        // Reset form
        setNewDoctor({
          firstName: '', lastName: '', nationalId: '', phoneNumber: '',
          gender: 'male', dateOfBirth: '', address: '', governorate: '', city: '',
          medicalLicenseNumber: '', specialization: '', subSpecialization: '',
          yearsOfExperience: '', hospitalAffiliation: '', availableDays: [], consultationFee: ''
        });
        
        loadDoctors();
        loadStatistics();
        logAuditAction('ADD_DOCTOR', `تم إضافة طبيب جديد: ${payload.person.firstName} ${payload.person.lastName}`);
      } else {
        openModal('error', 'خطأ', data.message || 'حدث خطأ أثناء إضافة الطبيب');
      }
    } catch (error) {
      console.error('Error adding doctor:', error);
      openModal('error', 'خطأ', 'حدث خطأ في الاتصال بالخادم');
    } finally {
      setAddDoctorLoading(false);
    }
  };

  const handleDayToggle = (day) => {
    setNewDoctor(prev => ({
      ...prev,
      availableDays: prev.availableDays.includes(day)
        ? prev.availableDays.filter(d => d !== day)
        : [...prev.availableDays, day]
    }));
  };

  // ═══════════════════════════════════════════════════════════════
  // NEW: DOCTOR REQUEST ACTIONS
  // ═══════════════════════════════════════════════════════════════

  const handleViewRequest = (request) => {
    setSelectedRequest(request);
    setShowRequestDetails(true);
  };

const handleAcceptRequest = async () => {
  if (!selectedRequest) return;

  setProcessingRequest(true);

  try {
    const token = localStorage.getItem('token');
    const res = await fetch(`http://localhost:5000/api/admin/doctor-requests/${selectedRequest._id}/accept`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        adminNotes: ''  // ← فقط adminNotes!
      })
    });

    const data = await res.json();
    console.log('📥 Backend response:', data);

    if (data.success) {
      // ✅ عرض بيانات الدخول من Backend
      setGeneratedCredentials({
        email: data.data.email,      // ← من Backend (signup email)
        password: data.data.password, // ← من Backend (signup password plaintext)
        doctorName: data.data.doctorName
      });
      
      setShowAcceptConfirm(false);
      setShowRequestDetails(false);
      
      loadDoctorRequests();
      loadStatistics();
      logAuditAction('ACCEPT_DOCTOR_REQUEST', `تم قبول طلب تسجيل الطبيب: ${selectedRequest.personalInfo?.firstName} ${selectedRequest.personalInfo?.lastName}`);
    } else {
      openModal('error', 'خطأ', data.message || 'حدث خطأ أثناء قبول الطلب');
    }
  } catch (error) {
    console.error('❌ Error accepting request:', error);
    openModal('error', 'خطأ', 'حدث خطأ في الاتصال بالخادم');
  } finally {
    setProcessingRequest(false);
  }
};


const handleRejectRequest = async () => {
  if (!selectedRequest || !rejectReason) {
    openModal('error', 'خطأ', 'الرجاء اختيار سبب الرفض');
    return;
  }

  setProcessingRequest(true);

  try {
    const token = localStorage.getItem('token');
    const res = await fetch(`http://localhost:5000/api/admin/doctor-requests/${selectedRequest._id}/reject`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        rejectionReason: rejectReason,  // ← ✅ غيّرنا من reason
        adminNotes: rejectNotes         // ← ✅ غيّرنا من notes
      })
    });

    const data = await res.json();

    if (data.success) {
      openModal('success', 'تم الرفض', 'تم رفض طلب التسجيل بنجاح');
      setShowRejectModal(false);
      setShowRequestDetails(false);
      setRejectReason('');
      setRejectNotes('');
      
      loadDoctorRequests();
      loadStatistics();
      logAuditAction('REJECT_DOCTOR_REQUEST', `تم رفض طلب تسجيل الطبيب: ${selectedRequest.personalInfo?.firstName} ${selectedRequest.personalInfo?.lastName} - السبب: ${rejectReason}`);
    } else {
      openModal('error', 'خطأ', data.message || 'حدث خطأ أثناء رفض الطلب');
    }
  } catch (error) {
    console.error('Error rejecting request:', error);
    openModal('error', 'خطأ', 'حدث خطأ في الاتصال بالخادم');
  } finally {
    setProcessingRequest(false);
  }
};

  // ============================================
  // DEACTIVATION
  // ============================================

  const handleDeactivate = (target, type) => {
    setDeactivateTarget(target);
    setDeactivateType(type);
    setDeactivateReason('');
    setDeactivateNotes('');
    setShowDeactivateModal(true);
  };

  const confirmDeactivation = async () => {
    if (!deactivateReason) {
      openModal('error', 'خطأ', 'الرجاء اختيار سبب إلغاء التفعيل');
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const endpoint = deactivateType === 'doctor' 
        ? `http://localhost:5000/api/admin/doctors/${deactivateTarget._id}/deactivate`
        : `http://localhost:5000/api/admin/patients/${deactivateTarget._id}/deactivate`;
      
      const res = await fetch(endpoint, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          reason: deactivateReason,
          notes: deactivateNotes
        })
      });

      const data = await res.json();

      if (data.success) {
        openModal('success', 'تم إلغاء التفعيل', `تم إلغاء تفعيل ${deactivateType === 'doctor' ? 'الطبيب' : 'المريض'} بنجاح`);
        setShowDeactivateModal(false);
        setShowDoctorDetails(false);
        setShowPatientDetails(false);
        
        if (deactivateType === 'doctor') {
          loadDoctors();
        } else {
          loadPatients();
        }
        loadStatistics();
        
        const targetName = `${deactivateTarget.firstName} ${deactivateTarget.lastName}`;
        logAuditAction('DEACTIVATE_ACCOUNT', `تم إلغاء تفعيل ${deactivateType === 'doctor' ? 'طبيب' : 'مريض'}: ${targetName} - السبب: ${deactivateReason}`);
      } else {
        openModal('error', 'خطأ', data.message || 'حدث خطأ أثناء إلغاء التفعيل');
      }
    } catch (error) {
      console.error('Error deactivating account:', error);
      openModal('error', 'خطأ', 'حدث خطأ في الاتصال بالخادم');
    }
  };

  const handleReactivate = async (target, type) => {
    try {
      const token = localStorage.getItem('token');
      const endpoint = type === 'doctor' 
        ? `http://localhost:5000/api/admin/doctors/${target._id}/reactivate`
        : `http://localhost:5000/api/admin/patients/${target._id}/reactivate`;
      
      const res = await fetch(endpoint, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await res.json();

      if (data.success) {
        openModal('success', 'تم إعادة التفعيل', `تم إعادة تفعيل ${type === 'doctor' ? 'الطبيب' : 'المريض'} بنجاح`);
        
        if (type === 'doctor') {
          loadDoctors();
        } else {
          loadPatients();
        }
        loadStatistics();
        
        const targetName = `${target.firstName} ${target.lastName}`;
        logAuditAction('REACTIVATE_ACCOUNT', `تم إعادة تفعيل ${type === 'doctor' ? 'طبيب' : 'مريض'}: ${targetName}`);
      } else {
        openModal('error', 'خطأ', data.message || 'حدث خطأ أثناء إعادة التفعيل');
      }
    } catch (error) {
      console.error('Error reactivating account:', error);
      openModal('error', 'خطأ', 'حدث خطأ في الاتصال بالخادم');
    }
  };

  // ============================================
  // LOGOUT
  // ============================================

  const handleLogout = () => {
    logAuditAction('LOGOUT', 'تسجيل خروج المسؤول');
    authAPI.logout();
    navigate('/');
  };

  // ============================================
  // FILTER FUNCTIONS
  // ============================================

  const filteredDoctors = doctors.filter(doctor => {
    const matchesSearch = 
      doctor.firstName?.toLowerCase().includes(doctorSearchTerm.toLowerCase()) ||
      doctor.lastName?.toLowerCase().includes(doctorSearchTerm.toLowerCase()) ||
      doctor.medicalLicenseNumber?.toLowerCase().includes(doctorSearchTerm.toLowerCase()) ||
      doctor.nationalId?.includes(doctorSearchTerm);
    
    const matchesFilter = 
      doctorFilter === 'all' ||
      (doctorFilter === 'active' && doctor.isActive !== false) ||
      (doctorFilter === 'inactive' && doctor.isActive === false);
    
    return matchesSearch && matchesFilter;
  });

  const filteredPatients = patients.filter(patient => {
    const matchesSearch = 
      patient.firstName?.toLowerCase().includes(patientSearchTerm.toLowerCase()) ||
      patient.lastName?.toLowerCase().includes(patientSearchTerm.toLowerCase()) ||
      patient.nationalId?.includes(patientSearchTerm);
    
    const matchesFilter = 
      patientFilter === 'all' ||
      (patientFilter === 'active' && patient.isActive !== false) ||
      (patientFilter === 'inactive' && patient.isActive === false);
    
    return matchesSearch && matchesFilter;
  });

  // ═══════════════════════════════════════════════════════════════
  // NEW: FILTER DOCTOR REQUESTS
  // ═══════════════════════════════════════════════════════════════
  const filteredRequests = doctorRequests.filter(request => {
    const matchesSearch = 
      request.personalInfo?.firstName?.toLowerCase().includes(requestSearchTerm.toLowerCase()) ||
      request.personalInfo?.lastName?.toLowerCase().includes(requestSearchTerm.toLowerCase()) ||
      request.doctorInfo?.medicalLicenseNumber?.toLowerCase().includes(requestSearchTerm.toLowerCase()) ||
      request.personalInfo?.nationalId?.includes(requestSearchTerm) ||
      request._id?.includes(requestSearchTerm);
    
    const matchesFilter = 
      requestFilter === 'all' ||
      request.requestInfo?.status === requestFilter;
    
    return matchesSearch && matchesFilter;
  });

  // ============================================
  // LOADING STATE
  // ============================================

  if (loading) {
    return (
      <div className="admin-loading-container">
        <div className="admin-loading-content">
          <div className="ministry-emblem">🏛️</div>
          <div className="loading-spinner-admin"></div>
          <h2>Patient 360°</h2>
          <p>جاري تحميل لوحة التحكم...</p>
        </div>
      </div>
    );
  }

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="admin-dashboard">
      <Navbar />
      
      <div className="admin-container">
        {/* Header */}
        <header className="admin-header">
          <div className="admin-header-content">
            <div className="ministry-badge">
              <span className="ministry-icon">🏛️</span>
              <div className="ministry-info">
                <h1>وزارة الصحة</h1>
                <p>الجمهورية العربية السورية</p>
              </div>
            </div>
            <div className="admin-title">
              <h2>لوحة تحكم المسؤول</h2>
              <p>Patient 360° - إدارة النظام الصحي</p>
            </div>
          </div>
          <div className="admin-user-section">
            <div className="admin-user-info">
              <span className="admin-avatar">👤</span>
              <div className="admin-user-details">
                <span className="admin-name">{admin?.firstName} {admin?.lastName}</span>
                <span className="admin-role">مسؤول النظام</span>
              </div>
            </div>
            <button className="logout-btn-admin" onClick={handleLogout}>
              <span>🚪</span> تسجيل الخروج
            </button>
          </div>
        </header>

        {/* Tabs Navigation */}
        <nav className="admin-tabs">
          <button 
            className={`admin-tab ${activeTab === 'statistics' ? 'active' : ''}`}
            onClick={() => handleTabChange('statistics')}
          >
            <span>📊</span> الإحصائيات
          </button>
          <button 
            className={`admin-tab ${activeTab === 'doctor_requests' ? 'active' : ''}`}
            onClick={() => handleTabChange('doctor_requests')}
          >
            <span>📋</span> طلبات الأطباء
            {statistics.pendingRequests > 0 && (
              <span className="tab-badge">{statistics.pendingRequests}</span>
            )}
          </button>
          <button 
            className={`admin-tab ${activeTab === 'doctors' ? 'active' : ''}`}
            onClick={() => handleTabChange('doctors')}
          >
            <span>👨‍⚕️</span> إدارة الأطباء
          </button>
          <button 
            className={`admin-tab ${activeTab === 'patients' ? 'active' : ''}`}
            onClick={() => handleTabChange('patients')}
          >
            <span>👥</span> إدارة المرضى
          </button>
          <button 
            className={`admin-tab ${activeTab === 'audit' ? 'active' : ''}`}
            onClick={() => handleTabChange('audit')}
          >
            <span>📜</span> سجل النظام
          </button>
        </nav>

        {/* Tab Content */}
        <div className="admin-content">
          {/* Statistics Tab */}
          {activeTab === 'statistics' && (
            <div className="statistics-section">
              <div className="stats-grid">
                <StatCard 
                  icon="👨‍⚕️" 
                  value={statistics.totalDoctors} 
                  label="إجمالي الأطباء"
                  sublabel={`${statistics.activeDoctors} نشط - ${statistics.inactiveDoctors} غير نشط`}
                  color="teal"
                  onClick={() => handleTabChange('doctors')}
                />
                <StatCard 
                  icon="👥" 
                  value={statistics.totalPatients} 
                  label="إجمالي المرضى"
                  sublabel={`${statistics.activePatients} نشط - ${statistics.inactivePatients} غير نشط`}
                  color="purple"
                  onClick={() => handleTabChange('patients')}
                />
                <StatCard 
                  icon="📋" 
                  value={statistics.pendingRequests} 
                  label="طلبات معلقة"
                  sublabel="طلبات تسجيل أطباء جديدة"
                  color="orange"
                  onClick={() => handleTabChange('doctor_requests')}
                  badge={statistics.pendingRequests > 0 ? 'جديد' : null}
                />
                <StatCard 
                  icon="🏥" 
                  value={statistics.totalVisits} 
                  label="إجمالي الزيارات"
                  sublabel={`${statistics.todayVisits} زيارة اليوم`}
                  color="green"
                />
              </div>
              
              {/* Quick Actions */}
              <div className="quick-actions-section">
                <h3>الإجراءات السريعة</h3>
                <div className="quick-actions-grid">
                  <button 
                    className="quick-action-btn"
                    onClick={() => { setShowAddDoctorForm(true); handleTabChange('doctors'); }}
                  >
                    <span className="action-icon">➕</span>
                    <span className="action-text">إضافة طبيب جديد</span>
                  </button>
                  <button 
                    className="quick-action-btn orange"
                    onClick={() => handleTabChange('doctor_requests')}
                  >
                    <span className="action-icon">📋</span>
                    <span className="action-text">مراجعة الطلبات</span>
                    {statistics.pendingRequests > 0 && (
                      <span className="action-badge">{statistics.pendingRequests}</span>
                    )}
                  </button>
                  <button 
                    className="quick-action-btn purple"
                    onClick={() => handleTabChange('audit')}
                  >
                    <span className="action-icon">📜</span>
                    <span className="action-text">سجل النظام</span>
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* ═══════════════════════════════════════════════════════════════
              NEW: DOCTOR REQUESTS TAB
              ═══════════════════════════════════════════════════════════════ */}
          {activeTab === 'doctor_requests' && (
            <div className="requests-section">
              <div className="section-header">
                <h3>
                  <span>📋</span> طلبات تسجيل الأطباء
                </h3>
                <p>مراجعة وإدارة طلبات تسجيل الأطباء الجدد</p>
              </div>

              {/* Search and Filter */}
              <div className="search-filter-bar">
                <div className="search-box">
                  <span className="search-icon">🔍</span>
                  <input
                    type="text"
                    placeholder="البحث بالاسم أو رقم الترخيص أو الرقم الوطني..."
                    value={requestSearchTerm}
                    onChange={(e) => setRequestSearchTerm(e.target.value)}
                  />
                </div>
                <div className="filter-buttons">
                  <button 
                    className={`filter-btn ${requestFilter === 'all' ? 'active' : ''}`}
                    onClick={() => setRequestFilter('all')}
                  >
                    الكل ({doctorRequests.length})
                  </button>
                  <button 
                    className={`filter-btn pending ${requestFilter === 'pending' ? 'active' : ''}`}
                    onClick={() => setRequestFilter('pending')}
                  >
                    ⏳ معلق ({doctorRequests.filter(r => r.requestInfo?.status === 'pending').length})
                  </button>
                  <button 
                    className={`filter-btn accepted ${requestFilter === 'accepted' ? 'active' : ''}`}
                    onClick={() => setRequestFilter('accepted')}
                  >
                    ✅ مقبول ({doctorRequests.filter(r => r.requestInfo?.status === 'accepted').length})
                  </button>
                  <button 
                    className={`filter-btn rejected ${requestFilter === 'rejected' ? 'active' : ''}`}
                    onClick={() => setRequestFilter('rejected')}
                  >
                    ❌ مرفوض ({doctorRequests.filter(r => r.requestInfo?.status === 'rejected').length})
                  </button>
                </div>
              </div>

              {/* Requests List */}
              {requestsLoading ? (
                <div className="loading-state">
                  <div className="loading-spinner"></div>
                  <p>جاري تحميل الطلبات...</p>
                </div>
              ) : filteredRequests.length === 0 ? (
                <div className="empty-state">
                  <span className="empty-icon">📭</span>
                  <h4>لا توجد طلبات</h4>
                  <p>لا توجد طلبات تسجيل مطابقة للبحث</p>
                </div>
              ) : (
                <div className="requests-table-container">
                  <table className="admin-table requests-table">
                    <thead>
                      <tr>
                        <th>رقم الطلب</th>
                        <th>الاسم</th>
                        <th>التخصص</th>
                        <th>رقم الترخيص</th>
                        <th>تاريخ الطلب</th>
                        <th>الحالة</th>
                        <th>الإجراءات</th>
                      </tr>
                    </thead>
                   
                      {filteredRequests.map((request) => {
                        const specInfo = getSpecializationInfo(request.doctorInfo?.specialization);
                        return (
                          <tr key={request._id} className={`status-${request.requestInfo?.status}`}>
                            <td className="request-id">{request.requestId || request._id.slice(-8)}</td>
                            <td className="name-cell">
                              <div className="name-info">
                                <span className="full-name">{request.personalInfo?.firstName} {request.personalInfo?.lastName}</span>
                                <span className="national-id">{request.personalInfo?.nationalId}</span>
                              </div>
                            </td>
                            <td>
                              <span className="specialization-badge">
                                <span className="spec-icon">{specInfo.icon}</span>
                                {specInfo.nameAr}
                                {specInfo.hasECG && <span className="ecg-badge">ECG AI</span>}
                              </span>
                            </td>
                            <td className="license-cell">{request.doctorInfo?.medicalLicenseNumber}</td>
                            <td className="date-cell">{formatDate(request.requestInfo?.submittedAt)}</td>
                            <td>
                              <span className={`status-badge status-${request.requestInfo?.status}`}>
                                {request.requestInfo?.status === 'pending' && '⏳ قيد المراجعة'}
                                {request.requestInfo?.status === 'accepted' && '✅ مقبول'}
                                {request.requestInfo?.status === 'rejected' && '❌ مرفوض'}
                              </span>
                            </td>
                            <td className="actions-cell">
                              <button 
                                className="action-btn view"
                                onClick={() => handleViewRequest(request)}
                                title="عرض التفاصيل"
                              >
                                👁️
                              </button>
                              {request.requestInfo?.status === 'pending' && (
                                <>
                                  <button 
                                    className="action-btn accept"
                                    onClick={() => {
                                      setSelectedRequest(request);
                                      setShowAcceptConfirm(true);
                                    }}
                                    title="قبول الطلب"
                                  >
                                    ✅
                                  </button>
                                  <button 
                                    className="action-btn reject"
                                    onClick={() => {
                                      setSelectedRequest(request);
                                      setShowRejectModal(true);
                                    }}
                                    title="رفض الطلب"
                                  >
                                    ❌
                                  </button>
                                </>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Doctors Tab */}
          {activeTab === 'doctors' && (
            <div className="doctors-section">
              <div className="section-header">
                <h3>
                  <span>👨‍⚕️</span> إدارة الأطباء
                </h3>
                <button 
                  className="add-btn"
                  onClick={() => setShowAddDoctorForm(true)}
                >
                  <span>➕</span> إضافة طبيب جديد
                </button>
              </div>

              {/* Search and Filter */}
              <div className="search-filter-bar">
                <div className="search-box">
                  <span className="search-icon">🔍</span>
                  <input
                    type="text"
                    placeholder="البحث بالاسم أو رقم الترخيص أو الرقم الوطني..."
                    value={doctorSearchTerm}
                    onChange={(e) => setDoctorSearchTerm(e.target.value)}
                  />
                </div>
                <div className="filter-buttons">
                  <button 
                    className={`filter-btn ${doctorFilter === 'all' ? 'active' : ''}`}
                    onClick={() => setDoctorFilter('all')}
                  >
                    الكل
                  </button>
                  <button 
                    className={`filter-btn ${doctorFilter === 'active' ? 'active' : ''}`}
                    onClick={() => setDoctorFilter('active')}
                  >
                    نشط
                  </button>
                  <button 
                    className={`filter-btn ${doctorFilter === 'inactive' ? 'active' : ''}`}
                    onClick={() => setDoctorFilter('inactive')}
                  >
                    غير نشط
                  </button>
                </div>
              </div>

              {/* Doctors List */}
              {doctorsLoading ? (
                <div className="loading-state">
                  <div className="loading-spinner"></div>
                  <p>جاري تحميل الأطباء...</p>
                </div>
              ) : filteredDoctors.length === 0 ? (
                <div className="empty-state">
                  <span className="empty-icon">👨‍⚕️</span>
                  <h4>لا يوجد أطباء</h4>
                  <p>لا يوجد أطباء مطابقين للبحث</p>
                </div>
              ) : (
                <div className="table-container">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>الاسم</th>
                        <th>التخصص</th>
                        <th>رقم الترخيص</th>
                        <th>المستشفى</th>
                        <th>الحالة</th>
                        <th>الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredDoctors.map((doctor) => {
                        const specInfo = getSpecializationInfo(doctor.specialization);
                        return (
                          <tr key={doctor._id}>
                            <td className="name-cell">
                              <div className="name-info">
                                <span className="full-name">{doctor.firstName} {doctor.lastName}</span>
                                <span className="national-id">{doctor.nationalId}</span>
                              </div>
                            </td>
                            <td>
                              <span className="specialization-badge">
                                <span className="spec-icon">{specInfo.icon}</span>
                                {specInfo.nameAr}
                              </span>
                            </td>
                            <td>{doctor.medicalLicenseNumber}</td>
                            <td>{doctor.hospitalAffiliation}</td>
                            <td>
                              <span className={`status-badge ${doctor.isActive !== false ? 'active' : 'inactive'}`}>
                                {doctor.isActive !== false ? '✅ نشط' : '❌ غير نشط'}
                              </span>
                            </td>
                            <td className="actions-cell">
                              <button 
                                className="action-btn view"
                                onClick={() => { setSelectedDoctor(doctor); setShowDoctorDetails(true); }}
                              >
                                👁️
                              </button>
                              {doctor.isActive !== false ? (
                                <button 
                                  className="action-btn deactivate"
                                  onClick={() => handleDeactivate(doctor, 'doctor')}
                                >
                                  🚫
                                </button>
                              ) : (
                                <button 
                                  className="action-btn reactivate"
                                  onClick={() => handleReactivate(doctor, 'doctor')}
                                >
                                  ✅
                                </button>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Patients Tab */}
          {activeTab === 'patients' && (
            <div className="patients-section">
              <div className="section-header">
                <h3>
                  <span>👥</span> إدارة المرضى
                </h3>
              </div>

              {/* Search and Filter */}
              <div className="search-filter-bar">
                <div className="search-box">
                  <span className="search-icon">🔍</span>
                  <input
                    type="text"
                    placeholder="البحث بالاسم أو الرقم الوطني..."
                    value={patientSearchTerm}
                    onChange={(e) => setPatientSearchTerm(e.target.value)}
                  />
                </div>
                <div className="filter-buttons">
                  <button 
                    className={`filter-btn ${patientFilter === 'all' ? 'active' : ''}`}
                    onClick={() => setPatientFilter('all')}
                  >
                    الكل
                  </button>
                  <button 
                    className={`filter-btn ${patientFilter === 'active' ? 'active' : ''}`}
                    onClick={() => setPatientFilter('active')}
                  >
                    نشط
                  </button>
                  <button 
                    className={`filter-btn ${patientFilter === 'inactive' ? 'active' : ''}`}
                    onClick={() => setPatientFilter('inactive')}
                  >
                    غير نشط
                  </button>
                </div>
              </div>

              {/* Patients List */}
              {patientsLoading ? (
                <div className="loading-state">
                  <div className="loading-spinner"></div>
                  <p>جاري تحميل المرضى...</p>
                </div>
              ) : filteredPatients.length === 0 ? (
                <div className="empty-state">
                  <span className="empty-icon">👥</span>
                  <h4>لا يوجد مرضى</h4>
                  <p>لا يوجد مرضى مطابقين للبحث</p>
                </div>
              ) : (
                <div className="table-container">
                  <table className="admin-table">
                    <thead>
                      <tr>
                        <th>الاسم</th>
                        <th>الرقم الوطني</th>
                        <th>الجنس</th>
                        <th>رقم الهاتف</th>
                        <th>الحالة</th>
                        <th>الإجراءات</th>
                      </tr>
                    </thead>
                    <tbody>
                      {filteredPatients.map((patient) => (
                        <tr key={patient._id}>
                          <td className="name-cell">
                            <span className="full-name">{patient.firstName} {patient.lastName}</span>
                          </td>
                          <td>{patient.nationalId || patient.childId || '-'}</td>
                          <td>{patient.gender === 'male' ? 'ذكر' : 'أنثى'}</td>
                          <td>{patient.phoneNumber || '-'}</td>
                          <td>
                            <span className={`status-badge ${patient.isActive !== false ? 'active' : 'inactive'}`}>
                              {patient.isActive !== false ? '✅ نشط' : '❌ غير نشط'}
                            </span>
                          </td>
                          <td className="actions-cell">
                            <button 
                              className="action-btn view"
                              onClick={() => { setSelectedPatient(patient); setShowPatientDetails(true); }}
                            >
                              👁️
                            </button>
                            {patient.isActive !== false ? (
                              <button 
                                className="action-btn deactivate"
                                onClick={() => handleDeactivate(patient, 'patient')}
                              >
                                🚫
                              </button>
                            ) : (
                              <button 
                                className="action-btn reactivate"
                                onClick={() => handleReactivate(patient, 'patient')}
                              >
                                ✅
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          )}

          {/* Audit Log Tab */}
          {activeTab === 'audit' && (
            <div className="audit-section">
              <div className="section-header">
                <h3>
                  <span>📜</span> سجل النظام
                </h3>
                <button className="refresh-btn" onClick={loadAuditLogs}>
                  <span>🔄</span> تحديث
                </button>
              </div>

              {auditLoading ? (
                <div className="loading-state">
                  <div className="loading-spinner"></div>
                  <p>جاري تحميل السجلات...</p>
                </div>
              ) : auditLogs.length === 0 ? (
                <div className="empty-state">
                  <span className="empty-icon">📜</span>
                  <h4>لا توجد سجلات</h4>
                  <p>لم يتم تسجيل أي إجراءات بعد</p>
                </div>
              ) : (
                <div className="audit-logs-container">
                  {auditLogs.map((log, index) => (
                    <div key={index} className="audit-log-item">
                      <div className="log-icon">
                        {log.action?.includes('ADD') && '➕'}
                        {log.action?.includes('DEACTIVATE') && '🚫'}
                        {log.action?.includes('REACTIVATE') && '✅'}
                        {log.action?.includes('ACCEPT') && '✅'}
                        {log.action?.includes('REJECT') && '❌'}
                        {log.action?.includes('LOGOUT') && '🚪'}
                        {!log.action?.match(/ADD|DEACTIVATE|REACTIVATE|ACCEPT|REJECT|LOGOUT/) && '📋'}
                      </div>
                      <div className="log-content">
                        <p className="log-details">{log.details}</p>
                        <span className="log-time">{formatDateTime(log.timestamp)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* ═══════════════════════════════════════════════════════════════
          MODALS
          ═══════════════════════════════════════════════════════════════ */}

      {/* General Modal */}
      {modal.isOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className={`modal-icon ${modal.type}`}>
              {modal.type === 'success' && '✅'}
              {modal.type === 'error' && '❌'}
              {modal.type === 'info' && 'ℹ️'}
              {modal.type === 'warning' && '⚠️'}
            </div>
            <h3 className="modal-title">{modal.title}</h3>
            <p className="modal-message">{modal.message}</p>
            <button className="modal-button primary" onClick={closeModal}>
              حسناً
            </button>
          </div>
        </div>
      )}

      {/* Request Details Modal */}
      {showRequestDetails && selectedRequest && (
        <div className="modal-overlay" onClick={() => setShowRequestDetails(false)}>
          <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowRequestDetails(false)}>✕</button>
            
            <div className="request-details-header">
              <div className="request-info-main">
                <h2>تفاصيل طلب التسجيل</h2>
                <span className={`status-badge large status-${selectedRequest.requestInfo?.status}`}>
                  {selectedRequest.requestInfo?.status === 'pending' && '⏳ قيد المراجعة'}
                  {selectedRequest.requestInfo?.status === 'accepted' && '✅ تم القبول'}
                  {selectedRequest.requestInfo?.status === 'rejected' && '❌ مرفوض'}
                </span>
              </div>
              <p className="request-id-display">رقم الطلب: {selectedRequest.requestId || selectedRequest._id}</p>
            </div>

            <div className="request-details-grid">
              {/* Personal Info */}
              <div className="details-section">
                <h4><span>👤</span> المعلومات الشخصية</h4>
                <div className="details-row">
                  <span className="label">الاسم الكامل:</span>
                  <span className="value">{selectedRequest.personalInfo?.firstName} {selectedRequest.personalInfo?.lastName}</span>
                </div>
                <div className="details-row">
                  <span className="label">الرقم الوطني:</span>
                  <span className="value">{selectedRequest.personalInfo?.nationalId}</span>
                </div>
                <div className="details-row">
                  <span className="label">تاريخ الميلاد:</span>
                  <span className="value">{formatDate(selectedRequest.personalInfo?.dateOfBirth)}</span>
                </div>
                <div className="details-row">
                  <span className="label">الجنس:</span>
                  <span className="value">{selectedRequest.personalInfo?.gender === 'male' ? 'ذكر' : 'أنثى'}</span>
                </div>
                <div className="details-row">
                  <span className="label">رقم الهاتف:</span>
                  <span className="value">{selectedRequest.personalInfo?.phoneNumber}</span>
                </div>
                <div className="details-row">
                  <span className="label">البريد الإلكتروني:</span>
                  <span className="value">{selectedRequest.accountInfo?.email}</span>
                </div>
                <div className="details-row">
                  <span className="label">المحافظة:</span>
                  <span className="value">{getGovernorateName(selectedRequest.personalInfo?.governorate)}</span>
                </div>
                <div className="details-row">
                  <span className="label">العنوان:</span>
                  <span className="value">{selectedRequest.personalInfo?.address}</span>
                </div>
              </div>

              {/* Professional Info */}
              <div className="details-section">
                <h4><span>🏥</span> المعلومات المهنية</h4>
                <div className="details-row">
                  <span className="label">رقم الترخيص الطبي:</span>
                  <span className="value license">{selectedRequest.doctorInfo?.medicalLicenseNumber}</span>
                </div>
                <div className="details-row">
                  <span className="label">التخصص:</span>
                  <span className="value">
                    {(() => {
                      const spec = getSpecializationInfo(selectedRequest.doctorInfo?.specialization);
                      return (
                        <span className="specialization-display">
                          <span>{spec.icon}</span> {spec.nameAr}
                          {spec.hasECG && <span className="ecg-badge">ECG AI</span>}
                        </span>
                      );
                    })()}
                  </span>
                </div>
                {selectedRequest.subSpecialization && (
                  <div className="details-row">
                    <span className="label">التخصص الفرعي:</span>
                    <span className="value">{selectedRequest.subSpecialization}</span>
                  </div>
                )}
                <div className="details-row">
                  <span className="label">سنوات الخبرة:</span>
                  <span className="value">{selectedRequest.doctorInfo?.yearsOfExperience} سنة</span>
                </div>
                <div className="details-row">
                  <span className="label">المستشفى / المركز الصحي:</span>
                  <span className="value">{selectedRequest.doctorInfo?.hospitalAffiliation}</span>
                </div>
                <div className="details-row">
                  <span className="label">أيام العمل:</span>
                  <span className="value days-list">
                    {selectedRequest.availableDays?.map(day => {
                      const dayInfo = WEEKDAYS.find(d => d.id === day);
                      return <span key={day} className="day-tag">{dayInfo?.nameAr || day}</span>;
                    })}
                  </span>
                </div>
                <div className="details-row">
                  <span className="label">رسوم الكشف:</span>
                  <span className="value">{selectedRequest.doctorInfo?.consultationFee?.toLocaleString()} ل.س</span>
                </div>
              </div>

              {/* Documents */}
              <div className="details-section full-width">
                <h4><span>📄</span> الوثائق المرفقة</h4>
                <div className="documents-grid">
                  <div className="document-item">
                    <span className="doc-icon">📜</span>
                    <span className="doc-name">صورة الترخيص الطبي</span>
                    {selectedRequest.licenseDocumentUrl ? (
                      <a href={selectedRequest.licenseDocumentUrl} target="_blank" rel="noopener noreferrer" className="view-doc-btn">
                        عرض
                      </a>
                    ) : (
                      <span className="no-doc">غير مرفق</span>
                    )}
                  </div>
                  <div className="document-item">
                    <span className="doc-icon">🎓</span>
                    <span className="doc-name">شهادة الطب</span>
                    {selectedRequest.medicalCertificateUrl ? (
                      <a href={selectedRequest.medicalCertificateUrl} target="_blank" rel="noopener noreferrer" className="view-doc-btn">
                        عرض
                      </a>
                    ) : (
                      <span className="no-doc">غير مرفق</span>
                    )}
                  </div>
                  <div className="document-item">
                    <span className="doc-icon">📷</span>
                    <span className="doc-name">الصورة الشخصية</span>
                    {selectedRequest.profilePhotoUrl ? (
                      <a href={selectedRequest.profilePhotoUrl} target="_blank" rel="noopener noreferrer" className="view-doc-btn">
                        عرض
                      </a>
                    ) : (
                      <span className="no-doc">غير مرفقة</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Request Timeline */}
              <div className="details-section full-width">
                <h4><span>📅</span> تفاصيل الطلب</h4>
                <div className="details-row">
                  <span className="label">تاريخ تقديم الطلب:</span>
                  <span className="value">{formatDateTime(selectedRequest.requestInfo?.submittedAt)}</span>
                </div>
                {selectedRequest.reviewedAt && (
                  <div className="details-row">
                    <span className="label">تاريخ المراجعة:</span>
                    <span className="value">{formatDateTime(selectedRequest.reviewedAt)}</span>
                  </div>
                )}
                {selectedRequest.rejectionReason && (
                  <div className="details-row rejection">
                    <span className="label">سبب الرفض:</span>
                    <span className="value">{selectedRequest.rejectionReason}</span>
                  </div>
                )}
                {selectedRequest.additionalNotes && (
                  <div className="details-row">
                    <span className="label">ملاحظات إضافية:</span>
                    <span className="value">{selectedRequest.additionalNotes}</span>
                  </div>
                )}
              </div>
            </div>

            {/* Actions */}
            {selectedRequest.requestInfo?.status === 'pending' && (
              <div className="request-actions">
                <button 
                  className="action-button accept"
                  onClick={() => setShowAcceptConfirm(true)}
                >
                  <span>✅</span> قبول الطلب
                </button>
                <button 
                  className="action-button reject"
                  onClick={() => setShowRejectModal(true)}
                >
                  <span>❌</span> رفض الطلب
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Accept Confirmation Modal */}
      {showAcceptConfirm && selectedRequest && (
        <div className="modal-overlay" onClick={() => setShowAcceptConfirm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-icon success">✅</div>
            <h3 className="modal-title">تأكيد قبول الطلب</h3>
            <p className="modal-message">
              هل أنت متأكد من قبول طلب تسجيل الطبيب:<br />
              <strong>{selectedRequest.personalInfo?.firstName} {selectedRequest.personalInfo?.lastName}</strong>
            </p>
            <p className="modal-note">
              سيتم إنشاء حساب للطبيب وإرسال بيانات الدخول إلى بريده الإلكتروني.
            </p>
            <div className="modal-buttons">
              <button 
                className="modal-button secondary" 
                onClick={() => setShowAcceptConfirm(false)}
                disabled={processingRequest}
              >
                إلغاء
              </button>
              <button 
                className="modal-button primary"
                onClick={handleAcceptRequest}
                disabled={processingRequest}
              >
                {processingRequest ? 'جاري المعالجة...' : 'تأكيد القبول'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && selectedRequest && (
        <div className="modal-overlay" onClick={() => setShowRejectModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-icon error">❌</div>
            <h3 className="modal-title">رفض طلب التسجيل</h3>
            <p className="modal-message">
              رفض طلب تسجيل الطبيب:<br />
              <strong>{selectedRequest.personalInfo?.firstName} {selectedRequest.personalInfo?.lastName}</strong>
            </p>
            
            <div className="form-group">
              <label>سبب الرفض *</label>
              <select 
                value={rejectReason} 
                onChange={(e) => setRejectReason(e.target.value)}
                className="form-select"
              >
                <option value="">اختر سبب الرفض...</option>
                {REJECTION_REASONS.map(reason => (
                  <option key={reason.id} value={reason.id}>
                    {reason.icon} {reason.nameAr}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>ملاحظات إضافية</label>
              <textarea
                value={rejectNotes}
                onChange={(e) => setRejectNotes(e.target.value)}
                placeholder="أدخل أي ملاحظات إضافية..."
                rows={3}
                className="form-textarea"
              />
            </div>

            <div className="modal-buttons">
              <button 
                className="modal-button secondary" 
                onClick={() => {
                  setShowRejectModal(false);
                  setRejectReason('');
                  setRejectNotes('');
                }}
                disabled={processingRequest}
              >
                إلغاء
              </button>
              <button 
                className="modal-button danger"
                onClick={handleRejectRequest}
                disabled={processingRequest || !rejectReason}
              >
                {processingRequest ? 'جاري المعالجة...' : 'تأكيد الرفض'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Generated Credentials Modal */}
      {generatedCredentials && (
        <div className="modal-overlay">
          <div className="modal-content credentials-modal">
            <div className="modal-icon success">✅</div>
            <h3 className="modal-title">تم قبول الطلب بنجاح!</h3>
            <p className="modal-subtitle">
              تم إنشاء حساب للطبيب: <strong>{generatedCredentials.doctorName}</strong>
            </p>
            
            <div className="credentials-box">
              <h4>بيانات الدخول:</h4>
              <div className="credential-row">
                <span className="credential-label">البريد الإلكتروني:</span>
                <span className="credential-value">{generatedCredentials.email}</span>
                <button 
                  className="copy-btn"
                  onClick={() => navigator.clipboard.writeText(generatedCredentials.email)}
                >
                  📋
                </button>
              </div>
              <div className="credential-row">
                <span className="credential-label">كلمة المرور:</span>
                <span className="credential-value password">{generatedCredentials.password}</span>
                <button 
                  className="copy-btn"
                  onClick={() => navigator.clipboard.writeText(generatedCredentials.password)}
                >
                  📋
                </button>
              </div>
            </div>

            <div className="credentials-note">
              <span>⚠️</span>
              <p>يرجى نسخ هذه البيانات وإرسالها للطبيب. لن تظهر مرة أخرى.</p>
            </div>

            <button 
              className="modal-button primary"
              onClick={() => setGeneratedCredentials(null)}
            >
              تم، إغلاق
            </button>
          </div>
        </div>
      )}

      {/* Add Doctor Form Modal */}
      {showAddDoctorForm && (
        <div className="modal-overlay" onClick={() => setShowAddDoctorForm(false)}>
          <div className="modal-content large add-doctor-form" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowAddDoctorForm(false)}>✕</button>
            <h3 className="modal-title">
              <span>➕</span> إضافة طبيب جديد
            </h3>

            <div className="form-grid">
              {/* Personal Info Section */}
              <div className="form-section">
                <h4>المعلومات الشخصية</h4>
                
                <div className="form-row">
                  <div className="form-group">
                    <label>الاسم الأول *</label>
                    <input
                      type="text"
                      value={newDoctor.firstName}
                      onChange={(e) => setNewDoctor(prev => ({ ...prev, firstName: e.target.value }))}
                      placeholder="أدخل الاسم الأول"
                    />
                  </div>
                  <div className="form-group">
                    <label>الكنية *</label>
                    <input
                      type="text"
                      value={newDoctor.lastName}
                      onChange={(e) => setNewDoctor(prev => ({ ...prev, lastName: e.target.value }))}
                      placeholder="أدخل الكنية"
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>الرقم الوطني * (11 رقم)</label>
                    <input
                      type="text"
                      value={newDoctor.nationalId}
                      onChange={(e) => setNewDoctor(prev => ({ ...prev, nationalId: e.target.value.replace(/\D/g, '').slice(0, 11) }))}
                      placeholder="أدخل الرقم الوطني"
                      maxLength={11}
                    />
                  </div>
                  <div className="form-group">
                    <label>رقم الهاتف *</label>
                    <input
                      type="text"
                      value={newDoctor.phoneNumber}
                      onChange={(e) => setNewDoctor(prev => ({ ...prev, phoneNumber: e.target.value }))}
                      placeholder="مثال: 0999123456"
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>الجنس</label>
                    <select
                      value={newDoctor.gender}
                      onChange={(e) => setNewDoctor(prev => ({ ...prev, gender: e.target.value }))}
                    >
                      <option value="male">ذكر</option>
                      <option value="female">أنثى</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label>تاريخ الميلاد</label>
                    <input
                      type="date"
                      value={newDoctor.dateOfBirth}
                      onChange={(e) => setNewDoctor(prev => ({ ...prev, dateOfBirth: e.target.value }))}
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>المحافظة *</label>
                    <select
                      value={newDoctor.governorate}
                      onChange={(e) => setNewDoctor(prev => ({ ...prev, governorate: e.target.value }))}
                    >
                      <option value="">اختر المحافظة...</option>
                      {SYRIAN_GOVERNORATES.map(gov => (
                        <option key={gov.id} value={gov.id}>{gov.nameAr}</option>
                      ))}
                    </select>
                  </div>
                  <div className="form-group">
                    <label>المدينة</label>
                    <input
                      type="text"
                      value={newDoctor.city}
                      onChange={(e) => setNewDoctor(prev => ({ ...prev, city: e.target.value }))}
                      placeholder="أدخل اسم المدينة"
                    />
                  </div>
                </div>

                <div className="form-group full-width">
                  <label>عنوان العيادة *</label>
                  <input
                    type="text"
                    value={newDoctor.address}
                    onChange={(e) => setNewDoctor(prev => ({ ...prev, address: e.target.value }))}
                    placeholder="أدخل عنوان العيادة بالتفصيل"
                  />
                </div>
              </div>

              {/* Professional Info Section */}
              <div className="form-section">
                <h4>المعلومات المهنية</h4>
                
                <div className="form-row">
                  <div className="form-group">
                    <label>رقم الترخيص الطبي * (8-20 حرف/رقم)</label>
                    <input
                      type="text"
                      value={newDoctor.medicalLicenseNumber}
                      onChange={(e) => setNewDoctor(prev => ({ ...prev, medicalLicenseNumber: e.target.value.toUpperCase() }))}
                      placeholder="مثال: SY12345678"
                      maxLength={20}
                    />
                  </div>
                  <div className="form-group">
                    <label>التخصص *</label>
                    <select
                      value={newDoctor.specialization}
                      onChange={(e) => setNewDoctor(prev => ({ ...prev, specialization: e.target.value }))}
                    >
                      <option value="">اختر التخصص...</option>
                      {MEDICAL_SPECIALIZATIONS.map(spec => (
                        <option key={spec.id} value={spec.id}>
                          {spec.icon} {spec.nameAr}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>التخصص الفرعي (اختياري)</label>
                    <input
                      type="text"
                      value={newDoctor.subSpecialization}
                      onChange={(e) => setNewDoctor(prev => ({ ...prev, subSpecialization: e.target.value }))}
                      placeholder="مثال: جراحة القلب المفتوح"
                    />
                  </div>
                  <div className="form-group">
                    <label>سنوات الخبرة</label>
                    <input
                      type="number"
                      value={newDoctor.yearsOfExperience}
                      onChange={(e) => setNewDoctor(prev => ({ ...prev, yearsOfExperience: e.target.value }))}
                      min="0"
                      max="60"
                      placeholder="0"
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>المستشفى / المركز الصحي *</label>
                    <input
                      type="text"
                      value={newDoctor.hospitalAffiliation}
                      onChange={(e) => setNewDoctor(prev => ({ ...prev, hospitalAffiliation: e.target.value }))}
                      placeholder="أدخل اسم المستشفى أو المركز الصحي"
                    />
                  </div>
                  <div className="form-group">
                    <label>رسوم الكشف (ل.س)</label>
                    <input
                      type="number"
                      value={newDoctor.consultationFee}
                      onChange={(e) => setNewDoctor(prev => ({ ...prev, consultationFee: e.target.value }))}
                      min="0"
                      placeholder="0"
                    />
                  </div>
                </div>

                <div className="form-group full-width">
                  <label>أيام العمل * (اختر يوم واحد على الأقل)</label>
                  <div className="weekdays-grid">
                    {WEEKDAYS.map(day => (
                      <button
                        key={day.id}
                        type="button"
                        className={`weekday-btn ${newDoctor.availableDays.includes(day.id) ? 'selected' : ''}`}
                        onClick={() => handleDayToggle(day.id)}
                      >
                        {day.nameAr}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="form-actions">
              <button 
                className="cancel-btn"
                onClick={() => setShowAddDoctorForm(false)}
                disabled={addDoctorLoading}
              >
                إلغاء
              </button>
              <button 
                className="submit-btn"
                onClick={handleAddDoctor}
                disabled={addDoctorLoading}
              >
                {addDoctorLoading ? 'جاري الإضافة...' : '➕ إضافة الطبيب'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* New Doctor Credentials Modal */}
      {newDoctorCredentials && (
        <div className="modal-overlay">
          <div className="modal-content credentials-modal">
            <div className="modal-icon success">✅</div>
            <h3 className="modal-title">تمت إضافة الطبيب بنجاح!</h3>
            <p className="modal-subtitle">
              تم إنشاء حساب للطبيب: <strong>{newDoctorCredentials.doctorName}</strong>
            </p>
            
            <div className="credentials-box">
              <h4>بيانات الدخول:</h4>
              <div className="credential-row">
                <span className="credential-label">البريد الإلكتروني:</span>
                <span className="credential-value">{newDoctorCredentials.email}</span>
                <button 
                  className="copy-btn"
                  onClick={() => navigator.clipboard.writeText(newDoctorCredentials.email)}
                >
                  📋
                </button>
              </div>
              <div className="credential-row">
                <span className="credential-label">كلمة المرور:</span>
                <span className="credential-value password">{newDoctorCredentials.password}</span>
                <button 
                  className="copy-btn"
                  onClick={() => navigator.clipboard.writeText(newDoctorCredentials.password)}
                >
                  📋
                </button>
              </div>
            </div>

            <div className="credentials-note">
              <span>⚠️</span>
              <p>يرجى نسخ هذه البيانات وإرسالها للطبيب. لن تظهر مرة أخرى.</p>
            </div>

            <button 
              className="modal-button primary"
              onClick={() => {
                setNewDoctorCredentials(null);
                setShowAddDoctorForm(false);
              }}
            >
              تم، إغلاق
            </button>
          </div>
        </div>
      )}

      {/* Deactivate Modal */}
      {showDeactivateModal && deactivateTarget && (
        <div className="modal-overlay" onClick={() => setShowDeactivateModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <div className="modal-icon warning">🚫</div>
            <h3 className="modal-title">إلغاء تفعيل الحساب</h3>
            <p className="modal-message">
              إلغاء تفعيل حساب {deactivateType === 'doctor' ? 'الطبيب' : 'المريض'}:<br />
              <strong>{deactivateTarget.firstName} {deactivateTarget.lastName}</strong>
            </p>
            
            <div className="form-group">
              <label>سبب إلغاء التفعيل *</label>
              <select 
                value={deactivateReason} 
                onChange={(e) => setDeactivateReason(e.target.value)}
                className="form-select"
              >
                <option value="">اختر السبب...</option>
                {DEACTIVATION_REASONS.map(reason => (
                  <option key={reason.id} value={reason.id}>
                    {reason.icon} {reason.nameAr}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label>ملاحظات إضافية</label>
              <textarea
                value={deactivateNotes}
                onChange={(e) => setDeactivateNotes(e.target.value)}
                placeholder="أدخل أي ملاحظات إضافية..."
                rows={3}
                className="form-textarea"
              />
            </div>

            <div className="modal-buttons">
              <button 
                className="modal-button secondary" 
                onClick={() => setShowDeactivateModal(false)}
              >
                إلغاء
              </button>
              <button 
                className="modal-button danger"
                onClick={confirmDeactivation}
                disabled={!deactivateReason}
              >
                تأكيد إلغاء التفعيل
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Doctor Details Modal */}
      {showDoctorDetails && selectedDoctor && (
        <div className="modal-overlay" onClick={() => setShowDoctorDetails(false)}>
          <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowDoctorDetails(false)}>✕</button>
            <h3 className="modal-title">تفاصيل الطبيب</h3>
            
            <div className="details-grid">
              <div className="details-section">
                <h4><span>👤</span> المعلومات الشخصية</h4>
                <div className="details-row">
                  <span className="label">الاسم:</span>
                  <span className="value">{selectedDoctor.firstName} {selectedDoctor.lastName}</span>
                </div>
                <div className="details-row">
                  <span className="label">الرقم الوطني:</span>
                  <span className="value">{selectedDoctor.nationalId}</span>
                </div>
                <div className="details-row">
                  <span className="label">الجنس:</span>
                  <span className="value">{selectedDoctor.gender === 'male' ? 'ذكر' : 'أنثى'}</span>
                </div>
                <div className="details-row">
                  <span className="label">رقم الهاتف:</span>
                  <span className="value">{selectedDoctor.phoneNumber}</span>
                </div>
                <div className="details-row">
                  <span className="label">البريد الإلكتروني:</span>
                  <span className="value">{selectedDoctor.email}</span>
                </div>
              </div>

              <div className="details-section">
                <h4><span>🏥</span> المعلومات المهنية</h4>
                <div className="details-row">
                  <span className="label">رقم الترخيص:</span>
                  <span className="value">{selectedDoctor.medicalLicenseNumber}</span>
                </div>
                <div className="details-row">
                  <span className="label">التخصص:</span>
                  <span className="value">
                    {(() => {
                      const spec = getSpecializationInfo(selectedDoctor.specialization);
                      return `${spec.icon} ${spec.nameAr}`;
                    })()}
                  </span>
                </div>
                <div className="details-row">
                  <span className="label">المستشفى:</span>
                  <span className="value">{selectedDoctor.hospitalAffiliation}</span>
                </div>
                <div className="details-row">
                  <span className="label">سنوات الخبرة:</span>
                  <span className="value">{selectedDoctor.yearsOfExperience} سنة</span>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <span className={`status-badge ${selectedDoctor.isActive !== false ? 'active' : 'inactive'}`}>
                {selectedDoctor.isActive !== false ? '✅ نشط' : '❌ غير نشط'}
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Patient Details Modal */}
      {showPatientDetails && selectedPatient && (
        <div className="modal-overlay" onClick={() => setShowPatientDetails(false)}>
          <div className="modal-content large" onClick={(e) => e.stopPropagation()}>
            <button className="modal-close" onClick={() => setShowPatientDetails(false)}>✕</button>
            <h3 className="modal-title">تفاصيل المريض</h3>
            
            <div className="details-grid">
              <div className="details-section">
                <h4><span>👤</span> المعلومات الشخصية</h4>
                <div className="details-row">
                  <span className="label">الاسم:</span>
                  <span className="value">{selectedPatient.firstName} {selectedPatient.lastName}</span>
                </div>
                <div className="details-row">
                  <span className="label">الرقم الوطني:</span>
                  <span className="value">{selectedPatient.nationalId || selectedPatient.childId || '-'}</span>
                </div>
                <div className="details-row">
                  <span className="label">الجنس:</span>
                  <span className="value">{selectedPatient.gender === 'male' ? 'ذكر' : 'أنثى'}</span>
                </div>
                <div className="details-row">
                  <span className="label">تاريخ الميلاد:</span>
                  <span className="value">{formatDate(selectedPatient.dateOfBirth)}</span>
                </div>
                <div className="details-row">
                  <span className="label">رقم الهاتف:</span>
                  <span className="value">{selectedPatient.phoneNumber || '-'}</span>
                </div>
              </div>

              <div className="details-section">
                <h4><span>🏥</span> المعلومات الصحية</h4>
                <div className="details-row">
                  <span className="label">فصيلة الدم:</span>
                  <span className="value">{selectedPatient.bloodType || '-'}</span>
                </div>
                <div className="details-row">
                  <span className="label">الطول:</span>
                  <span className="value">{selectedPatient.height ? `${selectedPatient.height} سم` : '-'}</span>
                </div>
                <div className="details-row">
                  <span className="label">الوزن:</span>
                  <span className="value">{selectedPatient.weight ? `${selectedPatient.weight} كغ` : '-'}</span>
                </div>
              </div>
            </div>

            <div className="modal-footer">
              <span className={`status-badge ${selectedPatient.isActive !== false ? 'active' : 'inactive'}`}>
                {selectedPatient.isActive !== false ? '✅ نشط' : '❌ غير نشط'}
              </span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
