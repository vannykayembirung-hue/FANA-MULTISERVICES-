import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Client, PaymentMethod } from '../../types';
import { formatMoney, formatDateTime, formatCurrencyShort } from '../../utils/format';
import { 
  Users, 
  UserPlus, 
  Search, 
  BookOpen, 
  DollarSign, 
  AlertTriangle, 
  Check, 
  X, 
  History, 
  Phone, 
  MapPin, 
  Wallet,
  ArrowDownCircle,
  FileCheck
} from 'lucide-react';

export const ClientsView: React.FC = () => {
  const { clients, addClient, updateClient, recordClientPayment, toBaseAmount, fromBaseAmount, displayCurrency, isSaving } = useApp();

  const [search, setSearch] = useState<string>('');
  const [filterDebtOnly, setFilterDebtOnly] = useState<boolean>(false);

  // Modals
  const [isClientModalOpen, setIsClientModalOpen] = useState<boolean>(false);
  const [clientToEdit, setClientToEdit] = useState<Client | null>(null);

  const [paymentClient, setPaymentClient] = useState<Client | null>(null);
  const [paymentAmountStr, setPaymentAmountStr] = useState<string>('');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('ESPECE');
  const [paymentNote, setPaymentNote] = useState<string>('');
  const [paymentVerified, setPaymentVerified] = useState(false);

  const [viewHistoryClient, setViewHistoryClient] = useState<Client | null>(null);

  // Filter clients
  const filteredClients = clients.filter(c => {
    const matchesSearch =
      c.nom.toLowerCase().includes(search.toLowerCase()) ||
      c.telephone.includes(search) ||
      (c.adresse && c.adresse.toLowerCase().includes(search.toLowerCase()));
    if (filterDebtOnly) {
      return matchesSearch && c.credit > 0;
    }
    return matchesSearch;
  });

  const totalOutstandingCredit = clients.reduce((acc, c) => acc + c.credit, 0);

  const handleOpenPayment = (client: Client) => {
    setPaymentClient(client);
    setPaymentAmountStr('');
    setPaymentMethod('ESPECE');
    setPaymentNote('');
    setPaymentVerified(false);
  };

  const handleConfirmPayment = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!paymentClient) return;
    let amountCdf: number;
    try { amountCdf = toBaseAmount(Number(paymentAmountStr) || 0); } catch { return; }
    if (amountCdf <= 0 || amountCdf > paymentClient.credit) return;
    if (paymentMethod !== 'ESPECE' && !paymentVerified) return;
    const saved = await recordClientPayment(paymentClient.id, amountCdf, paymentMethod, paymentNote.trim());
    if (saved) setPaymentClient(null);
  };

  const [formNom, setFormNom] = useState<string>('');
  const [formTelephone, setFormTelephone] = useState<string>('');
  const [formAdresse, setFormAdresse] = useState<string>('');
  const [formPlafond, setFormPlafond] = useState<string>('');

  const handleOpenAddClient = () => {
    setClientToEdit(null);
    setFormNom('');
    setFormTelephone('');
    setFormAdresse('');
    setFormPlafond('');
    setIsClientModalOpen(true);
  };

  const handleOpenEditClient = (client: Client) => {
    setClientToEdit(client);
    setFormNom(client.nom);
    setFormTelephone(client.telephone);
    setFormAdresse(client.adresse || '');
    setFormPlafond(String(fromBaseAmount(client.plafondCredit)));
    setIsClientModalOpen(true);
  };

  const handleSaveClientForm = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!formNom.trim() || !formTelephone.trim()) return;
    let plafondCdf: number;
    try { plafondCdf = toBaseAmount(Number(formPlafond) || 0); } catch { return; }
    const saved = clientToEdit
      ? await updateClient({ ...clientToEdit, nom: formNom.trim(), telephone: formTelephone.trim(), adresse: formAdresse.trim(), plafondCredit: plafondCdf })
      : await addClient({ nom: formNom.trim(), telephone: formTelephone.trim(), adresse: formAdresse.trim(), plafondCredit: plafondCdf });
    if (saved) setIsClientModalOpen(false);
  };

  return (
    <div className="flex-1 p-4 lg:p-6 overflow-y-auto space-y-6 bg-slate-900 text-slate-100">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <span>Clients &amp; Carnet d'Ardoises</span>
            <span className="text-xs px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-400 font-bold border border-amber-500/30">
              Crédits
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Gestion des dettes clients, plafonds de crédit autorisés et encaissement d'ardoises.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="px-3 py-2 bg-slate-850 rounded-xl border border-slate-750 text-right">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">Total Dettes Clients</span>
            <span className="text-sm font-black text-amber-400 font-mono">
              {formatMoney(totalOutstandingCredit)}
            </span>
          </div>

          <button
            type="button"
            onClick={handleOpenAddClient}
            className="px-4 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-orange-500/20 transition-all shrink-0"
          >
            <UserPlus className="w-4 h-4" />
            <span>Nouveau Client</span>
          </button>
        </div>
      </div>

      {/* Filter and Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-850 p-3 rounded-2xl border border-slate-750">
        <div className="relative flex-1 w-full sm:w-auto">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Rechercher client par nom, numéro de téléphone, quartier..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs placeholder-slate-400 focus:outline-hidden focus:border-orange-500"
          />
        </div>

        <button
          type="button"
          onClick={() => setFilterDebtOnly(!filterDebtOnly)}
          className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all shrink-0 ${
            filterDebtOnly
              ? 'bg-amber-950/80 text-amber-300 border-amber-700 ring-1 ring-amber-600'
              : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
          }`}
        >
          <BookOpen className="w-3.5 h-3.5 text-amber-400" />
          <span>Clients Endettés Seuls ({clients.filter(c => c.credit > 0).length})</span>
        </button>
      </div>

      {/* Clients Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredClients.map(client => {
          const isOverLimit = client.credit >= client.plafondCredit;
          const isNearLimit = client.credit >= client.plafondCredit * 0.8;
          const soldeRestant = Math.max(0, client.plafondCredit - client.credit);

          return (
            <div
              key={client.id}
              className={`p-4 rounded-2xl border flex flex-col justify-between transition-all ${
                isOverLimit
                  ? 'bg-red-950/20 border-red-800/80 hover:border-red-700'
                  : client.credit > 0
                  ? 'bg-slate-850 border-amber-900/40 hover:border-amber-700/60'
                  : 'bg-slate-850 border-slate-750 hover:border-slate-700'
              }`}
            >
              <div>
                {/* Client header */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <h3 className="font-bold text-white text-sm sm:text-base truncate">
                      {client.nom}
                    </h3>
                    <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                      <span className="flex items-center gap-1 font-mono text-[11px]">
                        <Phone className="w-3 h-3 text-slate-500" />
                        {client.telephone}
                      </span>
                    </div>
                  </div>

                  {/* Status badge */}
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded font-bold shrink-0 ${
                      client.credit === 0
                        ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-800'
                        : isOverLimit
                        ? 'bg-red-950 text-red-300 border border-red-700 animate-pulse'
                        : isNearLimit
                        ? 'bg-amber-950 text-amber-300 border border-amber-700'
                        : 'bg-slate-800 text-slate-300 border border-slate-700'
                    }`}
                  >
                    {client.credit === 0
                      ? 'À jour'
                      : isOverLimit
                      ? 'Plafond Dépassé'
                      : 'Dette active'}
                  </span>
                </div>

                {client.adresse && (
                  <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-2">
                    <MapPin className="w-3 h-3 text-slate-500 shrink-0" />
                    <span className="truncate">{client.adresse}</span>
                  </div>
                )}

                {/* Debt details block */}
                <div className="mt-4 p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                  <div className="flex justify-between items-baseline text-xs">
                    <span className="text-slate-400">Dette Actuelle (Ardoise)</span>
                    <span
                      className={`text-base font-extrabold font-mono ${
                        client.credit > 0 ? 'text-amber-400' : 'text-emerald-400'
                      }`}
                    >
                      {formatMoney(client.credit)}
                    </span>
                  </div>

                  <div className="flex justify-between text-[11px] text-slate-400">
                    <span>Plafond autorisé :</span>
                    <span className="font-mono text-slate-200">{formatMoney(client.plafondCredit)}</span>
                  </div>

                  {/* Gauge bar */}
                  <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all ${
                        isOverLimit
                          ? 'bg-red-500'
                          : isNearLimit
                          ? 'bg-amber-500'
                          : 'bg-emerald-500'
                      }`}
                      style={{
                        width: `${Math.min(100, (client.credit / client.plafondCredit) * 100)}%`,
                      }}
                    />
                  </div>

                  <div className="flex justify-between text-[10px] text-slate-500">
                    <span>Crédit disponible :</span>
                    <span className="font-mono text-slate-400">{formatMoney(soldeRestant)}</span>
                  </div>
                </div>
              </div>

              {/* Action buttons */}
              <div className="mt-4 pt-3 border-t border-slate-800 flex items-center justify-between gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => setViewHistoryClient(client)}
                  className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium flex items-center gap-1 transition-colors"
                >
                  <History className="w-3.5 h-3.5 text-slate-400" />
                  <span>Historique</span>
                </button>

                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() => handleOpenEditClient(client)}
                    className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium transition-colors"
                  >
                    Modifier
                  </button>

                  <button
                    type="button"
                    disabled={client.credit <= 0}
                    onClick={() => handleOpenPayment(client)}
                    className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-40 text-white font-bold flex items-center gap-1 shadow-md shadow-emerald-600/20 transition-all"
                  >
                    <ArrowDownCircle className="w-3.5 h-3.5" />
                    <span>Encaisser</span>
                  </button>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Modal: Encaisser dette / Règlement d'ardoise */}
      {paymentClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <ArrowDownCircle className="w-5 h-5 text-emerald-400" />
                <div>
                  <h3 className="font-bold text-white text-base">Règlement d'Ardoise</h3>
                  <p className="text-xs text-slate-400">{paymentClient.nom}</p>
                </div>
              </div>
              <button
                onClick={() => setPaymentClient(null)}
                className="w-8 h-8 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmPayment} className="p-4 space-y-4 text-xs">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex justify-between items-center">
                <span className="text-slate-400">Dette totale en cours :</span>
                <span className="text-xl font-black text-amber-400 font-mono">
                  {formatMoney(paymentClient.credit)}
                </span>
              </div>

              {/* Amount input */}
              <div className="space-y-1">
                <div className="flex justify-between items-center">
                  <label className="text-slate-300 font-semibold">Montant réglé ({displayCurrency}) *</label>
                  <button
                    type="button"
                    onClick={() => setPaymentAmountStr(String(fromBaseAmount(paymentClient.credit)))}
                    className="text-orange-400 hover:underline font-bold text-[11px]"
                  >
                    Tout solder ({formatCurrencyShort(paymentClient.credit)})
                  </button>
                </div>
                <input
                  type="number"
                  min="0.01"
                  max={fromBaseAmount(paymentClient.credit)}
                  required
                  value={paymentAmountStr}
                  onChange={e => setPaymentAmountStr(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono text-lg font-bold focus:outline-hidden focus:border-emerald-500"
                />
              </div>

              {/* Mode de règlement */}
              <div className="space-y-1">
                <label className="text-slate-300 font-semibold block">Mode de paiement reçu</label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {([
                    ['ESPECE', 'Espèces'],
                    ['MPESA', 'M-Pesa'],
                    ['ORANGE_MONEY', 'Orange Money'],
                    ['AIRTEL_MONEY', 'Airtel Money'],
                    ['AFRIMONEY', 'Afrimoney'],
                  ] as const).map(([method, label]) => (
                    <button
                      key={method}
                      type="button"
                      onClick={() => { setPaymentMethod(method); setPaymentVerified(false); }}
                      className={`py-2 rounded-lg font-bold border ${paymentMethod === method
                        ? 'bg-orange-500 text-white border-orange-400'
                        : 'bg-slate-800 text-slate-300 border-slate-700'}`}
                    >
                      {label}
                    </button>
                  ))}
                </div>
              </div>

              {paymentMethod !== 'ESPECE' && (
                <label className="flex cursor-pointer items-start gap-2 rounded-xl border border-amber-800/60 bg-amber-950/25 p-3 text-xs leading-5 text-amber-100">
                  <input type="checkbox" checked={paymentVerified} onChange={event => setPaymentVerified(event.target.checked)} className="mt-0.5 accent-orange-500" />
                  <span>J’ai vérifié la réception de ce règlement sur le compte de l’opérateur.</span>
                </label>
              )}

              {/* Note */}
              <div className="space-y-1">
                <label className="text-slate-300 font-semibold block">Observation / Note</label>
                <input
                  type="text"
                  value={paymentNote}
                  onChange={e => setPaymentNote(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentClient(null)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-semibold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSaving || (paymentMethod !== 'ESPECE' && !paymentVerified)}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1.5 shadow-lg shadow-emerald-600/20 disabled:cursor-not-allowed disabled:opacity-50"
                >
                  <Check className="w-4 h-4" />
                  <span>Valider l'Encaissement</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Add or Edit Client */}
      {isClientModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-white text-base">
                {clientToEdit ? 'Modifier Fiche Client' : 'Nouveau Client Ardoise'}
              </h3>
              <button
                onClick={() => setIsClientModalOpen(false)}
                className="w-8 h-8 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveClientForm} className="p-4 space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-slate-300 font-semibold block">Nom Complet *</label>
                <input
                  type="text"
                  required
                  placeholder="Nom complet du client"
                  value={formNom}
                  onChange={e => setFormNom(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-hidden focus:border-orange-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-semibold block">Téléphone *</label>
                <input
                  type="text"
                  required
                  placeholder="Téléphone du client"
                  value={formTelephone}
                  onChange={e => setFormTelephone(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono focus:outline-hidden focus:border-orange-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-semibold block">Adresse / Repère Quartier</label>
                <input
                  type="text"
                  placeholder="Ex: Villa 12, derrière la boulangerie"
                  value={formAdresse}
                  onChange={e => setFormAdresse(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-hidden focus:border-orange-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-semibold block">
                  Plafond de crédit autorisé ({displayCurrency}) *
                </label>
                <input
                  type="number"
                  min="0"
                  step="any"
                  required
                  value={formPlafond}
                  onChange={e => setFormPlafond(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono font-bold focus:outline-hidden focus:border-orange-500"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsClientModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-semibold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  className="px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold flex items-center gap-1.5 shadow-lg shadow-orange-500/20"
                >
                  <Check className="w-4 h-4" />
                  <span>Enregistrer Client</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Client Payment History */}
      {viewHistoryClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
            <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="font-bold text-white text-base">Historique des Règlements</h3>
                <p className="text-xs text-slate-400">{viewHistoryClient.nom}</p>
              </div>
              <button
                onClick={() => setViewHistoryClient(null)}
                className="w-8 h-8 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto space-y-2 text-xs">
              {(!viewHistoryClient.historiquePaiements ||
                viewHistoryClient.historiquePaiements.length === 0) ? (
                <p className="text-center text-slate-500 py-6">Aucun règlement antérieur enregistré.</p>
              ) : (
                viewHistoryClient.historiquePaiements.map(pay => (
                  <div
                    key={pay.id}
                    className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex items-center justify-between"
                  >
                    <div>
                      <div className="font-bold text-white">{formatMoney(pay.montant)}</div>
                      <div className="text-[11px] text-slate-400 mt-0.5">{pay.note}</div>
                      <div className="text-[10px] text-slate-500 mt-1">{formatDateTime(pay.date)}</div>
                    </div>
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-emerald-950/70 text-emerald-300 border border-emerald-800">
                      {pay.mode}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
