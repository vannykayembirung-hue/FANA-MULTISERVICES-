import React, { useState } from 'react';
import {
  BarChart3, Calculator, ChartNoAxesCombined, LogOut, Package, Settings2,
  Store, Truck, UserRoundCog, Users, X,
} from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { useAuth } from '../../context/AuthContext';
import { Currency, UserRole } from '../../types';
import { roleLabel } from '../../utils/roles';
import { PwaInstallButton } from '../pwa/PwaControls';

export type ActiveTab = 'pos' | 'dashboard' | 'finance' | 'products' | 'clients' | 'suppliers' | 'caisse' | 'team';

interface NavigationProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
}

const NAV_ITEMS: Array<{ id: ActiveTab; label: string; icon: React.ElementType; managerOnly?: boolean; bossOnly?: boolean }> = [
  { id: 'pos', label: 'Ventes', icon: Store },
  { id: 'dashboard', label: 'Tableau de bord', icon: BarChart3, managerOnly: true },
  { id: 'products', label: 'Produits & stocks', icon: Package, managerOnly: true },
  { id: 'clients', label: 'Clients & crédits', icon: Users, managerOnly: true },
  { id: 'suppliers', label: 'Fournisseurs', icon: Truck, managerOnly: true },
  { id: 'caisse', label: 'Caisse & clôture', icon: Calculator, managerOnly: true },
  { id: 'finance', label: 'Rapports', icon: ChartNoAxesCombined, managerOnly: true },
  { id: 'team', label: 'Équipe & rôles', icon: UserRoundCog, bossOnly: true },
];

function allowedItems(role: UserRole) {
  return NAV_ITEMS.filter(item => {
    if (item.bossOnly) return role === 'ADMIN';
    return !item.managerOnly || role === 'ADMIN' || role === 'GERANT';
  });
}

