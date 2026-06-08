import { useRef } from 'react';
import ScrollVideo from './ScrollVideo';
import ScrollFloat from './ScrollFloat';
import GlassPanel from './GlassPanel';
import PillNav from './PillNav';

const MUX_HLS =
  'https://stream.mux.com/43NlHXsaMrmyzWamMk87m01fNyxSTekAD669BBAPBNm00.m3u8';

export default function App() {
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <>
      <ScrollVideo src={MUX_HLS} />
      <PillNav />
      <div ref={containerRef} style={{ position: 'relative', height: '500vh' }}>
        <ScrollFloat>{`Unleash The\nFull Power`}</ScrollFloat>
        <GlassPanel containerRef={containerRef} />
      </div>
    </>
  );
}
