import React, { useMemo, useState } from 'react';
import { useApp } from '../../context/AppContext';
import { formatMoney, formatDateTime } from '../../utils/format';
import { 
  Calculator, 
  ArrowUpRight, 
  ArrowDownRight, 
  Lock, 
  Unlock, 
  Printer, 
  Clock,
  FileCheck2,
  X,
} from 'lucide-react';

export const CaisseView: React.FC = () => {
  const {
    caisseSession,
    mouvementsCaisse,
    cashMovements,
    cashSessions,
    addMouvementCaisse,
    openCaisse,
    closeCaisse,
    userName,
    displayCurrency,
    toBaseAmount,
    settings,
    isSaving,
  } = useApp();

  // Modals & form state
  const [isMouvementModalOpen, setIsMouvementModalOpen] = useState<boolean>(false);
  const [mvtType, setMvtType] = useState<'ENTREE' | 'SORTIE'>('SORTIE');
  const [mvtMotif, setMvtMotif] = useState<string>('');
  const [mvtMontant, setMvtMontant] = useState<string>('');

  const [isClotureModalOpen, setIsClotureModalOpen] = useState<boolean>(false);
  const [compteReelStr, setCompteReelStr] = useState<string>('');
  const [notesCloture, setNotesCloture] = useState<string>('');

  const [isOpeningModalOpen, setIsOpeningModalOpen] = useState<boolean>(false);
  const [fondOuvertureStr, setFondOuvertureStr] = useState<string>('');

  const [showTicketZModal, setShowTicketZModal] = useState<boolean>(false);
  const [movementHistoryScope, setMovementHistoryScope] = useState<'SESSION' | 'ALL'>('SESSION');
  const displayedCashMovements = useMemo(() => {
    const movements = movementHistoryScope === 'ALL' ? cashMovements : mouvementsCaisse;
    return [...movements].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
  }, [cashMovements, mouvementsCaisse, movementHistoryScope]);
  const cashSessionById = useMemo(() => new Map(cashSessions.map(session => [session.id, session])), [cashSessions]);

  const compteReelNum = compteReelStr.trim() === '' ? null : Number(compteReelStr);
  const compteReelCdf = (() => {
    if (compteReelNum === null || !Number.isFinite(compteReelNum)) return null;
    try { return toBaseAmount(compteReelNum); } catch { return null; }
  })();
  const ecartCaisse = compteReelCdf === null ? null : compteReelCdf - caisseSession.totalEspecesAttendu;

  const handleSaveMouvement = async (e: React.FormEvent) => {
    e.preventDefault();
    const enteredAmount = Number(mvtMontant);
    if (!Number.isFinite(enteredAmount) || enteredAmount <= 0 || !mvtMotif.trim()) return;
    let amountCdf: number;
    try { amountCdf = toBaseAmount(enteredAmount); } catch { return; }
    const saved = await addMouvementCaisse(mvtType, mvtMotif.trim(), amountCdf);
    if (!saved) return;
    setIsMouvementModalOpen(false);
    setMvtMotif('');
    setMvtMontant('');
  };

  const handleConfirmCloture = async (e: React.FormEvent) => {
    e.preventDefault();
    if (compteReelCdf === null || compteReelCdf < 0) return;
    const closed = await closeCaisse(compteReelCdf, notesCloture.trim());
    if (!closed) return;
    setIsClotureModalOpen(false);
    setShowTicketZModal(true);
  };

  const handleConfirmOpening = async (e: React.FormEvent) => {
    e.preventDefault();
    let openingAmount: number;
    try { openingAmount = toBaseAmount(Number(fondOuvertureStr) || 0); } catch { return; }
    const opened = await openCaisse(openingAmount);
    if (opened) setIsOpeningModalOpen(false);
  };

  return (
    <div className="flex-1 p-4 lg:p-6 overflow-y-auto space-y-6 bg-slate-900 text-slate-100">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <span>Gestion de Caisse &amp; Clôture Z</span>
            <span
              className={`text-xs px-2.5 py-0.5 rounded-md font-bold border ${
                caisseSession.statut === 'OUVERTE'
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/30'
                  : 'bg-red-500/20 text-red-400 border-red-500/30'
              }`}
            >
              Session {caisseSession.statut}
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Suivi des encaissements en espèces, des mouvements de caisse et du comptage de clôture.
          </p>
        </div>

        <div className="flex items-center gap-2">
          {caisseSession.statut === 'OUVERTE' ? (
            <>
              <button
                type="button"
                onClick={() => setIsMouvementModalOpen(true)}
                className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-1.5 border border-slate-700 transition-colors"
              >
                <ArrowUpRight className="w-4 h-4 text-orange-400" />
                <span>Entrée / Sortie Espèces</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setCompteReelStr('');
                  setNotesCloture('');
                  setIsClotureModalOpen(true);
                }}
                className="px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-red-600/20 transition-all"
              >
                <Lock className="w-4 h-4" />
                <span>Clôturer la Caisse (Ticket Z)</span>
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setShowTicketZModal(true)}
                className="px-3.5 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold text-xs flex items-center gap-1.5 border border-slate-700"
              >
                <Printer className="w-4 h-4 text-orange-400" />
                <span>Voir Dernier Ticket Z</span>
              </button>

              <button
                type="button"
                onClick={() => setIsOpeningModalOpen(true)}
                className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-emerald-600/20 transition-all"
              >
                <Unlock className="w-4 h-4" />
                <span>Ouvrir Nouvelle Caisse</span>
              </button>
            </>
          )}
        </div>
      </div>

      {/* Cash drawer totals: calculated from recorded transactions only */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
        {[
          { label: 'Espèces attendues', value: caisseSession.totalEspecesAttendu, color: 'text-emerald-400', note: 'Fond initial + mouvements enregistrés' },
          { label: 'M-Pesa enregistré', value: caisseSession.totalMpesa, color: 'text-red-300', note: 'Ventes enregistrées avec ce mode' },
          { label: 'Orange Money enregistré', value: caisseSession.totalOrangeMoney, color: 'text-orange-400', note: 'Ventes enregistrées avec ce mode' },
          { label: 'Airtel Money enregistré', value: caisseSession.totalAirtelMoney, color: 'text-red-400', note: 'Ventes enregistrées avec ce mode' },
          { label: 'Afrimoney enregistré', value: caisseSession.totalAfrimoney, color: 'text-violet-300', note: 'Ventes enregistrées avec ce mode' },
          { label: 'Crédit client', value: caisseSession.totalCreditAccorde, color: 'text-amber-400', note: 'Montants ajoutés aux comptes clients' },
        ].map(card => <div key={card.label} className="flex flex-col justify-between rounded-2xl border border-slate-750 bg-slate-850 p-4">
          <span className="block text-xs font-semibold uppercase tracking-wider text-slate-400">{card.label}</span>
          <div className={`mt-2 font-mono text-2xl font-black ${card.color}`}>{formatMoney(card.value)}</div>
          <span className="mt-1 text-[11px] text-slate-400">{card.note}</span>
        </div>)}
      </div>

      {/* Cash movement history from persisted records */}
      <div className="space-y-4 rounded-2xl border border-slate-750 bg-slate-850 p-5">
        <div className="flex flex-col gap-3 border-b border-slate-800 pb-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Calculator className="h-5 w-5 text-slate-400" />
            <div>
              <h3 className="text-base font-bold text-white">Historique des mouvements de caisse</h3>
              <p className="mt-0.5 text-[11px] text-slate-500">Entrées et sorties d’espèces enregistrées, classées par date.</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <div className="flex rounded-lg border border-slate-700 bg-slate-950 p-1" role="group" aria-label="Période de l’historique">
              <button type="button" onClick={() => setMovementHistoryScope('SESSION')} aria-pressed={movementHistoryScope === 'SESSION'} className={`rounded-md px-2.5 py-1.5 text-[11px] font-semibold ${movementHistoryScope === 'SESSION' ? 'bg-orange-500 text-white' : 'text-slate-400 hover:text-white'}`}>Session actuelle</button>
              <button type="button" onClick={() => setMovementHistoryScope('ALL')} aria-pressed={movementHistoryScope === 'ALL'} className={`rounded-md px-2.5 py-1.5 text-[11px] font-semibold ${movementHistoryScope === 'ALL' ? 'bg-orange-500 text-white' : 'text-slate-400 hover:text-white'}`}>Tout l’historique</button>
            </div>
            <span className="whitespace-nowrap font-mono text-xs text-slate-400">{displayedCashMovements.length} mouvement(s)</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-left text-xs">
            <thead className="border-b border-slate-750 bg-slate-950 text-[10px] font-semibold uppercase tracking-wider text-slate-400">
              <tr>
                <th className="px-3 py-2.5">Date / Heure</th>
                <th className="px-3 py-2.5">Session</th>
                <th className="px-3 py-2.5">Type</th>
                <th className="px-3 py-2.5">Motif du mouvement</th>
                <th className="px-3 py-2.5">Responsable</th>
                <th className="px-3 py-2.5 text-right">Montant</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {displayedCashMovements.length === 0 ? (
                <tr><td colSpan={6} className="py-8 text-center text-slate-500">Aucun mouvement d’espèces n’est enregistré pour cette période.</td></tr>
              ) : displayedCashMovements.map(movement => {
                const session = cashSessionById.get(movement.sessionId);
                return <tr key={movement.id} className="hover:bg-slate-800/40">
                  <td className="px-3 py-2.5 font-mono text-[11px] text-slate-400">{formatDateTime(movement.date)}</td>
                  <td className="px-3 py-2.5 text-[11px] text-slate-400">{session ? formatDateTime(session.dateOuverture) : 'Session inconnue'}</td>
                  <td className="px-3 py-2.5"><span className={`rounded border px-2 py-0.5 text-[10px] font-bold ${movement.type === 'ENTREE' ? 'border-emerald-800 bg-emerald-950/70 text-emerald-300' : 'border-red-800 bg-red-950/70 text-red-300'}`}>{movement.type === 'ENTREE' ? '+ Entrée espèces' : '− Sortie caisse'}</span></td>
                  <td className="px-3 py-2.5 font-semibold text-slate-200">{movement.motif}</td>
                  <td className="px-3 py-2.5 text-slate-400">{movement.responsable}</td>
                  <td className={`px-3 py-2.5 text-right font-mono font-bold ${movement.type === 'ENTREE' ? 'text-emerald-400' : 'text-red-400'}`}>{movement.type === 'ENTREE' ? '+' : '−'}{formatMoney(movement.montant)}</td>
                </tr>;
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: New Movement (Entrée/Sortie) */}
      {isMouvementModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-white text-base">Entrée / Sortie d'Espèces</h3>
              <button
                onClick={() => setIsMouvementModalOpen(false)}
                className="w-8 h-8 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveMouvement} className="p-4 space-y-4 text-xs">
              <div>
                <label className="text-slate-300 font-semibold block mb-1.5">Type de mouvement</label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => setMvtType('SORTIE')}
                    className={`py-2 rounded-lg font-bold border ${
                      mvtType === 'SORTIE'
                        ? 'bg-red-950/70 text-red-300 border-red-700'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}
                  >
                    - Sortie de caisse (Dépense)
                  </button>
                  <button
                    type="button"
                    onClick={() => setMvtType('ENTREE')}
                    className={`py-2 rounded-lg font-bold border ${
                      mvtType === 'ENTREE'
                        ? 'bg-emerald-950/70 text-emerald-300 border-emerald-700'
                        : 'bg-slate-800 text-slate-400 border-slate-700'
                    }`}
                  >
                    + Entrée d'argent (Apport)
                  </button>
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-semibold block">Motif du mouvement *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Paiement livreur pain, Achat sacs plastique, etc."
                  value={mvtMotif}
                  onChange={e => setMvtMotif(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-semibold block">Montant en {displayCurrency} *</label>
                <input
                  type="number"
                  min="0.01"
                  step="any"
                  required
                  value={mvtMontant}
                  onChange={e => setMvtMontant(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono text-base font-bold"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsMouvementModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-semibold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold disabled:opacity-50"
                >
                  Valider le mouvement
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Clôture Z (Comptage & Ecart) */}
      {isClotureModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2 text-red-400">
                <Lock className="w-5 h-5" />
                <h3 className="font-bold text-white text-base">Clôture de Caisse (Ticket Z)</h3>
              </div>
              <button
                onClick={() => setIsClotureModalOpen(false)}
                className="w-8 h-8 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmCloture} className="p-5 space-y-4 text-xs">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 flex justify-between items-center">
                <span className="text-slate-400 font-medium">Espèces Théoriques Attendues :</span>
                <span className="text-xl font-black text-emerald-400 font-mono">
                  {formatMoney(caisseSession.totalEspecesAttendu)}
                </span>
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-semibold block">
                  Comptage Physique Réel du Tiroir ({displayCurrency}) *
                </label>
                <input
                  type="number"
                  min="0"
                  step={displayCurrency === 'USD' ? '0.01' : '1'}
                  required
                  value={compteReelStr}
                  onChange={e => setCompteReelStr(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono text-xl font-black focus:outline-hidden focus:border-red-500"
                />
              </div>

              {/* Écart de caisse auto-calculation */}
              <div className={`flex items-center justify-between rounded-xl border p-3.5 ${
                ecartCaisse === null ? 'border-slate-800 bg-slate-950 text-slate-300'
                  : ecartCaisse === 0 ? 'border-emerald-800 bg-emerald-950/60 text-emerald-300'
                    : ecartCaisse > 0 ? 'border-sky-800 bg-sky-950/60 text-sky-300'
                      : 'border-red-800 bg-red-950/70 text-red-300'
              }`}>
                <div>
                  <span className="block font-bold">
                    {ecartCaisse === null ? 'Écart non calculé'
                      : ecartCaisse === 0 ? 'Aucun écart constaté'
                        : ecartCaisse > 0 ? 'Excédent de caisse (+)' : 'Déficit / manquant de caisse (−)'}
                  </span>
                  <span className="text-[10px]">
                    {ecartCaisse === null ? 'Saisissez le montant réellement compté.'
                      : ecartCaisse < 0 ? 'Écart à justifier' : 'Comptage enregistré'}
                  </span>
                </div>
                <div className="font-mono text-xl font-black">
                  {ecartCaisse === null ? '—' : ecartCaisse > 0 ? `+${formatMoney(ecartCaisse)}` : formatMoney(ecartCaisse)}
                </div>
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-semibold block">Notes de clôture / Justification</label>
                <textarea
                  rows={2}
                  placeholder="Observations sur la journée..."
                  value={notesCloture}
                  onChange={e => setNotesCloture(e.target.value)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsClotureModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-semibold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold flex items-center gap-1.5 shadow-lg shadow-red-600/20 disabled:opacity-50"
                >
                  <Lock className="w-4 h-4" />
                  <span>Confirmer la Clôture Z</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Open Cash Drawer */}
      {isOpeningModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
            <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <h3 className="font-bold text-white text-base">Ouverture de Caisse</h3>
              <button
                onClick={() => setIsOpeningModalOpen(false)}
                className="w-8 h-8 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleConfirmOpening} className="p-4 space-y-4 text-xs">
              <div className="space-y-1">
                <label className="text-slate-300 font-semibold block">
                  Fond de caisse initial ({displayCurrency}) *
                </label>
                <input
                  type="number"
                  min="0"
                  step={displayCurrency === 'USD' ? '0.01' : '1'}
                  required
                  value={fondOuvertureStr}
                  onChange={e => setFondOuvertureStr(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono text-xl font-black"
                />
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsOpeningModalOpen(false)}
                  className="px-4 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-semibold"
                >
                  Annuler
                </button>
                <button
                  type="submit"
                  disabled={isSaving}
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1.5 disabled:opacity-50"
                >
                  <Unlock className="w-4 h-4" />
                  <span>Ouvrir la session</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Ticket Z Preview & Thermal Print */}
      {showTicketZModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[95vh]">
            <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2 text-white font-bold">
                <FileCheck2 className="w-5 h-5 text-orange-400" />
                <span>Ticket Z - Clôture Journalière</span>
              </div>
              <button
                onClick={() => setShowTicketZModal(false)}
                className="w-8 h-8 rounded-lg text-slate-400 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 overflow-y-auto bg-slate-950/60 flex justify-center">
              <div
                id="thermal-receipt-area"
                className="w-[300px] bg-white text-black p-4 rounded-md shadow-lg font-mono text-xs leading-relaxed"
              >
                <div className="text-center border-b border-dashed border-gray-400 pb-2 mb-2">
                  <h2 className="text-sm font-black">*** RAPPORT DE CLÔTURE DE CAISSE ***</h2>
                  <p className="text-xs font-bold">{settings.organizationName}</p>
                  <p className="text-[9px]">Récapitulatif interne des données enregistrées</p>
                </div>

                <div className="space-y-1 text-[10px] border-b border-dashed border-gray-400 pb-2 mb-2">
                  <div className="flex justify-between">
                    <span>Ouverture :</span>
                    <span>{formatDateTime(caisseSession.dateOuverture)}</span>
                  </div>
                  {caisseSession.dateFermeture && (
                    <div className="flex justify-between">
                      <span>Fermeture :</span>
                      <span>{formatDateTime(caisseSession.dateFermeture)}</span>
                    </div>
                  )}
                  <div className="flex justify-between">
                    <span>Responsable :</span>
                    <span className="font-bold">{caisseSession.cloturePar || userName}</span>
                  </div>
                </div>

                <div className="space-y-1 text-[10px] border-b border-dashed border-gray-400 pb-2 mb-2">
                  <div className="flex justify-between gap-2">
                    <span>Fond de caisse :</span><span>{formatMoney(caisseSession.fondOuverture)}</span>
                  </div>
                  <div className="flex justify-between gap-2">
                    <span>Espèces nettes enregistrées :</span><span>{formatMoney(caisseSession.totalEspecesAttendu - caisseSession.fondOuverture)}</span>
                  </div>
                  <div className="flex justify-between gap-2"><span>Total M-Pesa :</span><span>{formatMoney(caisseSession.totalMpesa)}</span></div>
                  <div className="flex justify-between gap-2"><span>Total Orange Money :</span><span>{formatMoney(caisseSession.totalOrangeMoney)}</span></div>
                  <div className="flex justify-between gap-2"><span>Total Airtel Money :</span><span>{formatMoney(caisseSession.totalAirtelMoney)}</span></div>
                  <div className="flex justify-between gap-2"><span>Total Afrimoney :</span><span>{formatMoney(caisseSession.totalAfrimoney)}</span></div>
                  <div className="flex justify-between gap-2"><span>Total Crédit client :</span><span>{formatMoney(caisseSession.totalCreditAccorde)}</span></div>
                </div>

                <div className="space-y-1 text-[10px] border-b border-dashed border-gray-400 pb-2 mb-2 font-bold">
                  <div className="flex justify-between">
                    <span>Espèces Théoriques :</span>
                    <span>{formatMoney(caisseSession.totalEspecesAttendu)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Comptage Réel :</span>
                    <span>{formatMoney(caisseSession.montantReelCompte ?? caisseSession.totalEspecesAttendu)}</span>
                  </div>
                  <div className="flex justify-between text-xs pt-1 border-t border-gray-300">
                    <span>ÉCART DE CAISSE :</span>
                    <span>
                      {(caisseSession.ecartCaisse ?? 0) >= 0 ? '+' : ''}
                      {formatMoney(caisseSession.ecartCaisse ?? 0)}
                    </span>
                  </div>
                </div>

                <div className="text-center text-[9px] pt-2 space-y-4">
                  <div className="flex justify-between text-[9px] pt-4">
                    <span>Signature Vendeur :</span>
                    <span>Visa Gérant :</span>
                  </div>
                  <p className="font-bold">*** FIN DU RAPPORT Z ***</p>
                </div>
              </div>
            </div>

            <div className="p-4 bg-slate-950 border-t border-slate-800 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowTicketZModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 text-slate-300 font-semibold text-xs"
              >
                Fermer
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4" />
                <span>Imprimer Ticket Z (58mm/80mm)</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
