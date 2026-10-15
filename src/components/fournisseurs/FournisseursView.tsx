import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Fournisseur, Produit, PaymentMethod } from '../../types';
import { formatFCFA, formatDateTime, formatCurrencyShort } from '../../utils/format';
import { 
  Truck, 
  Plus, 
  FileText, 
  Check, 
  X, 
  Phone, 
  MapPin, 
  Building2, 
  Calendar,
  AlertCircle,
  PackageCheck,
  Wallet,
  Banknote,
  History
} from 'lucide-react';

export const FournisseursView: React.FC = () => {
  const {
    suppliers,
    addSupplier,
    updateSupplier,
    bonsReception,
    addBonReception,
    products,
    reglementsFournisseurs,
    recordSupplierPayment,
  } = useApp();

  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState<boolean>(false);
  const [isBonModalOpen, setIsBonModalOpen] = useState<boolean>(false);

  // Settlement modal state
  const [targetSupplierForPayment, setTargetSupplierForPayment] = useState<Fournisseur | null>(null);
  const [payAmountStr, setPayAmountStr] = useState<string>('');
  const [payMode, setPayMode] = useState<PaymentMethod>('ESPECE');
  const [payWithCaisse, setPayWithCaisse] = useState<boolean>(true);
  const [payNote, setPayNote] = useState<string>('');
  const [settlementSuccessToast, setSettlementSuccessToast] = useState<string | null>(null);

  // Supplier form
  const [supNom, setSupNom] = useState<string>('');
  const [supContact, setSupContact] = useState<string>('');
  const [supTelephone, setSupTelephone] = useState<string>('+221 33 ');
  const [supAdresse, setSupAdresse] = useState<string>('');

  // Bon de Réception form
  const [bonFournisseurId, setBonFournisseurId] = useState<string>(suppliers[0]?.id || '');
  const [bonNumero, setBonNumero] = useState<string>(`BR-${Date.now().toString().slice(-5)}`);
  const [bonStatutPaiement, setBonStatutPaiement] = useState<'PAYE' | 'A_CREDIT'>('PAYE');

  // Dynamic lines in delivery receipt
  const [bonLines, setBonLines] = useState<
    {
      produitId: string;
      quantite: number;
      prixAchat: number;
      numeroLot: string;
      dlc: string;
    }[]
  >([
    {
      produitId: products[0]?.id || '',
      quantite: 20,
      prixAchat: products[0]?.prixAchat || 1000,
      numeroLot: `LOT-REC-${Date.now().toString().slice(-4)}`,
      dlc: new Date(Date.now() + 1000 * 60 * 60 * 24 * 120).toISOString().split('T')[0],
    },
  ]);

  const totalBon = bonLines.reduce((acc, l) => acc + l.quantite * l.prixAchat, 0);

  const handleAddLine = () => {
    setBonLines(prev => [
      ...prev,
      {
        produitId: products[0]?.id || '',
        quantite: 10,
        prixAchat: products[0]?.prixAchat || 1000,
        numeroLot: `LOT-REC-${Date.now().toString().slice(-4)}`,
        dlc: new Date(Date.now() + 1000 * 60 * 60 * 24 * 120).toISOString().split('T')[0],
      },
    ]);
  };

  const handleRemoveLine = (idx: number) => {
    setBonLines(prev => prev.filter((_, i) => i !== idx));
  };

  const handleSaveBon = (e: React.FormEvent) => {
    e.preventDefault();
    const sup = suppliers.find(s => s.id === bonFournisseurId);
    if (!sup || bonLines.length === 0) return;

    addBonReception({
      numeroBon: bonNumero,
      fournisseurId: sup.id,
      nomFournisseur: sup.nom,
      total: totalBon,
      statutPaiement: bonStatutPaiement,
      articles: bonLines.map(l => {
        const prod = products.find(p => p.id === l.produitId);
        return {
          ...l,
          nomProduit: prod?.nom || 'Article',
        };
      }),
    });

    setIsBonModalOpen(false);
  };

  const handleSaveSupplier = (e: React.FormEvent) => {
    e.preventDefault();
    if (!supNom) return;

    addSupplier({
      nom: supNom,
      contact: supContact,
      telephone: supTelephone,
      adresse: supAdresse,
    });

    setIsSupplierModalOpen(false);
    setSupNom('');
    setSupContact('');
  };

  const handleOpenSettlement = (sup: Fournisseur) => {
    setTargetSupplierForPayment(sup);
    setPayAmountStr(sup.dette.toString());
    setPayMode('ESPECE');
    setPayWithCaisse(true);
    setPayNote(`Règlement facture fournisseur ${sup.nom}`);
  };

  const handleConfirmSettlement = (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetSupplierForPayment) return;
    const amount = parseFloat(payAmountStr) || 0;
    if (amount <= 0) return;

    recordSupplierPayment(
      targetSupplierForPayment.id,
      amount,
      payMode,
      payWithCaisse,
      payNote
    );

    setSettlementSuccessToast(`Règlement de ${formatFCFA(amount)} enregistré pour ${targetSupplierForPayment.nom}`);
    setTimeout(() => setSettlementSuccessToast(null), 3500);
    setTargetSupplierForPayment(null);
  };

  return (
    <div className="flex-1 p-4 lg:p-6 overflow-y-auto space-y-6 bg-slate-900 text-slate-100">
      {settlementSuccessToast && (
        <div className="p-3 bg-emerald-950/80 border border-emerald-800 text-emerald-300 rounded-xl text-xs font-semibold flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{settlementSuccessToast}</span>
          </div>
          <button
            onClick={() => setSettlementSuccessToast(null)}
            className="text-emerald-400 hover:text-white font-bold ml-2 cursor-pointer"
          >
            ✕
          </button>
        </div>
      )}
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <span>Fournisseurs &amp; Achats Stock</span>
            <span className="text-xs px-2 py-0.5 rounded-md bg-purple-500/20 text-purple-400 font-bold border border-purple-500/30">
              Bons de Réception FEFO
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Réceptionnez vos arrivages de marchandises : les stocks et lots FEFO sont automatiquement mis à jour.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setIsSupplierModalOpen(true)}
            className="px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-1.5 border border-slate-700 transition-colors"
          >
            <Plus className="w-4 h-4 text-purple-400" />
            <span>Nouveau Fournisseur</span>
          </button>

          <button
            type="button"
            onClick={() => setIsBonModalOpen(true)}
            className="px-4 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-orange-500/20 transition-all"
          >
            <PackageCheck className="w-4 h-4" />
            <span>Créer Bon de Réception</span>
          </button>
        </div>
      </div>

      {/* Suppliers Grid */}
      <div>
        <h2 className="text-sm font-bold text-slate-300 uppercase tracking-wider mb-3">
          Partenaires &amp; Grossistes ({suppliers.length})
        </h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {suppliers.map(s => (
            <div
              key={s.id}
              className="p-4 bg-slate-850 border border-slate-750 rounded-2xl flex flex-col justify-between space-y-3"
            >
              <div>
                <div className="flex items-center gap-2 text-purple-400">
                  <Building2 className="w-4 h-4 shrink-0" />
                  <h3 className="font-bold text-white text-sm truncate">{s.nom}</h3>
                </div>

                <div className="mt-2 space-y-1 text-xs text-slate-400">
                  <div className="flex items-center gap-1.5 truncate">
                    <span className="text-slate-500 font-medium">Contact :</span>
                    <span className="text-slate-300">{s.contact}</span>
                  </div>
                  <div className="flex items-center gap-1.5 truncate font-mono text-[11px]">
                    <Phone className="w-3 h-3 text-slate-500 shrink-0" />
                    <span>{s.telephone}</span>
                  </div>
                  <div className="flex items-center gap-1.5 truncate text-[11px]">
                    <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                    <span className="truncate">{s.adresse}</span>
                  </div>
                </div>
              </div>

              <div className="pt-2 border-t border-slate-800 flex justify-between items-center text-xs">
                <div>
                  <span className="text-[10px] text-slate-400 block">Dette fournisseur</span>
                  <span
                    className={`font-mono font-bold text-sm ${
                      s.dette > 0 ? 'text-amber-400' : 'text-emerald-400'
                    }`}
                  >
                    {formatFCFA(s.dette)}
                  </span>
                </div>
                {s.dette > 0 ? (
                  <button
                    type="button"
                    onClick={() => handleOpenSettlement(s)}
                    className="px-2.5 py-1.5 rounded-lg bg-orange-500/20 hover:bg-orange-500 text-orange-300 hover:text-white border border-orange-500/30 text-xs font-bold transition-all cursor-pointer flex items-center gap-1 shadow-xs"
                    title="Enregistrer un règlement pour ce fournisseur"
                  >
                    <Wallet className="w-3.5 h-3.5" />
                    <span>Régler</span>
                  </button>
                ) : (
                  <span className="text-[10px] text-slate-500 italic">À jour</span>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Bons de Réception History */}
      <div className="p-5 bg-slate-850 border border-slate-750 rounded-2xl space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <FileText className="w-5 h-5 text-slate-400" />
            <h3 className="font-bold text-white text-base">Historique des Livraisons Réceptionnées</h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {bonsReception.length} arrivage(s)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-750">
              <tr>
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3">N° Bon / Facture</th>
                <th className="py-2.5 px-3">Fournisseur</th>
                <th className="py-2.5 px-3">Articles &amp; Lots</th>
                <th className="py-2.5 px-3 text-right">Montant Total</th>
                <th className="py-2.5 px-3 text-center">Paiement</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {bonsReception.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500">
                    Aucun bon de réception enregistré. Cliquez sur "Créer Bon de Réception" pour enregistrer une livraison.
                  </td>
                </tr>
              ) : (
                bonsReception.map(bon => (
                  <tr key={bon.id} className="hover:bg-slate-800/40">
                    <td className="py-2.5 px-3 text-slate-400 font-mono text-[11px]">
                      {formatDateTime(bon.date)}
                    </td>
                    <td className="py-2.5 px-3 font-mono font-bold text-white">
                      {bon.numeroBon}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-200">
                      {bon.nomFournisseur}
                    </td>
                    <td className="py-2.5 px-3 text-slate-400">
                      {bon.articles.map(a => `${a.nomProduit} (x${a.quantite})`).join(', ')}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-white">
                      {formatFCFA(bon.total)}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                          bon.statutPaiement === 'PAYE'
                            ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-800'
                            : 'bg-amber-950/70 text-amber-300 border border-amber-800'
                        }`}
                      >
                        {bon.statutPaiement === 'PAYE' ? 'Réglé' : 'À Crédit'}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Règlements Fournisseurs History */}
      {reglementsFournisseurs && reglementsFournisseurs.length > 0 && (
        <div className="p-5 bg-slate-850 border border-slate-750 rounded-2xl space-y-4">
          <div className="flex items-center justify-between pb-2 border-b border-slate-800">
            <div className="flex items-center gap-2">
              <History className="w-5 h-5 text-orange-400" />
              <h3 className="font-bold text-white text-base">Historique des Règlements Fournisseurs</h3>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              {reglementsFournisseurs.length} paiement(s)
            </span>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-950 text-slate-400 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-750">
                <tr>
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Fournisseur</th>
                  <th className="py-2.5 px-3 text-right">Montant Réglé</th>
                  <th className="py-2.5 px-3 text-center">Mode</th>
                  <th className="py-2.5 px-3 text-center">Sortie Caisse</th>
                  <th className="py-2.5 px-3">Notes</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {reglementsFournisseurs.map(reg => (
                  <tr key={reg.id} className="hover:bg-slate-800/40">
                    <td className="py-2.5 px-3 text-slate-400 font-mono text-[11px]">
                      {formatDateTime(reg.date)}
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-white">
                      {reg.nomFournisseur}
                    </td>
                    <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-400">
                      {formatFCFA(reg.montant)}
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-slate-800 text-slate-300 border border-slate-700">
                        {reg.mode}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      {reg.avecSortieCaisse ? (
                        <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-emerald-950/70 text-emerald-300 border border-emerald-800">
                          Oui (Décaissé)
                        </span>
                      ) : (
                        <span className="text-[10px] px-2 py-0.5 rounded font-bold bg-slate-800 text-slate-400">
                          Non (Externe)
                        </span>
                      )}
                    </td>
                    <td className="py-2.5 px-3 text-slate-400 italic">
                      {reg.note || '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal: New Delivery Note (Bon de Réception) */}
      {isBonModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
            <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <PackageCheck className="w-5 h-5 text-orange-400" />
                <h3 className="font-bold text-white text-base">Bon de Réception Marchandises</h3>
              </div>
              <button
                onClick={() => setIsBonModalOpen(false)}
                className="w-8 h-8 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveBon} className="p-5 overflow-y-auto space-y-4 text-xs">
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold block">Fournisseur *</label>
                  <select
                    value={bonFournisseurId}
                    onChange={e => setBonFournisseurId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  >
                    {suppliers.map(s => (
                      <option key={s.id} value={s.id}>
                        {s.nom}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold block">N° Bon / Facture</label>
                  <input
                    type="text"
                    required
                    value={bonNumero}
                    onChange={e => setBonNumero(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-300 font-semibold block">Règlement Fournisseur</label>
                  <select
                    value={bonStatutPaiement}
                    onChange={e => setBonStatutPaiement(e.target.value as 'PAYE' | 'A_CREDIT')}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-bold"
                  >
                    <option value="PAYE">Payé comptant</option>
                    <option value="A_CREDIT">À Crédit (Dette Fournisseur)</option>
                  </select>
                </div>
              </div>

              {/* Delivery lines */}
              <div className="space-y-2 pt-2">
                <div className="flex items-center justify-between">
                  <span className="font-bold text-slate-300">Articles Réceptionnés &amp; Lots FEFO :</span>
                  <button
                    type="button"
                    onClick={handleAddLine}
                    className="text-xs text-orange-400 hover:text-orange-300 font-semibold flex items-center gap-1"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    + Ajouter une ligne
                  </button>
                </div>

                {bonLines.map((line, idx) => (
                  <div
                    key={idx}
                    className="p-3 bg-slate-950 rounded-xl border border-slate-800 grid grid-cols-1 sm:grid-cols-5 gap-2 items-center"
                  >
                    <div className="sm:col-span-2">
                      <label className="text-[10px] text-slate-400 block mb-0.5">Produit</label>
                      <select
                        value={line.produitId}
                        onChange={e => {
                          const pId = e.target.value;
                          const selectedP = products.find(p => p.id === pId);
                          const newLines = [...bonLines];
                          newLines[idx].produitId = pId;
                          if (selectedP) {
                            newLines[idx].prixAchat = selectedP.prixAchat;
                          }
                          setBonLines(newLines);
                        }}
                        className="w-full px-2 py-1.5 bg-slate-800 border border-slate-700 rounded text-white text-xs truncate"
                      >
                        {products.map(p => (
                          <option key={p.id} value={p.id}>
                            {p.nom}
                          </option>
                        ))}
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-400 block mb-0.5">Qté</label>
                      <input
                        type="number"
                        min="1"
                        value={line.quantite}
                        onChange={e => {
                          const newLines = [...bonLines];
                          newLines[idx].quantite = parseFloat(e.target.value) || 0;
                          setBonLines(newLines);
                        }}
                        className="w-full px-2 py-1.5 bg-slate-800 border border-slate-700 rounded text-white font-mono text-xs"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-400 block mb-0.5">N° Lot</label>
                      <input
                        type="text"
                        value={line.numeroLot}
                        onChange={e => {
                          const newLines = [...bonLines];
                          newLines[idx].numeroLot = e.target.value;
                          setBonLines(newLines);
                        }}
                        className="w-full px-2 py-1.5 bg-slate-800 border border-slate-700 rounded text-white font-mono text-xs"
                      />
                    </div>

                    <div className="flex items-center gap-1">
                      <div className="flex-1">
                        <label className="text-[10px] text-slate-400 block mb-0.5">DLC</label>
                        <input
                          type="date"
                          value={line.dlc}
                          onChange={e => {
                            const newLines = [...bonLines];
                            newLines[idx].dlc = e.target.value;
                            setBonLines(newLines);
                          }}
                          className="w-full px-2 py-1.5 bg-slate-800 border border-slate-700 rounded text-white text-xs"
                        />
                      </div>
                      {bonLines.length > 1 && (
                        <button
                          type="button"
                          onClick={() => handleRemoveLine(idx)}
                          className="mt-4 p-1.5 text-slate-500 hover:text-red-400"
                        >
                          ✕
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>

              {/* Total preview */}
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
                <span className="text-slate-400 font-semibold">Valeur totale marchandise :</span>
                <span className="text-lg font-black text-white font-mono">
                  {formatFCFA(totalBon)}
                </span>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsBonModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-semibold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold flex items-center gap-1.5 shadow-lg shadow-orange-500/20"
                >
                  <Check className="w-4 h-4" />
                  <span>Valider la Réception &amp; Mettre à jour Stocks</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add Supplier */}
      {isSupplierModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-white text-base">Nouveau Fournisseur</h3>
              <button
                onClick={() => setIsSupplierModalOpen(false)}
                className="w-8 h-8 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveSupplier} className="p-4 space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-slate-300 font-semibold block">Raison Sociale / Nom *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Patisen Sénégal"
                  value={supNom}
                  onChange={e => setSupNom(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-semibold block">Contact Commercial</label>
                <input
                  type="text"
                  placeholder="Ex: Ibrahima Dieng"
                  value={supContact}
                  onChange={e => setSupContact(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-semibold block">Téléphone Commercial</label>
                <input
                  type="text"
                  value={supTelephone}
                  onChange={e => setSupTelephone(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-semibold block">Adresse / Entrepôt</label>
                <input
                  type="text"
                  placeholder="Ex: Zone Industrielle Dakar"
                  value={supAdresse}
                  onChange={e => setSupAdresse(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsSupplierModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-semibold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-purple-600 hover:bg-purple-500 text-white font-bold flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4" />
                  <span>Enregistrer</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Enregistrer un Règlement Fournisseur */}
      {targetSupplierForPayment && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-750 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400">
                  <Wallet className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Régler Dette Fournisseur</h3>
                  <p className="text-xs text-slate-400 font-semibold text-orange-300">
                    {targetSupplierForPayment.nom}
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setTargetSupplierForPayment(null)}
                className="w-8 h-8 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 flex items-center justify-center cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmSettlement} className="p-5 space-y-4 text-xs">
              <div className="p-3 rounded-xl bg-amber-950/30 border border-amber-800/60 flex items-center justify-between">
                <span className="text-amber-200 font-medium">Dette actuelle due :</span>
                <span className="font-mono font-black text-amber-400 text-sm">
                  {formatFCFA(targetSupplierForPayment.dette)}
                </span>
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-semibold block">Montant du Règlement (FCFA) *</label>
                <input
                  type="number"
                  required
                  min={100}
                  max={targetSupplierForPayment.dette}
                  value={payAmountStr}
                  onChange={e => setPayAmountStr(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono font-bold text-base focus:ring-2 focus:ring-orange-500 outline-hidden"
                />
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setPayAmountStr(targetSupplierForPayment.dette.toString())}
                    className="text-[10px] px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-750 text-orange-400 font-bold border border-slate-700 cursor-pointer"
                  >
                    Tout solder ({formatCurrencyShort(targetSupplierForPayment.dette)})
                  </button>
                  {targetSupplierForPayment.dette > 50000 && (
                    <button
                      type="button"
                      onClick={() => setPayAmountStr((Math.round(targetSupplierForPayment.dette / 2)).toString())}
                      className="text-[10px] px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold border border-slate-700 cursor-pointer"
                    >
                      50% ({formatCurrencyShort(Math.round(targetSupplierForPayment.dette / 2))})
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-semibold block">Mode de Paiement</label>
                <div className="grid grid-cols-3 gap-2">
                  {(['ESPECE', 'WAVE', 'ORANGE_MONEY'] as PaymentMethod[]).map(mode => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => {
                        setPayMode(mode);
                        if (mode !== 'ESPECE') setPayWithCaisse(false);
                        else setPayWithCaisse(true);
                      }}
                      className={`p-2.5 rounded-xl border text-center font-bold text-xs transition-all cursor-pointer ${
                        payMode === mode
                          ? 'bg-orange-500/20 border-orange-500 text-orange-300 shadow-xs'
                          : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-white'
                      }`}
                    >
                      {mode === 'ESPECE' ? 'Espèces' : mode === 'WAVE' ? 'Wave' : 'Orange Money'}
                    </button>
                  ))}
                </div>
              </div>

              {payMode === 'ESPECE' && (
                <div className="p-3 bg-slate-800/60 border border-slate-700 rounded-xl">
                  <label className="flex items-center gap-2 cursor-pointer text-slate-300 font-semibold">
                    <input
                      type="checkbox"
                      checked={payWithCaisse}
                      onChange={e => setPayWithCaisse(e.target.checked)}
                      className="w-4 h-4 rounded text-orange-500 focus:ring-orange-500 bg-slate-900 border-slate-700"
                    />
                    <span>Décaisser automatiquement de la caisse (Sortie de caisse)</span>
                  </label>
                  <p className="text-[10px] text-slate-400 mt-1 pl-6">
                    Mettra à jour le total d'espèces attendu lors de la clôture de caisse du jour.
                  </p>
                </div>
              )}

              <div className="space-y-1">
                <label className="text-slate-300 font-semibold block">Motif / Référence Facture (Optionnel)</label>
                <input
                  type="text"
                  placeholder="Ex: Facture N°8923 ou chèque remis"
                  value={payNote}
                  onChange={e => setPayNote(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setTargetSupplierForPayment(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-semibold hover:bg-slate-750 cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold flex items-center gap-1.5 shadow-md shadow-orange-500/20 cursor-pointer"
                >
                  <Check className="w-4 h-4" />
                  <span>Confirmer le Règlement</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
