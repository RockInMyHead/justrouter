import type { ReactNode } from 'react';
import BackgroundSvg from './BackgroundSvg';
import DashboardGrid from './DashboardGrid';
import Navbar from './Navbar';
import WelcomeRow from './WelcomeRow';

function DashboardShell({ children, className }: { children: ReactNode; className: string }) {
  return (
    <div className={className}>
      <Navbar />
      <WelcomeRow />
      {children}
    </div>
  );
}

export default function App() {
  return (
    <div style={{ fontFamily: '"Sofia Pro Regular", sans-serif' }} className="min-h-screen text-[#303030]">
      <BackgroundSvg />

      <DashboardShell className="hidden lg:flex relative z-10 max-w-[1400px] mx-auto h-screen px-6 py-6 flex-col overflow-hidden">
        <div className="flex-1 min-h-0">
          <DashboardGrid />
        </div>
      </DashboardShell>

      <DashboardShell className="lg:hidden relative z-10 max-w-[1400px] mx-auto min-h-screen px-4 sm:px-6 py-6 flex flex-col gap-0 overflow-y-auto">
        <DashboardGrid />
        <div className="h-6 shrink-0" />
      </DashboardShell>
    </div>
  );
}
