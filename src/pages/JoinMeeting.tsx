import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, doc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Loader2 } from 'lucide-react';

export default function JoinMeeting() {
  const { meetingCode } = useParams<{ meetingCode: string }>();
  const navigate = useNavigate();
  
  const [meeting, setMeeting] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState('');
  
  const [requestStatus, setRequestStatus] = useState<'none' | 'pending' | 'accepted' | 'rejected'>('none');
  const [requestId, setRequestId] = useState<string | null>(null);

  useEffect(() => {
    if (!meetingCode) {
      navigate('/');
      return;
    }

    const checkMeeting = async () => {
      try {
        const q = query(collection(db, 'meetings'), where('meetingCode', '==', meetingCode));
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
          setLoading(false);
          return; // meeting not found
        }
        
        const mDoc = snapshot.docs[0];
        setMeeting({ id: mDoc.id, ...mDoc.data() });
        setLoading(false);
      } catch (err) {
        console.error(err);
        setLoading(false);
      }
    };
    checkMeeting();
  }, [meetingCode, navigate]);

  useEffect(() => {
    if (!requestId) return;

    // Listen to the join request status
    const unsubscribe = onSnapshot(doc(db, 'joinRequests', requestId), (docSnap) => {
      if (docSnap.exists()) {
        const data = docSnap.data();
        setRequestStatus(data.status);
        if (data.status === 'accepted') {
          // Join the room directly since accepted
          // We can pass the participant name via state or URL
          sessionStorage.setItem('studentName', data.studentName);
          navigate(`/class/${meetingCode}`);
        }
      }
    });

    return () => unsubscribe();
  }, [requestId, navigate, meetingCode]);

  const handleRequestJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !meeting) return;

    try {
      const newRequestId = doc(collection(db, 'joinRequests')).id;
      await setDoc(doc(db, 'joinRequests', newRequestId), {
        id: newRequestId,
        meetingId: meeting.id,
        studentName: name.trim(),
        status: 'pending',
        createdAt: new Date().toISOString()
      });
      setRequestId(newRequestId);
      setRequestStatus('pending');
    } catch (err) {
      console.error(err);
    }
  };

  if (loading) {
    return <div className="h-full flex items-center justify-center text-slate-400">Finding meeting...</div>;
  }

  if (!meeting) {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <div className="bg-slate-800 p-8 rounded-2xl border border-slate-700 text-center max-w-sm w-full">
          <h2 className="text-xl font-bold text-red-400 mb-2">Meeting Not Found</h2>
          <p className="text-slate-400 mb-6">The meeting code you entered is invalid or the meeting has been deleted.</p>
          <button onClick={() => navigate('/')} className="bg-indigo-600 px-6 py-2 rounded-xl font-bold text-white hover:bg-indigo-500 transition-colors w-full">
            Return Home
          </button>
        </div>
      </div>
    );
  }

  if (meeting.status === 'ended') {
    return (
      <div className="h-full flex items-center justify-center p-8">
        <div className="bg-slate-800 p-8 rounded-2xl border border-slate-700 text-center max-w-sm w-full">
          <h2 className="text-xl font-bold text-slate-200 mb-2">Meeting Ended</h2>
          <p className="text-slate-400 mb-6">This class has already ended.</p>
          <button onClick={() => navigate('/')} className="bg-indigo-600 px-6 py-2 rounded-xl font-bold text-white hover:bg-indigo-500 transition-colors w-full">
            Return Home
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex items-center justify-center p-4">
      <div className="bg-slate-800 p-8 rounded-3xl border border-slate-700 max-w-md w-full shadow-2xl backdrop-blur-xl">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-slate-100 mb-2">{meeting.title}</h1>
          {meeting.subject && <p className="text-slate-400 text-sm">{meeting.subject}</p>}
        </div>

        {requestStatus === 'none' && (
          <form onSubmit={handleRequestJoin} className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-slate-400 uppercase tracking-widest mb-2">What's your name?</label>
              <input
                type="text"
                required
                className="w-full px-4 py-3 bg-slate-900 rounded-xl border border-slate-700 focus:outline-none focus:border-indigo-500 transition-colors text-slate-100 placeholder:text-slate-600"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Guest Name"
              />
            </div>
            <button
              type="submit"
              className="w-full flex justify-center py-4 px-4 rounded-xl shadow-lg shadow-indigo-500/20 font-bold text-white bg-indigo-600 hover:bg-indigo-500 transition-all active:scale-95"
            >
              Ask to Join
            </button>
          </form>
        )}

        {requestStatus === 'pending' && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <Loader2 className="w-12 h-12 text-indigo-500 animate-spin mb-6" />
            <h3 className="text-xl font-bold text-slate-200 mb-2">Waiting for approval...</h3>
            <p className="text-slate-400 text-sm">You'll join the video call when someone lets you in.</p>
          </div>
        )}

        {requestStatus === 'rejected' && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <div className="w-16 h-16 bg-red-500/20 text-red-500 rounded-full flex items-center justify-center mb-6">
              <span className="text-3xl font-bold">✕</span>
            </div>
            <h3 className="text-xl font-bold text-red-400 mb-2">Request Denied</h3>
            <p className="text-slate-400 text-sm mb-6">The teacher has declined your request to join.</p>
            <button
              onClick={() => {
                setRequestStatus('none');
                setRequestId(null);
              }}
              className="px-6 py-2 border border-slate-600 text-slate-300 hover:bg-slate-700 rounded-xl font-medium transition-colors"
            >
              Try Again
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
