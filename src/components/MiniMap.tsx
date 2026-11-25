import { useEffect, useRef } from 'react';
import { HudSnapshot } from '../game/types';

interface MiniMapProps {
  hud: HudSnapshot;
}

export function MiniMap({ hud }: MiniMapProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const size = 148;
    const half = size / 2;
    const scale = 0.36; // 1 meter -> 0.36 px

    ctx.clearRect(0, 0, size, size);

    // Dark map base
    ctx.fillStyle = '#0c1118';
    ctx.fillRect(0, 0, size, size);

    const toMap = (wx: number, wz: number): [number, number] => [
      half + (wx - hud.playerX) * scale,
      half + (wz - hud.playerZ) * scale,
    ];

    // Draw Road Network
    ctx.strokeStyle = '#334155';
    ctx.lineWidth = 7;
    ctx.beginPath();
    // NH-48 East-West
    const [r1x, r1y] = toMap(-240, 0);
    const [r2x, r2y] = toMap(240, 0);
    ctx.moveTo(r1x, r1y);
    ctx.lineTo(r2x, r2y);
    // Cyber City NS
    const [c1x, c1y] = toMap(115, -170);
    const [c2x, c2y] = toMap(115, 110);
    ctx.moveTo(c1x, c1y);
    ctx.lineTo(c2x, c2y);
    // Kurukshetra - Kheri Kalan NS
    const [k1x, k1y] = toMap(-85, -160);
    const [k2x, k2y] = toMap(-85, 155);
    ctx.moveTo(k1x, k1y);
    ctx.lineTo(k2x, k2y);
    // Outer North Ring
    const [n1x, n1y] = toMap(-160, -155);
    const [n2x, n2y] = toMap(160, -155);
    ctx.moveTo(n1x, n1y);
    ctx.lineTo(n2x, n2y);
    ctx.stroke();

    // Sarovar Pool
    const [sx, sy] = toMap(-125, -105);
    ctx.fillStyle = '#0e7490';
    ctx.fillRect(sx - 6, sy - 6, 12, 12);

    // District labels & landmarks
    ctx.font = '600 9px "Plus Jakarta Sans", sans-serif';
    ctx.textAlign = 'center';
    for (const ent of hud.minimapEntities) {
      const [ex, ey] = toMap(ent.x, ent.z);
      if (ent.kind === 'landmark') {
        ctx.fillStyle = '#94a3b8';
        if (ent.label) ctx.fillText(ent.label, ex, ey - 5);
      } else if (ent.kind === 'vehicle') {
        ctx.fillStyle = '#38bdf8';
        ctx.fillRect(ex - 2.5, ey - 2.5, 5, 5);
      } else if (ent.kind === 'traffic') {
        ctx.fillStyle = '#64748b';
        ctx.fillRect(ex - 1.5, ey - 1.5, 3, 3);
      } else if (ent.kind === 'racer') {
        ctx.fillStyle = '#ef4444';
        ctx.beginPath();
        ctx.arc(ex, ey, 3.2, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Mission Waypoint Beacon
    if (hud.mission.targetX !== null && hud.mission.targetZ !== null) {
      const [mx, my] = toMap(hud.mission.targetX, hud.mission.targetZ);
      const clampedX = Math.max(8, Math.min(size - 8, mx));
      const clampedY = Math.max(8, Math.min(size - 8, my));
      ctx.strokeStyle = '#f59e0b';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(clampedX, clampedY, 6, 0, Math.PI * 2);
      ctx.stroke();
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.arc(clampedX, clampedY, 3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Player heading arrow at center
    ctx.save();
    ctx.translate(half, half);
    // In Three.js: +Z is down on canvas, +X is right; heading 0 points +Z
    ctx.rotate(-hud.playerHeading);
    ctx.fillStyle = '#f8fafc';
    ctx.beginPath();
    ctx.moveTo(0, 6);
    ctx.lineTo(-4.5, -5);
    ctx.lineTo(0, -2.5);
    ctx.lineTo(4.5, -5);
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }, [hud]);

  return (
    <div className="relative rounded-lg overflow-hidden border border-white/15 bg-zinc-950/90 shadow-lg">
      <canvas ref={canvasRef} width={148} height={148} className="block w-[132px] h-[132px] sm:w-[148px] sm:h-[148px]" />
      <div className="px-2 py-1 border-t border-white/10 bg-zinc-950/95 flex items-center justify-between text-[10px] text-zinc-400 font-mono-tabular">
        <span>N</span>
        <span>
          {Math.round(hud.playerX)}, {Math.round(hud.playerZ)}
        </span>
      </div>
    </div>
  );
}
