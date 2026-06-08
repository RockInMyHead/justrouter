import { Check, Link, MessageSquare, Monitor, Pencil, Users } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';

type Task = {
  title: string;
  time: string;
  done: boolean;
  icon: LucideIcon;
};

const TASKS: Task[] = [
  { title: 'Screening', time: 'Sep 13 08:30', done: true, icon: Monitor },
  { title: 'Sync Session', time: 'Sep 13 10:30', done: true, icon: Users },
  { title: 'Sprint Recap', time: 'Sep 13 13:00', done: false, icon: MessageSquare },
  { title: 'Set Q3 Targets', time: 'Sep 13 14:45', done: false, icon: Pencil },
  { title: 'Policy Walkthru', time: 'Sep 13 16:30', done: false, icon: Link },
];

const BAR_SEGMENTS = [
  { pct: '30%', flex: 30, bg: 'bg-[#FFD85F]', label: 'Task' },
  { pct: '25%', flex: 25, bg: 'bg-[#303030]', label: '' },
  { pct: '20%', flex: 20, bg: 'bg-[#898989]', label: '' },
];

export default function OnboardingColumn() {
  return (
    <div
      className="bg-white/60 backdrop-blur-3xl rounded-3xl p-5 flex flex-col gap-4 lg:h-full"
      style={{ boxShadow: '0 2px 20px rgba(0,0,0,0.06)' }}
    >
      <div className="flex items-end justify-between">
        <h2 className="text-lg text-[#303030]">Induction</h2>
        <span className="text-4xl text-[#303030]">18%</span>
      </div>

      <div className="flex gap-2">
        {BAR_SEGMENTS.map((seg) => (
          <div key={seg.pct} className="min-w-0" style={{ flex: seg.flex }}>
            <div className="text-xs text-[#898989] mb-1">{seg.pct}</div>
            <div
              className={`${seg.bg} rounded-xl h-10 flex items-center justify-center text-xs text-[#303030] font-medium px-2`}
            >
              {seg.label}
            </div>
          </div>
        ))}
      </div>

      <div className="bg-[#303030] rounded-3xl p-5 flex flex-col gap-2 flex-1 min-h-0">
        <div className="flex items-center justify-between mb-1">
          <h3 className="text-lg text-white">Pending Actions</h3>
          <span className="text-base text-[#898989]">2/8</span>
        </div>
        {TASKS.map((task) => (
          <div
            key={task.title}
            className="flex items-center gap-3 py-2 border-b border-white/5 last:border-0"
          >
            <div className="w-8 h-8 rounded-full bg-white/10 flex items-center justify-center shrink-0">
              <task.icon size={13} className="text-white/60" />
            </div>
            <div className="flex-1 min-w-0">
              <div className={`text-sm ${task.done ? 'line-through text-white/30' : 'text-white'}`}>
                {task.title}
              </div>
              <div className="text-xs text-white/30">{task.time}</div>
            </div>
            {task.done ? (
              <div className="w-5 h-5 rounded-full bg-[#FFD85F] flex items-center justify-center shrink-0">
                <Check size={10} className="text-[#303030]" strokeWidth={3} />
              </div>
            ) : (
              <div className="w-5 h-5 rounded-full border border-white/20 shrink-0" />
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
