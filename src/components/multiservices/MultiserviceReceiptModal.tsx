import React, { useState } from 'react';
import { ServiceTransaction } from '../../types';
import { formatDateTime, formatMoney } from '../../utils/format';
import { useApp } from '../../context/AppContext';
import { Printer, X, Copy, Check, Smartphone } from 'lucide-react';

interface MultiserviceReceiptModalProps {
  transaction: ServiceTransaction;
  onClose: () => void;
}

export const MultiserviceReceiptModal: React.FC<MultiserviceReceiptModalProps> = ({ transaction, onClose }) => {
  const { settings, displayCurrency, usdRate } = useApp();
  const [copied, setCopied] = useState(false);
  const receiptCurrency = transaction.devise || displayCurrency;
  const receiptRate = transaction.tauxChange ?? (transaction.devise ? null : usdRate);
  const money = (amount: number) => formatMoney(amount, receiptCurrency, receiptRate);
  const smsText = [
    settings.organizationName,
    'Récapitulatif de saisie multiservices (non connecté à l’opérateur)',
    `Opération : ${transaction.nom} — ${transaction.type}`,
    `Montant saisi : ${money(transaction.montant)}`,
    `Commission saisie : ${money(transaction.commission)}`,
    ...(transaction.reference ? [`Référence saisie : ${transaction.reference}`] : []),
    ...(transaction.telephoneClient ? [`Téléphone : ${transaction.telephoneClient}`] : []),
    `Date : ${formatDateTime(transaction.date)}`,
    `Enregistré par : ${transaction.effectuePar}`,
  ].join('\n');

  const handleCopySms = async () => {
    try {
      await navigator.clipboard.writeText(smsText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch { /* Clipboard access depends on the browser permission and secure context. */ }
  };

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm print:static print:block print:bg-white print:p-0">
    <div className="flex max-h-[94dvh] w-full max-w-sm flex-col overflow-hidden rounded-2xl border border-slate-750 bg-slate-900 shadow-2xl print:max-h-none print:w-full print:max-w-none print:rounded-none print:border-0 print:bg-white print:shadow-none">
      <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950 p-3.5 print:hidden"><div className="flex items-center gap-2"><Smartphone className="h-4 w-4 text-sky-400" /><h3 className="text-sm font-bold text-white">Récapitulatif multiservices</h3></div><button type="button" onClick={onClose} aria-label="Fermer" className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white"><X className="h-4 w-4" /></button></div>
      <div className="flex justify-center overflow-y-auto bg-slate-950 p-4 print:overflow-visible print:bg-white print:p-0">
        <div id="multiservice-print-area" className="w-[280px] space-y-2 rounded-lg border border-slate-300 bg-white p-4 font-mono text-[11px] text-black shadow-xl print:w-[72mm] print:rounded-none print:border-0 print:p-1 print:shadow-none">
          <div className="space-y-1 border-b border-dashed border-gray-400 pb-2 text-center"><h2 className="text-sm font-black uppercase">{settings.organizationName}</h2><p className="text-[9px] text-gray-600">Récapitulatif des données saisies</p></div>
          <div className="space-y-1 border-b border-dashed border-gray-300 py-2 text-[10px]">
            <div className="flex justify-between gap-2"><span>Opération :</span><strong>{transaction.nom}</strong></div>
            <div className="flex justify-between gap-2"><span>Type :</span><strong>{transaction.type}</strong></div>
            <div className="flex justify-between gap-2"><span>Date :</span><span>{formatDateTime(transaction.date)}</span></div>
            <div className="flex justify-between gap-2"><span>Enregistré par :</span><span>{transaction.effectuePar}</span></div>
            {transaction.reference && <div className="break-all">Référence saisie : {transaction.reference}</div>}
            {transaction.telephoneClient && <div>Téléphone : {transaction.telephoneClient}</div>}
          </div>
          <div className="space-y-1 border-b border-dashed border-gray-400 py-2 text-[10px]"><div className="flex justify-between gap-2"><span>Montant de l’opération :</span><strong>{money(transaction.montant)}</strong></div><div className="flex justify-between gap-2"><span>Commission saisie :</span><strong>{money(transaction.commission)}</strong></div></div>
          <p className="text-center text-[9px] leading-4 text-gray-600">Ce document récapitule la saisie dans F.A.N.A. Il ne confirme pas un transfert auprès de l’opérateur.</p>
        </div>
      </div>
      <div className="flex items-center justify-between gap-2 border-t border-slate-800 bg-slate-900 p-3.5 print:hidden">
        <button type="button" onClick={() => void handleCopySms()} className="flex items-center gap-1.5 rounded-xl bg-slate-800 px-3 py-2 text-xs font-semibold text-slate-200 hover:bg-slate-700">{copied ? <Check className="h-4 w-4 text-emerald-400" /> : <Copy className="h-4 w-4 text-slate-400" />}{copied ? 'Copié' : 'Copier le texte'}</button>
        <button type="button" onClick={() => window.print()} className="flex items-center gap-1.5 rounded-xl bg-sky-500 px-4 py-2 text-xs font-bold text-white hover:bg-sky-600"><Printer className="h-4 w-4" />Imprimer</button>
      </div>
    </div>
  </div>;
};
