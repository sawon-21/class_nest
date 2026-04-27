import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { FirebaseError } from 'firebase/app';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!auth || !db) {
      setError("Firebase is not initialized. Please connect a database.");
      return;
    }

    setLoading(true);
    setError('');

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      await setDoc(doc(db, 'users', user.uid), {
        uid: user.uid,
        name,
        email,
        role: 'teacher',
        createdAt: new Date().toISOString()
      });

      navigate('/dashboard');
    } catch (err) {
      if (err instanceof FirebaseError) {
        setError(err.message);
      } else {
        setError('An unexpected error occurred.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-slate-900 relative overflow-hidden">
      <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5"></div>
      <div className="max-w-md w-full bg-slate-800/80 p-8 rounded-3xl shadow-2xl border border-slate-700/50 backdrop-blur-xl relative z-10">
        <div className="text-center mb-10">
          <h2 className="text-3xl font-extrabold text-slate-100 tracking-tight">Teacher Registration</h2>
          <p className="mt-2 text-slate-400 font-medium">Create classes and manage students</p>
        </div>
        
        {error && <div className="bg-red-500/10 text-red-400 border border-red-500/20 p-4 rounded-xl mb-6 text-sm font-semibold">{error}</div>}

        <form onSubmit={handleRegister} className="space-y-6">
          <div>
             <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Full Name</label>
            <input
              type="text"
              required
              className="w-full px-4 py-3 bg-slate-900 rounded-xl border border-slate-700 focus:outline-none focus:border-indigo-500 transition-colors text-slate-100 placeholder:text-slate-600"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="John Doe"
            />
          </div>

          <div>
             <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Email Address</label>
            <input
              type="email"
              required
              className="w-full px-4 py-3 bg-slate-900 rounded-xl border border-slate-700 focus:outline-none focus:border-indigo-500 transition-colors text-slate-100 placeholder:text-slate-600"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="you@example.com"
            />
          </div>

          <div>
             <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">Password</label>
            <input
              type="password"
              required
              className="w-full px-4 py-3 bg-slate-900 rounded-xl border border-slate-700 focus:outline-none focus:border-indigo-500 transition-colors text-slate-100 placeholder:text-slate-600"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full flex justify-center py-4 px-4 rounded-xl shadow-lg shadow-indigo-500/20 font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition-all active:scale-95 disabled:opacity-50 mt-8"
          >
            {loading ? 'Creating account...' : 'Create Account'}
          </button>
        </form>

        <p className="mt-8 text-center text-sm font-medium text-slate-400">
          Already have an account?{' '}
          <Link to="/login" className="font-bold text-indigo-400 hover:text-indigo-300 transition-colors">
            Log in
          </Link>
        </p>
      </div>
    </div>
  );
}
