import React, { useEffect, useMemo, useState } from 'react';
import { Banknote, Check, CircleDollarSign, CreditCard, Smartphone, Wallet, X } from 'lucide-react';
import { Client, PaymentMethod } from '../../types';
import { useApp } from '../../context/AppContext';
import { formatMoney, formatCurrencyShort } from '../../utils/format';

interface PaymentModalProps {
  totalNet: number;
  selectedClient: Client | null;
  clients: Client[];
  onSelectClient: (clientId: string | null) => void;
  initialMethod?: PaymentMethod;
  onConfirmPayment: (method: PaymentMethod, receivedAmountCdf?: number, reference?: string, telephone?: string) => Promise<void> | void;
  onClose: () => void;
}

const METHODS: Array<{ id: PaymentMethod; label: string; short: string }> = [
  { id: 'ESPECE', label: 'Espèces', short: 'Cash' },
  { id: 'MPESA', label: 'M-Pesa', short: 'M-Pesa' },
  { id: 'ORANGE_MONEY', label: 'Orange Money', short: 'Orange' },
  { id: 'AIRTEL_MONEY', label: 'Airtel Money', short: 'Airtel' },
  { id: 'AFRIMONEY', label: 'Afrimoney', short: 'Afrimoney' },
  { id: 'CREDIT', label: 'Crédit client', short: 'Crédit' },
];

