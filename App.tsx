
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
    const savedHistory = localStorage.getItem('atomic_history');
    if (savedHistory) setHistory(JSON.parse(savedHistory));
    
    const savedTheme = localStorage.getItem('atomic_theme') as ThemeType;
    if (savedTheme && THEMES[savedTheme]) setActiveTheme(savedTheme);
  }, []);

  useEffect(() => {
    localStorage.setItem('atomic_history', JSON.stringify(history));
  }, [history]);

  useEffect(() => {
    localStorage.setItem('atomic_theme', activeTheme);
  }, [activeTheme]);

  // Score animation
  useEffect(() => {
    if (appState === AppState.RATED && result && !result.notClosed) {
      let start = 0;
      const end = result.score;
      const duration = 700;
      const startTime = performance.now();

      const animate = (currentTime: number) => {
        const elapsed = currentTime - startTime;
        const progress = Math.min(elapsed / duration, 1);
        setAnimatedScore(Math.floor(progress * end));
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

    // Draw Nucleus (Center Dot)
    ctx.beginPath();
    ctx.arc(centerX, centerY, 6, 0, Math.PI * 2);
    ctx.fillStyle = theme.primary;
    ctx.shadowBlur = 20;
    ctx.shadowColor = theme.primary;
    ctx.fill();
    ctx.shadowBlur = 0;

    // Drawing Path
    if (points.length > 0) {
      ctx.beginPath();
      ctx.lineWidth = 8;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.strokeStyle = theme.primary;
      ctx.shadowBlur = 10;
      ctx.shadowColor = theme.primary + '44';
      ctx.moveTo(points[0].x, points[0].y);
      for (let i = 1; i < points.length; i++) {
        ctx.lineTo(points[i].x, points[i].y);
      }
      ctx.stroke();
      ctx.shadowBlur = 0;
    }

    // Ghost Perfect Circle (Only if score > 0)
    if (appState === AppState.RATED && result && result.score > 0 && !result.notClosed) {
      ctx.beginPath();
      ctx.setLineDash([15, 15]);
      ctx.lineWidth = 3;
      ctx.strokeStyle = theme.secondary + '66';
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
      setAnimatedScore(0);
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
    
    if (points.length > 8) {
      const analysis = analyzeCircle(points);
      setResult(analysis);
      setAppState(AppState.RATED);
      
      // Only save to history if it's a valid, closed figure that isn't too small
      if (!analysis.isTooSmall && !analysis.notClosed && analysis.score > 0) {
        setHistory(prev => [analysis, ...prev].slice(0, 50));
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

  const bestScore = useMemo(() => {
    return history.length > 0 ? Math.max(...history.map(h => h.score)) : 0;
  }, [history]);

  return (
    <div 
      className="min-h-screen flex flex-col items-center justify-center p-4 transition-all duration-1000 select-none"
      style={{ backgroundColor: theme.bg, color: theme.text }}
    >
      <div 
        className="w-full max-w-2xl rounded-[4rem] shadow-[0_40px_100px_-20px_rgba(0,0,0,0.25)] relative flex flex-col items-center p-6 md:p-12 space-y-8 overflow-hidden transition-all duration-700"
        style={{ backgroundColor: theme.card }}
      >
        {/* Decorative Background Elements */}
        <div className="absolute top-0 right-0 w-64 h-64 opacity-[0.03] pointer-events-none" 
             style={{ backgroundColor: theme.primary, borderRadius: '50%', transform: 'translate(30%, -30%)' }} />

        {/* Header */}
        <div className="w-full flex justify-between items-end relative z-10">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full animate-pulse" style={{ backgroundColor: theme.primary }} />
              <h1 className="text-4xl font-black tracking-tighter" style={{ color: theme.text }}>
                Atomic.
              </h1>
            </div>
            <div className="mt-1 flex gap-4">
              <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">NUCLEUS STABLE</span>
              <span className="text-[10px] font-black uppercase tracking-[0.2em] opacity-40">BEST: {bestScore}%</span>
            </div>
          </div>
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="group w-16 h-16 rounded-3xl flex items-center justify-center transition-all duration-500 hover:rotate-90 hover:scale-110 active:scale-90 shadow-lg"
            style={{ backgroundColor: theme.accent }}
          >
            <SettingsIcon color={theme.primary} />
          </button>
        </div>

        {/* Canvas Area */}
        <div className="relative w-full aspect-square rounded-[3.5rem] overflow-hidden group transition-all duration-700"
             style={{ 
               backgroundColor: theme.bg, 
               boxShadow: `inset 0 0 80px ${theme.accent}, 0 20px 40px -20px ${theme.primary}33` 
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
            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
              <div className="flex flex-col items-center gap-4 animate-in fade-in zoom-in duration-1000">
                 <div className="w-16 h-16 border-2 border-dashed rounded-full animate-spin duration-[10s] opacity-20" style={{ borderColor: theme.text }} />
                 <span className="opacity-20 font-black text-xs uppercase tracking-[0.5em]">Orbit The Core</span>
              </div>
            </div>
          )}

          {appState === AppState.RATED && result && (
            <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-10">
              <div 
                className="self-start px-8 py-6 rounded-[2.5rem] shadow-2xl backdrop-blur-2xl border-2 animate-in slide-in-from-left-12 duration-500"
                style={{ backgroundColor: theme.card + 'bb', borderColor: theme.accent }}
              >
                <div className="text-7xl font-black leading-none" style={{ color: theme.primary }}>
                  {result.notClosed ? '?' : animatedScore}<span className="text-2xl ml-1 opacity-30">{result.notClosed ? '' : '%'}</span>
                </div>
                <p className="text-[10px] font-black opacity-30 uppercase tracking-[0.3em] mt-3">Accuracy Index</p>
              </div>

              <div 
                className="self-end px-6 py-3 rounded-2xl shadow-xl border backdrop-blur-md animate-in slide-in-from-right-12 duration-700"
                style={{ backgroundColor: theme.card + 'bb', borderColor: theme.accent }}
              >
                <p className="text-lg font-black italic uppercase tracking-tight" style={{ color: theme.text }}>{result.message}</p>
              </div>
            </div>
          )}
        </div>

        <div className="text-center pb-2 opacity-30">
            <p className="text-[9px] font-black uppercase tracking-[0.6em]">System Online • Ready to Rate</p>
        </div>

        {/* Settings Overlay */}
        {isSettingsOpen && (
          <div className="absolute inset-0 z-50 flex flex-col p-10 animate-in slide-in-from-right duration-500 ease-out-expo" 
               style={{ backgroundColor: theme.card }}>
            
            <div className="flex justify-between items-center mb-12">
              <div className="flex flex-col">
                <h2 className="text-5xl font-black tracking-tighter">The Vault</h2>
                <div className="flex items-center gap-2 mt-1">
                   <div className="w-2 h-2 rounded-full" style={{ backgroundColor: theme.primary }} />
                   <p className="text-[10px] font-black opacity-30 tracking-[0.3em] uppercase">Core Settings</p>
                </div>
              </div>
              <button 
                onClick={() => setIsSettingsOpen(false)} 
                className="w-16 h-16 rounded-[2rem] flex items-center justify-center transition-all hover:scale-110 active:scale-90 shadow-md"
                style={{ backgroundColor: theme.accent }}
              >
                <CloseIcon color={theme.primary} />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-16 pr-4 custom-scrollbar">
              
              {/* Theme Selection */}
              <section>
                <div className="flex justify-between items-center mb-8">
                   <h3 className="text-sm font-black uppercase tracking-widest opacity-60">Visual Matrix</h3>
                   <span className="text-[10px] opacity-30">{Object.keys(THEMES).length} Available</span>
                </div>
                <div className="grid grid-cols-3 gap-6">
                  {(Object.keys(THEMES) as ThemeType[]).map((t) => (
                    <button
                      key={t}
                      onClick={() => setActiveTheme(t)}
                      className={`group relative aspect-square rounded-[2rem] border-4 transition-all duration-500 ${activeTheme === t ? 'scale-110 shadow-2xl z-10' : 'opacity-40 hover:opacity-100 hover:scale-105'}`}
                      style={{ 
                        backgroundColor: THEMES[t].primary, 
                        borderColor: activeTheme === t ? THEMES[t].accent : 'transparent' 
                      }}
                    >
                      <div className="absolute inset-2 rounded-[1.5rem] border border-white/10" />
                      <span className="absolute bottom-3 left-0 right-0 text-[9px] font-black text-white uppercase text-center opacity-0 group-hover:opacity-100 transition-opacity">
                        {t}
                      </span>
                    </button>
                  ))}
                </div>
              </section>

              {/* Attempt Log */}
              <section className="pb-10">
                <div className="flex justify-between items-center mb-8">
                   <h3 className="text-sm font-black uppercase tracking-widest opacity-60">Memory Core</h3>
                   <span className="text-[10px] opacity-30">{history.length} Saved</span>
                </div>
                <div className="space-y-4">
                  {history.length === 0 ? (
                    <div className="p-16 text-center rounded-[3rem] opacity-20 border-4 border-dashed" style={{ borderColor: theme.accent }}>
                       <p className="text-sm font-black italic uppercase">No data found in nucleus.</p>
                    </div>
                  ) : (
                    history.map((h, i) => (
                      <div 
                        key={h.timestamp + i} 
                        className="group p-6 rounded-[2.5rem] flex justify-between items-center transition-all hover:translate-x-2"
                        style={{ backgroundColor: theme.bg }}
                      >
                        <div className="flex items-center gap-6">
                          <div className="w-16 h-16 rounded-[1.5rem] flex flex-col items-center justify-center shadow-lg" 
                               style={{ backgroundColor: theme.card }}>
                            <span className="text-2xl font-black leading-none" style={{ color: theme.primary }}>{h.score}</span>
                            <span className="text-[8px] font-black opacity-30 uppercase">PTS</span>
                          </div>
                          <div>
                            <p className="text-[10px] font-black opacity-30 uppercase tracking-tighter">Transmission #{history.length - i}</p>
                            <p className="text-lg font-black uppercase tracking-tight opacity-90">{h.message}</p>
                          </div>
                        </div>
                        <div className="text-right flex flex-col items-end gap-1">
                          <div className="w-2 h-2 rounded-full" style={{ backgroundColor: h.score > 90 ? '#22c55e' : h.score > 60 ? theme.primary : '#ef4444' }} />
                          <p className="text-[9px] font-black opacity-20 uppercase tracking-widest">{new Date(h.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </section>
            </div>
            
            <button 
              onClick={() => { if(confirm('Erase Memory?')) { setHistory([]); localStorage.removeItem('atomic_history'); } }}
              className="mt-8 w-full py-6 rounded-[2rem] text-[11px] font-black opacity-30 hover:opacity-100 hover:text-red-500 hover:bg-red-50 transition-all uppercase tracking-[0.4em] border-2 border-transparent hover:border-red-100"
            >
              Flush Memory Core
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

const SettingsIcon = ({ color }: { color: string }) => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z"/><circle cx="12" cy="12" r="3"/>
  </svg>
);

const CloseIcon = ({ color }: { color: string }) => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 6L6 18M6 6l12 12"/>
  </svg>
);

export default App;
