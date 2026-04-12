import { useState, useEffect } from 'react';

type InstallStatus = 'installed' | 'dismissed' | null;

const STORAGE_KEY = 'pwa_install_status';

interface BeforeInstallPromptEvent extends Event {
  prompt(): Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

function isMobileOrTablet(): boolean {
  const ua = navigator.userAgent;
  if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(ua)) return true;
  // iPad in desktop mode reports as Macintosh but has touch support
  if (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1) return true;
  return false;
}

function isIOS(): boolean {
  const ua = navigator.userAgent;
  if (/iPhone|iPad|iPod/i.test(ua)) return true;
  // iPad in desktop mode
  if (/Macintosh/.test(ua) && navigator.maxTouchPoints > 1) return true;
  return false;
}

function isStandalone(): boolean {
  if (window.matchMedia('(display-mode: standalone)').matches) return true;
  if ((window.navigator as unknown as { standalone?: boolean }).standalone === true) return true;
  return false;
}

export function usePWAInstall() {
  const [installStatus, setInstallStatus] = useState<InstallStatus>(
    () => (localStorage.getItem(STORAGE_KEY) as InstallStatus) ?? null
  );
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showIOSInstructions, setShowIOSInstructions] = useState(false);

  const mobile = isMobileOrTablet();
  const ios = isIOS();
  const standalone = isStandalone();

  useEffect(() => {
    if (!mobile || standalone) return;

    const handler = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
    };

    window.addEventListener('beforeinstallprompt', handler);
    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, [mobile, standalone]);

  const triggerInstall = async () => {
    if (ios) {
      setShowIOSInstructions(true);
      return;
    }

    if (!deferredPrompt) return;

    await deferredPrompt.prompt();
    const { outcome } = await deferredPrompt.userChoice;
    if (outcome === 'accepted') {
      const status = 'installed';
      localStorage.setItem(STORAGE_KEY, status);
      setInstallStatus(status);
    } else {
      const status = 'dismissed';
      localStorage.setItem(STORAGE_KEY, status);
      setInstallStatus(status);
    }
    setDeferredPrompt(null);
  };

  const markInstalledFromIOS = () => {
    setShowIOSInstructions(false);
    const status = 'installed';
    localStorage.setItem(STORAGE_KEY, status);
    setInstallStatus(status);
  };

  const dismissForever = () => {
    setShowIOSInstructions(false);
    const status = 'dismissed';
    localStorage.setItem(STORAGE_KEY, status);
    setInstallStatus(status);
  };

  // Show button if: mobile/tablet, not running as installed app, and user hasn't made a choice
  const showInstallButton =
    mobile && !standalone && installStatus === null && (deferredPrompt !== null || ios);

  return {
    showInstallButton,
    showIOSInstructions,
    isIOS: ios,
    triggerInstall,
    markInstalledFromIOS,
    dismissForever,
    installStatus,
  };
}
