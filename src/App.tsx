/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Trophy, 
  Shield, 
  Search,
  Zap, 
  Info, 
  Gamepad2, 
  Keyboard,
  ChevronRight,
  Heart,
  Target,
  Rocket,
  Home,
  Ticket
} from 'lucide-react';

// --- Constants ---
const CANVAS_WIDTH = 800;
const CANVAS_HEIGHT = 900;
const PLAYER_SPEED = 7;
const BULLET_SPEED = 10;
const ENEMY_BASE_SPEED = 2.5; 
const INVINCIBILITY_DURATION = 1500;
const LEVEL_UP_SCORE = 1000;

// --- Types ---
type GameState = 'START' | 'PLAYING' | 'PAUSED' | 'GAMEOVER' | 'SHOP';

type Realm = 'HELL' | 'VOID' | 'ABYSS';
type Difficulty = 'EASY' | 'NORMAL' | 'ADVANCED' | 'EXPERT' | 'HARD';

interface BackgroundSkin {
  id: string;
  name: string;
  type: 'SPACE' | 'NEBULA' | 'GALAXY' | 'TRADITIONAL' | 'CRYSTAL' | 'VOID_STORM' | 'WATERFALL';
  price: number;
  unlocked: boolean;
}

interface ButtonSkin {
  id: string;
  name: string;
  style: 'DEFAULT' | 'GLASS' | 'CRYSTAL' | 'NEON' | 'INK';
  price: number;
  unlocked: boolean;
}

interface Skin {
  id: string;
  name: string;
  tier: 'COMMON' | 'RARE' | 'EPIC' | 'LEGENDARY' | 'MYTHIC';
  price: number;
  unlocked: boolean;
  bulletWidth: number;
  hasDualShip: boolean;
  defenseBonus: number;
  speedMultiplier: number;
  trailColor: string;
  color: string;
  glowIntensity: number;
  isLotteryExclusive?: boolean;
  bulletColor?: string;
  bulletShape?: 'RECT' | 'CIRCLE' | 'DIAMOND' | 'DRAGON' | 'CANNONBALL' | 'INK_DROP' | 'FIREBALL' | 'LOTUS_SEED' | 'WIND_GUST';
  pattern?: 'NONE' | 'CLOUD' | 'DRAGON' | 'PHOENIX' | 'LOTUS' | 'WATERFALL' | 'WATERCOLOR' | 'PORCELAIN' | 'GEMSTONE';
  shape?: 'DEFAULT' | 'DRAGON' | 'PHOENIX' | 'SWORD' | 'LANTERN' | 'PAGODA' | 'LOTUS_FLOWER' | 'BRAIN_CORE' | 'WARRIOR' | 'BEAST' | 'BULLET_SHIP' | 'WIND_SPIRIT';
  dynamicEffect?: 'NONE' | 'WATERFALL' | 'WATERCOLOR' | 'CRYSTAL' | 'NEON_PULSE' | 'FLAME' | 'GLOSS' | 'STORM';
  ability?: 'NONE' | 'BOMB' | 'SHIELD_REFLECT' | 'TIME_SLOW' | 'CHAIN_SHOT' | 'PHANTOM' | 'TARGETED_STRIKE';
}

interface Achievement {
  id: string;
  title: string;
  description: string;
  unlocked: boolean;
  icon: React.ReactNode;
}

interface Point {
  x: number;
  y: number;
}

interface Entity extends Point {
  width: number;
  height: number;
}

interface Player extends Entity {
  lives: number;
  hp: number;
  maxHp: number;
  score: number;
  level: number;
  defense: number; // Current defense rating (0-100)
  isInvincible: boolean;
  invincibleUntil: number;
  powerUp: 'NONE' | 'TRIPLE' | 'RAPID';
  powerUpUntil: number;
  hasShield: boolean;
  skinId: string;
  tilt: number; // New: for rolling effect
}

interface Bullet extends Point {
  vx: number;
  vy: number;
  isPlayer: boolean;
  width: number;
}

interface Enemy extends Entity {
  type: 'BASIC' | 'FAST' | 'HEAVY' | 'SNIPER' | 'TANK' | 'ELITE' | 'BOSS';
  hp: number;
  maxHp: number;
  speed: number;
  color: string;
  lastShot: number;
}

interface PowerUp extends Entity {
  type: 'TRIPLE' | 'SHIELD' | 'TREASURE' | 'RAPID' | 'ARMOR';
}

interface Bomb extends Point {
  vx: number;
  vy: number;
  targetId: string | null;
  life: number;
}

interface Particle extends Point {
  vx: number;
  vy: number;
  life: number;
  color: string;
  size: number;
}

// --- Game Logic ---

// --- Components ---
const SkinPreview = ({ skin, size = 60, onZoom }: { skin: Skin, size?: number, onZoom?: (s: Skin) => void }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, size, size);
    ctx.save();
    ctx.translate(size / 2, size / 2);
    
    // Draw logic adapted from main draw function
    ctx.shadowBlur = skin.glowIntensity / 2;
    ctx.shadowColor = skin.color;
    ctx.fillStyle = skin.color;
    
    // Scale for preview
    const scale = size / 80;
    ctx.scale(scale, scale);

    // Draw Ship Shape
    ctx.beginPath();
    if (skin.shape === 'DRAGON') {
      ctx.moveTo(0, -30);
      ctx.quadraticCurveTo(20, -10, 0, 30);
      ctx.quadraticCurveTo(-20, -10, 0, -30);
    } else if (skin.shape === 'PHOENIX') {
      ctx.moveTo(0, -30);
      ctx.lineTo(-25, 20);
      ctx.lineTo(0, 5);
      ctx.lineTo(25, 20);
      ctx.closePath();
    } else if (skin.shape === 'SWORD') {
      ctx.moveTo(0, -35);
      ctx.lineTo(-10, 0);
      ctx.lineTo(-20, 25);
      ctx.lineTo(0, 15);
      ctx.lineTo(20, 25);
      ctx.lineTo(10, 0);
      ctx.closePath();
    } else if (skin.shape === 'BULLET_SHIP') {
      ctx.moveTo(0, -35);
      ctx.quadraticCurveTo(20, -20, 20, 25);
      ctx.lineTo(-20, 25);
      ctx.quadraticCurveTo(-20, -20, 0, -35);
      ctx.closePath();
    } else if (skin.shape === 'WIND_SPIRIT') {
      for(let i=0; i<3; i++) {
        ctx.beginPath();
        ctx.arc(0, 0, 15 - i*5, 0, Math.PI * 1.5);
        ctx.stroke();
      }
    } else {
      ctx.moveTo(0, -25);
      ctx.lineTo(-25, 25);
      ctx.lineTo(25, 25);
      ctx.closePath();
    }
    ctx.fill();

    // Cockpit
    ctx.fillStyle = 'white';
    ctx.beginPath();
    ctx.ellipse(0, -5, 6, 10, 0, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }, [skin, size]);

  return (
    <div 
      onClick={() => onZoom?.(skin)}
      className="relative group cursor-pointer overflow-hidden rounded-xl bg-white/5 border border-white/10 hover:border-blue-500/50 transition-all"
    >
      <canvas ref={canvasRef} width={size} height={size} className="mx-auto" />
      <div className="absolute inset-0 bg-blue-500/0 group-hover:bg-blue-500/10 transition-colors flex items-center justify-center">
        <Search className="w-4 h-4 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
    </div>
  );
};

