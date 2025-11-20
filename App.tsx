import React, { useState, useEffect } from 'react';
import { GameCanvas } from './components/GameCanvas';
import { GameState, GameStats, Inventory, UpgradeOption, Difficulty } from './types';
import { GAME_CONFIG, UPGRADE_DEFINITIONS, MAX_LEVEL } from './constants';
import { generateSurvivalReport } from './services/geminiService';

// --- Icon Helpers ---
const WeaponIcon = ({ id, className }: { id: string, className?: string }) => {
    const props = { className: className || "w-6 h-6", fill: "currentColor", viewBox: "0 0 24 24" };
    switch (id) {
        case 'fireRate': return <svg {...props}><path d="M12 2L2 22l10-4 10 4L12 2zm0 4l-4 12 4-2 4 2-4-12z"/></svg>; // Lightning bolt/Arrow
        case 'multishot': return <svg {...props}><path d="M4 12l1.41 1.41L11 7.83V20h2V7.83l5.58 5.59L20 12l-8-8-8 8z"/><path d="M4 18l1.41 1.41L11 13.83V22h2v-8.17l5.58 5.59L20 18l-8-8-8 8z" opacity="0.5"/></svg>; // Multi arrow
        case 'damage': return <svg {...props}><path d="M14.5 12.5L12 15l-2.5-2.5L7 15l5 5 5-5-2.5-2.5zM12 2C9 2 7 4 7 7c0 1.5.5 3 1.5 4L6 15v5h5l4-2.5c1 1 2.5 1.5 4 1.5 3 3 5 1 5-2s-2-5-5-5c-1.5 0-3 .5-4 1.5l-2.5-4C17 9 17.5 8 17.5 7c0-3-2-5-5-5z"/></svg>; // Bomb/Impact
        case 'speed': return <svg {...props}><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-13h2v6l4.2 2.5-1 1.7L11 14.5V7z"/></svg>; // Clock/Speed
        case 'maxHp': return <svg {...props}><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>;
        case 'regen': return <svg {...props}><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-7 14h-2v-4H6v-2h4V7h2v4h4v2h-4v4z"/></svg>; // Cross
        case 'magnet': return <svg {...props}><path d="M20.5 3l-.5 5.5-2-1.5-2.5 3.5 2.5 1.5-2 3.5 4 4 4-4-2-3.5 2.5-1.5-2.5-3.5-2 1.5L19.5 3zM3.5 3l.5 5.5 2-1.5 2.5 3.5-2.5 1.5 2 3.5-4 4-4-4 2-3.5-2.5-1.5 2.5-3.5 2 1.5L4.5 3z"/></svg>; // Magnet (abstract)
        case 'orbitals': return <svg {...props}><circle cx="12" cy="12" r="3"/><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8z" opacity="0.5"/><circle cx="19" cy="12" r="1.5"/></svg>;
        case 'drone': return <svg {...props}><path d="M21 14h-3.6l-1.9-5h-7l-1.9 5H3v2h3.6l1.9 5h7l1.9-5H21v-2zM12 17c-1.66 0-3-1.34-3-3s1.34-3 3-3 3 1.34 3 3-1.34 3-3 3z"/></svg>;
        case 'dragon': return <svg {...props}><path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 14c-2.21 0-4-1.79-4-4s1.79-4 4-4 4 1.79 4 4-1.79 4-4 4zm-1.5-8.5l-2-2 1.5-1.5 2 2-1.5 1.5zm5 0l-2-2-1.5 1.5 2 2 1.5-1.5z"/></svg>; // Simplified dragon eye
        case 'missile': return <svg {...props}><path d="M16.5 9c-.83 0-1.5-.67-1.5-1.5S15.67 6 16.5 6 18 6.67 18 7.5 17.33 9 16.5 9zM6 14c.55 0 1 .45 1 1s-.45 1-1 1-1-.45-1-1 .45-1 1-1zm15.45-1.8l-2.56-5.11c-.22-.44-.67-.71-1.16-.71H6.1c-1.23 0-2.26.9-2.46 2.11L3 13.5v5c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2v-2.5c0-.73-.36-1.41-.95-1.8z"/></svg>; // Rocket
        case 'lightning': return <svg {...props}><path d="M7 2v11h3v9l7-12h-4l4-8z"/></svg>;
        case 'mine': return <svg {...props}><circle cx="12" cy="12" r="8" opacity="0.3"/><path d="M12 2L2 12l10 10 10-10L12 2zm0 16c-3.31 0-6-2.69-6-6s2.69-6 6-6 6 2.69 6 6-2.69 6-6 6z"/></svg>;
        case 'axe': return <svg {...props}><path d="M4 7c0-1.1.9-2 2-2h8v2H6v10h8v2H6c-1.1 0-2-.9-2-2V7zm14.65 2.3l-2.5 3.25 2.5 3.25c.54.7.27 1.7-.55 2.05-.23.1-.48.15-.73.15-.56 0-1.08-.25-1.43-.7L13 14l2.95-3.3c.34-.45.86-.7 1.43-.7.89 0 1.61.72 1.61 1.61 0 .25-.05.5-.14.69z"/></svg>;
        default: return <div className="w-6 h-6 bg-gray-500 rounded-full" />;
    }
}

