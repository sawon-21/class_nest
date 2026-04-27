import React, { useEffect, useRef, useState } from 'react';
import { collection, doc, onSnapshot, setDoc, updateDoc, query, where } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Video, Mic, MicOff, VideoOff } from 'lucide-react';

interface WebRTCRoomProps {
  meetingId: string;
  isTeacher: boolean;
  localId: string; // The user's own ID
  guestName: string;
}

const servers = {
  iceServers: [
    {
      urls: ['stun:stun1.l.google.com:19302', 'stun:stun2.l.google.com:19302'],
    },
  ],
  iceCandidatePoolSize: 10,
};

export default function WebRTCRoom({ meetingId, isTeacher, localId, guestName }: WebRTCRoomProps) {
  const localVideoRef = useRef<HTMLVideoElement>(null);
  
  // For Teacher, they store streams of all students
  const [remoteStreams, setRemoteStreams] = useState<{ id: string, stream: MediaStream }[]>([]);
  // For Student, they just store the teacher's stream
  const [teacherStream, setTeacherStream] = useState<MediaStream | null>(null);
  
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [camOn, setCamOn] = useState(true);
  const [micOn, setMicOn] = useState(true);

  const pcMap = useRef<Record<string, RTCPeerConnection>>({}); // for teacher
  const studentPcRef = useRef<RTCPeerConnection | null>(null); // for student

  useEffect(() => {
    let stream: MediaStream;
    let unsubs: (() => void)[] = [];

    const init = async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      } catch (e) {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: false });
        } catch (err) {
          console.error("Camera access failed", err);
          return;
        }
      }
      
      setLocalStream(stream);
      if (localVideoRef.current) {
         localVideoRef.current.srcObject = stream;
      }

      if (isTeacher) {
        initTeacher(stream, unsubs);
      } else {
        initStudent(stream, unsubs);
      }
    };

    init();

    return () => {
      if (stream) stream.getTracks().forEach(t => t.stop());
      unsubs.forEach(u => u());
      Object.values(pcMap.current).forEach((pc: any) => pc.close());
      if (studentPcRef.current) studentPcRef.current.close();
    };
  }, []);

  const initTeacher = (stream: MediaStream, unsubs: (() => void)[]) => {
    // Listen to signals for this meeting
    const signalsRef = collection(db, 'signals');
    const q = query(signalsRef, where('meetingId', '==', meetingId));

    const unsub = onSnapshot(q, (snapshot) => {
      snapshot.docChanges().forEach(async (change) => {
        const data = change.doc.data();
        const studentId = data.studentId;
        const docId = change.doc.id;
        
        if (change.type === 'added') {
           // We might need to wait for the offer to actually populate if it wasn't set on creation
           if (data.offer && !data.answer && !pcMap.current[studentId]) {
             await answerStudent(studentId, docId, data.offer, stream, unsubs);
           }
        }
        if (change.type === 'modified') {
           if (data.offer && !data.answer && !pcMap.current[studentId]) {
             await answerStudent(studentId, docId, data.offer, stream, unsubs);
           }
        }
        if (change.type === 'removed') {
           if (pcMap.current[studentId]) {
              pcMap.current[studentId].close();
              delete pcMap.current[studentId];
              setRemoteStreams(prev => prev.filter(s => s.id !== studentId));
           }
        }
      });
    });
    unsubs.push(unsub);
  };

  const answerStudent = async (studentId: string, docId: string, offer: any, stream: MediaStream, unsubs: (() => void)[]) => {
    const pc = new RTCPeerConnection(servers);
    pcMap.current[studentId] = pc;

    stream.getTracks().forEach((track) => {
      pc.addTrack(track, stream);
    });

    pc.ontrack = (event) => {
      event.streams[0].getTracks().forEach((track) => {
        setRemoteStreams(prev => {
          if (prev.find(s => s.id === studentId)) return prev;
          const newStream = new MediaStream();
          newStream.addTrack(track);
          return [...prev, { id: studentId, stream: newStream }];
        });
      });
    };

    const docRef = doc(db, 'signals', docId);
    const teacherCandidatesRef = collection(docRef, 'teacherCandidates');
    const studentCandidatesRef = collection(docRef, 'studentCandidates');

    pc.onicecandidate = async (event) => {
      if (event.candidate) {
         await setDoc(doc(teacherCandidatesRef), event.candidate.toJSON());
      }
    };

    await pc.setRemoteDescription(new RTCSessionDescription(offer));
    const answerDescription = await pc.createAnswer();
    await pc.setLocalDescription(answerDescription);

    const answer = {
      type: answerDescription.type,
      sdp: answerDescription.sdp,
    };
    await updateDoc(docRef, { answer });

    const unsubCands = onSnapshot(studentCandidatesRef, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const candidate = new RTCIceCandidate(change.doc.data());
          pc.addIceCandidate(candidate);
        }
      });
    });
    unsubs.push(unsubCands);
  };


  const initStudent = async (stream: MediaStream, unsubs: (() => void)[]) => {
    const docId = `${meetingId}_${localId}`;
    const docRef = doc(db, 'signals', docId);

    const pc = new RTCPeerConnection(servers);
    studentPcRef.current = pc;

    stream.getTracks().forEach((track) => {
      pc.addTrack(track, stream);
    });

    pc.ontrack = (event) => {
      event.streams[0].getTracks().forEach((track) => {
         setTeacherStream(prev => {
            const ms = prev || new MediaStream();
            if (!ms.getTracks().find(t => t.id === track.id)) {
               ms.addTrack(track);
            }
            return ms;
         });
      });
    };

    const teacherCandidatesRef = collection(docRef, 'teacherCandidates');
    const studentCandidatesRef = collection(docRef, 'studentCandidates');

    pc.onicecandidate = async (event) => {
      if (event.candidate) {
         await setDoc(doc(studentCandidatesRef), event.candidate.toJSON());
      }
    };

    // Make sure doc exists first, then we update it with offer
    await setDoc(docRef, {
      meetingId,
      studentId: localId,
      studentName: guestName,
    });

    const offerDescription = await pc.createOffer();
    await pc.setLocalDescription(offerDescription);

    const offer = {
      type: offerDescription.type,
      sdp: offerDescription.sdp,
    };
    await updateDoc(docRef, { offer });

    const unsub = onSnapshot(docRef, (snapshot) => {
      const data = snapshot.data();
      if (!pc.currentRemoteDescription && data?.answer) {
        const answerDescription = new RTCSessionDescription(data.answer);
        pc.setRemoteDescription(answerDescription);
      }
    });
    unsubs.push(unsub);

    const unsubCands = onSnapshot(teacherCandidatesRef, (snapshot) => {
      snapshot.docChanges().forEach((change) => {
        if (change.type === 'added') {
          const candidate = new RTCIceCandidate(change.doc.data());
          pc.addIceCandidate(candidate);
        }
      });
    });
    unsubs.push(unsubCands);
  };

  const toggleCam = () => {
    if (localStream) {
       localStream.getVideoTracks().forEach(t => t.enabled = !camOn);
       setCamOn(!camOn);
    }
  };

  const toggleMic = () => {
    if (localStream) {
       localStream.getAudioTracks().forEach(t => t.enabled = !micOn);
       setMicOn(!micOn);
    }
  };

  return (
    <div className="flex-1 w-full flex bg-slate-950 p-4 gap-4 relative">
      
      {/* Main Stage */}
      <div className="flex-1 rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 relative flex items-center justify-center">
         {isTeacher ? (
           <div className="flex flex-wrap gap-4 p-4 w-full h-full content-start overflow-y-auto">
             {/* Teacher sees all students */}
             {remoteStreams.length === 0 ? (
                <div className="w-full h-full flex flex-col items-center justify-center text-slate-500">
                  Waiting for students to join...
                </div>
             ) : (
                remoteStreams.map(rs => (
                  <div key={rs.id} className="relative bg-black rounded-lg overflow-hidden w-full max-w-sm aspect-video border border-slate-700">
                     <VideoElement stream={rs.stream} />
                     <div className="absolute bottom-2 left-2 bg-black/50 px-2 py-1 rounded text-xs">Student ID: {rs.id.slice(0, 4)}</div>
                  </div>
                ))
             )}
           </div>
         ) : (
           /* Student sees teacher */
           <div className="w-full h-full bg-black relative">
             {teacherStream ? (
               <VideoElement stream={teacherStream} />
             ) : (
               <div className="w-full h-full flex flex-col items-center justify-center text-slate-500">
                  Waiting for teacher's video...
               </div>
             )}
           </div>
         )}
      </div>

      {/* Local Video Thumbnail */}
      <div className="absolute bottom-8 right-8 w-48 aspect-video bg-black rounded-xl border-2 border-slate-700 shadow-2xl overflow-hidden z-20">
         <video 
            ref={localVideoRef} 
            autoPlay 
            playsInline 
            muted 
            className={`w-full h-full object-cover ${camOn ? '' : 'hidden'} transform scale-x-[-1]`}
         />
         {!camOn && (
            <div className="w-full h-full flex items-center justify-center bg-slate-800">
               <VideoOff className="w-6 h-6 text-slate-500" />
            </div>
         )}
         <div className="absolute bottom-2 left-2 bg-black/60 px-2 py-0.5 rounded text-xs font-bold font-mono">You</div>
      </div>

      {/* Controls */}
      <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-4 bg-slate-800/80 backdrop-blur border border-slate-700 p-2 rounded-2xl shadow-xl z-20">
         <button 
           onClick={toggleMic}
           className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${micOn ? 'bg-slate-700 hover:bg-slate-600' : 'bg-red-500 hover:bg-red-600 text-white'}`}
         >
           {micOn ? <Mic className="w-5 h-5 text-white" /> : <MicOff className="w-5 h-5" />}
         </button>
         <button 
           onClick={toggleCam}
           className={`w-12 h-12 rounded-xl flex items-center justify-center transition-colors ${camOn ? 'bg-slate-700 hover:bg-slate-600' : 'bg-red-500 hover:bg-red-600 text-white'}`}
         >
           {camOn ? <Video className="w-5 h-5 text-white" /> : <VideoOff className="w-5 h-5" />}
         </button>
      </div>

    </div>
  );
}

// Separate component to handle remote video assignment easily
function VideoElement({ stream }: { stream: MediaStream }) {
  const ref = useRef<HTMLVideoElement>(null);
  useEffect(() => {
    if (ref.current) ref.current.srcObject = stream;
  }, [stream]);
  return <video ref={ref} autoPlay playsInline className="w-full h-full object-cover" />;
}
