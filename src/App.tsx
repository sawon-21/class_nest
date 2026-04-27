import React, { useEffect, useState } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './lib/firebase';
import { useAuthStore } from './store/useAuthStore';

// Layout
import Navbar from './components/layout/Navbar';

// Pages
import Landing from './pages/Landing';
import Login from './pages/Login';
import Register from './pages/Register';
import TeacherDashboard from './pages/TeacherDashboard';
import JoinMeeting from './pages/JoinMeeting';
import LiveRoom from './pages/LiveRoom';

// Protected Route Component
function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuthStore();

  if (loading) {
    return <div className="h-screen flex items-center justify-center text-slate-400">Loading...</div>;
  }

  if (!user) {
    // Redirect to login if not authenticated
    return <Navigate to="/login" />;
  }

  return <>{children}</>;
}

export default function App() {
  const { setUser, setUserProfile, setLoading } = useAuthStore();

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setUser(user);
      if (user && db) {
        try {
          const docRef = doc(db, 'users', user.uid);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setUserProfile(docSnap.data() as any);
          }
        } catch (e) {
          console.error("Error fetching user profile", e);
        }
      } else {
        setUserProfile(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, [setUser, setUserProfile, setLoading]);

  return (
    <Router>
      <div className="min-h-screen bg-slate-900 text-slate-100 font-sans flex flex-col overflow-hidden">
        <Navbar />
        <main className="flex-1 w-full flex flex-col overflow-y-auto">
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            <Route path="/join/:meetingCode" element={<JoinMeeting />} />
            <Route path="/class/:meetingCode" element={<LiveRoom />} />
            
            {/* Protected Routes */}
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <TeacherDashboard />
                </ProtectedRoute>
              } 
            />
            
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}