export const Navigation: React.FC<NavigationProps> = ({ activeTab, onSelectTab }) => {
  const { user, settings, displayCurrency, usdRate, setDisplayCurrency, saveUsdRate, isSaving } = useApp();
  const { logout } = useAuth();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [rateInput, setRateInput] = useState(settings.usdRate?.toString() || '');
  const [settingsMessage, setSettingsMessage] = useState<string | null>(null);

  const chooseCurrency = async (currency: Currency) => {
    const success = await setDisplayCurrency(currency);
    if (success) setSettingsMessage(null);
  };

  const saveRate = async (event: React.FormEvent) => {
    event.preventDefault();
    const success = await saveUsdRate(Number(rateInput));
    if (success) setSettingsMessage('Taux enregistré. Les montants restent comptabilisés en CDF.');
  };

  return <>
    <header className="relative z-30 flex h-16 shrink-0 items-center justify-between gap-3 border-b border-slate-800 bg-slate-950 px-3 sm:px-5">
      <div className="flex min-w-0 items-center gap-3">
        <button type="button" onClick={() => onSelectTab('pos')} className="flex min-w-0 items-center gap-2.5 text-left">
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-orange-400 to-orange-600 text-white shadow-lg shadow-orange-950/30"><Store size={21} /></span>
          <span className="min-w-0">
            <span className="block truncate text-sm font-black tracking-wide text-white sm:text-base">F.A.N.A</span>
            <span className="block max-w-[46vw] truncate text-[10px] text-slate-500">{settings.organizationName || 'Espace de gestion'}</span>
          </span>
        </button>
        <span className="hidden rounded-full border border-emerald-900/70 bg-emerald-950/40 px-2.5 py-1 text-[10px] font-semibold text-emerald-300 xl:inline-flex">Neon · données centralisées</span>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <PwaInstallButton compact />
        {user.role === 'ADMIN' && <>
          <div className="flex items-center rounded-xl border border-slate-800 bg-slate-900 p-0.5" aria-label="Devise d’affichage">
            {(['CDF', 'USD'] as Currency[]).map(currency => (
              <button key={currency} type="button" onClick={() => void chooseCurrency(currency)} className={`min-w-12 rounded-lg px-2 py-1.5 text-xs font-extrabold transition ${displayCurrency === currency ? 'bg-orange-500 text-white' : 'text-slate-400 hover:text-white'}`}>
                {currency}
              </button>
            ))}
          </div>
          <button type="button" onClick={() => { setRateInput(usdRate?.toString() || ''); setSettingsMessage(null); setSettingsOpen(true); }} className="rounded-xl border border-slate-800 bg-slate-900 p-2 text-slate-300 transition hover:border-slate-700 hover:text-orange-300" aria-label="Paramètres devise" title="Taux de change CDF/USD">
            <Settings2 size={18} />
          </button>
        </>}
        {isSaving && <span className="hidden text-[10px] font-medium text-slate-500 sm:inline">Enregistrement…</span>}
        <span className="max-w-[4.4rem] truncate rounded-md border border-slate-800 bg-slate-900 px-1.5 py-1 text-[9px] font-bold text-slate-300 sm:hidden">{roleLabel(user.role)}</span>
        <div className="hidden items-center gap-2 border-l border-slate-800 pl-3 sm:flex">
          <div className="flex h-8 w-8 items-center justify-center rounded-xl bg-slate-800 text-xs font-bold uppercase text-orange-300">{user.name.trim().slice(0, 1) || 'F'}</div>
          <div className="max-w-32">
            <div className="truncate text-xs font-bold text-slate-100">{user.name}</div>
            <div className="text-[9px] uppercase tracking-wider text-slate-500">{roleLabel(user.role)}</div>
          </div>
        </div>
        <button type="button" onClick={() => void logout()} className="rounded-xl border border-slate-800 bg-slate-900 p-2 text-slate-400 transition hover:border-red-900/70 hover:text-red-300" aria-label="Se déconnecter" title="Se déconnecter">
          <LogOut size={18} />
        </button>
      </div>
    </header>

    {settingsOpen && <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/70 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-2xl border border-slate-700 bg-slate-950 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 px-5 py-4">
          <div><h2 className="font-bold text-white">Devise & taux de change</h2><p className="mt-1 text-xs text-slate-400">Saisissez le taux réellement appliqué par votre magasin.</p></div>
          <button type="button" onClick={() => setSettingsOpen(false)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white" aria-label="Fermer"><X size={18} /></button>
        </div>
        <form onSubmit={saveRate} className="space-y-4 p-5">
          <div className="rounded-xl border border-slate-800 bg-slate-900 p-3 text-xs leading-5 text-slate-300">
            Toutes les opérations sont conservées dans le grand livre en <strong className="text-white">CDF</strong>. Le montant USD affiché est calculé avec le taux que vous enregistrez ici. Aucun taux automatique n’est inventé.
          </div>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-slate-300">Valeur de 1 USD en CDF</span>
            <input type="number" min="1" step="any" required value={rateInput} onChange={event => setRateInput(event.target.value)} placeholder="Entrez votre taux réel" className="w-full rounded-xl border border-slate-700 bg-slate-900 px-3 py-3 font-mono text-white outline-none focus:border-orange-500" />
          </label>
          <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900 p-3">
            <div><div className="text-xs font-bold text-white">Devise d’affichage actuelle</div><div className="mt-0.5 text-[11px] text-slate-500">Change uniquement l’affichage, pas les données enregistrées.</div></div>
            <select value={displayCurrency} onChange={event => void chooseCurrency(event.target.value as Currency)} className="rounded-lg border border-slate-700 bg-slate-800 px-2 py-2 text-xs font-bold text-white"><option value="CDF">CDF</option><option value="USD" disabled={!usdRate}>USD</option></select>
          </div>
          {settingsMessage && <div role="status" className="rounded-lg border border-emerald-900 bg-emerald-950/40 px-3 py-2 text-xs text-emerald-300">{settingsMessage}</div>}
          <div className="flex justify-end gap-2 pt-1">
            <button type="button" onClick={() => setSettingsOpen(false)} className="rounded-xl bg-slate-800 px-4 py-2.5 text-xs font-semibold text-slate-300 hover:bg-slate-700">Fermer</button>
            <button type="submit" className="rounded-xl bg-orange-500 px-4 py-2.5 text-xs font-bold text-white hover:bg-orange-400">Enregistrer le taux</button>
          </div>
        </form>
      </div>
    </div>}
  </>;
};

export const SidebarNavigation: React.FC<NavigationProps> = ({ activeTab, onSelectTab }) => {
  const { currentRole, products, clients } = useApp();
  const lowStockCount = products.filter(product => product.stock <= product.stockAlerte).length;
  const debtCount = clients.filter(client => client.credit > 0).length;
  return <aside className="hidden w-60 shrink-0 flex-col border-r border-slate-800 bg-slate-950 md:flex lg:w-64">
    <div className="px-4 pb-2 pt-5 text-[10px] font-bold uppercase tracking-[0.18em] text-slate-600">Gestion du magasin</div>
    <nav className="flex-1 space-y-1 overflow-y-auto p-3">
      {allowedItems(currentRole).map(item => {
        const Icon = item.icon;
        const isActive = activeTab === item.id;
        const badge = item.id === 'products' && lowStockCount ? lowStockCount : item.id === 'clients' && debtCount ? debtCount : null;
        return <button key={item.id} type="button" onClick={() => onSelectTab(item.id)} className={`flex w-full items-center justify-between gap-2 rounded-xl px-3 py-3 text-left text-xs font-semibold transition ${isActive ? 'bg-orange-500 text-white shadow-lg shadow-orange-950/30' : 'text-slate-400 hover:bg-slate-900 hover:text-white'}`}>
          <span className="flex items-center gap-3"><Icon size={17} /><span>{item.label}</span></span>
          {badge !== null && <span className={`rounded-md px-1.5 py-0.5 text-[10px] font-bold ${isActive ? 'bg-white/20 text-white' : 'bg-slate-800 text-slate-300'}`}>{badge}</span>}
        </button>;
      })}
    </nav>
    <div className="border-t border-slate-800 p-4 text-[10px] leading-5 text-slate-600">Les opérations sont enregistrées sur Neon après confirmation du serveur. Actualisez un autre appareil pour charger les dernières données.</div>
  </aside>;
};

export const MobileNavigation: React.FC<NavigationProps> = ({ activeTab, onSelectTab }) => {
  const { currentRole } = useApp();
  return <nav aria-label="Navigation principale" className="z-40 shrink-0 border-t border-slate-800 bg-slate-950/95 pb-[env(safe-area-inset-bottom)] backdrop-blur md:hidden">
    <div className="flex h-[4.25rem] items-stretch gap-1 overflow-x-auto px-1.5 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      {allowedItems(currentRole).map(item => {
        const Icon = item.icon;
        return <button key={item.id} type="button" onClick={() => onSelectTab(item.id)} aria-current={activeTab === item.id ? 'page' : undefined} className={`flex min-w-[4.2rem] flex-1 flex-col items-center justify-center gap-1 px-1 text-[9px] font-semibold ${activeTab === item.id ? 'text-orange-400' : 'text-slate-500'}`}>
          <span className={`rounded-xl p-1.5 ${activeTab === item.id ? 'bg-orange-500/15' : ''}`}><Icon size={17} /></span><span className="max-w-full truncate">{item.label.split(' ')[0]}</span>
        </button>;
      })}
    </div>
  </nav>;
};
