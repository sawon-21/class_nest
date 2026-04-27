import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Video, CheckCircle, FileText } from 'lucide-react';

export default function Landing() {
  const [meetingCode, setMeetingCode] = useState('');
  const navigate = useNavigate();

  const handleJoin = (e: React.FormEvent) => {
    e.preventDefault();
    if (meetingCode.trim()) {
      navigate(`/join/${meetingCode.trim()}`);
    }
  };

  return (
    <div className="flex flex-col min-h-[calc(100vh-64px)] overflow-hidden">
      {/* Hero Section */}
      <section className="flex-1 flex flex-col justify-center items-center text-center px-4 py-20 bg-gradient-to-br from-slate-900 via-slate-800 to-indigo-950 relative">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-5"></div>
        <div className="relative z-10 flex flex-col items-center">
          <div className="bg-indigo-500/10 border border-indigo-500/20 px-4 py-1.5 rounded-full mb-8 backdrop-blur-sm">
            <span className="text-xs font-bold text-indigo-400 uppercase tracking-widest">Connect seamlessly</span>
          </div>
          <h1 className="text-5xl md:text-7xl font-extrabold text-slate-100 tracking-tight mb-8 max-w-4xl leading-tight">
            Premium Video <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-400 to-purple-400">Classrooms</span>
          </h1>
          <p className="text-lg md:text-xl text-slate-400 max-w-2xl mb-12 leading-relaxed">
            Create completely secure online classes with a built-in waiting room, accessible directly via link. Ideal for educators.
          </p>
          <div className="flex flex-col md:flex-row gap-8 w-full max-w-2xl justify-center items-center border border-slate-700/50 bg-slate-800/50 p-6 rounded-2xl backdrop-blur-md shadow-2xl">
            
            <form onSubmit={handleJoin} className="flex flex-col w-full">
              <label className="text-slate-300 font-bold mb-2 text-sm">Join a class as a student</label>
              <div className="flex">
                <input 
                  type="text" 
                  value={meetingCode}
                  onChange={(e) => setMeetingCode(e.target.value)}
                  placeholder="Enter meeting code..." 
                  className="w-full bg-slate-900 border border-slate-700 rounded-l-xl px-4 py-3 text-slate-200 focus:outline-none focus:border-indigo-500 transition-colors placeholder:text-slate-500"
                />
                <button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white font-bold px-6 py-3 rounded-r-xl transition-all shadow-lg shadow-indigo-500/20">
                  Join
                </button>
              </div>
            </form>

            <div className="h-px w-full md:h-16 md:w-px bg-slate-700 flex-shrink-0"></div>

            <div className="flex flex-col w-full">
              <label className="text-slate-300 font-bold mb-2 text-sm text-center md:text-left">Are you a teacher?</label>
              <div className="flex flex-col sm:flex-row gap-3">
                <Link to="/register" className="flex-1 text-center px-4 py-3 bg-slate-100 text-slate-900 rounded-xl font-bold hover:bg-white transition-all shadow-lg">
                  Sign Up
                </Link>
                <Link to="/login" className="flex-1 text-center px-4 py-3 bg-slate-700 text-slate-100 rounded-xl font-bold hover:bg-slate-600 transition-all border border-slate-600 shadow-lg">
                  Login
                </Link>
              </div>
            </div>

          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-24 bg-slate-900 border-t border-slate-800/50 backdrop-blur-3xl">
        <div className="max-w-7xl mx-auto px-4 z-10 relative">
          <div className="grid md:grid-cols-3 gap-8">
            <div className="p-8 bg-slate-800/40 rounded-2xl border border-slate-700/50 shadow-2xl backdrop-blur-xl group hover:-translate-y-1 transition-transform">
              <div className="w-14 h-14 bg-indigo-500/20 text-indigo-400 rounded-xl flex items-center justify-center mb-6 border border-indigo-500/10 group-hover:scale-110 transition-transform">
                <Video className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-slate-100 mb-3">Live Video Infrastructure</h3>
              <p className="text-slate-400 leading-relaxed text-sm">Powered by enterprise-grade WebRTC embedded directly into the browser. Fast, low latency rendering.</p>
            </div>
            <div className="p-8 bg-slate-800/40 rounded-2xl border border-slate-700/50 shadow-2xl backdrop-blur-xl group hover:-translate-y-1 transition-transform">
              <div className="w-14 h-14 bg-emerald-500/20 text-emerald-400 rounded-xl flex items-center justify-center mb-6 border border-emerald-500/10 group-hover:scale-110 transition-transform">
                <CheckCircle className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-slate-100 mb-3">Secure Waiting Rooms</h3>
              <p className="text-slate-400 leading-relaxed text-sm">Keep full control over your classes. Students must submit an entry request and wait for your explicit approval.</p>
            </div>
            <div className="p-8 bg-slate-800/40 rounded-2xl border border-slate-700/50 shadow-2xl backdrop-blur-xl group hover:-translate-y-1 transition-transform">
              <div className="w-14 h-14 bg-purple-500/20 text-purple-400 rounded-xl flex items-center justify-center mb-6 border border-purple-500/10 group-hover:scale-110 transition-transform">
                <FileText className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold text-slate-100 mb-3">Easy Link Sharing</h3>
              <p className="text-slate-400 leading-relaxed text-sm">Create a class with a single click, and distribute a unique meeting link to your students without making them install apps.</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
