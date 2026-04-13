/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { motion, AnimatePresence } from "motion/react";
import { useState, useEffect, useRef } from "react";

/**
 * Relaxed & Flexible Heart (Jump, Rain, Re-form)
 * A large heart that jumps, scatters like rain, and slowly re-forms.
 */

const PARTICLE_COUNT = 4000; // Increased for even more numerous edges
const COLOR_OPTIONS = [
  { name: "Red", value: "#ff3366" },
  { name: "Yellow", value: "#ffcc00" },
  { name: "Green", value: "#00ff99" },
  { name: "Blue", value: "#0099ff" },
];

class Particle {
  x: number;
  y: number;
  hx: number;
  hy: number;
  rx: number;
  ry: number;
  size: number;
  baseSize: number;
  color: string;
  flashSpeed: number;
  angle: number;
  dist: number;
  loosenessX: number;
  loosenessY: number;
  scatterFactor: number;
  
  // Rain properties
  vx: number = 0;
  vy: number = 0;
  rainDelay: number;

  constructor(canvasWidth: number, canvasHeight: number, baseColor: string) {
    this.rx = Math.random() * canvasWidth;
    this.ry = Math.random() * canvasHeight;
    this.x = this.rx;
    this.y = this.ry;

    const t = Math.random() * Math.PI * 2;
    const rBase = Math.sqrt(Math.random());
    // Edge particles are more numerous due to the distribution
    const r = rBase * (0.7 + Math.random() * 0.7); 
    
    const hxRaw = 16 * Math.pow(Math.sin(t), 3);
    const hyRaw = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t));
    
    const scale = Math.min(canvasWidth, canvasHeight) * 0.032; // Enlarged heart
    this.hx = canvasWidth / 2 + (hxRaw * r) * scale;
    this.hy = canvasHeight * 0.45 + (hyRaw * r) * scale;

    this.angle = Math.atan2(this.hy - canvasHeight * 0.45, this.hx - canvasWidth / 2);
    this.dist = Math.sqrt(Math.pow(this.hx - canvasWidth / 2, 2) + Math.pow(this.hy - canvasHeight * 0.45, 2));

    this.baseSize = Math.random() * 1.5 + 0.5; // Slightly larger for clarity
    this.size = this.baseSize;
    this.color = baseColor;
    this.flashSpeed = 0.02 + Math.random() * 0.06;
    
    this.loosenessX = Math.random() * 60 - 30;
    this.loosenessY = Math.random() * 60 - 30;
    this.scatterFactor = 0.4 + Math.random() * 2.0;
    
    this.rainDelay = Math.random() * 20;
    this.vx = (Math.random() - 0.5) * 1.5; // Reduced horizontal spread
    this.vy = 1.5 + Math.random() * 3; // Reduced vertical speed to keep it visible longer
  }

  update(isFormed: boolean, phase: string, progress: number, pulseScale: number, pulseJump: number, burstPower: number) {
    if (!isFormed) {
      this.x = this.rx;
      this.y = this.ry;
      return;
    }

    const centerX = window.innerWidth / 2;
    const centerY = window.innerHeight * 0.45;

    if (phase === "rain") {
      // Scatter like rain with a more contained burst
      const burstScale = progress < 0.1 ? 1.5 : 1; // More contained burst
      this.x += this.vx * burstScale;
      this.y += this.vy * burstScale;
      // Shrink size less aggressively
      this.size = this.baseSize * (1 - progress * 0.4);
    } else if (phase === "forming") {
      // Slowly combine back with a "relaxed downwards" sag
      const sag = Math.sin(progress * Math.PI) * 40; // Increased downward sag
      const targetX = this.hx + Math.sin(Date.now() * 0.002 + this.loosenessX) * 8;
      const targetY = this.hy + Math.cos(Date.now() * 0.002 + this.loosenessY) * 8 + sag;
      
      this.x += (targetX - this.x) * 0.03; // Even slower, more relaxed re-form
      this.y += (targetY - this.y) * 0.03;
      this.size = this.baseSize * (0.3 + progress * 0.7);
    } else {
      // Normal pulsating shape - Expanding outwards a lot
      const dx = (this.hx - centerX) * pulseScale;
      const dy = (this.hy - centerY) * pulseScale - pulseJump;
      
      const effectiveBurst = burstPower * this.scatterFactor;
      const fanOut = Math.cos(this.angle) * this.dist * effectiveBurst;
      const fanOutY = Math.sin(this.angle) * this.dist * effectiveBurst;

      const time = Date.now() * 0.002;
      const driftX = Math.sin(time + this.loosenessX) * 5;
      const driftY = Math.cos(time + this.loosenessY) * 5;

      this.x = centerX + dx + fanOut + driftX;
      this.y = centerY + dy + fanOutY + driftY;
      this.size = this.baseSize;
      
      // Reset rain velocities for next cycle
      this.vx = (Math.random() - 0.5) * 4;
      this.vy = 2 + Math.random() * 6;
    }
  }

  draw(ctx: CanvasRenderingContext2D, currentTime: number, activeColor: string) {
    const opacity = 0.4 + Math.abs(Math.sin(currentTime * this.flashSpeed)) * 0.6;
    ctx.fillStyle = activeColor;
    ctx.globalAlpha = opacity;
    
    // Diamond-like gemstone shape
    ctx.beginPath();
    ctx.moveTo(this.x, this.y - this.size);
    ctx.lineTo(this.x + this.size, this.y);
    ctx.lineTo(this.x, this.y + this.size);
    ctx.lineTo(this.x - this.size, this.y);
    ctx.closePath();
    ctx.fill();
    
    if (opacity > 0.9) {
      ctx.shadowBlur = 8;
      ctx.shadowColor = activeColor;
    } else {
      ctx.shadowBlur = 0;
    }
  }
}

