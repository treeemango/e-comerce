import { useEffect, useMemo, useState } from 'react';

type BeforeInstallPromptEvent = Event & {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
};

function detectStandalone(): boolean {
  if (typeof window === 'undefined') return false;
  // iOS Safari uses navigator.standalone
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const nav: any = navigator;
  return window.matchMedia('(display-mode: standalone)').matches || !!nav.standalone;
}

function detectIOSSafari(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = window.navigator.userAgent || '';
  const iOS = /iPad|iPhone|iPod/.test(ua);
  const isSafari = /Safari/.test(ua) && !/Chrome|CriOS|FxiOS|EdgiOS/.test(ua);
  return iOS && isSafari;
}

export type InstallOutcome = 'accepted' | 'dismissed' | 'unavailable' | 'already-installed' | 'ios-instructions';

export function useA2HS() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  const isStandalone = useMemo(() => detectStandalone(), []);
  const isIOSSafari = useMemo(() => detectIOSSafari(), []);

  useEffect(() => {
    if (typeof window === 'undefined') return;
    if (isStandalone) return;

    const onBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    const onAppInstalled = () => {
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onAppInstalled);
    };
  }, [isStandalone]);

  const deferredPromptAvailable = !!deferredPrompt;

  const canShowInstallEntry = !isStandalone && (deferredPromptAvailable || isIOSSafari);

  const promptInstall = async (): Promise<InstallOutcome> => {
    if (isStandalone) return 'already-installed';

    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const result = await deferredPrompt.userChoice;
      setDeferredPrompt(null);
      return result.outcome;
    }

    if (isIOSSafari) return 'ios-instructions';
    return 'unavailable';
  };

  return {
    isStandalone,
    isIOSSafari,
    deferredPromptAvailable,
    canShowInstallEntry,
    promptInstall,
  };
}
