import React, { useState } from 'react';
import { Produit } from '../../types';
import { getDlcStatus, formatMoney } from '../../utils/format';
import { posAudio } from '../../utils/audio';
import { 
  AlertTriangle, 
  PackageX, 
  Clock, 
  ChevronRight, 
  Volume2, 
  VolumeX, 
  ShoppingCart, 
  Truck, 
  Check, 
  EyeOff, 
  ChevronDown, 
  ChevronUp,
  Sparkles,
  Layers
} from 'lucide-react';

export interface AlertItem {
  id: string;
  type: 'DLC_CRITICAL' | 'STOCK_LOW' | 'EXPIRED';
  product: Produit;
  title: string;
  detail: string;
  lotNumber?: string;
  daysRemaining?: number;
  stockActual: number;
  stockAlertThreshold: number;
  unite: string;
  valeurMenacee: number;
}

interface LiveAlertBannerProps {
  products: Produit[];
  onNavigateToPos: (product?: Produit) => void;
  onNavigateToProducts: () => void;
  onNavigateToSuppliers?: () => void;
  onAddToCart?: (product: Produit) => void;
}

export const LiveAlertBanner: React.FC<LiveAlertBannerProps> = ({
  products,
  onNavigateToPos,
  onNavigateToProducts,
  onNavigateToSuppliers,
  onAddToCart,
}) => {
  const [filterType, setFilterType] = useState<'ALL' | 'DLC' | 'STOCK'>('ALL');
  const [isCollapsed, setIsCollapsed] = useState<boolean>(false);
  const [dismissedAlertIds, setDismissedAlertIds] = useState<Set<string>>(new Set());
  const [soundEnabled, setSoundEnabled] = useState<boolean>(true);

  // Compile real-time alerts
  const alerts: AlertItem[] = [];

  products.forEach(p => {
    // 1. Stock alerts (stock <= stockAlerte)
    if (p.stock <= p.stockAlerte) {
      alerts.push({
        id: `stock-${p.id}`,
        type: 'STOCK_LOW',
        product: p,
        title: p.stock <= 0 ? 'Rupture Totale de Stock' : 'Seuil Critique Atteint',
        detail:
          p.stock <= 0
            ? `Stock épuisé (0 ${p.unite}). Réapprovisionnement requis.`
            : `Reste ${p.stock} ${p.unite} (Seuil d'alerte configuré : ${p.stockAlerte}).`,
        stockActual: p.stock,
        stockAlertThreshold: p.stockAlerte,
        unite: p.unite,
        valeurMenacee: Math.max(0, p.stock * p.prixVente),
      });
    }

    // 2. DLC alerts across product lots
    p.lots.forEach(lot => {
      const dlcInfo = getDlcStatus(lot.dlc);
      if (dlcInfo.status === 'CRITICAL' || dlcInfo.status === 'EXPIRED') {
        alerts.push({
          id: `dlc-${lot.id}`,
          type: dlcInfo.status === 'EXPIRED' ? 'EXPIRED' : 'DLC_CRITICAL',
          product: p,
          title:
            dlcInfo.status === 'EXPIRED'
              ? 'Produit Périmé - Retrait Immédiat'
              : `DLC Imminente : ${dlcInfo.daysRemaining} jour${dlcInfo.daysRemaining > 1 ? 's' : ''} restant${dlcInfo.daysRemaining > 1 ? 's' : ''}`,
          detail: `Lot ${lot.numeroLot} (${lot.quantite} ${p.unite}) - Expiration le ${lot.dlc}`,
          lotNumber: lot.numeroLot,
          daysRemaining: dlcInfo.daysRemaining,
          stockActual: lot.quantite,
          stockAlertThreshold: p.stockAlerte,
          unite: p.unite,
          valeurMenacee: lot.quantite * p.prixVente,
        });
      }
    });
  });

  // Filter out dismissed alerts for this session
  const activeAlerts = alerts.filter(a => !dismissedAlertIds.has(a.id));

  const dlcCount = activeAlerts.filter(a => a.type === 'DLC_CRITICAL' || a.type === 'EXPIRED').length;
  const stockCount = activeAlerts.filter(a => a.type === 'STOCK_LOW').length;

  const filteredAlerts = activeAlerts.filter(a => {
    if (filterType === 'DLC') return a.type === 'DLC_CRITICAL' || a.type === 'EXPIRED';
    if (filterType === 'STOCK') return a.type === 'STOCK_LOW';
    return true;
  });

  const handleDismiss = (id: string) => {
    setDismissedAlertIds(prev => new Set([...prev, id]));
  };

  const handlePlaySound = () => {
    posAudio.playError();
  };

  const handleQuickSell = (product: Produit) => {
    if (onAddToCart) {
      onAddToCart(product);
    }
    onNavigateToPos(product);
  };

  if (activeAlerts.length === 0) {
    return (
      <div className="p-3.5 bg-emerald-950/40 border border-emerald-800/60 rounded-2xl flex items-center justify-between text-xs text-emerald-300 animate-in fade-in">
        <div className="flex items-center gap-2.5">
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-pulse" />
          <span className="font-bold text-white">
            Surveillance en temps réel : Stocks alimentaires et DLC 100% conformes.
          </span>
          <span className="text-emerald-400/80 hidden sm:inline">
            Aucun produit en rupture ni en risque de péremption imminente.
          </span>
        </div>
        <button
          onClick={onNavigateToProducts}
          className="text-xs font-semibold text-emerald-400 hover:text-white underline underline-offset-2 shrink-0"
        >
          Consulter le catalogue
        </button>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-red-950/40 via-slate-900 to-amber-950/30 border border-red-500/40 rounded-2xl p-4 shadow-xl shadow-red-950/20 space-y-3 animate-in fade-in">
      {/* Top Bar of Alert Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="flex items-center gap-2.5">
          {/* Pulsing Alert Beacon */}
          <span className="relative flex h-3 w-3">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
            <span className="relative inline-flex rounded-full h-3 w-3 bg-red-500" />
          </span>

          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-sm font-black text-white tracking-wide uppercase flex items-center gap-1.5">
                <span>Alertes de Vigilance en Temps Réel</span>
              </h2>
              <span className="px-2 py-0.5 rounded-full bg-red-600 text-white font-mono font-black text-[11px] shadow-sm">
                {activeAlerts.length} active{activeAlerts.length > 1 ? 's' : ''}
              </span>
            </div>
            <p className="text-[11px] text-red-300 font-medium mt-0.5">
              {dlcCount > 0 && `${dlcCount} lot(s) en DLC imminente (< 3j)`}
              {dlcCount > 0 && stockCount > 0 && ' · '}
              {stockCount > 0 && `${stockCount} produit(s) sous seuil de rupture`}
            </p>
          </div>
        </div>

        {/* Right controls: Sound, Filter, Expand/Collapse */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* Sound test button */}
          <button
            type="button"
            onClick={handlePlaySound}
            className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs flex items-center gap-1 transition-colors"
            title="Tester le signal sonore d'alerte"
          >
            <Volume2 className="w-3.5 h-3.5 text-orange-400" />
            <span className="text-[10px] hidden md:inline">Signal sonore</span>
          </button>

          {/* Toggle Expand / Collapse */}
          <button
            type="button"
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700 text-xs font-semibold flex items-center gap-1 transition-colors"
          >
            <span>{isCollapsed ? 'Afficher' : 'Réduire'}</span>
            {isCollapsed ? <ChevronDown className="w-3.5 h-3.5" /> : <ChevronUp className="w-3.5 h-3.5" />}
          </button>
        </div>
      </div>

      {!isCollapsed && (
        <>
          {/* Filter Segmented Controls */}
          <div className="flex items-center gap-1.5 border-t border-slate-800 pt-2.5">
            <button
              type="button"
              onClick={() => setFilterType('ALL')}
              className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${
                filterType === 'ALL'
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
              }`}
            >
              Toutes ({activeAlerts.length})
            </button>

            <button
              type="button"
              onClick={() => setFilterType('DLC')}
              className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                filterType === 'DLC'
                  ? 'bg-red-600 text-white shadow-sm'
                  : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
              }`}
            >
              <Clock className="w-3 h-3 text-red-400" />
              <span>DLC Imminente ({dlcCount})</span>
            </button>

            <button
              type="button"
              onClick={() => setFilterType('STOCK')}
              className={`px-3 py-1 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all ${
                filterType === 'STOCK'
                  ? 'bg-amber-600 text-white shadow-sm'
                  : 'bg-slate-800/80 text-slate-400 hover:text-slate-200'
              }`}
            >
              <PackageX className="w-3 h-3 text-amber-400" />
              <span>Seuil de Stock ({stockCount})</span>
            </button>
          </div>

          {/* Alert Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
            {filteredAlerts.map(alert => {
              const isDlc = alert.type === 'DLC_CRITICAL' || alert.type === 'EXPIRED';

              return (
                <div
                  key={alert.id}
                  className={`p-3 rounded-xl border flex flex-col justify-between gap-2.5 backdrop-blur-xs transition-all ${
                    isDlc
                      ? 'bg-red-950/60 border-red-800/80 hover:border-red-600 shadow-md shadow-red-950/40'
                      : 'bg-amber-950/40 border-amber-800/80 hover:border-amber-600 shadow-md shadow-amber-950/30'
                  }`}
                >
                  <div className="flex items-start gap-2.5">
                    {/* Thumbnail */}
                    {alert.product.image ? (
                      <img
                        src={alert.product.image}
                        alt={alert.product.nom}
                        className="w-12 h-12 rounded-lg object-cover bg-slate-900 border border-slate-700 shrink-0"
                      />
                    ) : (
                      <span aria-hidden="true" className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg border border-slate-700 bg-slate-900 text-slate-500">
                        <PackageX className="h-5 w-5" />
                      </span>
                    )}

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-1">
                        <span
                          className={`text-[10px] font-extrabold uppercase px-1.5 py-0.5 rounded tracking-wide font-mono ${
                            isDlc
                              ? 'bg-red-900 text-red-200 border border-red-700'
                              : 'bg-amber-900 text-amber-200 border border-amber-700'
                          }`}
                        >
                          {isDlc ? 'Alerte DLC' : 'Stock Faible'}
                        </span>

                        <button
                          type="button"
                          onClick={() => handleDismiss(alert.id)}
                          className="text-slate-400 hover:text-white p-0.5"
                          title="Ignorer temporairement"
                        >
                          <EyeOff className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      <h4 className="font-bold text-white text-xs sm:text-sm mt-1 truncate">
                        {alert.product.nom}
                      </h4>

                      <p className="text-[11px] text-slate-300 font-medium leading-tight mt-0.5">
                        {alert.detail}
                      </p>

                      <div className="mt-1 flex items-center justify-between text-[10px] text-slate-400">
                        <span>Rayon : {alert.product.rayon || alert.product.categorie}</span>
                        <span className="font-bold font-mono text-orange-300">
                          Valeur : {formatMoney(alert.valeurMenacee)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Quick Action Buttons */}
                  <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-1.5 text-xs">
                    {isDlc ? (
                      <button
                        type="button"
                        onClick={() => handleQuickSell(alert.product)}
                        className="flex-1 py-1.5 px-2 rounded-lg bg-red-600 hover:bg-red-500 text-white font-bold text-[11px] flex items-center justify-center gap-1 shadow-sm transition-all"
                        title="Ajouter au panier pour brader ou déstocker en priorité au POS"
                      >
                        <ShoppingCart className="w-3.5 h-3.5" />
                        <span>Brader au POS</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          if (onNavigateToSuppliers) {
                            onNavigateToSuppliers();
                          } else {
                            onNavigateToProducts();
                          }
                        }}
                        className="flex-1 py-1.5 px-2 rounded-lg bg-amber-600 hover:bg-amber-500 text-white font-bold text-[11px] flex items-center justify-center gap-1 shadow-sm transition-all"
                        title="Créer un bon de réapprovisionnement"
                      >
                        <Truck className="w-3.5 h-3.5" />
                        <span>Réapprovisionner</span>
                      </button>
                    )}

                    <button
                      type="button"
                      onClick={onNavigateToProducts}
                      className="px-2 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-[11px] font-semibold border border-slate-700 flex items-center gap-1 transition-colors"
                      title="Gérer les lots et stocks"
                    >
                      <Layers className="w-3.5 h-3.5 text-orange-400" />
                      <span>Gérer Lots</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};