const SkinZoomModal = ({ skin, onClose }: { skin: Skin, onClose: () => void }) => {
  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-[100] bg-black/90 backdrop-blur-xl flex items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div 
        initial={{ scale: 0.8, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        className="bg-slate-900 border border-white/10 p-8 rounded-3xl max-w-lg w-full relative overflow-hidden"
        onClick={e => e.stopPropagation()}
      >
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent" />
        
        <button 
          onClick={onClose}
          className="absolute top-4 right-4 p-2 hover:bg-white/10 rounded-full transition-colors"
        >
          <RotateCcw className="w-5 h-5 text-slate-400" />
        </button>

        <div className="flex flex-col items-center gap-6">
          <div className="relative">
            <div className="absolute inset-0 bg-blue-500/20 blur-3xl rounded-full" />
            <SkinPreview skin={skin} size={200} />
          </div>

          <div className="text-center">
            <h2 className="text-3xl font-black mb-2">{skin.name}</h2>
            <div className="flex justify-center gap-2 mb-4">
              <span className={`px-3 py-1 rounded-full text-xs font-black ${
                skin.tier === 'MYTHIC' ? 'bg-red-600 text-white' :
                skin.tier === 'LEGENDARY' ? 'bg-purple-600 text-white' :
                skin.tier === 'EPIC' ? 'bg-blue-600 text-white' : 'bg-slate-600 text-white'
              }`}>
                {skin.tier}
              </span>
              {skin.ability && (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  {skin.ability === 'BOMB' ? '自爆弹' : 
                   skin.ability === 'SHIELD_REFLECT' ? '防御反弹' : 
                   skin.ability === 'TIME_SLOW' ? '时空扭曲' : 
                   skin.ability === 'CHAIN_SHOT' ? '连锁射击' : 
                   skin.ability === 'TARGETED_STRIKE' ? '精准打击' :
                   skin.ability === 'PHANTOM' ? '幽灵闪避' : skin.ability}
                </span>
              )}
            </div>
            <p className="text-slate-400 text-sm leading-relaxed">
              这款战机采用了先进的 {
                skin.pattern === 'CLOUD' ? '云纹' : 
                skin.pattern === 'DRAGON' ? '龙纹' : 
                skin.pattern === 'PHOENIX' ? '凤纹' : 
                skin.pattern === 'LOTUS' ? '莲纹' : 
                skin.pattern === 'WATERFALL' ? '瀑布纹' : 
                skin.pattern === 'WATERCOLOR' ? '水彩纹' : 
                skin.pattern === 'PORCELAIN' ? '青花瓷' : 
                skin.pattern === 'GEMSTONE' ? '宝石纹' : '标准'
              } 纹理工艺，并搭载了 {
                skin.dynamicEffect === 'WATERFALL' ? '瀑布' : 
                skin.dynamicEffect === 'WATERCOLOR' ? '水彩' : 
                skin.dynamicEffect === 'CRYSTAL' ? '晶体' : 
                skin.dynamicEffect === 'FLAME' ? '火焰' :
                skin.dynamicEffect === 'GLOSS' ? '光泽' :
                skin.dynamicEffect === 'STORM' ? '风暴' : 
                skin.dynamicEffect === 'NEON_PULSE' ? '霓虹' : '标准'
              } 动力核心。
              其独特的 {
                skin.shape === 'DRAGON' ? '神龙' : 
                skin.shape === 'PHOENIX' ? '凤凰' : 
                skin.shape === 'SWORD' ? '利剑' : 
                skin.shape === 'LANTERN' ? '灯笼' : 
                skin.shape === 'PAGODA' ? '宝塔' : 
                skin.shape === 'LOTUS_FLOWER' ? '莲花' : 
                skin.shape === 'BRAIN_CORE' ? '核心' : 
                skin.shape === 'WARRIOR' ? '战士' : 
                skin.shape === 'BEAST' ? '猛兽' : 
                skin.shape === 'BULLET_SHIP' ? '子弹' : 
                skin.shape === 'WIND_SPIRIT' ? '风灵' : '标准'
              } 气动布局使其在战场上无往不利。
            </p>
          </div>

          <div className="grid grid-cols-3 gap-4 w-full mt-4">
            <div className="bg-white/5 p-3 rounded-xl border border-white/5 text-center">
              <div className="text-[10px] text-slate-500 uppercase font-bold">防御</div>
              <div className="text-lg font-bold text-blue-400">+{skin.defenseBonus}</div>
            </div>
            <div className="bg-white/5 p-3 rounded-xl border border-white/5 text-center">
              <div className="text-[10px] text-slate-500 uppercase font-bold">机动</div>
              <div className="text-lg font-bold text-green-400">x{skin.speedMultiplier}</div>
            </div>
            <div className="bg-white/5 p-3 rounded-xl border border-white/5 text-center">
              <div className="text-[10px] text-slate-500 uppercase font-bold">火力</div>
              <div className="text-lg font-bold text-red-400">{skin.bulletWidth}</div>
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default function App() {
  const [gameState, setGameState] = useState<GameState>('START');
  const [score, setScore] = useState(0);
  const [lives, setLives] = useState(3);
  const [level, setLevel] = useState(1);
  const [credits, setCredits] = useState(() => {
    const saved = localStorage.getItem('tina_credits');
    return saved ? parseInt(saved) : 0;
  });

  const [tickets, setTickets] = useState(() => {
    const saved = localStorage.getItem('tina_tickets');
    return saved ? parseInt(saved) : 0;
  });

  const [lotteryState, setLotteryState] = useState<'IDLE' | 'SPINNING' | 'RESULT'>('IDLE');
  const [winningSkin, setWinningSkin] = useState<Skin | null>(null);
  const [spinAngle, setSpinAngle] = useState(0);

  const [skins, setSkins] = useState<Skin[]>(() => {
    const defaultSkins: Skin[] = [
      // --- GREEN TIER (COMMON/RARE) ---
      { id: 'default', name: '星标', tier: 'COMMON', price: 0, unlocked: true, bulletWidth: 10, hasDualShip: false, defenseBonus: 10, speedMultiplier: 1.0, trailColor: '#22c55e', color: '#22c55e', glowIntensity: 10, pattern: 'CLOUD', bulletShape: 'CANNONBALL', shape: 'DEFAULT' },
      { id: 'storm_bringer', name: '唤雨者', tier: 'RARE', price: 3000, unlocked: false, bulletWidth: 12, hasDualShip: false, defenseBonus: 25, speedMultiplier: 1.2, trailColor: '#4ade80', color: '#4ade80', glowIntensity: 20, pattern: 'CLOUD', dynamicEffect: 'WATERFALL', bulletShape: 'CANNONBALL', shape: 'DEFAULT' },
      { id: 'bamboo_shadow', name: '竹影', tier: 'RARE', price: 1800, unlocked: false, bulletWidth: 10, hasDualShip: false, defenseBonus: 15, speedMultiplier: 1.7, trailColor: '#16a34a', color: '#16a34a', glowIntensity: 20, shape: 'SWORD', pattern: 'LOTUS', bulletShape: 'CANNONBALL' },
      { id: 'wood_spirit', name: '森之灵', tier: 'RARE', price: 1300, unlocked: false, bulletWidth: 10, hasDualShip: false, defenseBonus: 30, speedMultiplier: 1.1, trailColor: '#15803d', color: '#15803d', glowIntensity: 15, shape: 'BEAST', pattern: 'LOTUS', bulletShape: 'CANNONBALL' },

      // --- BLUE TIER (EPIC) ---
      { id: 'dual', name: '双子星', tier: 'EPIC', price: 2500, unlocked: false, bulletWidth: 12, hasDualShip: true, defenseBonus: 25, speedMultiplier: 1.2, trailColor: '#3b82f6', color: '#3b82f6', glowIntensity: 25, pattern: 'GEMSTONE', bulletShape: 'CANNONBALL', shape: 'DEFAULT' },
      { id: 'jade_dragon', name: '青玉龙', tier: 'EPIC', price: 6000, unlocked: false, bulletWidth: 14, hasDualShip: false, defenseBonus: 40, speedMultiplier: 1.1, trailColor: '#60a5fa', color: '#60a5fa', glowIntensity: 35, pattern: 'DRAGON', bulletShape: 'DRAGON', dynamicEffect: 'WATERFALL', shape: 'DRAGON' },
      { id: 'lotus_spirit', name: '莲华', tier: 'EPIC', price: 5500, unlocked: false, bulletWidth: 12, hasDualShip: false, defenseBonus: 45, speedMultiplier: 0.9, trailColor: '#93c5fd', color: '#93c5fd', glowIntensity: 30, pattern: 'LOTUS', shape: 'LOTUS_FLOWER', dynamicEffect: 'WATERFALL' },
      { id: 'crystal_core', name: '晶核', tier: 'EPIC', price: 6500, unlocked: false, bulletWidth: 16, hasDualShip: false, defenseBonus: 30, speedMultiplier: 1.1, trailColor: '#2563eb', color: '#2563eb', glowIntensity: 40, dynamicEffect: 'CRYSTAL', pattern: 'GEMSTONE', shape: 'BRAIN_CORE' },
      { id: 'jade_sword', name: '青玉神剑', tier: 'EPIC', price: 5800, unlocked: false, bulletWidth: 12, hasDualShip: false, defenseBonus: 30, speedMultiplier: 1.6, trailColor: '#3b82f6', color: '#3b82f6', glowIntensity: 40, shape: 'SWORD', pattern: 'WATERCOLOR', bulletShape: 'DIAMOND' },

      // --- PURPLE TIER (LEGENDARY) ---
      { id: 'phantom', name: '幽灵之影', tier: 'LEGENDARY', price: 5000, unlocked: false, bulletWidth: 14, hasDualShip: false, defenseBonus: 15, speedMultiplier: 1.5, trailColor: '#a855f7', color: '#a855f7', glowIntensity: 30, pattern: 'CLOUD', bulletShape: 'DIAMOND', shape: 'WARRIOR' },
      { id: 'void_reaper', name: '虚空收割者', tier: 'LEGENDARY', price: 15000, unlocked: false, bulletWidth: 20, hasDualShip: true, defenseBonus: 60, speedMultiplier: 1.3, trailColor: '#d946ef', color: '#d946ef', glowIntensity: 50, pattern: 'DRAGON', dynamicEffect: 'NEON_PULSE', shape: 'BEAST' },
      { id: 'golden_phoenix', name: '金凤凰', tier: 'LEGENDARY', price: 12000, unlocked: false, bulletWidth: 18, hasDualShip: true, defenseBonus: 30, speedMultiplier: 1.4, trailColor: '#c084fc', color: '#c084fc', glowIntensity: 60, pattern: 'PHOENIX', shape: 'PHOENIX', dynamicEffect: 'WATERFALL' },
      { id: 'mystic_crane', name: '玄鹤', tier: 'LEGENDARY', price: 13000, unlocked: false, bulletWidth: 16, hasDualShip: true, defenseBonus: 30, speedMultiplier: 1.5, trailColor: '#e879f9', color: '#e879f9', glowIntensity: 60, shape: 'PHOENIX', pattern: 'PHOENIX', dynamicEffect: 'WATERFALL' },

      // --- RED TIER (MYTHIC - UNIQUE ABILITIES) ---
      { 
        id: 'crimson_ink', 
        name: '血墨丹青', 
        tier: 'MYTHIC', 
        price: 0, 
        unlocked: false, 
        bulletWidth: 30, 
        hasDualShip: true, 
        defenseBonus: 80, 
        speedMultiplier: 1.2, 
        trailColor: '#ef4444', 
        color: '#ef4444', 
        glowIntensity: 100, 
        isLotteryExclusive: true, 
        pattern: 'WATERCOLOR', 
        bulletShape: 'INK_DROP', 
        bulletColor: '#991b1b',
        dynamicEffect: 'WATERCOLOR',
        shape: 'WARRIOR',
        ability: 'CHAIN_SHOT'
      },
      { 
        id: 'dragon_waterfall', 
        name: '龙渊瀑布', 
        tier: 'MYTHIC', 
        price: 0, 
        unlocked: false, 
        bulletWidth: 28, 
        hasDualShip: true, 
        defenseBonus: 90, 
        speedMultiplier: 1.1, 
        trailColor: '#dc2626', 
        color: '#dc2626', 
        glowIntensity: 100, 
        isLotteryExclusive: true, 
        shape: 'DRAGON', 
        pattern: 'WATERFALL', 
        bulletShape: 'DRAGON',
        dynamicEffect: 'WATERFALL',
        ability: 'BOMB'
      },
      { 
        id: 'celestial_bloom', 
        name: '天界繁花', 
        tier: 'MYTHIC', 
        price: 0, 
        unlocked: false, 
        bulletWidth: 25, 
        hasDualShip: true, 
        defenseBonus: 100, 
        speedMultiplier: 1.3, 
        trailColor: '#f43f5e', 
        color: '#f43f5e', 
        glowIntensity: 100, 
        isLotteryExclusive: true, 
        shape: 'LOTUS_FLOWER', 
        pattern: 'PORCELAIN', 
        bulletShape: 'LOTUS_SEED',
        bulletColor: '#fb7185',
        dynamicEffect: 'GLOSS',
        ability: 'SHIELD_REFLECT'
      },
      { 
        id: 'brain_fiend', 
        name: '智械魔君', 
        tier: 'MYTHIC', 
        price: 0, 
        unlocked: false, 
        bulletWidth: 35, 
        hasDualShip: true, 
        defenseBonus: 85, 
        speedMultiplier: 1.2, 
        trailColor: '#ef4444', 
        color: '#ef4444', 
        glowIntensity: 100, 
        isLotteryExclusive: true, 
        pattern: 'DRAGON', 
        bulletShape: 'FIREBALL', 
        bulletColor: '#b91c1c', 
        dynamicEffect: 'FLAME',
        shape: 'BRAIN_CORE',
        ability: 'TIME_SLOW'
      },
      { 
        id: 'asura_king', 
        name: '阿修罗', 
        tier: 'MYTHIC', 
        price: 0, 
        unlocked: false, 
        bulletWidth: 25, 
        hasDualShip: true, 
        defenseBonus: 75, 
        speedMultiplier: 1.1, 
        trailColor: '#991B1B', 
        color: '#991B1B', 
        glowIntensity: 85, 
        isLotteryExclusive: true, 
        pattern: 'DRAGON', 
        bulletShape: 'DIAMOND', 
        bulletColor: '#EF4444', 
        dynamicEffect: 'NEON_PULSE',
        shape: 'BEAST',
        ability: 'PHANTOM'
      },
      { 
        id: 'bullet_strike', 
        name: '穿甲弹头', 
        tier: 'MYTHIC', 
        price: 0, 
        unlocked: false, 
        bulletWidth: 20, 
        hasDualShip: false, 
        defenseBonus: 60, 
        speedMultiplier: 1.5, 
        trailColor: '#94a3b8', 
        color: '#64748b', 
        glowIntensity: 70, 
        isLotteryExclusive: true, 
        pattern: 'GEMSTONE', 
        bulletShape: 'RECT', 
        bulletColor: '#facc15', 
        dynamicEffect: 'GLOSS',
        shape: 'BULLET_SHIP',
        ability: 'TARGETED_STRIKE'
      },
      { 
        id: 'ancient_wind', 
        name: '古风青岚', 
        tier: 'MYTHIC', 
        price: 0, 
        unlocked: false, 
        bulletWidth: 22, 
        hasDualShip: true, 
        defenseBonus: 70, 
        speedMultiplier: 1.4, 
        trailColor: '#10b981', 
        color: '#059669', 
        glowIntensity: 90, 
        isLotteryExclusive: true, 
        pattern: 'CLOUD', 
        bulletShape: 'WIND_GUST', 
        bulletColor: '#34d399', 
        dynamicEffect: 'WATERCOLOR',
        shape: 'WIND_SPIRIT',
        ability: 'PHANTOM'
      },
      { 
        id: 'obsidian_mirror', 
        name: '黑曜之镜', 
        tier: 'MYTHIC', 
        price: 0, 
        unlocked: false, 
        bulletWidth: 24, 
        hasDualShip: true, 
        defenseBonus: 95, 
        speedMultiplier: 1.25, 
        trailColor: '#1e293b', 
        color: '#0f172a', 
        glowIntensity: 100, 
        isLotteryExclusive: true, 
        pattern: 'GEMSTONE', 
        bulletShape: 'DIAMOND', 
        bulletColor: '#334155', 
        dynamicEffect: 'CRYSTAL',
        shape: 'SWORD',
        ability: 'SHIELD_REFLECT'
      },
      // --- NEW 15 SKINS ---
      { id: 'wind_god', name: '风神', tier: 'MYTHIC', price: 0, unlocked: false, bulletWidth: 22, hasDualShip: true, defenseBonus: 70, speedMultiplier: 1.8, trailColor: '#10b981', color: '#10b981', glowIntensity: 100, isLotteryExclusive: true, pattern: 'CLOUD', dynamicEffect: 'STORM', shape: 'WIND_SPIRIT', ability: 'PHANTOM' },
      { id: 'solar_flare', name: '太阳耀斑', tier: 'LEGENDARY', price: 18000, unlocked: false, bulletWidth: 18, hasDualShip: false, defenseBonus: 40, speedMultiplier: 1.3, trailColor: '#f59e0b', color: '#f59e0b', glowIntensity: 80, pattern: 'GEMSTONE', dynamicEffect: 'FLAME', shape: 'PHOENIX' },
      { id: 'lunar_shadow', name: '月影', tier: 'LEGENDARY', price: 17000, unlocked: false, bulletWidth: 16, hasDualShip: false, defenseBonus: 50, speedMultiplier: 1.4, trailColor: '#94a3b8', color: '#94a3b8', glowIntensity: 70, pattern: 'CLOUD', dynamicEffect: 'GLOSS', shape: 'WARRIOR' },
      { id: 'star_dust', name: '星尘', tier: 'RARE', price: 2500, unlocked: false, bulletWidth: 12, hasDualShip: false, defenseBonus: 20, speedMultiplier: 1.2, trailColor: '#cbd5e1', color: '#cbd5e1', glowIntensity: 30, pattern: 'NONE', shape: 'DEFAULT' },
      { id: 'nebula_knight', name: '星云骑士', tier: 'EPIC', price: 7500, unlocked: false, bulletWidth: 14, hasDualShip: false, defenseBonus: 35, speedMultiplier: 1.3, trailColor: '#8b5cf6', color: '#8b5cf6', glowIntensity: 50, pattern: 'GEMSTONE', shape: 'SWORD' },
      { id: 'void_walker', name: '虚空行者', tier: 'EPIC', price: 8000, unlocked: false, bulletWidth: 15, hasDualShip: false, defenseBonus: 40, speedMultiplier: 1.4, trailColor: '#6366f1', color: '#6366f1', glowIntensity: 55, pattern: 'CLOUD', shape: 'WARRIOR' },
      { id: 'crystal_guardian', name: '水晶卫士', tier: 'RARE', price: 3500, unlocked: false, bulletWidth: 12, hasDualShip: false, defenseBonus: 45, speedMultiplier: 1.0, trailColor: '#38bdf8', color: '#38bdf8', glowIntensity: 40, pattern: 'GEMSTONE', shape: 'DEFAULT' },
      { id: 'inferno', name: '地狱火', tier: 'LEGENDARY', price: 19000, unlocked: false, bulletWidth: 20, hasDualShip: false, defenseBonus: 30, speedMultiplier: 1.5, trailColor: '#ef4444', color: '#ef4444', glowIntensity: 90, pattern: 'NONE', dynamicEffect: 'FLAME', shape: 'BEAST' },
      { id: 'frost_bite', name: '霜咬', tier: 'RARE', price: 4000, unlocked: false, bulletWidth: 13, hasDualShip: false, defenseBonus: 35, speedMultiplier: 1.1, trailColor: '#0ea5e9', color: '#0ea5e9', glowIntensity: 35, pattern: 'GEMSTONE', shape: 'DEFAULT' },
      { id: 'thunder_bolt', name: '雷霆', tier: 'EPIC', price: 9000, unlocked: false, bulletWidth: 16, hasDualShip: false, defenseBonus: 25, speedMultiplier: 1.6, trailColor: '#facc15', color: '#facc15', glowIntensity: 60, pattern: 'GEMSTONE', shape: 'SWORD' },
      { id: 'gaia', name: '盖亚', tier: 'RARE', price: 4500, unlocked: false, bulletWidth: 14, hasDualShip: false, defenseBonus: 50, speedMultiplier: 0.9, trailColor: '#10b981', color: '#10b981', glowIntensity: 30, pattern: 'LOTUS', shape: 'DEFAULT' },
      { id: 'aether', name: '以太', tier: 'EPIC', price: 10000, unlocked: false, bulletWidth: 15, hasDualShip: true, defenseBonus: 30, speedMultiplier: 1.3, trailColor: '#d946ef', color: '#d946ef', glowIntensity: 65, pattern: 'PHOENIX', shape: 'PHOENIX' },
      { id: 'chrono', name: '时空', tier: 'LEGENDARY', price: 20000, unlocked: false, bulletWidth: 18, hasDualShip: false, defenseBonus: 45, speedMultiplier: 1.4, trailColor: '#6366f1', color: '#6366f1', glowIntensity: 85, pattern: 'GEMSTONE', dynamicEffect: 'NEON_PULSE', shape: 'BRAIN_CORE' },
      { id: 'zenith', name: '天顶', tier: 'EPIC', price: 11000, unlocked: false, bulletWidth: 16, hasDualShip: false, defenseBonus: 40, speedMultiplier: 1.5, trailColor: '#f43f5e', color: '#f43f5e', glowIntensity: 70, pattern: 'PHOENIX', shape: 'PHOENIX' },
      { id: 'eclipse', name: '日食', tier: 'LEGENDARY', price: 21000, unlocked: false, bulletWidth: 19, hasDualShip: true, defenseBonus: 55, speedMultiplier: 1.2, trailColor: '#475569', color: '#475569', glowIntensity: 95, pattern: 'GEMSTONE', dynamicEffect: 'GLOSS', shape: 'WARRIOR' },
    ];
    
    // Sanity check for duplicate IDs
    const seen = new Set();
    const uniqueSkins = defaultSkins.filter(s => {
      if (seen.has(s.id)) return false;
      seen.add(s.id);
      return true;
    });

    const saved = localStorage.getItem('tina_unlocked_skins');
    if (saved) {
      const unlockedIds = JSON.parse(saved);
      return uniqueSkins.map(s => ({ ...s, unlocked: unlockedIds.includes(s.id) || s.id === 'default' }));
    }
    return uniqueSkins.map(s => ({ ...s, unlocked: s.id === 'default' }));
  });

  const [activeSkinId, setActiveSkinId] = useState(() => {
    const saved = localStorage.getItem('tina_active_skin');
    return saved || 'default';
  });

  const [difficulty, setDifficulty] = useState<Difficulty>('NORMAL');
  const [currentRealm, setCurrentRealm] = useState<Realm>('HELL');
  const [bgType, setBgType] = useState<BackgroundSkin['type']>(() => {
    const saved = localStorage.getItem('tina_active_bg');
    return (saved as BackgroundSkin['type']) || 'SPACE';
  });
  const [activeButtonSkin, setActiveButtonSkin] = useState<ButtonSkin['style']>(() => {
    const saved = localStorage.getItem('tina_active_button');
    return (saved as ButtonSkin['style']) || 'DEFAULT';
  });
  const [zoomedSkin, setZoomedSkin] = useState<Skin | null>(null);

  const [backgrounds, setBackgrounds] = useState<BackgroundSkin[]>(() => {
    const defaults: BackgroundSkin[] = [
      { id: 'bg_space', name: '深空', type: 'SPACE', price: 0, unlocked: true },
      { id: 'bg_nebula', name: '星云', type: 'NEBULA', price: 500, unlocked: false },
      { id: 'bg_galaxy', name: '银河', type: 'GALAXY', price: 1500, unlocked: false },
      { id: 'bg_traditional', name: '古风', type: 'TRADITIONAL', price: 3000, unlocked: false },
      { id: 'bg_crystal', name: '水晶之境', type: 'CRYSTAL', price: 8000, unlocked: false },
      { id: 'bg_void_storm', name: '虚空风暴', type: 'VOID_STORM', price: 15000, unlocked: false },
      { id: 'bg_waterfall', name: '九天瀑布', type: 'WATERFALL', price: 20000, unlocked: false },
    ];
    const saved = localStorage.getItem('tina_unlocked_backgrounds');
    if (saved) {
      const ids = JSON.parse(saved);
      return defaults.map(b => ({ ...b, unlocked: ids.includes(b.id) || b.price === 0 }));
    }
    return defaults;
  });

  const [buttonSkins, setButtonSkins] = useState<ButtonSkin[]>(() => {
    const defaults: ButtonSkin[] = [
      { id: 'btn_default', name: '标准', style: 'DEFAULT', price: 0, unlocked: true },
      { id: 'btn_glass', name: '磨砂玻璃', style: 'GLASS', price: 1000, unlocked: false },
      { id: 'btn_crystal', name: '璀璨水晶', style: 'CRYSTAL', price: 3000, unlocked: false },
      { id: 'btn_neon', name: '赛博霓虹', style: 'NEON', price: 5000, unlocked: false },
      { id: 'btn_ink', name: '水墨丹青', style: 'INK', price: 7000, unlocked: false },
    ];
    const saved = localStorage.getItem('tina_unlocked_buttons');
    if (saved) {
      const ids = JSON.parse(saved);
      return defaults.map(b => ({ ...b, unlocked: ids.includes(b.id) || b.price === 0 }));
    }
    return defaults;
  });

  const [shopTab, setShopTab] = useState<'SKINS' | 'BACKGROUNDS' | 'BUTTONS'>('SKINS');

  const activeSkin = skins.find(s => s.id === activeSkinId) || skins[0];

  useEffect(() => {
    localStorage.setItem('tina_credits', credits.toString());
    localStorage.setItem('tina_tickets', tickets.toString());
    localStorage.setItem('tina_active_bg', bgType);
    localStorage.setItem('tina_active_button', activeButtonSkin);
  }, [credits, tickets, bgType, activeButtonSkin]);

  useEffect(() => {
    const unlockedIds = skins.filter(s => s.unlocked).map(s => s.id);
    localStorage.setItem('tina_unlocked_skins', JSON.stringify(unlockedIds));
    
    const unlockedBgs = backgrounds.filter(b => b.unlocked).map(b => b.id);
    localStorage.setItem('tina_unlocked_backgrounds', JSON.stringify(unlockedBgs));

    const unlockedButtons = buttonSkins.filter(b => b.unlocked).map(b => b.id);
    localStorage.setItem('tina_unlocked_buttons', JSON.stringify(unlockedButtons));
  }, [skins, backgrounds, buttonSkins]);

  useEffect(() => {
    localStorage.setItem('tina_active_skin', activeSkinId);
    if (playerRef.current) {
      playerRef.current.skinId = activeSkinId;
      const skin = skins.find(s => s.id === activeSkinId);
      if (skin) {
        playerRef.current.defense = skin.defenseBonus;
      }
    }
  }, [activeSkinId, skins]);

  const getButtonStyle = (baseClass: string) => {
    switch (activeButtonSkin) {
      case 'GLASS':
        return `${baseClass} bg-white/10 backdrop-blur-md border border-white/20 shadow-xl hover:bg-white/20 transition-all`;
      case 'CRYSTAL':
        return `${baseClass} bg-gradient-to-br from-blue-400/30 to-purple-500/30 backdrop-blur-lg border border-white/40 shadow-[0_0_20px_rgba(255,255,255,0.2)] hover:scale-105 transition-all`;
      case 'NEON':
        return `${baseClass} bg-black border-2 border-cyan-500 shadow-[0_0_15px_rgba(6,182,212,0.5)] text-cyan-400 hover:shadow-[0_0_25px_rgba(6,182,212,0.8)] transition-all`;
      case 'INK':
        return `${baseClass} bg-slate-100 text-slate-900 border-2 border-slate-900 shadow-lg hover:bg-slate-200 transition-all font-serif`;
      default:
        return baseClass;
    }
  };

  const [achievements, setAchievements] = useState<Achievement[]>([
    { id: 'first_blood', title: '第一滴血', description: '击毁第一架敌机', unlocked: false, icon: <Target className="w-5 h-5" /> },
    { id: 'survivor', title: '生存者', description: '达到第3关', unlocked: false, icon: <Shield className="w-5 h-5" /> },
    { id: 'power_hungry', title: '火力全开', description: '拾取三向子弹道具', unlocked: false, icon: <Zap className="w-5 h-5" /> },
    { id: 'shield_master', title: '护盾大师', description: '使用能量护盾抵挡攻击', unlocked: false, icon: <Shield className="w-5 h-5" /> },
    { id: 'ace_pilot', title: '王牌飞行员', description: '分数突破5000分', unlocked: false, icon: <Trophy className="w-5 h-5" /> },
    { id: 'defense_expert', title: '铁壁防御', description: '防御等级达到80', unlocked: false, icon: <Shield className="w-5 h-5" /> },
  ]);
  const [lastAchievement, setLastAchievement] = useState<Achievement | null>(null);
  const [showLevelUp, setShowLevelUp] = useState(false);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const requestRef = useRef<number>(null);
  const frameCountRef = useRef(0);
  
  // Game Objects
  const playerRef = useRef<Player>({
    x: CANVAS_WIDTH / 2,
    y: CANVAS_HEIGHT - 100,
    width: 50,
    height: 50,
    lives: 3,
    hp: 100,
    maxHp: 100,
    score: 0,
    level: 1,
    defense: activeSkin.defenseBonus,
    isInvincible: false,
    invincibleUntil: 0,
    powerUp: 'NONE',
    powerUpUntil: 0,
    hasShield: false,
    skinId: activeSkinId,
  });

  const bulletsRef = useRef<Bullet[]>([]);
  const bombsRef = useRef<Bomb[]>([]);
  const enemiesRef = useRef<Enemy[]>([]);
  const powerUpsRef = useRef<PowerUp[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const keysRef = useRef<Set<string>>(new Set());
  const starsRef = useRef<{x: number, y: number, size: number, speed: number, color: string}[]>([]);
  const nebulaRef = useRef<{x: number, y: number, r: number, color: string}[]>([]);

  // Initialize Hellscape Background
  useEffect(() => {
    const stars = [];
    for (let i = 0; i < 200; i++) {
      stars.push({
        x: Math.random() * CANVAS_WIDTH,
        y: Math.random() * CANVAS_HEIGHT,
        size: Math.random() * 2.5,
        speed: Math.random() * 1.5 + 0.5,
        color: Math.random() > 0.8 ? '#f87171' : (Math.random() > 0.8 ? '#fb923c' : '#450a0a')
      });
    }
    starsRef.current = stars;

    const nebulae = [];
    const colors = ['rgba(127, 29, 29, 0.2)', 'rgba(69, 10, 10, 0.3)', 'rgba(0, 0, 0, 0.4)'];
    for (let i = 0; i < 8; i++) {
      nebulae.push({
        x: Math.random() * CANVAS_WIDTH,
        y: Math.random() * CANVAS_HEIGHT,
        r: Math.random() * 400 + 200,
        color: colors[i % colors.length]
      });
    }
    nebulaRef.current = nebulae;
  }, []);

  const [showWarning, setShowWarning] = useState(false);

  const triggerWarning = () => {
    setShowWarning(true);
    setTimeout(() => setShowWarning(false), 1000);
  };

  const unlockAchievement = useCallback((id: string) => {
    setAchievements(prev => {
      const achievement = prev.find(a => a.id === id);
      if (achievement && !achievement.unlocked) {
        const updated = prev.map(a => a.id === id ? { ...a, unlocked: true } : a);
        setLastAchievement({ ...achievement, unlocked: true });
        setTimeout(() => setLastAchievement(null), 3000);
        return updated;
      }
      return prev;
    });
  }, []);

  const [isShaking, setIsShaking] = useState(false);

  const triggerShake = () => {
    setIsShaking(true);
    setTimeout(() => setIsShaking(false), 500);
  };

  const createExplosion = (x: number, y: number, color: string, count = 15) => {
    for (let i = 0; i < count; i++) {
      particlesRef.current.push({
        x,
        y,
        vx: (Math.random() - 0.5) * 10,
        vy: (Math.random() - 0.5) * 10,
        life: 1.0,
        color,
        size: Math.random() * 4 + 2
      });
    }
  };

  const spawnEnemy = useCallback(() => {
    const types: Enemy['type'][] = ['BASIC', 'FAST', 'HEAVY', 'SNIPER', 'TANK', 'ELITE'];
    const type = types[Math.floor(Math.random() * Math.min(level, 6))];
    
    // Difficulty Scaling
    let speedMultiplier = 1;
    switch (difficulty) {
      case 'EASY': speedMultiplier = 0.7; break;
      case 'NORMAL': speedMultiplier = 1.0; break;
      case 'ADVANCED': speedMultiplier = 1.3; break;
      case 'EXPERT': speedMultiplier = 1.6; break;
      case 'HARD': speedMultiplier = 2.0; break;
    }
    
    let hp = 1;
    // Difficulty: Focus on HP rather than speed
    if (difficulty === 'NORMAL') hp = Math.floor(level / 5) + 1;
    if (difficulty === 'ADVANCED') hp = Math.floor(level / 4) + 3;
    if (difficulty === 'EXPERT') hp = Math.floor(level / 3) + 6;
    if (difficulty === 'HARD') hp = Math.floor(level / 2) + 10;

    // Realm Difficulty Scaling
    const realmMultiplier = currentRealm === 'VOID' ? 1.2 : (currentRealm === 'ABYSS' ? 1.4 : 1);
    let speed = (ENEMY_BASE_SPEED + (level * 0.1)) * speedMultiplier * realmMultiplier;

    if (type === 'HEAVY') { hp *= 3; speed *= 0.6; }
    if (type === 'TANK') { hp *= 8; speed *= 0.4; }
    if (type === 'ELITE') { hp *= 5; speed *= 0.8; }
    
    let color = '#ef4444';
    if (currentRealm === 'VOID') color = '#2dd4bf';
    if (currentRealm === 'ABYSS') color = '#f472b6';
    let width = 45;
    let height = 45;

    if (type === 'FAST') {
      speed *= 1.3;
      color = '#f59e0b';
      width = 35;
      height = 35;
    } else if (type === 'HEAVY') {
      hp = 3;
      speed *= 0.7;
      color = '#a855f7';
      width = 65;
      height = 65;
    } else if (type === 'SNIPER') {
      hp = 2;
      speed *= 0.6;
      color = '#10b981';
      width = 50;
      height = 50;
    }

    const spawnX = Math.random() * (CANVAS_WIDTH - width);
    enemiesRef.current.push({
      id: Math.random().toString(36).substr(2, 9),
      x: spawnX,
      y: -height,
      width,
      height,
      type,
      hp,
      maxHp: hp,
      speed,
      color,
      lastShot: Date.now()
    });
  }, [level, difficulty, currentRealm]);

  const spawnPowerUp = (x: number, y: number) => {
    const rand = Math.random();
    if (rand > 0.75) {
      const types: PowerUp['type'][] = ['TRIPLE', 'SHIELD', 'TREASURE', 'RAPID', 'ARMOR'];
      powerUpsRef.current.push({
        x,
        y,
        width: 30,
        height: 30,
        type: types[Math.floor(Math.random() * types.length)]
      });
    }
  };

  const resetGame = () => {
    playerRef.current = {
      x: CANVAS_WIDTH / 2,
      y: CANVAS_HEIGHT - 100,
      width: 50,
      height: 50,
      lives: 3,
      score: 0,
      level: 1,
      defense: activeSkin.defenseBonus,
      isInvincible: false,
      invincibleUntil: 0,
      powerUp: 'NONE',
      powerUpUntil: 0,
      hasShield: false,
      skinId: activeSkinId,
    };
    bulletsRef.current = [];
    bombsRef.current = [];
    enemiesRef.current = [];
    powerUpsRef.current = [];
    particlesRef.current = [];
    setScore(0);
    setLives(3);
    setLevel(1);
    setGameState('PLAYING');
  };

  // Handle Credits conversion on Game Over
  useEffect(() => {
    if (gameState === 'GAMEOVER') {
      const earnedCredits = Math.floor(playerRef.current.score / 10);
      if (earnedCredits > 0) {
        setCredits(prev => prev + earnedCredits);
      }
    }
  }, [gameState]);

  const update = useCallback(() => {
    if (gameState !== 'PLAYING') return;

    const player = playerRef.current;
    const now = Date.now();
    const currentSpeed = PLAYER_SPEED * activeSkin.speedMultiplier;
    let targetTilt = 0;

    // Handle Input
    if (keysRef.current.has('ArrowLeft') || keysRef.current.has('a')) {
      player.x -= currentSpeed;
      targetTilt = -0.3;
    }
    if (keysRef.current.has('ArrowRight') || keysRef.current.has('d')) {
      player.x += currentSpeed;
      targetTilt = 0.3;
    }
    if (keysRef.current.has('ArrowUp') || keysRef.current.has('w')) player.y -= currentSpeed;
    if (keysRef.current.has('ArrowDown') || keysRef.current.has('s')) player.y += currentSpeed;

    // Smooth Tilt
    player.tilt += (targetTilt - player.tilt) * 0.1;

    // Boundary Check
    player.x = Math.max(0, Math.min(CANVAS_WIDTH - player.width, player.x));
    player.y = Math.max(0, Math.min(CANVAS_HEIGHT - player.height, player.y));

    // Trail Effect (Movement Effect)
    if (frameCountRef.current % 2 === 0) {
      particlesRef.current.push({
        x: player.x + player.width / 2,
        y: player.y + player.height,
        vx: (Math.random() - 0.5) * 2,
        vy: 2,
        life: 0.5,
        color: activeSkin.trailColor,
        size: Math.random() * 3 + 1
      });
    }

    // Shooting
    const shootInterval = player.powerUp === 'RAPID' ? 5 : 10;
    if (keysRef.current.has(' ') && frameCountRef.current % shootInterval === 0) {
      const bWidth = activeSkin.bulletWidth;
      
      const fire = (x: number, y: number, vx: number, vy: number) => {
        bulletsRef.current.push({ x, y, vx, vy, isPlayer: true, width: bWidth });
      };

      fire(player.x + player.width / 2, player.y, 0, -BULLET_SPEED);
      
      if (player.powerUp === 'TRIPLE' && now < player.powerUpUntil) {
        fire(player.x + player.width / 2, player.y, -2, -BULLET_SPEED);
        fire(player.x + player.width / 2, player.y, 2, -BULLET_SPEED);
      }

      if (activeSkin.hasDualShip) {
        // Second Ship offset
        fire(player.x + player.width / 2 + 40, player.y + 20, 0, -BULLET_SPEED);
        if (player.powerUp === 'TRIPLE' && now < player.powerUpUntil) {
          fire(player.x + player.width / 2 + 40, player.y + 20, -2, -BULLET_SPEED);
          fire(player.x + player.width / 2 + 40, player.y + 20, 2, -BULLET_SPEED);
        }
      }
    }

    // Bomb Launching (Key 'b' or 'Space' if not shooting)
    if (keysRef.current.has('b') && frameCountRef.current % 60 === 0) {
      bombsRef.current.push({
        x: player.x + player.width / 2,
        y: player.y,
        vx: 0,
        vy: -5,
        targetId: null,
        life: 1.0
      });
    }

    // Update Stars
    starsRef.current.forEach(star => {
      star.y += star.speed;
      if (star.y > CANVAS_HEIGHT) star.y = 0;
    });

    // Update Bombs
    bombsRef.current = bombsRef.current.filter(b => {
      // Find closest enemy
      let closestEnemy: any = null;
      let minDist = 300; // Tracking range

      enemiesRef.current.forEach(e => {
        const dist = Math.sqrt((e.x - b.x)**2 + (e.y - b.y)**2);
        if (dist < minDist) {
          minDist = dist;
          closestEnemy = e;
        }
      });

      if (closestEnemy) {
        const angle = Math.atan2(closestEnemy.y - b.y, closestEnemy.x - b.x);
        b.vx += Math.cos(angle) * 0.5;
        b.vy += Math.sin(angle) * 0.5;
        
        // Cap speed
        const speed = Math.sqrt(b.vx**2 + b.vy**2);
        if (speed > 8) {
          b.vx = (b.vx / speed) * 8;
          b.vy = (b.vy / speed) * 8;
        }

        // Instant Kill on contact (within 20 units as requested)
        if (minDist < 20) {
          closestEnemy.hp = 0; // Instant kill
          createExplosion(b.x, b.y, '#facc15', 60);
          return false;
        }
      }

      b.x += b.vx;
      b.y += b.vy;
      
      // Particle trail
      if (frameCountRef.current % 3 === 0) {
        particlesRef.current.push({
          x: b.x,
          y: b.y,
          vx: (Math.random() - 0.5) * 2,
          vy: (Math.random() - 0.5) * 2,
          life: 0.3,
          color: '#facc15',
          size: 4
        });
      }

      return b.y > 0 && b.y < CANVAS_HEIGHT && b.x > 0 && b.x < CANVAS_WIDTH;
    });

    // Update Bullets
    bulletsRef.current = bulletsRef.current.filter(b => {
      b.x += b.vx;
      b.y += b.vy;

      // Player Collision with Enemy Bullets
      if (!b.isPlayer && !player.isInvincible &&
          b.x > player.x && b.x < player.x + player.width &&
          b.y > player.y && b.y < player.y + player.height) {
        
        // Phantom Ability: 30% chance to dodge
        if (activeSkin.ability === 'PHANTOM' && Math.random() < 0.3) {
          createExplosion(b.x, b.y, '#fff', 5);
          return false;
        }

        // Shield Reflect Ability
        if (activeSkin.ability === 'SHIELD_REFLECT' && player.hasShield) {
          b.isPlayer = true;
          b.vy = -BULLET_SPEED;
          b.vx = (Math.random() - 0.5) * 4;
          createExplosion(b.x, b.y, '#60a5fa', 10);
          return true;
        }

        // Defense Deflection Chance (Max 40% chance at 100 defense)
        if (Math.random() < player.defense / 250) {
          createExplosion(b.x, b.y, '#fff', 5);
          return false;
        }

        if (player.hasShield) {
          player.hasShield = false;
          createExplosion(player.x + player.width / 2, player.y + player.height / 2, '#60a5fa', 30);
        } else {
          // Attack power based on difficulty
          let damage = 5;
          switch (difficulty) {
            case 'EASY': damage = 2; break;
            case 'NORMAL': damage = 5; break;
            case 'ADVANCED': damage = 10; break;
            case 'EXPERT': damage = 15; break;
            case 'HARD': damage = 25; break;
          }
          player.hp -= damage;
          setLives(Math.max(0, Math.ceil(player.hp / 33.3))); // Keep lives as a visual indicator or remove
          player.isInvincible = true;
          player.invincibleUntil = now + INVINCIBILITY_DURATION;
          createExplosion(player.x + player.width / 2, player.y + player.height / 2, '#ef4444', 30);
          triggerShake();
          if (player.hp <= 0) {
            setGameState('GAMEOVER');
            
            // Hard Mode Rewards
            if (difficulty === 'HARD' && level >= 30) {
              let earnedTickets = 2; // Base for 30 rounds
              earnedTickets += Math.floor((level - 30) / 10) * 2; // 2 more every 10 levels
              setTickets(prev => prev + earnedTickets);
            }
          }
        }
        return false;
      }
      // Bullet Collision with Enemies
      if (b.isPlayer) {
        const hitEnemy = enemiesRef.current.find(e => 
          b.x > e.x && b.x < e.x + e.width &&
          b.y > e.y && b.y < e.y + e.height
        );

        if (hitEnemy) {
          hitEnemy.hp--;
          
          // Bomb Ability: Area Damage
          if (activeSkin.ability === 'BOMB') {
            createExplosion(b.x, b.y, activeSkin.color, 50);
            enemiesRef.current.forEach(e => {
              const dist = Math.sqrt((e.x - b.x)**2 + (e.y - b.y)**2);
              if (dist < 100) e.hp -= 2;
            });
          }

          // Chain Shot Ability
          if (activeSkin.ability === 'CHAIN_SHOT' && Math.random() < 0.5) {
            const nextEnemy = enemiesRef.current.find(e => e.id !== hitEnemy.id && e.y > 0);
            if (nextEnemy) {
              b.vx = (nextEnemy.x - b.x) / 10;
              b.vy = (nextEnemy.y - b.y) / 10;
              return true;
            }
          }

          if (hitEnemy.hp <= 0) {
            // Enemy death logic already handled in filter below
          }
          return false;
        }
      }

      return b.y > 0 && b.y < CANVAS_HEIGHT && b.x > 0 && b.x < CANVAS_WIDTH;
    });

    // Update Enemies
    if (frameCountRef.current % Math.max(20, 60 - level * 4) === 0) {
      spawnEnemy();
    }

    const enemySpeedMultiplier = activeSkin.ability === 'TIME_SLOW' ? 0.5 : 1.0;

    enemiesRef.current = enemiesRef.current.filter(e => {
      e.y += e.speed * enemySpeedMultiplier;
      
      // Enemy Shooting
      if (e.type === 'SNIPER' && now - e.lastShot > 2000) {
        bulletsRef.current.push({ x: e.x + e.width / 2, y: e.y + e.height, vx: 0, vy: 5, isPlayer: false, width: 4 });
        e.lastShot = now;
      } else if (e.type === 'HEAVY' && now - e.lastShot > 3000) {
        bulletsRef.current.push({ x: e.x + e.width / 2, y: e.y + e.height, vx: -1, vy: 4, isPlayer: false, width: 4 });
        bulletsRef.current.push({ x: e.x + e.width / 2, y: e.y + e.height, vx: 1, vy: 4, isPlayer: false, width: 4 });
        e.lastShot = now;
      }

      // Collision with Player
      if (!player.isInvincible && 
          e.x < player.x + player.width &&
          e.x + e.width > player.x &&
          e.y < player.y + player.height &&
          e.y + e.height > player.y) {
        
        // Defense Deflection Chance
        if (Math.random() < player.defense / 250) {
          createExplosion(e.x + e.width / 2, e.y + e.height / 2, e.color, 20);
          return false;
        }

        if (player.hasShield) {
          player.hasShield = false;
          unlockAchievement('shield_master');
          createExplosion(player.x + player.width / 2, player.y + player.height / 2, '#60a5fa', 30);
        } else {
          let damage = 10;
          switch (difficulty) {
            case 'EASY': damage = 5; break;
            case 'NORMAL': damage = 10; break;
            case 'ADVANCED': damage = 20; break;
            case 'EXPERT': damage = 35; break;
            case 'HARD': damage = 50; break;
          }
          player.hp -= damage;
          setLives(Math.max(0, Math.ceil(player.hp / 33.3)));
          player.isInvincible = true;
          player.invincibleUntil = now + INVINCIBILITY_DURATION;
          createExplosion(player.x + player.width / 2, player.y + player.height / 2, '#ef4444', 30);
          triggerShake();
          
          if (player.hp <= 0) {
            setGameState('GAMEOVER');
          }
        }
        return false;
      }

      // Escaped
      if (e.y > CANVAS_HEIGHT) {
        player.score = Math.max(0, player.score - 50);
        setScore(player.score);
        triggerWarning();
        return false;
      }
      return true;
    });

    // Update PowerUps
    powerUpsRef.current = powerUpsRef.current.filter(p => {
      p.y += 2;
      if (p.x < player.x + player.width &&
          p.x + p.width > player.x &&
          p.y < player.y + player.height &&
          p.y + p.height > player.y) {
        
        if (p.type === 'TRIPLE') {
          player.powerUp = 'TRIPLE';
          player.powerUpUntil = now + 10000;
        } else if (p.type === 'RAPID') {
          player.powerUp = 'RAPID';
          player.powerUpUntil = now + 8000;
        } else if (p.type === 'SHIELD') {
          player.hasShield = true;
        } else if (p.type === 'ARMOR') {
          player.defense = Math.min(100, player.defense + 10);
          if (player.defense >= 80) unlockAchievement('defense_expert');
          createExplosion(p.x, p.y, '#94a3b8', 15);
        } else if (p.type === 'TREASURE') {
          setCredits(prev => prev + 100);
          createExplosion(p.x, p.y, '#fbbf24', 20);
        }
        return false;
      }
      return p.y < CANVAS_HEIGHT;
    });

    // Bullet-Enemy Collision
    bulletsRef.current = bulletsRef.current.filter(b => {
      if (!b.isPlayer) return true;
      let hit = false;
      enemiesRef.current.forEach(e => {
        if (!hit && 
            b.x > e.x && b.x < e.x + e.width &&
            b.y > e.y && b.y < e.y + e.height) {
          e.hp--;
          hit = true;
          if (e.hp <= 0) {
            player.score += e.type === 'HEAVY' ? 300 : (e.type === 'FAST' ? 200 : 100);
            setScore(player.score);
            createExplosion(e.x + e.width / 2, e.y + e.height / 2, e.color);
            spawnPowerUp(e.x, e.y);
            unlockAchievement('first_blood');
            if (player.score >= 5000) unlockAchievement('ace_pilot');
            
            // Level Up
            if (player.score >= level * LEVEL_UP_SCORE) {
              setLevel(prev => {
                const next = prev + 1;
                if (next === 3) unlockAchievement('survivor');
                setShowLevelUp(true);
                setTimeout(() => setShowLevelUp(false), 2000);
                enemiesRef.current = []; // Clear screen
                // Gradual defense increase on level up
                player.defense = Math.min(100, player.defense + 5);

                // Realm Transitions
                if (next === 5) setCurrentRealm('VOID');
                if (next === 10) setCurrentRealm('ABYSS');

                // Lottery Ticket Award - HARD mode rewards
                if (difficulty === 'HARD') {
                  if (next >= 15) {
                    setTickets(prev => prev + 1);
                  }
                }

                return next;
              });
            }
          }
        }
      });
      return !hit;
    });

    // Update Particles
    particlesRef.current = particlesRef.current.filter(p => {
      p.x += p.vx;
      p.y += p.vy;
      p.life -= 0.02;
      return p.life > 0;
    });

    // Invincibility Flash
    if (player.isInvincible && now > player.invincibleUntil) {
      player.isInvincible = false;
    }

    frameCountRef.current++;
  }, [gameState, level, spawnEnemy, unlockAchievement, activeSkin]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    if (isShaking) {
      ctx.translate(Math.random() * 10 - 5, Math.random() * 10 - 5);
    }

    ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

    // Background based on bgType
    if (bgType === 'SPACE') {
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    } else if (bgType === 'NEBULA') {
      const grad = ctx.createRadialGradient(CANVAS_WIDTH/2, CANVAS_HEIGHT/2, 0, CANVAS_WIDTH/2, CANVAS_HEIGHT/2, CANVAS_WIDTH);
      grad.addColorStop(0, '#1e1b4b');
      grad.addColorStop(1, '#020617');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    } else if (bgType === 'GALAXY') {
      const grad = ctx.createLinearGradient(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      grad.addColorStop(0, '#0f172a');
      grad.addColorStop(0.5, '#1e293b');
      grad.addColorStop(1, '#0f172a');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
    } else if (bgType === 'TRADITIONAL') {
      // Elegant Parchment with subtle texture
      ctx.fillStyle = '#fdf6e3';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      
      // Artistic Ink Wash Mountains
      const drawMountain = (height: number, opacity: number, seed: number) => {
        ctx.fillStyle = `rgba(0, 0, 0, ${opacity})`;
        ctx.beginPath();
        ctx.moveTo(0, CANVAS_HEIGHT);
        for (let x = 0; x <= CANVAS_WIDTH; x += 20) {
          const y = CANVAS_HEIGHT - height - Math.sin(x * 0.01 + seed) * 50 - Math.cos(x * 0.02) * 20;
          ctx.lineTo(x, y);
        }
        ctx.lineTo(CANVAS_WIDTH, CANVAS_HEIGHT);
        ctx.fill();
      };
      drawMountain(300, 0.03, 1);
      drawMountain(200, 0.05, 5);
      drawMountain(100, 0.08, 10);

      // Refined Bamboo with leaves
      ctx.strokeStyle = 'rgba(20, 40, 20, 0.15)';
      ctx.fillStyle = 'rgba(20, 40, 20, 0.1)';
      for (let i = 0; i < 4; i++) {
        const bx = 80 + i * 180;
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(bx, CANVAS_HEIGHT);
        ctx.quadraticCurveTo(bx - 20, CANVAS_HEIGHT - 200, bx - 10, CANVAS_HEIGHT - 450);
        ctx.stroke();
        // Leaves
        for (let j = 0; j < 10; j++) {
          const ly = CANVAS_HEIGHT - 100 - j * 30;
          const lx = bx - 15 + Math.sin(j) * 10;
          ctx.beginPath();
          ctx.ellipse(lx, ly, 3, 15, Math.PI/4, 0, Math.PI*2);
          ctx.fill();
        }
      }
      
      // Artistic Calligraphy Seal (Red) - Enhanced visibility
      ctx.fillStyle = '#b91c1c';
      ctx.fillRect(CANVAS_WIDTH - 70, 40, 40, 40);
      ctx.strokeStyle = '#fca5a5';
      ctx.lineWidth = 2;
      ctx.strokeRect(CANVAS_WIDTH - 70, 40, 40, 40);
      // Seal character placeholder
      ctx.fillStyle = '#fca5a5';
      ctx.font = 'bold 20px serif';
      ctx.textAlign = 'center';
      ctx.fillText('天', CANVAS_WIDTH - 50, 68);
    } else if (bgType === 'CRYSTAL') {
      ctx.fillStyle = '#0f172a';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      
      // Crystalline facets
      ctx.strokeStyle = 'rgba(147, 197, 253, 0.05)';
      for(let i=0; i<20; i++) {
        ctx.beginPath();
        ctx.moveTo(Math.random() * CANVAS_WIDTH, Math.random() * CANVAS_HEIGHT);
        ctx.lineTo(Math.random() * CANVAS_WIDTH, Math.random() * CANVAS_HEIGHT);
        ctx.stroke();
      }
    } else if (bgType === 'VOID_STORM') {
      ctx.fillStyle = '#020617';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      
      if (Math.random() > 0.98) {
        ctx.fillStyle = 'rgba(168, 85, 247, 0.15)';
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      }
    } else if (bgType === 'WATERFALL') {
      ctx.fillStyle = '#082f49';
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      
      // Flowing water effect
      ctx.strokeStyle = 'rgba(186, 230, 253, 0.2)';
      ctx.lineWidth = 2;
      const time = frameCountRef.current * 5;
      for (let i = 0; i < 30; i++) {
        const x = (i * 30) % CANVAS_WIDTH;
        const yOffset = (time + i * 100) % CANVAS_HEIGHT;
        ctx.beginPath();
        ctx.moveTo(x, yOffset);
        ctx.lineTo(x, yOffset + 100);
        ctx.stroke();
      }
    }

    // Draw Stunning Milky Way (Nebulae)
    if (bgType !== 'TRADITIONAL') {
      nebulaRef.current.forEach(n => {
        const grad = ctx.createRadialGradient(n.x, n.y, 0, n.x, n.y, n.r);
        grad.addColorStop(0, n.color);
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      });
    } else {
      // Falling petals for traditional mode
      ctx.fillStyle = 'rgba(255, 182, 193, 0.6)';
      for (let i = 0; i < 20; i++) {
        const px = (Math.sin(Date.now() / 1000 + i) * 0.5 + 0.5) * CANVAS_WIDTH;
        const py = (Date.now() / 20 + i * 100) % CANVAS_HEIGHT;
        ctx.beginPath();
        ctx.ellipse(px, py, 4, 6, Math.PI/4, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Draw Stars
    starsRef.current.forEach(star => {
      ctx.fillStyle = star.color;
      ctx.globalAlpha = star.speed / 2;
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1.0;

    // Draw Particles
    particlesRef.current.forEach(p => {
      ctx.globalAlpha = p.life;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
      ctx.fill();
    });
    ctx.globalAlpha = 1.0;

    // Draw Bullets
    ctx.shadowBlur = 15;
    bulletsRef.current.forEach(b => {
      ctx.save();
      ctx.translate(b.x, b.y);
      
      if (b.isPlayer) {
        const shape = activeSkin.bulletShape || 'RECT';
        const bColor = activeSkin.bulletColor || activeSkin.color;
        
        ctx.shadowBlur = 20;
        ctx.shadowColor = bColor;

        if (shape === 'CANNONBALL') {
          const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, b.width);
          grad.addColorStop(0, '#fff');
          grad.addColorStop(0.4, bColor);
          grad.addColorStop(1, 'transparent');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(0, 0, b.width * 1.8, 0, Math.PI * 2);
          ctx.fill();
        } else if (shape === 'FIREBALL') {
          const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, b.width * 2);
          grad.addColorStop(0, '#fff');
          grad.addColorStop(0.3, '#f97316');
          grad.addColorStop(0.6, '#ef4444');
          grad.addColorStop(1, 'transparent');
          ctx.fillStyle = grad;
          ctx.beginPath();
          ctx.arc(0, 0, b.width * 2.5, 0, Math.PI * 2);
          ctx.fill();
          // Flame trail
          ctx.fillStyle = '#f97316';
          for(let i=0; i<3; i++) {
            ctx.beginPath();
            ctx.arc(Math.random()*10-5, 10 + Math.random()*10, b.width/2, 0, Math.PI*2);
            ctx.fill();
          }
        } else if (shape === 'LOTUS_SEED') {
          ctx.fillStyle = bColor;
          ctx.beginPath();
          ctx.ellipse(0, 0, b.width, b.width * 1.5, 0, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = '#fff';
          ctx.lineWidth = 2;
          ctx.stroke();
        } else if (shape === 'INK_DROP') {
          ctx.fillStyle = bColor;
          ctx.globalAlpha = 0.6;
          for(let i=0; i<3; i++) {
            ctx.beginPath();
            ctx.arc(Math.sin(frameCountRef.current/5 + i)*5, Math.cos(frameCountRef.current/5 + i)*5, b.width * (1 - i*0.2), 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.globalAlpha = 1.0;
        } else if (shape === 'RECT') {
          ctx.fillStyle = bColor;
          ctx.fillRect(-b.width / 2, -15, b.width, 30);
          ctx.fillStyle = '#fff';
          ctx.fillRect(-b.width / 4, -12, b.width / 2, 6);
        } else if (shape === 'CIRCLE') {
          ctx.fillStyle = bColor;
          ctx.beginPath();
          ctx.arc(0, 0, b.width, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#fff';
          ctx.beginPath();
          ctx.arc(-b.width/3, -b.width/3, b.width/3, 0, Math.PI * 2);
          ctx.fill();
        } else if (shape === 'DIAMOND') {
          ctx.fillStyle = bColor;
          ctx.beginPath();
          ctx.moveTo(0, -b.width * 1.5);
          ctx.lineTo(b.width, 0);
          ctx.lineTo(0, b.width * 1.5);
          ctx.lineTo(-b.width, 0);
          ctx.closePath();
          ctx.fill();
        } else if (shape === 'DRAGON') {
          ctx.font = `${b.width * 3}px serif`;
          ctx.fillText('🔥', -b.width, b.width);
        } else if (shape === 'WIND_GUST') {
          ctx.strokeStyle = bColor;
          ctx.lineWidth = 2;
          ctx.beginPath();
          for(let i=0; i<3; i++) {
            const r = b.width * (1 + i*0.5);
            ctx.arc(0, i*5, r, Math.PI * 0.2, Math.PI * 0.8);
          }
          ctx.stroke();
        }
      } else {
        // Varied Enemy Bullets (Distinct from background)
        ctx.fillStyle = '#f87171'; // Lighter red for better contrast
        ctx.shadowBlur = 15;
        ctx.shadowColor = '#ef4444';
        const type = Math.floor(b.x + b.y) % 3;
        if (type === 0) {
          // Energy pulse
          ctx.beginPath();
          ctx.arc(0, 0, 6, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = '#fff';
          ctx.beginPath();
          ctx.arc(0, 0, 2, 0, Math.PI * 2);
          ctx.fill();
        } else if (type === 1) {
          // Spiky bomb
          for(let i=0; i<8; i++) {
            const angle = (i * Math.PI * 2) / 8;
            ctx.rotate(angle);
            ctx.fillRect(0, -8, 2, 16);
          }
        } else {
          // Plasma bolt
          ctx.beginPath();
          ctx.moveTo(0, -10);
          ctx.lineTo(5, 0);
          ctx.lineTo(0, 10);
          ctx.lineTo(-5, 0);
          ctx.closePath();
          ctx.fill();
        }
      }
      ctx.restore();
    });
    ctx.shadowBlur = 0;

    // Draw Bombs
    bombsRef.current.forEach(b => {
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.shadowBlur = 15;
      ctx.shadowColor = '#facc15';
      ctx.fillStyle = '#facc15';
      ctx.beginPath();
      ctx.arc(0, 0, 8, 0, Math.PI * 2);
      ctx.fill();
      // Core
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(-2, -2, 3, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    });

    // Draw Enemies (Complex Skins)
    enemiesRef.current.forEach(e => {
      ctx.fillStyle = e.color;
      ctx.shadowBlur = 20;
      ctx.shadowColor = e.color;
      
      ctx.save();
      ctx.translate(e.x + e.width / 2, e.y + e.height / 2);
      
      // Enemy Core
      ctx.beginPath();
      if (e.type === 'TANK') {
        const r = 10;
        const w = e.width;
        const h = e.height;
        const x = -w/2;
        const y = -h/2;
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        // Armor plates
        ctx.strokeStyle = 'rgba(255,255,255,0.2)';
        ctx.strokeRect(-e.width/3, -e.height/3, 2*e.width/3, 2*e.height/3);
      } else if (e.type === 'ELITE') {
        ctx.moveTo(0, e.height / 2);
        ctx.lineTo(-e.width / 2, 0);
        ctx.lineTo(0, -e.height / 2);
        ctx.lineTo(e.width / 2, 0);
        // Elite wings
        ctx.moveTo(-e.width/2, 0);
        ctx.lineTo(-e.width/2 - 10, 10);
        ctx.moveTo(e.width/2, 0);
        ctx.lineTo(e.width/2 + 10, 10);
      } else if (e.type === 'HEAVY') {
        ctx.moveTo(-e.width/2, -e.height/2);
        ctx.lineTo(e.width/2, -e.height/2);
        ctx.lineTo(e.width/2, e.height/2);
        ctx.lineTo(-e.width/2, e.height/2);
        ctx.closePath();
        // Heavy turrets
        ctx.fillRect(-e.width/2 - 5, -5, 5, 10);
        ctx.fillRect(e.width/2, -5, 5, 10);
      } else {
        ctx.moveTo(0, e.height / 2);
        ctx.lineTo(-e.width / 2, -e.height / 2);
        ctx.lineTo(e.width / 2, -e.height / 2);
      }
      ctx.closePath();
      ctx.fill();

      // Enemy Wings/Detail
      ctx.strokeStyle = 'rgba(255,255,255,0.3)';
      ctx.lineWidth = 2;
      ctx.stroke();

      // Glowing Eyes/Engines
      ctx.fillStyle = 'white';
      ctx.beginPath();
      ctx.arc(-e.width / 4, -e.height/4, 2, 0, Math.PI * 2);
      ctx.arc(e.width / 4, -e.height/4, 2, 0, Math.PI * 2);
      ctx.fill();

      // Engine exhaust
      const exhaustSize = 5 + Math.random() * 5;
      ctx.fillStyle = 'rgba(239, 68, 68, 0.5)';
      ctx.fillRect(-5, -e.height/2 - exhaustSize, 10, exhaustSize);

      ctx.restore();

      // HP Bar for Heavy/Tank/Elite
      if (e.type === 'HEAVY' || e.type === 'TANK' || e.type === 'ELITE') {
        const hpRatio = e.hp / e.maxHp;
        ctx.fillStyle = 'rgba(255,255,255,0.1)';
        ctx.fillRect(e.x, e.y - 15, e.width, 6);
        ctx.fillStyle = e.color;
        ctx.fillRect(e.x, e.y - 15, hpRatio * e.width, 6);
      }
    });
    ctx.shadowBlur = 0;

    // Draw PowerUps
    powerUpsRef.current.forEach(p => {
      const colors = { TRIPLE: '#f59e0b', SHIELD: '#3b82f6', TREASURE: '#fbbf24', RAPID: '#10b981' };
      ctx.fillStyle = colors[p.type] || '#fff';
      ctx.shadowBlur = 25;
      ctx.shadowColor = ctx.fillStyle as string;
      
      ctx.beginPath();
      ctx.arc(p.x + p.width / 2, p.y + p.height / 2, p.width / 2, 0, Math.PI * 2);
      ctx.fill();
      
      ctx.strokeStyle = 'white';
      ctx.lineWidth = 2;
      ctx.stroke();

      ctx.fillStyle = 'white';
      ctx.font = 'bold 14px sans-serif';
      ctx.textAlign = 'center';
      const icons = { TRIPLE: '⚡', SHIELD: '🛡️', TREASURE: '💎', RAPID: '🔥' };
      ctx.fillText(icons[p.type] || '?', p.x + p.width / 2, p.y + p.height / 2 + 5);
    });
    ctx.shadowBlur = 0;

    // Draw Player (Complex Skin)
    const player = playerRef.current;
    if (!player.isInvincible || Math.floor(Date.now() / 100) % 2 === 0) {
      const drawShip = (x: number, y: number, scale = 1, isSecondary = false) => {
        ctx.save();
        ctx.translate(x, y);
        
        // Rolling Effect (Tilt)
        ctx.rotate(player.tilt);
        
        ctx.scale(scale * 1.2, scale * 1.2);
        
        ctx.shadowBlur = activeSkin.glowIntensity;
        ctx.shadowColor = activeSkin.color;
        
        // Luxurious Wings
        ctx.fillStyle = activeSkin.color;
        ctx.beginPath();
        ctx.moveTo(-player.width/2, player.height/2);
        ctx.lineTo(-player.width/2 - 10, player.height/2 + 5);
        ctx.lineTo(-player.width/2, player.height/4);
        ctx.fill();
        
        ctx.beginPath();
        ctx.moveTo(player.width/2, player.height/2);
        ctx.lineTo(player.width/2 + 10, player.height/2 + 5);
        ctx.lineTo(player.width/2, player.height/4);
        ctx.fill();

        // Main Body with Dynamic Effects
        const time = frameCountRef.current;
        
        if (activeSkin.dynamicEffect === 'WATERFALL') {
          const grad = ctx.createLinearGradient(0, -player.height/2, 0, player.height/2);
          const offset = (time * 2) % 100 / 100;
          grad.addColorStop(0, activeSkin.color);
          grad.addColorStop(offset, '#fff');
          grad.addColorStop(Math.min(1, offset + 0.1), activeSkin.color);
          grad.addColorStop(1, activeSkin.color);
          ctx.fillStyle = grad;
        } else if (activeSkin.dynamicEffect === 'WATERCOLOR') {
          ctx.fillStyle = activeSkin.color;
          ctx.globalAlpha = 0.8;
        } else if (activeSkin.dynamicEffect === 'CRYSTAL') {
          const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, player.width);
          grad.addColorStop(0, '#fff');
          grad.addColorStop(0.2, activeSkin.color);
          grad.addColorStop(1, 'rgba(0,0,0,0.5)');
          ctx.fillStyle = grad;
        } else if (activeSkin.dynamicEffect === 'NEON_PULSE') {
          const pulse = Math.sin(time / 10) * 0.3 + 0.7;
          ctx.shadowBlur = activeSkin.glowIntensity * pulse;
          ctx.fillStyle = activeSkin.color;
        } else if (activeSkin.dynamicEffect === 'FLAME') {
          const grad = ctx.createRadialGradient(0, 0, 0, 0, 0, player.width);
          grad.addColorStop(0, '#fff');
          grad.addColorStop(0.3, '#f97316');
          grad.addColorStop(0.7, '#ef4444');
          grad.addColorStop(1, '#000');
          ctx.fillStyle = grad;
          // Flame particles
          ctx.shadowBlur = 30;
          ctx.shadowColor = '#f97316';
        } else if (activeSkin.dynamicEffect === 'STORM') {
          ctx.fillStyle = activeSkin.color;
          // Swirling wind particles
          for(let i=0; i<6; i++) {
            const r = 20 + Math.sin(time/12 + i)*12;
            const ang = time/6 + i*Math.PI*2/6;
            ctx.beginPath();
            ctx.arc(Math.cos(ang)*r, Math.sin(ang)*r, 4, 0, Math.PI*2);
            ctx.fill();
          }
        } else if (activeSkin.dynamicEffect === 'GLOSS') {
          const grad = ctx.createLinearGradient(-player.width, -player.height, player.width, player.height);
          const offset = (time * 3) % 200 / 100 - 1;
          const c1 = Math.max(0, Math.min(1, offset));
          const c2 = Math.max(0, Math.min(1, offset + 0.2));
          const c3 = Math.max(0, Math.min(1, offset + 0.4));
          grad.addColorStop(c1, activeSkin.color);
          grad.addColorStop(c2, '#fff');
          grad.addColorStop(c3, activeSkin.color);
          ctx.fillStyle = grad;
        } else {
          const bodyGrad = ctx.createLinearGradient(0, -player.height/2, 0, player.height/2);
          bodyGrad.addColorStop(0, activeSkin.color);
          bodyGrad.addColorStop(1, '#000');
          ctx.fillStyle = bodyGrad;
        }
        
        ctx.beginPath();
        if (activeSkin.shape === 'DRAGON') {
          ctx.moveTo(0, -player.height / 2);
          ctx.quadraticCurveTo(-25, -10, -player.width / 2, player.height / 2);
          ctx.lineTo(-10, player.height / 3);
          ctx.lineTo(0, player.height / 2);
          ctx.lineTo(10, player.height / 3);
          ctx.lineTo(player.width / 2, player.height / 2);
          ctx.quadraticCurveTo(25, -10, 0, -player.height / 2);
        } else if (activeSkin.shape === 'PHOENIX') {
          ctx.moveTo(0, -player.height / 2);
          ctx.bezierCurveTo(-40, -20, -player.width * 1.2, player.height / 2, -player.width / 2, player.height / 2);
          ctx.lineTo(-10, 10);
          ctx.lineTo(0, 20);
          ctx.lineTo(10, 10);
          ctx.lineTo(player.width / 2, player.height / 2);
          ctx.bezierCurveTo(40, -20, player.width * 1.2, player.height / 2, 0, -player.height / 2);
        } else if (activeSkin.shape === 'SWORD') {
          ctx.moveTo(0, -player.height * 0.8);
          ctx.lineTo(-15, 0);
          ctx.lineTo(-player.width / 2, player.height / 2);
          ctx.lineTo(0, player.height / 3);
          ctx.lineTo(player.width / 2, player.height / 2);
          ctx.lineTo(15, 0);
          ctx.closePath();
        } else if (activeSkin.shape === 'LANTERN') {
          ctx.roundRect(-player.width/2, -player.height/2, player.width, player.height, 15);
        } else if (activeSkin.shape === 'PAGODA') {
          ctx.moveTo(0, -player.height/2);
          ctx.lineTo(-player.width/2, 0);
          ctx.lineTo(-player.width/3, 0);
          ctx.lineTo(-player.width/2, player.height/2);
          ctx.lineTo(player.width/2, player.height/2);
          ctx.lineTo(player.width/3, 0);
          ctx.lineTo(player.width/2, 0);
          ctx.closePath();
        } else if (activeSkin.shape === 'LOTUS_FLOWER') {
          for(let i=0; i<6; i++) {
            const angle = (i * Math.PI * 2) / 6;
            ctx.ellipse(Math.cos(angle)*10, Math.sin(angle)*10, 15, 25, angle, 0, Math.PI*2);
          }
        } else if (activeSkin.shape === 'BRAIN_CORE') {
          // Large brain core
          ctx.beginPath();
          ctx.ellipse(0, -10, player.width * 0.8, player.height * 0.6, 0, 0, Math.PI * 2);
          ctx.fill();
          // Fiery body connection
          ctx.fillStyle = '#ef4444';
          ctx.beginPath();
          ctx.moveTo(-player.width/2, 0);
          ctx.lineTo(0, player.height/2);
          ctx.lineTo(player.width/2, 0);
          ctx.closePath();
          ctx.fill();
          // Brain folds/veins
          ctx.strokeStyle = 'rgba(255,255,255,0.3)';
          ctx.lineWidth = 2;
          for(let i=0; i<8; i++) {
            ctx.beginPath();
            ctx.arc(Math.sin(i)*15, -10 + Math.cos(i)*10, 8, 0, Math.PI*2);
            ctx.stroke();
          }
        } else if (activeSkin.shape === 'WARRIOR') {
          ctx.moveTo(0, -player.height/2);
          ctx.lineTo(-player.width/2, player.height/2);
          ctx.lineTo(0, player.height/4);
          ctx.lineTo(player.width/2, player.height/2);
          ctx.closePath();
          // Helmet plume
          ctx.fillStyle = '#ef4444';
          ctx.fillRect(-2, -player.height/2 - 10, 4, 10);
        } else if (activeSkin.shape === 'BEAST') {
          ctx.moveTo(0, -player.height/2);
          ctx.lineTo(-player.width/2, 0);
          ctx.lineTo(-player.width/2, player.height/2);
          ctx.lineTo(0, player.height/3);
          ctx.lineTo(player.width/2, player.height/2);
          ctx.lineTo(player.width/2, 0);
          ctx.closePath();
          // Horns
          ctx.fillRect(-player.width/2, -player.height/2, 5, 15);
          ctx.fillRect(player.width/2 - 5, -player.height/2, 5, 15);
        } else if (activeSkin.shape === 'BULLET_SHIP') {
          // Bullet shaped ship
          ctx.moveTo(0, -player.height * 0.8);
          ctx.quadraticCurveTo(player.width/2, -player.height/2, player.width/2, player.height/2);
          ctx.lineTo(-player.width/2, player.height/2);
          ctx.quadraticCurveTo(-player.width/2, -player.height/2, 0, -player.height * 0.8);
          ctx.closePath();
          // Fins
          ctx.fillRect(-player.width/2 - 5, player.height/4, 5, player.height/4);
          ctx.fillRect(player.width/2, player.height/4, 5, player.height/4);
        } else if (activeSkin.shape === 'WIND_SPIRIT') {
          // Swirling wind spirit
          ctx.beginPath();
          for(let i=0; i<5; i++) {
            const r = (player.width/2) * (1 - i*0.2);
            const angle = time/10 + i;
            ctx.arc(Math.sin(angle)*5, Math.cos(angle)*5, r, 0, Math.PI * 1.5);
          }
          ctx.stroke();
        } else {
          ctx.moveTo(0, -player.height / 2);
          ctx.lineTo(-player.width / 2, player.height / 2);
          ctx.lineTo(player.width / 2, player.height / 2);
          ctx.closePath();
        }
        ctx.fill();

        // Chinese Patterns & Textures
        if (activeSkin.pattern && activeSkin.pattern !== 'NONE') {
          ctx.save();
          ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
          ctx.lineWidth = 1.5;
          ctx.beginPath();

          if (activeSkin.pattern === 'CLOUD') {
            // Swirling auspicious clouds - More organic
            for(let i=0; i<3; i++) {
              const ox = -12 + i*12;
              const oy = 8;
              ctx.beginPath();
              ctx.arc(ox, oy, 7, Math.PI * 0.8, Math.PI * 2.2);
              ctx.arc(ox + 6, oy - 4, 5, Math.PI * 1.2, Math.PI * 2.8);
              ctx.stroke();
            }
          } else if (activeSkin.pattern === 'DRAGON') {
            // Dragon scales - More detailed
            for(let i=0; i<5; i++) {
              for(let j=0; j<4; j++) {
                const sx = -18 + i*9;
                const sy = -12 + j*7;
                ctx.beginPath();
                ctx.moveTo(sx, sy);
                ctx.quadraticCurveTo(sx + 4, sy - 6, sx + 9, sy);
                ctx.stroke();
              }
            }
          } else if (activeSkin.pattern === 'PHOENIX') {
            // Stylized feathers - Flowing
            for(let i=0; i<5; i++) {
              const ang = -0.8 + i*0.4;
              ctx.save();
              ctx.rotate(ang);
              ctx.beginPath();
              ctx.moveTo(0, 0);
              ctx.bezierCurveTo(10, -15, 25, -5, 30, 10);
              ctx.stroke();
              ctx.restore();
            }
          } else if (activeSkin.pattern === 'LOTUS') {
            // Lotus petals - Layered
            for(let i=0; i<12; i++) {
              const ang = (i * Math.PI * 2) / 12;
              ctx.save();
              ctx.rotate(ang);
              ctx.beginPath();
              ctx.ellipse(0, 10, 5, 12, 0, 0, Math.PI * 2);
              ctx.stroke();
              ctx.restore();
            }
          } else if (activeSkin.pattern === 'WATERCOLOR') {
            // Ink wash blobs - Artistic
            ctx.fillStyle = 'rgba(255, 255, 255, 0.25)';
            for(let i=0; i<6; i++) {
              const rx = Math.sin(time/20 + i) * 15;
              const ry = Math.cos(time/20 + i) * 15;
              ctx.beginPath();
              ctx.arc(rx, ry, 10 + Math.sin(time/12 + i)*6, 0, Math.PI*2);
              ctx.fill();
            }
          } else if (activeSkin.pattern === 'PORCELAIN') {
            // Blue and white floral swirls - Fine lines
            ctx.strokeStyle = '#3b82f6';
            ctx.lineWidth = 0.8;
            for(let i=0; i<6; i++) {
              const ang = (i * Math.PI * 2) / 6;
              ctx.save();
              ctx.rotate(ang);
              ctx.beginPath();
              ctx.moveTo(8, 8);
              ctx.bezierCurveTo(20, 0, 20, 25, 8, 20);
              ctx.stroke();
              ctx.restore();
            }
          } else if (activeSkin.pattern === 'GEMSTONE') {
            // Crystalline facets - Sharp
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(-20, -10); ctx.lineTo(20, -10);
            ctx.moveTo(-15, -20); ctx.lineTo(-15, 20);
            ctx.moveTo(15, -20); ctx.lineTo(15, 20);
            ctx.moveTo(-20, 10); ctx.lineTo(20, 10);
            ctx.stroke();
          } else if (activeSkin.pattern === 'WATERFALL') {
            // Flowing water lines - Dynamic
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)';
            ctx.lineWidth = 1;
            for(let i=0; i<7; i++) {
              const x = -18 + i*6;
              const offset = (time/4 + i*8) % 35;
              ctx.beginPath();
              ctx.moveTo(x, -20 + offset);
              ctx.lineTo(x, -8 + offset);
              ctx.stroke();
            }
          }
          
          ctx.stroke();
          ctx.restore();
        }

        // Waterfall/Watercolor Overlays (Dynamic Effects)
        if (activeSkin.dynamicEffect === 'WATERCOLOR' && activeSkin.pattern !== 'WATERCOLOR') {
          ctx.fillStyle = '#fff';
          ctx.globalAlpha = 0.3;
          for(let i=0; i<5; i++) {
            ctx.beginPath();
            const ox = Math.sin(time/20 + i) * 15;
            const oy = Math.cos(time/20 + i) * 15;
            ctx.arc(ox, oy, 10 + Math.sin(time/10 + i)*5, 0, Math.PI*2);
            ctx.fill();
          }
          ctx.globalAlpha = 1.0;
        }

        if (activeSkin.dynamicEffect === 'CRYSTAL') {
          ctx.strokeStyle = 'rgba(255,255,255,0.5)';
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.moveTo(-player.width/2, 0);
          ctx.lineTo(player.width/2, 0);
          ctx.moveTo(0, -player.height/2);
          ctx.lineTo(0, player.height/2);
          ctx.stroke();
        }

        // Cockpit with Shine
        ctx.fillStyle = 'white';
        ctx.beginPath();
        ctx.ellipse(0, -5, 8, 12, 0, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.fillStyle = 'rgba(255,255,255,0.5)';
        ctx.beginPath();
        ctx.ellipse(-3, -8, 3, 5, 0.5, 0, Math.PI * 2);
        ctx.fill();

        // Engine Glow
        const glowSize = 15 + Math.random() * 10;
        const grad = ctx.createLinearGradient(0, player.height / 2, 0, player.height / 2 + glowSize);
        grad.addColorStop(0, '#f87171');
        grad.addColorStop(1, 'transparent');
        ctx.fillStyle = grad;
        ctx.fillRect(-10, player.height / 2, 20, glowSize);
        
        ctx.restore();
      };

      drawShip(player.x + player.width / 2, player.y + player.height / 2);
      
      if (activeSkin.hasDualShip) {
        drawShip(player.x + player.width / 2 + 40, player.y + player.height / 2 + 20, 0.7);
      }

      // Shield
      if (player.hasShield) {
        ctx.save();
        ctx.translate(player.x + player.width / 2, player.y + player.height / 2);
        ctx.strokeStyle = '#60a5fa';
        ctx.lineWidth = 3;
        ctx.setLineDash([5, 5]);
        ctx.beginPath();
        ctx.arc(0, 0, player.width * 1.2, 0, Math.PI * 2);
        ctx.stroke();
        ctx.restore();
      }
    }
    ctx.shadowBlur = 0;
    
    // Mythic Screen Glow
    if (activeSkin.tier === 'MYTHIC') {
      ctx.strokeStyle = activeSkin.color;
      ctx.lineWidth = 10;
      ctx.globalAlpha = 0.1 + Math.sin(Date.now() / 500) * 0.05;
      ctx.strokeRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      ctx.globalAlpha = 1.0;
    }

    ctx.restore();
  }, [activeSkin, isShaking, bgType]);

  const updateRef = useRef(update);
  const drawRef = useRef(draw);
  const activeSkinRef = useRef(activeSkin);

  useEffect(() => {
    updateRef.current = update;
  }, [update]);

  useEffect(() => {
    drawRef.current = draw;
  }, [draw]);

  useEffect(() => {
    activeSkinRef.current = activeSkin;
  }, [activeSkin]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      keysRef.current.add(key);
      if (key === 'p') {
        setGameState(prev => prev === 'PLAYING' ? 'PAUSED' : (prev === 'PAUSED' ? 'PLAYING' : prev));
      }
    };
    const handleKeyUp = (e: KeyboardEvent) => {
      const key = e.key.length === 1 ? e.key.toLowerCase() : e.key;
      keysRef.current.delete(key);
    };
    
    const handleMouseDown = (e: MouseEvent) => {
      if (gameState !== 'PLAYING' || activeSkinRef.current.ability !== 'TARGETED_STRIKE') return;
      const canvas = canvasRef.current;
      if (!canvas) return;
      const rect = canvas.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      // Check if clicked on an enemy
      const target = enemiesRef.current.find(enemy => 
        mouseX > enemy.x && mouseX < enemy.x + enemy.width &&
        mouseY > enemy.y && mouseY < enemy.y + enemy.height
      );

      if (target) {
        const player = playerRef.current;
        const bWidth = activeSkinRef.current.bulletWidth;
        // Fire a fast bullet towards the target
        const dx = target.x + target.width / 2 - (player.x + player.width / 2);
        const dy = target.y + target.height / 2 - player.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        const speed = BULLET_SPEED * 2.5;
        bulletsRef.current.push({
          x: player.x + player.width / 2,
          y: player.y,
          vx: (dx / dist) * speed,
          vy: (dy / dist) * speed,
          isPlayer: true,
          width: bWidth * 1.5
        });
        createExplosion(player.x + player.width / 2, player.y, '#fff', 5);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);
    window.addEventListener('mousedown', handleMouseDown);
    
    const gameLoop = () => {
      if (gameState === 'PLAYING') {
        updateRef.current();
      }
      drawRef.current();
      requestRef.current = requestAnimationFrame(gameLoop);
    };
    
    requestRef.current = requestAnimationFrame(gameLoop);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('mousedown', handleMouseDown);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [gameState]);

  // Touch Controls for Mobile
  const handleTouch = (e: React.TouchEvent) => {
    if (gameState !== 'PLAYING') return;
    const touch = e.touches[0];
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const scaleX = CANVAS_WIDTH / rect.width;
    const scaleY = CANVAS_HEIGHT / rect.height;
    
    playerRef.current.x = (touch.clientX - rect.left) * scaleX - playerRef.current.width / 2;
    playerRef.current.y = (touch.clientY - rect.top) * scaleY - playerRef.current.height / 2;
  };

  const startLottery = () => {
    if (lotteryState === 'SPINNING') return;
    
    if (tickets > 0) {
      setTickets(prev => prev - 1);
    } else if (credits >= 10000) {
      setCredits(prev => prev - 10000);
    } else {
      alert('惹货积分不足 (需要 10000 惹货积分)');
      return;
    }

    setLotteryState('SPINNING');
    
    const lockedSkins = skins.filter(s => !s.unlocked);
    if (lockedSkins.length === 0) {
      setCredits(prev => prev + 1000);
      setLotteryState('IDLE');
      return;
    }

    const rand = Math.random() * 100;
    let targetTier: Skin['tier'] = 'COMMON';
    if (rand < 5) targetTier = 'MYTHIC';
    else if (rand < 15) targetTier = 'LEGENDARY';
    else if (rand < 40) targetTier = 'EPIC';
    else if (rand < 70) targetTier = 'RARE';

    const tierSkins = lockedSkins.filter(s => s.tier === targetTier);
    const finalSkins = tierSkins.length > 0 ? tierSkins : lockedSkins;
    const won = finalSkins[Math.floor(Math.random() * finalSkins.length)];
    
    setWinningSkin(won);

    // Animation logic
    let currentAngle = 0;
    let speed = 20;
    const duration = 3000;
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      if (elapsed < duration) {
        currentAngle += speed;
        speed *= 0.98; // Slow down
        setSpinAngle(currentAngle);
        requestAnimationFrame(animate);
      } else {
        setLotteryState('RESULT');
        setSkins(prev => prev.map(s => s.id === won.id ? { ...s, unlocked: true } : s));
      }
    };
    animate();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white font-sans selection:bg-blue-500/30 overflow-hidden flex flex-col md:flex-row">
      
      {/* Sidebar - Instructions (Desktop Only) */}
      <aside className="hidden lg:flex w-80 flex-col p-8 border-r border-white/10 bg-black/20 backdrop-blur-xl">
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Rocket className="w-6 h-6 text-white" />
          </div>
          <div>
            <h2 className="text-xl font-bold tracking-tight">Tina星际先锋</h2>
            <p className="text-[10px] text-slate-500 font-medium uppercase tracking-widest">Ace Pilot Command</p>
          </div>
        </div>

        {/* Profile Section */}
        <div className="mb-8 p-4 rounded-2xl bg-white/5 border border-white/10 flex items-center gap-3">
          <div className="w-10 h-10 rounded-full bg-slate-800 border border-white/10 flex items-center justify-center overflow-hidden">
            <img 
              src={`https://api.dicebear.com/7.x/avataaars/svg?seed=yli49169`} 
              alt="Profile"
              className="w-full h-full object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-bold truncate">yli49169@gmail.com</p>
            <p className="text-[10px] text-blue-400 font-bold uppercase tracking-tighter">Elite Commander</p>
          </div>
        </div>

        <div className="space-y-8">
          <div className="bg-white/5 p-4 rounded-xl border border-white/10">
            <div className="text-xs text-slate-500 uppercase tracking-widest mb-1">可用惹货积分</div>
            <div className="text-2xl font-bold text-amber-400">{credits.toLocaleString()}</div>
          </div>

          <div className="bg-white/5 p-4 rounded-xl border border-white/10">
            <div className="text-xs text-slate-500 uppercase tracking-widest mb-1">拥有心币</div>
            <div className="text-2xl font-bold text-blue-400">{tickets}</div>
          </div>

          <section>
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Keyboard className="w-4 h-4" /> 任务简报
            </h3>
            <ul className="space-y-3 text-sm text-slate-300">
              <li className="flex justify-between"><span>击毁敌机</span> <span className="text-green-400">+100~300</span></li>
              <li className="flex justify-between"><span>惹货转化</span> <span className="text-amber-400">10% 分数</span></li>
              <li className="flex justify-between"><span>升级门槛</span> <span className="text-blue-400">每 1000 分</span></li>
            </ul>
          </section>

          <section>
            <h3 className="text-sm font-semibold text-slate-400 uppercase tracking-wider mb-4 flex items-center gap-2">
              <Zap className="w-4 h-4" /> 道具说明
            </h3>
            <div className="space-y-4">
              <div className="flex gap-3 items-start">
                <div className="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center shrink-0">
                  <Zap className="w-4 h-4 text-amber-400" />
                </div>
                <div>
                  <p className="text-sm font-medium">极速射击</p>
                  <p className="text-xs text-slate-400">射速翻倍，持续8秒</p>
                </div>
              </div>
              <div className="flex gap-3 items-start">
                <div className="w-8 h-8 rounded-lg bg-slate-500/20 flex items-center justify-center shrink-0">
                  <Shield className="w-4 h-4 text-slate-400" />
                </div>
                <div>
                  <p className="text-sm font-medium">装甲强化</p>
                  <p className="text-xs text-slate-400">提升 10 点防御等级</p>
                </div>
              </div>
              <div className="flex gap-3 items-start">
                <div className="w-8 h-8 rounded-lg bg-yellow-500/20 flex items-center justify-center shrink-0">
                  <Trophy className="w-4 h-4 text-yellow-400" />
                </div>
                <div>
                  <p className="text-sm font-medium">星际宝藏</p>
                  <p className="text-xs text-slate-400">直接获得 100 惹货积分</p>
                </div>
              </div>
            </div>
          </section>
        </div>

        <div className="mt-auto pt-8 border-t border-white/10">
          <p className="text-xs text-slate-500">© 2024 Tina Interstellar Pioneer</p>
        </div>
      </aside>

      {/* Main Game Area */}
      <main className="relative flex-1 flex items-center justify-center p-4">
        
        {/* Game Canvas Container */}
        <motion.div 
          animate={isShaking ? {
            x: [0, -10, 10, -10, 10, 0],
            y: [0, 5, -5, 5, -5, 0]
          } : {}}
          transition={{ duration: 0.4 }}
          className="relative aspect-[8/9] w-full max-w-[600px] bg-black rounded-2xl overflow-hidden shadow-2xl shadow-blue-500/10 border border-white/5"
        >
          <canvas
            ref={canvasRef}
            width={CANVAS_WIDTH}
            height={CANVAS_HEIGHT}
            className="w-full h-full cursor-none"
            onTouchMove={handleTouch}
          />

          {/* HUD - Top Bar */}
          <div className="absolute top-0 inset-x-0 p-6 flex justify-between items-start pointer-events-none z-10">
            <div className="space-y-1">
              <div className="text-xs font-medium text-slate-400 uppercase tracking-widest">Score</div>
              <div className="text-3xl font-bold font-mono text-blue-400">{score.toLocaleString()}</div>
              
              {/* Defense Rating HUD */}
              <div className="mt-4 w-32">
                <div className="flex justify-between text-[10px] font-bold text-slate-500 mb-1">
                  <span>DEFENSE</span>
                  <span>{Math.floor(playerRef.current.defense)}%</span>
                </div>
                <div className="h-1.5 w-full bg-white/10 rounded-full overflow-hidden">
                  <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${playerRef.current.defense}%` }}
                    className="h-full bg-slate-400"
                  />
                </div>
              </div>
            </div>
            <div className="flex flex-col items-end gap-3">
              <div className="w-48">
                <div className="flex justify-between text-[10px] font-bold text-red-400 mb-1">
                  <span>HULL INTEGRITY (BLOOD)</span>
                  <span>{Math.max(0, Math.floor(playerRef.current.hp))}%</span>
                </div>
                <div className="h-2 w-full bg-red-950/30 rounded-full overflow-hidden border border-red-500/20">
                  <motion.div 
                    initial={{ width: '100%' }}
                    animate={{ width: `${Math.max(0, playerRef.current.hp)}%` }}
                    className={`h-full transition-colors duration-500 ${playerRef.current.hp > 50 ? 'bg-red-500' : playerRef.current.hp > 20 ? 'bg-orange-500' : 'bg-red-700'}`}
                  />
                </div>
              </div>
              <div className="px-3 py-1 rounded-full bg-white/10 backdrop-blur-md border border-white/10 text-xs font-bold tracking-tighter">
                {currentRealm} - LEVEL {level}
              </div>
            </div>
          </div>

          {/* HUD - Bottom Bar */}
          <div className="absolute bottom-6 inset-x-6 flex justify-between items-end pointer-events-none z-10">
            <div className="bg-black/40 backdrop-blur-md p-3 rounded-xl border border-white/10">
              <div className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mb-1">Level Progress</div>
              <div className="h-1 w-32 bg-white/10 rounded-full overflow-hidden">
                <motion.div 
                  animate={{ width: `${(score % 1000) / 10}%` }}
                  className="h-full bg-amber-500"
                />
              </div>
            </div>
            <div className="bg-black/40 backdrop-blur-md p-3 rounded-xl border border-white/10 flex items-center gap-3">
              <div className="text-right">
                <div className="text-[8px] font-bold text-slate-500 uppercase tracking-widest mb-1">Engine Core</div>
                <div className="text-[10px] font-bold text-blue-400">STABLE</div>
              </div>
              <div className="w-8 h-8 rounded-lg bg-blue-500/20 flex items-center justify-center">
                <Zap className="w-4 h-4 text-blue-400 animate-pulse" />
              </div>
            </div>
          </div>

          {/* Overlays */}
          <AnimatePresence>
            {showWarning && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-10 pointer-events-none border-4 border-red-500/50 flex items-center justify-center"
              >
                <div className="bg-red-500/20 px-4 py-2 rounded-lg backdrop-blur-sm">
                  <span className="text-red-500 font-bold text-sm">敌机逃脱！扣除惹货积分</span>
                </div>
              </motion.div>
            )}

            {gameState === 'START' && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-20 bg-slate-950/80 backdrop-blur-md flex flex-col items-center justify-center p-8 text-center"
              >
                <motion.div
                  initial={{ y: 20, opacity: 0 }}
                  animate={{ y: 0, opacity: 1 }}
                  transition={{ delay: 0.2 }}
                  className="mb-12"
                >
                  <Rocket className="w-16 h-16 text-red-500 mx-auto mb-6 animate-pulse" />
                  <h1 className="text-3xl md:text-4xl font-black tracking-tighter mb-4 bg-gradient-to-b from-blue-500 to-indigo-600 bg-clip-text text-transparent">
                    星际战机
                  </h1>
                  <p className="text-slate-400 max-w-xs mx-auto text-sm">
                    穿梭于星际之间，消灭敌机，保卫银河系。
                  </p>
                </motion.div>

                <div className="flex flex-col gap-4 w-full max-w-xs">
                  {/* Difficulty Selector */}
                  <div className="flex bg-white/5 p-1 rounded-xl border border-white/10 mb-2 overflow-x-auto no-scrollbar">
                    {(['EASY', 'NORMAL', 'ADVANCED', 'EXPERT', 'HARD'] as const).map(d => (
                      <button
                        key={d}
                        onClick={() => setDifficulty(d)}
                        className={`flex-1 py-2 px-3 text-[8px] font-bold rounded-lg transition-all whitespace-nowrap ${difficulty === d ? 'bg-red-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                      >
                        {d === 'EASY' ? '简单' : d === 'NORMAL' ? '普通' : d === 'ADVANCED' ? '进阶' : d === 'EXPERT' ? '专家' : '困难'}
                      </button>
                    ))}
                  </div>

                  <div className="flex bg-white/5 p-1 rounded-xl border border-white/10 mb-2 overflow-x-auto no-scrollbar">
                    {(['SPACE', 'NEBULA', 'GALAXY', 'TRADITIONAL', 'WATERFALL'] as const).map(b => (
                      <button
                        key={b}
                        onClick={() => setBgType(b)}
                        className={`flex-1 py-2 px-3 text-[8px] font-bold rounded-lg transition-all ${bgType === b ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-500 hover:text-slate-300'}`}
                      >
                        {b === 'TRADITIONAL' ? '古风' : b === 'WATERFALL' ? '瀑布' : b}
                      </button>
                    ))}
                  </div>

                  {/* Lottery Section */}
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={startLottery}
                    className={getButtonStyle("w-full py-3 bg-amber-500 text-slate-950 rounded-xl font-black text-sm flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(245,158,11,0.4)]")}
                  >
                    <Ticket className="w-4 h-4" /> {tickets > 0 ? `幸运转盘 (拥有 ${tickets} 个心币)` : '惹货积分抽奖 (10000 惹货积分)'}
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={resetGame}
                    className={getButtonStyle("group relative px-8 py-5 bg-gradient-to-b from-red-500 to-red-700 rounded-xl font-black text-xl overflow-hidden transition-all hover:shadow-[0_0_50px_rgba(239,68,68,0.6)] border-t border-white/20")}
                  >
                    <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')] opacity-20 group-hover:opacity-40 transition-opacity" />
                    <span className="relative z-10 flex items-center justify-center gap-3 tracking-widest">
                      开始游戏 <Play className="w-6 h-6 fill-current" />
                    </span>
                  </motion.button>

                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setGameState('SHOP')}
                    className={getButtonStyle("px-8 py-4 bg-white/5 rounded-xl font-bold text-lg border border-white/10 hover:bg-white/10 transition-all hover:border-white/30 backdrop-blur-md")}
                  >
                    <span className="flex items-center justify-center gap-2">
                      战机整备 <Gamepad2 className="w-5 h-5" />
                    </span>
                  </motion.button>
                </div>
              </motion.div>
            )}

            {gameState === 'SHOP' && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-20 bg-slate-950/95 backdrop-blur-xl p-8 flex flex-col"
              >
                <div className="flex justify-between items-center mb-8">
                  <h2 className="text-3xl font-black tracking-tighter">机库整备</h2>
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-2 bg-amber-500/20 px-4 py-2 rounded-xl border border-amber-500/30">
                      <Trophy className="w-4 h-4 text-amber-400" />
                      <span className="font-bold text-amber-400">{credits} 惹货积分</span>
                    </div>
                    <div className="flex items-center gap-2 bg-blue-500/20 px-4 py-2 rounded-xl border border-blue-500/30">
                      <Ticket className="w-4 h-4 text-blue-400" />
                      <span className="font-bold text-blue-400">{tickets} 心币</span>
                    </div>
                  </div>
                </div>

                {/* Ticket Shop */}
                <div className="mb-6 p-4 bg-amber-500/10 rounded-2xl border border-amber-500/20 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-amber-500/20 flex items-center justify-center">
                      <Ticket className="w-6 h-6 text-amber-500" />
                    </div>
                    <div>
                      <p className="font-bold text-sm">心币商店</p>
                      <p className="text-[10px] text-slate-500">购买心币以抽取神话级战机</p>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <button 
                      onClick={() => {
                        if (credits >= 5000) {
                          setCredits(prev => prev - 5000);
                          setTickets(prev => prev + 1);
                        } else {
                          alert('惹货积分不足');
                        }
                      }}
                      className="px-4 py-2 bg-amber-500 text-slate-950 rounded-xl font-black text-[10px] hover:bg-amber-400 transition-all"
                    >
                      5000 惹货积分 / 1心币
                    </button>
                    <button 
                      onClick={() => {
                        if (credits >= 45000) {
                          setCredits(prev => prev - 45000);
                          setTickets(prev => prev + 10);
                        } else {
                          alert('惹货积分不足');
                        }
                      }}
                      className="px-4 py-2 bg-amber-600 text-white rounded-xl font-black text-[10px] hover:bg-amber-500 transition-all"
                    >
                      45000 惹货积分 / 10心币
                    </button>
                  </div>
                </div>

                {/* Shop Tabs */}
                <div className="flex gap-2 mb-6 p-1 bg-white/5 rounded-2xl border border-white/10">
                  {(['SKINS', 'BACKGROUNDS', 'BUTTONS'] as const).map(tab => (
                    <button
                      key={tab}
                      onClick={() => setShopTab(tab)}
                      className={`flex-1 py-3 rounded-xl font-black text-xs transition-all ${shopTab === tab ? 'bg-white text-slate-950 shadow-xl' : 'text-slate-500 hover:text-slate-300'}`}
                    >
                      {tab === 'SKINS' ? '战机皮肤' : tab === 'BACKGROUNDS' ? '场景背景' : '按键样式'}
                    </button>
                  ))}
                </div>

                <div className="flex-1 overflow-y-auto space-y-4 pr-2 custom-scrollbar">
                  {shopTab === 'SKINS' && skins.map(skin => (
                    <div 
                      key={skin.id}
                      className={`p-4 rounded-2xl border transition-all ${activeSkinId === skin.id ? 'bg-blue-500/20 border-blue-500 shadow-[0_0_20px_rgba(59,130,246,0.2)]' : 'bg-white/5 border-white/10'} ${skin.isLotteryExclusive && !skin.unlocked ? 'opacity-60 grayscale' : ''}`}
                    >
                      <div className="flex gap-4 items-center">
                        <SkinPreview skin={skin} size={80} onZoom={setZoomedSkin} />
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <h3 className="font-bold text-lg">{skin.name}</h3>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-black ${
                              skin.tier === 'MYTHIC' ? 'bg-red-600 text-white shadow-[0_0_15px_rgba(220,38,38,0.6)] ring-2 ring-red-400' :
                              skin.tier === 'LEGENDARY' ? 'bg-purple-600 text-white shadow-[0_0_10px_rgba(147,51,234,0.5)]' :
                              skin.tier === 'EPIC' ? 'bg-blue-600 text-white' :
                              skin.tier === 'RARE' ? 'bg-green-600 text-white' : 'bg-slate-500 text-white'
                            }`}>
                              {skin.tier === 'MYTHIC' ? '红 · 神话' : 
                               skin.tier === 'LEGENDARY' ? '紫 · 传说' : 
                               skin.tier === 'EPIC' ? '蓝 · 史诗' : 
                               skin.tier === 'RARE' ? '绿 · 稀有' : '白 · 普通'}
                            </span>
                            {skin.dynamicEffect && skin.dynamicEffect !== 'NONE' && (
                              <span className="text-[8px] px-2 py-0.5 rounded-full font-bold bg-white/10 text-white border border-white/20">
                                {skin.dynamicEffect === 'WATERFALL' ? '瀑布特效' : 
                                 skin.dynamicEffect === 'WATERCOLOR' ? '水彩特效' : 
                                 skin.dynamicEffect === 'CRYSTAL' ? '晶体特效' : 
                                 skin.dynamicEffect === 'FLAME' ? '火焰特效' :
                                 skin.dynamicEffect === 'GLOSS' ? '光泽特效' :
                                 skin.dynamicEffect === 'STORM' ? '风暴特效' : '霓虹脉冲'}
                              </span>
                            )}
                            {skin.isLotteryExclusive && (
                              <span className="text-[8px] px-2 py-0.5 rounded-full font-black bg-gradient-to-r from-indigo-500 to-purple-500 text-white animate-pulse">
                                抽奖专属
                              </span>
                            )}
                          </div>
                          <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[10px] text-slate-400">
                            <span>弹道: {skin.bulletShape === 'CANNONBALL' ? '重炮' : skin.bulletShape === 'INK_DROP' ? '墨滴' : skin.bulletShape === 'FIREBALL' ? '火球' : '标准'}</span>
                            <span>防御: +{skin.defenseBonus}</span>
                            <span>机动: x{skin.speedMultiplier}</span>
                            {skin.ability && skin.ability !== 'NONE' && (
                              <span className="text-amber-400 font-bold col-span-2">
                                特技: {skin.ability === 'BOMB' ? '自爆弹 (范围伤害)' : 
                                       skin.ability === 'SHIELD_REFLECT' ? '防御战术 (护盾反弹)' : 
                                       skin.ability === 'TIME_SLOW' ? '时空扭曲 (敌机减速)' : 
                                       skin.ability === 'CHAIN_SHOT' ? '连锁射击 (弹射)' : 
                                       skin.ability === 'TARGETED_STRIKE' ? '精准打击 (点击敌机发射)' :
                                       skin.ability === 'PHANTOM' ? '幽灵闪避 (概率免疫)' : '无'}
                              </span>
                            )}
                            {skin.hasDualShip && <span className="text-red-400 font-bold">双机并进</span>}
                          </div>
                        </div>
                        {skin.unlocked ? (
                          <button 
                            onClick={() => setActiveSkinId(skin.id)}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeSkinId === skin.id ? 'bg-blue-500 text-white' : 'bg-white/10 hover:bg-white/20'}`}
                          >
                            {activeSkinId === skin.id ? '已装备' : '装备'}
                          </button>
                        ) : skin.isLotteryExclusive ? (
                          <div className="px-4 py-2 bg-slate-800 text-slate-500 rounded-xl text-[10px] font-bold border border-white/5">
                            仅限心币抽奖
                          </div>
                        ) : (
                          <button 
                            onClick={() => {
                              if (credits >= skin.price) {
                                setCredits(prev => prev - skin.price);
                                setSkins(prev => prev.map(s => s.id === skin.id ? { ...s, unlocked: true } : s));
                              }
                            }}
                            disabled={credits < skin.price}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${credits >= skin.price ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-500 cursor-not-allowed'}`}
                          >
                            {skin.price} 惹货积分
                          </button>
                        )}
                      </div>
                    </div>
                  ))}

                  {shopTab === 'BACKGROUNDS' && backgrounds.map(bg => (
                    <div 
                      key={bg.id}
                      className={`p-4 rounded-2xl border transition-all ${bgType === bg.type ? 'bg-blue-500/20 border-blue-500' : 'bg-white/5 border-white/10'}`}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="font-bold text-lg">{bg.name}</h3>
                          <p className="text-[10px] text-slate-400">场景环境皮肤</p>
                        </div>
                        {bg.unlocked ? (
                          <button 
                            onClick={() => setBgType(bg.type)}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${bgType === bg.type ? 'bg-blue-500 text-white' : 'bg-white/10 hover:bg-white/20'}`}
                          >
                            {bgType === bg.type ? '已应用' : '应用'}
                          </button>
                        ) : (
                          <button 
                            onClick={() => {
                              if (credits >= bg.price) {
                                setCredits(prev => prev - bg.price);
                                setBackgrounds(prev => prev.map(b => b.id === bg.id ? { ...b, unlocked: true } : b));
                              }
                            }}
                            disabled={credits < bg.price}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${credits >= bg.price ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-500 cursor-not-allowed'}`}
                          >
                            {bg.price} 惹货积分
                          </button>
                        )}
                      </div>
                    </div>
                  ))}

                  {shopTab === 'BUTTONS' && buttonSkins.map(btn => (
                    <div 
                      key={btn.id}
                      className={`p-4 rounded-2xl border transition-all ${activeButtonSkin === btn.style ? 'bg-blue-500/20 border-blue-500' : 'bg-white/5 border-white/10'}`}
                    >
                      <div className="flex justify-between items-center">
                        <div>
                          <h3 className="font-bold text-lg">{btn.name}</h3>
                          <p className="text-[10px] text-slate-400">UI 交互样式</p>
                        </div>
                        {btn.unlocked ? (
                          <button 
                            onClick={() => setActiveButtonSkin(btn.style)}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${activeButtonSkin === btn.style ? 'bg-blue-500 text-white' : 'bg-white/10 hover:bg-white/20'}`}
                          >
                            {activeButtonSkin === btn.style ? '已应用' : '应用'}
                          </button>
                        ) : (
                          <button 
                            onClick={() => {
                              if (credits >= btn.price) {
                                setCredits(prev => prev - btn.price);
                                setButtonSkins(prev => prev.map(b => b.id === btn.id ? { ...b, unlocked: true } : b));
                              }
                            }}
                            disabled={credits < btn.price}
                            className={`px-4 py-2 rounded-xl text-xs font-bold transition-all ${credits >= btn.price ? 'bg-amber-500 text-slate-950' : 'bg-slate-800 text-slate-500 cursor-not-allowed'}`}
                          >
                            {btn.price} 惹货积分
                          </button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                <button 
                  onClick={() => setGameState('START')}
                  className={getButtonStyle("mt-8 w-full py-4 bg-white text-slate-950 rounded-xl font-bold")}
                >
                  返回
                </button>
              </motion.div>
            )}

            {gameState === 'PAUSED' && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-20 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center"
              >
                <div className="bg-slate-900/80 p-8 rounded-3xl border border-white/10 shadow-2xl text-center min-w-[280px]">
                  <h2 className="text-3xl font-bold mb-8">游戏暂停</h2>
                  <div className="space-y-4">
                    <button 
                      onClick={() => setGameState('PLAYING')}
                      className={getButtonStyle("w-full py-4 bg-white text-slate-950 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-slate-200 transition-colors")}
                    >
                      继续游戏 <Play className="w-4 h-4 fill-current" />
                    </button>
                    <button 
                      onClick={() => setGameState('START')}
                      className={getButtonStyle("w-full py-4 bg-white/10 text-white rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-white/20 transition-colors")}
                    >
                      退出到主菜单
                    </button>
                  </div>
                </div>
              </motion.div>
            )}

            {gameState === 'GAMEOVER' && (
              <motion.div 
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-20 bg-red-950/90 backdrop-blur-xl flex flex-col items-center justify-center p-8 text-center"
              >
                <motion.div
                  initial={{ scale: 0.9, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="max-w-md w-full"
                >
                  <h2 className="text-6xl font-black tracking-tighter mb-2 text-red-500">MISSION FAILED</h2>
                  <p className="text-slate-400 mb-12">战机已被摧毁，任务终止。</p>

                  <div className="grid grid-cols-2 gap-4 mb-12">
                    <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
                      <div className="text-xs text-slate-500 uppercase tracking-widest mb-1">Final Score</div>
                      <div className="text-3xl font-bold font-mono">{score.toLocaleString()}</div>
                    </div>
                    <div className="bg-white/5 p-6 rounded-2xl border border-white/10">
                      <div className="text-xs text-slate-500 uppercase tracking-widest mb-1">Max Level</div>
                      <div className="text-3xl font-bold font-mono">{level}</div>
                    </div>
                  </div>

                  <div className="mb-12">
                    <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest mb-4">解锁成就</h3>
                    <div className="flex flex-wrap justify-center gap-2">
                      {achievements.filter(a => a.unlocked).map(a => (
                        <div key={a.id} className="p-2 bg-blue-500/20 rounded-lg border border-blue-500/30" title={a.title}>
                          {a.icon}
                        </div>
                      ))}
                      {achievements.filter(a => a.unlocked).length === 0 && (
                        <p className="text-xs text-slate-600">本次航行未解锁任何成就</p>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-4">
                    <button 
                      onClick={resetGame}
                      className={getButtonStyle("w-full py-5 bg-white text-slate-950 rounded-2xl font-black text-xl flex items-center justify-center gap-3 hover:bg-slate-200 transition-all active:scale-95 shadow-[0_0_30px_rgba(255,255,255,0.3)]")}
                    >
                      再次挑战 <RotateCcw className="w-6 h-6" />
                    </button>

                    <div className="grid grid-cols-2 gap-4">
                      <button 
                        onClick={() => setGameState('SHOP')}
                        className={getButtonStyle("py-4 bg-blue-600 text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-blue-500 transition-all")}
                      >
                        机库整备 <Gamepad2 className="w-5 h-5" />
                      </button>
                      <button 
                        onClick={() => setGameState('START')}
                        className={getButtonStyle("py-4 bg-white/10 text-white rounded-2xl font-bold border border-white/10 flex items-center justify-center gap-2 hover:bg-white/20 transition-all")}
                      >
                        返回主页 <Home className="w-5 h-5" />
                      </button>
                    </div>
                  </div>
                </motion.div>
              </motion.div>
            )}

            {showLevelUp && (
              <motion.div
                initial={{ scale: 0.5, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 1.5, opacity: 0 }}
                className="absolute inset-0 z-30 flex items-center justify-center pointer-events-none"
              >
                <div className="text-center">
                  <motion.div 
                    animate={{ y: [0, -20, 0] }}
                    transition={{ duration: 1, repeat: Infinity }}
                    className="text-6xl font-black text-blue-400 drop-shadow-[0_0_30px_rgba(96,165,250,0.8)]"
                  >
                    LEVEL UP!
                  </motion.div>
                  <div className="text-xl font-bold text-white/60">难度已提升</div>
                </div>
              </motion.div>
            )}

            {lotteryState !== 'IDLE' && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="absolute inset-0 z-50 bg-slate-950/90 backdrop-blur-2xl flex flex-col items-center justify-center p-8"
              >
                <div className="relative w-64 h-64 mb-12">
                  {/* Turntable Visual */}
                  <motion.div 
                    animate={{ rotate: spinAngle }}
                    transition={{ type: 'tween', ease: 'linear' }}
                    className="w-full h-full rounded-full border-8 border-amber-500/30 relative overflow-hidden bg-slate-900 shadow-[0_0_50px_rgba(245,158,11,0.3)]"
                  >
                    {[...Array(8)].map((_, i) => (
                      <div 
                        key={`lottery-segment-${i}`}
                        className="absolute top-0 left-1/2 w-1 h-1/2 bg-white/10 origin-bottom"
                        style={{ transform: `translateX(-50%) rotate(${i * 45}deg)` }}
                      />
                    ))}
                    <div className="absolute inset-0 flex items-center justify-center">
                      <Ticket className="w-12 h-12 text-amber-500 opacity-20" />
                    </div>
                  </motion.div>
                  {/* Pointer */}
                  <div className="absolute -top-4 left-1/2 -translate-x-1/2 w-8 h-8 bg-amber-500 rotate-45 rounded-sm shadow-lg z-10" />
                </div>

                {lotteryState === 'SPINNING' ? (
                  <div className="text-center space-y-4">
                    <h2 className="text-2xl font-black tracking-widest animate-pulse text-amber-500">正在抽取至尊战机...</h2>
                    <p className="text-slate-500 text-sm">幸运女神正在眷顾你</p>
                  </div>
                ) : (
                  <motion.div 
                    initial={{ scale: 0.8, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="text-center space-y-8"
                  >
                    <div className="space-y-2">
                      <h2 className="text-sm font-bold text-amber-500 uppercase tracking-widest">恭喜获得</h2>
                      <h3 className="text-4xl font-black tracking-tighter text-white">{winningSkin?.name}</h3>
                      <div className="flex justify-center gap-2">
                        <span className="px-3 py-1 bg-pink-500 text-white text-[10px] font-black rounded-full shadow-lg shadow-pink-500/20">
                          {winningSkin?.tier}
                        </span>
                      </div>
                    </div>

                    <div className="w-32 h-32 mx-auto relative flex items-center justify-center">
                      <div className="absolute inset-0 bg-white/10 rounded-full blur-2xl animate-pulse" />
                      <Rocket className="w-16 h-16 relative z-10" style={{ color: winningSkin?.color }} />
                    </div>

                    <button 
                      onClick={() => {
                        setLotteryState('IDLE');
                        if (winningSkin) setActiveSkinId(winningSkin.id);
                      }}
                      className="px-12 py-4 bg-white text-slate-950 rounded-xl font-black text-lg hover:bg-amber-400 transition-all shadow-xl"
                    >
                      立即装备
                    </button>
                  </motion.div>
                )}
              </motion.div>
            )}
          </AnimatePresence>

          {/* Achievement Notification */}
          <AnimatePresence>
            {lastAchievement && (
              <motion.div
                initial={{ x: 100, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: 100, opacity: 0 }}
                className="absolute top-24 right-6 z-50 bg-slate-900/90 backdrop-blur-md border border-blue-500/50 p-4 rounded-2xl flex items-center gap-4 shadow-2xl"
              >
                <div className="w-12 h-12 rounded-xl bg-blue-500/20 flex items-center justify-center text-blue-400">
                  {lastAchievement.icon}
                </div>
                <div>
                  <div className="text-xs font-bold text-blue-400 uppercase tracking-widest">成就达成</div>
                  <div className="text-lg font-bold leading-tight">{lastAchievement.title}</div>
                  <div className="text-xs text-slate-400">{lastAchievement.description}</div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>
          <AnimatePresence>
            {zoomedSkin && (
              <SkinZoomModal 
                skin={zoomedSkin} 
                onClose={() => setZoomedSkin(null)} 
              />
            )}
          </AnimatePresence>
        </motion.div>
      </main>

      {/* Mobile Footer - Score & Lives */}
      <footer className="lg:hidden p-6 bg-slate-900/50 backdrop-blur-xl border-t border-white/10 flex justify-between items-center">
        <div className="flex items-center gap-4">
          <Rocket className="w-6 h-6 text-blue-400" />
          <div>
            <div className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Tina星际先锋</div>
            <div className="text-sm font-bold">Ace Pilot Mode</div>
          </div>
        </div>
        <button 
          onClick={() => setGameState('PAUSED')}
          className="p-3 bg-white/10 rounded-xl hover:bg-white/20 transition-colors"
        >
          <Pause className="w-5 h-5" />
        </button>
      </footer>
    </div>
  );
}
