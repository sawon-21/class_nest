import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { collection, query, where, doc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuthStore } from '../store/useAuthStore';
import { Plus, Video, Copy, Check, StopCircle } from 'lucide-react';

export default function TeacherDashboard() {
  const { user } = useAuthStore();
  const navigate = useNavigate();
  const [meetings, setMeetings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [title, setTitle] = useState('');
  const [subject, setSubject] = useState('');
  const [creating, setCreating] = useState(false);
  const [copiedCode, setCopiedCode] = useState('');

  useEffect(() => {
    if (!user) return;

    const q = query(
      collection(db, 'meetings'),
      where('teacherId', '==', user.uid)
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const meetingsData = snapshot.docs.map(doc => ({
        id: doc.id,
        createdAt: '', // Default in case missing
        ...doc.data()
      }));
      // Sort in JS since we didn't index createdAt yet
      meetingsData.sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
      setMeetings(meetingsData);
      setLoading(false);
    }, (error) => {
      console.error("Error fetching meetings", error);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user]);

  const handleCreateMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !title) return;
    setCreating(true);
    
    try {
      const meetingId = doc(collection(db, 'meetings')).id;
      // create rare meeting code like abc-def-ghi
      const randomString = () => Math.random().toString(36).substring(2, 5);
      const meetingCode = `${randomString()}-${randomString()}-${randomString()}`;
      
      await setDoc(doc(db, 'meetings', meetingId), {
        id: meetingId,
        title,
        subject: subject || 'General',
        teacherId: user.uid,
        meetingCode,
        status: 'active',
        createdAt: new Date().toISOString()
      });
      
      setTitle('');
      setSubject('');
    } catch (e) {
      console.error(e);
      alert('Failed to construct meeting');
    } finally {
      setCreating(false);
    }
  };

  const copyToClipboard = (code: string) => {
    const link = `${window.location.origin}/join/${code}`;
    navigator.clipboard.writeText(link);
    setCopiedCode(code);
    setTimeout(() => setCopiedCode(''), 2000);
  };

  const copyCodeOnly = (code: string) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code + "_only");
    setTimeout(() => setCopiedCode(''), 2000);
  }

  const endMeeting = async (meetingId: string) => {
    if(!confirm("Are you sure you want to end this meeting? Students won't be able to join.")) return;
    try {
      await setDoc(doc(db, 'meetings', meetingId), { status: 'ended' }, { merge: true });
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="p-8 max-w-7xl mx-auto w-full">
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-3xl font-bold">Teacher Dashboard</h1>
          <p className="text-slate-400">Manage your virtual classrooms</p>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        
        {/* Create Meeting Column */}
        <div className="md:col-span-1">
          <div className="bg-slate-800 border border-slate-700 p-6 rounded-2xl shadow-xl">
            <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5 text-indigo-400" />
              New Meeting
            </h2>
            <form onSubmit={handleCreateMeeting} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Class Title</label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Mathematics 101"
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-1">Subject (Optional)</label>
                <input
                  type="text"
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  placeholder="e.g. Algebra"
                  className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-xl text-slate-200 focus:outline-none focus:border-indigo-500"
                />
              </div>
              <button 
                type="submit" 
                disabled={creating}
                className="w-full py-3 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl transition-colors shadow-lg shadow-indigo-500/20 disabled:opacity-50"
              >
                {creating ? 'Creating...' : 'Create Meeting'}
              </button>
            </form>
          </div>
        </div>

        {/* Meeting List Column */}
        <div className="md:col-span-2 space-y-4">
          <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
            <Video className="w-5 h-5 text-indigo-400" />
            Your Meetings
          </h2>
          
          {loading ? (
            <div className="text-slate-400">Loading meetings...</div>
          ) : meetings.length === 0 ? (
            <div className="p-8 bg-slate-800/50 border border-slate-700 border-dashed rounded-2xl text-center">
              <p className="text-slate-400">No meetings created yet. Create one on the left.</p>
            </div>
          ) : (
            meetings.map(m => (
              <div key={m.id} className="bg-slate-800 border border-slate-700 p-5 rounded-2xl flex flex-col md:flex-row md:items-center justify-between gap-4 shadow-lg hover:border-slate-600 transition-colors">
                <div>
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-bold text-lg">{m.title}</h3>
                    {m.status === 'active' ? (
                       <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-400 text-xs font-bold rounded-full">Active</span>
                    ) : (
                       <span className="px-2 py-0.5 bg-slate-500/20 text-slate-400 text-xs font-bold rounded-full">Ended</span>
                    )}
                  </div>
                  <p className="text-sm text-slate-400 mb-2">{m.subject}</p>
                  
                  <div className="flex flex-wrap items-center gap-3">
                    <button 
                      onClick={() => copyCodeOnly(m.meetingCode)}
                      className="text-xs font-mono bg-slate-900 px-3 py-1 rounded-lg border border-slate-700 text-slate-300 hover:text-white transition-colors flex items-center gap-2"
                    >
                      {copiedCode === m.meetingCode + "_only" ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      Code: {m.meetingCode}
                    </button>
                    
                    <button 
                      onClick={() => copyToClipboard(m.meetingCode)}
                      className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 transition-colors flex items-center gap-1"
                    >
                      {copiedCode === m.meetingCode ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
                      Copy Link
                    </button>
                  </div>
                </div>
                
                {m.status === 'active' && (
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => endMeeting(m.id)}
                      className="px-4 py-2 border border-red-500/50 text-red-400 hover:bg-red-500/10 rounded-xl font-semibold text-sm transition-colors flex items-center gap-2"
                    >
                      <StopCircle className="w-4 h-4" />
                      End
                    </button>
                    <button
                      onClick={() => navigate(`/class/${m.meetingCode}`)}
                      className="px-6 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-bold shadow-lg shadow-indigo-500/20 transition-all flex items-center gap-2"
                    >
                      <Video className="w-4 h-4" />
                      Enter Room
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>

      </div>
    </div>
  );
}
