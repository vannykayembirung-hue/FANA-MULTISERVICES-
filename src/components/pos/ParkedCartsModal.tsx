import React from 'react';
import { formatFCFA } from '../../utils/format';
import { Clock, Play, Trash2, X, ShoppingBag } from 'lucide-react';

interface ParkedCartItem {
  id: string;
  savedAt: string;
  items: {
    produit: {
      nom: string;
    };
    quantite: number;
    prixUnitaire: number;
  }[];
  clientName?: string;
}

interface ParkedCartsModalProps {
  parkedCarts: ParkedCartItem[];
  onRecall: (id: string) => void;
  onDelete: (id: string) => void;
  onClose: () => void;
}

export const ParkedCartsModal: React.FC<ParkedCartsModalProps> = ({
  parkedCarts,
  onRecall,
  onDelete,
  onClose,
}) => {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-white text-base">Paniers / Tickets en attente</h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 overflow-y-auto space-y-3">
          {parkedCarts.length === 0 ? (
            <div className="p-8 text-center text-slate-500">
              <ShoppingBag className="w-10 h-10 mx-auto text-slate-600 mb-2" />
              <p className="text-sm font-semibold text-slate-300">Aucun panier en attente</p>
            </div>
          ) : (
            parkedCarts.map(cart => {
              const total = cart.items.reduce((s, it) => s + it.quantite * it.prixUnitaire, 0);

              return (
                <div
                  key={cart.id}
                  className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl flex items-center justify-between gap-3 hover:border-slate-700 transition-colors"
                >
                  <div className="space-y-1 min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-semibold text-amber-400 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-800/80">
                        {cart.savedAt}
                      </span>
                      {cart.clientName && (
                        <span className="text-xs font-bold text-white truncate">
                          Client : {cart.clientName}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-400 truncate">
                      {cart.items.map(it => `${it.produit.nom} (x${it.quantite})`).join(', ')}
                    </p>
                    <div className="text-sm font-extrabold text-white font-mono">
                      {formatFCFA(total)}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => {
                        onRecall(cart.id);
                        onClose();
                      }}
                      className="px-3 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs flex items-center gap-1 shadow-md shadow-orange-500/20"
                    >
                      <Play className="w-3.5 h-3.5" />
                      <span>Reprendre</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(cart.id)}
                      className="p-2 rounded-xl text-slate-500 hover:text-red-400 hover:bg-red-950/30 transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
