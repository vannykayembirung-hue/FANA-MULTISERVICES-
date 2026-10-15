import React, { useState } from 'react';
import { AppProvider } from './context/AppContext';
import { Navigation, ActiveTab } from './components/layout/Navigation';
import { PosView } from './components/pos/PosView';
import { DashboardView } from './components/dashboard/DashboardView';
import { ProductsView } from './components/products/ProductsView';
import { MultiservicesView } from './components/multiservices/MultiservicesView';
import { ClientsView } from './components/clients/ClientsView';
import { FournisseursView } from './components/fournisseurs/FournisseursView';
import { CaisseView } from './components/caisse/CaisseView';
import { FinancialReportView } from './components/finance/FinancialReportView';

function MainLayout() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('pos');

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-slate-900 text-slate-100">
      {/* Top Header */}
      <div className="flex flex-1 overflow-hidden">
        {/* Navigation Sidebar & Header */}
        <Navigation activeTab={activeTab} onSelectTab={setActiveTab} />

        {/* Main Workspace Area */}
        <main className="flex-1 flex flex-col h-full overflow-hidden relative">
          {activeTab === 'pos' && <PosView />}
          {activeTab === 'dashboard' && (
            <DashboardView
              onNavigateToProducts={() => setActiveTab('products')}
              onNavigateToServices={() => setActiveTab('services')}
              onNavigateToPos={() => setActiveTab('pos')}
              onNavigateToSuppliers={() => setActiveTab('suppliers')}
              onNavigateToFinance={() => setActiveTab('finance')}
            />
          )}
          {activeTab === 'finance' && <FinancialReportView />}
          {activeTab === 'products' && <ProductsView />}
          {activeTab === 'services' && <MultiservicesView />}
          {activeTab === 'clients' && <ClientsView />}
          {activeTab === 'suppliers' && <FournisseursView />}
          {activeTab === 'caisse' && <CaisseView />}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AppProvider>
      <MainLayout />
    </AppProvider>
  );
}
