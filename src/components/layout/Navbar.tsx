import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { LogOut, BookOpen, User as UserIcon } from 'lucide-react';
import { useAuthStore } from '../../store/useAuthStore';
import { auth } from '../../lib/firebase';
import { signOut } from 'firebase/auth';

export default function Navbar() {
  const { user, userProfile } = useAuthStore();
  const navigate = useNavigate();

  const handleLogout = async () => {
    if (auth) {
      await signOut(auth);
      navigate('/');
    }
  };

  return (
    <nav className="h-16 bg-slate-800/50 backdrop-blur-md border-b border-slate-700/50 flex items-center justify-between px-6 flex-shrink-0">
      <div className="w-full max-w-7xl mx-auto flex justify-between items-center h-full">
          <div className="flex items-center">
            <Link to="/" className="flex items-center gap-4 hover:opacity-80 transition-opacity">
              <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-500/20">
                <BookOpen className="h-6 w-6 text-white" />
              </div>
              <h1 className="text-lg font-bold leading-tight text-slate-100">
                ClassNest <span className="text-indigo-400">Live</span>
              </h1>
            </Link>
          </div>
          
          <div className="flex items-center space-x-6">
            {user ? (
              <>
                <Link
                  to="/dashboard"
                  className="text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-indigo-400 transition-colors"
                >
                  Dashboard
                </Link>
                <div className="flex items-center gap-2 text-sm font-semibold text-slate-300 bg-slate-800/80 border border-slate-700/50 px-3 py-1.5 rounded-full">
                  <UserIcon className="w-4 h-4 text-indigo-400" />
                  {userProfile?.name?.split(' ')[0]} (Teacher)
                </div>
                <button
                  onClick={handleLogout}
                  className="w-10 h-10 rounded-full bg-slate-700 hover:bg-slate-600 flex items-center justify-center text-slate-400 hover:text-red-400 transition-all shadow-lg"
                  title="Logout"
                >
                  <LogOut className="w-5 h-5" />
                </button>
              </>
            ) : (
              <>
                <Link
                  to="/login"
                  className="text-xs font-bold uppercase tracking-widest text-slate-400 hover:text-indigo-400 transition-colors"
                >
                  Teacher Login
                </Link>
              </>
            )}
          </div>
      </div>
    </nav>
  );
}
