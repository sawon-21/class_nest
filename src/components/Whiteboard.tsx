import React, { useRef, useState, useEffect } from 'react';
import { collection, doc, query, onSnapshot, setDoc, updateDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { Pencil, Eraser, Trash2, X } from 'lucide-react';

interface Point {
  x: number;
  y: number;
}
interface Line {
  points: Point[];
  color: string;
  size: number;
  isEraser: boolean;
}

interface WhiteboardProps {
  meetingId: string;
  isTeacher: boolean;
}

export default function Whiteboard({ meetingId, isTeacher }: WhiteboardProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [color, setColor] = useState('#000000');
  const [size, setSize] = useState(4);
  const [isEraser, setIsEraser] = useState(false);
  
  const [lines, setLines] = useState<Line[]>([]);
  const currentLineRef = useRef<Line | null>(null);

  useEffect(() => {
    // Listen for lines
    const wbRef = doc(db, 'whiteboards', meetingId);
    const unsub = onSnapshot(wbRef, (docSnap) => {
       if (docSnap.exists()) {
          setLines(docSnap.data().lines || []);
       }
    });

    const initBoard = async () => {
      if (isTeacher) {
        // Teacher ensures board doc exists
        await setDoc(wbRef, { meetingId, lines: lines }, { merge: true });
      }
    };
    initBoard();

    return () => unsub();
  }, [meetingId, isTeacher]);

  const drawLines = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    // Draw white background so eraser looks right if we export, but also canvas is white anyway
    
    lines.forEach(line => {
      ctx.beginPath();
      ctx.strokeStyle = line.isEraser ? '#ffffff' : line.color;
      ctx.lineWidth = line.size;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      
      line.points.forEach((p, i) => {
        if (i === 0) ctx.moveTo(p.x, p.y);
        else ctx.lineTo(p.x, p.y);
      });
      ctx.stroke();
    });
  };

  useEffect(() => {
    drawLines();
  }, [lines]);

  // Handle Resize
  useEffect(() => {
    const handleResize = () => {
       const canvas = canvasRef.current;
       const container = containerRef.current;
       if (!canvas || !container) return;
       canvas.width = container.clientWidth;
       canvas.height = container.clientHeight;
       drawLines();
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [lines]);

  const saveLines = async (newLines: Line[]) => {
    if (!isTeacher) return;
    try {
      await updateDoc(doc(db, 'whiteboards', meetingId), {
        lines: newLines,
        updatedAt: new Date().toISOString()
      });
    } catch(e) {
      console.error("Save error", e);
    }
  };

  const getPos = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    
    let clientX = 0;
    let clientY = 0;
    
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = (e as React.MouseEvent).clientX;
      clientY = (e as React.MouseEvent).clientY;
    }
    
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isTeacher) return;
    e.preventDefault();
    setIsDrawing(true);
    const pos = getPos(e);
    currentLineRef.current = {
       points: [pos],
       color,
       size,
       isEraser
    };
  };

  const processDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isTeacher || !isDrawing || !currentLineRef.current) return;
    e.preventDefault();
    const pos = getPos(e);
    currentLineRef.current.points.push(pos);
    
    // Optimistic local draw
    setLines([...lines, currentLineRef.current]); 
  };

  const stopDrawing = () => {
    if (!isTeacher || !isDrawing || !currentLineRef.current) return;
    setIsDrawing(false);
    
    const newLines = [...lines, currentLineRef.current];
    setLines(newLines);
    saveLines(newLines);
    currentLineRef.current = null;
  };

  const clearBoard = () => {
    if (!isTeacher) return;
    if(confirm("Clear entire whiteboard?")) {
      setLines([]);
      saveLines([]);
    }
  };

  return (
    <div className="absolute inset-0 flex flex-col bg-white">
      {/* Toolbar for Teacher */}
      {isTeacher && (
        <div className="h-16 border-b border-slate-200 bg-slate-50 flex items-center justify-between px-4 z-20">
          <div className="flex items-center gap-4">
            <div className="flex bg-white rounded-lg p-1 border border-slate-200 shadow-sm">
              <button 
                onClick={() => setIsEraser(false)}
                className={`p-2 rounded-md ${!isEraser ? 'bg-indigo-100 text-indigo-700' : 'text-slate-500 hover:bg-slate-100'}`}
              >
                <Pencil className="w-5 h-5" />
              </button>
              <button 
                onClick={() => setIsEraser(true)}
                className={`p-2 rounded-md ${isEraser ? 'bg-indigo-100 text-indigo-700' : 'text-slate-500 hover:bg-slate-100'}`}
              >
                <Eraser className="w-5 h-5" />
              </button>
            </div>
            
            <input 
              type="color" 
              value={color}
              onChange={(e) => setColor(e.target.value)}
              disabled={isEraser}
              className="w-10 h-10 p-1 rounded cursor-pointer disabled:opacity-50"
            />
            
            <div className="flex items-center gap-2">
               <span className="text-xs font-bold text-slate-500">SIZE</span>
               <input 
                 type="range" 
                 min="1" max="20" 
                 value={size}
                 onChange={(e) => setSize(parseInt(e.target.value))}
                 className="w-24"
               />
            </div>
          </div>
          
          <button 
             onClick={clearBoard}
             className="flex items-center gap-2 text-red-600 hover:bg-red-50 px-4 py-2 rounded-lg font-bold border border-red-200"
          >
             <Trash2 className="w-4 h-4" />
             Clear
          </button>
        </div>
      )}

      {/* Canvas Container */}
      <div 
         ref={containerRef}
         className="flex-1 relative cursor-crosshair touch-none"
         onMouseDown={startDrawing}
         onMouseMove={processDrawing}
         onMouseUp={stopDrawing}
         onMouseLeave={stopDrawing}
         onTouchStart={startDrawing}
         onTouchMove={processDrawing}
         onTouchEnd={stopDrawing}
      >
        <canvas ref={canvasRef} className="absolute inset-0" />
        
        {!isTeacher && (
           <div className="absolute top-4 left-4 bg-slate-800/80 text-white px-3 py-1.5 rounded-full text-sm font-bold shadow-lg backdrop-blur">
              Teacher's Whiteboard
           </div>
        )}
      </div>
    </div>
  );
}