const StatIcon = ({ type, className }: { type: 'hp' | 'xp' | 'score' | 'wave' | 'kill' | 'time', className?: string }) => {
    const props = { className: className || "w-4 h-4", fill: "currentColor", viewBox: "0 0 24 24" };
    switch(type) {
        case 'hp': return <svg {...props}><path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/></svg>;
        case 'xp': return <svg {...props}><path d="M13 2L3 14h9v10l10-12h-9z"/></svg>;
        case 'score': return <svg {...props}><path d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z"/></svg>;
        case 'wave': return <svg {...props}><path d="M12 6c2.62 0 4.88 1.86 5.39 4.43l.3 1.5 1.53.11c1.56.1 2.78 1.41 2.78 2.96 0 1.65-1.35 3-3 3H6c-2.21 0-4-1.79-4-4 0-2.05 1.53-3.76 3.56-3.97l1.07-.11.5-.95C8.08 7.14 9.94 6 12 6m0-2C9.11 4 6.6 5.64 5.35 8.04 2.34 8.36 0 10.91 0 14c0 3.31 2.69 6 6 6h13c2.76 0 5-2.24 5-5 0-2.64-2.05-4.78-4.65-4.96C18.67 6.59 15.64 4 12 4z"/></svg>;
        case 'kill': return <svg {...props}><circle cx="12" cy="12" r="8" opacity="0.3"/><path d="M19 3H5c-1.1 0-2 .9-2 2v14c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V5c0-1.1-.9-2-2-2zm-4 6h-4v2h2a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1v-1H8v1a3 3 0 0 0 3 3h2a3 3 0 0 0 3-3v-2a3 3 0 0 0-3-3h-2v-1h5v-2z"/></svg>;
        case 'time': return <svg {...props}><path d="M11.99 2C6.47 2 2 6.48 2 12s4.47 10 9.99 10C17.52 22 22 17.52 22 12S17.52 2 11.99 2zM12 20c-4.42 0-8-3.58-8-8s3.58-8 8-8 8 3.58 8 8-3.58 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z"/></svg>;
    }
}


