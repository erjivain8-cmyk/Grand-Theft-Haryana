import { useRef, useState } from 'react';
import { TouchInputState } from '../game/types';

interface TouchControlsProps {
  inVehicle: boolean;
  canEnterVehicle: boolean;
  onTouchUpdate: (partial: Partial<TouchInputState>) => void;
  onEnterExit: () => void;
  onHorn: () => void;
}

export function TouchControls({
  inVehicle,
  canEnterVehicle,
  onTouchUpdate,
  onEnterExit,
  onHorn,
}: TouchControlsProps) {
  const padRef = useRef<HTMLDivElement | null>(null);
  const [knob, setKnob] = useState({ x: 0, y: 0 });
  const activePointer = useRef<number | null>(null);

  const handlePadMove = (clientX: number, clientY: number) => {
    const el = padRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    const cy = rect.top + rect.height / 2;
    const maxR = rect.width * 0.38;

    let dx = clientX - cx;
    let dy = clientY - cy;
    const dist = Math.hypot(dx, dy);
    if (dist > maxR) {
      dx = (dx / dist) * maxR;
      dy = (dy / dist) * maxR;
    }
    setKnob({ x: dx, y: dy });

    const normX = dx / maxR;
    const normY = -dy / maxR;
    onTouchUpdate({
      steerX: Math.abs(normX) < 0.12 ? 0 : normX,
      moveY: inVehicle ? 0 : Math.abs(normY) < 0.12 ? 0 : normY,
    });
  };

  const resetPad = () => {
    activePointer.current = null;
    setKnob({ x: 0, y: 0 });
    onTouchUpdate({ steerX: 0, moveY: inVehicle ? 0 : 0 });
  };

  return (
    <div className="pointer-events-none fixed inset-x-0 bottom-4 z-20 flex items-end justify-between px-4 sm:px-6">
      {/* Left Virtual Steering / Movement Thumbstick */}
      <div
        ref={padRef}
        onPointerDown={(e) => {
          e.stopPropagation();
          activePointer.current = e.pointerId;
          e.currentTarget.setPointerCapture(e.pointerId);
          handlePadMove(e.clientX, e.clientY);
        }}
        onPointerMove={(e) => {
          if (activePointer.current === e.pointerId) {
            handlePadMove(e.clientX, e.clientY);
          }
        }}
        onPointerUp={(e) => {
          if (activePointer.current === e.pointerId) resetPad();
        }}
        onPointerCancel={resetPad}
        className="pointer-events-auto relative w-28 h-28 rounded-full border border-white/25 bg-zinc-950/70 touch-none flex items-center justify-center"
        aria-label="Steering and movement pad"
      >
        <div
          className="w-12 h-12 rounded-full bg-amber-500/85 border border-amber-200/70 shadow-md transition-transform duration-75"
          style={{ transform: `translate(${knob.x}px, ${knob.y}px)` }}
        />
      </div>

      {/* Right Action Cluster (>= 44px touch targets) */}
      <div className="pointer-events-auto flex items-end gap-2.5">
        {(inVehicle || canEnterVehicle) && (
          <button
            type="button"
            onClick={onEnterExit}
            className="min-w-[52px] min-h-[52px] px-3 rounded-xl border border-amber-400/50 bg-amber-500 text-zinc-950 font-display text-xs font-bold active:scale-95 transition-transform"
          >
            {inVehicle ? 'EXIT' : 'DRIVE'}
          </button>
        )}

        {inVehicle ? (
          <>
            <button
              type="button"
              onPointerDown={() => onHorn()}
              className="min-w-[48px] min-h-[48px] px-3 rounded-xl border border-white/20 bg-zinc-900/85 text-zinc-100 text-xs font-semibold active:scale-95"
            >
              HORN
            </button>
            <button
              type="button"
              onPointerDown={() => onTouchUpdate({ moveY: -0.9, brake: true })}
              onPointerUp={() => onTouchUpdate({ moveY: 0, brake: false })}
              onPointerLeave={() => onTouchUpdate({ moveY: 0, brake: false })}
              className="min-w-[56px] min-h-[56px] px-3 rounded-xl border border-rose-400/40 bg-rose-950/85 text-rose-100 font-display text-xs font-bold active:scale-95"
            >
              BRAKE
            </button>
            <button
              type="button"
              onPointerDown={() => onTouchUpdate({ moveY: 1 })}
              onPointerUp={() => onTouchUpdate({ moveY: 0 })}
              onPointerLeave={() => onTouchUpdate({ moveY: 0 })}
              className="min-w-[64px] min-h-[64px] px-3 rounded-xl border border-emerald-400/50 bg-emerald-600/90 text-white font-display text-sm font-bold active:scale-95"
            >
              GAS
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onPointerDown={() => onTouchUpdate({ brake: true })}
              onPointerUp={() => onTouchUpdate({ brake: false })}
              className="min-w-[52px] min-h-[52px] px-3 rounded-xl border border-white/20 bg-zinc-900/85 text-zinc-100 text-xs font-semibold active:scale-95"
            >
              JUMP
            </button>
            <button
              type="button"
              onPointerDown={() => onTouchUpdate({ sprint: true })}
              onPointerUp={() => onTouchUpdate({ sprint: false })}
              onPointerLeave={() => onTouchUpdate({ sprint: false })}
              className="min-w-[58px] min-h-[58px] px-3 rounded-xl border border-amber-400/40 bg-zinc-900/90 text-amber-300 font-display text-xs font-bold active:scale-95"
            >
              RUN
            </button>
          </>
        )}
      </div>
    </div>
  );
}
