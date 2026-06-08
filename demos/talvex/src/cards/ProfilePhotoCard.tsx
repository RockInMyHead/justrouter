const PHOTO =
  'https://images.pexels.com/photos/1130626/pexels-photo-1130626.jpeg?auto=compress&cs=tinysrgb&w=600';

export default function ProfilePhotoCard() {
  return (
    <div
      className="rounded-3xl overflow-hidden aspect-[4/3] lg:aspect-auto lg:h-full relative"
      style={{ boxShadow: '0 2px 20px rgba(0,0,0,0.10)' }}
    >
      <img src={PHOTO} alt="Nora Elliston" className="w-full h-full object-cover object-top" />
      <div
        className="absolute inset-x-0 bottom-0 h-[35%] pointer-events-none"
        style={{
          backdropFilter: 'blur(18px) saturate(140%)',
          WebkitBackdropFilter: 'blur(18px) saturate(140%)',
          maskImage: 'linear-gradient(to top, black 40%, transparent 100%)',
          WebkitMaskImage: 'linear-gradient(to top, black 40%, transparent 100%)',
          background: 'linear-gradient(to top, rgba(0,0,0,0.28) 0%, transparent 100%)',
        }}
      />
      <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between px-4 py-3 rounded-2xl">
        <div>
          <div className="text-white text-sm font-medium">Nora Elliston</div>
          <div className="text-white/70 text-xs">UI/UX Architect</div>
        </div>
        <span
          className="text-white text-xs font-medium px-3 py-1 rounded-full"
          style={{ border: '1px solid rgba(255,255,255,0.35)' }}
        >
          $1,200
        </span>
      </div>
    </div>
  );
}
