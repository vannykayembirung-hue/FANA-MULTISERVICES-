import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Fournisseur, Produit, PaymentMethod } from '../../types';
import { formatMoney, formatDateTime, formatCurrencyShort } from '../../utils/format';
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
    toBaseAmount,
    fromBaseAmount,
    displayCurrency,
    isSaving,
  } = useApp();

  type PurchaseMethod = Exclude<PaymentMethod, 'CREDIT'>;
  const purchaseMethods: Array<{ id: PurchaseMethod; label: string }> = [
    { id: 'ESPECE', label: 'Espèces' },
    { id: 'MPESA', label: 'M-Pesa' },
    { id: 'ORANGE_MONEY', label: 'Orange Money' },
    { id: 'AIRTEL_MONEY', label: 'Airtel Money' },
    { id: 'AFRIMONEY', label: 'Afrimoney' },
  ];
  type DeliveryLine = { produitId: string; quantite: number; prixAchat: number; prixAchatRenseigne: boolean; numeroLot: string; dlc: string };

  const [isSupplierModalOpen, setIsSupplierModalOpen] = useState(false);
  const [isBonModalOpen, setIsBonModalOpen] = useState(false);
  const [targetSupplierForPayment, setTargetSupplierForPayment] = useState<Fournisseur | null>(null);
  const [payAmountStr, setPayAmountStr] = useState('');
  const [payMode, setPayMode] = useState<PurchaseMethod>('ESPECE');
  const [payWithCaisse, setPayWithCaisse] = useState(true);
  const [payNote, setPayNote] = useState('');
  const [payVerified, setPayVerified] = useState(false);
  const [settlementSuccessToast, setSettlementSuccessToast] = useState<string | null>(null);
  const [supNom, setSupNom] = useState('');
  const [supContact, setSupContact] = useState('');
  const [supTelephone, setSupTelephone] = useState('');
  const [supAdresse, setSupAdresse] = useState('');
  const [bonFournisseurId, setBonFournisseurId] = useState('');
  const [bonNumero, setBonNumero] = useState('');
  const [bonStatutPaiement, setBonStatutPaiement] = useState<'PAYE' | 'A_CREDIT'>('PAYE');
  const [bonModePaiement, setBonModePaiement] = useState<PurchaseMethod>('ESPECE');
  const [bonPaiementVerified, setBonPaiementVerified] = useState(false);
  const [bonLines, setBonLines] = useState<DeliveryLine[]>([]);

  const totalBon = bonLines.reduce((sum, line) => sum + line.quantite * line.prixAchat, 0);
  const totalBonComplet = bonLines.length > 0 && bonLines.every(line => line.produitId && line.quantite > 0 && line.prixAchatRenseigne);

  const handleOpenBon = () => {
    setBonFournisseurId(suppliers[0]?.id || '');
    setBonNumero('');
    setBonStatutPaiement('PAYE');
    setBonModePaiement('ESPECE');
    setBonPaiementVerified(false);
    setBonLines([]);
    setIsBonModalOpen(true);
  };

  const handleAddLine = () => {
    setBonLines(previous => [...previous, { produitId: '', quantite: 0, prixAchat: 0, prixAchatRenseigne: false, numeroLot: '', dlc: '' }]);
  };

  const handleRemoveLine = (index: number) => setBonLines(previous => previous.filter((_, i) => i !== index));

  const handleSaveBon = async (event: React.FormEvent) => {
    event.preventDefault();
    const supplier = suppliers.find(item => item.id === bonFournisseurId);
    if (!supplier || !bonNumero.trim() || bonLines.length === 0) return;
    if (bonStatutPaiement === 'PAYE' && bonModePaiement !== 'ESPECE' && !bonPaiementVerified) return;
    const articles = bonLines.map(line => {
      const product = products.find(item => item.id === line.produitId);
      if (!product || line.quantite <= 0 || !line.prixAchatRenseigne || !Number.isFinite(line.prixAchat) || line.prixAchat < 0 || !line.numeroLot.trim() || !line.dlc) return null;
      return { produitId: line.produitId, nomProduit: product.nom, quantite: line.quantite, prixAchat: line.prixAchat, numeroLot: line.numeroLot.trim(), dlc: line.dlc };
    });
    if (articles.some(article => article === null)) return;
    const saved = await addBonReception({
      numeroBon: bonNumero.trim(),
      fournisseurId: supplier.id,
      nomFournisseur: supplier.nom,
      total: totalBon,
      statutPaiement: bonStatutPaiement,
      modePaiement: bonStatutPaiement === 'PAYE' ? bonModePaiement : undefined,
      articles: articles as NonNullable<(typeof articles)[number]>[],
    }, bonStatutPaiement === 'PAYE' ? bonModePaiement : undefined);
    if (saved) {
      setIsBonModalOpen(false);
      setBonLines([]);
      setBonNumero('');
    }
  };

  const handleSaveSupplier = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!supNom.trim()) return;
    const saved = await addSupplier({
      nom: supNom.trim(),
      contact: supContact.trim(),
      telephone: supTelephone.trim(),
      adresse: supAdresse.trim(),
    });
    if (!saved) return;
    setIsSupplierModalOpen(false);
    setSupNom('');
    setSupContact('');
    setSupTelephone('');
    setSupAdresse('');
  };

  const handleOpenSettlement = (supplier: Fournisseur) => {
    setTargetSupplierForPayment(supplier);
    setPayAmountStr('');
    setPayMode('ESPECE');
    setPayWithCaisse(true);
    setPayNote('');
    setPayVerified(false);
  };

  const handleConfirmSettlement = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!targetSupplierForPayment) return;
    let amountCdf: number;
    try { amountCdf = toBaseAmount(Number(payAmountStr) || 0); } catch { return; }
    if (amountCdf <= 0 || amountCdf > targetSupplierForPayment.dette) return;
    if (payMode !== 'ESPECE' && !payVerified) return;
    const saved = await recordSupplierPayment(
      targetSupplierForPayment.id,
      amountCdf,
      payMode,
      payWithCaisse,
      payNote.trim(),
    );
    if (!saved) return;
    setSettlementSuccessToast(`Règlement de ${formatMoney(amountCdf)} enregistré pour ${targetSupplierForPayment.nom}`);
    window.setTimeout(() => setSettlementSuccessToast(null), 3500);
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
            onClick={handleOpenBon}
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
                    {formatMoney(s.dette)}
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
                      {formatMoney(bon.total)}
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
                      {formatMoney(reg.montant)}
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
                    required
                    value={bonFournisseurId}
                    onChange={e => setBonFournisseurId(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                  >
                    <option value="" disabled>Sélectionner</option>
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
                    onChange={e => { setBonStatutPaiement(e.target.value as 'PAYE' | 'A_CREDIT'); setBonPaiementVerified(false); }}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-bold"
                  >
                    <option value="PAYE">Payé comptant</option>
                    <option value="A_CREDIT">À Crédit (Dette Fournisseur)</option>
                  </select>
                </div>
              </div>

              {bonStatutPaiement === 'PAYE' && <label className="block space-y-1">
                <span className="text-slate-300 font-semibold">Mode de paiement de la facture</span>
                <select value={bonModePaiement} onChange={event => { setBonModePaiement(event.target.value as PurchaseMethod); setBonPaiementVerified(false); }} className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white">
                  {purchaseMethods.map(method => <option key={method.id} value={method.id}>{method.label}</option>)}
                </select>
              </label>}

              {bonStatutPaiement === 'PAYE' && bonModePaiement !== 'ESPECE' && (
                <label className="flex cursor-pointer items-start gap-2 rounded-xl border border-amber-800/60 bg-amber-950/25 p-3 text-xs leading-5 text-amber-100">
                  <input type="checkbox" checked={bonPaiementVerified} onChange={event => setBonPaiementVerified(event.target.checked)} className="mt-0.5 accent-orange-500" />
                  <span>J’ai vérifié l’envoi effectif du paiement au fournisseur dans l’application du prestataire.</span>
                </label>
              )}

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
                    className="p-3 bg-slate-950 rounded-xl border border-slate-800 grid grid-cols-1 sm:grid-cols-6 gap-2 items-center"
                  >
                    <div className="sm:col-span-2">
                      <label className="text-[10px] text-slate-400 block mb-0.5">Produit</label>
                      <select
                        required
                        value={line.produitId}
                        onChange={e => {
                          const pId = e.target.value;
                          setBonLines(previous => previous.map((item, index) => index === idx
                            ? { ...item, produitId: pId, prixAchat: 0, prixAchatRenseigne: false }
                            : item));
                        }}
                        className="w-full px-2 py-1.5 bg-slate-800 border border-slate-700 rounded text-white text-xs truncate"
                      >
                        <option value="" disabled>Sélectionner un produit</option>
                        {products.map(p => <option key={p.id} value={p.id}>{p.nom}</option>)}
                      </select>
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-400 block mb-0.5">Qté</label>
                      <input
                        type="number"
                        required
                        min="0.001"
                        step="0.001"
                        value={line.quantite || ''}
                        onChange={e => {
                          const value = Number(e.target.value) || 0;
                          setBonLines(previous => previous.map((item, index) => index === idx ? { ...item, quantite: value } : item));
                        }}
                        className="w-full px-2 py-1.5 bg-slate-800 border border-slate-700 rounded text-white font-mono text-xs"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-400 block mb-0.5">Coût réellement payé ({displayCurrency}) *</label>
                      <input
                        type="number"
                        min="0"
                        step="any"
                        required
                        value={line.prixAchatRenseigne ? String(fromBaseAmount(line.prixAchat)) : ''}
                        onChange={e => {
                          const raw = e.target.value;
                          if (raw === '') {
                            setBonLines(previous => previous.map((item, index) => index === idx ? { ...item, prixAchat: 0, prixAchatRenseigne: false } : item));
                            return;
                          }
                          const entered = Number(raw);
                          if (!Number.isFinite(entered) || entered < 0) return;
                          try {
                            const prixAchat = toBaseAmount(entered);
                            setBonLines(previous => previous.map((item, index) => index === idx ? { ...item, prixAchat, prixAchatRenseigne: true } : item));
                          } catch { /* settings error is displayed at the top of the app */ }
                        }}
                        className="w-full px-2 py-1.5 bg-slate-800 border border-slate-700 rounded text-white font-mono text-xs"
                      />
                    </div>

                    <div>
                      <label className="text-[10px] text-slate-400 block mb-0.5">N° Lot</label>
                      <input
                        type="text"
                        required
                        value={line.numeroLot}
                        onChange={e => setBonLines(previous => previous.map((item, index) => index === idx ? { ...item, numeroLot: e.target.value } : item))}
                        className="w-full px-2 py-1.5 bg-slate-800 border border-slate-700 rounded text-white font-mono text-xs"
                      />
                    </div>

                    <div className="flex items-center gap-1">
                      <div className="flex-1">
                        <label className="text-[10px] text-slate-400 block mb-0.5">DLC</label>
                        <input
                          type="date"
                          required
                          value={line.dlc}
                          onChange={e => setBonLines(previous => previous.map((item, index) => index === idx ? { ...item, dlc: e.target.value } : item))}
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
                  {totalBonComplet ? formatMoney(totalBon) : 'À compléter'}
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
                  disabled={isSaving || (bonStatutPaiement === 'PAYE' && bonModePaiement !== 'ESPECE' && !bonPaiementVerified)}
                  className="px-5 py-2.5 rounded-xl bg-orange-500 disabled:opacity-50 hover:bg-orange-600 text-white font-bold flex items-center gap-1.5 shadow-lg shadow-orange-500/20"
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
                  placeholder="Nom réel du fournisseur"
                  value={supNom}
                  onChange={e => setSupNom(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-semibold block">Contact Commercial</label>
                <input
                  type="text"
                  placeholder="Nom du contact commercial"
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
                  placeholder="Téléphone du fournisseur"
                  onChange={e => setSupTelephone(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-semibold block">Adresse / Entrepôt</label>
                <input
                  type="text"
                  placeholder="Adresse réelle du fournisseur"
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
                  disabled={isSaving}
                  className="px-5 py-2.5 rounded-xl bg-purple-600 disabled:opacity-50 hover:bg-purple-500 text-white font-bold flex items-center gap-1.5"
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
                  {formatMoney(targetSupplierForPayment.dette)}
                </span>
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-semibold block">Montant du règlement ({displayCurrency}) *</label>
                <input
                  type="number"
                  required
                  min={0.01}
                  max={fromBaseAmount(targetSupplierForPayment.dette)}
                  step="any"
                  value={payAmountStr}
                  onChange={e => setPayAmountStr(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono font-bold text-base focus:ring-2 focus:ring-orange-500 outline-hidden"
                />
                <div className="flex gap-2 pt-1">
                  <button
                    type="button"
                    onClick={() => setPayAmountStr(String(fromBaseAmount(targetSupplierForPayment.dette)))}
                    className="text-[10px] px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-750 text-orange-400 font-bold border border-slate-700 cursor-pointer"
                  >
                    Tout solder ({formatCurrencyShort(targetSupplierForPayment.dette)})
                  </button>
                  {targetSupplierForPayment.dette > 50000 && (
                    <button
                      type="button"
                      onClick={() => setPayAmountStr(String(fromBaseAmount(targetSupplierForPayment.dette / 2)))}
                      className="text-[10px] px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-750 text-slate-300 font-bold border border-slate-700 cursor-pointer"
                    >
                      50% ({formatCurrencyShort(Math.round(targetSupplierForPayment.dette / 2))})
                    </button>
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-semibold block">Mode de Paiement</label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {purchaseMethods.map(method => (
                    <button
                      key={method.id}
                      type="button"
                      onClick={() => {
                        setPayMode(method.id);
                        setPayWithCaisse(method.id === 'ESPECE');
                        setPayVerified(false);
                      }}
                      className={`p-2.5 rounded-xl border text-center font-bold text-xs transition-all cursor-pointer ${payMode === method.id
                        ? 'bg-orange-500/20 border-orange-500 text-orange-300 shadow-xs'
                        : 'bg-slate-800/80 border-slate-700 text-slate-400 hover:text-white'}`}
                    >
                      {method.label}
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

              {payMode !== 'ESPECE' && (
                <label className="flex cursor-pointer items-start gap-2 rounded-xl border border-amber-800/60 bg-amber-950/25 p-3 text-xs leading-5 text-amber-100">
                  <input type="checkbox" checked={payVerified} onChange={event => setPayVerified(event.target.checked)} className="mt-0.5 accent-orange-500" />
                  <span>J’ai vérifié que le transfert a bien été envoyé au fournisseur dans l’application du prestataire.</span>
                </label>
              )}

              <div className="space-y-1">
                <label className="text-slate-300 font-semibold block">Motif / Référence Facture (Optionnel)</label>
                <input
                  type="text"
                  placeholder="Référence ou motif réel du règlement"
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
                  disabled={isSaving || (payMode !== 'ESPECE' && !payVerified)}
                  className="px-5 py-2.5 rounded-xl bg-orange-500 disabled:opacity-50 hover:bg-orange-600 text-white font-bold flex items-center gap-1.5 shadow-md shadow-orange-500/20 cursor-pointer"
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
