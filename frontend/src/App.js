import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Login from './pages/Login';
import SignUp from './pages/SignUp';
import PatientDashboard from './pages/PatientDashboard';
import DoctorDashboard from './pages/DoctorDashboard';
import AdminDashboard from './pages/AdminDashboard';
import PharmacistDashboard from './pages/PharmacistDashboard';
import LabDashboard from './pages/LabDashboard';
import ProtectedRoute from './components/ProtectedRoute';       // ← NEW
import { initializeAdminAccount } from './services/adminService';

/**
 * Main App Component
 * Handles routing for the Patient 360° application
 *
 * كل الـ Dashboards محمية بـ ProtectedRoute مع تحديد الدور المسموح،
 * بحيث لا يمكن للمستخدم الوصول لصفحة غير صفحته حتى لو كتب الـ URL يدوياً.
 */
function App() {
  useEffect(() => {
    initializeAdminAccount();
  }, []);

  return (
    <Router>
      <div className="App">
        <Routes>
          {/* Public Routes — صفحات عامة */}
          <Route path="/" element={<Login />} />
          <Route path="/signup" element={<SignUp />} />

          {/* Protected Routes — صفحات محمية حسب الدور */}
          <Route
            path="/patient-dashboard"
            element={
              <ProtectedRoute allowedRoles={['patient']}>
                <PatientDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/doctor-dashboard"
            element={
              <ProtectedRoute allowedRoles={['doctor']}>
                <DoctorDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/admin-dashboard"
            element={
              <ProtectedRoute allowedRoles={['admin']}>
                <AdminDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/pharmacist-dashboard"
            element={
              <ProtectedRoute allowedRoles={['pharmacist']}>
                <PharmacistDashboard />
              </ProtectedRoute>
            }
          />

          <Route
            path="/lab-dashboard"
            element={
              <ProtectedRoute allowedRoles={['lab_technician']}>
                <LabDashboard />
              </ProtectedRoute>
            }
          />

          {/* Catch all — redirect to home */}
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
    </Router>
  );
}

export default App;