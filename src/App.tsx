import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Trophy, 
  Timer, 
  RotateCcw, 
  Play, 
  Eye, 
  Info, 
  Sparkles,
  ChevronRight,
  AlertCircle,
  CheckCircle2
} from 'lucide-react';

// --- Types ---

type GameState = 'START' | 'PLAYING' | 'RESULT';

interface Color {
  h: number;
  s: number;
  l: number;
}

interface LevelData {
  baseColor: Color;
  targetColor: Color;
  targetIndex: number;
  delta: number;
  channel: 'Hue' | 'Saturation' | 'Lightness';
}

interface CategoryResult {
  name: string;
  correct: number;
  total: number;
}

// --- Constants ---

const GRID_SIZE = 5;
const TOTAL_CELLS = GRID_SIZE * GRID_SIZE;
const QUESTIONS_PER_CATEGORY = 5;

const CATEGORIES = [
  { name: '红色系', h: 0, s: 70, l: 50 },
  { name: '橙色系', h: 30, s: 80, l: 50 },
  { name: '黄色系', h: 60, s: 80, l: 50 },
  { name: '黄绿色', h: 90, s: 70, l: 50 },
  { name: '绿色系', h: 120, s: 60, l: 50 },
  { name: '青色系', h: 180, s: 70, l: 50 },
  { name: '蓝色系', h: 240, s: 60, l: 50 },
  { name: '紫色系', h: 300, s: 70, l: 50 },
  { name: '粉色系', h: 330, s: 75, l: 60 },
  { name: '中性灰', h: 0, s: 0, l: 50 },
];

const INITIAL_DELTA = 8;
const MIN_DELTA = 0.1;

// --- Helpers ---

const randomRange = (min: number, max: number) => Math.floor(Math.random() * (max - min + 1)) + min;

const colorToCss = (color: Color) => `hsl(${color.h}, ${color.s}%, ${color.l}%)`;

const getTargetColor = (base: Color, delta: number): { color: Color, channel: LevelData['channel'] } => {
  const channels: LevelData['channel'][] = ['Hue', 'Saturation', 'Lightness'];
  // For gray scale, only lightness makes sense to shift
  const channel = base.s === 0 ? 'Lightness' : channels[randomRange(0, 2)];
  const direction = Math.random() > 0.5 ? 1 : -1;
  
  const target = { ...base };
  if (channel === 'Hue') target.h = (target.h + delta * 1.2 * direction + 360) % 360;
  if (channel === 'Saturation') target.s = Math.min(100, Math.max(0, target.s + delta * direction));
  if (channel === 'Lightness') target.l = Math.min(100, Math.max(0, target.l + delta * direction));
  
  return { color: target, channel };
};

// --- Components ---

