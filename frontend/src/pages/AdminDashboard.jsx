import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import '../styles/AdminDashboard.css';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [doctors, setDoctors] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  // New Doctor Form State
  const [newDoctor, setNewDoctor] = useState({
    firstName: '',
    lastName: '',
    nationalId: '',
    email: '',
    phoneNumber: '',
    medicalLicenseNumber: '',
    institution: '',
    password: '',
    autoGeneratePassword: true
  });

  // Edit Doctor State
  const [editingDoctor, setEditingDoctor] = useState(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);

  // Modal State
  const [modal, setModal] = useState({
    isOpen: false,
    type: '',
    title: '',
    message: '',
    onClose: null
  });

  // Statistics
  const [stats, setStats] = useState({
    totalDoctors: 0,
    activeDoctors: 0,
    newThisMonth: 0,
    totalPatients: 0
  });

  /**
   * Check if user is admin on mount
   */
  useEffect(() => {
    const user = JSON.parse(localStorage.getItem('currentUser') || 'null');
    
    if (!user || user.role !== 'admin') {
      navigate('/');
      return;
    }
    
    setCurrentUser(user);
    loadDoctors();
    calculateStats();
  }, [navigate]);

  /**
   * Load all doctors from localStorage
   */
  const loadDoctors = () => {
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const doctorsList = users.filter(u => u.role === 'doctor');
    setDoctors(doctorsList);
  };

  /**
   * Calculate statistics
   */
  const calculateStats = () => {
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const doctorsList = users.filter(u => u.role === 'doctor');
    const patientsList = users.filter(u => u.role === 'patient');
    
    const currentMonth = new Date().getMonth();
    const currentYear = new Date().getFullYear();
    
    const newThisMonth = doctorsList.filter(d => {
      if (!d.registrationDate) return false;
      const regDate = new Date(d.registrationDate);
      return regDate.getMonth() === currentMonth && regDate.getFullYear() === currentYear;
    }).length;

    setStats({
      totalDoctors: doctorsList.length,
      activeDoctors: doctorsList.length,
      newThisMonth: newThisMonth,
      totalPatients: patientsList.length
    });
  };

  /**
   * Generate random password
   */
  const generatePassword = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789@#$';
    let password = '';
    for (let i = 0; i < 12; i++) {
      password += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return password;
  };

  /**
   * Handle auto-generate password toggle
   */
  const handleAutoPasswordToggle = () => {
    const autoGen = !newDoctor.autoGeneratePassword;
    setNewDoctor({
      ...newDoctor,
      autoGeneratePassword: autoGen,
      password: autoGen ? generatePassword() : ''
    });
  };

  /**
   * Open modal
   */
  const openModal = (type, title, message, onClose = null) => {
    setModal({ isOpen: true, type, title, message, onClose });
  };

  /**
   * Close modal
   */
  const closeModal = () => {
    if (modal.onClose) {
      modal.onClose();
    }
    setModal({ isOpen: false, type: '', title: '', message: '', onClose: null });
  };

  /**
   * Validate form
   */
  const validateDoctorForm = () => {
    // Check required fields
    if (!newDoctor.firstName || !newDoctor.lastName || !newDoctor.nationalId || 
        !newDoctor.email || !newDoctor.phoneNumber || !newDoctor.medicalLicenseNumber || 
        !newDoctor.institution) {
      openModal('error', 'خطأ في البيانات', 'الرجاء ملء جميع الحقول المطلوبة');
      return false;
    }

    // Validate email format
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newDoctor.email)) {
      openModal('error', 'خطأ في البيانات', 'البريد الإلكتروني غير صحيح');
      return false;
    }

    // Validate national ID (should be 10 digits)
    if (newDoctor.nationalId.length !== 11 || !/^\d+$/.test(newDoctor.nationalId)) {
      openModal('error', 'خطأ في البيانات', 'الرقم الوطني يجب أن يكون 11 رقم');
      return false;
    }

    // Check if email already exists
    const users = JSON.parse(localStorage.getItem('users') || '[]');
    if (users.some(u => u.email === newDoctor.email)) {
      openModal('error', 'خطأ في البيانات', 'البريد الإلكتروني مسجل مسبقاً');
      return false;
    }

    // Check if national ID already exists
    if (users.some(u => u.nationalId === newDoctor.nationalId)) {
      openModal('error', 'خطأ في البيانات', 'الرقم الوطني مسجل مسبقاً');
      return false;
    }

    // Check if medical license already exists
    if (users.some(u => u.medicalLicenseNumber === newDoctor.medicalLicenseNumber)) {
      openModal('error', 'خطأ في البيانات', 'رقم الترخيص الطبي مسجل مسبقاً');
      return false;
    }

    return true;
  };

  /**
   * Handle create doctor
   */
  const handleCreateDoctor = async (e) => {
    e.preventDefault();
    
    if (!validateDoctorForm()) {
      return;
    }

    setIsLoading(true);

    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 800));

      const users = JSON.parse(localStorage.getItem('users') || '[]');

      // Create new doctor object
      const doctor = {
        id: Date.now(),
        email: newDoctor.email,
        password: newDoctor.autoGeneratePassword ? generatePassword() : newDoctor.password,
        role: 'doctor',
        firstName: newDoctor.firstName,
        lastName: newDoctor.lastName,
        nationalId: newDoctor.nationalId,
        phoneNumber: newDoctor.phoneNumber,
        medicalLicenseNumber: newDoctor.medicalLicenseNumber,
        institution: newDoctor.institution,
        specialization: 'أمراض القلب', // Fixed: All are cardiologists
        registrationDate: new Date().toISOString(),
        createdBy: currentUser.email,
        account: {
          isActive: true,
          createdAt: new Date().toISOString()
        }
      };

      // Save to localStorage
      users.push(doctor);
      localStorage.setItem('users', JSON.stringify(users));

      setIsLoading(false);

      // Show success modal with password
      openModal(
        'success',
        'تم إنشاء الحساب بنجاح! ✅',
        `تم إنشاء حساب الطبيب:\n\nالاسم: ${doctor.firstName} ${doctor.lastName}\nالبريد: ${doctor.email}\nكلمة المرور: ${doctor.password}\n\n⚠️ الرجاء حفظ كلمة المرور وإرسالها للطبيب`,
        () => {
          // Reset form
          setNewDoctor({
            firstName: '',
            lastName: '',
            nationalId: '',
            email: '',
            phoneNumber: '',
            medicalLicenseNumber: '',
            institution: '',
            password: '',
            autoGeneratePassword: true
          });
          loadDoctors();
          calculateStats();
          setActiveTab('manage');
        }
      );

      console.log('✅ Doctor created:', doctor);

    } catch (error) {
      setIsLoading(false);
      console.error('Error creating doctor:', error);
      openModal('error', 'خطأ في النظام', 'حدث خطأ أثناء إنشاء الحساب');
    }
  };

  /**
   * Handle edit doctor
   */
  const handleEditDoctor = (doctor) => {
    setEditingDoctor({...doctor});
    setIsEditModalOpen(true);
  };

  /**
   * Handle save edited doctor
   */
  const handleSaveEditedDoctor = () => {
    if (!editingDoctor) return;

    const users = JSON.parse(localStorage.getItem('users') || '[]');
    const doctorIndex = users.findIndex(u => u.id === editingDoctor.id);
    
    if (doctorIndex !== -1) {
      users[doctorIndex] = {
        ...users[doctorIndex],
        ...editingDoctor,
        updatedAt: new Date().toISOString(),
        updatedBy: currentUser.email
      };
      
      localStorage.setItem('users', JSON.stringify(users));
      loadDoctors();
      setIsEditModalOpen(false);
      setEditingDoctor(null);
      
      openModal('success', 'تم التحديث', 'تم تحديث بيانات الطبيب بنجاح');
    }
  };

  /**
   * Handle delete doctor
   */
  const handleDeleteDoctor = (doctorId) => {
    if (window.confirm('هل أنت متأكد من حذف حساب هذا الطبيب؟')) {
      const users = JSON.parse(localStorage.getItem('users') || '[]');
      const filteredUsers = users.filter(u => u.id !== doctorId);
      localStorage.setItem('users', JSON.stringify(filteredUsers));
      loadDoctors();
      calculateStats();
      openModal('success', 'تم الحذف', 'تم حذف حساب الطبيب بنجاح');
    }
  };

  /**
   * Handle logout
   */
  const handleLogout = () => {
    localStorage.removeItem('currentUser');
    navigate('/');
  };

  /**
   * Filter doctors based on search
   */
  const filteredDoctors = doctors.filter(doctor => {
    const searchLower = searchTerm.toLowerCase();
    return (
      doctor.firstName?.toLowerCase().includes(searchLower) ||
      doctor.lastName?.toLowerCase().includes(searchLower) ||
      doctor.email?.toLowerCase().includes(searchLower) ||
      doctor.nationalId?.includes(searchLower) ||
      doctor.medicalLicenseNumber?.includes(searchLower) ||
      doctor.institution?.toLowerCase().includes(searchLower)
    );
  });

  return (
    <div className="admin-dashboard">
      {/* Modal */}
      {modal.isOpen && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal-container" onClick={(e) => e.stopPropagation()}>
            <div className={`modal-header ${modal.type}`}>
              {modal.type === 'success' && <div className="modal-icon success-icon">✓</div>}
              {modal.type === 'error' && <div className="modal-icon error-icon">✕</div>}
              <h2 className="modal-title">{modal.title}</h2>
            </div>
            <div className="modal-body">
              <p className="modal-message" style={{ whiteSpace: 'pre-line' }}>{modal.message}</p>
            </div>
            <div className="modal-footer">
              <button className="modal-button primary" onClick={modal.onClose || closeModal}>
                حسناً
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Doctor Modal */}
      {isEditModalOpen && editingDoctor && (
        <div className="modal-overlay" onClick={() => setIsEditModalOpen(false)}>
          <div className="modal-container large" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header info">
              <h2 className="modal-title">تعديل بيانات الطبيب</h2>
            </div>
            <div className="modal-body">
              <div className="edit-form">
                <div className="form-row">
                  <div className="form-group">
                    <label>الاسم الأول</label>
                    <input
                      type="text"
                      value={editingDoctor.firstName}
                      onChange={(e) => setEditingDoctor({...editingDoctor, firstName: e.target.value})}
                      className="form-input"
                    />
                  </div>
                  <div className="form-group">
                    <label>اسم العائلة</label>
                    <input
                      type="text"
                      value={editingDoctor.lastName}
                      onChange={(e) => setEditingDoctor({...editingDoctor, lastName: e.target.value})}
                      className="form-input"
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>البريد الإلكتروني</label>
                    <input
                      type="email"
                      value={editingDoctor.email}
                      onChange={(e) => setEditingDoctor({...editingDoctor, email: e.target.value})}
                      className="form-input"
                      dir="ltr"
                    />
                  </div>
                  <div className="form-group">
                    <label>رقم الهاتف</label>
                    <input
                      type="tel"
                      value={editingDoctor.phoneNumber}
                      onChange={(e) => setEditingDoctor({...editingDoctor, phoneNumber: e.target.value})}
                      className="form-input"
                      dir="ltr"
                    />
                  </div>
                </div>

                <div className="form-row">
                  <div className="form-group">
                    <label>رقم الترخيص الطبي</label>
                    <input
                      type="text"
                      value={editingDoctor.medicalLicenseNumber}
                      onChange={(e) => setEditingDoctor({...editingDoctor, medicalLicenseNumber: e.target.value})}
                      className="form-input"
                      dir="ltr"
                    />
                  </div>
                  <div className="form-group">
                    <label>المؤسسة الطبية</label>
                    <input
                      type="text"
                      value={editingDoctor.institution}
                      onChange={(e) => setEditingDoctor({...editingDoctor, institution: e.target.value})}
                      className="form-input"
                    />
                  </div>
                </div>
              </div>
            </div>
            <div className="modal-footer">
              <button className="modal-button secondary" onClick={() => setIsEditModalOpen(false)}>
                إلغاء
              </button>
              <button className="modal-button primary" onClick={handleSaveEditedDoctor}>
                حفظ التغييرات
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="admin-header">
        <div className="header-content">
          <div className="header-left">
            <div className="logo-container">
              <div className="heart-pulse-container">
                <svg className="heart-pulse-svg" viewBox="0 0 50 25" xmlns="http://www.w3.org/2000/svg">
                  <defs>
                    <linearGradient id="pulseGradient" x1="0%" y1="0%" x2="100%" y2="0%">
                      <stop offset="0%" stopColor="#a23f97" stopOpacity="0.6"/>
                      <stop offset="50%" stopColor="#ff4444" stopOpacity="1"/>
                      <stop offset="100%" stopColor="#a23f97ff" stopOpacity="0.6"/>
                    </linearGradient>
                  </defs>
                  <path 
                    className="pulse-line" 
                    d="M2,12.5 Q6,12.5 8,8 T12,12.5 T16,8 T20,12.5 T24,8 T28,12.5 T32,8 T36,12.5 T40,8 T44,12.5 L48,12.5" 
                    fill="none" 
                    stroke="url(#pulseGradient)" 
                    strokeWidth="2"
                  />
                  <circle className="pulse-dot" cx="2" cy="12.5" r="2" fill="#ff4444"/>
                </svg>
              </div>
              <h1 className="logo-text">لوحة تحكم الإدارة</h1>
            </div>
          </div>
          
          <div className="header-right">
            <div className="user-info">
              <span className="user-name">{currentUser?.firstName} {currentUser?.lastName}</span>
              <span className="user-role">مسؤول النظام</span>
            </div>
            <button className="logout-button" onClick={handleLogout}>
              تسجيل الخروج
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="admin-main">
        {/* Statistics Cards */}
        <div className="stats-container">
          <div className="stat-card blue">
            <div className="stat-icon">👨‍⚕️</div>
            <div className="stat-details">
              <h3 className="stat-number">{stats.totalDoctors}</h3>
              <p className="stat-label">إجمالي الأطباء</p>
            </div>
          </div>

          <div className="stat-card green">
            <div className="stat-icon">✅</div>
            <div className="stat-details">
              <h3 className="stat-number">{stats.activeDoctors}</h3>
              <p className="stat-label">الأطباء النشطون</p>
            </div>
          </div>

          <div className="stat-card purple">
            <div className="stat-icon">📅</div>
            <div className="stat-details">
              <h3 className="stat-number">{stats.newThisMonth}</h3>
              <p className="stat-label">جديد هذا الشهر</p>
            </div>
          </div>

          <div className="stat-card orange">
            <div className="stat-icon">👥</div>
            <div className="stat-details">
              <h3 className="stat-number">{stats.totalPatients}</h3>
              <p className="stat-label">إجمالي المرضى</p>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="tabs-container">
          <div className="tabs">
            <button 
              className={`tab ${activeTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => setActiveTab('dashboard')}
            >
              📊 لوحة المعلومات
            </button>
            <button 
              className={`tab ${activeTab === 'create' ? 'active' : ''}`}
              onClick={() => setActiveTab('create')}
            >
              ➕ إنشاء حساب طبيب
            </button>
            <button 
              className={`tab ${activeTab === 'manage' ? 'active' : ''}`}
              onClick={() => setActiveTab('manage')}
            >
              📋 إدارة الأطباء
            </button>
          </div>
        </div>

        {/* Tab Content */}
        <div className="tab-content">
          {/* Dashboard Tab */}
          {activeTab === 'dashboard' && (
            <div className="dashboard-content">
              <div className="welcome-card">
                <h2>مرحباً، {currentUser?.firstName}! 👋</h2>
                <p>أنت تستخدم لوحة تحكم وزارة الصحة لإدارة حسابات الأطباء في نظام Patient 360°</p>
              </div>

              <div className="info-cards">
                <div className="info-card">
                  <div className="card-header">
                    <h3>إحصائيات النظام</h3>
                    <span className="card-icon">📈</span>
                  </div>
                  <div className="card-content">
                    <div className="info-item">
                      <span className="info-label">إجمالي الأطباء المسجلين:</span>
                      <span className="info-value">{stats.totalDoctors}</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">إجمالي المرضى المسجلين:</span>
                      <span className="info-value">{stats.totalPatients}</span>
                    </div>
                    <div className="info-item">
                      <span className="info-label">أطباء جدد هذا الشهر:</span>
                      <span className="info-value">{stats.newThisMonth}</span>
                    </div>
                  </div>
                </div>

                <div className="info-card">
                  <div className="card-header">
                    <h3>آخر النشاطات</h3>
                    <span className="card-icon">🔔</span>
                  </div>
                  <div className="card-content">
                    <div className="activity-item">
                      <span className="activity-icon">✅</span>
                      <span className="activity-text">النظام يعمل بشكل طبيعي</span>
                    </div>
                    <div className="activity-item">
                      <span className="activity-icon">👨‍⚕️</span>
                      <span className="activity-text">{stats.totalDoctors} طبيب مسجل</span>
                    </div>
                    <div className="activity-item">
                      <span className="activity-icon">👥</span>
                      <span className="activity-text">{stats.totalPatients} مريض مسجل</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Create Doctor Tab */}
          {activeTab === 'create' && (
            <div className="create-doctor-content">
              <div className="form-card">
                <div className="form-header">
                  <h2>إنشاء حساب طبيب جديد</h2>
                  <p>الرجاء إدخال جميع البيانات المطلوبة</p>
                </div>

                <form onSubmit={handleCreateDoctor}>
                  <div className="form-section">
                    <h3 className="section-title">المعلومات الشخصية</h3>
                    
                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">الاسم الأول <span className="required">*</span></label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="أحمد"
                          value={newDoctor.firstName}
                          onChange={(e) => setNewDoctor({...newDoctor, firstName: e.target.value})}
                          required
                          disabled={isLoading}
                        />
                      </div>

                      <div className="form-group">
                        <label className="form-label">اسم العائلة <span className="required">*</span></label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="محمد"
                          value={newDoctor.lastName}
                          onChange={(e) => setNewDoctor({...newDoctor, lastName: e.target.value})}
                          required
                          disabled={isLoading}
                        />
                      </div>
                    </div>

                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">الرقم الوطني <span className="required">*</span></label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="12345678901"
                          value={newDoctor.nationalId}
                          onChange={(e) => setNewDoctor({...newDoctor, nationalId: e.target.value})}
                          required
                          disabled={isLoading}
                          dir="ltr"
                          maxLength="11"
                        />
                        <small className="form-hint">11   رقم</small>
                      </div>

                      <div className="form-group">
                        <label className="form-label">رقم الهاتف <span className="required">*</span></label>
                        <input
                          type="tel"
                          className="form-input"
                          placeholder="+963933527091"
                          value={newDoctor.phoneNumber}
                          onChange={(e) => setNewDoctor({...newDoctor, phoneNumber: e.target.value})}
                          required
                          disabled={isLoading}
                          dir="ltr"
                        />
                      </div>
                    </div>
                  </div>

                  <div className="form-section">
                    <h3 className="section-title">المعلومات المهنية</h3>
                    
                    <div className="form-row">
                      <div className="form-group">
                        <label className="form-label">رقم الترخيص الطبي <span className="required">*</span></label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="MD12345678"
                          value={newDoctor.medicalLicenseNumber}
                          onChange={(e) => setNewDoctor({...newDoctor, medicalLicenseNumber: e.target.value})}
                          required
                          disabled={isLoading}
                          dir="ltr"
                        />
                        <small className="form-hint">رقم الترخيص من وزارة الصحة</small>
                      </div>

                      <div className="form-group">
                        <label className="form-label">المؤسسة الطبية <span className="required">*</span></label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="مشفى الأسد الجامعي"
                          value={newDoctor.institution}
                          onChange={(e) => setNewDoctor({...newDoctor, institution: e.target.value})}
                          required
                          disabled={isLoading}
                        />
                      </div>
                    </div>

                    <div className="info-box">
                      <span className="info-icon">ℹ️</span>
                      <span className="info-text">
                        جميع الأطباء في هذا النظام متخصصون في أمراض القلب
                      </span>
                    </div>
                  </div>

                  <div className="form-section">
                    <h3 className="section-title">معلومات الحساب</h3>
                    
                    <div className="form-group">
                      <label className="form-label">البريد الإلكتروني <span className="required">*</span></label>
                      <input
                        type="email"
                        className="form-input"
                        placeholder="doctor@example.com"
                        value={newDoctor.email}
                        onChange={(e) => setNewDoctor({...newDoctor, email: e.target.value})}
                        required
                        disabled={isLoading}
                        dir="ltr"
                      />
                      <small className="form-hint">سيستخدم للدخول إلى النظام</small>
                    </div>

                    <div className="form-group">
                      <div className="checkbox-group">
                        <input
                          type="checkbox"
                          id="autoPassword"
                          checked={newDoctor.autoGeneratePassword}
                          onChange={handleAutoPasswordToggle}
                          disabled={isLoading}
                        />
                        <label htmlFor="autoPassword">
                          توليد كلمة مرور تلقائية (موصى به)
                        </label>
                      </div>
                    </div>

                    {!newDoctor.autoGeneratePassword && (
                      <div className="form-group">
                        <label className="form-label">كلمة المرور <span className="required">*</span></label>
                        <input
                          type="text"
                          className="form-input"
                          placeholder="أدخل كلمة المرور"
                          value={newDoctor.password}
                          onChange={(e) => setNewDoctor({...newDoctor, password: e.target.value})}
                          required
                          disabled={isLoading}
                          dir="ltr"
                        />
                        <small className="form-hint">على الأقل 8 أحرف</small>
                      </div>
                    )}

                    {newDoctor.autoGeneratePassword && (
                      <div className="password-preview">
                        <label className="form-label">كلمة المرور المولدة:</label>
                        <div className="generated-password">
                          <code>{newDoctor.password || generatePassword()}</code>
                        </div>
                        <small className="form-hint">سيتم عرض كلمة المرور بعد الإنشاء</small>
                      </div>
                    )}
                  </div>

                  <div className="form-actions">
                    <button 
                      type="button" 
                      className="btn-secondary"
                      onClick={() => {
                        setNewDoctor({
                          firstName: '',
                          lastName: '',
                          nationalId: '',
                          email: '',
                          phoneNumber: '',
                          medicalLicenseNumber: '',
                          institution: '',
                          password: '',
                          autoGeneratePassword: true
                        });
                      }}
                      disabled={isLoading}
                    >
                      مسح النموذج
                    </button>
                    <button 
                      type="submit" 
                      className="btn-primary"
                      disabled={isLoading}
                    >
                      {isLoading ? 'جارٍ الإنشاء...' : '✅ إنشاء الحساب'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Manage Doctors Tab */}
          {activeTab === 'manage' && (
            <div className="manage-doctors-content">
              <div className="table-card">
                <div className="table-header">
                  <h2>إدارة الأطباء</h2>
                  <div className="search-box">
                    <input
                      type="text"
                      className="search-input"
                      placeholder="🔍 البحث بالاسم، البريد، الرقم الوطني..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                </div>

                <div className="table-container">
                  {filteredDoctors.length === 0 ? (
                    <div className="empty-state">
                      <div className="empty-icon">👨‍⚕️</div>
                      <h3>لا يوجد أطباء</h3>
                      <p>لم يتم العثور على أي أطباء مسجلين</p>
                    </div>
                  ) : (
                    <table className="doctors-table">
                      <thead>
                        <tr>
                          <th>الاسم الكامل</th>
                          <th>البريد الإلكتروني</th>
                          <th>الرقم الوطني</th>
                          <th>رقم الترخيص</th>
                          <th>المؤسسة</th>
                          <th>رقم الهاتف</th>
                          <th>تاريخ التسجيل</th>
                          <th>الإجراءات</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredDoctors.map(doctor => (
                          <tr key={doctor.id}>
                            <td className="doctor-name">
                              <div className="name-cell">
                                <span className="doctor-icon">👨‍⚕️</span>
                                <span>{doctor.firstName} {doctor.lastName}</span>
                              </div>
                            </td>
                            <td dir="ltr">{doctor.email}</td>
                            <td dir="ltr">{doctor.nationalId}</td>
                            <td dir="ltr">{doctor.medicalLicenseNumber}</td>
                            <td>{doctor.institution}</td>
                            <td dir="ltr">{doctor.phoneNumber}</td>
                            <td>{new Date(doctor.registrationDate).toLocaleDateString('ar-EG', {
                              year: 'numeric',
                              month: '2-digit',
                              day: '2-digit'
                            })}</td>
                            <td>
                              <div className="action-buttons">
                                <button 
                                  className="btn-edit"
                                  onClick={() => handleEditDoctor(doctor)}
                                  title="تعديل"
                                >
                                  ✏️
                                </button>
                                <button 
                                  className="btn-delete"
                                  onClick={() => handleDeleteDoctor(doctor.id)}
                                  title="حذف"
                                >
                                  🗑️
                                </button>
                              </div>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  )}
                </div>

                <div className="table-footer">
                  <p>إجمالي الأطباء: {filteredDoctors.length}</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;