export default function App() {
  const [isFormed, setIsFormed] = useState(false);
  const [activeColorIndex, setActiveColorIndex] = useState(0);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const requestRef = useRef<number>(null);
  
  const scaleRef = useRef(1);
  const jumpRef = useRef(0);
  const burstRef = useRef(0);
  const phaseRef = useRef("normal");
  const phaseProgressRef = useRef(0);
  const frameCountRef = useRef(0);

  const activeColor = COLOR_OPTIONS[activeColorIndex].value;

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const handleResize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
      const newParticles = [];
      for (let i = 0; i < PARTICLE_COUNT; i++) {
        newParticles.push(new Particle(canvas.width, canvas.height, activeColor));
      }
      particlesRef.current = newParticles;
    };

    handleResize();
    window.addEventListener("resize", handleResize);

    const animate = () => {
      const currentTime = Date.now();
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Extended Cycle: Pulse, Pulse, Jump, Rain, Form
      const cycleLength = 400;
      const cycle = frameCountRef.current % cycleLength;
      
      if (isFormed) {
        if (cycle < 30) { // Pulse 1
          phaseRef.current = "normal";
          const p = cycle / 30;
          scaleRef.current = 1 + Math.sin(p * Math.PI) * 0.25; // Increased expansion
          burstRef.current = Math.sin(p * Math.PI) * 0.4; // Increased burst
        } else if (cycle < 55) { // Pause
          scaleRef.current = 1;
          burstRef.current = 0;
        } else if (cycle < 85) { // Pulse 2
          const p = (cycle - 55) / 30;
          scaleRef.current = 1 + Math.sin(p * Math.PI) * 0.35; // Increased expansion
          burstRef.current = Math.sin(p * Math.PI) * 0.6; // Increased burst
        } else if (cycle < 110) { // Pause
          scaleRef.current = 1;
          burstRef.current = 0;
        } else if (cycle < 140) { // Big Jump
          const p = (cycle - 110) / 30;
          scaleRef.current = 1 + Math.sin(p * Math.PI) * 0.5; // Massive expansion
          jumpRef.current = Math.sin(p * Math.PI) * 80; // Higher jump
          burstRef.current = Math.sin(p * Math.PI) * 1.5; // Massive burst
        } else if (cycle < 280) { // Rain Down (Scatter)
          phaseRef.current = "rain";
          phaseProgressRef.current = (cycle - 140) / 140;
          scaleRef.current = 1;
          jumpRef.current = 0;
          burstRef.current = 0;
        } else if (cycle < 400) { // Re-form
          phaseRef.current = "forming";
          phaseProgressRef.current = (cycle - 280) / 120;
        } else {
          phaseRef.current = "normal";
        }
      }

      particlesRef.current.forEach((p) => {
        p.update(isFormed, phaseRef.current, phaseProgressRef.current, scaleRef.current, jumpRef.current, burstRef.current);
        p.draw(ctx, currentTime, activeColor);
      });

      frameCountRef.current++;
      requestRef.current = requestAnimationFrame(animate);
    };

    requestRef.current = requestAnimationFrame(animate);
    const timer = setTimeout(() => setIsFormed(true), 600);

    return () => {
      window.removeEventListener("resize", handleResize);
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
      clearTimeout(timer);
    };
  }, [isFormed, activeColor]);

  return (
    <div className="relative w-full h-screen flex items-center justify-center overflow-hidden bg-black font-sans">
      {/* Soft Background Glow */}
      <motion.div 
        animate={{ 
          opacity: isFormed ? [0.03, 0.1, 0.03] : 0.02,
          scale: isFormed ? [1, 1.5, 1] : 1
        }}
        transition={{ duration: 4, repeat: Infinity }}
        className="absolute inset-0"
        style={{ background: `radial-gradient(circle_at_50%_50%, ${activeColor}15 0%, transparent 85%)` }}
      />

      {/* Canvas Particle Field */}
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full pointer-events-none"
      />

      {/* Relaxed Intro Text */}
      <AnimatePresence>
        {isFormed && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.5, duration: 1.5 }}
            className="absolute bottom-32 text-center z-30"
          >
            <h1 className="text-4xl md:text-6xl font-display font-extralight tracking-[0.2em] text-white/80">
              RELAXED <span style={{ color: activeColor }} className="font-light">HEART</span>
            </h1>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Color Selection Options */}
      <motion.div 
        initial={{ opacity: 0, y: 50 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1, duration: 1 }}
        className="absolute bottom-12 flex gap-6 z-40"
      >
        {COLOR_OPTIONS.map((opt, i) => (
          <button
            key={i}
            onClick={() => setActiveColorIndex(i)}
            className={`w-10 h-10 rounded-full border-2 transition-all duration-300 ${activeColorIndex === i ? "border-white scale-125" : "border-transparent opacity-50 hover:opacity-100"}`}
            style={{ backgroundColor: opt.value, boxShadow: activeColorIndex === i ? `0 0 20px ${opt.value}` : "none" }}
            aria-label={`Select ${opt.name} color`}
          />
        ))}
      </motion.div>

      {/* Vignette */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_50%_50%,_transparent_0%,_rgba(0,0,0,0.9)_100%)]" />
    </div>
  );
}
