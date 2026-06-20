'use client';

import { useEffect, useRef, useState } from 'react';
import { useRaceStore } from '@/stores/useRaceStore';
import { buildTrackGeometry, getPointOnTrack, TrackGeometry, Point, isCurrentlyInDrsZone } from '@/lib/canvas/track-geometry';
import type { SimulationData, RaceFrame, FramePosition } from '@/types/database';

interface RaceCanvasProps {
  trackName: string;
  simulationData: SimulationData;
  playerTeamId: string | null;
  baseLapTime: number;
  cameraMode: 'map' | 'driver';
  focusedDriverId: string | null;
  onCameraModeChange: (mode: 'map' | 'driver') => void;
  onFocusedDriverChange: (driverId: string | null) => void;
  onProgressTick: (progress: number) => void;
}

export default function RaceCanvas({
  trackName,
  simulationData,
  playerTeamId,
  baseLapTime,
  cameraMode,
  focusedDriverId,
  onCameraModeChange,
  onFocusedDriverChange,
  onProgressTick,
}: RaceCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const containerRef = useRef<HTMLDivElement | null>(null);
  
  const { currentFrame, isPlaying, playbackSpeed, nextFrame } = useRaceStore();

  const [dimensions, setDimensions] = useState({ width: 600, height: 400 });
  const [geometry, setGeometry] = useState<TrackGeometry | null>(null);
  const [latestEvents, setLatestEvents] = useState<string[]>([]);

  // Animation progress variables
  const animationRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number>(0);
  const subFrameProgressRef = useRef<number>(0);
  const lastReportedProgressRef = useRef<number>(0);

  // Camera Smooth Target Tracking Refs
  const cameraXRef = useRef<number>(50);
  const cameraYRef = useRef<number>(50);
  const cameraZoomRef = useRef<number>(1.0);

  // Motion Trails Ref: stores past track coordinates [0-1] for each driver
  const trailsRef = useRef<Record<string, number[]>>({});

  // Cache latest values in refs to avoid rebuilding the rAF loop
  const stateRef = useRef({
    currentFrame,
    isPlaying,
    playbackSpeed,
    totalFrames: simulationData.frames.length,
    cameraMode,
    focusedDriverId,
  });

  useEffect(() => {
    stateRef.current = {
      currentFrame,
      isPlaying,
      playbackSpeed,
      totalFrames: simulationData.frames.length,
      cameraMode,
      focusedDriverId,
    };
  }, [currentFrame, isPlaying, playbackSpeed, simulationData, cameraMode, focusedDriverId]);

  // Load track geometry on mount / track change
  useEffect(() => {
    const geo = buildTrackGeometry(trackName);
    setGeometry(geo);
  }, [trackName]);

  // Load latest events from frame for floating HUD
  const activeFrame = simulationData.frames[currentFrame];
  useEffect(() => {
    if (activeFrame && activeFrame.events && activeFrame.events.length > 0) {
      setLatestEvents(activeFrame.events.slice(-2));
      const timer = setTimeout(() => {
        setLatestEvents([]);
      }, 4000);
      return () => clearTimeout(timer);
    } else {
      setLatestEvents([]);
    }
  }, [currentFrame, activeFrame]);

  // Handle container resizing
  useEffect(() => {
    if (!containerRef.current) return;

    const handleResize = () => {
      if (containerRef.current) {
        setDimensions({
          width: containerRef.current.clientWidth,
          height: containerRef.current.clientHeight || 350,
        });
      }
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    const timer = setTimeout(handleResize, 100);

    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(timer);
    };
  }, []);

  // When frame changes, reset interpolation sub-progress
  const prevFrameRef = useRef(currentFrame);
  if (prevFrameRef.current !== currentFrame) {
    subFrameProgressRef.current = 0;
    lastReportedProgressRef.current = 0;
    onProgressTick(0);
    prevFrameRef.current = currentFrame;
  }

  // Helper: Hex color to RGB object
  const hexToRgb = (hex: string): { r: number; g: number; b: number } => {
    let clean = hex.replace('#', '');
    if (clean.length === 3) {
      clean = clean.split('').map(c => c + c).join('');
    }
    const num = parseInt(clean, 16);
    return {
      r: (num >> 16) & 255,
      g: (num >> 8) & 255,
      b: num & 255,
    };
  };

  // Animation loop
  useEffect(() => {
    if (!geometry) return;

    const render = (timestamp: number) => {
      if (!lastTimeRef.current) lastTimeRef.current = timestamp;
      const elapsed = timestamp - lastTimeRef.current;
      lastTimeRef.current = timestamp;

      const { isPlaying: playing, playbackSpeed: speed } = stateRef.current;

      const lapDurationMs = 5000;

      if (playing) {
        subFrameProgressRef.current += (elapsed / lapDurationMs) * speed;

        if (subFrameProgressRef.current >= 1.0) {
          subFrameProgressRef.current = 0;
          nextFrame(); // Advance lap
          lastReportedProgressRef.current = 0;
          onProgressTick(0);
        } else {
          // Throttled progress reporting to avoid React re-render lag (every 0.05 progress, ~20 times per lap)
          if (Math.abs(subFrameProgressRef.current - lastReportedProgressRef.current) >= 0.05) {
            lastReportedProgressRef.current = subFrameProgressRef.current;
            onProgressTick(subFrameProgressRef.current);
          }
        }
      }

      draw(subFrameProgressRef.current, timestamp);
      animationRef.current = requestAnimationFrame(render);
    };

    animationRef.current = requestAnimationFrame(render);

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
      lastTimeRef.current = 0;
    };
  }, [geometry, onProgressTick]);

  // Drawing method
  const draw = (progress: number, timestamp: number) => {
    const canvas = canvasRef.current;
    if (!canvas || !geometry) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const { width, height } = dimensions;
    const { cameraMode: activeCam, focusedDriverId: activeFocus } = stateRef.current;

    // Clear Canvas
    ctx.clearRect(0, 0, width, height);

    // Coordinate mapping constants (padding reduced to 16 to display track much larger)
    const padding = 16;
    const scale = Math.min((width - padding * 2) / 100, (height - padding * 2) / 100);
    const offsetX = (width - scale * 100) / 2;
    const offsetY = (height - scale * 100) / 2;

    const mapPoint = (p: Point): Point => ({
      x: offsetX + p.x * scale,
      y: offsetY + p.y * scale,
    });

    // ─── CAMERA TARGET SETTING ──────────────────────────────────────────
    let targetCameraX = 50;
    let targetCameraY = 50;
    let targetZoom = 1.0;

    const { currentFrame: frameIdx } = stateRef.current;
    const activeFrameData = simulationData.frames[frameIdx];

    if (activeCam === 'driver' && activeFocus && activeFrameData) {
      const car = activeFrameData.positions.find(p => p.driver_id === activeFocus);
      if (car) {
        const prevFrame = frameIdx > 0 ? simulationData.frames[frameIdx - 1] : null;
        const prevCar = prevFrame?.positions.find(p => p.driver_id === car.driver_id);
        const prevGap = prevCar ? prevCar.gap_to_leader : (car.position * 0.15);
        const currGap = car.gap_to_leader;
        const interpolatedGap = prevGap + progress * (currGap - prevGap);

        let carProgress = progress - (interpolatedGap / baseLapTime);
        carProgress = ((carProgress % 1) + 1) % 1;

        const coord = getPointOnTrack(geometry, carProgress);
        targetCameraX = coord.x;
        targetCameraY = coord.y;
        targetZoom = 2.5;
      }
    }

    // Smooth camera movements via linear interpolation (lerp)
    cameraXRef.current += (targetCameraX - cameraXRef.current) * 0.08;
    cameraYRef.current += (targetCameraY - cameraYRef.current) * 0.08;
    cameraZoomRef.current += (targetZoom - cameraZoomRef.current) * 0.08;

    const zoom = cameraZoomRef.current;
    const cameraX = cameraXRef.current;
    const cameraY = cameraYRef.current;

    // Apply Camera Transforms
    ctx.save();
    
    // 1. Shift to center of screen
    ctx.translate(width / 2, height / 2);
    // 2. Apply zoom scaling
    ctx.scale(zoom, zoom);
    // 3. Shift negative camera target
    const mappedCamX = offsetX + cameraX * scale;
    const mappedCamY = offsetY + cameraY * scale;
    ctx.translate(-mappedCamX, -mappedCamY);

    // ─── DRAW TRACK ROADWAYS ──────────────────────────────────────────
    ctx.beginPath();
    geometry.points.forEach((p, idx) => {
      const mapped = mapPoint(p);
      if (idx === 0) ctx.moveTo(mapped.x, mapped.y);
      else ctx.lineTo(mapped.x, mapped.y);
    });
    ctx.closePath();
    
    // 1. Red Checkered Curbs (outer layer)
    ctx.strokeStyle = '#dc2626';
    ctx.lineWidth = 14 / zoom;
    ctx.setLineDash([8 / zoom, 8 / zoom]);
    ctx.stroke();

    // 2. White Checkered Curbs (alternating offset overlay)
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 14 / zoom;
    ctx.setLineDash([8 / zoom, 8 / zoom]);
    ctx.lineDashOffset = 8 / zoom;
    ctx.stroke();
    ctx.lineDashOffset = 0; // reset offset

    // 3. Main Asphalt Road (covers inner portion of curbs, leaving a 2px curb on each edge)
    ctx.strokeStyle = '#1e1b1b';
    ctx.lineWidth = 10 / zoom;
    ctx.setLineDash([]);
    ctx.stroke();

    // 4. Center lane markers (dashed centerline)
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.lineWidth = 1 / zoom;
    ctx.setLineDash([4 / zoom, 6 / zoom]);
    ctx.stroke();
    ctx.setLineDash([]); // Reset dash

    // ─── DRAW START / FINISH LINE ────────────────────────────────────
    const startPoint = mapPoint(geometry.points[0]);
    const secondPoint = mapPoint(geometry.points[1]);
    const sdx = secondPoint.x - startPoint.x;
    const sdy = secondPoint.y - startPoint.y;
    const startAngle = Math.atan2(sdy, sdx);

    ctx.save();
    ctx.translate(startPoint.x, startPoint.y);
    ctx.rotate(startAngle);
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2.5 / zoom;
    ctx.beginPath();
    ctx.moveTo(0, -5 / zoom);
    ctx.lineTo(0, 5 / zoom);
    ctx.stroke();
    ctx.restore();

    // ─── DRAW MOTION TRAILS & VEHICLE BUBBLES ────────────────────────
    if (activeFrameData) {
      const prevFrame = frameIdx > 0 ? simulationData.frames[frameIdx - 1] : null;

      activeFrameData.positions.forEach((car: FramePosition) => {
        // Critical change: Hide DNF cars from track visualization entirely
        if (car.status === 'dnf') return;

        const prevCar = prevFrame?.positions.find(p => p.driver_id === car.driver_id);
        const prevGap = prevCar ? prevCar.gap_to_leader : (car.position * 0.15);
        const currGap = car.gap_to_leader;
        const interpolatedGap = prevGap + progress * (currGap - prevGap);

        let carProgress = progress - (interpolatedGap / baseLapTime);
        carProgress = ((carProgress % 1) + 1) % 1;

        // Store trail history in coordinates
        let trail = trailsRef.current[car.driver_id] || [];
        if (stateRef.current.isPlaying) {
          trail.push(carProgress);
          if (trail.length > 7) trail.shift();
          trailsRef.current[car.driver_id] = trail;
        }

        let offsetDist = car.in_pit ? -9 : 0; // offset inside for pit lane

        // Base vehicle coordinate
        let coord = getPointOnTrack(geometry, carProgress);
        let lookAhead = carProgress + 0.003;
        let coordAhead = getPointOnTrack(geometry, lookAhead);
        let dx = coordAhead.x - coord.x;
        let dy = coordAhead.y - coord.y;
        let len = Math.hypot(dx, dy);

        if (offsetDist !== 0 && len > 0) {
          const nx = -dy / len;
          const ny = dx / len;
          coord = {
            x: coord.x + nx * offsetDist,
            y: coord.y + ny * offsetDist,
          };
        }

        const screenPt = mapPoint(coord);
        const isPlayerCar = car.team_id === playerTeamId;
        const color = car.team_color || '#ef4444';
        const rgb = hexToRgb(color);

        // ─── A) DRAW MOTION TRAIL LINES ────────────────────────────────
        if (trail.length > 1 && car.status === 'racing') {
          ctx.save();
          ctx.lineCap = 'round';
          for (let j = 1; j < trail.length; j++) {
            const tCoord = getPointOnTrack(geometry, trail[j]);
            const prevTCoord = getPointOnTrack(geometry, trail[j - 1]);
            const pStart = mapPoint(prevTCoord);
            const pEnd = mapPoint(tCoord);
            
            const alpha = (j / trail.length) * 0.35;
            ctx.strokeStyle = `rgba(${rgb.r}, ${rgb.g}, ${rgb.b}, ${alpha})`;
            ctx.lineWidth = (j / trail.length) * (5.5 / zoom);
            ctx.beginPath();
            ctx.moveTo(pStart.x, pStart.y);
            ctx.lineTo(pEnd.x, pEnd.y);
            ctx.stroke();
          }
          ctx.restore();
        }

        // ─── B) DRS EMITTER SPARKS (Only if car is actually on a DRS straight) ────
        const inDrsZone = isCurrentlyInDrsZone(trackName, carProgress);
        if (car.drs_active && inDrsZone && car.status === 'racing' && !car.in_pit && len > 0) {
          ctx.save();
          ctx.fillStyle = '#22c55e';
          ctx.shadowColor = '#22c55e';
          ctx.shadowBlur = 3;
          for (let s = 0; s < 3; s++) {
            const dist = (4 + Math.random() * 10) / zoom;
            const spread = (Math.random() - 0.5) * (3.5 / zoom);
            const px = -dy / len;
            const py = dx / len;
            
            const sparkX = screenPt.x - (dx / len) * dist + px * spread;
            const sparkY = screenPt.y - (dy / len) * dist + py * spread;
            
            ctx.beginPath();
            ctx.arc(sparkX, sparkY, 1.2 / zoom, 0, Math.PI * 2);
            ctx.fill();
          }
          ctx.restore();
        }

        // ─── C) TYRE WEAR RADIAL RING ──────────────────────────────────
        if (car.status !== 'finished') {
          ctx.save();
          const wear = car.tire_wear || 0;
          let ringColor = '#10b981';
          let isPulsing = false;
          if (wear >= 75) {
            ringColor = '#ef4444';
            isPulsing = true;
          } else if (wear >= 35) {
            ringColor = '#f97316';
          }
          
          ctx.beginPath();
          const baseRadius = 8.5 / zoom;
          const pulseRadius = isPulsing 
            ? baseRadius + Math.sin(timestamp / 90) * (1.6 / zoom)
            : baseRadius;

          ctx.arc(screenPt.x, screenPt.y, pulseRadius, 0, Math.PI * 2);
          ctx.strokeStyle = ringColor;
          ctx.lineWidth = 1.2 / zoom;
          ctx.stroke();
          ctx.restore();
        }

        // ─── D) VEHICLE CORE CIRCLE ──────────────────────────────────
        ctx.save();
        if (isPlayerCar) {
          ctx.beginPath();
          ctx.arc(screenPt.x, screenPt.y, 9.5 / zoom, 0, Math.PI * 2);
          ctx.strokeStyle = '#fbbf24';
          ctx.lineWidth = 1.8 / zoom;
          ctx.shadowColor = '#fbbf24';
          ctx.shadowBlur = 6;
          ctx.stroke();
        }

        ctx.beginPath();
        ctx.arc(screenPt.x, screenPt.y, 5.8 / zoom, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.shadowColor = color;
        ctx.shadowBlur = 5;
        ctx.fill();

        ctx.strokeStyle = '#ffffff';
        ctx.lineWidth = 1 / zoom;
        ctx.stroke();
        ctx.restore();

        // ─── E) CAR LABELS ───────────────────────────────────────────
        ctx.save();
        if (isPlayerCar) {
          ctx.font = `bold ${8.5 / zoom}px var(--font-racing)`;
          ctx.fillStyle = '#fbbf24';
          const nameParts = car.driver_name.split(' ');
          const initial = nameParts[nameParts.length - 1]?.substring(0, 3).toUpperCase() || 'YOU';
          ctx.textAlign = 'center';
          ctx.fillText(initial, screenPt.x, screenPt.y - 12 / zoom);
        } else if (car.driver_id === activeFocus && activeCam === 'driver') {
          ctx.font = `bold ${8 / zoom}px var(--font-racing)`;
          ctx.fillStyle = '#ffffff';
          const nameParts = car.driver_name.split(' ');
          const initial = nameParts[nameParts.length - 1]?.substring(0, 3).toUpperCase() || 'DRV';
          ctx.textAlign = 'center';
          ctx.fillText(initial, screenPt.x, screenPt.y - 12 / zoom);
        }

        if (car.in_pit) {
          ctx.font = `bold ${7.5 / zoom}px system-ui`;
          ctx.fillStyle = '#fbbf24';
          ctx.textAlign = 'center';
          ctx.fillText('PIT', screenPt.x, screenPt.y - 10 / zoom);
        }
        ctx.restore();
      });
    }

    ctx.restore();
  };

  return (
    <div
      ref={containerRef}
      className="w-full h-full relative rounded-2xl bg-[#09090d]/80 border border-[var(--border-color)] overflow-hidden flex items-center justify-center shadow-lg"
      style={{ minHeight: '340px' }}
    >
      {/* Dynamic Grid Backdrop */}
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.02] transition-transform duration-200"
        style={{
          backgroundImage: 'radial-gradient(var(--foreground) 1px, transparent 0)',
          backgroundSize: '24px 24px',
          transform: cameraMode === 'driver' ? `scale(${cameraZoomRef.current}) translate(${(50 - cameraXRef.current) * 0.1}px, ${(50 - cameraYRef.current) * 0.1}px)` : 'none'
        }}
      />

      {/* Decorative Corner lines */}
      <div className="absolute top-0 left-0 w-4 h-4 border-t border-l border-[var(--accent-primary)]/40 rounded-tl-lg" />
      <div className="absolute top-0 right-0 w-4 h-4 border-t border-r border-[var(--accent-primary)]/40 rounded-tr-lg" />
      <div className="absolute bottom-0 left-0 w-4 h-4 border-b border-l border-[var(--accent-primary)]/40 rounded-bl-lg" />
      <div className="absolute bottom-0 right-0 w-4 h-4 border-b border-r border-[var(--accent-primary)]/40 rounded-br-lg" />

      {/* Camera Mode Selectors Overlay HUD */}
      <div className="absolute top-3 left-3 flex items-center gap-1.5 z-10">
        <button
          onClick={() => {
            onCameraModeChange('map');
            onFocusedDriverChange(null);
          }}
          className={`px-3 py-1.5 rounded-xl text-[10px] font-racing font-bold tracking-wider uppercase transition-all backdrop-blur-md border ${
            cameraMode === 'map'
              ? 'bg-[var(--accent-primary)] text-white border-[var(--accent-primary)]/30 shadow-[0_2px_8px_rgba(220,38,38,0.2)]'
              : 'bg-[#15151f]/80 text-[var(--foreground-muted)] hover:text-[var(--foreground-secondary)] border-[var(--border-color)]'
          }`}
        >
          Full Map
        </button>
        <button
          onClick={() => {
            onCameraModeChange('driver');
            if (!focusedDriverId && activeFrame) {
              const myCar = activeFrame.positions.find(p => p.team_id === playerTeamId);
              if (myCar) onFocusedDriverChange(myCar.driver_id);
              else if (activeFrame.positions[0]) onFocusedDriverChange(activeFrame.positions[0].driver_id);
            }
          }}
          className={`px-3 py-1.5 rounded-xl text-[10px] font-racing font-bold tracking-wider uppercase transition-all backdrop-blur-md border ${
            cameraMode === 'driver'
              ? 'bg-[var(--accent-primary)] text-white border-[var(--accent-primary)]/30 shadow-[0_2px_8px_rgba(220,38,38,0.2)]'
              : 'bg-[#15151f]/80 text-[var(--foreground-muted)] hover:text-[var(--foreground-secondary)] border-[var(--border-color)]'
          }`}
        >
          Driver Cam
        </button>
      </div>

      {/* Floating Glass HUD Alert overlays */}
      {latestEvents.length > 0 && (
        <div className="absolute bottom-3 left-3 right-3 flex flex-col gap-1.5 pointer-events-none z-10 select-none">
          {latestEvents.map((evt, idx) => (
            <div
              key={idx}
              className="animate-fade-in-up flex items-center gap-2 px-3 py-2 rounded-xl bg-[#101017]/85 border-l-2 border-[var(--accent-primary)] border border-y-[var(--border-color)] border-r-[var(--border-color)] backdrop-blur-md shadow-lg"
              style={{ animationDelay: `${idx * 0.15}s` }}
            >
              <span className="text-[11px]">📣</span>
              <span className="text-[10px] font-semibold text-[var(--foreground-secondary)] tracking-wide">
                {evt}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Actual HTML5 Canvas */}
      <canvas
        ref={canvasRef}
        width={dimensions.width}
        height={dimensions.height}
        className="block"
      />
    </div>
  );
}
