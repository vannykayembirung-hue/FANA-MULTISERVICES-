import React, { useState } from 'react';
import { PaymentMethod, Client } from '../../types';
import { formatFCFA, formatCurrencyShort } from '../../utils/format';
import { 
  Banknote, 
  Smartphone, 
  BookOpen, 
  X, 
  Check, 
  AlertTriangle, 
  ArrowRight,
  ShieldCheck,
  UserCheck
} from 'lucide-react';

interface PaymentModalProps {
  totalNet: number;
  selectedClient: Client | null;
  clients: Client[];
  onSelectClient: (clientId: string | null) => void;
  onConfirmPayment: (method: PaymentMethod, receivedAmount?: number) => void;
  onClose: () => void;
}

export const PaymentModal: React.FC<PaymentModalProps> = ({
  totalNet,
  selectedClient,
  clients,
  onSelectClient,
  onConfirmPayment,
  onClose,
}) => {
  const [activeTab, setActiveTab] = useState<PaymentMethod>('ESPECE');
  const [cashReceivedStr, setCashReceivedStr] = useState<string>(totalNet.toString());
  const [wavePhone, setWavePhone] = useState<string>(selectedClient?.telephone || '');
  const [omPhone, setOmPhone] = useState<string>(selectedClient?.telephone || '');

  const cashReceivedNum = parseFloat(cashReceivedStr) || 0;
  const changeToReturn = cashReceivedNum - totalNet;
  const isCashSufficient = cashReceivedNum >= totalNet;

  // Credit calculation
  const currentClientDebt = selectedClient?.credit || 0;
  const clientLimit = selectedClient?.plafondCredit || 30000;
  const newProjectedDebt = currentClientDebt + totalNet;
  const isCreditOverLimit = newProjectedDebt > clientLimit;

  // Preset cash buttons
  const cashPresets = [
    totalNet,
    500,
    1000,
    2000,
    5000,
    10000,
    15000,
    20000,
    50000,
  ].filter((val, idx, self) => val >= totalNet && self.indexOf(val) === idx);

  const handleCashNumKey = (char: string) => {
    if (char === 'C') {
      setCashReceivedStr('0');
      return;
    }
    setCashReceivedStr(prev => {
      if (prev === '0') return char;
      return prev + char;
    });
  };

  const handlePay = () => {
    if (activeTab === 'ESPECE') {
      if (!isCashSufficient) return;
      onConfirmPayment('ESPECE', cashReceivedNum);
    } else if (activeTab === 'WAVE') {
      onConfirmPayment('WAVE', totalNet);
    } else if (activeTab === 'ORANGE_MONEY') {
      onConfirmPayment('ORANGE_MONEY', totalNet);
    } else if (activeTab === 'CREDIT') {
      if (!selectedClient) return;
      onConfirmPayment('CREDIT', totalNet);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-2xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <span>Encaissement Ticket</span>
              <span className="text-xs font-semibold px-2 py-0.5 rounded bg-orange-500/20 text-orange-400 border border-orange-500/30">
                F.A.N.A POS
              </span>
            </h2>
            <p className="text-xs text-slate-400">Sélectionnez le mode de règlement</p>
          </div>
          <button
            onClick={onClose}
            className="w-9 h-9 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 flex items-center justify-center transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Total to pay banner */}
        <div className="p-4 bg-gradient-to-r from-slate-900 via-slate-850 to-slate-900 border-b border-slate-800 flex items-center justify-between">
          <span className="text-sm font-medium text-slate-400 uppercase tracking-wider">
            Total Net à Régler
          </span>
          <span className="text-3xl font-extrabold text-orange-400 font-mono tracking-tight">
            {formatFCFA(totalNet)}
          </span>
        </div>

        {/* Payment Method Selector Tabs */}
        <div className="grid grid-cols-4 p-2 bg-slate-950/70 border-b border-slate-800 gap-1.5">
          <button
            type="button"
            onClick={() => setActiveTab('ESPECE')}
            className={`py-3 px-2 rounded-xl flex flex-col items-center gap-1.5 font-bold text-xs transition-all ${
              activeTab === 'ESPECE'
                ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30 ring-2 ring-emerald-400/50'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Banknote className="w-5 h-5" />
            <span>ESPÈCES</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('WAVE')}
            className={`py-3 px-2 rounded-xl flex flex-col items-center gap-1.5 font-bold text-xs transition-all ${
              activeTab === 'WAVE'
                ? 'bg-sky-500 text-white shadow-lg shadow-sky-500/30 ring-2 ring-sky-300/50'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <div className="w-5 h-5 rounded-full bg-white text-sky-600 font-extrabold text-[10px] flex items-center justify-center">
              W
            </div>
            <span>WAVE</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('ORANGE_MONEY')}
            className={`py-3 px-2 rounded-xl flex flex-col items-center gap-1.5 font-bold text-xs transition-all ${
              activeTab === 'ORANGE_MONEY'
                ? 'bg-orange-600 text-white shadow-lg shadow-orange-600/30 ring-2 ring-orange-400/50'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <Smartphone className="w-5 h-5" />
            <span>ORANGE MONEY</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('CREDIT')}
            className={`py-3 px-2 rounded-xl flex flex-col items-center gap-1.5 font-bold text-xs transition-all ${
              activeTab === 'CREDIT'
                ? 'bg-amber-600 text-white shadow-lg shadow-amber-600/30 ring-2 ring-amber-400/50'
                : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white'
            }`}
          >
            <BookOpen className="w-5 h-5" />
            <span>ARDOISE (CRÉDIT)</span>
          </button>
        </div>

        {/* Tab Content Area */}
        <div className="p-4 overflow-y-auto flex-1 space-y-4">
          {/* TAB 1: ESPECES */}
          {activeTab === 'ESPECE' && (
            <div className="space-y-4">
              {/* Presets */}
              <div>
                <label className="text-xs font-semibold text-slate-400 uppercase tracking-wide mb-1.5 block">
                  Coupures / Billets reçus (FCFA)
                </label>
                <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                  {cashPresets.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setCashReceivedStr(preset.toString())}
                      className={`py-2 px-3 rounded-lg text-sm font-bold font-mono border transition-all ${
                        cashReceivedNum === preset
                          ? 'bg-emerald-500/20 border-emerald-500 text-emerald-300 ring-1 ring-emerald-500'
                          : 'bg-slate-800 border-slate-700 text-slate-200 hover:border-slate-500 hover:bg-slate-750'
                      }`}
                    >
                      {formatCurrencyShort(preset)}
                    </button>
                  ))}
                  <button
                    type="button"
                    onClick={() => setCashReceivedStr(totalNet.toString())}
                    className="py-2 px-3 rounded-lg text-xs font-bold bg-slate-800 hover:bg-slate-700 text-orange-400 border border-slate-700"
                  >
                    Montant Exact
                  </button>
                </div>
              </div>

              {/* Cash input & Change calculation */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
                <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl">
                  <span className="text-xs text-slate-400 font-medium block mb-1">Montant Reçu</span>
                  <div className="flex items-center justify-between">
                    <input
                      type="number"
                      value={cashReceivedStr}
                      onChange={e => setCashReceivedStr(e.target.value)}
                      className="bg-transparent text-2xl font-bold font-mono text-white focus:outline-hidden w-full"
                    />
                    <span className="text-xs text-slate-500 font-bold ml-2">FCFA</span>
                  </div>
                </div>

                <div
                  className={`p-3.5 rounded-xl border flex flex-col justify-between ${
                    changeToReturn >= 0
                      ? 'bg-emerald-950/40 border-emerald-800 text-emerald-300'
                      : 'bg-red-950/40 border-red-800 text-red-400'
                  }`}
                >
                  <span className="text-xs font-semibold uppercase tracking-wide">
                    {changeToReturn >= 0 ? 'Rendu Monnaie Auto' : 'Montant Insuffisant'}
                  </span>
                  <div className="text-2xl font-extrabold font-mono">
                    {changeToReturn >= 0
                      ? formatFCFA(changeToReturn)
                      : `Manque ${formatFCFA(Math.abs(changeToReturn))}`}
                  </div>
                </div>
              </div>

              {/* Mini tactile numeric keypad for fast cash typing */}
              <div className="grid grid-cols-4 gap-1.5 pt-1">
                {['1', '2', '3', '500', '4', '5', '6', '1000', '7', '8', '9', '2000', 'C', '0', '00', '5000'].map(
                  (btn, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => {
                        if (['500', '1000', '2000', '5000'].includes(btn)) {
                          setCashReceivedStr(btn);
                        } else {
                          handleCashNumKey(btn);
                        }
                      }}
                      className={`h-11 rounded-lg text-sm font-bold font-mono transition-transform active:scale-95 ${
                        btn === 'C'
                          ? 'bg-red-950/40 text-red-400 border border-red-800 hover:bg-red-900/60'
                          : ['500', '1000', '2000', '5000'].includes(btn)
                          ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-800/60 hover:bg-emerald-900/40'
                          : 'bg-slate-800 text-slate-200 border border-slate-700/80 hover:bg-slate-750'
                      }`}
                    >
                      {btn}
                    </button>
                  )
                )}
              </div>
            </div>
          )}

          {/* TAB 2: WAVE */}
          {activeTab === 'WAVE' && (
            <div className="p-4 bg-slate-950 rounded-xl border border-sky-900/40 space-y-4">
              <div className="flex items-center gap-4">
                <div className="w-24 h-24 bg-white rounded-xl p-2 flex flex-col items-center justify-center shrink-0 border border-sky-400/40">
                  {/* Stylized QR Code placeholder */}
                  <div className="w-full h-full bg-slate-900 rounded-sm p-1 grid grid-cols-4 gap-0.5">
                    {Array.from({ length: 16 }).map((_, i) => (
                      <div
                        key={i}
                        className={`rounded-xs ${
                          i % 2 === 0 || i === 3 || i === 12 ? 'bg-sky-400' : 'bg-slate-950'
                        }`}
                      />
                    ))}
                  </div>
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-1.5 text-sky-400 font-bold text-sm">
                    <ShieldCheck className="w-4 h-4" />
                    <span>Compte Marchand Wave : F.A.N.A</span>
                  </div>
                  <p className="text-xs text-slate-300">
                    Faites scanner ce QR Code au client ou effectuez un paiement vers le numéro :
                  </p>
                  <p className="text-base font-extrabold text-white font-mono bg-slate-800/80 px-2 py-1 rounded inline-block">
                    +221 77 450 12 34
                  </p>
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400 font-medium block mb-1">
                  Numéro de téléphone du client (Optionnel pour SMS de confirmation)
                </label>
                <input
                  type="text"
                  placeholder="+221 7X XXX XX XX"
                  value={wavePhone}
                  onChange={e => setWavePhone(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono text-sm focus:outline-hidden focus:border-sky-500"
                />
              </div>

              <div className="p-3 bg-sky-950/30 border border-sky-800/50 rounded-lg text-xs text-sky-300 flex items-center gap-2">
                <Check className="w-4 h-4 shrink-0 text-sky-400" />
                <span>Paiement 100% instantané, 0% de frais de transaction pour le client.</span>
              </div>
            </div>
          )}

          {/* TAB 3: ORANGE MONEY */}
          {activeTab === 'ORANGE_MONEY' && (
            <div className="p-4 bg-slate-950 rounded-xl border border-orange-900/40 space-y-4">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-xl bg-orange-600 flex items-center justify-center text-white font-black text-lg">
                  OM
                </div>
                <div>
                  <h4 className="font-bold text-white text-sm">Paiement Orange Money SN</h4>
                  <p className="text-xs text-slate-400">Code marchand FANA : #144#391#</p>
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-400 font-medium block mb-1">
                  Téléphone du client Orange
                </label>
                <input
                  type="text"
                  placeholder="+221 77 / 78 XXX XX XX"
                  value={omPhone}
                  onChange={e => setOmPhone(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono text-sm focus:outline-hidden focus:border-orange-500"
                />
              </div>

              <div className="p-3 bg-orange-950/30 border border-orange-800/50 rounded-lg text-xs text-orange-300">
                Demandez au client de valider le prompt USSD sur son téléphone avec son code secret.
              </div>
            </div>
          )}

          {/* TAB 4: CREDIT ARDOISE */}
          {activeTab === 'CREDIT' && (
            <div className="p-4 bg-slate-950 rounded-xl border border-amber-900/40 space-y-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <UserCheck className="w-5 h-5 text-amber-400" />
                  <h4 className="font-bold text-white text-sm">Carnet de Crédit Client</h4>
                </div>
                <span className="text-xs text-slate-400">Paiement différé</span>
              </div>

              <div>
                <label className="text-xs text-slate-400 font-medium block mb-1">
                  Sélectionnez le client titulaire de l'ardoise *
                </label>
                <select
                  value={selectedClient?.id || ''}
                  onChange={e => onSelectClient(e.target.value || null)}
                  className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm focus:outline-hidden focus:border-amber-500"
                >
                  <option value="">-- Choisir un client dans le carnet --</option>
                  {clients.map(c => (
                    <option key={c.id} value={c.id}>
                      {c.nom} ({c.telephone}) - Dette actuelle : {formatCurrencyShort(c.credit)}
                    </option>
                  ))}
                </select>
              </div>

              {selectedClient ? (
                <div className="space-y-3 pt-2">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800">
                      <span className="text-slate-400 block mb-0.5">Dette actuelle</span>
                      <span className="font-bold text-slate-200 text-sm font-mono">
                        {formatFCFA(currentClientDebt)}
                      </span>
                    </div>
                    <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800">
                      <span className="text-slate-400 block mb-0.5">Plafond autorisé</span>
                      <span className="font-bold text-slate-200 text-sm font-mono">
                        {formatFCFA(clientLimit)}
                      </span>
                    </div>
                  </div>

                  <div
                    className={`p-3 rounded-lg border flex items-center justify-between text-xs ${
                      isCreditOverLimit
                        ? 'bg-red-950/50 border-red-800 text-red-300'
                        : 'bg-amber-950/40 border-amber-800 text-amber-300'
                    }`}
                  >
                    <div>
                      <span className="font-bold block">Nouveau Solde Total Dette :</span>
                      <span>
                        {formatFCFA(currentClientDebt)} + {formatFCFA(totalNet)}
                      </span>
                    </div>
                    <div className="text-base font-extrabold font-mono">
                      {formatFCFA(newProjectedDebt)}
                    </div>
                  </div>

                  {isCreditOverLimit && (
                    <div className="flex items-start gap-2 p-3 bg-red-950/60 border border-red-700 rounded-lg text-xs text-red-200">
                      <AlertTriangle className="w-4 h-4 text-red-400 shrink-0 mt-0.5" />
                      <span>
                        Attention : Ce montant dépasse le plafond autorisé ({formatFCFA(clientLimit)}).
                        Autorisation gérant requise pour valider.
                      </span>
                    </div>
                  )}
                </div>
              ) : (
                <div className="p-3 bg-amber-950/20 border border-amber-800/40 rounded-lg text-xs text-amber-400 flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 shrink-0" />
                  <span>Veuillez sélectionner un client pour enregistrer la vente à crédit.</span>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Action Footer */}
        <div className="p-4 bg-slate-950 border-t border-slate-800 flex items-center justify-between gap-3">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-sm transition-colors"
          >
            Annuler
          </button>

          <button
            type="button"
            onClick={handlePay}
            disabled={
              (activeTab === 'ESPECE' && !isCashSufficient) ||
              (activeTab === 'CREDIT' && !selectedClient)
            }
            className={`flex-1 py-3.5 px-6 rounded-xl font-extrabold text-base flex items-center justify-center gap-2 shadow-lg transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
              activeTab === 'ESPECE'
                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/30'
                : activeTab === 'WAVE'
                ? 'bg-sky-500 hover:bg-sky-400 text-white shadow-sky-500/30'
                : activeTab === 'ORANGE_MONEY'
                ? 'bg-orange-600 hover:bg-orange-500 text-white shadow-orange-600/30'
                : 'bg-amber-600 hover:bg-amber-500 text-white shadow-amber-600/30'
            }`}
          >
            <span>
              {activeTab === 'CREDIT'
                ? `Valider sur l'ardoise (${formatCurrencyShort(totalNet)})`
                : `Valider Paiement (${formatCurrencyShort(totalNet)})`}
            </span>
            <ArrowRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
