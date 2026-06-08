import { Monitor, Users } from 'lucide-react';

const SEGMENTS = [
  { label: 'Screenings', flex: 15, className: 'bg-[#303030] text-white rounded-full px-3 py-2' },
  { label: 'Placed', flex: 15, className: 'bg-[#FFD85F] text-[#303030] rounded-full px-3 py-2' },
  {
    label: 'Sprint cycle',
    flex: 60,
    className: 'rounded-full px-3 py-2 border border-[#ddd]',
    style: {
      background: 'repeating-linear-gradient(-45deg, #e5e5e5 0px, #e5e5e5 2px, #f5f5f5 2px, #f5f5f5 10px)',
    },
  },
  { label: 'Return', flex: 10, className: 'border border-[#898989]/40 bg-white/60 rounded-full px-3 py-2' },
];

const STATS = [
  { value: '78', label: 'Members', icon: Users },
  { value: '56', label: 'Openings', icon: Users },
  { value: '203', label: 'Launches', icon: Monitor },
];

export default function WelcomeRow() {
  return (
    <div className="w-full mb-4 flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 sm:gap-8">
      <div className="flex-[3] min-w-0">
        <h1 className="text-3xl sm:text-4xl lg:text-5xl tracking-tight text-[#303030] leading-tight">
          Good morning, Kasven
        </h1>
        <div className="flex gap-1 sm:gap-2 mt-4">
          {SEGMENTS.map((seg) => (
            <div key={seg.label} className="min-w-0" style={{ flex: seg.flex }}>
              <div className="text-xs text-[#303030] mb-1 truncate">{seg.label}</div>
              <div className={`text-xs sm:text-sm text-center truncate ${seg.className}`} style={seg.style}>
                {seg.flex}%
              </div>
            </div>
          ))}
        </div>
      </div>

      <div className="flex-[2] flex gap-4 sm:gap-6 justify-between sm:justify-end">
        {STATS.map((stat) => (
          <div key={stat.label} className="text-left">
            <div className="bg-[#898989]/15 rounded-lg p-1.5 mb-1 inline-flex">
              <stat.icon size={14} className="text-[#898989]" />
            </div>
            <div className="text-3xl sm:text-4xl lg:text-5xl text-[#303030] leading-none">{stat.value}</div>
            <div className="text-xs text-[#303030]">{stat.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
