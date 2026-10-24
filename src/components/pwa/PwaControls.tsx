import { useEffect, useState } from 'react';
import { Download, WifiOff, X } from 'lucide-react';

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform?: string }>;
}

function isStandaloneDisplay() {
  const appleNavigator = navigator as Navigator & { standalone?: boolean };
  return window.matchMedia('(display-mode: standalone)').matches || appleNavigator.standalone === true;
}

function installInstructions() {
  const userAgent = navigator.userAgent || '';
  const isAndroid = /android/i.test(userAgent);
  const isAppleMobile = /iphone|ipad|ipod/i.test(userAgent)
    || (/macintosh/i.test(userAgent) && navigator.maxTouchPoints > 1);
  const isMacSafari = /macintosh/i.test(userAgent)
    && /safari/i.test(userAgent)
    && !/chrome|chromium|edg/i.test(userAgent);
  const isChromium = /chrome|chromium|edg/i.test(userAgent);

  if (isAndroid) return 'Dans Chrome, ouvrez le menu ⋮ puis choisissez « Installer l’application » ou « Ajouter à l’écran d’accueil ».';
  if (isAppleMobile) return 'Ouvrez cette page dans Safari, touchez Partager, puis « Sur l’écran d’accueil » et « Ajouter ».';
  if (isMacSafari) return 'Dans Safari sur macOS Sonoma ou une version plus récente, ouvrez le menu Fichier puis choisissez « Ajouter au Dock ».';
  if (isChromium) return 'Dans Chrome ou Edge, utilisez l’icône Installer dans la barre d’adresse, ou le menu du navigateur puis « Installer F.A.N.A ».';
  return 'Ouvrez cette adresse dans Chrome ou Edge sur ordinateur/Android, ou dans Safari sur iPhone/iPad. Utilisez ensuite le menu du navigateur pour installer l’application ou l’ajouter à l’écran d’accueil.';
}

export function PwaInstallButton({ compact = false }: { compact?: boolean }) {
  const [installPrompt, setInstallPrompt] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [helpOpen, setHelpOpen] = useState(false);

  useEffect(() => {
    const refreshInstalledState = () => setInstalled(isStandaloneDisplay());
    const displayMode = window.matchMedia('(display-mode: standalone)');
    const onBeforeInstallPrompt = (event: Event) => {
      event.preventDefault();
      setInstallPrompt(event as InstallPromptEvent);
    };
    const onAppInstalled = () => {
      setInstalled(true);
      setInstallPrompt(null);
      setHelpOpen(false);
    };

    refreshInstalledState();
    if (typeof displayMode.addEventListener === 'function') displayMode.addEventListener('change', refreshInstalledState);
    else displayMode.addListener(refreshInstalledState);
    window.addEventListener('beforeinstallprompt', onBeforeInstallPrompt);
    window.addEventListener('appinstalled', onAppInstalled);
    return () => {
      if (typeof displayMode.removeEventListener === 'function') displayMode.removeEventListener('change', refreshInstalledState);
      else displayMode.removeListener(refreshInstalledState);
      window.removeEventListener('beforeinstallprompt', onBeforeInstallPrompt);
      window.removeEventListener('appinstalled', onAppInstalled);
    };
  }, []);

  if (import.meta.env.DEV || installed) return null;

  const install = async () => {
    if (!installPrompt) {
      setHelpOpen(true);
      return;
    }

    const prompt = installPrompt;
    setInstallPrompt(null);
    try {
      await prompt.prompt();
      const choice = await prompt.userChoice;
      if (choice.outcome === 'accepted') setInstalled(true);
    } catch {
      setHelpOpen(true);
    }
  };

  return <>
    <button
      type="button"
      onClick={() => void install()}
      aria-haspopup="dialog"
      title="Installer F.A.N.A sur cet appareil"
      className={compact
        ? 'inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl border border-slate-800 bg-slate-900 text-slate-300 transition hover:border-orange-500/60 hover:text-orange-300'
        : 'inline-flex items-center justify-center gap-2 rounded-xl border border-slate-700 bg-slate-900 px-4 py-2.5 text-xs font-bold text-slate-100 transition hover:border-orange-500/60 hover:bg-slate-800 hover:text-orange-300'}
    >
      <Download size={compact ? 17 : 15} />
      {!compact && <span>Installer sur cet appareil</span>}
      <span className="sr-only">Installer F.A.N.A sur cet appareil</span>
    </button>

    {helpOpen && <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm" role="presentation" onMouseDown={event => { if (event.target === event.currentTarget) setHelpOpen(false); }}>
      <section role="dialog" aria-modal="true" aria-labelledby="pwa-install-title" className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-950 p-5 shadow-2xl sm:p-6">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-orange-400">Application installable</p>
            <h2 id="pwa-install-title" className="mt-2 text-lg font-black text-white">Installer F.A.N.A</h2>
          </div>
          <button type="button" onClick={() => setHelpOpen(false)} aria-label="Fermer" className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white"><X size={18} /></button>
        </div>
        <p className="mt-4 text-sm leading-6 text-slate-300">{installInstructions()}</p>
        <div className="mt-4 rounded-xl border border-amber-800/60 bg-amber-950/30 p-3 text-xs leading-5 text-amber-100">
          L’installation nécessite une adresse HTTPS et une première connexion Internet. Elle n’enregistre pas les données magasin sur cet appareil : les ventes et les opérations nécessitent toujours une réponse de confirmation du serveur.
        </div>
        <button type="button" onClick={() => setHelpOpen(false)} className="mt-5 w-full rounded-xl bg-orange-500 px-4 py-3 text-sm font-bold text-white hover:bg-orange-400">Compris</button>
      </section>
    </div>}
  </>;
}

export function NetworkStatusBanner() {
  const [online, setOnline] = useState(() => navigator.onLine);

  useEffect(() => {
    const goOnline = () => setOnline(true);
    const goOffline = () => setOnline(false);
    window.addEventListener('online', goOnline);
    window.addEventListener('offline', goOffline);
    return () => {
      window.removeEventListener('online', goOnline);
      window.removeEventListener('offline', goOffline);
    };
  }, []);

  if (online) return null;

  return <div role="alert" className="fixed inset-x-0 top-0 z-[90] flex items-center justify-center gap-3 border-b border-amber-700/70 bg-amber-950/95 px-3 py-2.5 pt-[calc(env(safe-area-inset-top)+0.625rem)] text-amber-50 shadow-xl backdrop-blur">
    <WifiOff className="h-4 w-4 shrink-0 text-amber-300" />
    <p className="max-w-3xl text-xs leading-5"><strong>Hors connexion.</strong> Les données ne sont pas synchronisées et les ventes ne sont pas enregistrées tant que le serveur ne les a pas confirmées.</p>
  </div>;
}
