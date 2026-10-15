import React from 'react';
import { Vente } from '../../types';
import { formatDateTime, formatMoney } from '../../utils/format';
import { Printer, CheckCircle2, X, Download } from 'lucide-react';

interface ThermalReceiptModalProps {
  sale: Vente;
  onClose: () => void;
}

const paymentLabel: Record<Vente['paiement'], string> = {
  ESPECE: 'Espèces',
  MPESA: 'M-Pesa',
  ORANGE_MONEY: 'Orange Money',
  AIRTEL_MONEY: 'Airtel Money',
  AFRIMONEY: 'Afrimoney',
  CREDIT: 'Crédit client',
};

export const ThermalReceiptModal: React.FC<ThermalReceiptModalProps> = ({ sale, onClose }) => {
  const money = (amount: number) => formatMoney(amount, sale.devise, sale.tauxChange);
  const handlePrint = () => window.print();
  const handleDownloadText = () => {
    const lines = [
      sale.nomMagasin,
      'REÇU DE VENTE',
      `Ticket : ${sale.numeroTicket}`,
      `Date : ${formatDateTime(sale.createdAt)}`,
      `Caissier : ${sale.nomCaissier}`,
      ...(sale.nomClient ? [`Client : ${sale.nomClient}`] : []),
      '--------------------------------',
      ...sale.lignes.flatMap(line => [
        line.nomProduit,
        `  ${line.quantite} ${line.unite.toLowerCase()} x ${money(line.prixUnitaire)} = ${money(line.totalLigne)}`,
      ]),
      '--------------------------------',
      `Sous-total : ${money(sale.totalBrut)}`,
      ...(sale.remise > 0 ? [`Remise : -${money(sale.remise)}`] : []),
      `NET À PAYER : ${money(sale.totalNet)}`,
      `Règlement : ${paymentLabel[sale.paiement]}`,
      ...(sale.paiement === 'ESPECE' && sale.montantRecu !== undefined ? [`Montant reçu : ${money(sale.montantRecu)}`, `Monnaie rendue : ${money(sale.renduMonnaie || 0)}`] : []),
      ...(sale.referencePaiement ? [`Référence : ${sale.referencePaiement}`] : []),
      ...(sale.telephonePaiement ? [`Téléphone : ${sale.telephonePaiement}`] : []),
      '--------------------------------',
      'Merci de votre achat.',
    ];
    const blob = new Blob([lines.join('\n')], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ticket-${sale.numeroTicket}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm print:static print:block print:bg-white print:p-0">
    <div className="flex max-h-[95dvh] w-full max-w-md flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl print:max-h-none print:w-full print:max-w-none print:overflow-visible print:rounded-none print:border-0 print:bg-white print:shadow-none">
      <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950 p-4 print:hidden">
        <div className="flex items-center gap-2 text-emerald-400"><CheckCircle2 className="h-5 w-5" /><span className="text-base font-bold text-white">Vente enregistrée</span></div>
        <button type="button" onClick={onClose} aria-label="Fermer" className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white"><X className="h-5 w-5" /></button>
      </div>

      <div className="flex justify-center overflow-y-auto bg-slate-950/60 p-4 print:overflow-visible print:bg-white print:p-0">
        <div id="thermal-receipt-area" className="w-[300px] select-text rounded-md bg-white p-4 font-mono text-xs leading-relaxed text-black shadow-lg print:w-[72mm] print:rounded-none print:p-1 print:shadow-none">
          <div className="mb-2 space-y-1 border-b border-dashed border-gray-400 pb-2 text-center">
            <h2 className="text-base font-black tracking-wide">{sale.nomMagasin}</h2>
            <p className="text-[10px] text-gray-600">Reçu de vente enregistré</p>
          </div>

          <div className="mb-2 space-y-1 border-b border-dashed border-gray-400 pb-2 text-[10px]">
            <div className="flex justify-between gap-2"><span>Ticket :</span><strong>{sale.numeroTicket}</strong></div>
            <div className="flex justify-between gap-2"><span>Date :</span><span>{formatDateTime(sale.createdAt)}</span></div>
            <div className="flex justify-between gap-2"><span>Caissier :</span><span>{sale.nomCaissier}</span></div>
            {sale.nomClient && <div className="flex justify-between gap-2"><span>Client :</span><span>{sale.nomClient}</span></div>}
          </div>

          <div className="mb-2 space-y-1.5 border-b border-dashed border-gray-400 pb-2">
            {sale.lignes.map(line => <div key={line.id} className="text-[10px]">
              <div className="break-words font-semibold">{line.nomProduit}</div>
              <div className="flex justify-between gap-2 text-gray-600"><span>{line.quantite} {line.unite.toLowerCase()} × {money(line.prixUnitaire)}</span><strong className="text-black">{money(line.totalLigne)}</strong></div>
            </div>)}
          </div>

          <div className="mb-2 space-y-1 border-b border-dashed border-gray-400 pb-2 text-[10px]">
            <div className="flex justify-between"><span>Sous-total brut :</span><span>{money(sale.totalBrut)}</span></div>
            {sale.remise > 0 && <div className="flex justify-between text-red-700"><span>Remise :</span><span>-{money(sale.remise)}</span></div>}
            <div className="flex justify-between border-t border-gray-300 pt-1 text-sm font-black"><span>NET À PAYER :</span><span>{money(sale.totalNet)}</span></div>
          </div>

          <div className="mb-2 space-y-1 border-b border-dashed border-gray-400 pb-2 text-[10px]">
            <div className="flex justify-between gap-2"><span>Règlement :</span><strong>{paymentLabel[sale.paiement]}</strong></div>
            {sale.paiement === 'ESPECE' && sale.montantRecu !== undefined && <>
              <div className="flex justify-between"><span>Reçu :</span><span>{money(sale.montantRecu)}</span></div>
              <div className="flex justify-between"><span>Monnaie rendue :</span><span>{money(sale.renduMonnaie || 0)}</span></div>
            </>}
            {sale.referencePaiement && <div className="break-all">Référence : {sale.referencePaiement}</div>}
            {sale.telephonePaiement && <div>Téléphone : {sale.telephonePaiement}</div>}
          </div>
          <div className="space-y-1 text-center text-[9px] text-gray-600"><p className="font-bold">Merci de votre achat.</p><p>Conservez ce reçu pour votre suivi.</p></div>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 border-t border-slate-800 bg-slate-950 p-4 print:hidden">
        <button type="button" onClick={handleDownloadText} className="flex items-center gap-1.5 rounded-xl bg-slate-800 px-3.5 py-2.5 text-xs font-semibold text-slate-300 hover:bg-slate-700"><Download className="h-4 w-4" /><span>Fichier TXT</span></button>
        <button type="button" onClick={handlePrint} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-3 text-sm font-bold text-white shadow-lg shadow-orange-500/20 hover:bg-orange-600"><Printer className="h-5 w-5" /><span>Imprimer le ticket</span></button>
        <button type="button" onClick={onClose} className="rounded-xl bg-slate-800 px-4 py-3 text-sm font-semibold text-white hover:bg-slate-700">Terminer</button>
      </div>
    </div>
  </div>;
};
