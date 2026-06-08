import { useState } from 'react';
import { ChevronDown, ChevronUp, MoreVertical } from 'lucide-react';

const ITEMS = ['Retirement savings', 'Hardware', 'Earnings breakdown', 'Perks & Benefits'];

const LAPTOP_IMG =
  'https://images.pexels.com/photos/18105/pexels-photo.jpg?auto=compress&cs=tinysrgb&w=120';

export default function AccordionCard() {
  const [openIndex, setOpenIndex] = useState(1);

  return (
    <div
      className="bg-white/60 backdrop-blur-3xl rounded-3xl overflow-hidden lg:h-full flex flex-col"
      style={{ boxShadow: '0 2px 20px rgba(0,0,0,0.06)' }}
    >
      {ITEMS.map((title, index) => (
        <div key={title} className={index > 0 ? 'border-t border-[#898989]/15' : ''}>
          <button
            type="button"
            className="w-full px-5 py-4 flex items-center justify-between hover:bg-[#898989]/8 transition-colors text-left"
            onClick={() => setOpenIndex(openIndex === index ? -1 : index)}
          >
            <span className="text-sm text-[#303030]">{title}</span>
            {openIndex === index ? (
              <ChevronUp size={15} className="text-[#898989] shrink-0" />
            ) : (
              <ChevronDown size={15} className="text-[#898989] shrink-0" />
            )}
          </button>
          {title === 'Hardware' && openIndex === 1 && (
            <div className="px-5 pb-4 flex items-center gap-3 border-t border-[#898989]/15">
              <img src={LAPTOP_IMG} alt="" className="w-12 h-10 rounded-lg object-cover" />
              <div className="flex-1 min-w-0">
                <div className="text-sm text-[#303030]">ThinkPad Pro</div>
                <div className="text-xs text-[#898989]">Edition X1</div>
              </div>
              <button type="button" className="p-1 text-[#898989]" aria-label="More">
                <MoreVertical size={16} />
              </button>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}