export default function App() {
  const [gameState, setGameState] = useState<GameState>('START');
  const [categoryIndex, setCategoryIndex] = useState(0);
  const [questionIndex, setQuestionIndex] = useState(0);
  const [results, setResults] = useState<CategoryResult[]>([]);
  const [levelData, setLevelData] = useState<LevelData | null>(null);
  const [lastChoiceCorrect, setLastChoiceCorrect] = useState<boolean | null>(null);

  // Generate a new level based on current test progress
  const nextLevel = useCallback((catIdx: number, qIdx: number) => {
    const cat = CATEGORIES[catIdx];
    const base: Color = {
      h: (cat.h + randomRange(-10, 10) + 360) % 360,
      s: cat.s === 0 ? 0 : Math.min(90, Math.max(30, cat.s + randomRange(-10, 10))),
      l: Math.min(70, Math.max(30, cat.l + randomRange(-10, 10))),
    };

    // Continuous difficulty progression across all questions
    const totalQuestions = CATEGORIES.length * QUESTIONS_PER_CATEGORY;
    const currentTotalIdx = catIdx * QUESTIONS_PER_CATEGORY + qIdx;
    const deltaRange = INITIAL_DELTA - MIN_DELTA;
    const step = deltaRange / (totalQuestions - 1);
    const delta = Math.max(MIN_DELTA, INITIAL_DELTA - (currentTotalIdx * step));

    const { color: target, channel } = getTargetColor(base, delta);
    const targetIndex = Math.floor(Math.random() * TOTAL_CELLS);

    setLevelData({
      baseColor: base,
      targetColor: target,
      targetIndex,
      delta,
      channel
    });
    setLastChoiceCorrect(null);
  }, []);

  // Start test
  const startTest = () => {
    setCategoryIndex(0);
    setQuestionIndex(0);
    setResults(CATEGORIES.map(c => ({ name: c.name, correct: 0, total: QUESTIONS_PER_CATEGORY })));
    setGameState('PLAYING');
    nextLevel(0, 0);
  };

  // Handle click
  const handleCellClick = (index: number) => {
    if (gameState !== 'PLAYING' || !levelData) return;

    const isCorrect = index === levelData.targetIndex;
    setLastChoiceCorrect(isCorrect);

    // Update results
    setResults(prev => prev.map((res, i) => {
      if (i === categoryIndex && isCorrect) {
        return { ...res, correct: res.correct + 1 };
      }
      return res;
    }));

    // Move to next question or category
    setTimeout(() => {
      if (questionIndex < QUESTIONS_PER_CATEGORY - 1) {
        // Next question in same category
        const nextQ = questionIndex + 1;
        setQuestionIndex(nextQ);
        nextLevel(categoryIndex, nextQ);
      } else if (categoryIndex < CATEGORIES.length - 1) {
        // Next category
        const nextC = categoryIndex + 1;
        setCategoryIndex(nextC);
        setQuestionIndex(0);
        nextLevel(nextC, 0);
      } else {
        // Test finished
        setGameState('RESULT');
      }
    }, 600);
  };

  const totalCorrect = results.reduce((acc, curr) => acc + curr.correct, 0);
  const totalQuestions = CATEGORIES.length * QUESTIONS_PER_CATEGORY;
  const accuracy = totalQuestions > 0 ? Math.round((totalCorrect / totalQuestions) * 100) : 0;

  const bestCategory = results.length > 0 
    ? [...results].sort((a, b) => b.correct - a.correct)[0]
    : null;

  return (
    <div className="min-h-screen flex flex-col items-center justify-center p-4 md:p-8 bg-slate-950 text-slate-50">
      {/* Background Decorative Elements */}
      <div className="fixed inset-0 -z-10 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] bg-blue-500/10 blur-[120px] rounded-full" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-purple-500/10 blur-[120px] rounded-full" />
      </div>

      <div className="w-full max-w-2xl">
        {/* Header */}
        <header className="flex flex-col items-center mb-8 text-center">
          <motion.div 
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            className="flex items-center gap-2 mb-2"
          >
            <Sparkles className="text-amber-400 w-6 h-6" />
            <h1 className="text-4xl md:text-5xl font-display font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
              ColorChallenge
            </h1>
          </motion.div>
          <p className="text-slate-400 text-sm md:text-base max-w-md">
            色彩敏感度测试 — 专为艺术生设计的专业评估
          </p>
        </header>

        {/* Game Container */}
        <main className="relative bg-slate-900/50 backdrop-blur-xl border border-white/10 rounded-3xl p-6 md:p-8 shadow-2xl overflow-hidden">
          
          <AnimatePresence mode="wait">
            {gameState === 'START' && (
              <motion.div 
                key="start"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="flex flex-col items-center py-12"
              >
                <div className="w-24 h-24 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center mb-8 shadow-lg shadow-blue-500/20">
                  <Play className="w-12 h-12 text-white fill-white ml-1" />
                </div>
                <h2 className="text-2xl font-display font-semibold mb-4">开始色彩敏感度测试</h2>
                <p className="text-slate-400 text-center mb-8 max-w-xs">
                  测试包含 10 个色系，共 50 道题。每题只有一次机会，请仔细观察。
                </p>
                <button 
                  onClick={startTest}
                  className="group relative px-8 py-4 bg-white text-slate-950 font-bold rounded-2xl transition-all hover:scale-105 active:scale-95 flex items-center gap-2"
                >
                  开始测试
                  <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </button>
              </motion.div>
            )}

            {gameState === 'PLAYING' && levelData && (
              <motion.div 
                key="playing"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="space-y-6"
              >
                {/* HUD */}
                <div className="grid grid-cols-2 gap-4 bg-white/5 p-4 rounded-2xl border border-white/5">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-blue-500/20 rounded-lg">
                      <Eye className="w-5 h-5 text-blue-400" />
                    </div>
                    <div>
                      <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">当前色系</div>
                      <div className="text-xl font-display font-bold leading-none">{CATEGORIES[categoryIndex].name}</div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3 justify-end">
                    <div className="text-right">
                      <div className="text-[10px] uppercase tracking-widest text-slate-500 font-bold">进度</div>
                      <div className="text-xl font-display font-bold leading-none text-emerald-400">
                        {questionIndex + 1} / {QUESTIONS_PER_CATEGORY}
                      </div>
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="w-full h-1 bg-white/5 rounded-full overflow-hidden">
                  <motion.div 
                    className="h-full bg-blue-500"
                    initial={{ width: 0 }}
                    animate={{ width: `${((categoryIndex * QUESTIONS_PER_CATEGORY + questionIndex + 1) / totalQuestions) * 100}%` }}
                  />
                </div>

                {/* Grid */}
                <div className="color-grid aspect-square w-full max-w-[400px] mx-auto">
                  {Array.from({ length: TOTAL_CELLS }).map((_, i) => (
                    <motion.button
                      key={i}
                      whileHover={lastChoiceCorrect === null ? { scale: 0.98 } : {}}
                      whileTap={lastChoiceCorrect === null ? { scale: 0.95 } : {}}
                      onClick={() => handleCellClick(i)}
                      disabled={lastChoiceCorrect !== null}
                      className={`w-full h-full rounded-lg md:rounded-xl shadow-sm transition-all border-2 ${
                        lastChoiceCorrect !== null && i === levelData.targetIndex 
                          ? 'border-emerald-400 scale-95 z-10' 
                          : lastChoiceCorrect === false && i !== levelData.targetIndex
                          ? 'opacity-50'
                          : 'border-transparent'
                      }`}
                      style={{ 
                        backgroundColor: i === levelData.targetIndex 
                          ? colorToCss(levelData.targetColor) 
                          : colorToCss(levelData.baseColor) 
                      }}
                    />
                  ))}
                </div>

                {/* Feedback */}
                <div className="h-6 flex justify-center items-center">
                  <AnimatePresence>
                    {lastChoiceCorrect === false && (
                      <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0 }}
                        className="flex items-center gap-2 text-red-400 text-sm font-medium"
                      >
                        <AlertCircle className="w-4 h-4" />
                        观察不够仔细哦
                      </motion.div>
                    )}
                    {lastChoiceCorrect === true && (
                      <motion.div 
                        initial={{ opacity: 0, scale: 0.5 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0 }}
                        className="flex items-center gap-2 text-emerald-400 text-sm font-medium"
                      >
                        <CheckCircle2 className="w-4 h-4" />
                        非常敏锐！
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              </motion.div>
            )}

            {gameState === 'RESULT' && (
              <motion.div 
                key="result"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="flex flex-col items-center py-4"
              >
                <div className="text-blue-400 mb-4 p-4 bg-blue-400/10 rounded-full">
                  <Trophy className="w-12 h-12" />
                </div>
                <h2 className="text-3xl font-display font-bold mb-2">测试完成</h2>
                <div className="text-slate-400 mb-8 text-center">
                  你的色彩敏感度综合评分为 <span className="text-white font-bold">{accuracy}</span> 分
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full mb-8">
                  <div className="bg-white/5 p-6 rounded-2xl border border-white/5 flex flex-col items-center justify-center">
                    <div className="text-xs text-slate-500 uppercase font-bold mb-2">综合准确率</div>
                    <div className="text-4xl font-display font-bold text-blue-400">{accuracy}%</div>
                  </div>
                  <div className="bg-white/5 p-6 rounded-2xl border border-white/5 flex flex-col items-center justify-center">
                    <div className="text-xs text-slate-500 uppercase font-bold mb-2">最擅长色系</div>
                    <div className="text-2xl font-display font-bold text-emerald-400">{bestCategory?.name}</div>
                    <div className="text-xs text-slate-500 mt-1">准确率: {bestCategory ? Math.round((bestCategory.correct / bestCategory.total) * 100) : 0}%</div>
                  </div>
                </div>

                {/* Detailed Results */}
                <div className="w-full space-y-3 mb-8">
                  <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest px-2">详细报告</h3>
                  {results.map((res, i) => (
                    <div key={i} className="bg-white/5 p-4 rounded-xl border border-white/5 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: `hsl(${CATEGORIES[i].h}, 70%, 50%)` }} />
                        <span className="text-sm font-medium">{res.name}</span>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="w-24 h-1.5 bg-white/5 rounded-full overflow-hidden">
                          <div className="h-full bg-blue-500/50" style={{ width: `${(res.correct / res.total) * 100}%` }} />
                        </div>
                        <span className="text-xs font-mono text-slate-400">{res.correct} / {res.total}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <button 
                  onClick={startTest}
                  className="w-full py-4 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-2xl transition-all flex items-center justify-center gap-2 shadow-lg shadow-blue-600/20"
                >
                  <RotateCcw className="w-5 h-5" />
                  重新测试
                </button>
              </motion.div>
            )}
          </AnimatePresence>

        </main>

        {/* Footer Info */}
        <footer className="mt-8 flex flex-col items-center gap-4">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2 text-slate-500 text-xs">
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
              专业色彩评估
            </div>
            <div className="flex items-center gap-2 text-slate-500 text-xs">
              <Eye className="w-4 h-4 text-blue-500" />
              艺术生训练
            </div>
          </div>
          <p className="text-[10px] text-slate-600 uppercase tracking-widest font-bold">
            Sharp eye for color, one pixel at a time
          </p>
        </footer>
      </div>
    </div>
  );
}

