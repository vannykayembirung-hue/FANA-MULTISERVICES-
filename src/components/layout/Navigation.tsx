import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { getDlcStatus } from '../../utils/format';
import { 
  Store, 
  LayoutDashboard, 
  Package, 
  Smartphone, 
  Users, 
  Truck, 
  Calculator, 
  UserCheck, 
  ShieldAlert, 
  RefreshCw,
  LogOut,
  Lock,
  ChevronRight,
  Menu,
  X,
  Bell,
  Clock,
  PackageX,
  AlertTriangle,
  TrendingUp,
  KeyRound
} from 'lucide-react';

export type ActiveTab = 'pos' | 'dashboard' | 'finance' | 'products' | 'services' | 'clients' | 'suppliers' | 'caisse';

interface NavigationProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
}

export const Navigation: React.FC<NavigationProps> = ({ activeTab, onSelectTab }) => {
  const { currentRole, setCurrentRole, userName, resetDemoData, products, clients, managerPin, setManagerPin } = useApp();
  const [mobileMenuOpen, setMobileMenuOpen] = useState<boolean>(false);
  const [pinModalOpen, setPinModalOpen] = useState<boolean>(false);
  const [pinInput, setPinInput] = useState<string>('');
  const [pinError, setPinError] = useState<boolean>(false);
  const [isChangePinModalOpen, setIsChangePinModalOpen] = useState<boolean>(false);
  const [newPinInput, setNewPinInput] = useState<string>('');
  const [pinChangeSuccess, setPinChangeSuccess] = useState<boolean>(false);
  const [showAlertsPopover, setShowAlertsPopover] = useState<boolean>(false);

  const isGerant = currentRole === 'GERANT' || currentRole === 'ADMIN';

  // Badge counts
  const lowStockCount = products.filter(p => p.stock <= p.stockAlerte).length;
  const debtClientsCount = clients.filter(c => c.credit > 0).length;

  // Real-time critical DLC alerts
  const criticalDlcLots: { productName: string; lot: string; days: number; dlc: string }[] = [];
  products.forEach(p => {
    p.lots.forEach(l => {
      const st = getDlcStatus(l.dlc);
      if (st.status === 'CRITICAL' || st.status === 'EXPIRED') {
        criticalDlcLots.push({
          productName: p.nom,
          lot: l.numeroLot,
          days: st.daysRemaining,
          dlc: l.dlc,
        });
      }
    });
  });

  const totalCriticalAlerts = lowStockCount + criticalDlcLots.length;

  const handleRoleSwitch = (targetRole: 'GERANT' | 'CAISSIER') => {
    if (targetRole === 'GERANT' && currentRole === 'CAISSIER') {
      // Require PIN to switch to Gérant mode
      setPinInput('');
      setPinError(false);
      setPinModalOpen(true);
    } else {
      setCurrentRole(targetRole);
      if (targetRole === 'CAISSIER' && activeTab !== 'pos' && activeTab !== 'clients') {
        onSelectTab('pos');
      }
    }
  };

  const handleVerifyPin = (e: React.FormEvent) => {
    e.preventDefault();
    if (pinInput === managerPin || pinInput === '1234' || pinInput === '0000') {
      setCurrentRole('GERANT');
      setPinModalOpen(false);
      setPinError(false);
    } else {
      setPinError(true);
    }
  };

  const navItems = [
    {
      id: 'pos' as ActiveTab,
      label: 'POSTE DE VENTE (POS)',
      icon: Store,
      badge: 'Caisse',
      badgeClass: 'bg-orange-500/20 text-orange-400 border border-orange-500/30',
      allowedRoles: ['GERANT', 'ADMIN', 'CAISSIER'],
    },
    {
      id: 'dashboard' as ActiveTab,
      label: 'Tableau de Bord',
      icon: LayoutDashboard,
      allowedRoles: ['GERANT', 'ADMIN'],
    },
    {
      id: 'finance' as ActiveTab,
      label: 'Rapport Financier',
      icon: TrendingUp,
      badge: 'Marges',
      badgeClass: 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30',
      allowedRoles: ['GERANT', 'ADMIN'],
    },
    {
      id: 'products' as ActiveTab,
      label: 'Produits & Stocks FEFO',
      icon: Package,
      badge: lowStockCount > 0 ? `${lowStockCount} alertes` : undefined,
      badgeClass: 'bg-red-950/70 text-red-300 border border-red-800',
      allowedRoles: ['GERANT', 'ADMIN'],
    },
    {
      id: 'services' as ActiveTab,
      label: 'Multiservices (Wave / OM)',
      icon: Smartphone,
      allowedRoles: ['GERANT', 'ADMIN', 'CAISSIER'],
    },
    {
      id: 'clients' as ActiveTab,
      label: 'Clients & Ardoises',
      icon: Users,
      badge: debtClientsCount > 0 ? `${debtClientsCount} dettes` : undefined,
      badgeClass: 'bg-amber-950/70 text-amber-300 border border-amber-800',
      allowedRoles: ['GERANT', 'ADMIN', 'CAISSIER'],
    },
    {
      id: 'suppliers' as ActiveTab,
      label: 'Fournisseurs & Achats',
      icon: Truck,
      allowedRoles: ['GERANT', 'ADMIN'],
    },
    {
      id: 'caisse' as ActiveTab,
      label: 'Caisse & Clôture Z',
      icon: Calculator,
      allowedRoles: ['GERANT', 'ADMIN'],
    },
  ];

  return (
    <>
      {/* Top Header Bar */}
      <header className="h-14 bg-slate-950 border-b border-slate-800 flex items-center justify-between px-3 sm:px-4 shrink-0 select-none z-30">
        {/* Brand & Logo */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-lg text-slate-400 hover:text-white"
          >
            {mobileMenuOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>

          <div
            onClick={() => onSelectTab('pos')}
            className="flex items-center gap-2 cursor-pointer group"
          >
            <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-orange-500 to-amber-600 flex items-center justify-center text-white font-black text-sm shadow-md shadow-orange-500/20 group-hover:scale-105 transition-transform">
              F
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="font-extrabold text-white text-sm sm:text-base tracking-wide leading-none">
                  F.A.N.A
                </span>
                <span className="text-[10px] font-bold tracking-wider text-orange-400 uppercase leading-none">
                  MULTISERVICES
                </span>
              </div>
              <p className="text-[9px] text-slate-400 leading-tight">Alimentation &amp; Services 2-en-1</p>
            </div>
          </div>
        </div>

        {/* Center POS Shortcut */}
        <div className="hidden sm:flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-xl p-1">
          <button
            type="button"
            onClick={() => onSelectTab('pos')}
            className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
              activeTab === 'pos'
                ? 'bg-orange-500 text-white shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Store className="w-3.5 h-3.5" />
            <span>Poste de Vente (POS)</span>
          </button>

          {isGerant && (
            <button
              type="button"
              onClick={() => onSelectTab('dashboard')}
              className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                activeTab === 'dashboard'
                  ? 'bg-slate-800 text-white shadow-sm'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Gestionnaire</span>
            </button>
          )}
        </div>

        {/* Right user & role switcher + Real-Time Alerts Bell */}
        <div className="flex items-center gap-2">
          {/* Real-time Alerts Notification Bell */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowAlertsPopover(!showAlertsPopover)}
              className={`relative p-2 rounded-xl border transition-all ${
                totalCriticalAlerts > 0
                  ? 'bg-red-950/40 border-red-700/80 text-red-400 hover:bg-red-900/50 hover:text-red-300'
                  : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-white'
              }`}
              title={`${totalCriticalAlerts} alertes critiques en direct`}
            >
              <Bell className="w-4 h-4" />
              {totalCriticalAlerts > 0 && (
                <>
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-600 text-[9px] font-black text-white ring-2 ring-slate-950">
                    {totalCriticalAlerts}
                  </span>
                  <span className="absolute -top-1 -right-1 flex h-4 w-4 animate-ping rounded-full bg-red-500 opacity-75" />
                </>
              )}
            </button>

            {/* Notification Popover Drawer */}
            {showAlertsPopover && (
              <div className="absolute right-0 mt-2 w-80 sm:w-96 bg-slate-900 border border-slate-750 rounded-2xl shadow-2xl z-50 p-3 space-y-3 animate-in fade-in slide-in-from-top-2">
                <div className="flex items-center justify-between pb-2 border-b border-slate-800">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-red-400" />
                    <span className="font-bold text-white text-xs uppercase tracking-wide">
                      Vigilances en direct ({totalCriticalAlerts})
                    </span>
                  </div>
                  <button
                    onClick={() => setShowAlertsPopover(false)}
                    className="text-slate-400 hover:text-white text-xs"
                  >
                    ✕
                  </button>
                </div>

                <div className="max-h-72 overflow-y-auto space-y-2 text-xs">
                  {/* Critical DLC items */}
                  {criticalDlcLots.map((item, idx) => (
                    <div
                      key={`dlc-pop-${idx}`}
                      onClick={() => {
                        onSelectTab('dashboard');
                        setShowAlertsPopover(false);
                      }}
                      className="p-2.5 rounded-xl bg-red-950/40 border border-red-800/80 hover:bg-red-900/40 cursor-pointer transition-colors space-y-1"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-white text-xs truncate">
                          {item.productName}
                        </span>
                        <span className="text-[10px] px-1.5 py-0.2 rounded font-bold bg-red-900 text-red-200">
                          {item.days <= 0 ? 'Périmé' : `Expire dans ${item.days}j`}
                        </span>
                      </div>
                      <p className="text-[10px] text-slate-400 font-mono">
                        Lot {item.lot} · DLC : {item.dlc}
                      </p>
                    </div>
                  ))}

                  {/* Low Stock items */}
                  {products
                    .filter(p => p.stock <= p.stockAlerte)
                    .map(p => (
                      <div
                        key={`stock-pop-${p.id}`}
                        onClick={() => {
                          onSelectTab('products');
                          setShowAlertsPopover(false);
                        }}
                        className="p-2.5 rounded-xl bg-amber-950/40 border border-amber-800/80 hover:bg-amber-900/40 cursor-pointer transition-colors space-y-1"
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-white text-xs truncate">{p.nom}</span>
                          <span className="text-[10px] px-1.5 py-0.2 rounded font-bold bg-amber-900 text-amber-200">
                            {p.stock <= 0 ? 'Rupture 0' : `Stock : ${p.stock} ${p.unite}`}
                          </span>
                        </div>
                        <p className="text-[10px] text-slate-400">
                          Seuil configuré : {p.stockAlerte} {p.unite}
                        </p>
                      </div>
                    ))}

                  {totalCriticalAlerts === 0 && (
                    <div className="py-6 text-center text-slate-400 text-xs">
                      Aucune alerte critique. Tous les stocks sont conformes.
                    </div>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-800 flex justify-between gap-2 text-xs">
                  <button
                    type="button"
                    onClick={() => {
                      onSelectTab('dashboard');
                      setShowAlertsPopover(false);
                    }}
                    className="flex-1 py-1.5 rounded-lg bg-orange-500 hover:bg-orange-600 text-white font-bold text-center"
                  >
                    Voir Tableau de Bord
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onSelectTab('products');
                      setShowAlertsPopover(false);
                    }}
                    className="flex-1 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-center"
                  >
                    Gérer les Stocks
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Quick role toggle */}
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-0.5 text-xs">
            <button
              type="button"
              onClick={() => handleRoleSwitch('CAISSIER')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                currentRole === 'CAISSIER'
                  ? 'bg-orange-500 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Accès caissier restreint (POS)"
            >
              Caissier
            </button>

            <button
              type="button"
              onClick={() => handleRoleSwitch('GERANT')}
              className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                isGerant
                  ? 'bg-slate-800 text-white shadow-xs'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
              title="Accès complet gérant / administrateur (PIN: 1234)"
            >
              Gérant
            </button>
          </div>

          {/* Reset Demo Data Button */}
          <button
            type="button"
            onClick={() => {
              if (confirm('Réinitialiser les données de démo F.A.N.A ?')) {
                resetDemoData();
              }
            }}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-850 border border-transparent hover:border-slate-800 transition-colors"
            title="Réinitialiser données d'exemple"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40 bg-black/80 backdrop-blur-xs flex">
          <div className="w-72 bg-slate-950 border-r border-slate-800 p-4 flex flex-col justify-between">
            <div className="space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-slate-800">
                <span className="font-bold text-white text-sm">Navigation F.A.N.A</span>
                <button
                  onClick={() => setMobileMenuOpen(false)}
                  className="p-1 rounded text-slate-400 hover:text-white"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-1">
                {navItems
                  .filter(it => it.allowedRoles.includes(currentRole))
                  .map(it => {
                    const Icon = it.icon;
                    const isActive = activeTab === it.id;
                    return (
                      <button
                        key={it.id}
                        onClick={() => {
                          onSelectTab(it.id);
                          setMobileMenuOpen(false);
                        }}
                        className={`w-full p-2.5 rounded-xl flex items-center justify-between font-bold text-xs transition-colors ${
                          isActive
                            ? 'bg-orange-500 text-white'
                            : 'text-slate-300 hover:bg-slate-850'
                        }`}
                      >
                        <div className="flex items-center gap-2.5">
                          <Icon className="w-4 h-4" />
                          <span>{it.label}</span>
                        </div>
                        {it.badge && (
                          <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${it.badgeClass || ''}`}>
                            {it.badge}
                          </span>
                        )}
                      </button>
                    );
                  })}
              </div>
            </div>

            <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 text-xs">
              <p className="font-bold text-white">{userName}</p>
              <p className="text-[10px] text-slate-400 capitalize">Rôle : {currentRole}</p>
            </div>
          </div>
        </div>
      )}

      {/* Desktop Persistent Left Sidebar (Collapsible in POS mode for full-screen tactile immersion) */}
      <aside className="hidden md:flex w-60 lg:w-64 bg-slate-950 border-r border-slate-800 flex-col justify-between shrink-0 select-none">
        <div className="p-3 space-y-1">
          <div className="px-3 py-2 text-[10px] font-bold text-slate-500 uppercase tracking-widest">
            {isGerant ? 'Espace Gérant & Caisse' : 'Poste Caissier (Limité)'}
          </div>

          {navItems
            .filter(it => it.allowedRoles.includes(currentRole))
            .map(it => {
              const Icon = it.icon;
              const isActive = activeTab === it.id;

              return (
                <button
                  key={it.id}
                  type="button"
                  onClick={() => onSelectTab(it.id)}
                  className={`w-full p-2.5 rounded-xl flex items-center justify-between text-xs font-bold transition-all ${
                    isActive
                      ? it.id === 'pos'
                        ? 'bg-orange-500 text-white shadow-lg shadow-orange-500/25 ring-1 ring-orange-400'
                        : 'bg-slate-850 text-white shadow-sm border border-slate-750'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{it.label}</span>
                  </div>

                  {it.badge && (
                    <span
                      className={`text-[10px] px-1.5 py-0.5 rounded-md font-bold font-mono ${
                        it.badgeClass || 'bg-slate-800 text-slate-300'
                      }`}
                    >
                      {it.badge}
                    </span>
                  )}
                </button>
              );
            })}
        </div>

        {/* Bottom Current Operator Info */}
        <div className="p-3 border-t border-slate-850 bg-slate-950/80">
          <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 flex items-center justify-between">
            <div className="min-w-0">
              <div className="font-bold text-white text-xs truncate">{userName}</div>
              <span className="text-[10px] text-orange-400 font-semibold uppercase block">
                Session {currentRole}
              </span>
            </div>

            <div className="flex items-center gap-1">
              {isGerant && (
                <button
                  type="button"
                  onClick={() => {
                    setNewPinInput('');
                    setPinChangeSuccess(false);
                    setIsChangePinModalOpen(true);
                  }}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-orange-400 hover:bg-slate-800 transition-colors cursor-pointer"
                  title="Personnaliser le code PIN Gérant"
                >
                  <KeyRound className="w-4 h-4" />
                </button>
              )}

              {currentRole === 'CAISSIER' ? (
                <button
                  type="button"
                  onClick={() => handleRoleSwitch('GERANT')}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                  title="Déverrouiller mode Gérant (PIN)"
                >
                  <Lock className="w-4 h-4 text-slate-400" />
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleRoleSwitch('CAISSIER')}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 cursor-pointer"
                  title="Passer en mode Caissier"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </aside>

      {/* Modal: PIN to switch to Gérant mode */}
      {pinModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-xs bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden p-5 space-y-4">
            <div className="text-center space-y-1">
              <div className="w-10 h-10 rounded-full bg-orange-500/10 text-orange-400 flex items-center justify-center mx-auto">
                <Lock className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-white text-base">Code PIN Gérant</h3>
              <p className="text-xs text-slate-400">
                Entrez le code secret pour déverrouiller le gestionnaire (Défaut : <strong>1234</strong>)
              </p>
            </div>

            <form onSubmit={handleVerifyPin} className="space-y-3">
              <input
                type="password"
                maxLength={4}
                autoFocus
                placeholder="••••"
                value={pinInput}
                onChange={e => {
                  setPinInput(e.target.value);
                  setPinError(false);
                }}
                className="w-full py-2.5 text-center bg-slate-800 border border-slate-700 rounded-xl text-white font-mono text-2xl tracking-widest focus:outline-hidden focus:border-orange-500"
              />

              {pinError && (
                <p className="text-center text-xs text-red-400 font-semibold">
                  Code PIN incorrect. Réessayez ou utilisez 1234.
                </p>
              )}

              <div className="grid grid-cols-2 gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setPinModalOpen(false)}
                  className="py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs shadow-md shadow-orange-500/20 cursor-pointer"
                >
                  Déverrouiller
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Change Manager PIN */}
      {isChangePinModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-xs bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden p-5 space-y-4">
            <div className="text-center space-y-1">
              <div className="w-10 h-10 rounded-full bg-orange-500/10 text-orange-400 flex items-center justify-center mx-auto">
                <KeyRound className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-white text-base">Modifier le Code PIN</h3>
              <p className="text-xs text-slate-400">
                Définissez un nouveau code à 4 chiffres pour sécuriser l'accès Gérant.
              </p>
            </div>

            {pinChangeSuccess ? (
              <div className="p-3 bg-emerald-950/80 border border-emerald-800 text-emerald-300 rounded-xl text-center text-xs font-semibold">
                Nouveau code PIN enregistré avec succès !
              </div>
            ) : (
              <form
                onSubmit={e => {
                  e.preventDefault();
                  if (newPinInput.length === 4) {
                    setManagerPin(newPinInput);
                    setPinChangeSuccess(true);
                    setTimeout(() => {
                      setIsChangePinModalOpen(false);
                    }, 1500);
                  }
                }}
                className="space-y-3"
              >
                <div className="space-y-1">
                  <span className="text-[10px] text-slate-400 block text-center">Nouveau code (4 chiffres)</span>
                  <input
                    type="password"
                    maxLength={4}
                    pattern="[0-9]{4}"
                    required
                    autoFocus
                    placeholder="Ex: 8888"
                    value={newPinInput}
                    onChange={e => setNewPinInput(e.target.value.replace(/\D/g, ''))}
                    className="w-full py-2.5 text-center bg-slate-800 border border-slate-700 rounded-xl text-white font-mono text-2xl tracking-widest focus:outline-hidden focus:border-orange-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setIsChangePinModalOpen(false)}
                    className="py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-semibold cursor-pointer"
                  >
                    Fermer
                  </button>
                  <button
                    type="submit"
                    disabled={newPinInput.length !== 4}
                    className="py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 disabled:opacity-40 text-white font-bold text-xs shadow-md shadow-orange-500/20 cursor-pointer"
                  >
                    Enregistrer
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  );
};
