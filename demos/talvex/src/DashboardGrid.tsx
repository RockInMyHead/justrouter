import AccordionCard from './cards/AccordionCard';
import CalendarCard from './cards/CalendarCard';
import OnboardingColumn from './cards/OnboardingColumn';
import ProfilePhotoCard from './cards/ProfilePhotoCard';
import ProgressCard from './cards/ProgressCard';
import TimeTrackerCard from './cards/TimeTrackerCard';

function MobileStack() {
  return (
    <div className="flex flex-col gap-3 md:hidden">
      <ProfilePhotoCard />
      <ProgressCard />
      <TimeTrackerCard />
      <OnboardingColumn />
      <AccordionCard />
      <CalendarCard />
    </div>
  );
}

function TabletGrid() {
  return (
    <div
      className="hidden md:grid lg:hidden gap-3"
      style={{ gridTemplateColumns: '1fr 1fr', alignItems: 'stretch' }}
    >
      <ProfilePhotoCard />
      <ProgressCard />
      <TimeTrackerCard />
      <AccordionCard />
      <div style={{ gridColumn: 'span 2' }}>
        <CalendarCard />
      </div>
      <div style={{ gridColumn: 'span 2' }}>
        <OnboardingColumn />
      </div>
    </div>
  );
}

function DesktopGrid() {
  return (
    <div
      className="hidden lg:grid gap-1 h-full"
      style={{
        gridTemplateColumns: 'repeat(4, 1fr)',
        gridTemplateRows: '1fr 1fr',
      }}
    >
      <div className="h-full min-h-0">
        <ProfilePhotoCard />
      </div>
      <div className="h-full min-h-0">
        <ProgressCard />
      </div>
      <div className="h-full min-h-0">
        <TimeTrackerCard />
      </div>
      <div className="h-full min-h-0" style={{ gridRow: 'span 2' }}>
        <OnboardingColumn />
      </div>
      <div className="h-full min-h-0">
        <AccordionCard />
      </div>
      <div className="h-full min-h-0" style={{ gridColumn: 'span 2' }}>
        <CalendarCard />
      </div>
    </div>
  );
}

export default function DashboardGrid() {
  return (
    <>
      <MobileStack />
      <TabletGrid />
      <DesktopGrid />
    </>
  );
}