export const PaymentModal: React.FC<PaymentModalProps> = ({ totalNet, selectedClient, clients, onSelectClient, initialMethod = 'ESPECE', onConfirmPayment, onClose }) => {
  const { displayCurrency, toBaseAmount, fromBaseAmount, isSaving } = useApp();
  const [method, setMethod] = useState<PaymentMethod>(initialMethod);
  const [cashReceived, setCashReceived] = useState('');
  const [reference, setReference] = useState('');
  const [clientPhone, setClientPhone] = useState(selectedClient?.telephone || '');
  const [verified, setVerified] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => { setCashReceived(''); }, [totalNet, fromBaseAmount]);
  useEffect(() => { setClientPhone(selectedClient?.telephone || ''); }, [selectedClient?.id, selectedClient?.telephone]);

  const cashReceivedCdf = useMemo(() => {
    try { return toBaseAmount(Number(cashReceived) || 0); } catch { return 0; }
  }, [cashReceived, toBaseAmount]);
  const changeCdf = cashReceivedCdf - totalNet;
  const debt = selectedClient?.credit || 0;
  const creditLimit = selectedClient?.plafondCredit || 0;
  const creditAfterSale = debt + totalNet;
  const overCreditLimit = method === 'CREDIT' && creditAfterSale > creditLimit;
  const cashEnough = cashReceivedCdf + 0.001 >= totalNet;
  const cashPresets = useMemo(() => {
    const exact = fromBaseAmount(totalNet);
    const rounded = Math.ceil(exact / (displayCurrency === 'USD' ? 5 : 5000)) * (displayCurrency === 'USD' ? 5 : 5000);
    return Array.from(new Set([exact, rounded, rounded + (displayCurrency === 'USD' ? 5 : 5000)])).filter(value => value > 0);
  }, [displayCurrency, fromBaseAmount, totalNet]);

  const submit = async () => {
    setLocalError(null);
    if (method === 'ESPECE' && !cashEnough) { setLocalError('Le montant reçu est inférieur au total.'); return; }
    if (method === 'CREDIT' && !selectedClient) { setLocalError('Sélectionnez un client avant de valider un crédit.'); return; }
    if (method === 'CREDIT' && overCreditLimit) { setLocalError('Le plafond de crédit de ce client serait dépassé.'); return; }
    if (method !== 'ESPECE' && method !== 'CREDIT' && !verified) { setLocalError('Confirmez que le paiement est effectivement reçu dans l’application du prestataire.'); return; }
    setSubmitting(true);
    try {
      await onConfirmPayment(method, method === 'ESPECE' ? cashReceivedCdf : totalNet, reference.trim(), clientPhone.trim());
    } finally {
      setSubmitting(false);
    }
  };

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm sm:p-5">
    <div className="flex max-h-[94dvh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl">
      <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950 px-4 py-4 sm:px-5">
        <div><h2 className="flex items-center gap-2 text-lg font-bold text-white"><Wallet size={20} className="text-orange-400" />Encaissement</h2><p className="mt-1 text-xs text-slate-400">Choisissez le mode de paiement réel.</p></div>
        <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white" aria-label="Fermer"><X size={19} /></button>
      </div>
      <div className="flex items-center justify-between border-b border-slate-800 bg-slate-900/80 px-4 py-3 sm:px-5"><span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Total à régler</span><strong className="font-mono text-2xl text-orange-300 sm:text-3xl">{formatMoney(totalNet)}</strong></div>

      <div className="grid grid-cols-3 gap-1.5 border-b border-slate-800 bg-slate-950/60 p-2 sm:grid-cols-6">
        {METHODS.map(item => <button key={item.id} type="button" onClick={() => { setMethod(item.id); setVerified(false); setLocalError(null); }} className={`flex min-h-16 flex-col items-center justify-center gap-1 rounded-xl px-1.5 py-2 text-[10px] font-bold transition sm:text-[11px] ${method === item.id ? 'bg-orange-500 text-white shadow-lg shadow-orange-950/30' : 'bg-slate-900 text-slate-400 hover:bg-slate-800 hover:text-white'}`}>
          {item.id === 'ESPECE' ? <Banknote size={18} /> : item.id === 'CREDIT' ? <CreditCard size={18} /> : <Smartphone size={18} />}
          <span className="text-center leading-tight">{item.short}</span>
        </button>)}
      </div>

      <div className="flex-1 space-y-4 overflow-y-auto p-4 sm:p-5">
        {method === 'ESPECE' && <>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {cashPresets.map((amount, index) => <button key={`${amount}-${index}`} type="button" onClick={() => setCashReceived(String(amount))} className={`rounded-xl border px-3 py-2.5 font-mono text-sm font-bold ${Number(cashReceived) === amount ? 'border-emerald-500 bg-emerald-950/40 text-emerald-200' : 'border-slate-800 bg-slate-950 text-slate-300 hover:border-slate-600'}`}>{formatCurrencyShort(toBaseAmount(amount))}</button>)}
            <button type="button" onClick={() => setCashReceived(String(fromBaseAmount(totalNet)))} className="rounded-xl border border-slate-800 bg-slate-950 px-3 py-2.5 text-xs font-bold text-orange-300 hover:border-orange-500">Montant exact</button>
          </div>
          <label className="block"><span className="form-label">Montant reçu ({displayCurrency})</span><input autoFocus type="number" min="0" step="any" value={cashReceived} onChange={event => setCashReceived(event.target.value)} className="form-control font-mono text-lg font-bold" /></label>
          <div className={`rounded-xl border p-3 ${changeCdf >= -0.001 ? 'border-emerald-900 bg-emerald-950/30' : 'border-red-900 bg-red-950/30'}`}><div className="text-xs text-slate-400">{changeCdf >= -0.001 ? 'Monnaie à rendre' : 'Montant restant'}</div><div className={`mt-1 font-mono text-xl font-black ${changeCdf >= -0.001 ? 'text-emerald-300' : 'text-red-300'}`}>{formatMoney(Math.abs(changeCdf))}</div></div>
        </>}

        {method !== 'ESPECE' && method !== 'CREDIT' && <div className="space-y-4">
          <div className="rounded-xl border border-amber-800/60 bg-amber-950/25 p-3 text-xs leading-5 text-amber-100"><strong>Vérification manuelle requise.</strong> Effectuez ou vérifiez le transfert dans l’application / le menu USSD de l’opérateur. F.A.N.A enregistre la vente, mais n’envoie pas d’argent et ne confirme pas le paiement auprès du réseau.</div>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <label className="block"><span className="form-label">Téléphone du client (facultatif)</span><input inputMode="tel" value={clientPhone} onChange={event => setClientPhone(event.target.value)} placeholder="+243…" className="form-control" /></label>
            <label className="block"><span className="form-label">Référence de transaction</span><input value={reference} onChange={event => setReference(event.target.value)} placeholder="ID réel du paiement" className="form-control font-mono" /></label>
          </div>
          <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-slate-800 bg-slate-950 p-3 text-xs leading-5 text-slate-300"><input type="checkbox" checked={verified} onChange={event => setVerified(event.target.checked)} className="mt-0.5 accent-orange-500" /><span>J’ai vérifié que le montant a bien été reçu sur le compte du magasin.</span></label>
        </div>}

        {method === 'CREDIT' && <div className="space-y-4">
          <label className="block"><span className="form-label">Client titulaire du crédit *</span><select value={selectedClient?.id || ''} onChange={event => onSelectClient(event.target.value || null)} className="form-control"><option value="">Sélectionner un client existant</option>{clients.map(client => <option key={client.id} value={client.id}>{client.nom} · {client.telephone}</option>)}</select></label>
          {selectedClient ? <div className="grid grid-cols-1 gap-2 sm:grid-cols-3"><div className="rounded-xl border border-slate-800 bg-slate-950 p-3"><span className="text-[10px] uppercase text-slate-500">Dette actuelle</span><div className="mt-1 font-mono font-bold text-white">{formatMoney(debt)}</div></div><div className="rounded-xl border border-slate-800 bg-slate-950 p-3"><span className="text-[10px] uppercase text-slate-500">Après la vente</span><div className={`mt-1 font-mono font-bold ${overCreditLimit ? 'text-red-300' : 'text-amber-300'}`}>{formatMoney(creditAfterSale)}</div></div><div className="rounded-xl border border-slate-800 bg-slate-950 p-3"><span className="text-[10px] uppercase text-slate-500">Plafond</span><div className="mt-1 font-mono font-bold text-white">{formatMoney(creditLimit)}</div></div></div> : <p className="rounded-xl border border-amber-800/50 bg-amber-950/20 p-3 text-xs text-amber-200">Ajoutez ou sélectionnez le client dans le carnet pour attribuer ce crédit.</p>}
          {overCreditLimit && <p role="alert" className="rounded-xl border border-red-800 bg-red-950/40 p-3 text-xs text-red-200">Cette vente dépasse le plafond autorisé. Le crédit sera refusé.</p>}
        </div>}
        {localError && <p role="alert" className="rounded-lg border border-red-900 bg-red-950/40 px-3 py-2 text-xs text-red-200">{localError}</p>}
      </div>

      <div className="flex flex-col-reverse gap-2 border-t border-slate-800 bg-slate-950 p-4 sm:flex-row sm:justify-between">
        <button type="button" onClick={onClose} className="rounded-xl bg-slate-800 px-5 py-3 text-sm font-semibold text-slate-300 hover:bg-slate-700">Annuler</button>
        <button type="button" disabled={isSaving || submitting || (method === 'ESPECE' && !cashEnough) || (method === 'CREDIT' && (!selectedClient || overCreditLimit)) || (method !== 'ESPECE' && method !== 'CREDIT' && !verified)} onClick={() => void submit()} className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 py-3 text-sm font-extrabold text-white shadow-lg shadow-emerald-950/30 transition hover:bg-emerald-500 disabled:cursor-not-allowed disabled:opacity-45 sm:flex-none"><Check size={18} />{isSaving || submitting ? 'Enregistrement…' : `Enregistrer ${METHODS.find(item => item.id === method)?.label}`}</button>
      </div>
    </div>
  </div>;
};
