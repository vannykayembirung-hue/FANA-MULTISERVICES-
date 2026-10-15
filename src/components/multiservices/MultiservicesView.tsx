import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { formatFCFA, formatDateTime, formatCurrencyShort } from '../../utils/format';
import { MultiserviceReceiptModal } from './MultiserviceReceiptModal';
import { 
  Smartphone, 
  Send, 
  ArrowDownLeft, 
  Printer, 
  Zap, 
  PhoneCall, 
  Check, 
  Clock, 
  DollarSign, 
  ShieldCheck,
  FileText,
  Wallet,
  Coins,
  ArrowUpRight,
  Receipt,
  X
} from 'lucide-react';

export const MultiservicesView: React.FC = () => {
  const { services, addServiceTransaction, flotteSolde, updateFlotteSolde } = useApp();

  const [selectedService, setSelectedService] = useState<string>('Wave');
  const [txType, setTxType] = useState<'DEPOT' | 'RETRAIT' | 'PRESTATION' | 'RECHARGE'>('DEPOT');
  const [montantStr, setMontantStr] = useState<string>('10000');
  const [telephoneClient, setTelephoneClient] = useState<string>('');
  const [reference, setReference] = useState<string>(`WV-${Math.floor(10000 + Math.random() * 90000)}`);
  const [customCommission, setCustomCommission] = useState<string>('');
  const [successToast, setSuccessToast] = useState<string | null>(null);

  // Receipt modal state
  const [receiptTx, setReceiptTx] = useState<any | null>(null);

  // Flotte modal state
  const [isFlotteModalOpen, setIsFlotteModalOpen] = useState<boolean>(false);
  const [flotteTarget, setFlotteTarget] = useState<'wave' | 'orangeMoney' | 'woyofal'>('wave');
  const [flotteAction, setFlotteAction] = useState<'AJOUT' | 'RETRAIT'>('AJOUT');
  const [flotteAmountStr, setFlotteAmountStr] = useState<string>('50000');

  const montantNum = parseFloat(montantStr) || 0;

  // Calculate default commission based on service type & amount
  const computeDefaultCommission = (): number => {
    if (customCommission !== '') {
      return parseFloat(customCommission) || 0;
    }

    if (selectedService === 'Wave') {
      // ~1% max commission split for agent
      return Math.max(100, Math.round(montantNum * 0.01));
    } else if (selectedService === 'Orange Money') {
      return Math.max(100, Math.round(montantNum * 0.012));
    } else if (selectedService === 'Woyofal Senelec') {
      return 150; // flat commission
    } else if (selectedService === 'Photocopie N&B') {
      // 80% gross profit margin
      return Math.round(montantNum * 0.8);
    } else if (selectedService === 'Recharge Crédit') {
      return Math.round(montantNum * 0.05);
    }
    return Math.round(montantNum * 0.02);
  };

  const calculatedCommission = computeDefaultCommission();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (montantNum <= 0) return;

    const created = addServiceTransaction({
      nom: selectedService,
      type: txType,
      montant: montantNum,
      commission: calculatedCommission,
      reference,
      telephoneClient: telephoneClient || undefined,
    });

    setReceiptTx(created);
    setSuccessToast(`Transaction ${selectedService} (${formatFCFA(montantNum)}) enregistrée avec succès !`);
    setTimeout(() => setSuccessToast(null), 3000);

    // Reset inputs
    setMontantStr('10000');
    setTelephoneClient('');
    setReference(`${selectedService.slice(0, 2).toUpperCase()}-${Math.floor(10000 + Math.random() * 90000)}`);
    setCustomCommission('');
  };

  // Summaries
  const todayStr = new Date().toISOString().split('T')[0];
  const todayServices = services.filter(s => s.date.startsWith(todayStr));
  const totalVolumeToday = todayServices.reduce((acc, s) => acc + s.montant, 0);
  const totalCommissionsToday = todayServices.reduce((acc, s) => acc + s.commission, 0);

  return (
    <div className="flex-1 p-4 lg:p-6 overflow-y-auto space-y-6 bg-slate-900 text-slate-100">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <span>Guichet Multiservices F.A.N.A</span>
            <span className="text-xs px-2 py-0.5 rounded-md bg-sky-500/20 text-sky-400 font-bold border border-sky-500/30">
              Mobile Money &amp; Bureautique
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Dépôts, retraits, recharges Woyofal et photocopies avec calcul automatique de vos commissions.
          </p>
        </div>

        {/* Quick KPI stats */}
        <div className="flex items-center gap-3">
          <div className="px-3 py-2 bg-slate-850 rounded-xl border border-slate-750 text-right">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">Volume Traité Jour</span>
            <span className="text-sm font-black text-white font-mono">{formatFCFA(totalVolumeToday)}</span>
          </div>
          <div className="px-3 py-2 bg-slate-850 rounded-xl border border-slate-750 text-right">
            <span className="text-[10px] text-sky-400 uppercase font-bold block">Vos Commissions</span>
            <span className="text-sm font-black text-emerald-400 font-mono">+{formatFCFA(totalCommissionsToday)}</span>
          </div>
        </div>
      </div>

      {successToast && (
        <div className="p-3 bg-emerald-950/80 border border-emerald-800 text-emerald-300 rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Electronic Float & Working Capital (Flottes Wave / OM / Woyofal) */}
      <div className="p-4 bg-slate-850 border border-slate-750 rounded-2xl space-y-3">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-sky-400" />
            <h3 className="font-bold text-white text-sm">Caisse de Roulement &amp; Flottes Électroniques</h3>
          </div>
          <button
            type="button"
            onClick={() => setIsFlotteModalOpen(true)}
            className="px-3 py-1.5 rounded-xl bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 border border-sky-500/30 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer self-start sm:self-auto"
          >
            <Coins className="w-3.5 h-3.5" />
            <span>Ajuster / Recharger Flotte</span>
          </button>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          {/* Wave Float */}
          <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[11px] text-slate-400 font-medium block">Solde Flotte Wave</span>
              <span className="text-lg font-black text-sky-400 font-mono">{formatFCFA(flotteSolde.wave)}</span>
            </div>
            <div className="w-9 h-9 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center font-bold text-xs font-mono">
              WV
            </div>
          </div>

          {/* Orange Money Float */}
          <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[11px] text-slate-400 font-medium block">Solde Flotte Orange Money</span>
              <span className="text-lg font-black text-orange-400 font-mono">{formatFCFA(flotteSolde.orangeMoney)}</span>
            </div>
            <div className="w-9 h-9 rounded-xl bg-orange-500/20 text-orange-400 flex items-center justify-center font-bold text-xs font-mono">
              OM
            </div>
          </div>

          {/* Woyofal Senelec Float */}
          <div className="p-3.5 bg-slate-900 border border-slate-800 rounded-xl flex items-center justify-between">
            <div>
              <span className="text-[11px] text-slate-400 font-medium block">Solde Compte Woyofal</span>
              <span className="text-lg font-black text-amber-400 font-mono">{formatFCFA(flotteSolde.woyofal)}</span>
            </div>
            <div className="w-9 h-9 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xs">
              ⚡
            </div>
          </div>
        </div>
      </div>

      {/* Main Layout: New Transaction Form + Recent History */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Transaction Entry Form */}
        <div className="lg:col-span-1 p-5 bg-slate-850 border border-slate-750 rounded-2xl space-y-4">
          <div className="flex items-center gap-2 pb-2 border-b border-slate-800">
            <Smartphone className="w-5 h-5 text-sky-400" />
            <h3 className="font-bold text-white text-base">Nouvelle Opération Express</h3>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {/* Service Selection */}
            <div>
              <label className="text-slate-300 font-semibold block mb-1.5">Type de Service *</label>
              <div className="grid grid-cols-2 gap-2">
                {[
                  { name: 'Wave', color: 'sky' },
                  { name: 'Orange Money', color: 'orange' },
                  { name: 'Woyofal Senelec', color: 'amber' },
                  { name: 'Photocopie N&B', color: 'emerald' },
                  { name: 'Recharge Crédit', color: 'purple' },
                  { name: 'Impression Couleur', color: 'blue' },
                ].map(srv => (
                  <button
                    key={srv.name}
                    type="button"
                    onClick={() => {
                      setSelectedService(srv.name);
                      if (srv.name === 'Photocopie N&B' || srv.name === 'Impression Couleur') {
                        setTxType('PRESTATION');
                      } else if (srv.name === 'Woyofal Senelec' || srv.name === 'Recharge Crédit') {
                        setTxType('RECHARGE');
                      } else {
                        setTxType('DEPOT');
                      }
                      setReference(`${srv.name.slice(0, 2).toUpperCase()}-${Math.floor(10000 + Math.random() * 90000)}`);
                    }}
                    className={`p-2.5 rounded-xl text-xs font-bold text-left border transition-all ${
                      selectedService === srv.name
                        ? 'bg-sky-500/20 border-sky-500 text-sky-300 ring-1 ring-sky-500'
                        : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-750'
                    }`}
                  >
                    {srv.name}
                  </button>
                ))}
              </div>
            </div>

            {/* Transaction Type (Dépôt vs Retrait) */}
            {['Wave', 'Orange Money'].includes(selectedService) && (
              <div>
                <label className="text-slate-300 font-semibold block mb-1.5">Sens du flux</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setTxType('DEPOT')}
                    className={`py-2 rounded-lg font-bold flex items-center justify-center gap-1.5 border ${
                      txType === 'DEPOT'
                        ? 'bg-emerald-600 text-white border-emerald-500'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}
                  >
                    <Send className="w-3.5 h-3.5" />
                    <span>Dépôt (Encaissement)</span>
                  </button>

                  <button
                    type="button"
                    onClick={() => setTxType('RETRAIT')}
                    className={`py-2 rounded-lg font-bold flex items-center justify-center gap-1.5 border ${
                      txType === 'RETRAIT'
                        ? 'bg-amber-600 text-white border-amber-500'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}
                  >
                    <ArrowDownLeft className="w-3.5 h-3.5" />
                    <span>Retrait (Décaissement)</span>
                  </button>
                </div>
              </div>
            )}

            {/* Montant */}
            <div className="space-y-1">
              <label className="text-slate-300 font-semibold block">Montant de la Transaction (FCFA) *</label>
              <input
                type="number"
                min="100"
                step="50"
                required
                value={montantStr}
                onChange={e => setMontantStr(e.target.value)}
                className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono text-base font-bold focus:outline-hidden focus:border-sky-500"
              />
              {/* Presets */}
              <div className="flex gap-1.5 pt-1 overflow-x-auto">
                {[500, 1000, 2000, 5000, 10000, 25000, 50000].map(val => (
                  <button
                    key={val}
                    type="button"
                    onClick={() => setMontantStr(val.toString())}
                    className="px-2 py-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[10px] font-mono shrink-0"
                  >
                    {val} F
                  </button>
                ))}
              </div>
            </div>

            {/* Client Phone & Reference */}
            <div className="grid grid-cols-2 gap-2">
              <div className="space-y-1">
                <label className="text-slate-300 font-semibold block">Tél. Client</label>
                <input
                  type="text"
                  placeholder="7X XXX XX XX"
                  value={telephoneClient}
                  onChange={e => setTelephoneClient(e.target.value)}
                  className="w-full px-2.5 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono text-xs focus:outline-hidden focus:border-sky-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-semibold block">Réf. Transaction</label>
                <input
                  type="text"
                  value={reference}
                  onChange={e => setReference(e.target.value)}
                  className="w-full px-2.5 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono text-xs focus:outline-hidden focus:border-sky-500"
                />
              </div>
            </div>

            {/* Commission calculation preview */}
            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-slate-400 font-medium">Commission F.A.N.A calculée :</span>
                <span className="text-base font-extrabold text-emerald-400 font-mono">
                  +{formatFCFA(calculatedCommission)}
                </span>
              </div>
              <p className="text-[10px] text-slate-500">
                Calculé automatiquement selon la grille tarifaire en vigueur.
              </p>
            </div>

            <button
              type="submit"
              className="w-full py-3.5 px-4 rounded-xl bg-sky-500 hover:bg-sky-400 active:bg-sky-600 text-white font-extrabold text-sm flex items-center justify-center gap-2 shadow-lg shadow-sky-500/20 transition-all"
            >
              <Check className="w-4 h-4" />
              <span>Valider l'Opération &amp; Caisse</span>
            </button>
          </form>
        </div>

        {/* History of Transactions */}
        <div className="lg:col-span-2 p-5 bg-slate-850 border border-slate-750 rounded-2xl flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between pb-2 border-b border-slate-800">
              <div className="flex items-center gap-2">
                <Clock className="w-5 h-5 text-slate-400" />
                <h3 className="font-bold text-white text-base">Historique des Opérations du Jour</h3>
              </div>
              <span className="text-xs text-slate-400 font-mono">
                {todayServices.length} transaction(s)
              </span>
            </div>

            <div className="overflow-x-auto mt-3">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-950 text-slate-400 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-750">
                  <tr>
                    <th className="py-2.5 px-3">Date / Heure</th>
                    <th className="py-2.5 px-3">Service</th>
                    <th className="py-2.5 px-3">Type</th>
                    <th className="py-2.5 px-3 text-right">Montant</th>
                    <th className="py-2.5 px-3 text-right">Commission</th>
                    <th className="py-2.5 px-3">Réf / Téléphone</th>
                    <th className="py-2.5 px-3 text-center">Ticket</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800">
                  {services.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="py-8 text-center text-slate-500">
                        Aucune opération multiservices enregistrée.
                      </td>
                    </tr>
                  ) : (
                    services.map(srv => (
                      <tr key={srv.id} className="hover:bg-slate-800/40">
                        <td className="py-2.5 px-3 text-slate-300 font-mono text-[11px]">
                          {formatDateTime(srv.date)}
                        </td>
                        <td className="py-2.5 px-3 font-bold text-white">
                          {srv.nom}
                        </td>
                        <td className="py-2.5 px-3">
                          <span
                            className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                              srv.type === 'DEPOT'
                                ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-800'
                                : srv.type === 'RETRAIT'
                                ? 'bg-amber-950/70 text-amber-300 border border-amber-800'
                                : 'bg-purple-950/70 text-purple-300 border border-purple-800'
                            }`}
                          >
                            {srv.type}
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-100">
                          {formatFCFA(srv.montant)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-400">
                          +{formatFCFA(srv.commission)}
                        </td>
                        <td className="py-2.5 px-3 text-[11px] text-slate-400 font-mono">
                          {srv.reference || '-'} {srv.telephoneClient ? `(${srv.telephoneClient})` : ''}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <button
                            type="button"
                            onClick={() => setReceiptTx(srv)}
                            className="px-2 py-1 rounded-lg bg-slate-800 hover:bg-sky-500/20 text-slate-300 hover:text-sky-300 border border-slate-700 text-[10px] font-bold inline-flex items-center gap-1 transition-colors cursor-pointer"
                            title="Imprimer le reçu client ou copier SMS"
                          >
                            <Printer className="w-3 h-3 text-sky-400" />
                            <span>Reçu</span>
                          </button>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 flex items-center justify-between text-xs">
            <span className="text-slate-400">Total Commissions Générées :</span>
            <span className="text-lg font-black text-emerald-400 font-mono">
              +{formatFCFA(services.reduce((acc, s) => acc + s.commission, 0))}
            </span>
          </div>
        </div>
      </div>

      {/* Modal: Receipt thermal printing and SMS */}
      {receiptTx && (
        <MultiserviceReceiptModal
          transaction={receiptTx}
          onClose={() => setReceiptTx(null)}
        />
      )}

      {/* Modal: Adjust / Refill Float */}
      {isFlotteModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-750 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Coins className="w-5 h-5 text-sky-400" />
                <h3 className="font-bold text-white text-base">Ajuster Caisse de Roulement / Flotte</h3>
              </div>
              <button
                type="button"
                onClick={() => setIsFlotteModalOpen(false)}
                className="w-8 h-8 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 flex items-center justify-center cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form
              onSubmit={e => {
                e.preventDefault();
                const amt = parseFloat(flotteAmountStr) || 0;
                if (amt <= 0) return;
                const delta = flotteAction === 'AJOUT' ? amt : -amt;
                if (flotteTarget === 'wave') {
                  updateFlotteSolde({ wave: Math.max(0, flotteSolde.wave + delta) });
                } else if (flotteTarget === 'orangeMoney') {
                  updateFlotteSolde({ orangeMoney: Math.max(0, flotteSolde.orangeMoney + delta) });
                } else {
                  updateFlotteSolde({ woyofal: Math.max(0, flotteSolde.woyofal + delta) });
                }
                setSuccessToast(`Flotte ${flotteTarget === 'wave' ? 'Wave' : flotteTarget === 'orangeMoney' ? 'Orange Money' : 'Woyofal'} mise à jour avec succès !`);
                setIsFlotteModalOpen(false);
              }}
              className="p-5 space-y-4 text-xs"
            >
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Compte Flotte *</label>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'wave' as const, label: 'Wave', cur: flotteSolde.wave },
                    { id: 'orangeMoney' as const, label: 'Orange Money', cur: flotteSolde.orangeMoney },
                    { id: 'woyofal' as const, label: 'Woyofal', cur: flotteSolde.woyofal },
                  ].map(item => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => setFlotteTarget(item.id)}
                      className={`p-2 rounded-xl border text-center font-bold transition-all cursor-pointer ${
                        flotteTarget === item.id
                          ? 'bg-sky-500/20 border-sky-500 text-sky-300'
                          : 'bg-slate-800 border-slate-700 text-slate-400 hover:text-white'
                      }`}
                    >
                      <div className="truncate">{item.label}</div>
                      <div className="text-[10px] font-mono mt-0.5">{formatCurrencyShort(item.cur)}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="text-slate-300 font-semibold block mb-1">Type d'ajustement</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setFlotteAction('AJOUT')}
                    className={`py-2 rounded-xl font-bold border transition-all cursor-pointer ${
                      flotteAction === 'AJOUT'
                        ? 'bg-emerald-600 text-white border-emerald-500'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}
                  >
                    + Réapprovisionnement
                  </button>
                  <button
                    type="button"
                    onClick={() => setFlotteAction('RETRAIT')}
                    className={`py-2 rounded-xl font-bold border transition-all cursor-pointer ${
                      flotteAction === 'RETRAIT'
                        ? 'bg-amber-600 text-white border-amber-500'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}
                  >
                    - Décaissement
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-semibold block">Montant de l'ajustement (FCFA) *</label>
                <input
                  type="number"
                  min="1000"
                  step="1000"
                  required
                  value={flotteAmountStr}
                  onChange={e => setFlotteAmountStr(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono text-base font-bold focus:outline-hidden focus:border-sky-500"
                />
                <div className="flex gap-1 pt-1 overflow-x-auto">
                  {[25000, 50000, 100000, 200000, 500000].map(v => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setFlotteAmountStr(v.toString())}
                      className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-750 text-slate-300 text-[10px] font-mono shrink-0 cursor-pointer"
                    >
                      {formatCurrencyShort(v)}
                    </button>
                  ))}
                </div>
              </div>

              <div className="pt-2 flex justify-end gap-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => setIsFlotteModalOpen(false)}
                  className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold hover:bg-slate-750 cursor-pointer"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-bold cursor-pointer"
                >
                  Valider Ajustement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
