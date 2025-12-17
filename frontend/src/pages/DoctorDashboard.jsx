// src/pages/DoctorDashboard.jsx
// ✅ REFACTORED VERSION - Uses service layer

import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Navbar from '../components/common/Navbar';

// ✅ CHANGE #1: Import services instead of using localStorage directly
import { getCurrentUser, logout as logoutService } from '../services/authService';
import { 
  getPatientById, 
  updatePatientMedicalData,
  getAllPatients 
} from '../services/patientService';

const DoctorDashboard = () => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [view, setView] = useState('dashboard');
  const [patients, setPatients] = useState([]);
  const [selectedPatient, setSelectedPatient] = useState(null);
  const [searchId, setSearchId] = useState('');
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [ecgFile, setEcgFile] = useState(null);
  const [aiDiagnosis, setAiDiagnosis] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  
  const [vitalSigns, setVitalSigns] = useState({
    bloodPressureSystolic: '',
    bloodPressureDiastolic: '',
    heartRate: '',
    spo2: '',
    bloodGlucose: '',
    temperature: '',
    weight: ''
  });
  
  const [doctorOpinion, setDoctorOpinion] = useState('');
  
  // Medications state
  const [medications, setMedications] = useState([]);
  const [newMedication, setNewMedication] = useState({
    medicationName: '',
    dosage: '',
    frequency: '',
    duration: ''
  });

  // ✅ CHANGE #2: Use service to get current user
  useEffect(() => {
    const loadUser = async () => {
      const currentUser = await getCurrentUser();
      
      if (!currentUser) {
        alert('يجب تسجيل الدخول أولاً');
        navigate('/');
        return;
      }
      
      if (currentUser.role !== 'doctor') {
        alert('غير مصرح لك بالوصول إلى هذه الصفحة');
        navigate('/');
        return;
      }
      
      setUser(currentUser);
      
      // Load all patients using service
      const result = await getAllPatients();
      if (result.success) {
        setPatients(result.patients);
      }
    };
    
    loadUser();
  }, [navigate]);

  // ✅ CHANGE #3: Use service for logout
  const handleLogout = async () => {
    const confirmed = window.confirm('هل أنت متأكد من رغبتك في تسجيل الخروج؟');
    if (confirmed) {
      await logoutService();
      alert('تم تسجيل الخروج بنجاح');
      navigate('/');
    }
  };

  // ✅ CHANGE #4: Use service to search patient
  const handleSearchPatient = async () => {
    if (!searchId.trim()) {
      alert('الرجاء إدخال الرقم الوطني للمريض');
      return;
    }
    
    setLoading(true);
    
    // Use service function instead of localStorage
    const result = await getPatientById(searchId, true); // true = search by nationalId
    
    setLoading(false);
    
    if (result.success) {
      const patient = result.patient;
      setSelectedPatient(patient);
      setVitalSigns(patient.vitalSigns || {
        bloodPressureSystolic: '',
        bloodPressureDiastolic: '',
        heartRate: '',
        spo2: '',
        bloodGlucose: '',
        temperature: '',
        weight: ''
      });
      setDoctorOpinion(patient.doctorOpinion || '');
      setMedications(patient.prescribedMedications || []);
      setView('patientDetail');
      setShowSearchModal(false);
      setSearchId('');
      
      // Refresh patients list
      const patientsResult = await getAllPatients();
      if (patientsResult.success) {
        setPatients(patientsResult.patients);
      }
    } else {
      alert(result.message);
    }
  };

  // Add medication to list
  const handleAddMedication = () => {
    if (!newMedication.medicationName || !newMedication.dosage || !newMedication.frequency || !newMedication.duration) {
      alert('الرجاء ملء جميع حقول الدواء');
      return;
    }

    setMedications([...medications, { ...newMedication }]);
    setNewMedication({
      medicationName: '',
      dosage: '',
      frequency: '',
      duration: ''
    });
  };

  // Remove medication from list
  const handleRemoveMedication = (index) => {
    const updatedMeds = medications.filter((_, i) => i !== index);
    setMedications(updatedMeds);
  };

  // ✅ CHANGE #5: Use service to save patient data
  const handleSavePatientData = async () => {
    if (!selectedPatient) {
      alert('يجب اختيار مريض أولاً');
      return;
    }
    
    // Validate vital signs
    if (!vitalSigns.bloodPressureSystolic || !vitalSigns.heartRate) {
      alert('يرجى إدخال العلامات الحيوية الأساسية (ضغط الدم ومعدل النبض)');
      return;
    }
    
    setSaving(true);
    
    // Prepare ECG results if file was uploaded
    const ecgResults = ecgFile ? {
      fileName: ecgFile.name,
      uploadDate: new Date().toISOString(),
      heartRate: parseInt(vitalSigns.heartRate) || 0,
      rhythm: "Sinus Rhythm",
      prInterval: "160 ms",
      qrsDuration: "90 ms",
      qtInterval: "380 ms",
      axis: "Normal Axis",
      findings: aiDiagnosis || "تم رفع ملف ECG - في انتظار التحليل",
      interpretation: aiDiagnosis ? "تم التحليل بواسطة الذكاء الاصطناعي" : "قيد المراجعة"
    } : null;

    // Prepare AI prediction based on vital signs and diagnosis
    const aiPrediction = (vitalSigns.bloodPressureSystolic || aiDiagnosis) ? {
      riskLevel: getRiskLevel(vitalSigns),
      riskScore: calculateRiskScore(vitalSigns),
      predictions: {
        heartDisease: calculateHeartDiseaseRisk(vitalSigns),
        diabetes: calculateDiabetesRisk(vitalSigns),
        hypertension: calculateHypertensionRisk(vitalSigns),
        stroke: calculateStrokeRisk(vitalSigns)
      },
      recommendations: generateRecommendations(vitalSigns, doctorOpinion),
      modelConfidence: 85,
      analysisDate: new Date().toISOString()
    } : null;
    
    // Prepare medical data
    const medicalData = {
      vitalSigns,
      doctorOpinion,
      ecgResults,
      aiPrediction,
      prescribedMedications: medications,
      lastUpdatedBy: `د. ${user.firstName} ${user.lastName}`
    };
    
    // ✅ Use service function instead of localStorage
    const result = await updatePatientMedicalData(
      selectedPatient.nationalId,
      medicalData
    );
    
    setSaving(false);
    
    if (result.success) {
      alert('تم حفظ البيانات بنجاح ✅');
      setSelectedPatient(result.patient);
      
      // Refresh patients list
      const patientsResult = await getAllPatients();
      if (patientsResult.success) {
        setPatients(patientsResult.patients);
      }
    } else {
      alert('خطأ: ' + result.message);
    }
  };

  // Helper functions for risk calculation
  const getRiskLevel = (vitals) => {
    const systolic = parseInt(vitals.bloodPressureSystolic) || 0;
    const glucose = parseInt(vitals.bloodGlucose) || 0;
    
    if (systolic > 140 || glucose > 126) return "مرتفع";
    if (systolic > 130 || glucose > 100) return "متوسط";
    return "منخفض";
  };

  const calculateRiskScore = (vitals) => {
    let score = 0;
    const systolic = parseInt(vitals.bloodPressureSystolic) || 0;
    const diastolic = parseInt(vitals.bloodPressureDiastolic) || 0;
    const heartRate = parseInt(vitals.heartRate) || 0;
    const glucose = parseInt(vitals.bloodGlucose) || 0;
    const spo2 = parseInt(vitals.spo2) || 0;

    if (systolic > 140 || diastolic > 90) score += 30;
    else if (systolic > 130 || diastolic > 85) score += 15;

    if (heartRate > 100 || heartRate < 60) score += 15;
    else if (heartRate > 90 || heartRate < 65) score += 8;

    if (glucose > 126) score += 25;
    else if (glucose > 100) score += 12;

    if (spo2 < 95) score += 20;
    else if (spo2 < 97) score += 10;

    return Math.min(score, 100);
  };

  const calculateHeartDiseaseRisk = (vitals) => {
    const systolic = parseInt(vitals.bloodPressureSystolic) || 0;
    const heartRate = parseInt(vitals.heartRate) || 0;
    let risk = 20;

    if (systolic > 140) risk += 25;
    else if (systolic > 130) risk += 15;

    if (heartRate > 100) risk += 20;
    else if (heartRate > 90) risk += 10;

    return Math.min(risk, 95);
  };

  const calculateDiabetesRisk = (vitals) => {
    const glucose = parseInt(vitals.bloodGlucose) || 0;
    let risk = 15;

    if (glucose > 126) risk += 40;
    else if (glucose > 100) risk += 20;

    return Math.min(risk, 90);
  };

  const calculateHypertensionRisk = (vitals) => {
    const systolic = parseInt(vitals.bloodPressureSystolic) || 0;
    const diastolic = parseInt(vitals.bloodPressureDiastolic) || 0;
    let risk = 25;

    if (systolic > 140 || diastolic > 90) risk += 50;
    else if (systolic > 130 || diastolic > 85) risk += 30;

    return Math.min(risk, 95);
  };

  const calculateStrokeRisk = (vitals) => {
    const systolic = parseInt(vitals.bloodPressureSystolic) || 0;
    let risk = 10;

    if (systolic > 160) risk += 30;
    else if (systolic > 140) risk += 15;

    return Math.min(risk, 80);
  };

  const generateRecommendations = (vitals, opinion) => {
    const recommendations = [];
    const systolic = parseInt(vitals.bloodPressureSystolic) || 0;
    const glucose = parseInt(vitals.bloodGlucose) || 0;
    const heartRate = parseInt(vitals.heartRate) || 0;
    const spo2 = parseInt(vitals.spo2) || 0;

    if (systolic > 130) {
      recommendations.push("متابعة ضغط الدم بشكل منتظم");
      recommendations.push("تقليل تناول الملح");
    }

    if (glucose > 100) {
      recommendations.push("مراقبة مستوى السكر في الدم");
      recommendations.push("اتباع نظام غذائي صحي");
    }

    if (heartRate > 90 || heartRate < 65) {
      recommendations.push("متابعة معدل ضربات القلب");
    }

    if (spo2 < 97) {
      recommendations.push("مراقبة مستوى الأكسجين");
    }

    recommendations.push("ممارسة الرياضة 30 دقيقة يومياً");
    recommendations.push("الالتزام بالأدوية الموصوفة");

    if (opinion && opinion.includes("متابعة")) {
      recommendations.push("المتابعة الدورية مع الطبيب");
    }

    return recommendations.slice(0, 4);
  };

  const handleEcgUpload = (e) => {
    const file = e.target.files[0];
    if (file && file.type === 'application/pdf') {
      setEcgFile(file);
    } else {
      alert('الرجاء اختيار ملف PDF فقط');
      e.target.value = '';
    }
  };

  const handleAiDiagnosis = () => {
    if (!ecgFile) {
      alert('الرجاء رفع ملف ECG أولاً');
      return;
    }
    
    setAiDiagnosis('جاري التحليل بواسطة الذكاء الاصطناعي...');
    setTimeout(() => {
      setAiDiagnosis('نتيجة التحليل الأولية: إيقاع طبيعي - ينصح بالمتابعة الدورية\n(ملاحظة: هذه نتيجة تجريبية - سيتم ربطها بنموذج الذكاء الاصطناعي لاحقاً)');
    }, 2000);
  };

  if (!user) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        height: '100vh', 
        fontFamily: 'Cairo, sans-serif',
        background: 'linear-gradient(135deg, #125c7a 0%, #a23f97 100%)',
        color: 'white',
        fontSize: '1.2rem'
      }}>
        جاري التحميل...
      </div>
    );
  }

  return (
    <div style={{ 
      minHeight: '100vh', 
      background: 'linear-gradient(135deg, #f5f7fa 0%, #ffffff 100%)',
      fontFamily: 'Cairo, sans-serif', 
      direction: 'rtl' 
    }}>
      <Navbar />
      
      <div style={{ paddingTop: '80px', paddingBottom: '40px', paddingLeft: '30px', paddingRight: '30px' }}>
        {/* Header Card */}
        <div style={{
          background: 'linear-gradient(135deg, #125c7a 0%, #a23f97 100%)',
          color: 'white',
          padding: '30px 40px',
          borderRadius: '16px',
          marginBottom: '40px',
          boxShadow: '0 10px 30px rgba(162, 63, 151, 0.2)',
          maxWidth: '1200px',
          margin: '0 auto 40px auto'
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '20px' }}>
            <div>
              <h1 style={{ 
                fontSize: '2rem', 
                marginBottom: '8px', 
                fontWeight: '700',
                textShadow: '0 2px 4px rgba(0,0,0,0.1)'
              }}>
                مرحباً د. {user.firstName} {user.lastName}
              </h1>
              <p style={{ fontSize: '1rem', opacity: 0.9, marginBottom: '5px' }}>
                {user.institution || 'المؤسسة الصحية'}
              </p>
              {user.specialization && (
                <span style={{ 
                  fontSize: '0.9rem', 
                  opacity: 0.85, 
                  backgroundColor: 'rgba(255,255,255,0.2)', 
                  padding: '4px 14px', 
                  borderRadius: '20px', 
                  display: 'inline-block', 
                  marginTop: '8px' 
                }}>
                  {user.specialization}
                </span>
              )}
            </div>
            <button
              onClick={handleLogout}
              style={{
                background: 'rgba(255,255,255,0.15)',
                color: 'white',
                border: '2px solid rgba(255,255,255,0.3)',
                padding: '12px 30px',
                borderRadius: '10px',
                fontSize: '1rem',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                fontFamily: 'Cairo, sans-serif',
                backdropFilter: 'blur(10px)'
              }}
              onMouseOver={(e) => {
                e.target.style.background = 'rgba(255,255,255,0.25)';
                e.target.style.borderColor = 'rgba(255,255,255,0.5)';
                e.target.style.transform = 'translateY(-2px)';
              }}
              onMouseOut={(e) => {
                e.target.style.background = 'rgba(255,255,255,0.15)';
                e.target.style.borderColor = 'rgba(255,255,255,0.3)';
                e.target.style.transform = 'translateY(0)';
              }}
            >
              تسجيل الخروج
            </button>
          </div>
        </div>

        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          {view === 'dashboard' ? (
            <>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', 
                gap: '25px', 
                marginBottom: '40px' 
              }}>
                <StatCard 
                  icon="👥" 
                  number={patients.length} 
                  label="إجمالي المرضى المسجلين" 
                  gradient="linear-gradient(135deg, #a23f97 0%, #c55db3 100%)"
                />
                <ActionCard
                  icon="🔍"
                  title="البحث عن مريض"
                  description="البحث باستخدام الرقم الوطني"
                  onClick={() => setShowSearchModal(true)}
                  color="#125c7a"
                />
              </div>

              <div style={{
                background: 'white',
                borderRadius: '16px',
                padding: '35px',
                boxShadow: '0 5px 20px rgba(18, 92, 122, 0.08)',
                border: '1px solid rgba(18, 92, 122, 0.1)'
              }}>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginBottom: '30px',
                  paddingBottom: '20px',
                  borderBottom: '2px solid rgba(18, 92, 122, 0.1)'
                }}>
                  <h2 style={{
                    fontSize: '1.8rem',
                    color: '#125c7a',
                    fontWeight: '700',
                    margin: 0
                  }}>
                    سجلات المرضى
                  </h2>
                  <span style={{
                    background: 'linear-gradient(135deg, #a23f97 0%, #c55db3 100%)',
                    color: 'white',
                    padding: '6px 16px',
                    borderRadius: '20px',
                    fontSize: '0.9rem',
                    fontWeight: '600'
                  }}>
                    {patients.length} مريض
                  </span>
                </div>
                
                {patients.length === 0 ? (
                  <div style={{
                    textAlign: 'center',
                    padding: '80px 20px'
                  }}>
                    <div style={{ 
                      fontSize: '5rem', 
                      marginBottom: '20px',
                      background: 'linear-gradient(135deg, #125c7a 0%, #a23f97 100%)',
                      WebkitBackgroundClip: 'text',
                      WebkitTextFillColor: 'transparent'
                    }}>
                      📋
                    </div>
                    <p style={{ 
                      fontSize: '1.3rem', 
                      marginBottom: '10px', 
                      fontWeight: '600', 
                      color: '#125c7a' 
                    }}>
                      لا توجد سجلات مرضى حالياً
                    </p>
                    <p style={{ fontSize: '1rem', color: '#5a7a8a' }}>
                      استخدم البحث للعثور على المرضى المسجلين في النظام
                    </p>
                  </div>
                ) : (
                  <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: '0' }}>
                      <thead>
                        <tr>
                          <TableHeader>الرقم الوطني</TableHeader>
                          <TableHeader>اسم المريض</TableHeader>
                          <TableHeader>تاريخ التسجيل</TableHeader>
                          <TableHeader>آخر تحديث</TableHeader>
                          <TableHeader align="center">إجراءات</TableHeader>
                        </tr>
                      </thead>
                      <tbody>
                        {patients.map((patient) => (
                          <tr key={patient.id} 
                              style={{
                                transition: 'all 0.3s ease',
                                borderBottom: '1px solid #f1f3f5'
                              }}
                              onMouseOver={(e) => {
                                e.currentTarget.style.background = 'linear-gradient(90deg, rgba(162,63,151,0.05) 0%, rgba(18,92,122,0.05) 100%)';
                              }}
                              onMouseOut={(e) => {
                                e.currentTarget.style.background = 'transparent';
                              }}
                          >
                            <td style={{ 
                              padding: '20px', 
                              fontSize: '1rem',
                              fontWeight: '600', 
                              color: '#125c7a'
                            }}>
                              {patient.nationalId}
                            </td>
                            <td style={{ 
                              padding: '20px',
                              fontSize: '1rem', 
                              color: '#2c3e50',
                              fontWeight: '500'
                            }}>
                              {patient.firstName} {patient.lastName}
                            </td>
                            <td style={{ 
                              padding: '20px',
                              fontSize: '0.95rem', 
                              color: '#5a7a8a' 
                            }}>
                              {new Date(patient.registrationDate).toLocaleDateString('ar-EG')}
                            </td>
                            <td style={{ 
                              padding: '20px',
                              fontSize: '0.95rem', 
                              color: '#5a7a8a' 
                            }}>
                              {patient.lastUpdated ? 
                                new Date(patient.lastUpdated).toLocaleDateString('ar-EG') : 
                                '-'
                              }
                            </td>
                            <td style={{ padding: '20px', textAlign: 'center' }}>
                              <button
                                onClick={() => {
                                  setSelectedPatient(patient);
                                  setVitalSigns(patient.vitalSigns || {
                                    bloodPressureSystolic: '',
                                    bloodPressureDiastolic: '',
                                    heartRate: '',
                                    spo2: '',
                                    bloodGlucose: '',
                                    temperature: '',
                                    weight: ''
                                  });
                                  setDoctorOpinion(patient.doctorOpinion || '');
                                  setMedications(patient.prescribedMedications || []);
                                  setView('patientDetail');
                                }}
                                style={{
                                  background: 'linear-gradient(135deg, #a23f97 0%, #8a3582 100%)',
                                  color: 'white',
                                  border: 'none',
                                  padding: '10px 24px',
                                  borderRadius: '8px',
                                  fontSize: '0.95rem',
                                  fontWeight: '600',
                                  cursor: 'pointer',
                                  transition: 'all 0.3s ease',
                                  fontFamily: 'Cairo, sans-serif'
                                }}
                                onMouseOver={(e) => {
                                  e.target.style.transform = 'translateY(-2px)';
                                  e.target.style.boxShadow = '0 8px 20px rgba(162,63,151,0.3)';
                                }}
                                onMouseOut={(e) => {
                                  e.target.style.transform = 'translateY(0)';
                                  e.target.style.boxShadow = 'none';
                                }}
                              >
                                عرض الملف
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </>
          ) : (
            <div>
              <button
                onClick={() => setView('dashboard')}
                style={{
                  background: 'white',
                  color: '#125c7a',
                  border: '2px solid rgba(18,92,122,0.2)',
                  padding: '12px 28px',
                  borderRadius: '10px',
                  fontSize: '1rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  marginBottom: '30px',
                  transition: 'all 0.3s ease',
                  fontFamily: 'Cairo, sans-serif',
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
                onMouseOver={(e) => {
                  e.target.style.background = 'linear-gradient(135deg, #f8fafb 0%, #ffffff 100%)';
                  e.target.style.transform = 'translateX(-3px)';
                }}
                onMouseOut={(e) => {
                  e.target.style.background = 'white';
                  e.target.style.transform = 'translateX(0)';
                }}
              >
                ← رجوع للقائمة
              </button>

              <PatientInfoCard patient={selectedPatient} />

              <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(500px, 1fr))',
                gap: '30px',
                marginBottom: '30px'
              }}>
                <ECGUploadSection
                  ecgFile={ecgFile}
                  handleEcgUpload={handleEcgUpload}
                  handleAiDiagnosis={handleAiDiagnosis}
                  aiDiagnosis={aiDiagnosis}
                />

                <DoctorOpinionSection 
                  doctorOpinion={doctorOpinion} 
                  setDoctorOpinion={setDoctorOpinion} 
                />
              </div>

              <VitalSignsSection vitalSigns={vitalSigns} setVitalSigns={setVitalSigns} />

              {/* Medications Section */}
              <MedicationsSection 
                medications={medications}
                newMedication={newMedication}
                setNewMedication={setNewMedication}
                handleAddMedication={handleAddMedication}
                handleRemoveMedication={handleRemoveMedication}
              />

              <div style={{ display: 'flex', justifyContent: 'center', marginTop: '40px' }}>
                <button
                  onClick={handleSavePatientData}
                  disabled={saving}
                  style={{
                    background: saving ? 
                      'linear-gradient(135deg, #9ca3af 0%, #6b7280 100%)' :
                      'linear-gradient(135deg, #a23f97 0%, #8a3582 100%)',
                    color: 'white',
                    border: 'none',
                    padding: '16px 50px',
                    borderRadius: '12px',
                    fontSize: '1.2rem',
                    fontWeight: '700',
                    cursor: saving ? 'not-allowed' : 'pointer',
                    transition: 'all 0.3s ease',
                    fontFamily: 'Cairo, sans-serif',
                    boxShadow: '0 10px 30px rgba(162, 63, 151, 0.3)'
                  }}
                  onMouseOver={(e) => {
                    if (!saving) {
                      e.target.style.transform = 'translateY(-3px)';
                      e.target.style.boxShadow = '0 15px 40px rgba(162, 63, 151, 0.4)';
                    }
                  }}
                  onMouseOut={(e) => {
                    if (!saving) {
                      e.target.style.transform = 'translateY(0)';
                      e.target.style.boxShadow = '0 10px 30px rgba(162, 63, 151, 0.3)';
                    }
                  }}
                >
                  {saving ? '⏳ جاري الحفظ...' : '💾 حفظ جميع البيانات'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {showSearchModal && (
        <SearchModal
          searchId={searchId}
          setSearchId={setSearchId}
          handleSearchPatient={handleSearchPatient}
          onClose={() => setShowSearchModal(false)}
          loading={loading}
        />
      )}
    </div>
  );
};

// Components (same as before)
const TableHeader = ({ children, align = 'right' }) => (
  <th style={{ 
    padding: '15px 20px', 
    textAlign: align, 
    fontSize: '0.95rem', 
    fontWeight: '600',
    color: '#5a7a8a',
    borderBottom: '2px solid #f1f3f5',
    background: '#f8fafb'
  }}>
    {children}
  </th>
);

const StatCard = ({ icon, number, label, gradient }) => (
  <div style={{
    background: gradient,
    color: 'white',
    padding: '30px',
    borderRadius: '12px',
    textAlign: 'center',
    transition: 'all 0.3s ease',
    cursor: 'default',
    boxShadow: '0 10px 30px rgba(162,63,151,0.2)'
  }}>
    <div style={{ 
      fontSize: '3rem', 
      marginBottom: '10px',
      filter: 'drop-shadow(0 0 20px rgba(255,255,255,0.3))'
    }}>
      {icon}
    </div>
    <div style={{ fontSize: '2.5rem', fontWeight: 'bold', marginBottom: '8px' }}>{number}</div>
    <div style={{ fontSize: '1rem', opacity: 0.95 }}>{label}</div>
  </div>
);

const ActionCard = ({ icon, title, description, onClick, color }) => (
  <button
    onClick={onClick}
    style={{
      background: 'white',
      border: `2px solid ${color}20`,
      padding: '30px',
      borderRadius: '12px',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      textAlign: 'center',
      fontFamily: 'Cairo, sans-serif',
      boxShadow: '0 5px 20px rgba(18, 92, 122, 0.08)',
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      gap: '12px',
      width: '100%'
    }}
    onMouseOver={(e) => {
      e.currentTarget.style.transform = 'translateY(-5px)';
      e.currentTarget.style.boxShadow = '0 15px 40px rgba(18, 92, 122, 0.15)';
      e.currentTarget.style.background = 'linear-gradient(135deg, #125c7a 0%, #a23f97 100%)';
      e.currentTarget.style.color = 'white';
      e.currentTarget.style.borderColor = 'transparent';
    }}
    onMouseOut={(e) => {
      e.currentTarget.style.transform = 'translateY(0)';
      e.currentTarget.style.boxShadow = '0 5px 20px rgba(18, 92, 122, 0.08)';
      e.currentTarget.style.background = 'white';
      e.currentTarget.style.color = 'inherit';
      e.currentTarget.style.borderColor = `${color}20`;
    }}
  >
    <div style={{ fontSize: '3rem' }}>{icon}</div>
    <h3 style={{ fontSize: '1.3rem', fontWeight: '700', margin: 0, color: color }}>{title}</h3>
    <p style={{ fontSize: '0.95rem', color: '#5a7a8a', margin: 0, lineHeight: '1.5' }}>{description}</p>
  </button>
);

const PatientInfoCard = ({ patient }) => (
  <div style={{
    background: 'white',
    borderRadius: '16px',
    padding: '35px',
    marginBottom: '30px',
    boxShadow: '0 5px 20px rgba(18, 92, 122, 0.08)',
    border: '1px solid rgba(18, 92, 122, 0.1)'
  }}>
    <h2 style={{
      fontSize: '1.8rem',
      color: '#125c7a',
      marginBottom: '25px',
      fontWeight: '700',
      paddingBottom: '15px',
      borderBottom: '2px solid rgba(18, 92, 122, 0.1)'
    }}>
      بيانات المريض
    </h2>
    <div style={{ 
      display: 'grid', 
      gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
      gap: '20px' 
    }}>
      <InfoField label="الرقم الوطني" value={patient?.nationalId} icon="🆔" />
      <InfoField label="الاسم الكامل" value={`${patient?.firstName} ${patient?.lastName}`} icon="👤" />
      <InfoField label="تاريخ الميلاد" value={patient?.dateOfBirth} icon="📅" />
      <InfoField label="الجنس" value={patient?.gender} icon="⚧" />
      <InfoField label="رقم الهاتف" value={patient?.phone} icon="📱" />
      <InfoField label="العنوان" value={patient?.address} icon="📍" />
    </div>
  </div>
);

const InfoField = ({ label, value, icon }) => (
  <div style={{
    background: 'linear-gradient(135deg, #f8fafb 0%, #ffffff 100%)',
    padding: '16px 20px',
    borderRadius: '10px',
    border: '1px solid rgba(18, 92, 122, 0.1)',
    transition: 'all 0.3s ease'
  }}
  onMouseOver={(e) => {
    e.currentTarget.style.borderColor = '#a23f97';
    e.currentTarget.style.transform = 'translateY(-2px)';
    e.currentTarget.style.boxShadow = '0 5px 15px rgba(162, 63, 151, 0.1)';
  }}
  onMouseOut={(e) => {
    e.currentTarget.style.borderColor = 'rgba(18, 92, 122, 0.1)';
    e.currentTarget.style.transform = 'translateY(0)';
    e.currentTarget.style.boxShadow = 'none';
  }}>
    <p style={{ 
      fontSize: '0.85rem', 
      color: '#5a7a8a', 
      marginBottom: '6px', 
      display: 'flex', 
      alignItems: 'center', 
      gap: '6px' 
    }}>
      <span style={{ fontSize: '1.1rem' }}>{icon}</span> {label}
    </p>
    <p style={{ fontSize: '1.1rem', fontWeight: '600', color: '#125c7a', margin: 0 }}>
      {value || '-'}
    </p>
  </div>
);

const ECGUploadSection = ({ ecgFile, handleEcgUpload, handleAiDiagnosis, aiDiagnosis }) => (
  <div style={{
    background: 'white',
    borderRadius: '16px',
    padding: '35px',
    boxShadow: '0 5px 20px rgba(18, 92, 122, 0.08)',
    border: '1px solid rgba(18, 92, 122, 0.1)',
    height: 'fit-content'
  }}>
    <h2 style={{
      fontSize: '1.5rem',
      color: '#125c7a',
      marginBottom: '25px',
      fontWeight: '700'
    }}>
      📈 تخطيط القلب (ECG)
    </h2>
    
    <label style={{ cursor: 'pointer', display: 'block', marginBottom: '20px' }}>
      <input
        type="file"
        accept=".pdf"
        onChange={handleEcgUpload}
        style={{ display: 'none' }}
      />
      <div style={{
        border: '2px dashed rgba(162, 63, 151, 0.3)',
        borderRadius: '12px',
        padding: '40px 20px',
        textAlign: 'center',
        transition: 'all 0.3s ease',
        background: 'linear-gradient(135deg, #f8fafb 0%, #ffffff 100%)'
      }}
      onMouseOver={(e) => {
        e.currentTarget.style.borderColor = '#a23f97';
        e.currentTarget.style.background = 'linear-gradient(135deg, rgba(162,63,151,0.05) 0%, rgba(18,92,122,0.05) 100%)';
      }}
      onMouseOut={(e) => {
        e.currentTarget.style.borderColor = 'rgba(162, 63, 151, 0.3)';
        e.currentTarget.style.background = 'linear-gradient(135deg, #f8fafb 0%, #ffffff 100%)';
      }}>
        <div style={{ fontSize: '3rem', marginBottom: '10px' }}>📄</div>
        <p style={{ fontSize: '1.1rem', color: '#125c7a', marginBottom: '5px', fontWeight: '600' }}>
          اضغط لرفع ملف ECG
        </p>
        <p style={{ fontSize: '0.9rem', color: '#5a7a8a' }}>PDF فقط</p>
        {ecgFile && (
          <div style={{
            marginTop: '15px',
            padding: '10px 20px',
            background: 'linear-gradient(135deg, #a23f97 0%, #c55db3 100%)',
            color: 'white',
            borderRadius: '8px',
            fontSize: '0.95rem',
            fontWeight: '600',
            display: 'inline-block'
          }}>
            ✓ {ecgFile.name}
          </div>
        )}
      </div>
    </label>

    <button
      onClick={handleAiDiagnosis}
      disabled={!ecgFile}
      style={{
        width: '100%',
        background: ecgFile ? 
          'linear-gradient(135deg, #125c7a 0%, #a23f97 100%)' : 
          'linear-gradient(135deg, #e5e7eb 0%, #f3f4f6 100%)',
        color: ecgFile ? 'white' : '#9ca3af',
        border: 'none',
        padding: '15px',
        borderRadius: '10px',
        fontSize: '1rem',
        fontWeight: '600',
        cursor: ecgFile ? 'pointer' : 'not-allowed',
        transition: 'all 0.3s ease',
        fontFamily: 'Cairo, sans-serif',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: '10px'
      }}
      onMouseOver={(e) => {
        if (ecgFile) {
          e.target.style.transform = 'translateY(-2px)';
          e.target.style.boxShadow = '0 10px 25px rgba(162, 63, 151, 0.3)';
        }
      }}
      onMouseOut={(e) => {
        if (ecgFile) {
          e.target.style.transform = 'translateY(0)';
          e.target.style.boxShadow = 'none';
        }
      }}
    >
      <span style={{ fontSize: '1.5rem' }}>🤖</span>
      تحليل بالذكاء الاصطناعي
    </button>
    
    {aiDiagnosis && (
      <div style={{
        marginTop: '20px',
        padding: '20px',
        background: 'linear-gradient(135deg, rgba(162,63,151,0.1) 0%, rgba(18,92,122,0.1) 100%)',
        border: '2px solid #a23f97',
        borderRadius: '10px'
      }}>
        <p style={{
          color: '#125c7a',
          fontSize: '1rem',
          lineHeight: '1.8',
          whiteSpace: 'pre-line',
          margin: 0,
          fontWeight: '500'
        }}>
          {aiDiagnosis}
        </p>
      </div>
    )}
  </div>
);

const VitalSignsSection = ({ vitalSigns, setVitalSigns }) => (
  <div style={{
    background: 'white',
    borderRadius: '16px',
    padding: '35px',
    marginBottom: '30px',
    boxShadow: '0 5px 20px rgba(18, 92, 122, 0.08)',
    border: '1px solid rgba(18, 92, 122, 0.1)'
  }}>
    <h2 style={{
      fontSize: '1.8rem',
      color: '#125c7a',
      marginBottom: '25px',
      fontWeight: '700',
      paddingBottom: '15px',
      borderBottom: '2px solid rgba(18, 92, 122, 0.1)'
    }}>
      العلامات الحيوية
    </h2>
    <div style={{ 
      display: 'grid', 
      gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
      gap: '20px' 
    }}>
      <VitalInput
        label="ضغط الدم (انقباضي)"
        value={vitalSigns.bloodPressureSystolic}
        onChange={(e) => setVitalSigns({...vitalSigns, bloodPressureSystolic: e.target.value})}
        unit="mmHg"
        placeholder="120"
        icon="🩺"
      />
      <VitalInput
        label="ضغط الدم (انبساطي)"
        value={vitalSigns.bloodPressureDiastolic}
        onChange={(e) => setVitalSigns({...vitalSigns, bloodPressureDiastolic: e.target.value})}
        unit="mmHg"
        placeholder="80"
        icon="🩺"
      />
      <VitalInput
        label="معدل ضربات القلب"
        value={vitalSigns.heartRate}
        onChange={(e) => setVitalSigns({...vitalSigns, heartRate: e.target.value})}
        unit="BPM"
        placeholder="72"
        icon="💓"
      />
      <VitalInput
        label="نسبة الأكسجين"
        value={vitalSigns.spo2}
        onChange={(e) => setVitalSigns({...vitalSigns, spo2: e.target.value})}
        unit="%"
        placeholder="98"
        icon="🫁"
      />
      <VitalInput
        label="مستوى السكر"
        value={vitalSigns.bloodGlucose}
        onChange={(e) => setVitalSigns({...vitalSigns, bloodGlucose: e.target.value})}
        unit="mg/dL"
        placeholder="100"
        icon="🩸"
      />
      <VitalInput
        label="درجة الحرارة"
        value={vitalSigns.temperature}
        onChange={(e) => setVitalSigns({...vitalSigns, temperature: e.target.value})}
        unit="°C"
        placeholder="37"
        icon="🌡️"
      />
      <VitalInput
        label="الوزن"
        value={vitalSigns.weight}
        onChange={(e) => setVitalSigns({...vitalSigns, weight: e.target.value})}
        unit="kg"
        placeholder="70"
        icon="⚖️"
      />
    </div>
  </div>
);

const VitalInput = ({ label, value, onChange, unit, placeholder, icon }) => (
  <div>
    <label style={{ 
      fontSize: '0.9rem', 
      fontWeight: '600', 
      color: '#5a7a8a',
      marginBottom: '8px',
      display: 'flex',
      alignItems: 'center',
      gap: '6px'
    }}>
      <span style={{ fontSize: '1.2rem' }}>{icon}</span>
      {label}
    </label>
    <div style={{ display: 'flex', gap: '10px' }}>
      <input
        type="number"
        value={value}
        onChange={onChange}
        placeholder={placeholder}
        style={{
          flex: 1,
          padding: '12px 16px',
          border: '2px solid rgba(18, 92, 122, 0.15)',
          borderRadius: '8px',
          fontSize: '1rem',
          fontFamily: 'Cairo, sans-serif',
          transition: 'all 0.3s ease',
          outline: 'none',
          background: 'rgba(18, 92, 122, 0.03)'
        }}
        onFocus={(e) => {
          e.target.style.borderColor = '#a23f97';
          e.target.style.background = 'rgba(162, 63, 151, 0.05)';
        }}
        onBlur={(e) => {
          e.target.style.borderColor = 'rgba(18, 92, 122, 0.15)';
          e.target.style.background = 'rgba(18, 92, 122, 0.03)';
        }}
      />
      <span style={{
        fontSize: '0.95rem',
        fontWeight: '600',
        color: '#a23f97',
        minWidth: '60px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg, rgba(162,63,151,0.1) 0%, rgba(18,92,122,0.1) 100%)',
        padding: '0 12px',
        borderRadius: '8px',
        border: '2px solid rgba(162, 63, 151, 0.2)'
      }}>
        {unit}
      </span>
    </div>
  </div>
);

const DoctorOpinionSection = ({ doctorOpinion, setDoctorOpinion }) => (
  <div style={{
    background: 'white',
    borderRadius: '16px',
    padding: '35px',
    boxShadow: '0 5px 20px rgba(18, 92, 122, 0.08)',
    border: '1px solid rgba(18, 92, 122, 0.1)',
    height: 'fit-content'
  }}>
    <h2 style={{
      fontSize: '1.5rem',
      color: '#125c7a',
      marginBottom: '25px',
      fontWeight: '700'
    }}>
      📝 رأي الطبيب والتشخيص
    </h2>
    <textarea
      value={doctorOpinion}
      onChange={(e) => setDoctorOpinion(e.target.value)}
      placeholder="اكتب رأيك الطبي والتشخيص الكامل للحالة..."
      style={{
        width: '100%',
        minHeight: '200px',
        padding: '18px',
        border: '2px solid rgba(18, 92, 122, 0.15)',
        borderRadius: '12px',
        fontSize: '1rem',
        fontFamily: 'Cairo, sans-serif',
        resize: 'vertical',
        transition: 'all 0.3s ease',
        outline: 'none',
        lineHeight: '1.8',
        background: 'rgba(18, 92, 122, 0.03)'
      }}
      onFocus={(e) => {
        e.target.style.borderColor = '#a23f97';
        e.target.style.background = 'rgba(162, 63, 151, 0.05)';
      }}
      onBlur={(e) => {
        e.target.style.borderColor = 'rgba(18, 92, 122, 0.15)';
        e.target.style.background = 'rgba(18, 92, 122, 0.03)';
      }}
    />
  </div>
);

const MedicationsSection = ({ medications, newMedication, setNewMedication, handleAddMedication, handleRemoveMedication }) => (
  <div style={{
    background: 'white',
    borderRadius: '16px',
    padding: '35px',
    marginBottom: '30px',
    boxShadow: '0 5px 20px rgba(18, 92, 122, 0.08)',
    border: '1px solid rgba(18, 92, 122, 0.1)'
  }}>
    <h2 style={{
      fontSize: '1.8rem',
      color: '#125c7a',
      marginBottom: '25px',
      fontWeight: '700',
      paddingBottom: '15px',
      borderBottom: '2px solid rgba(18, 92, 122, 0.1)',
      display: 'flex',
      alignItems: 'center',
      gap: '10px'
    }}>
      <span>💊</span>
      الأدوية الموصوفة
      <span style={{
        background: 'linear-gradient(135deg, #a23f97 0%, #c55db3 100%)',
        color: 'white',
        padding: '4px 12px',
        borderRadius: '20px',
        fontSize: '0.9rem',
        fontWeight: '600',
        marginRight: 'auto'
      }}>
        {medications.length} دواء
      </span>
    </h2>

    {/* Add New Medication Form */}
    <div style={{
      background: 'linear-gradient(135deg, rgba(162,63,151,0.05) 0%, rgba(18,92,122,0.05) 100%)',
      padding: '25px',
      borderRadius: '12px',
      border: '2px dashed rgba(162, 63, 151, 0.3)',
      marginBottom: '30px'
    }}>
      <h3 style={{
        fontSize: '1.2rem',
        color: '#125c7a',
        marginBottom: '20px',
        fontWeight: '600'
      }}>
        ➕ إضافة دواء جديد
      </h3>
      
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
        gap: '15px',
        marginBottom: '20px'
      }}>
        <MedicationInput
          label="اسم الدواء"
          value={newMedication.medicationName}
          onChange={(e) => setNewMedication({...newMedication, medicationName: e.target.value})}
          placeholder="مثال: Aspirin"
          icon="💊"
        />
        <MedicationInput
          label="الجرعة"
          value={newMedication.dosage}
          onChange={(e) => setNewMedication({...newMedication, dosage: e.target.value})}
          placeholder="مثال: 81 mg"
          icon="📏"
        />
        <MedicationInput
          label="التكرار"
          value={newMedication.frequency}
          onChange={(e) => setNewMedication({...newMedication, frequency: e.target.value})}
          placeholder="مثال: مرة واحدة يومياً"
          icon="🕐"
        />
        <MedicationInput
          label="المدة"
          value={newMedication.duration}
          onChange={(e) => setNewMedication({...newMedication, duration: e.target.value})}
          placeholder="مثال: 30 يوم"
          icon="📅"
        />
      </div>

      <button
        onClick={handleAddMedication}
        style={{
          background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
          color: 'white',
          border: 'none',
          padding: '12px 30px',
          borderRadius: '10px',
          fontSize: '1rem',
          fontWeight: '600',
          cursor: 'pointer',
          transition: 'all 0.3s ease',
          fontFamily: 'Cairo, sans-serif',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
        }}
        onMouseOver={(e) => {
          e.target.style.transform = 'translateY(-2px)';
          e.target.style.boxShadow = '0 8px 20px rgba(16, 185, 129, 0.3)';
        }}
        onMouseOut={(e) => {
          e.target.style.transform = 'translateY(0)';
          e.target.style.boxShadow = 'none';
        }}
      >
        <span style={{ fontSize: '1.3rem' }}>➕</span>
        إضافة الدواء
      </button>
    </div>

    {/* Medications List */}
    {medications.length === 0 ? (
      <div style={{
        textAlign: 'center',
        padding: '40px 20px',
        color: '#5a7a8a'
      }}>
        <div style={{ fontSize: '4rem', marginBottom: '15px', opacity: 0.5 }}>💊</div>
        <p style={{ fontSize: '1.1rem', fontWeight: '500' }}>لم يتم إضافة أي أدوية بعد</p>
        <p style={{ fontSize: '0.95rem' }}>استخدم النموذج أعلاه لإضافة الأدوية</p>
      </div>
    ) : (
      <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
        {medications.map((med, index) => (
          <div key={index} style={{
            background: 'white',
            border: '2px solid rgba(18, 92, 122, 0.15)',
            borderRadius: '12px',
            padding: '20px',
            transition: 'all 0.3s ease',
            position: 'relative'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.borderColor = '#a23f97';
            e.currentTarget.style.boxShadow = '0 5px 15px rgba(162, 63, 151, 0.1)';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.borderColor = 'rgba(18, 92, 122, 0.15)';
            e.currentTarget.style.boxShadow = 'none';
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ flex: 1 }}>
                <div style={{
                  fontSize: '1.3rem',
                  fontWeight: '700',
                  color: '#125c7a',
                  marginBottom: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px'
                }}>
                  <span style={{ fontSize: '1.5rem' }}>💊</span>
                  {med.medicationName}
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px' }}>
                  <MedicationDetail label="الجرعة" value={med.dosage} />
                  <MedicationDetail label="التكرار" value={med.frequency} />
                  <MedicationDetail label="المدة" value={med.duration} />
                </div>
              </div>
              <button
                onClick={() => handleRemoveMedication(index)}
                style={{
                  background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
                  color: 'white',
                  border: 'none',
                  padding: '8px 16px',
                  borderRadius: '8px',
                  fontSize: '0.9rem',
                  fontWeight: '600',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  fontFamily: 'Cairo, sans-serif'
                }}
                onMouseOver={(e) => {
                  e.target.style.transform = 'translateY(-2px)';
                  e.target.style.boxShadow = '0 6px 15px rgba(239, 68, 68, 0.3)';
                }}
                onMouseOut={(e) => {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = 'none';
                }}
              >
                🗑️ حذف
              </button>
            </div>
          </div>
        ))}
      </div>
    )}
  </div>
);

