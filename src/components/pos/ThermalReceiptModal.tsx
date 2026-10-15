import React from 'react';
import { Vente } from '../../types';
import { formatFCFA, formatDateTime } from '../../utils/format';
import { Printer, CheckCircle2, X, Download } from 'lucide-react';

interface ThermalReceiptModalProps {
  sale: Vente;
  onClose: () => void;
}

export const ThermalReceiptModal: React.FC<ThermalReceiptModalProps> = ({ sale, onClose }) => {
  const handlePrint = () => {
    window.print();
  };

  const handleDownloadText = () => {
    let content = `================================\n`;
    content += `     F.A.N.A MULTISERVICES\n`;
    content += ` Alimentation Générale & Services\n`;
    content += `   Cité Fadia, Dakar - Sénégal\n`;
    content += `  Tél: +221 77 450 12 34\n`;
    content += `================================\n`;
    content += `Ticket N° : ${sale.numeroTicket}\n`;
    content += `Date      : ${formatDateTime(sale.createdAt)}\n`;
    content += `Caissier  : ${sale.nomCaissier}\n`;
    if (sale.nomClient) {
      content += `Client    : ${sale.nomClient}\n`;
    }
    content += `--------------------------------\n`;
    sale.lignes.forEach(line => {
      content += `${line.nomProduit}\n`;
      content += `  ${line.quantite} x ${line.prixUnitaire} F = ${line.totalLigne} F\n`;
    });
    content += `--------------------------------\n`;
    content += `Sous-total  : ${sale.totalBrut} F\n`;
    if (sale.remise > 0) {
      content += `Remise      : -${sale.remise} F\n`;
    }
    content += `TOTAL NET   : ${sale.totalNet} FCFA\n`;
    content += `--------------------------------\n`;
    content += `Mode Paiement : ${sale.paiement}\n`;
    if (sale.paiement === 'ESPECE' && sale.montantRecu) {
      content += `Reçu          : ${sale.montantRecu} F\n`;
      content += `Rendu Monnaie : ${sale.renduMonnaie || 0} F\n`;
    }
    content += `================================\n`;
    content += `  MERCI DE VOTRE VISITE !\n`;
    content += `   A BIENTOT CHEZ F.A.N.A\n`;
    content += `================================\n`;

    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `ticket-${sale.numeroTicket}.txt`;
    link.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
        {/* Header Bar */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2 text-emerald-400">
            <CheckCircle2 className="w-5 h-5" />
            <span className="font-bold text-white text-base">Vente Validée !</span>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Receipt Container preview */}
        <div className="p-4 overflow-y-auto bg-slate-950/60 flex justify-center">
          <div
            id="thermal-receipt-area"
            className="w-[300px] bg-white text-black p-4 rounded-md shadow-lg font-mono text-xs leading-relaxed select-text"
          >
            {/* Header info */}
            <div className="text-center space-y-0.5 border-b border-dashed border-gray-400 pb-2 mb-2">
              <h2 className="text-base font-black tracking-wider text-black">F.A.N.A MULTISERVICES</h2>
              <p className="text-[11px] font-bold">ALIMENTATION & SERVICES</p>
              <p className="text-[10px] text-gray-700">Cité Fadia, Dakar - Sénégal</p>
              <p className="text-[10px] text-gray-700">Tél : +221 77 450 12 34 / 33 825 00 11</p>
              <p className="text-[9px] text-gray-600">NINEA : 009842145 - RC: SN.DKR.2024</p>
            </div>

            {/* Ticket Metadata */}
            <div className="text-[10px] space-y-0.5 border-b border-dashed border-gray-400 pb-2 mb-2">
              <div className="flex justify-between">
                <span>TICKET N°:</span>
                <span className="font-bold">{sale.numeroTicket}</span>
              </div>
              <div className="flex justify-between">
                <span>DATE:</span>
                <span>{formatDateTime(sale.createdAt)}</span>
              </div>
              <div className="flex justify-between">
                <span>CAISSIER:</span>
                <span>{sale.nomCaissier}</span>
              </div>
              {sale.nomClient && (
                <div className="flex justify-between font-bold">
                  <span>CLIENT:</span>
                  <span>{sale.nomClient}</span>
                </div>
              )}
            </div>

            {/* Product Lines */}
            <div className="border-b border-dashed border-gray-400 pb-2 mb-2 space-y-1.5">
              <div className="flex justify-between font-bold text-[10px] border-b border-gray-200 pb-0.5">
                <span>Désignation</span>
                <span>Total</span>
              </div>
              {sale.lignes.map(ligne => (
                <div key={ligne.id} className="text-[10px]">
                  <div className="font-semibold text-gray-900 truncate">{ligne.nomProduit}</div>
                  <div className="flex justify-between text-gray-600 text-[9px] pl-1">
                    <span>
                      {ligne.quantite} {ligne.unite === 'KG' ? 'kg' : ''} x {ligne.prixUnitaire} F
                    </span>
                    <span className="font-bold text-black">{ligne.totalLigne} F</span>
                  </div>
                </div>
              ))}
            </div>

            {/* Totals */}
            <div className="space-y-1 border-b border-dashed border-gray-400 pb-2 mb-2 text-[10px]">
              <div className="flex justify-between text-gray-600">
                <span>Sous-total brut :</span>
                <span>{sale.totalBrut} F</span>
              </div>
              {sale.remise > 0 && (
                <div className="flex justify-between text-red-600 font-bold">
                  <span>Remise accordée :</span>
                  <span>-{sale.remise} F</span>
                </div>
              )}
              <div className="flex justify-between text-xs font-black text-black pt-1 border-t border-gray-300">
                <span>NET À PAYER :</span>
                <span>{formatFCFA(sale.totalNet)}</span>
              </div>
            </div>

            {/* Payment specifics */}
            <div className="text-[10px] space-y-0.5 border-b border-dashed border-gray-400 pb-2 mb-2">
              <div className="flex justify-between">
                <span>MODE DE RÈGLEMENT :</span>
                <span className="font-bold">
                  {sale.paiement === 'ESPECE'
                    ? 'ESPÈCES'
                    : sale.paiement === 'WAVE'
                    ? 'WAVE'
                    : sale.paiement === 'ORANGE_MONEY'
                    ? 'ORANGE MONEY'
                    : 'CRÉDIT ARDOISE'}
                </span>
              </div>
              {sale.paiement === 'ESPECE' && sale.montantRecu !== undefined && (
                <>
                  <div className="flex justify-between">
                    <span>Espèces reçues :</span>
                    <span>{sale.montantRecu} F</span>
                  </div>
                  <div className="flex justify-between font-bold">
                    <span>Rendu Monnaie :</span>
                    <span>{sale.renduMonnaie || 0} F</span>
                  </div>
                </>
              )}
            </div>

            {/* Barcode representation */}
            <div className="text-center pt-1 pb-1">
              <div className="flex justify-center items-center gap-[2px] h-9 my-1">
                {Array.from({ length: 38 }).map((_, i) => (
                  <div
                    key={i}
                    className={`h-full bg-black ${
                      i % 3 === 0 ? 'w-[2px]' : i % 5 === 0 ? 'w-[3px]' : 'w-[1px]'
                    }`}
                  />
                ))}
              </div>
              <span className="text-[9px] tracking-widest text-gray-700 font-bold">
                *{sale.numeroTicket}*
              </span>
            </div>

            {/* Footer notice */}
            <div className="text-center text-[9px] text-gray-600 space-y-0.5 pt-1">
              <p className="font-bold">*** MERCI DE VOTRE CONFIANCE ! ***</p>
              <p>Les articles frais ne sont ni repris ni échangés.</p>
              <p className="text-[8px] text-gray-500 pt-1">F.A.N.A Multiservices - Dakar</p>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-2">
          <button
            type="button"
            onClick={handleDownloadText}
            className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 transition-colors"
          >
            <Download className="w-4 h-4" />
            <span>Fichier TXT</span>
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="flex-1 py-3 px-4 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-orange-500/20 transition-all"
          >
            <Printer className="w-5 h-5" />
            <span>Imprimer Ticket (58mm/80mm)</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="px-4 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-white font-semibold text-sm transition-colors"
          >
            Terminer
          </button>
        </div>
      </div>
    </div>
  );
};
