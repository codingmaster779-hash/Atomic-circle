
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
      const duration = 800;
      const startTime = performance.now();

      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const easeProgress = 1 - Math.pow(1 - progress, 3); // Ease out cubic
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

    // Nucleus Location
    const nucleusX = canvas.width / 2;
    const nucleusY = canvas.height / 2;

    // Draw Nucleus
    ctx.beginPath();
    ctx.arc(nucleusX, nucleusY, 8, 0, Math.PI * 2);
    ctx.fillStyle = theme.primary;
    ctx.shadowBlur = 15;
    ctx.shadowColor = theme.primary;
    ctx.fill();
    ctx.shadowBlur = 0;

    // Draw User Line
    if (points.length > 0) {
      ctx.beginPath();
      ctx.lineWidth = 10;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = theme.primary;
      ctx.shadowBlur = 8;
      ctx.shadowColor = theme.primary + '55';
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // Draw Feedback Circle
    if (appState === AppState.RATED && result && !result.notClosed && result.score > 0) {
      ctx.beginPath();
      ctx.setLineDash([15, 15]);
      ctx.lineWidth = 3;
      ctx.strokeStyle = theme.secondary + '44';
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

  const highPaceStats = useMemo(() => ({
    best: history.length > 0 ? Math.max(...history.map(h => h.score)) : 0,
    avg: history.length > 0 ? Math.round(history.reduce((a, b) => a + b.score, 0) / history.length) : 0
  }), [history]);

  return (
    <div 
      className="min-h-screen flex flex-col items-center justify-center p-4 transition-all duration-700 overflow-hidden"
      style={{ backgroundColor: theme.bg, color: theme.text }}
    >
      <div 
        className="w-full max-w-xl rounded-[3.5rem] shadow-2xl relative flex flex-col items-center p-8 md:p-12 space-y-8 overflow-hidden transition-all duration-500"
        style={{ backgroundColor: theme.card }}
      >
        {/* Title & Best Score */}
        <div className="w-full flex justify-between items-start z-10">
          <div className="flex flex-col">
            <h1 className="text-4xl font-black tracking-tighter" style={{ color: theme.text }}>
              Atomic<span style={{ color: theme.primary }}>.</span>
            </h1>
            <div className="flex gap-3 mt-1">
              <span className="text-[10px] font-bold uppercase tracking-widest opacity-40">Best: {highPaceStats.best}%</span>
              <span className="text-[10px] font-bold uppercase tracking-widest opacity-40">Avg: {highPaceStats.avg}%</span>
            </div>
          </div>
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="w-14 h-14 rounded-2xl flex items-center justify-center transition-all hover:scale-110 active:scale-90"
            style={{ backgroundColor: theme.accent }}
          >
            <SettingsIcon color={theme.primary} />
          </button>
        </div>

        {/* Drawing Zone */}
        <div className="relative w-full aspect-square rounded-[3rem] overflow-hidden transition-all duration-500"
             style={{ 
               backgroundColor: theme.bg, 
               boxShadow: `inset 0 0 50px ${theme.accent}` 
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
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none gap-3">
              <div className="w-20 h-20 border-2 border-dashed rounded-full animate-spin duration-[15s] opacity-10" style={{ borderColor: theme.text }} />
              <span className="text-[10px] font-bold uppercase tracking-[0.4em] opacity-30">Orbit the Core</span>
            </div>
          )}

          {appState === AppState.RATED && result && (
            <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-8">
              <div 
                className="self-start glass p-6 rounded-[2.5rem] shadow-xl border animate-in zoom-in duration-300"
                style={{ backgroundColor: theme.card + '99', borderColor: theme.accent }}
              >
                <div className="text-6xl font-black leading-none" style={{ color: theme.primary }}>
                  {result.notClosed ? '?' : animatedScore}<span className="text-2xl ml-1 opacity-40">%</span>
                </div>
                <div className="text-[10px] font-bold opacity-40 uppercase tracking-widest mt-2">Stability Index</div>
              </div>

              <div 
                className="self-end glass px-6 py-3 rounded-2xl shadow-lg border animate-in slide-in-from-right-8 duration-500"
                style={{ backgroundColor: theme.card + '99', borderColor: theme.accent }}
              >
                <p className="text-lg font-black uppercase tracking-tight italic" style={{ color: theme.text }}>{result.message}</p>
              </div>
            </div>
          )}
        </div>

        <div className="text-center opacity-30 text-[9px] font-black uppercase tracking-[0.4em]">
           Auto-rating active • Draw to restart
        </div>

        {/* Settings Panel */}
        {isSettingsOpen && (
          <div className="absolute inset-0 z-50 flex flex-col p-10 animate-in slide-in-from-right duration-500" style={{ backgroundColor: theme.card }}>
            <div className="flex justify-between items-center mb-10">
              <h2 className="text-4xl font-black tracking-tighter">The Vault</h2>
              <button 
                onClick={() => setIsSettingsOpen(false)} 
                className="w-14 h-14 rounded-full flex items-center justify-center shadow-md transition-transform active:scale-90"
                style={{ backgroundColor: theme.accent }}
              >
                <CloseIcon color={theme.primary} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-12 pr-4 custom-scrollbar">
              
              {/* Theme Selector */}
              <section>
                <div className="flex items-center gap-3 mb-6">
                   <div className="w-2 h-2 rounded-full" style={{ backgroundColor: theme.primary }} />
                   <h3 className="text-xs font-black uppercase tracking-widest opacity-50">Visual Skins</h3>
                </div>
                <div className="grid grid-cols-3 gap-5">
                  {(Object.keys(THEMES) as ThemeType[]).map((t) => (
                    <button
                      key={t}
                      onClick={() => setActiveTheme(t)}
                      className={`group relative aspect-square rounded-3xl border-4 transition-all ${activeTheme === t ? 'scale-110 shadow-2xl ring-4 ring-offset-2 ring-transparent' : 'opacity-40 hover:opacity-100 hover:scale-105'}`}
                      style={{ 
                        backgroundColor: THEMES[t].primary, 
                        borderColor: activeTheme === t ? THEMES[t].accent : 'transparent' 
                      }}
                    >
                      <span className="absolute bottom-2 left-0 right-0 text-[8px] font-black text-white uppercase opacity-0 group-hover:opacity-100 transition-opacity">
                        {t}
                      </span>
                    </button>
                  ))}
                </div>
              </section>

              {/* Stats & History */}
              <section className="pb-8">
                <div className="flex items-center gap-3 mb-6">
                   <div className="w-2 h-2 rounded-full" style={{ backgroundColor: theme.primary }} />
                   <h3 className="text-xs font-black uppercase tracking-widest opacity-50">Log Book</h3>
                </div>
                <div className="space-y-3">
                  {history.length === 0 ? (
                    <div className="p-16 text-center border-4 border-dashed rounded-[3rem] opacity-20" style={{ borderColor: theme.accent }}>
                       <p className="text-sm italic font-bold">Empty nucleus...</p>
                    </div>
                  ) : (
                    history.map((h, i) => (
                      <div 
                        key={h.timestamp + i} 
                        className="p-5 rounded-[2rem] flex justify-between items-center transition-transform hover:-translate-y-1"
                        style={{ backgroundColor: theme.bg }}
                      >
                        <div className="flex items-center gap-5">
                          <div className="w-14 h-14 rounded-2xl flex flex-col items-center justify-center font-black" style={{ backgroundColor: theme.card }}>
                            <span className="text-xl" style={{ color: theme.primary }}>{h.score}</span>
                            <span className="text-[7px] opacity-30 mt-[-2px]">%</span>
                          </div>
                          <div>
                             <p className="text-sm font-black uppercase tracking-tight opacity-90">{h.message}</p>
                             <p className="text-[9px] opacity-30 font-bold">{new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>
            </div>
            
            <button 
              onClick={() => { if(confirm('Wipe progress?')) { setHistory([]); localStorage.removeItem('atomic_history_v2'); } }}
              className="mt-6 w-full py-5 rounded-2xl text-[10px] font-black opacity-20 hover:opacity-100 hover:text-red-500 transition-all uppercase tracking-[0.4em]"
            >
              Clear Records
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const SettingsIcon = ({ color }: { color: string }) => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>
  </svg>
);

const CloseIcon = ({ color }: { color: string }) => (
  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 6L6 18M6 6l12 12"/>
  </svg>
);

export default App;
