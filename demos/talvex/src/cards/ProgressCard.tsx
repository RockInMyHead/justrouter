import { ArrowUpRight } from 'lucide-react';
import { Bar, BarChart, Cell, ResponsiveContainer, Tooltip, XAxis } from 'recharts';

const DATA = [
  { day: 'S', hours: 3.5 },
  { day: 'M', hours: 5.0 },
  { day: 'T', hours: 4.2 },
  { day: 'W', hours: 6.0 },
  { day: 'T', hours: 4.8 },
  { day: 'F', hours: 7.2 },
  { day: 'S', hours: 2.0 },
];

function FridayTooltip({ active, payload }: { active?: boolean; payload?: { value: number }[] }) {
  if (!active || !payload?.length || payload[0].value !== 7.2) return null;
  return (
    <div className="bg-[#FFD85F] text-[#303030] text-xs rounded-full px-3 py-1 shadow-md">5h 23m</div>
  );
}

export default function ProgressCard() {
  return (
    <div
      className="bg-white/60 backdrop-blur-3xl rounded-3xl p-5 flex flex-col gap-3 lg:h-full"
      style={{ boxShadow: '0 2px 20px rgba(0,0,0,0.06)' }}
    >
      <div className="flex items-center justify-between">
        <h2 className="text-lg text-[#303030]">Activity</h2>
        <button
          type="button"
          className="w-8 h-8 rounded-full bg-white flex items-center justify-center shadow-sm"
          aria-label="View activity"
        >
          <ArrowUpRight size={16} className="text-[#303030]" />
        </button>
      </div>
      <div>
        <div className="text-4xl text-[#303030]">6.1 h</div>
        <div className="text-xs text-[#898989]">
          Logged hrs
          <br />
          / this week
        </div>
      </div>
      <div className="h-48 lg:flex-1 lg:h-auto min-h-0">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={DATA} barCategoryGap="30%" margin={{ top: 20, right: 0, left: 0, bottom: 0 }}>
            <XAxis
              dataKey="day"
              axisLine={false}
              tickLine={false}
              tick={{ fill: '#898989', fontSize: 11, fontFamily: 'Sofia Pro Regular' }}
            />
            <Tooltip content={<FridayTooltip />} cursor={false} position={{ y: -30 }} />
            <Bar dataKey="hours" radius={[6, 6, 6, 6]}>
              {DATA.map((_, index) => (
                <Cell key={`cell-${index}`} fill={index === 5 ? '#FFD85F' : '#303030'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
