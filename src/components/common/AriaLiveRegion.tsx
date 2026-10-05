import React from 'react';
import { useVisionStore } from '../../stores/useVisionStore';

export const AriaLiveRegion: React.FC = () => {
  const ariaAnnouncement = useVisionStore((s) => s.ariaAnnouncement);
  const micStatusText = useVisionStore((s) => s.micStatusText);

  return (
    <div className="sr-only" aria-atomic="true">
      <div role="status" aria-live="polite">
        {ariaAnnouncement}
      </div>
      <div role="status" aria-live="assertive">
        {micStatusText}
      </div>
    </div>
  );
};