const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>(GameState.START);
  const [difficulty, setDifficulty] = useState<Difficulty>(Difficulty.NORMAL);
  const [gameKey, setGameKey] = useState(0); 
  
  const [stats, setStats] = useState({ 
    hp: GAME_CONFIG.PLAYER_HP_BASE, 
    maxHp: GAME_CONFIG.PLAYER_HP_BASE,
    score: 0, 
    wave: 1, 
    kills: 0, 
    xp: 0, 
    nextLevelXp: 100, 
    level: 1 
  });
  const [finalStats, setFinalStats] = useState<GameStats | null>(null);
  const [aiReport, setAiReport] = useState<string>("");
  const [isLoadingReport, setIsLoadingReport] = useState(false);
  
  const [inventory, setInventory] = useState<Inventory>({
    fireRate: 0, multishot: 0, damage: 0, orbitals: 0, speed: 0, maxHp: 0, regen: 0, magnet: 0,
    drone: 0, dragon: 0, missile: 0, lightning: 0, mine: 0, axe: 0
  });
  const [upgradeOptions, setUpgradeOptions] = useState<UpgradeOption[]>([]);

  const startGame = (diff: Difficulty) => {
    setDifficulty(diff);
    setGameState(GameState.PLAYING);
    setFinalStats(null);
    setAiReport("");
    setInventory({
        fireRate: 0, multishot: 0, damage: 0, orbitals: 0, speed: 0, maxHp: 0, regen: 0, magnet: 0,
        drone: 0, dragon: 0, missile: 0, lightning: 0, mine: 0, axe: 0
    });
    setGameKey(k => k + 1); 
  };

  const handleGameOver = async (gameStats: GameStats) => {
    setGameState(GameState.GAME_OVER);
    const fullStats = { ...gameStats, inventory, difficulty };
    setFinalStats(fullStats);
    
    setIsLoadingReport(true);
    const report = await generateSurvivalReport(fullStats);
    setAiReport(report);
    setIsLoadingReport(false);
  };

  const handleLevelUp = () => {
      setGameState(GameState.LEVEL_UP);
      const available = UPGRADE_DEFINITIONS.filter(u => (inventory[u.id] || 0) < MAX_LEVEL);
      if (available.length === 0) {
           setGameState(GameState.PLAYING); 
           return;
      }
      const shuffled = [...available].sort(() => 0.5 - Math.random());
      const options = shuffled.slice(0, 3);
      setUpgradeOptions(options.map(opt => ({
          ...opt,
          isMaxed: (inventory[opt.id] || 0) + 1 === MAX_LEVEL
      })));
  };

  const selectUpgrade = (upgrade: UpgradeOption) => {
      setInventory(prev => ({ ...prev, [upgrade.id]: prev[upgrade.id] + 1 }));
      setGameState(GameState.PLAYING);
  };

  const getDifficultyColor = (diff: Difficulty) => {
      if(diff === Difficulty.EASY) return 'text-green-400 border-green-500/50 shadow-green-500/20';
      if(diff === Difficulty.HARD) return 'text-red-400 border-red-500/50 shadow-red-500/20';
      return 'text-cyan-400 border-cyan-500/50 shadow-cyan-500/20';
  };

  return (
    <div className="relative w-screen h-screen bg-slate-900 overflow-hidden text-gray-100 font-sans overscroll-none touch-none select-none">
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_at_center,_var(--tw-gradient-stops))] from-slate-800/20 via-slate-950/40 to-black z-0"></div>
      
      <GameCanvas 
        key={gameKey}
        gameState={gameState} 
        inventory={inventory}
        difficulty={difficulty}
        onGameOver={handleGameOver} 
        onLevelUp={handleLevelUp}
        setStats={setStats}
      />

      {/* --- HUD --- */}
      {gameState !== GameState.START && (
        <div className="absolute inset-0 pointer-events-none flex flex-col justify-between p-4 z-20 pb-6 md:pb-4">
          {/* Top Bar */}
          <div className="flex justify-between items-start gap-2 md:gap-4">
            
            {/* Left: Health & XP */}
            <div className="flex flex-col gap-2 w-1/2 max-w-md">
                {/* Health */}
                <div className="relative bg-slate-900/80 border border-gray-700/50 backdrop-blur-md clip-angle-tl-br p-1 pr-4 md:p-2 md:pr-6">
                    <div className="flex items-center gap-2 mb-1">
                        <StatIcon type="hp" className="w-3 h-3 md:w-4 md:h-4 text-red-500" />
                        <span className="text-xs md:text-sm font-display tracking-wider text-red-100">{Math.ceil(stats.hp)} / {stats.maxHp}</span>
                    </div>
                    <div className="h-2 md:h-3 w-full bg-gray-800 skew-x-[-12deg] border border-gray-700 overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-red-600 to-red-500 transition-all duration-200" style={{ width: `${(stats.hp / stats.maxHp) * 100}%` }}></div>
                    </div>
                </div>
                
                {/* XP */}
                <div className="relative bg-slate-900/80 border border-gray-700/50 backdrop-blur-md clip-angle-tl-br p-1 pr-4 md:p-2 md:pr-6">
                     <div className="flex items-center gap-2 mb-1">
                        <StatIcon type="xp" className="w-3 h-3 md:w-4 md:h-4 text-yellow-400" />
                        <span className="text-xs md:text-sm font-display tracking-wider text-yellow-100">LVL {stats.level}</span>
                    </div>
                    <div className="h-1.5 md:h-2 w-full bg-gray-800 skew-x-[-12deg] border border-gray-700 overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-yellow-400 to-yellow-200 transition-all duration-200" style={{ width: `${(stats.xp / stats.nextLevelXp) * 100}%` }}></div>
                    </div>
                </div>
            </div>

            {/* Right: Score & Wave */}
            <div className="flex flex-col items-end gap-2">
                 <div className={`hidden md:block px-4 py-1 bg-slate-950/80 border backdrop-blur rounded-sm font-display text-sm tracking-widest uppercase ${getDifficultyColor(difficulty)}`}>
                    {difficulty}
                 </div>
                 
                 <div className="flex gap-4">
                     <div className="bg-slate-900/80 border-b-2 border-cyan-500 backdrop-blur-md p-1 px-3 md:p-2 md:px-4 text-right clip-angle-br">
                        <div className="text-[10px] md:text-xs text-cyan-300/70 font-bold tracking-widest uppercase">SCORE</div>
                        <div className="text-lg md:text-2xl font-display text-cyan-50 shadow-cyan-500/50 drop-shadow-md">{stats.score.toLocaleString()}</div>
                     </div>
                 </div>

                 <div className="flex gap-2">
                     <div className="flex items-center gap-1 md:gap-2 bg-slate-900/80 border border-gray-700 px-2 md:px-3 py-1 rounded-sm backdrop-blur-sm">
                        <StatIcon type="wave" className="w-3 h-3 text-purple-400" />
                        <span className="font-display text-sm md:text-lg text-white">{stats.wave}</span>
                     </div>
                     <div className="flex items-center gap-1 md:gap-2 bg-slate-900/80 border border-gray-700 px-2 md:px-3 py-1 rounded-sm backdrop-blur-sm">
                        <StatIcon type="kill" className="w-3 h-3 text-red-400" />
                        <span className="font-display text-sm md:text-lg text-white">{stats.kills}</span>
                     </div>
                 </div>
            </div>
          </div>

          {/* Bottom: Inventory Grid - Lifted for mobile controls */}
          <div className="flex justify-center w-full pb-24 md:pb-4"> 
             <div className="flex gap-1 md:gap-2 p-1 md:p-2 bg-slate-950/60 backdrop-blur-md border-t border-x border-white/10 rounded-t-xl clip-hud-top max-w-4xl flex-wrap justify-center">
                {Object.entries(inventory).map(([key, val]) => {
                    if(val === 0) return null;
                    const isMax = val >= MAX_LEVEL;
                    return (
                        <div key={key} className={`
                            relative w-6 h-6 md:w-10 md:h-10 flex items-center justify-center rounded bg-slate-800/80 border
                            ${isMax ? 'border-yellow-500 shadow-[0_0_10px_rgba(234,179,8,0.3)]' : 'border-slate-600'}
                        `}>
                            <WeaponIcon id={key} className={`w-4 h-4 md:w-6 md:h-6 ${isMax ? 'text-yellow-400' : 'text-slate-300'}`} />
                            <div className={`absolute -top-1 -right-1 text-[8px] md:text-[10px] font-bold px-1 rounded ${isMax ? 'bg-yellow-500 text-black' : 'bg-slate-600 text-white'}`}>
                                {isMax ? 'M' : val}
                            </div>
                        </div>
                    )
                })}
             </div>
          </div>
        </div>
      )}

      {/* --- Start Screen --- */}
      {gameState === GameState.START && (
        <div className="absolute inset-0 flex items-center justify-center z-50 bg-black/90 bg-[url('https://aistudiocdn.com/grid-bg.svg')] bg-center bg-cover pointer-events-auto">
          <div className="absolute inset-0 bg-gradient-to-b from-black/60 via-slate-900/80 to-black"></div>
          
          <div className="relative z-10 text-center p-6 md:p-12 max-w-4xl w-full">
            <h1 className="text-5xl md:text-9xl font-black mb-4 text-transparent bg-clip-text bg-gradient-to-b from-cyan-300 to-blue-600 tracking-tighter drop-shadow-[0_0_35px_rgba(6,182,212,0.6)] glitch" data-text="NEON SURVIVOR">
              NEON SURVIVOR
            </h1>
            <p className="text-cyan-100/60 text-sm md:text-xl mb-8 md:mb-12 font-display tracking-[0.3em] md:tracking-[0.5em] uppercase border-t border-b border-cyan-900/50 py-4 inline-block">
              System Initialization Required
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-6 max-w-3xl mx-auto">
                {[
                    { diff: Difficulty.EASY, label: 'CASUAL', desc: 'Simulation Mode', color: 'emerald' },
                    { diff: Difficulty.NORMAL, label: 'STANDARD', desc: 'Combat Ready', color: 'cyan' },
                    { diff: Difficulty.HARD, label: 'INFERNO', desc: 'Death Warrant', color: 'rose' }
                ].map(opt => (
                    <button 
                        key={opt.diff}
                        onClick={() => startGame(opt.diff)}
                        className={`
                            group relative overflow-hidden py-4 md:py-8 px-4 border bg-slate-900/50 backdrop-blur-sm transition-all duration-300
                            active:scale-95
                            hover:transform hover:scale-105 hover:-translate-y-1
                            border-${opt.color}-900 hover:border-${opt.color}-400 hover:shadow-[0_0_30px_rgba(0,0,0,0.5)]
                        `}
                    >
                        <div className={`absolute inset-0 opacity-0 group-hover:opacity-10 bg-gradient-to-b from-${opt.color}-500 to-transparent transition-opacity`}></div>
                        <div className={`text-2xl md:text-3xl font-display font-bold text-${opt.color}-500 mb-2 group-hover:text-${opt.color}-300`}>{opt.label}</div>
                        <div className={`text-[10px] md:text-xs uppercase tracking-widest text-${opt.color}-800 group-hover:text-${opt.color}-500`}>{opt.desc}</div>
                    </button>
                ))}
            </div>
            <div className="mt-8 text-slate-500 text-xs md:text-sm">
                 PC: WASD Move + Mouse Aim | MOBILE: Left Stick Move + Right Stick Aim
            </div>
          </div>
        </div>
      )}

      {/* --- Level Up Screen --- */}
      {gameState === GameState.LEVEL_UP && (
         <div className="absolute inset-0 flex items-center justify-center bg-slate-950/80 backdrop-blur-lg z-50 pointer-events-auto p-4">
            <div className="flex flex-col items-center w-full max-w-6xl animate-in fade-in zoom-in duration-200">
                <h2 className="text-3xl md:text-6xl font-display font-bold text-yellow-400 mb-2 drop-shadow-[0_0_15px_rgba(250,204,21,0.5)] uppercase">
                    System Upgrade
                </h2>
                <div className="h-1 w-48 md:w-64 bg-gradient-to-r from-transparent via-yellow-500 to-transparent mb-6 md:mb-10 opacity-50"></div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 md:gap-8 w-full overflow-y-auto max-h-[70vh] md:max-h-none pb-4">
                    {upgradeOptions.map((opt, idx) => {
                        const nextLvl = (inventory[opt.id] || 0) + 1;
                        const isEvo = nextLvl === MAX_LEVEL;
                        
                        let borderColor = 'border-slate-600';
                        let glowColor = 'shadow-none';
                        let titleColor = 'text-gray-200';
                        let iconColor = 'text-slate-400';
                        
                        if(isEvo) {
                             borderColor = 'border-red-500';
                             glowColor = 'shadow-[0_0_40px_rgba(239,68,68,0.3)]';
                             titleColor = 'text-red-400';
                             iconColor = 'text-red-500';
                        } else if (opt.rarity === 'LEGENDARY') {
                             borderColor = 'border-yellow-500';
                             glowColor = 'shadow-[0_0_30px_rgba(234,179,8,0.25)]';
                             titleColor = 'text-yellow-400';
                             iconColor = 'text-yellow-500';
                        } else if (opt.rarity === 'RARE') {
                             borderColor = 'border-purple-500';
                             glowColor = 'shadow-[0_0_30px_rgba(168,85,247,0.25)]';
                             titleColor = 'text-purple-400';
                             iconColor = 'text-purple-500';
                        } else {
                             borderColor = 'border-blue-500';
                             glowColor = 'shadow-[0_0_20px_rgba(59,130,246,0.2)]';
                             titleColor = 'text-blue-400';
                             iconColor = 'text-blue-500';
                        }

                        return (
                            <button 
                                key={idx}
                                onClick={() => selectUpgrade(opt)}
                                className={`
                                    group relative flex flex-col p-4 md:p-6 h-auto md:h-80 bg-slate-900 border-2 ${borderColor} ${glowColor}
                                    active:scale-95
                                    hover:scale-[1.02] hover:-translate-y-2 transition-all duration-300 text-left overflow-hidden
                                    clip-angle-br shrink-0
                                `}
                            >
                                {/* BG Pattern */}
                                <div className="absolute inset-0 bg-[linear-gradient(45deg,transparent_25%,rgba(255,255,255,0.02)_50%,transparent_75%,transparent_100%)] bg-[length:10px_10px] opacity-20"></div>
                                
                                <div className="flex items-start justify-between mb-2 md:mb-4 relative z-10">
                                    <div className={`p-2 md:p-3 rounded-lg bg-slate-950 border ${borderColor} ${iconColor}`}>
                                        <WeaponIcon id={opt.id} className="w-6 h-6 md:w-8 md:h-8" />
                                    </div>
                                    <div className={`text-[10px] md:text-xs font-bold px-2 py-1 rounded bg-slate-950 border border-white/10 uppercase tracking-wider ${titleColor}`}>
                                        {isEvo ? 'EVOLUTION' : opt.rarity}
                                    </div>
                                </div>

                                <div className="relative z-10 mb-2">
                                    <h3 className={`text-lg md:text-2xl font-display font-bold uppercase leading-none mb-1 ${titleColor}`}>{opt.title}</h3>
                                    <div className="flex gap-1 mt-2">
                                         {Array.from({length: MAX_LEVEL}).map((_, i) => (
                                            <div key={i} className={`h-1 md:h-1.5 flex-1 rounded-full ${i < nextLvl ? (isEvo ? 'bg-red-500' : 'bg-cyan-500') : 'bg-slate-800'}`}></div>
                                        ))}
                                    </div>
                                </div>

                                <p className={`relative z-10 text-xs md:text-sm leading-relaxed ${isEvo ? 'text-red-100 font-semibold italic' : 'text-slate-300'}`}>
                                    {isEvo ? opt.evoDescription : opt.description}
                                </p>

                                <div className={`hidden md:block absolute bottom-0 right-0 p-2 px-4 bg-slate-950 text-xs uppercase font-bold tracking-widest opacity-0 group-hover:opacity-100 transition-opacity ${titleColor}`}>
                                    INSTALL MODULE_
                                </div>
                            </button>
                        );
                    })}
                </div>
            </div>
         </div>
      )}

      {/* --- Game Over Screen --- */}
      {gameState === GameState.GAME_OVER && finalStats && (
        <div className="absolute inset-0 flex items-center justify-center bg-red-950/80 backdrop-blur-md z-50 pointer-events-auto p-4">
          <div className="relative flex flex-col w-full max-w-3xl bg-black border border-red-900 shadow-[0_0_100px_rgba(220,38,38,0.3)] clip-angle-tl-br p-1">
            {/* Decorative Corner Lines */}
            <div className="absolute top-0 left-0 w-16 h-16 md:w-32 md:h-32 border-l-4 border-t-4 border-red-600 pointer-events-none opacity-50"></div>
            <div className="absolute bottom-0 right-0 w-16 h-16 md:w-32 md:h-32 border-r-4 border-b-4 border-red-600 pointer-events-none opacity-50"></div>
            
            <div className="bg-slate-950/90 p-4 md:p-8 relative overflow-hidden">
                <div className="scanlines absolute inset-0 opacity-20 pointer-events-none"></div>

                <div className="text-center mb-6 md:mb-8">
                    <h2 className="text-4xl md:text-8xl font-black text-red-600 tracking-tighter font-display uppercase drop-shadow-[0_2px_0_rgba(255,255,255,0.2)] animate-pulse">
                        FAILURE
                    </h2>
                    <div className="text-red-400/60 font-mono tracking-[0.5em] md:tracking-[1em] text-xs md:text-sm uppercase">Signal Lost - Subject Terminated</div>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-4 mb-6 md:mb-8">
                    {[
                        { label: 'SCORE', val: finalStats.score.toLocaleString(), color: 'text-cyan-400' },
                        { label: 'LEVEL', val: finalStats.level, color: 'text-yellow-400' },
                        { label: 'KILLS', val: finalStats.kills, color: 'text-red-400' },
                        { label: 'TIME', val: `${(finalStats.timeSurvived / 1000).toFixed(1)}s`, color: 'text-green-400' },
                    ].map((s, i) => (
                        <div key={i} className="bg-slate-900/50 border border-white/5 p-2 md:p-4 text-center">
                            <div className="text-[10px] md:text-xs text-slate-500 uppercase tracking-widest mb-1">{s.label}</div>
                            <div className={`text-lg md:text-2xl font-display font-bold ${s.color}`}>{s.val}</div>
                        </div>
                    ))}
                </div>

                {/* Terminal Report */}
                <div className="bg-black border border-red-900/30 p-4 md:p-6 font-mono text-xs md:text-sm leading-relaxed text-red-100/80 mb-6 md:mb-8 min-h-[120px] md:min-h-[140px] relative crt-flicker overflow-y-auto max-h-40">
                     <div className="absolute top-0 left-0 w-full h-1 bg-red-500/20"></div>
                     <div className="text-xs text-red-600 mb-2 flex items-center gap-2">
                        <span className={`w-2 h-2 bg-red-600 rounded-full ${isLoadingReport ? 'animate-ping' : ''}`}></span>
                        {isLoadingReport ? 'DECRYPTING BLACK BOX DATA...' : 'BLACK BOX LOG RECOVERED'}
                     </div>
                     {isLoadingReport ? (
                         <div className="space-y-2 opacity-50">
                             <div className="h-2 bg-red-900/20 w-3/4 animate-pulse"></div>
                             <div className="h-2 bg-red-900/20 w-1/2 animate-pulse"></div>
                             <div className="h-2 bg-red-900/20 w-5/6 animate-pulse"></div>
                         </div>
                     ) : (
                         <p className="typewriter-effect">{aiReport}</p>
                     )}
                </div>

                <button 
                    onClick={() => setGameState(GameState.START)}
                    className="w-full py-3 md:py-4 bg-red-700 hover:bg-red-600 text-white font-display font-bold tracking-widest uppercase transition-colors border border-red-500/50 active:scale-95"
                >
                    Reboot System
                </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;