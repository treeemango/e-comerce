import React, { Suspense, useEffect, useState } from 'react';

const DesktopApp = React.lazy(() => import('./App'));
const MobileApp = React.lazy(() => import('./mobile ui/App'));
import { NotificationProvider } from './components/NotificationContext';

const MOBILE_QUERY = '(max-width: 900px)';

const useIsMobile = () => {
  const getMatch = () => typeof window !== 'undefined' && window.matchMedia(MOBILE_QUERY).matches;
  const [isMobile, setIsMobile] = useState<boolean>(getMatch);

  useEffect(() => {
    const mediaQuery = window.matchMedia(MOBILE_QUERY);
    const handler = (event: MediaQueryListEvent) => setIsMobile(event.matches);
    setIsMobile(mediaQuery.matches);
    mediaQuery.addEventListener('change', handler);
    return () => mediaQuery.removeEventListener('change', handler);
  }, []);

  return isMobile;
};

const ResponsiveApp: React.FC = () => {
  const isMobile = useIsMobile();

  return (
    <NotificationProvider>
      <Suspense fallback={<div className="min-h-screen flex items-center justify-center">Loading…</div>}>
        {isMobile ? <MobileApp /> : <DesktopApp />}
      </Suspense>
    </NotificationProvider>
  );
};

export default ResponsiveApp;
