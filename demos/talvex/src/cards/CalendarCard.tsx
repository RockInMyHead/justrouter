const AVATARS = [
  'https://images.pexels.com/photos/415829/pexels-photo-415829.jpeg?auto=compress&cs=tinysrgb&w=60',
  'https://images.pexels.com/photos/1681010/pexels-photo-1681010.jpeg?auto=compress&cs=tinysrgb&w=60',
  'https://images.pexels.com/photos/774909/pexels-photo-774909.jpeg?auto=compress&cs=tinysrgb&w=60',
];

const DAYS = [
  { label: 'Mon', num: '22', active: false },
  { label: 'Tue', num: '23', active: false },
  { label: 'Wed', num: '24', active: true },
  { label: 'Thu', num: '25', active: false },
  { label: 'Fri', num: '26', active: false },
  { label: 'Sat', num: '27', active: false },
];

const TIMES = ['8:00am', '9:00am', '10:00am', '11:00am'];

function AvatarGroup({ count }: { count: number }) {
  return (
    <div className="flex items-center mt-1">
      {AVATARS.slice(0, count).map((src, i) => (
        <img
          key={src}
          src={src}
          alt=""
          className="w-6 h-6 rounded-full object-cover border-2 border-white"
          style={{ marginLeft: i > 0 ? -6 : 0 }}
        />
      ))}
    </div>
  );
}

export default function CalendarCard() {
  return (
    <div
      className="bg-white/60 backdrop-blur-3xl rounded-3xl p-5 lg:h-full flex flex-col"
      style={{ boxShadow: '0 2px 20px rgba(0,0,0,0.06)' }}
    >
      <div className="flex items-center justify-between mb-4">
        <span className="text-sm text-[#898989]">July</span>
        <span className="text-base text-[#303030]">August 2024</span>
        <span className="border border-[#898989]/25 rounded-full px-4 py-1 text-sm text-[#898989]">
          September
        </span>
      </div>

      <div className="flex ml-14 sm:ml-16 mb-2 gap-0">
        {DAYS.map((d) => (
          <div key={d.num} className="flex-1 text-center">
            <div className={`text-xs ${d.active ? 'text-[#303030]' : 'text-[#898989]'}`}>{d.label}</div>
            <div className={`text-sm font-medium ${d.active ? 'text-[#303030]' : 'text-[#898989]'}`}>
              {d.num}
            </div>
          </div>
        ))}
      </div>

      <div className="h-40 lg:flex-1 min-h-0 flex gap-2">
        <div className="w-14 sm:w-16 shrink-0 flex flex-col justify-between text-xs text-[#898989] py-1">
          {TIMES.map((t) => (
            <span key={t}>{t}</span>
          ))}
        </div>
        <div className="flex-1 relative border-l border-dashed border-[#898989]/20">
          <div className="absolute inset-0 grid grid-cols-6 pointer-events-none">
            {DAYS.map((d) => (
              <div key={d.num} className="border-l border-dashed border-[#898989]/20 first:border-l-0" />
            ))}
          </div>

          <div
            className="absolute bg-[#303030] rounded-2xl p-2 text-white overflow-hidden"
            style={{ left: '16.66%', right: '33%', top: 4, height: 58 }}
          >
            <div className="text-xs font-medium leading-tight">Monthly All-Hands</div>
            <div className="text-[10px] text-white/60 hidden sm:block leading-tight mt-0.5">
              Recap milestones across squads
            </div>
            <AvatarGroup count={3} />
          </div>

          <div
            className="absolute bg-white border border-[#898989]/25 rounded-2xl p-2 overflow-hidden"
            style={{ left: '55%', right: 0, top: 84, height: 56 }}
          >
            <div className="text-xs font-medium text-[#303030] leading-tight">Induction Briefing</div>
            <div className="text-[10px] text-[#898989] hidden sm:block leading-tight mt-0.5">
              Orientation for new joiners
            </div>
            <AvatarGroup count={2} />
          </div>
        </div>
      </div>
    </div>
  );
}
