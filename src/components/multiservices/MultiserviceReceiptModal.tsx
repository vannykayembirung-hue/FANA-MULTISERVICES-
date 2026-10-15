import React, { useState } from 'react';
import { ServiceTransaction } from '../../types';
import { formatFCFA, formatDateTime } from '../../utils/format';
import { Printer, X, Copy, Check, Smartphone, Zap, PhoneCall } from 'lucide-react';

interface MultiserviceReceiptModalProps {
  transaction: ServiceTransaction;
  onClose: () => void;
}

export const MultiserviceReceiptModal: React.FC<MultiserviceReceiptModalProps> = ({
  transaction,
  onClose,
}) => {
  const [copied, setCopied] = useState<boolean>(false);

  const smsText = `F.A.N.A MULTISERVICES
Transaction: ${transaction.nom} (${transaction.type})
Montant: ${formatFCFA(transaction.montant)}
Frais: ${formatFCFA(transaction.commission)}
Ref: ${transaction.reference || 'N/A'}
Tel: ${transaction.telephoneClient || 'Client Comptoir'}
Date: ${formatDateTime(transaction.date)}
Merci pour votre confiance !`;

  const handleCopySms = () => {
    navigator.clipboard.writeText(smsText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="w-full max-w-sm bg-slate-900 border border-slate-750 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="p-3.5 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Smartphone className="w-4 h-4 text-sky-400" />
            <h3 className="font-bold text-white text-sm">Reçu d'Opération Multiservices</h3>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Thermal Receipt Visual Preview (58mm simulated paper) */}
        <div className="p-4 bg-slate-950 flex justify-center overflow-y-auto">
          <div
            id="multiservice-print-area"
            className="w-[280px] bg-white text-black font-mono text-[11px] p-4 rounded-lg shadow-xl space-y-2 border border-slate-300"
          >
            {/* Header */}
            <div className="text-center border-b border-dashed border-gray-400 pb-2 space-y-0.5">
              <h2 className="font-black text-sm uppercase tracking-wider">F.A.N.A MULTISERVICES</h2>
              <p className="text-[10px] text-gray-600 font-sans">Alimentation &amp; Services Financiers</p>
              <p className="text-[10px] text-gray-600 font-sans">Marché Tilène - Dakar, Sénégal</p>
              <p className="text-[10px] text-gray-700">Tél : +221 33 821 00 00</p>
            </div>

            {/* Transaction Title */}
            <div className="text-center py-1">
              <span className="font-black text-xs uppercase px-2 py-0.5 border border-black inline-block">
                REÇU {transaction.nom.toUpperCase()}
              </span>
            </div>

            {/* Meta */}
            <div className="space-y-1 py-1 border-b border-dashed border-gray-300 text-[10px]">
              <div className="flex justify-between">
                <span className="text-gray-600">Type d'opération:</span>
                <span className="font-bold">{transaction.type}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Référence:</span>
                <span className="font-bold">{transaction.reference || '—'}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Date &amp; Heure:</span>
                <span>{formatDateTime(transaction.date)}</span>
              </div>
              {transaction.telephoneClient && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Tél. Client:</span>
                  <span className="font-bold">{transaction.telephoneClient}</span>
                </div>
              )}
              <div className="flex justify-between">
                <span className="text-gray-600">Opérateur/Agent:</span>
                <span>{transaction.effectuePar}</span>
              </div>
            </div>

            {/* Amount details */}
            <div className="py-2 space-y-1">
              <div className="flex justify-between text-xs font-bold">
                <span>MONTANT BRUT :</span>
                <span>{formatFCFA(transaction.montant)}</span>
              </div>
              <div className="flex justify-between text-[10px] text-gray-600">
                <span>Frais de service :</span>
                <span>{formatFCFA(transaction.commission)}</span>
              </div>
              <div className="flex justify-between text-sm font-black border-t-2 border-black pt-1">
                <span>TOTAL PAYÉ :</span>
                <span>
                  {formatFCFA(
                    transaction.type === 'DEPOT' || transaction.type === 'PRESTATION' || transaction.type === 'RECHARGE'
                      ? transaction.montant + transaction.commission
                      : transaction.montant
                  )}
                </span>
              </div>
            </div>

            {/* Footer */}
            <div className="text-center pt-2 border-t border-dashed border-gray-400 space-y-0.5 text-[9px] text-gray-600 font-sans">
              <p className="font-bold text-black font-mono">Conservez ce reçu pour toute réclamation.</p>
              <p>F.A.N.A Multiservices vous remercie !</p>
            </div>
          </div>
        </div>

        {/* Modal Actions */}
        <div className="p-3.5 bg-slate-900 border-t border-slate-800 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={handleCopySms}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-750 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Copier le format texte SMS pour WhatsApp ou SMS client"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-400" /> : <Copy className="w-4 h-4 text-slate-400" />}
            <span>{copied ? 'Copié !' : 'Copier SMS'}</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="px-4 py-2 rounded-xl bg-sky-500 hover:bg-sky-600 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-sky-500/20 transition-all cursor-pointer"
          >
            <Printer className="w-4 h-4" />
            <span>Imprimer Reçu</span>
          </button>
        </div>
      </div>
    </div>
  );
};
