import React, { useState } from 'react';
import { Vente } from '../../types';
import { formatMoney, formatDateTime } from '../../utils/format';
import { 
  Receipt, 
  Printer, 
  Search, 
  X, 
  ChevronDown, 
  ChevronUp, 
  User, 
  Clock, 
  ShoppingBag,
  RotateCcw
} from 'lucide-react';

interface RecentSalesModalProps {
  sales: Vente[];
  onReprint: (sale: Vente) => void;
  onClose: () => void;
}

export const RecentSalesModal: React.FC<RecentSalesModalProps> = ({
  sales,
  onReprint,
  onClose,
}) => {
  const [search, setSearch] = useState<string>('');
  const [expandedSaleId, setExpandedSaleId] = useState<string | null>(null);

  const filteredSales = sales.filter(s => {
    return (
      s.numeroTicket.toLowerCase().includes(search.toLowerCase()) ||
      (s.nomClient && s.nomClient.toLowerCase().includes(search.toLowerCase())) ||
      s.paiement.toLowerCase().includes(search.toLowerCase())
    );
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-750 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base flex items-center gap-2">
                <span>Derniers Tickets de Caisse</span>
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-slate-800 text-slate-300 font-mono font-bold">
                  {sales.length} encaissé(s)
                </span>
              </h3>
              <p className="text-xs text-slate-400">Réimpression rapide de duplicatas pour le client sans quitter la caisse</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 flex items-center justify-center cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search bar */}
        <div className="p-3 bg-slate-950/70 border-b border-slate-800">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Rechercher par N° ticket (ex: TICK-1001), client, mode..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-slate-900 border border-slate-750 rounded-xl text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-orange-500"
            />
          </div>
        </div>

        {/* Sales List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
          {filteredSales.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              <Receipt className="w-8 h-8 mx-auto mb-2 text-slate-600" />
              <p className="text-sm font-semibold text-slate-400">Aucun ticket trouvé</p>
              <p className="text-xs text-slate-600 mt-1">Les tickets encaissés apparaîtront ici automatiquement.</p>
            </div>
          ) : (
            filteredSales.map(sale => {
              const isExpanded = expandedSaleId === sale.id;
              const totalItemsCount = sale.lignes.reduce((acc, l) => acc + l.quantite, 0);

              return (
                <div
                  key={sale.id}
                  className="bg-slate-850 hover:bg-slate-800/90 transition-all border border-slate-750 rounded-xl p-3 space-y-2"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-lg bg-slate-800 flex items-center justify-center text-slate-300 font-mono text-xs font-bold shrink-0">
                        #
                      </div>
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="font-mono font-bold text-white text-xs">{sale.numeroTicket}</span>
                          <span className={`text-[10px] px-1.5 py-0.2 rounded font-bold ${
                            sale.paiement === 'ESPECE'
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                              : sale.paiement === 'MPESA'
                              ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                              : sale.paiement === 'ORANGE_MONEY'
                              ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                          }`}>
                            {sale.paiement}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                          <span className="flex items-center gap-1 font-mono">
                            <Clock className="w-3 h-3 text-slate-500" />
                            {formatDateTime(sale.createdAt)}
                          </span>
                          <span>·</span>
                          <span className="flex items-center gap-1">
                            <User className="w-3 h-3 text-slate-500" />
                            {sale.nomClient || 'Comptant'}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <div className="font-mono font-black text-white text-sm">
                          {formatMoney(sale.totalNet)}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {sale.lignes.length} article(s) ({totalItemsCount} unités)
                        </div>
                      </div>

                      <button
                        type="button"
                        onClick={() => onReprint(sale)}
                        className="px-2.5 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-xs transition-colors cursor-pointer shrink-0"
                        title="Imprimer un duplicata 58mm / 80mm"
                      >
                        <Printer className="w-3.5 h-3.5" />
                        <span className="hidden sm:inline">Duplicata</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => setExpandedSaleId(isExpanded ? null : sale.id)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-750 cursor-pointer"
                        title="Voir le détail des articles"
                      >
                        {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  {/* Expanded Items */}
                  {isExpanded && (
                    <div className="pt-2 border-t border-slate-750/70 text-xs text-slate-300 space-y-1 animate-in fade-in">
                      <div className="font-semibold text-[10px] uppercase text-slate-400 mb-1">
                        Détail du panier :
                      </div>
                      <div className="space-y-1 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800">
                        {sale.lignes.map((line, idx) => (
                          <div key={idx} className="flex justify-between items-center text-[11px]">
                            <span>
                              {line.nomProduit} <span className="text-slate-500 font-mono">x{line.quantite} {line.unite.toLowerCase()}</span>
                            </span>
                            <span className="font-mono font-bold text-slate-200">
                              {formatMoney(line.totalLigne)}
                            </span>
                          </div>
                        ))}
                        {sale.remise > 0 && (
                          <div className="flex justify-between items-center text-[11px] text-orange-400 pt-1 border-t border-slate-800 font-semibold">
                            <span>Remise accordée :</span>
                            <span>-{formatMoney(sale.remise)}</span>
                          </div>
                        )}
                        {sale.renduMonnaie !== undefined && sale.renduMonnaie > 0 && (
                          <div className="flex justify-between items-center text-[10px] text-emerald-400 pt-0.5 font-mono">
                            <span>Monnaie rendue :</span>
                            <span>{formatMoney(sale.renduMonnaie)}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-between text-xs text-slate-400">
          <span>{filteredSales.length} ticket(s) disponible(s)</span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-750 text-white font-semibold cursor-pointer"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};
