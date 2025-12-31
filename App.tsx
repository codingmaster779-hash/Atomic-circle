
import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { AppState, Point, CircleResult, ThemeType } from './types';
import { analyzeCircle } from './services/geometry';
import { THEMES } from './themes';

const App: React.FC = () => {
  const [appState, setAppState] = useState<AppState>(AppState.IDLE);
  const [points, setPoints] = useState<Point[]>([]);
  const [result, setResult] = useState<CircleResult | null>(null);
  const [animatedScore, setAnimatedScore] = useState(0);
  const [history, setHistory] = useState<CircleResult[]>([]);
  const [activeTheme, setActiveTheme] = useState<ThemeType>('indigo');
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  const theme = THEMES[activeTheme];
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const isDrawingRef = useRef(false);

  // Persistence
  useEffect(() => {
    try {
      const savedHistory = localStorage.getItem('atomic_history_v2');
      if (savedHistory) setHistory(JSON.parse(savedHistory));
      const savedTheme = localStorage.getItem('atomic_theme_v2') as ThemeType;
      if (savedTheme && THEMES[savedTheme]) setActiveTheme(savedTheme);
    } catch (e) { console.error("Storage error", e); }
  }, []);

  useEffect(() => {
    localStorage.setItem('atomic_history_v2', JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    localStorage.setItem('atomic_theme_v2', activeTheme);
  }, [activeTheme]);

  // Score Animation
  useEffect(() => {
    if (appState === AppState.RATED && result && !result.notClosed) {
      let start = 0;
      const end = result.score;
      const duration = 600;
      const startTime = performance.now();

      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeProgress = 1 - Math.pow(1 - progress, 4); 
        setAnimatedScore(Math.floor(easeProgress * end));
        if (progress < 1) requestAnimationFrame(animate);
      };
      requestAnimationFrame(animate);
    } else {
      setAnimatedScore(0);
    }
  }, [appState, result]);

  const drawOnCanvas = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    const centerX = canvas.width / 2;
    const centerY = canvas.height / 2;

    // Draw Nucleus Pulsing Background
    ctx.beginPath();
    ctx.arc(centerX, centerY, 40, 0, Math.PI * 2);
    ctx.fillStyle = theme.primary + '11';
    ctx.fill();

    // Draw Nucleus Core
    ctx.beginPath();
    ctx.arc(centerX, centerY, 10, 0, Math.PI * 2);
    ctx.fillStyle = theme.primary;
    ctx.shadowBlur = 20;
    ctx.shadowColor = theme.primary;
    ctx.fill();
    ctx.shadowBlur = 0;

    // Draw User Drawing
    if (points.length > 0) {
      ctx.beginPath();
      ctx.lineWidth = 12; // Thicker for mobile
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = theme.primary;
      ctx.shadowBlur = 10;
      ctx.shadowColor = theme.primary + '66';
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Draw closure guidance (magnetic indicator)
      if (isDrawingRef.current && points.length > 10) {
        const start = points[0];
        const end = points[points.length - 1];
        const gap = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2));
        
        // If close enough to be "closed", show a hint
        if (gap < 80) {
          ctx.beginPath();
          ctx.setLineDash([5, 5]);
          ctx.lineWidth = 2;
          ctx.strokeStyle = theme.primary + '88';
          ctx.moveTo(end.x, end.y);
          ctx.lineTo(start.x, start.y);
          ctx.stroke();
          ctx.setLineDash([]);
        }
      }
    }

    // Feedback Perfect Circle
    if (appState === AppState.RATED && result && !result.notClosed && result.score > 0) {
      ctx.beginPath();
      ctx.setLineDash([15, 15]);
      ctx.lineWidth = 4;
      ctx.strokeStyle = theme.secondary + '33';
      ctx.arc(result.centerX, result.centerY, result.radius, 0, Math.PI * 2);
      ctx.stroke();
      ctx.setLineDash([]);
    }
  }, [points, appState, result, theme]);

  useEffect(() => {
    drawOnCanvas();
  }, [drawOnCanvas]);

  const handleStart = (x: number, y: number) => {
    if (appState === AppState.RATED) {
      setResult(null);
      setAppState(AppState.IDLE);
    }
    isDrawingRef.current = true;
    setAppState(AppState.DRAWING);
    setPoints([{ x, y }]);
  };

  const handleMove = (x: number, y: number) => {
    if (!isDrawingRef.current) return;
    setPoints(prev => [...prev, { x, y }]);
  };

  const handleEnd = () => {
    if (!isDrawingRef.current) return;
    isDrawingRef.current = false;
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    const nucleus = { x: canvas.width / 2, y: canvas.height / 2 };

    if (points.length > 5) {
      const analysis = analyzeCircle(points, nucleus);
      setResult(analysis);
      setAppState(AppState.RATED);
      
      if (!analysis.isTooSmall && !analysis.notClosed && analysis.score > 0) {
        setHistory(prev => [analysis, ...prev].slice(0, 30));
      }
    } else {
      setAppState(AppState.IDLE);
      setPoints([]);
    }
  };

  const getCanvasCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;
    if ('touches' in e) {
      clientX = e.touches[0].clientX;
      clientY = e.touches[0].clientY;
    } else {
      clientX = e.clientX;
      clientY = e.clientY;
    }
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (clientX - rect.left) * scaleX,
      y: (clientY - rect.top) * scaleY
    };
  };

  const stats = useMemo(() => ({
    best: history.length > 0 ? Math.max(...history.map(h => h.score)) : 0,
    avg: history.length > 0 ? Math.round(history.reduce((a, b) => a + b.score, 0) / history.length) : 0
  }), [history]);

  return (
    <div 
      className="min-h-screen flex flex-col items-center justify-center p-3 transition-all duration-700 overflow-hidden"
      style={{ backgroundColor: theme.bg, color: theme.text }}
    >
      <div 
        className="w-full max-w-xl rounded-[3rem] shadow-2xl relative flex flex-col items-center p-6 md:p-10 space-y-6 overflow-hidden transition-all duration-500"
        style={{ backgroundColor: theme.card }}
      >
        {/* Header */}
        <div className="w-full flex justify-between items-start z-10 px-2">
          <div className="flex flex-col">
            <h1 className="text-3xl font-black tracking-tighter" style={{ color: theme.text }}>
              Atomic<span style={{ color: theme.primary }}>.</span>
            </h1>
            <div className="flex gap-4 mt-0.5">
              <span className="text-[10px] font-bold uppercase tracking-widest opacity-40">Best: {stats.best}%</span>
              <span className="text-[10px] font-bold uppercase tracking-widest opacity-40">Avg: {stats.avg}%</span>
            </div>
          </div>
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="w-12 h-12 rounded-2xl flex items-center justify-center transition-all hover:scale-110 active:scale-90"
            style={{ backgroundColor: theme.accent }}
          >
            <SettingsIcon color={theme.primary} />
          </button>
        </div>

        {/* Drawing Zone - Larger for Mobile */}
        <div className="relative w-full aspect-square rounded-[2.5rem] overflow-hidden transition-all duration-500 border-4 border-transparent shadow-inner"
             style={{ 
               backgroundColor: theme.bg, 
               boxShadow: `inset 0 0 60px ${theme.accent}` 
             }}>
          <canvas
            ref={canvasRef}
            width={1000}
            height={1000}
            className="w-full h-full block touch-none cursor-crosshair"
            onMouseDown={(e) => { const { x, y } = getCanvasCoordinates(e); handleStart(x, y); }}
            onMouseMove={(e) => { const { x, y } = getCanvasCoordinates(e); handleMove(x, y); }}
            onMouseUp={handleEnd}
            onMouseLeave={handleEnd}
            onTouchStart={(e) => { const { x, y } = getCanvasCoordinates(e); handleStart(x, y); }}
            onTouchMove={(e) => { const { x, y } = getCanvasCoordinates(e); handleMove(x, y); }}
            onTouchEnd={handleEnd}
          />
          
          {appState === AppState.IDLE && (
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none opacity-20 transition-opacity">
               <span className="text-[11px] font-black uppercase tracking-[0.5em] mt-32">Orbit the Core</span>
            </div>
          )}

          {appState === AppState.RATED && result && (
            <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-6">
              <div 
                className="self-start glass p-5 rounded-[2rem] shadow-2xl border animate-in zoom-in duration-300"
                style={{ backgroundColor: theme.card + 'ee', borderColor: theme.accent }}
              >
                <div className="text-5xl md:text-6xl font-black leading-none" style={{ color: theme.primary }}>
                  {result.notClosed ? '?' : animatedScore}<span className="text-xl ml-1 opacity-30">%</span>
                </div>
                <div className="text-[9px] font-bold opacity-40 uppercase tracking-widest mt-1">Stability index</div>
              </div>

              <div 
                className="self-end glass px-5 py-3 rounded-2xl shadow-xl border animate-in slide-in-from-right-8 duration-500"
                style={{ backgroundColor: theme.card + 'ee', borderColor: theme.accent }}
              >
                <p className="text-base font-black uppercase tracking-tight italic" style={{ color: theme.text }}>{result.message}</p>
              </div>
            </div>
          )}
        </div>

        <div className="text-center opacity-40 text-[9px] font-black uppercase tracking-[0.3em] pb-2">
           Draw loop around the nucleus
        </div>

        {/* Settings Panel */}
        {isSettingsOpen && (
          <div className="absolute inset-0 z-50 flex flex-col p-8 animate-in slide-in-from-right duration-400" style={{ backgroundColor: theme.card }}>
            <div className="flex justify-between items-center mb-10">
              <h2 className="text-3xl font-black tracking-tighter">The Vault</h2>
              <button 
                onClick={() => setIsSettingsOpen(false)} 
                className="w-12 h-12 rounded-full flex items-center justify-center shadow-md active:scale-90"
                style={{ backgroundColor: theme.accent }}
              >
                <CloseIcon color={theme.primary} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-10 pr-2 custom-scrollbar">
              
              <section>
                <div className="flex items-center gap-2 mb-6 opacity-60">
                   <div className="w-2 h-2 rounded-full" style={{ backgroundColor: theme.primary }} />
                   <h3 className="text-xs font-black uppercase tracking-widest">Visual Layers</h3>
                </div>
                <div className="grid grid-cols-3 gap-4">
                  {(Object.keys(THEMES) as ThemeType[]).map((t) => (
                    <button
                      key={t}
                      onClick={() => setActiveTheme(t)}
                      className={`group relative aspect-square rounded-[1.5rem] border-4 transition-all ${activeTheme === t ? 'scale-110 shadow-xl' : 'opacity-40 hover:opacity-100 hover:scale-105'}`}
                      style={{ 
                        backgroundColor: THEMES[t].primary, 
                        borderColor: activeTheme === t ? THEMES[t].accent : 'transparent' 
                      }}
                    >
                      <span className="absolute inset-0 flex items-center justify-center text-[8px] font-black text-white/50 uppercase opacity-0 group-hover:opacity-100 transition-opacity">
                        {t}
                      </span>
                    </button>
                  ))}
                </div>
              </section>

              <section className="pb-6">
                <div className="flex items-center gap-2 mb-6 opacity-60">
                   <div className="w-2 h-2 rounded-full" style={{ backgroundColor: theme.primary }} />
                   <h3 className="text-xs font-black uppercase tracking-widest">Recent Cycles</h3>
                </div>
                <div className="space-y-2">
                  {history.length === 0 ? (
                    <div className="p-12 text-center border-2 border-dashed rounded-[2rem] opacity-20" style={{ borderColor: theme.accent }}>
                       <p className="text-xs italic font-bold">No recordings yet.</p>
                    </div>
                  ) : (
                    history.map((h, i) => (
                      <div 
                        key={h.timestamp + i} 
                        className="p-4 rounded-3xl flex justify-between items-center"
                        style={{ backgroundColor: theme.bg }}
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl flex flex-col items-center justify-center font-black" style={{ backgroundColor: theme.card }}>
                            <span className="text-lg" style={{ color: theme.primary }}>{h.score}</span>
                            <span className="text-[6px] opacity-20 mt-[-4px]">%</span>
                          </div>
                          <div>
                             <p className="text-[13px] font-black uppercase tracking-tight opacity-90">{h.message}</p>
                             <p className="text-[8px] opacity-30 font-bold">{new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>
            </div>
            
            <button 
              onClick={() => { if(confirm('Flush history?')) { setHistory([]); localStorage.removeItem('atomic_history_v2'); } }}
              className="mt-4 w-full py-4 rounded-2xl text-[10px] font-black opacity-20 hover:opacity-100 hover:text-red-500 transition-all uppercase tracking-[0.3em]"
            >
              Clear Data
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const SettingsIcon = ({ color }: { color: string }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>
  </svg>
);

const CloseIcon = ({ color }: { color: string }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 6L6 18M6 6l12 12"/>
  </svg>
);

export default App;
