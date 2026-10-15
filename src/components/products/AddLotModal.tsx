import React, { useState } from 'react';
import { Produit, Lot } from '../../types';
import { X, Check, Calendar, Plus } from 'lucide-react';

interface AddLotModalProps {
  product: Produit;
  onAddLot: (lot: Omit<Lot, 'id' | 'produitId'>) => void;
  onClose: () => void;
}

export const AddLotModal: React.FC<AddLotModalProps> = ({ product, onAddLot, onClose }) => {
  const [numeroLot, setNumeroLot] = useState<string>(
    `LOT-${Date.now().toString().slice(-4)}`
  );
  const [quantite, setQuantite] = useState<number>(10);
  const [dlc, setDlc] = useState<string>(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 3);
    return d.toISOString().split('T')[0];
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (quantite <= 0 || !dlc) return;

    onAddLot({
      numeroLot,
      quantite,
      dlc,
      dateReception: new Date().toISOString().split('T')[0],
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Plus className="w-5 h-5 text-orange-400" />
            <div>
              <h3 className="font-bold text-white text-base">Nouveau Lot FEFO</h3>
              <p className="text-xs text-slate-400">{product.nom}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4 text-xs">
          <div className="space-y-1">
            <label className="text-slate-300 font-semibold block">Numéro de Lot Fournisseur</label>
            <input
              type="text"
              required
              value={numeroLot}
              onChange={e => setNumeroLot(e.target.value)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono focus:outline-hidden focus:border-orange-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-slate-300 font-semibold block">
              Quantité à réceptionner ({product.unite})
            </label>
            <input
              type="number"
              min="0.1"
              step="any"
              required
              value={quantite}
              onChange={e => setQuantite(parseFloat(e.target.value) || 0)}
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono text-sm focus:outline-hidden focus:border-orange-500"
            />
          </div>

          <div className="space-y-1">
            <label className="text-slate-300 font-semibold block">
              DLC (Date Limite de Consommation) *
            </label>
            <div className="relative">
              <input
                type="date"
                required
                value={dlc}
                onChange={e => setDlc(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-hidden focus:border-orange-500"
              />
            </div>
            <p className="text-[11px] text-slate-400 mt-1">
              Ce lot sera déstocké en priorité selon le principe FEFO (First Expired First Out).
            </p>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold flex items-center gap-1.5 shadow-lg shadow-orange-500/20"
            >
              <Check className="w-4 h-4" />
              <span>Valider la réception</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