const MedicationInput = ({ label, value, onChange, placeholder, icon }) => (
  <div>
    <label style={{ 
      fontSize: '0.9rem', 
      fontWeight: '600', 
      color: '#5a7a8a',
      marginBottom: '8px',
      display: 'flex',
      alignItems: 'center',
      gap: '6px'
    }}>
      <span style={{ fontSize: '1.1rem' }}>{icon}</span>
      {label}
    </label>
    <input
      type="text"
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      style={{
        width: '100%',
        padding: '12px 16px',
        border: '2px solid rgba(18, 92, 122, 0.15)',
        borderRadius: '8px',
        fontSize: '1rem',
        fontFamily: 'Cairo, sans-serif',
        transition: 'all 0.3s ease',
        outline: 'none',
        background: 'white'
      }}
      onFocus={(e) => {
        e.target.style.borderColor = '#a23f97';
        e.target.style.background = 'rgba(162, 63, 151, 0.05)';
      }}
      onBlur={(e) => {
        e.target.style.borderColor = 'rgba(18, 92, 122, 0.15)';
        e.target.style.background = 'white';
      }}
    />
  </div>
);

const MedicationDetail = ({ label, value }) => (
  <div style={{
    background: 'rgba(18, 92, 122, 0.05)',
    padding: '10px 12px',
    borderRadius: '8px'
  }}>
    <span style={{ fontSize: '0.8rem', color: '#5a7a8a', fontWeight: '600' }}>{label}: </span>
    <span style={{ fontSize: '0.95rem', color: '#125c7a', fontWeight: '500' }}>{value}</span>
  </div>
);

