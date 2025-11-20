import React, { useRef, useEffect, useCallback } from 'react';
import { GameState, Player, Zombie, Bullet, Particle, Point, XPOrb, Inventory, Difficulty, ZombieType, Minion } from '../types';
import { GAME_CONFIG, ZOMBIE_STATS, DIFFICULTY_CONFIG, WEAPON_STATS } from '../constants';

interface GameCanvasProps {
  gameState: GameState;
  inventory: Inventory;
  difficulty: Difficulty;
  onGameOver: (stats: { score: number; kills: number; wave: number; timeSurvived: number; level: number }) => void;
  onLevelUp: () => void;
  setStats: (stats: { hp: number; maxHp: number; score: number; wave: number; kills: number; xp: number; nextLevelXp: number; level: number }) => void;
}

// Touch Control Types
interface TouchState {
    id: number;
    startX: number;
    startY: number;
    currentX: number;
    currentY: number;
    type: 'MOVE' | 'AIM'; 
}

export const GameCanvas: React.FC<GameCanvasProps> = ({ gameState, inventory, difficulty, onGameOver, onLevelUp, setStats }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  
  const diffConfig = DIFFICULTY_CONFIG[difficulty];

  // Game State Refs
  const playerRef = useRef<Player>({
    id: 'player', x: GAME_CONFIG.WORLD_SIZE.W / 2, y: GAME_CONFIG.WORLD_SIZE.H / 2, 
    radius: GAME_CONFIG.PLAYER_RADIUS, color: GAME_CONFIG.PLAYER_COLOR, angle: 0, 
    hp: GAME_CONFIG.PLAYER_HP_BASE, maxHp: GAME_CONFIG.PLAYER_HP_BASE,
    xp: 0, level: 1, nextLevelXp: GAME_CONFIG.XP_BASE_REQ
  });
  
  const cameraRef = useRef<Point>({ x: 0, y: 0 });

  const bulletsRef = useRef<Bullet[]>([]);
  const zombiesRef = useRef<Zombie[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const xpOrbsRef = useRef<XPOrb[]>([]);
  const minionsRef = useRef<Minion[]>([]);
  
  const keysRef = useRef<{ [key: string]: boolean }>({});
  const mouseRef = useRef<Point>({ x: 0, y: 0 });
  const screenSizeRef = useRef<Point>({ x: 0, y: 0 });

  // Mobile Touch Refs
  const touchesRef = useRef<Map<number, TouchState>>(new Map());
  const joystickMoveRef = useRef<{ x: number, y: number }>({ x: 0, y: 0 });
  const joystickAimRef = useRef<{ x: number, y: number, active: boolean }>({ x: 0, y: 0, active: false });

  // Timers
  const lastShotTimeRef = useRef<number>(0);
  const lastSpawnTimeRef = useRef<number>(0);
  const lastRegenTimeRef = useRef<number>(0);
  const lastMissileTimeRef = useRef<number>(0);
  const lastLightningTimeRef = useRef<number>(0);
  const lastMineTimeRef = useRef<number>(0);
  const lastAxeTimeRef = useRef<number>(0);

  const startTimeRef = useRef<number>(0);
  const scoreRef = useRef<number>(0);
  const killsRef = useRef<number>(0);
  const waveRef = useRef<number>(1);
  const frameIdRef = useRef<number>(0);
  const orbitalAngleRef = useRef<number>(0);

  const audioCtxRef = useRef<AudioContext | null>(null);

  // --- Helper Functions for Rendering ---

  const drawPlayer = (ctx: CanvasRenderingContext2D, p: Player) => {
    ctx.save();
    ctx.translate(p.x, p.y);
    ctx.rotate(p.angle);

    // Shadow
    ctx.shadowColor = 'rgba(0, 0, 0, 0.5)';
    ctx.shadowBlur = 10;

    // Gun (Underneath)
    ctx.fillStyle = '#1e293b';
    const barrelW = inventory.multishot >= 5 ? 16 : 10;
    const barrelL = 30;
    ctx.fillRect(0, -barrelW/2, barrelL, barrelW);
    
    // Hands
    ctx.fillStyle = '#94a3b8'; // Glove color
    ctx.beginPath(); ctx.arc(15, -6, 5, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(15, 6, 5, 0, Math.PI*2); ctx.fill();

    // Body
    ctx.fillStyle = '#0f172a'; // Dark Armor
    ctx.beginPath();
    ctx.arc(0, 0, p.radius, 0, Math.PI * 2);
    ctx.fill();

    // Helmet
    ctx.fillStyle = p.color; // Helmet Color
    ctx.beginPath();
    ctx.arc(0, 0, p.radius * 0.7, 0, Math.PI * 2);
    ctx.fill();

    // Visor
    ctx.fillStyle = '#00f3ff';
    ctx.shadowColor = '#00f3ff';
    ctx.shadowBlur = 5;
    ctx.fillRect(2, -4, 8, 8);

    ctx.restore();
  };

  const drawZombie = (ctx: CanvasRenderingContext2D, z: Zombie) => {
      const now = Date.now();
      const wobble = Math.sin(now / 100 + z.x) * 0.1;
      const angle = Math.atan2(playerRef.current.y - z.y, playerRef.current.x - z.x);
      
      ctx.save();
      ctx.translate(z.x, z.y);
      ctx.rotate(angle + wobble);

      ctx.globalAlpha = z.opacity ?? 1;

      // Body Shape based on Type
      ctx.fillStyle = z.color;
      
      if (z.type === 'WOLF') {
          // Elongated body
          ctx.beginPath();
          ctx.ellipse(0, 0, z.radius * 1.5, z.radius * 0.8, 0, 0, Math.PI*2);
          ctx.fill();
          // Ears
          ctx.beginPath(); ctx.moveTo(10, -10); ctx.lineTo(20, -5); ctx.lineTo(10, 0); ctx.fill();
          ctx.beginPath(); ctx.moveTo(10, 10); ctx.lineTo(20, 5); ctx.lineTo(10, 0); ctx.fill();
      } else if (z.type === 'GIANT' || z.type === 'TANK') {
          // Large Blocky Body
          ctx.fillRect(-z.radius, -z.radius, z.radius*2, z.radius*2);
      } else if (z.type === 'PARASITE') {
           // Blobby
           ctx.beginPath();
           ctx.arc(0, 0, z.radius, 0, Math.PI*2);
           ctx.arc(-5, -5, z.radius * 0.6, 0, Math.PI*2);
           ctx.fill();
      } else {
          // Normal Humanoid
          // Shoulders
          ctx.beginPath();
          ctx.arc(0, 0, z.radius, 0, Math.PI * 2);
          ctx.fill();
          // Arms reaching out
          const armOffset = Math.sin(now / 100) * 5;
          ctx.fillRect(5, -12 + armOffset, 15, 6);
          ctx.fillRect(5, 6 - armOffset, 15, 6);
      }

      // Eyes
      ctx.fillStyle = (z.type === 'GIANT' || z.type === 'TANK') ? '#fca5a5' : '#fef08a';
      ctx.shadowColor = ctx.fillStyle;
      ctx.shadowBlur = 5;
      ctx.beginPath();
      ctx.arc(8, -4, 2, 0, Math.PI*2);
      ctx.arc(8, 4, 2, 0, Math.PI*2);
      ctx.fill();
      ctx.shadowBlur = 0;

      // Health Bar (if damaged)
      ctx.rotate(-(angle + wobble)); // Reset rotation for UI
      const hpPct = z.hp / z.maxHp;
      if (hpPct < 1) {
        ctx.fillStyle = 'rgba(0,0,0,0.5)';
        ctx.fillRect(-12, -z.radius - 10, 24, 4);
        ctx.fillStyle = hpPct < 0.3 ? '#ef4444' : '#22c55e';
        ctx.fillRect(-11, -z.radius - 9, 22 * hpPct, 2);
      }

      ctx.restore();
  };

  const drawDrone = (ctx: CanvasRenderingContext2D, m: Minion) => {
      const now = Date.now();
      ctx.save();
      ctx.translate(m.x, m.y);
      
      // Hover Animation
      const hover = Math.sin(now / 300) * 5;
      ctx.translate(0, hover);
      ctx.rotate(m.angle); // Face Target

      // Body
      ctx.fillStyle = '#38bdf8';
      ctx.fillRect(-8, -8, 16, 16);
      
      // Rotors (Spinning)
      ctx.fillStyle = 'rgba(255, 255, 255, 0.3)';
      const rotorSize = 12;
      const rOffset = 10;
      // Draw 4 rotors
      [[-1, -1], [1, -1], [-1, 1], [1, 1]].forEach(([dx, dy]) => {
          ctx.save();
          ctx.translate(dx * rOffset, dy * rOffset);
          ctx.rotate(now / 20); // Fast spin
          ctx.fillRect(-rotorSize/2, -2, rotorSize, 4);
          ctx.fillRect(-2, -rotorSize/2, 4, rotorSize);
          ctx.restore();
      });

      // Scanner Light
      ctx.fillStyle = '#ef4444';
      ctx.shadowColor = '#ef4444';
      ctx.shadowBlur = 10;
      ctx.beginPath();
      ctx.arc(4, 0, 3, 0, Math.PI*2);
      ctx.fill();

      ctx.restore();
  };

  const drawDragon = (ctx: CanvasRenderingContext2D, m: Minion) => {
      const now = Date.now();
      ctx.save();
      ctx.translate(m.x, m.y);
      
      // Face target (smoothed in update, here we just apply)
      ctx.rotate(m.angle);

      // Flap wings
      const flap = Math.sin(now / 100); 
      const wingW = 20 * (0.5 + 0.5 * Math.abs(flap));

      ctx.fillStyle = '#ea580c'; // Dark Orange body

      // Wings (Triangles)
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-10, -wingW);
      ctx.lineTo(5, -5);
      ctx.fill();
      
      ctx.beginPath();
      ctx.moveTo(0, 0);
      ctx.lineTo(-10, wingW);
      ctx.lineTo(5, 5);
      ctx.fill();

      // Body (Oval)
      ctx.beginPath();
      ctx.ellipse(0, 0, 12, 6, 0, 0, Math.PI*2);
      ctx.fill();

      // Head
      ctx.fillStyle = '#fdba74';
      ctx.beginPath();
      ctx.arc(8, 0, 5, 0, Math.PI*2);
      ctx.fill();
      
      // Eyes
      ctx.fillStyle = '#fff';
      ctx.beginPath(); ctx.arc(10, -2, 1.5, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(10, 2, 1.5, 0, Math.PI*2); ctx.fill();

      // Tail (Wiggly line)
      ctx.strokeStyle = '#ea580c';
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(-10, 0);
      ctx.quadraticCurveTo(-20, flap * 10, -30, 0);
      ctx.stroke();

      ctx.restore();
  };

  const drawJoystick = (ctx: CanvasRenderingContext2D, touch: TouchState) => {
    ctx.save();
    // Outer Circle
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(touch.startX, touch.startY, 40, 0, Math.PI * 2);
    ctx.stroke();

    // Inner Circle (Knob)
    ctx.fillStyle = 'rgba(255, 255, 255, 0.8)';
    ctx.beginPath();
    ctx.arc(touch.currentX, touch.currentY, 20, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  // -----------------------------------

  const playSound = (type: 'shoot' | 'hit' | 'levelup' | 'xp' | 'explosion') => {
    if (!audioCtxRef.current) {
        audioCtxRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    const ctx = audioCtxRef.current;
    if (ctx.state === 'suspended') ctx.resume();

    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.connect(gain);
    gain.connect(ctx.destination);
    const now = ctx.currentTime;
    
    if (type === 'shoot') {
      osc.type = 'square';
      const baseFreq = inventory.fireRate >= 5 ? 300 : 150;
      osc.frequency.setValueAtTime(baseFreq, now);
      osc.frequency.exponentialRampToValueAtTime(50, now + 0.1);
      gain.gain.setValueAtTime(0.03, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.1);
    } else if (type === 'hit') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(100, now);
      gain.gain.setValueAtTime(0.05, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.1);
      osc.start(now);
      osc.stop(now + 0.1);
    } else if (type === 'explosion') {
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(100, now);
      osc.frequency.exponentialRampToValueAtTime(10, now + 0.3);
      gain.gain.setValueAtTime(0.1, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.3);
      osc.start(now);
      osc.stop(now + 0.3);
    } else if (type === 'xp') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(600, now);
      gain.gain.setValueAtTime(0.03, now);
      gain.gain.linearRampToValueAtTime(0, now + 0.05);
      osc.start(now);
      osc.stop(now + 0.05);
    } else if (type === 'levelup') {
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(300, now);
        osc.frequency.linearRampToValueAtTime(600, now + 0.4);
        gain.gain.setValueAtTime(0.1, now);
        gain.gain.linearRampToValueAtTime(0, now + 0.5);
        osc.start(now);
        osc.stop(now + 0.5);
    }
  };

  const uid = () => Math.random().toString(36).substr(2, 9);

  const createExplosion = (x: number, y: number, color: string, count: number, sizeMult: number = 1) => {
    for (let i = 0; i < count; i++) {
      const angle = Math.random() * Math.PI * 2;
      const speed = Math.random() * 3 + 1;
      particlesRef.current.push({
        id: uid(),
        x, y,
        vx: Math.cos(angle) * speed * sizeMult,
        vy: Math.sin(angle) * speed * sizeMult,
        radius: (Math.random() * 3 + 1) * sizeMult,
        color: color,
        life: 1.0,
        maxLife: 1.0,
        alpha: 1
      });
    }
  };

  const getNearestEnemy = (x: number, y: number, maxDist: number = 1000): Zombie | null => {
      let nearest: Zombie | null = null;
      let minD = maxDist;
      zombiesRef.current.forEach(z => {
          const d = Math.hypot(z.x - x, z.y - y);
          if (d < minD) {
              minD = d;
              nearest = z;
          }
      });
      return nearest;
  };

  const initGame = useCallback(() => {
    if (!canvasRef.current) return;
    
    playerRef.current = {
      id: 'player',
      x: GAME_CONFIG.WORLD_SIZE.W / 2,
      y: GAME_CONFIG.WORLD_SIZE.H / 2,
      radius: GAME_CONFIG.PLAYER_RADIUS,
      color: GAME_CONFIG.PLAYER_COLOR,
      angle: 0,
      hp: GAME_CONFIG.PLAYER_HP_BASE,
      maxHp: GAME_CONFIG.PLAYER_HP_BASE,
      xp: 0,
      level: 1,
      nextLevelXp: GAME_CONFIG.XP_BASE_REQ
    };
    bulletsRef.current = [];
    zombiesRef.current = [];
    particlesRef.current = [];
    xpOrbsRef.current = [];
    minionsRef.current = [];
    scoreRef.current = 0;
    killsRef.current = 0;
    waveRef.current = 1;
    startTimeRef.current = Date.now();
    
    setStats({ 
        hp: GAME_CONFIG.PLAYER_HP_BASE, 
        maxHp: GAME_CONFIG.PLAYER_HP_BASE,
        score: 0, 
        wave: 1, 
        kills: 0, 
        xp: 0, 
        nextLevelXp: GAME_CONFIG.XP_BASE_REQ,
        level: 1
    });
  }, [setStats]);

  useEffect(() => {
    if (gameState === GameState.PLAYING && frameIdRef.current === 0) {
        if (scoreRef.current === 0) initGame();
        if (audioCtxRef.current?.state === 'suspended') {
             audioCtxRef.current.resume();
        }
    }
  }, [gameState, initGame]);

  useEffect(() => {
      if(gameState === GameState.PLAYING) {
          const isMaxed = inventory.maxHp >= 5;
          const multiplier = 1 + (inventory.maxHp * 0.2) + (isMaxed ? 0.5 : 0);
          const newMax = Math.floor(GAME_CONFIG.PLAYER_HP_BASE * multiplier);
          const oldMax = playerRef.current.maxHp;
          playerRef.current.maxHp = newMax;
          if (newMax > oldMax) {
              playerRef.current.hp += (newMax - oldMax);
          }
      }
  }, [inventory.maxHp, gameState]);

  // Helper for Minion Management
  useEffect(() => {
      if (gameState !== GameState.PLAYING) return;

      // Drone
      const droneCount = inventory.drone >= 5 ? 2 : (inventory.drone > 0 ? 1 : 0);
      const currentDrones = minionsRef.current.filter(m => m.type === 'DRONE');
      if (currentDrones.length < droneCount) {
          for(let i=currentDrones.length; i<droneCount; i++) {
              minionsRef.current.push({
                id: uid(), type: 'DRONE',
                x: playerRef.current.x, y: playerRef.current.y,
                radius: 10, color: GAME_CONFIG.COLORS.DRONE,
                lastFire: 0, angle: 0
            });
          }
      }
      
      // Dragon
      const dragonCount = inventory.dragon > 0 ? 1 : 0;
      const currentDragons = minionsRef.current.filter(m => m.type === 'DRAGON');
      if (currentDragons.length < dragonCount) {
           minionsRef.current.push({
              id: uid(), type: 'DRAGON',
              x: playerRef.current.x, y: playerRef.current.y,
              radius: 12, color: GAME_CONFIG.COLORS.DRAGON,
              lastFire: 0, angle: 0
          });
      }

  }, [inventory.drone, inventory.dragon, gameState]);

  useEffect(() => {
    // PC Inputs
    const handleKeyDown = (e: KeyboardEvent) => { keysRef.current[e.code] = true; };
    const handleKeyUp = (e: KeyboardEvent) => { keysRef.current[e.code] = false; };
    const handleMouseMove = (e: MouseEvent) => {
      if (!canvasRef.current) return;
      const rect = canvasRef.current.getBoundingClientRect();
      mouseRef.current = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    };
    const handleMouseDown = () => { keysRef.current['MouseLeft'] = true; };
    const handleMouseUp = () => { keysRef.current['MouseLeft'] = false; };
    const handleResize = () => {
        if(canvasRef.current) {
            canvasRef.current.width = window.innerWidth;
            canvasRef.current.height = window.innerHeight;
            screenSizeRef.current = { x: window.innerWidth, y: window.innerHeight };
        }
    }

    // Touch Inputs
    const handleTouchStart = (e: TouchEvent) => {
      e.preventDefault();
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;
      const halfW = window.innerWidth / 2;

      for (let i = 0; i < e.changedTouches.length; i++) {
        const t = e.changedTouches[i];
        const x = t.clientX - rect.left;
        const y = t.clientY - rect.top;
        const type = x < halfW ? 'MOVE' : 'AIM';
        touchesRef.current.set(t.identifier, {
            id: t.identifier,
            startX: x, startY: y,
            currentX: x, currentY: y,
            type
        });
      }
    };

    const handleTouchMove = (e: TouchEvent) => {
      e.preventDefault();
      const rect = canvasRef.current?.getBoundingClientRect();
      if (!rect) return;

      for (let i = 0; i < e.changedTouches.length; i++) {
          const t = e.changedTouches[i];
          const state = touchesRef.current.get(t.identifier);
          if (state) {
              state.currentX = t.clientX - rect.left;
              state.currentY = t.clientY - rect.top;
              
              // Limit radius
              const dx = state.currentX - state.startX;
              const dy = state.currentY - state.startY;
              const dist = Math.hypot(dx, dy);
              const maxDist = 40;
              
              if (dist > maxDist) {
                  const angle = Math.atan2(dy, dx);
                  state.currentX = state.startX + Math.cos(angle) * maxDist;
                  state.currentY = state.startY + Math.sin(angle) * maxDist;
              }
              touchesRef.current.set(t.identifier, state); // Force update
          }
      }
    };

    const handleTouchEnd = (e: TouchEvent) => {
       e.preventDefault();
       for (let i = 0; i < e.changedTouches.length; i++) {
           touchesRef.current.delete(e.changedTouches[i].identifier);
       }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mousedown', handleMouseDown);
    window.addEventListener('mouseup', handleMouseUp);
    window.addEventListener('resize', handleResize);
    
    const cvs = canvasRef.current;
    if (cvs) {
        cvs.addEventListener('touchstart', handleTouchStart, { passive: false });
        cvs.addEventListener('touchmove', handleTouchMove, { passive: false });
        cvs.addEventListener('touchend', handleTouchEnd, { passive: false });
        cvs.addEventListener('touchcancel', handleTouchEnd, { passive: false });
    }

    handleResize();

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mousedown', handleMouseDown);
      window.removeEventListener('mouseup', handleMouseUp);
      window.removeEventListener('resize', handleResize);
      if (cvs) {
        cvs.removeEventListener('touchstart', handleTouchStart);
        cvs.removeEventListener('touchmove', handleTouchMove);
        cvs.removeEventListener('touchend', handleTouchEnd);
        cvs.removeEventListener('touchcancel', handleTouchEnd);
      }
    };
  }, []);

  // Game Loop
  useEffect(() => {
    const draw = (ctx: CanvasRenderingContext2D) => {
      const w = ctx.canvas.width;
      const h = ctx.canvas.height;
      const cam = cameraRef.current;

      ctx.fillStyle = GAME_CONFIG.COLORS.BG;
      ctx.fillRect(0, 0, w, h);

      // Save context and apply camera
      ctx.save();
      ctx.translate(-cam.x, -cam.y);

      // Infinite-ish Grid (Draw only visible area)
      ctx.strokeStyle = GAME_CONFIG.COLORS.GRID;
      ctx.lineWidth = 1;
      const gridSize = 50;
      const startX = Math.floor(cam.x / gridSize) * gridSize;
      const startY = Math.floor(cam.y / gridSize) * gridSize;
      const endX = startX + w + gridSize;
      const endY = startY + h + gridSize;

      for (let x = startX; x <= endX; x += gridSize) { 
        if (x < 0 || x > GAME_CONFIG.WORLD_SIZE.W) continue;
        ctx.beginPath(); ctx.moveTo(x, Math.max(0, startY)); ctx.lineTo(x, Math.min(GAME_CONFIG.WORLD_SIZE.H, endY)); ctx.stroke(); 
      }
      for (let y = startY; y <= endY; y += gridSize) { 
        if (y < 0 || y > GAME_CONFIG.WORLD_SIZE.H) continue;
        ctx.beginPath(); ctx.moveTo(Math.max(0, startX), y); ctx.lineTo(Math.min(GAME_CONFIG.WORLD_SIZE.W, endX), y); ctx.stroke(); 
      }

      // World Borders
      ctx.strokeStyle = '#ff0000';
      ctx.lineWidth = 4;
      ctx.strokeRect(0, 0, GAME_CONFIG.WORLD_SIZE.W, GAME_CONFIG.WORLD_SIZE.H);

      // XP Orbs
      xpOrbsRef.current.forEach(o => {
          if (o.x < cam.x - 50 || o.x > cam.x + w + 50 || o.y < cam.y - 50 || o.y > cam.y + h + 50) return;
          ctx.fillStyle = o.color;
          ctx.beginPath();
          ctx.arc(o.x, o.y, 3, 0, Math.PI * 2);
          ctx.fill();
      });

      // Mines
      bulletsRef.current.forEach(b => {
          if (!b.isMine) return;
          ctx.fillStyle = GAME_CONFIG.COLORS.MINE;
          ctx.beginPath();
          ctx.arc(b.x, b.y, 6, 0, Math.PI*2);
          ctx.fill();
          // Pulse effect
          ctx.strokeStyle = GAME_CONFIG.COLORS.MINE;
          ctx.beginPath();
          ctx.arc(b.x, b.y, 6 + Math.sin(Date.now() / 100) * 2, 0, Math.PI*2);
          ctx.stroke();
      });

      // Particles
      particlesRef.current.forEach(p => {
        ctx.globalAlpha = p.alpha;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
      });
      ctx.globalAlpha = 1;

      // Zombies
      zombiesRef.current.forEach(z => {
        if (z.x < cam.x - 150 || z.x > cam.x + w + 150 || z.y < cam.y - 150 || z.y > cam.y + h + 150) return;
        drawZombie(ctx, z);
      });

      // Minions
      minionsRef.current.forEach(m => {
          if (m.type === 'DRONE') drawDrone(ctx, m);
          else drawDragon(ctx, m);
      });

      // Player
      drawPlayer(ctx, playerRef.current);
      
      // Evolved Shield
      if (inventory.orbitals >= 5) {
          ctx.strokeStyle = GAME_CONFIG.COLORS.ORBITAL_EVO;
          ctx.globalAlpha = 0.2;
          ctx.lineWidth = 2;
          ctx.beginPath();
          ctx.arc(playerRef.current.x, playerRef.current.y, GAME_CONFIG.ORBITAL_RADIUS_BASE + 40, 0, Math.PI*2);
          ctx.stroke();
          ctx.globalAlpha = 1;
      }

      // Bullets (Regular, Orbitals, Missiles, Axe)
      bulletsRef.current.forEach(b => {
        if (b.isMine) return; // Drawn separately

        ctx.fillStyle = b.color;
        ctx.shadowBlur = b.isOrbital ? 15 : 5;
        ctx.shadowColor = b.color;

        ctx.save();
        ctx.translate(b.x, b.y);
        
        if (b.isBoomerang) {
            // Axe Spin
            ctx.rotate(Date.now() / 50);
            ctx.fillRect(-8, -2, 16, 4);
            ctx.fillRect(-4, -8, 8, 16);
        } else if (b.homing) {
            // Missile shape
            const angle = Math.atan2(b.vy, b.vx);
            ctx.rotate(angle);
            ctx.fillRect(-6, -3, 12, 6);
            ctx.fillRect(-8, -1, 4, 2); // Fin
        } else {
            ctx.beginPath();
            ctx.arc(0, 0, b.radius, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.restore();
      });
      ctx.shadowBlur = 0;

      // Mouse Cursor (World Position) - Only draw if no touch aim
      if (!joystickAimRef.current.active) {
          const worldMouseX = mouseRef.current.x + cam.x;
          const worldMouseY = mouseRef.current.y + cam.y;
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
          ctx.beginPath();
          ctx.arc(worldMouseX, worldMouseY, 10, 0, Math.PI * 2);
          ctx.moveTo(worldMouseX - 15, worldMouseY); ctx.lineTo(worldMouseX + 15, worldMouseY);
          ctx.moveTo(worldMouseX, worldMouseY - 15); ctx.lineTo(worldMouseX, worldMouseY + 15);
          ctx.stroke();
      }

      ctx.restore(); // End Camera

      // Draw Static Joystick Zones (Visual Hint)
      // Left Stick Zone (Move)
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(100, h - 100, 60, 0, Math.PI * 2); 
      ctx.stroke();
      ctx.fillStyle = 'rgba(255, 255, 255, 0.05)';
      ctx.fill();
      
      // Right Stick Zone (Aim)
      ctx.beginPath();
      ctx.arc(w - 100, h - 100, 60, 0, Math.PI * 2); 
      ctx.stroke();
      ctx.fill();


      // Draw Active Joysticks (Screen Space)
      touchesRef.current.forEach(t => {
          drawJoystick(ctx, t);
      });
    };

    if (gameState !== GameState.PLAYING) {
      if (gameState === GameState.LEVEL_UP) {
         const ctx = canvasRef.current?.getContext('2d');
         if (ctx) draw(ctx);
      }
      if (frameIdRef.current) {
          cancelAnimationFrame(frameIdRef.current);
          frameIdRef.current = 0;
      }
      return;
    }

    const update = () => {
      const now = Date.now();
      const w = screenSizeRef.current.x;
      const h = screenSizeRef.current.y;

      // --- Regeneration ---
      if (inventory.regen > 0) {
          const isMaxed = inventory.regen >= 5;
          const amount = isMaxed ? 5 : inventory.regen;
          const delay = isMaxed ? 500 : 1000;
          if (now - lastRegenTimeRef.current > delay) {
              if (playerRef.current.hp < playerRef.current.maxHp) {
                  playerRef.current.hp = Math.min(playerRef.current.maxHp, playerRef.current.hp + amount);
              }
              lastRegenTimeRef.current = now;
          }
      }

      // --- Player Movement ---
      let dx = 0;
      let dy = 0;
      
      // Keyboard
      if (keysRef.current['KeyW']) dy -= 1;
      if (keysRef.current['KeyS']) dy += 1;
      if (keysRef.current['KeyA']) dx -= 1;
      if (keysRef.current['KeyD']) dx += 1;

      // Joystick
      let moveActive = false;
      let aimActive = false;
      joystickMoveRef.current = { x: 0, y: 0 };
      joystickAimRef.current = { x: 0, y: 0, active: false };

      touchesRef.current.forEach(t => {
          const diffX = t.currentX - t.startX;
          const diffY = t.currentY - t.startY;
          const dist = Math.hypot(diffX, diffY);
          const normDist = Math.min(dist, 40) / 40; // 0 to 1
          
          if (dist > 5) {
              const angle = Math.atan2(diffY, diffX);
              if (t.type === 'MOVE') {
                  dx += Math.cos(angle) * normDist;
                  dy += Math.sin(angle) * normDist;
                  moveActive = true;
              } else {
                  joystickAimRef.current = { x: Math.cos(angle), y: Math.sin(angle), active: true };
                  aimActive = true;
              }
          }
      });

      // Normalize combined input
      if (dx !== 0 || dy !== 0) {
          const len = Math.sqrt(dx * dx + dy * dy);
          const maxLen = 1;
          if (len > maxLen) {
              dx /= len;
              dy /= len;
          }
      }

      if (dx !== 0 || dy !== 0) {
        const speedLevel = inventory.speed;
        const isMaxed = speedLevel >= 5;
        const speedBonus = speedLevel * 0.5 + (isMaxed ? 2.0 : 0);
        const speed = GAME_CONFIG.PLAYER_SPEED_BASE + speedBonus;
        
        playerRef.current.x += dx * speed;
        playerRef.current.y += dy * speed;
      }

      // Clamp Player to World
      playerRef.current.x = Math.max(playerRef.current.radius, Math.min(GAME_CONFIG.WORLD_SIZE.W - playerRef.current.radius, playerRef.current.x));
      playerRef.current.y = Math.max(playerRef.current.radius, Math.min(GAME_CONFIG.WORLD_SIZE.H - playerRef.current.radius, playerRef.current.y));

      // Update Camera
      cameraRef.current.x = Math.max(0, Math.min(GAME_CONFIG.WORLD_SIZE.W - w, playerRef.current.x - w / 2));
      cameraRef.current.y = Math.max(0, Math.min(GAME_CONFIG.WORLD_SIZE.H - h, playerRef.current.y - h / 2));

      const cam = cameraRef.current;
      
      // --- Aiming ---
      if (joystickAimRef.current.active) {
          playerRef.current.angle = Math.atan2(joystickAimRef.current.y, joystickAimRef.current.x);
      } else {
          const worldMouseX = mouseRef.current.x + cam.x;
          const worldMouseY = mouseRef.current.y + cam.y;
          playerRef.current.angle = Math.atan2(worldMouseY - playerRef.current.y, worldMouseX - playerRef.current.x);
      }

      // --- Primary Weapon ---
      const gunStats = WEAPON_STATS.GUN;
      const isFireRateMaxed = inventory.fireRate >= 5;
      const fireRateReduction = inventory.fireRate * 0.10;
      const baseFireRate = gunStats.rate * (1 - Math.min(0.5, fireRateReduction)); 
      const finalFireRate = isFireRateMaxed ? 80 : Math.max(100, baseFireRate);
      
      const shouldShoot = keysRef.current['MouseLeft'] || joystickAimRef.current.active;

      if (shouldShoot && now - lastShotTimeRef.current > finalFireRate) {
        const angle = playerRef.current.angle;
        const isDamageMaxed = inventory.damage >= 5;
        const dmgMult = 1 + (inventory.damage * 0.2) + (isDamageMaxed ? 1.0 : 0);
        const baseDamage = gunStats.damage * dmgMult;
        const speed = gunStats.speed;
        const bulletColor = isDamageMaxed ? GAME_CONFIG.COLORS.BULLET_EVO : GAME_CONFIG.COLORS.BULLET;
        const bulletRadius = isDamageMaxed ? 6 : 4;
        const knockback = isDamageMaxed ? 8 : 2;

        const spawnBullet = (offsetAngle: number) => {
            const finalAngle = angle + offsetAngle;
            const spread = isFireRateMaxed ? (Math.random() - 0.5) * 0.1 : 0;
            bulletsRef.current.push({
                id: uid(),
                x: playerRef.current.x + Math.cos(finalAngle) * 30,
                y: playerRef.current.y + Math.sin(finalAngle) * 30,
                vx: Math.cos(finalAngle + spread) * speed,
                vy: Math.sin(finalAngle + spread) * speed,
                radius: bulletRadius,
                color: bulletColor,
                damage: baseDamage,
                piercing: isDamageMaxed ? 3 : 0,
                knockback: knockback
            });
        };

        spawnBullet(0);

        const msLvl = inventory.multishot;
        const isMsMaxed = msLvl >= 5;
        if (msLvl > 0) {
            if (isMsMaxed) {
                for(let i=0; i<8; i++) spawnBullet((Math.PI * 2 / 8) * i);
            } else {
                const spreadArc = 0.15;
                for(let i=1; i <= msLvl; i++) {
                    spawnBullet(spreadArc * i);
                    spawnBullet(-spreadArc * i);
                }
            }
        }
        lastShotTimeRef.current = now;
        playSound('shoot');
      }

      // --- New Weapons Logic ---

      // 1. Minions (Drone/Dragon)
      minionsRef.current.forEach((m, idx) => {
          // Follow Player
          const offsetAngle = (idx * (Math.PI*2) / minionsRef.current.length) + (now/2000);
          const targetX = playerRef.current.x + Math.cos(offsetAngle) * 60;
          const targetY = playerRef.current.y + Math.sin(offsetAngle) * 60;
          
          m.x += (targetX - m.x) * 0.08;
          m.y += (targetY - m.y) * 0.08;
          
          const stat = m.type === 'DRONE' ? WEAPON_STATS.DRONE : WEAPON_STATS.DRAGON;
          
          // Scan for target
          if (!m.targetId) {
              const nearest = getNearestEnemy(m.x, m.y, stat.range);
              if (nearest) m.targetId = nearest.id;
          }

          // Fire
          const isEvo = (m.type === 'DRONE' && inventory.drone >= 5) || (m.type === 'DRAGON' && inventory.dragon >= 5);
          const realCooldown = isEvo ? stat.rate / 2 : stat.rate;

          if (now - m.lastFire > realCooldown) {
              const target = zombiesRef.current.find(z => z.id === m.targetId);
              if (target) {
                  const angle = Math.atan2(target.y - m.y, target.x - m.x);
                  m.angle = angle;
                  
                  if (m.type === 'DRONE') {
                      bulletsRef.current.push({
                          id: uid(),
                          x: m.x, y: m.y,
                          vx: Math.cos(angle) * stat.speed, vy: Math.sin(angle) * stat.speed,
                          radius: 4, color: GAME_CONFIG.COLORS.DRONE,
                          damage: stat.damage * (isEvo ? 2 : 1), // High single shot damage
                          piercing: 1
                      });
                  } else {
                      // Dragon Fire Breath (Short range, multiple particles)
                      const count = isEvo ? 5 : 3;
                      for(let k=0; k<count; k++) {
                          const spread = (Math.random()-0.5)*0.6;
                          bulletsRef.current.push({
                              id: uid(),
                              x: m.x, y: m.y,
                              vx: Math.cos(angle+spread) * stat.speed, vy: Math.sin(angle+spread) * stat.speed,
                              radius: isEvo ? 6 : 3, color: GAME_CONFIG.COLORS.DRAGON,
                              damage: stat.damage, // Low dmg, high rate
                              duration: WEAPON_STATS.DRAGON.duration, // Short lived
                              piercing: 5
                          });
                      }
                  }
                  m.lastFire = now;
              } else {
                  m.targetId = undefined;
                  // Idle spin
                  m.angle += 0.1; 
              }
          }
      });

      // 2. Missile
      if (inventory.missile > 0) {
          const stat = WEAPON_STATS.MISSILE;
          if (now - lastMissileTimeRef.current > stat.rate) {
              const count = inventory.missile >= 5 ? 3 : 1;
              for(let i=0; i<count; i++) {
                  bulletsRef.current.push({
                      id: uid(),
                      x: playerRef.current.x, y: playerRef.current.y,
                      vx: (Math.random()-0.5)*5, vy: (Math.random()-0.5)*5, // Start random
                      radius: 5, color: GAME_CONFIG.COLORS.MISSILE,
                      damage: stat.damage,
                      homing: true,
                      piercing: 0,
                      knockback: 5
                  });
              }
              lastMissileTimeRef.current = now;
          }
      }

      // 3. Lightning
      if (inventory.lightning > 0) {
          const stat = WEAPON_STATS.LIGHTNING;
          const cd = inventory.lightning >= 5 ? stat.rate / 2 : stat.rate;
          if (now - lastLightningTimeRef.current > cd) {
              const count = inventory.lightning + 2;
              const targets = zombiesRef.current.filter(z => 
                  z.x > cam.x && z.x < cam.x + w && z.y > cam.y && z.y < cam.y + h
              );
              
              // Pick random targets
              for(let i=0; i<count; i++) {
                  if (targets.length === 0) break;
                  const idx = Math.floor(Math.random() * targets.length);
                  const target = targets[idx];
                  
                  // Fixed damage hit
                  target.hp -= stat.damage; 
                  createExplosion(target.x, target.y, GAME_CONFIG.COLORS.LIGHTNING, 5);
                  // Visual Line from sky (faked by particle)
                  targets.splice(idx, 1);
              }
              lastLightningTimeRef.current = now;
          }
      }

      // 4. Mines
      if (inventory.mine > 0) {
          const stat = WEAPON_STATS.MINE;
          if (now - lastMineTimeRef.current > stat.rate) {
              bulletsRef.current.push({
                  id: uid(),
                  x: playerRef.current.x, y: playerRef.current.y,
                  vx: 0, vy: 0,
                  radius: 6, color: GAME_CONFIG.COLORS.MINE,
                  damage: stat.damage * (inventory.mine >= 5 ? 2 : 1),
                  isMine: true,
                  piercing: 1
              });
              lastMineTimeRef.current = now;
          }
      }

      // 5. Axe
      if (inventory.axe > 0) {
          const stat = WEAPON_STATS.AXE;
          const isEvo = inventory.axe >= 5;
          if (now - lastAxeTimeRef.current > stat.rate) {
              const angle = playerRef.current.angle;
              bulletsRef.current.push({
                  id: uid(),
                  x: playerRef.current.x, y: playerRef.current.y,
                  vx: Math.cos(angle) * stat.speed, vy: Math.sin(angle) * stat.speed,
                  radius: isEvo ? 18 : 12, color: GAME_CONFIG.COLORS.AXE,
                  damage: stat.damage,
                  piercing: 999,
                  isBoomerang: true,
                  returnToPlayer: false,
                  duration: isEvo ? 300 : stat.duration // Evo lasts longer/spins around
              });
              lastAxeTimeRef.current = now;
          }
      }


      // --- Orbitals Update ---
      if (inventory.orbitals > 0) {
          const stat = WEAPON_STATS.ORBITAL;
          orbitalAngleRef.current += stat.speed * (inventory.orbitals >= 5 ? 2 : 1);
          bulletsRef.current = bulletsRef.current.filter(b => !b.isOrbital);
          
          const isMaxed = inventory.orbitals >= 5;
          const count = inventory.orbitals + (isMaxed ? 2 : 0);
          const step = (Math.PI * 2) / count;
          const dist = GAME_CONFIG.ORBITAL_RADIUS_BASE + (isMaxed ? 40 : 0);
          const damage = stat.damage * (isMaxed ? 2 : 1);
          const color = isMaxed ? GAME_CONFIG.COLORS.ORBITAL_EVO : GAME_CONFIG.COLORS.ORBITAL;

          for(let i=0; i<count; i++) {
              const orbAngle = orbitalAngleRef.current + (step * i);
              bulletsRef.current.push({
                  id: `orbital-${i}`,
                  x: playerRef.current.x + Math.cos(orbAngle) * dist,
                  y: playerRef.current.y + Math.sin(orbAngle) * dist,
                  vx: 0, vy: 0, 
                  radius: isMaxed ? 10 : 6,
                  color: color,
                  damage: damage,
                  isOrbital: true,
                  piercing: 9999,
                  knockback: isMaxed ? 5 : 1
              });
          }
      }

      // --- Zombies Spawning ---
      const baseSpawnRate = 1500;
      const rateReductionPerWave = 100;
      const minSpawnRate = 100;
      const effectiveSpawnRate = Math.max(minSpawnRate, (baseSpawnRate - (waveRef.current * rateReductionPerWave)) / diffConfig.spawnRate);

      if (now - lastSpawnTimeRef.current > effectiveSpawnRate) {
        const count = Math.floor(1 + (waveRef.current / 5) * diffConfig.spawnRate);
        
        for(let i=0; i<count; i++) {
            // Spawn around the camera view (ring)
            const angle = Math.random() * Math.PI * 2;
            const dist = (Math.max(w, h) / 2) + 150; // Just outside screen
            let zx = playerRef.current.x + Math.cos(angle) * dist;
            let zy = playerRef.current.y + Math.sin(angle) * dist;

            // Clamp to world
            zx = Math.max(50, Math.min(GAME_CONFIG.WORLD_SIZE.W - 50, zx));
            zy = Math.max(50, Math.min(GAME_CONFIG.WORLD_SIZE.H - 50, zy));

            let type: ZombieType = 'NORMAL';
            const r = Math.random();
            const wave = waveRef.current;

            if (wave <= 2) {
                if (r > 0.9) type = 'FAST';
            } else if (wave <= 5) {
                if (r > 0.8) type = 'WOLF';
                else if (r > 0.7) type = 'FAST';
            } else if (wave <= 10) {
                if (r > 0.95) type = 'GIANT';
                else if (r > 0.8) type = 'WOLF';
                else if (r > 0.7) type = 'PARASITE';
                else if (r > 0.6) type = 'CRAWLER';
            } else {
                if (r > 0.9) type = 'GIANT';
                else if (r > 0.75) type = 'TANK';
                else if (r > 0.6) type = 'PARASITE';
                else if (r > 0.4) type = 'WOLF';
                else if (r > 0.3) type = 'CRAWLER';
            }

            const stats = ZOMBIE_STATS[type];
            const hpMult = (1 + (wave * 0.1)) * diffConfig.enemyHp;
            const hp = stats.hp * hpMult;
            const speed = stats.speed * diffConfig.enemySpeed;

            zombiesRef.current.push({
                id: uid(),
                x: zx, y: zy,
                radius: stats.radius,
                color: stats.color,
                speed: speed,
                hp: hp,
                maxHp: hp,
                type,
                opacity: type === 'CRAWLER' ? 0.4 : 1
            });
        }
        lastSpawnTimeRef.current = now;
      }

      // --- Physics & Logic Update ---
      
      bulletsRef.current.forEach(b => {
        if(!b.isOrbital && !b.isMine) {
            // Missile Homing Logic
            if (b.homing) {
                let target = zombiesRef.current.find(z => z.id === b.targetId);
                if (!target) {
                    target = getNearestEnemy(b.x, b.y, 600);
                    if (target) b.targetId = target.id;
                }
                if (target) {
                    const angle = Math.atan2(target.y - b.y, target.x - b.x);
                    b.vx += Math.cos(angle) * 0.5;
                    b.vy += Math.sin(angle) * 0.5;
                    // Limit speed
                    const spd = Math.hypot(b.vx, b.vy);
                    if (spd > 10) { b.vx *= 0.9; b.vy *= 0.9; }
                }
            }

            // Axe Boomerang Logic
            if (b.isBoomerang) {
                if (!b.returnToPlayer) {
                    // Decelerate
                    b.vx *= 0.95;
                    b.vy *= 0.95;
                    const spd = Math.hypot(b.vx, b.vy);
                    if (spd < 1) b.returnToPlayer = true;
                } else {
                    // Accelerate to player
                    const angle = Math.atan2(playerRef.current.y - b.y, playerRef.current.x - b.x);
                    b.vx += Math.cos(angle) * 1.5;
                    b.vy += Math.sin(angle) * 1.5;
                    // Check if caught
                    const dist = Math.hypot(playerRef.current.x - b.x, playerRef.current.y - b.y);
                    if (dist < 30) b.duration = 0; // Remove
                }
            }

            b.x += b.vx;
            b.y += b.vy;

            if (b.duration !== undefined) {
                b.duration--;
            }
        }
      });

      // Cleanup bullets
      bulletsRef.current = bulletsRef.current.filter(b => {
          if (b.duration !== undefined && b.duration <= 0) return false;
          if (b.x < 0 || b.x > GAME_CONFIG.WORLD_SIZE.W || b.y < 0 || b.y > GAME_CONFIG.WORLD_SIZE.H) return false;
          return true;
      });

      zombiesRef.current.forEach(z => {
        const angle = Math.atan2(playerRef.current.y - z.y, playerRef.current.x - z.x);
        let moveSpeed = z.speed;
        if (z.type === 'CRAWLER') {
            if (Math.random() < 0.05) z.speed *= 1.5;
            if (z.speed > ZOMBIE_STATS.CRAWLER.speed * 2) z.speed = ZOMBIE_STATS.CRAWLER.speed;
        }
        z.x += Math.cos(angle) * moveSpeed;
        z.y += Math.sin(angle) * moveSpeed;
      });

      particlesRef.current.forEach(p => {
        p.x += p.vx;
        p.y += p.vy;
        p.life -= 0.05;
        p.alpha = p.life / p.maxLife;
      });
      particlesRef.current = particlesRef.current.filter(p => p.life > 0);

      // XP Magnet
      const isMagnetMaxed = inventory.magnet >= 5;
      const magnetRadius = GAME_CONFIG.MAGNET_RADIUS_BASE * (1 + inventory.magnet * 0.25) * (isMagnetMaxed ? 3 : 1);
      xpOrbsRef.current.forEach(orb => {
         const dist = Math.hypot(orb.x - playerRef.current.x, orb.y - playerRef.current.y);
         if (dist < magnetRadius) {
             const angle = Math.atan2(playerRef.current.y - orb.y, playerRef.current.x - orb.x);
             orb.vx += Math.cos(angle) * 1.5;
             orb.vy += Math.sin(angle) * 1.5;
             orb.x += orb.vx;
             orb.y += orb.vy;
             orb.vx *= 0.9;
             orb.vy *= 0.9;
         } else {
             orb.x += orb.vx;
             orb.y += orb.vy;
             orb.vx *= 0.90;
             orb.vy *= 0.90;
         }
      });

      // --- Collision ---
      bulletsRef.current.forEach(b => {
        // Check if Bullet hits any zombie
        zombiesRef.current.forEach(z => {
          const dist = Math.hypot(b.x - z.x, b.y - z.y);
          
          // Collision (Radius checks)
          if (dist < z.radius + b.radius) {
            if (b.isMine) {
                // Mine explodes
                createExplosion(b.x, b.y, GAME_CONFIG.COLORS.MINE, 10, 2);
                playSound('explosion');
                // Area damage
                const area = WEAPON_STATS.MINE.area;
                zombiesRef.current.forEach(nz => {
                     if(Math.hypot(nz.x - b.x, nz.y - b.y) < area) {
                         nz.hp -= b.damage;
                     }
                });
                b.duration = 0; // Remove mine
            } 
            else if (b.homing) {
                // Missile explodes
                createExplosion(b.x, b.y, GAME_CONFIG.COLORS.MISSILE, 15, 2);
                playSound('explosion');
                const area = WEAPON_STATS.MISSILE.area || 120;
                zombiesRef.current.forEach(nz => {
                     if(Math.hypot(nz.x - b.x, nz.y - b.y) < area) {
                         nz.hp -= b.damage;
                     }
                });
                b.duration = 0;
            }
            else {
                // Standard Hit
                z.hp -= b.damage;
                
                // Blood
                createExplosion(z.x, z.y, GAME_CONFIG.BLOOD_COLOR, 2, 0.5);

                // Knockback
                const kb = b.knockback || 2;
                const angle = Math.atan2(z.y - playerRef.current.y, z.x - playerRef.current.x);
                const resist = z.type === 'GIANT' ? 0.1 : z.type === 'TANK' ? 0.3 : 1.0;
                z.x += Math.cos(angle) * kb * resist;
                z.y += Math.sin(angle) * kb * resist;

                if (!b.isOrbital && !b.isBoomerang) {
                    if (b.piercing && b.piercing > 0) {
                        b.piercing--;
                    } else {
                        b.duration = 0; // Mark for removal
                    }
                }
                
                if (z.hp > 0 && !b.isOrbital) playSound('hit');
            }
          }
        });
      });

      // Process Deaths
      zombiesRef.current.forEach(z => {
          if (z.hp <= 0) {
              const stats = ZOMBIE_STATS[z.type];
              scoreRef.current += Math.floor(stats.score * diffConfig.scoreMult);
              killsRef.current += 1;
              createExplosion(z.x, z.y, z.color, 8);
              
              xpOrbsRef.current.push({
                  id: uid(),
                  x: z.x, y: z.y,
                  radius: 4,
                  color: (z.type === 'GIANT' || z.type === 'TANK') ? GAME_CONFIG.COLORS.XP_ORB_RARE : GAME_CONFIG.COLORS.XP_ORB,
                  value: stats.xp,
                  vx: (Math.random() - 0.5) * 2,
                  vy: (Math.random() - 0.5) * 2
              });

              if (z.type === 'PARASITE') {
                  for(let i=0; i<3; i++) {
                      const sStat = ZOMBIE_STATS['PARASITE_SMALL'];
                      zombiesRef.current.push({
                        id: uid(),
                        x: z.x + (Math.random() - 0.5) * 20,
                        y: z.y + (Math.random() - 0.5) * 20,
                        radius: sStat.radius,
                        color: sStat.color,
                        speed: sStat.speed,
                        hp: sStat.hp,
                        maxHp: sStat.hp,
                        type: 'PARASITE_SMALL'
                      });
                  }
              }

              if (killsRef.current > 0 && killsRef.current % (20 * diffConfig.spawnRate) === 0) {
                waveRef.current += 1;
              }
          }
      });
      
      zombiesRef.current = zombiesRef.current.filter(z => z.hp > 0);
      bulletsRef.current = bulletsRef.current.filter(b => b.duration === undefined || b.duration > 0);

      // XP Collect
      xpOrbsRef.current = xpOrbsRef.current.filter(orb => {
          const dist = Math.hypot(orb.x - playerRef.current.x, orb.y - playerRef.current.y);
          if (dist < playerRef.current.radius + 10) {
              playerRef.current.xp += orb.value;
              playSound('xp');
              if (playerRef.current.xp >= playerRef.current.nextLevelXp) {
                  playerRef.current.level++;
                  playerRef.current.xp -= playerRef.current.nextLevelXp;
                  playerRef.current.nextLevelXp = Math.floor(playerRef.current.nextLevelXp * GAME_CONFIG.XP_GROWTH_FACTOR);
                  playSound('levelup');
                  onLevelUp();
              }
              return false;
          }
          return true;
      });

      // Player Damage
      zombiesRef.current.forEach(z => {
        const dist = Math.hypot(z.x - playerRef.current.x, z.y - playerRef.current.y);
        if (dist < z.radius + playerRef.current.radius - 5) { // -5 for hit box leniency
          playerRef.current.hp -= 1;
          if (frameIdRef.current % 10 === 0) {
            createExplosion(playerRef.current.x, playerRef.current.y, '#ef4444', 1);
          }
          // Push
          const angle = Math.atan2(z.y - playerRef.current.y, z.x - playerRef.current.x);
          playerRef.current.x -= Math.cos(angle) * 2;
          playerRef.current.y -= Math.sin(angle) * 2;
        }
      });

      if (frameIdRef.current % 10 === 0) {
        setStats({
            hp: Math.max(0, playerRef.current.hp),
            maxHp: playerRef.current.maxHp,
            score: scoreRef.current,
            wave: waveRef.current,
            kills: killsRef.current,
            xp: playerRef.current.xp,
            nextLevelXp: playerRef.current.nextLevelXp,
            level: playerRef.current.level
        });
      }

      if (playerRef.current.hp <= 0) {
        onGameOver({
            score: scoreRef.current,
            kills: killsRef.current,
            wave: waveRef.current,
            timeSurvived: Date.now() - startTimeRef.current,
            level: playerRef.current.level
        });
        return;
      }

      const ctx = canvasRef.current?.getContext('2d');
      if (ctx) draw(ctx);
      frameIdRef.current = requestAnimationFrame(update);
    };

    frameIdRef.current = requestAnimationFrame(update);

    return () => {
      if (frameIdRef.current) cancelAnimationFrame(frameIdRef.current);
    };
  }, [gameState, inventory, difficulty, onGameOver, onLevelUp, setStats]);

  return (
    <canvas
      ref={canvasRef}
      className="block w-full h-full crosshair"
    />
  );
};