import React, { lazy, Suspense, useState } from 'react';
import { AppProvider, useApp } from './context/AppContext';
import { AuthProvider, useAuth } from './context/AuthContext';
import { AuthScreen } from './components/auth/AuthScreen';
import { Navigation, SidebarNavigation, MobileNavigation, ActiveTab } from './components/layout/Navigation';
const PosView = lazy(() => import('./components/pos/PosView').then(module => ({ default: module.PosView })));
const DashboardView = lazy(() => import('./components/dashboard/DashboardView').then(module => ({ default: module.DashboardView })));
const ProductsView = lazy(() => import('./components/products/ProductsView').then(module => ({ default: module.ProductsView })));
const MultiservicesView = lazy(() => import('./components/multiservices/MultiservicesView').then(module => ({ default: module.MultiservicesView })));
const ClientsView = lazy(() => import('./components/clients/ClientsView').then(module => ({ default: module.ClientsView })));
const FournisseursView = lazy(() => import('./components/fournisseurs/FournisseursView').then(module => ({ default: module.FournisseursView })));
const CaisseView = lazy(() => import('./components/caisse/CaisseView').then(module => ({ default: module.CaisseView })));
const FinancialReportView = lazy(() => import('./components/finance/FinancialReportView').then(module => ({ default: module.FinancialReportView })));
import { Produit } from './types';
import { RefreshCw, Store, TriangleAlert, X } from 'lucide-react';

function MainLayout() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('pos');
  const { addToCart, error, clearError, isLoading, refresh } = useApp();

  const openProductInPos = (product?: Produit) => {
    setActiveTab('pos');
    if (product) addToCart(product);
  };

  return <div className="flex h-[100dvh] min-h-[100dvh] w-full flex-col overflow-hidden bg-slate-900 text-slate-100">
    <Navigation activeTab={activeTab} onSelectTab={setActiveTab} />
    <div className="flex min-h-0 flex-1 overflow-hidden">
      <SidebarNavigation activeTab={activeTab} onSelectTab={setActiveTab} />
      <main className="relative flex min-w-0 flex-1 flex-col overflow-hidden">
        {error && <div role="alert" className="z-20 mx-3 mt-3 flex shrink-0 items-start gap-3 rounded-xl border border-amber-700/60 bg-amber-950/50 p-3 text-xs text-amber-100 sm:mx-5">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-400" />
          <div className="min-w-0 flex-1"><p className="font-semibold">{error}</p><p className="mt-1 text-[10px] text-amber-200/70">Les modifications ne sont confirmées qu’après enregistrement dans Neon.</p></div>
          <button type="button" onClick={() => void refresh()} className="rounded-lg p-1 text-amber-200 hover:bg-amber-900/50" aria-label="Réessayer"><RefreshCw size={15} /></button>
          <button type="button" onClick={clearError} className="rounded-lg p-1 text-amber-200 hover:bg-amber-900/50" aria-label="Fermer"><X size={15} /></button>
        </div>}
        {isLoading ? <div className="flex flex-1 flex-col items-center justify-center gap-3 text-slate-400">
          <Store className="h-8 w-8 animate-pulse text-orange-400" /><p className="text-sm">Chargement des données enregistrées…</p>
        </div> : <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
          <Suspense fallback={<div className="flex flex-1 items-center justify-center text-sm text-slate-400">Chargement de l’écran…</div>}>
            {activeTab === 'pos' && <PosView />}
            {activeTab === 'dashboard' && <DashboardView
              onNavigateToProducts={() => setActiveTab('products')}
              onNavigateToServices={() => setActiveTab('services')}
              onNavigateToPos={openProductInPos}
              onNavigateToSuppliers={() => setActiveTab('suppliers')}
              onNavigateToFinance={() => setActiveTab('finance')}
            />}
            {activeTab === 'finance' && <FinancialReportView />}
            {activeTab === 'products' && <ProductsView />}
            {activeTab === 'services' && <MultiservicesView />}
            {activeTab === 'clients' && <ClientsView />}
            {activeTab === 'suppliers' && <FournisseursView />}
            {activeTab === 'caisse' && <CaisseView />}
          </Suspense>
        </div>}
      </main>
    </div>
    <MobileNavigation activeTab={activeTab} onSelectTab={setActiveTab} />
  </div>;
}

function SessionRouter() {
  const { user, status } = useAuth();
  if (status === 'loading') return <div className="flex min-h-[100dvh] items-center justify-center bg-slate-950 text-slate-300"><div className="flex items-center gap-3"><Store className="h-6 w-6 animate-pulse text-orange-400" /><span className="text-sm">Vérification de la session…</span></div></div>;
  if (!user) return <AuthScreen />;
  return <AppProvider key={user.id} user={user}><MainLayout /></AppProvider>;
}

export default function App() {
  return <AuthProvider><SessionRouter /></AuthProvider>;
}