const SearchModal = ({ searchId, setSearchId, handleSearchPatient, onClose, loading }) => (
  <div
    onClick={onClose}
    style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      background: 'rgba(0,0,0,0.6)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px',
      backdropFilter: 'blur(5px)'
    }}
  >
    <div
      onClick={(e) => e.stopPropagation()}
      style={{
        background: 'white',
        borderRadius: '16px',
        padding: '40px',
        maxWidth: '500px',
        width: '100%',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        fontFamily: 'Cairo, sans-serif',
        direction: 'rtl',
        position: 'relative'
      }}
    >
      <button
        onClick={onClose}
        style={{
          position: 'absolute',
          left: '20px',
          top: '20px',
          background: 'none',
          border: 'none',
          fontSize: '1.8rem',
          color: '#5a7a8a',
          cursor: 'pointer',
          fontWeight: 'bold',
          lineHeight: '1',
          transition: 'all 0.3s ease'
        }}
        onMouseOver={(e) => {
          e.target.style.color = '#a23f97';
          e.target.style.transform = 'rotate(90deg)';
        }}
        onMouseOut={(e) => {
          e.target.style.color = '#5a7a8a';
          e.target.style.transform = 'rotate(0deg)';
        }}
      >
        ×
      </button>
      
      <div style={{ textAlign: 'center', marginBottom: '30px' }}>
        <div style={{ 
          fontSize: '4rem', 
          marginBottom: '15px',
          background: 'linear-gradient(135deg, #125c7a 0%, #a23f97 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent'
        }}>
          🔍
        </div>
        <h3 style={{ fontSize: '1.8rem', color: '#125c7a', fontWeight: '700', marginBottom: '10px' }}>
          البحث عن مريض
        </h3>
        <p style={{ color: '#5a7a8a', fontSize: '1rem' }}>أدخل الرقم الوطني للمريض</p>
      </div>

      <input
        type="text"
        value={searchId}
        onChange={(e) => setSearchId(e.target.value)}
        placeholder="الرقم الوطني"
        disabled={loading}
        style={{
          width: '100%',
          padding: '14px 18px',
          border: '2px solid rgba(18, 92, 122, 0.15)',
          borderRadius: '10px',
          fontSize: '1.1rem',
          marginBottom: '25px',
          fontFamily: 'Cairo, sans-serif',
          transition: 'all 0.3s ease',
          outline: 'none',
          background: 'rgba(18, 92, 122, 0.05)'
        }}
        onFocus={(e) => {
          e.target.style.borderColor = '#a23f97';
          e.target.style.background = 'rgba(162, 63, 151, 0.08)';
        }}
        onBlur={(e) => {
          e.target.style.borderColor = 'rgba(18, 92, 122, 0.15)';
          e.target.style.background = 'rgba(18, 92, 122, 0.05)';
        }}
        onKeyPress={(e) => e.key === 'Enter' && !loading && handleSearchPatient()}
      />
      
      <button
        onClick={handleSearchPatient}
        disabled={loading}
        style={{
          width: '100%',
          background: loading ?
            'linear-gradient(135deg, #9ca3af 0%, #6b7280 100%)' :
            'linear-gradient(135deg, #125c7a 0%, #a23f97 100%)',
          color: 'white',
          border: 'none',
          padding: '14px',
          borderRadius: '10px',
          fontSize: '1.1rem',
          fontWeight: '700',
          cursor: loading ? 'not-allowed' : 'pointer',
          transition: 'all 0.3s ease',
          fontFamily: 'Cairo, sans-serif'
        }}
        onMouseOver={(e) => {
          if (!loading) {
            e.target.style.transform = 'translateY(-2px)';
            e.target.style.boxShadow = '0 10px 30px rgba(162, 63, 151, 0.3)';
          }
        }}
        onMouseOut={(e) => {
          if (!loading) {
            e.target.style.transform = 'translateY(0)';
            e.target.style.boxShadow = 'none';
          }
        }}
      >
        {loading ? 'جاري البحث...' : 'بحث'}
      </button>
    </div>
  </div>
);

export default DoctorDashboard;