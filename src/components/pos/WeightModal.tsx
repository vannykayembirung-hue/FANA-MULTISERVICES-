import React, { useState } from 'react';
import { Produit } from '../../types';
import { formatFCFA } from '../../utils/format';
import { Scale, Check, X } from 'lucide-react';

interface WeightModalProps {
  product: Produit;
  onConfirm: (weight: number) => void;
  onClose: () => void;
}

export const WeightModal: React.FC<WeightModalProps> = ({ product, onConfirm, onClose }) => {
  const [weightStr, setWeightStr] = useState<string>('1.000');

  const weightNum = parseFloat(weightStr) || 0;
  const totalPrice = Math.round(weightNum * product.prixVente);

  const handleKeyPress = (char: string) => {
    if (char === 'C') {
      setWeightStr('0');
      return;
    }
    if (char === '.') {
      if (!weightStr.includes('.')) {
        setWeightStr(prev => prev + '.');
      }
      return;
    }
    setWeightStr(prev => {
      if (prev === '0' || prev === '1.000') {
        return char;
      }
      // limit decimals to 3
      if (prev.includes('.')) {
        const parts = prev.split('.');
        if (parts[1].length >= 3) return prev;
      }
      return prev + char;
    });
  };

  const handleBackspace = () => {
    setWeightStr(prev => (prev.length <= 1 ? '0' : prev.slice(0, -1)));
  };

  const setPreset = (preset: number) => {
    setWeightStr(preset.toFixed(3));
  };

  const handleSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (weightNum > 0) {
      onConfirm(weightNum);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-slate-950 p-4 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400">
              <Scale className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base leading-tight">{product.nom}</h3>
              <p className="text-xs text-slate-400">
                Prix au {product.unite} : <span className="font-semibold text-orange-400">{formatFCFA(product.prixVente)}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Display screen */}
        <div className="p-4 bg-slate-950/60 border-b border-slate-800/80">
          <div className="flex items-baseline justify-between mb-1">
            <span className="text-xs text-slate-400 font-medium">Poids / Quantité</span>
            <span className="text-xs text-slate-400 font-medium">Prix calculé</span>
          </div>
          <div className="flex items-baseline justify-between">
            <div className="flex items-baseline gap-1">
              <span className="text-4xl font-extrabold text-white font-mono tracking-tight">
                {weightStr}
              </span>
              <span className="text-lg font-semibold text-orange-400 uppercase">{product.unite}</span>
            </div>
            <div className="text-2xl font-bold text-emerald-400 font-mono">
              {formatFCFA(totalPrice)}
            </div>
          </div>
        </div>

        {/* Quick Presets */}
        <div className="p-3 bg-slate-900/90 border-b border-slate-800 flex items-center gap-2 overflow-x-auto">
          {[0.25, 0.5, 0.75, 1.0, 1.25, 1.5, 2.0, 5.0].map(val => (
            <button
              key={val}
              type="button"
              onClick={() => setPreset(val)}
              className="px-2.5 py-1.5 rounded-lg text-xs font-semibold bg-slate-800 text-slate-300 hover:bg-orange-500/20 hover:text-orange-300 hover:border-orange-500/30 border border-slate-700/60 transition-all shrink-0"
            >
              {val} {product.unite}
            </button>
          ))}
        </div>

        {/* Tactile Keypad */}
        <div className="p-4 grid grid-cols-3 gap-2 bg-slate-900">
          {['7', '8', '9', '4', '5', '6', '1', '2', '3', 'C', '0', '.'].map(key => (
            <button
              key={key}
              type="button"
              onClick={() => handleKeyPress(key)}
              className={`h-14 rounded-xl text-xl font-bold font-mono transition-transform active:scale-95 flex items-center justify-center ${
                key === 'C'
                  ? 'bg-red-950/40 text-red-400 border border-red-800/60 hover:bg-red-900/50'
                  : key === '.'
                  ? 'bg-slate-800 text-slate-200 border border-slate-700 hover:bg-slate-700'
                  : 'bg-slate-800/80 text-white border border-slate-700/80 hover:bg-slate-750 hover:border-slate-600'
              }`}
            >
              {key}
            </button>
          ))}
        </div>

        {/* Footer Actions */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center gap-3">
          <button
            type="button"
            onClick={handleBackspace}
            className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-semibold transition-colors"
          >
            Effacer
          </button>
          <button
            type="button"
            onClick={() => handleSubmit()}
            disabled={weightNum <= 0}
            className="flex-1 py-3.5 px-4 rounded-xl bg-orange-500 hover:bg-orange-600 active:bg-orange-700 disabled:opacity-50 text-white font-bold text-base flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 transition-all"
          >
            <Check className="w-5 h-5" />
            Ajouter au panier ({formatFCFA(totalPrice)})
          </button>
        </div>
      </div>
    </div>
  );
};
