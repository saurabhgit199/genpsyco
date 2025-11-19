import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import Login from './pages/Login'
import Register from './pages/Register'
import PatientDashboard from './pages/PatientDashboard'
import PsychologistDashboard from './pages/PsychologistDashboard'
import ProtectedRoute from './components/ProtectedRoute'
import NavBar from './components/NavBar'
import PatientChoosePsychologist from './pages/PatientChoosePsychologist'
import PatientProfile from './pages/PatientProfile'
import TherapyHistory from './pages/TherapyHistory'
import TherapyAudioLibrary from './pages/TherapyAudioLibrary'
import PreviousTherapies from './pages/PreviousTherapies'
import PatientChat from './pages/PatientChat'
import './App.css'

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <NavBar />
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route
              path="/patient"
              element={
                <ProtectedRoute requiredRole="patient">
                  <PatientDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/patient/choose-psychologist"
              element={
                <ProtectedRoute requiredRole="patient">
                  <PatientChoosePsychologist />
                </ProtectedRoute>
              }
            />
            <Route
              path="/patient/profile"
              element={
                <ProtectedRoute requiredRole="patient">
                  <PatientProfile />
                </ProtectedRoute>
              }
            />
            <Route
              path="/patient/audio-library"
              element={
                <ProtectedRoute requiredRole="patient">
                  <TherapyAudioLibrary />
                </ProtectedRoute>
              }
            />
            <Route
              path="/patient/therapies"
              element={
                <ProtectedRoute requiredRole="patient">
                  <PreviousTherapies />
                </ProtectedRoute>
              }
            />
            <Route
              path="/patient/chat/:sessionId"
              element={
                <ProtectedRoute requiredRole="patient">
                  <PatientChat />
                </ProtectedRoute>
              }
            />
            <Route
              path="/psychologist"
              element={
                <ProtectedRoute requiredRole="psychologist">
                  <PsychologistDashboard />
                </ProtectedRoute>
              }
            />
            <Route
              path="/psychologist/therapy-history"
              element={
                <ProtectedRoute requiredRole="psychologist">
                  <TherapyHistory />
                </ProtectedRoute>
              }
            />
            <Route path="/" element={<Navigate to="/login" replace />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  )
}

export default App

