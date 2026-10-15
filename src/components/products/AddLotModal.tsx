import React, { useState } from 'react';
import { Produit, Lot } from '../../types';
import { X, Check, Plus } from 'lucide-react';
import { useApp } from '../../context/AppContext';

interface AddLotModalProps {
  product: Produit;
  onAddLot: (lot: Omit<Lot, 'id' | 'produitId'>) => Promise<boolean> | boolean;
  onClose: () => void;
}

export const AddLotModal: React.FC<AddLotModalProps> = ({ product, onAddLot, onClose }) => {
  const { toBaseAmount, displayCurrency, isSaving } = useApp();
  const [numeroLot, setNumeroLot] = useState('');
  const [quantite, setQuantite] = useState('');
  const [prixAchat, setPrixAchat] = useState('');
  const [dlc, setDlc] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const quantity = Number(quantite);
    const enteredPrice = Number(prixAchat);
    if (!numeroLot.trim() || !dlc || !quantite.trim() || !prixAchat.trim() || !Number.isFinite(quantity) || quantity <= 0 || !Number.isFinite(enteredPrice) || enteredPrice < 0) return;
    let priceCdf: number;
    try { priceCdf = toBaseAmount(enteredPrice); }
    catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Taux de conversion indisponible.');
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const saved = await onAddLot({
        numeroLot: numeroLot.trim(),
        quantite: quantity,
        prixAchat: priceCdf,
        dlc,
        dateReception: new Date().toISOString().slice(0, 10),
      });
      if (saved) onClose();
      else setError('Le lot n’a pas été enregistré. Vérifiez le message du serveur puis réessayez.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm">
      <div className="flex max-h-[92dvh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950 p-4">
          <div className="flex items-center gap-2">
            <Plus className="h-5 w-5 text-orange-400" />
            <div>
              <h3 className="font-bold text-white">Nouveau lot FEFO</h3>
              <p className="text-xs text-slate-400">{product.nom}</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white" aria-label="Fermer">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto p-4 text-xs">
          <label className="block space-y-1">
            <span className="font-semibold text-slate-300">Numéro réel du lot *</span>
            <input required maxLength={80} value={numeroLot} onChange={event => setNumeroLot(event.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white font-mono focus:border-orange-500" />
          </label>

          <label className="block space-y-1">
            <span className="font-semibold text-slate-300">Quantité reçue ({product.unite}) *</span>
            <input required type="number" min="0.001" step="0.001" value={quantite} onChange={event => setQuantite(event.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white font-mono focus:border-orange-500" />
          </label>

          <label className="block space-y-1">
            <span className="font-semibold text-slate-300">Coût d’achat unitaire ({displayCurrency}) *</span>
            <input required type="number" min="0" step="any" value={prixAchat} onChange={event => setPrixAchat(event.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white font-mono focus:border-orange-500" />
          </label>

          <label className="block space-y-1">
            <span className="font-semibold text-slate-300">Date limite de consommation (DLC) *</span>
            <input required type="date" value={dlc} onChange={event => setDlc(event.target.value)} className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white focus:border-orange-500" />
          </label>

          <p className="text-[11px] leading-5 text-slate-400">Le stock sera déstocké selon la date limite réelle du lot (FEFO).</p>
          {error && <p role="alert" className="rounded-lg border border-red-900 bg-red-950/40 p-2 text-red-200">{error}</p>}

          <div className="flex justify-end gap-2 border-t border-slate-800 pt-3">
            <button type="button" onClick={onClose} className="rounded-xl bg-slate-800 px-4 py-2.5 font-semibold text-slate-300 hover:bg-slate-700">Annuler</button>
            <button type="submit" disabled={submitting || isSaving} className="flex items-center gap-1.5 rounded-xl bg-orange-500 px-5 py-2.5 font-bold text-white shadow-lg shadow-orange-500/20 hover:bg-orange-600 disabled:cursor-not-allowed disabled:opacity-50">
              <Check className="h-4 w-4" /> Enregistrer le lot
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
