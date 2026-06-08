import { Pause, Play, RotateCcw } from 'lucide-react';

const CX = 90;
const CY = 90;
const R = 68;
const TICKS = 60;
const PROGRESS = 0.7;

function polar(angleDeg: number, radius: number) {
  const rad = ((angleDeg - 90) * Math.PI) / 180;
  return { x: CX + radius * Math.cos(rad), y: CY + radius * Math.sin(rad) };
}

export default function TimeTrackerCard() {
  const circumference = 2 * Math.PI * R;
  const progressLen = circumference * PROGRESS;

  return (
    <div
      className="bg-white/60 backdrop-blur-3xl rounded-3xl p-5 flex flex-col gap-3 lg:h-full items-center"
      style={{ boxShadow: '0 2px 20px rgba(0,0,0,0.06)' }}
    >
      <h2 className="text-lg text-[#303030] self-start w-full">Focus timer</h2>

      <div className="flex flex-col items-center flex-1 justify-center w-full">
        <svg width="180" height="180" viewBox="0 0 180 180" className="shrink-0">
          <circle
            cx={CX}
            cy={CY}
            r={R}
            fill="none"
            stroke="#E8E8E8"
            strokeWidth="10"
            opacity={0.4}
          />
          <circle
            cx={CX}
            cy={CY}
            r={R}
            fill="none"
            stroke="#FFD85F"
            strokeWidth="10"
            strokeLinecap="round"
            strokeDasharray={`${progressLen} ${circumference}`}
            transform={`rotate(-90 ${CX} ${CY})`}
          />
          {Array.from({ length: TICKS }, (_, i) => {
            const angle = (i / TICKS) * 360;
            const inProgress = angle / 360 <= PROGRESS;
            if (inProgress) return null;
            const inner = polar(angle, R - 4);
            const outer = polar(angle, R + 4);
            return (
              <line
                key={i}
                x1={inner.x}
                y1={inner.y}
                x2={outer.x}
                y2={outer.y}
                stroke="#898989"
                strokeOpacity={0.9}
                strokeWidth={1.2}
                strokeLinecap="round"
              />
            );
          })}
          <text x={CX} y={CY - 4} textAnchor="middle" fontSize="22" fill="#303030">
            02:35
          </text>
          <text x={CX} y={CY + 14} textAnchor="middle" fontSize="10" fill="#898989">
            Deep Focus
          </text>
        </svg>

        <div className="flex items-center justify-between w-full mt-4 max-w-[180px]">
          <div className="flex gap-2">
            <button
              type="button"
              className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm"
              aria-label="Play"
            >
              <Play size={14} className="text-[#303030] ml-0.5" />
            </button>
            <button
              type="button"
              className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-sm"
              aria-label="Pause"
            >
              <Pause size={14} className="text-[#303030]" />
            </button>
          </div>
          <button
            type="button"
            className="w-10 h-10 rounded-full bg-[#303030] flex items-center justify-center"
            aria-label="Reset"
          >
            <RotateCcw size={14} className="text-white" />
          </button>
        </div>
      </div>
    </div>
  );
}
