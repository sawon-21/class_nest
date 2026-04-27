import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { collection, query, where, getDocs, doc, setDoc, onSnapshot, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuthStore } from '../store/useAuthStore';
import { JitsiMeeting } from '@jitsi/react-sdk';
import { Users, Check, X, ShieldAlert, DoorOpen } from 'lucide-react';

export default function LiveRoom() {
  const { meetingCode } = useParams<{ meetingCode: string }>();
  const navigate = useNavigate();
  const { user } = useAuthStore();
  
  const [meeting, setMeeting] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState<any[]>([]);
  const [showRequests, setShowRequests] = useState(false);

  // Student name if joining as guest
  const guestName = sessionStorage.getItem('studentName') || 'Guest';

  useEffect(() => {
    if (!meetingCode) {
      navigate('/');
      return;
    }

    const fetchMeeting = async () => {
      try {
        const q = query(collection(db, 'meetings'), where('meetingCode', '==', meetingCode));
        const snapshot = await getDocs(q);
        
        if (snapshot.empty) {
          setLoading(false);
          return;
        }
        
        const mDoc = snapshot.docs[0];
        setMeeting({ id: mDoc.id, ...mDoc.data() });
        setLoading(false);
      } catch (err) {
        console.error(err);
        setLoading(false);
      }
    };
    fetchMeeting();
  }, [meetingCode, navigate]);

  // Only the teacher should listen to pending requests
  useEffect(() => {
    if (!meeting || !user || meeting.teacherId !== user.uid) return;

    const q = query(
      collection(db, 'joinRequests'), 
      where('meetingId', '==', meeting.id),
      where('status', '==', 'pending')
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const pRequests = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setRequests(pRequests);
      if (pRequests.length > 0) {
        setShowRequests(true);
      }
    });

    return () => unsubscribe();
  }, [meeting, user]);

  const handleRequest = async (requestId: string, status: 'accepted' | 'rejected', studentName?: string) => {
    try {
      await updateDoc(doc(db, 'joinRequests', requestId), { status });
      if (status === 'accepted' && studentName) {
        // optionally add to participants list
        const partId = doc(collection(db, 'participants')).id;
        await setDoc(doc(db, 'participants', partId), {
          id: partId,
          meetingId: meeting.id,
          studentName,
          joinedAt: new Date().toISOString()
        });
      }
    } catch (e) {
      console.error(e);
    }
  };

  if (loading) {
     return <div className="h-full flex items-center justify-center text-slate-400">Loading meeting environment...</div>;
  }

  if (!meeting) {
    return <div className="h-full flex items-center justify-center text-red-400">Meeting invalid or ended.</div>;
  }

  // The room name needs to be globally unique for Jitsi.
  const jitsiRoomName = `ClassNest-Secure-${meeting.id}`;
  const isTeacher = user && user.uid === meeting.teacherId;

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden relative bg-black">
      {/* Top Bar inside the meeting context */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-4 bg-slate-900/80 backdrop-blur tracking-tight border border-slate-700/50 px-4 py-2 rounded-full shadow-2xl">
        <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></div>
        <span className="font-bold text-slate-200">{meeting.title}</span>
        {isTeacher && (
           <span className="bg-indigo-500/20 text-indigo-400 px-2 py-0.5 rounded text-xs font-bold font-mono">HOST</span>
        )}
      </div>

      {isTeacher && (
        <div className="absolute top-4 right-4 z-10">
          <button 
            onClick={() => setShowRequests(!showRequests)}
            className={`flex items-center gap-2 px-4 py-2 rounded-full shadow-2xl backdrop-blur font-bold transition-all ${requests.length > 0 ? 'bg-indigo-600 hover:bg-indigo-500 text-white' : 'bg-slate-900/80 border border-slate-700 text-slate-300 hover:bg-slate-800'}`}
          >
            <DoorOpen className="w-4 h-4" />
            Waiting Room
            {requests.length > 0 && (
              <span className="w-5 h-5 bg-white text-indigo-600 rounded-full flex items-center justify-center text-xs ml-1">
                {requests.length}
              </span>
            )}
          </button>
        </div>
      )}

      {/* Teacher Request Sidebar overlay */}
      {isTeacher && showRequests && (
        <div className="absolute top-16 right-4 z-20 w-80 max-h-[80vh] flex flex-col bg-slate-900/95 backdrop-blur-xl border border-slate-700 rounded-2xl shadow-2xl overflow-hidden">
          <div className="p-4 border-b border-slate-800 flex items-center justify-between">
            <h3 className="font-bold text-slate-100 flex items-center gap-2">
              <Users className="w-4 h-4" />
              Join Requests
            </h3>
            <button onClick={() => setShowRequests(false)} className="text-slate-400 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="p-2 overflow-y-auto flex-1">
            {requests.length === 0 ? (
              <p className="text-slate-500 text-center py-8 text-sm">No pending requests</p>
            ) : (
              <div className="space-y-2">
                {requests.map(req => (
                  <div key={req.id} className="bg-slate-800 border border-slate-700 p-3 rounded-xl flex items-center justify-between">
                    <span className="font-medium text-slate-200 truncate pr-2" title={req.studentName}>{req.studentName}</span>
                    <div className="flex items-center gap-1">
                      <button 
                        onClick={() => handleRequest(req.id, 'accepted', req.studentName)}
                        className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 hover:bg-emerald-500 hover:text-white flex items-center justify-center transition-colors"
                        title="Accept"
                      >
                        <Check className="w-4 h-4" />
                      </button>
                      <button 
                        onClick={() => handleRequest(req.id, 'rejected')}
                        className="w-8 h-8 rounded-lg bg-red-500/20 text-red-400 hover:bg-red-500 hover:text-white flex items-center justify-center transition-colors"
                        title="Reject"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Jitsi Meet Iframe */}
      <div className="flex-1 w-full bg-slate-950">
        <JitsiMeeting
          domain="meet.jit.si"
          roomName={jitsiRoomName}
          configOverwrite={{
            startWithAudioMuted: true,
            disableModeratorIndicator: true,
            startScreenSharing: true,
            enableEmailInStats: false,
            prejoinPageEnabled: false, // We handle pre-join approval
            disableDeepLinking: true,
          }}
          interfaceConfigOverwrite={{
            DISABLE_JOIN_LEAVE_NOTIFICATIONS: true,
            SHOW_CHROME_EXTENSION_BANNER: false,
          }}
          userInfo={{
            displayName: isTeacher ? (user.displayName || 'Teacher') : guestName,
            email: user?.email || '',
          }}
          onApiReady={(externalApi) => {
            // Wait for API if needed
          }}
          getIFrameRef={(iframeRef) => {
            iframeRef.style.height = '100%';
            iframeRef.style.width = '100%';
            iframeRef.style.border = 'none';
          }}
        />
      </div>
    </div>
  );
}
