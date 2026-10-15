import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { formatFCFA, formatDateTime, formatCurrencyShort } from '../../utils/format';
import { 
  Calculator, 
  ArrowUpRight, 
  ArrowDownRight, 
  Lock, 
  Unlock, 
  Printer, 
  AlertCircle, 
  CheckCircle2, 
  Clock, 
  FileCheck2, 
  X,
  Banknote,
  DollarSign
} from 'lucide-react';

export const CaisseView: React.FC = () => {
  const {
    caisseSession,
    mouvementsCaisse,
    addMouvementCaisse,
    openCaisse,
    closeCaisse,
    userName,
  } = useApp();

  // Modals & form state
  const [isMouvementModalOpen, setIsMouvementModalOpen] = useState<boolean>(false);
  const [mvtType, setMvtType] = useState<'ENTREE' | 'SORTIE'>('SORTIE');
  const [mvtMotif, setMvtMotif] = useState<string>('');
  const [mvtMontant, setMvtMontant] = useState<number>(5000);

  const [isClotureModalOpen, setIsClotureModalOpen] = useState<boolean>(false);
  const [compteReelStr, setCompteReelStr] = useState<string>(
    caisseSession.totalEspecesAttendu.toString()
  );
  const [notesCloture, setNotesCloture] = useState<string>('');

  const [isOpeningModalOpen, setIsOpeningModalOpen] = useState<boolean>(false);
  const [fondOuvertureStr, setFondOuvertureStr] = useState<string>('50000');

  const [showTicketZModal, setShowTicketZModal] = useState<boolean>(false);

  const compteReelNum = parseFloat(compteReelStr) || 0;
  const ecartCaisse = compteReelNum - caisseSession.totalEspecesAttendu;

  const handleSaveMouvement = (e: React.FormEvent) => {
    e.preventDefault();
    if (mvtMontant <= 0 || !mvtMotif) return;
    addMouvementCaisse(mvtType, mvtMotif, mvtMontant);
    setIsMouvementModalOpen(false);
    setMvtMotif('');
  };

  const handleConfirmCloture = (e: React.FormEvent) => {
    e.preventDefault();
    closeCaisse(compteReelNum, notesCloture);
    setIsClotureModalOpen(false);
    setShowTicketZModal(true);
  };

  const handleConfirmOpening = (e: React.FormEvent) => {
    e.preventDefault();
    const val = parseFloat(fondOuvertureStr) || 0;
    openCaisse(val);
    setIsOpeningModalOpen(false);
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
            Contrôle des flux d'espèces, décaissements, calcul automatique de l'écart et ticket Z officiel.
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
                  setCompteReelStr(caisseSession.totalEspecesAttendu.toString());
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

      {/* Cash Drawer Status Card & Key Numbers */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Cash Expected */}
        <div className="p-4 rounded-2xl bg-slate-850 border border-slate-750 flex flex-col justify-between">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
            Espèces Théoriques Attendues
          </span>
          <div className="text-2xl font-black text-emerald-400 font-mono mt-2">
            {formatFCFA(caisseSession.totalEspecesAttendu)}
          </div>
          <span className="text-[11px] text-slate-400 mt-1">
            Fond ({formatCurrencyShort(caisseSession.fondOuverture)}) + Ventes + Entrées - Sorties
          </span>
        </div>

        {/* Total Wave */}
        <div className="p-4 rounded-2xl bg-slate-850 border border-slate-750 flex flex-col justify-between">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
            Paiements Wave
          </span>
          <div className="text-2xl font-black text-sky-400 font-mono mt-2">
            {formatFCFA(caisseSession.totalWave)}
          </div>
          <span className="text-[11px] text-slate-400 mt-1">Sur compte marchand FANA</span>
        </div>

        {/* Total Orange Money */}
        <div className="p-4 rounded-2xl bg-slate-850 border border-slate-750 flex flex-col justify-between">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
            Paiements Orange Money
          </span>
          <div className="text-2xl font-black text-orange-400 font-mono mt-2">
            {formatFCFA(caisseSession.totalOrangeMoney)}
          </div>
          <span className="text-[11px] text-slate-400 mt-1">Code marchand OM #144#</span>
        </div>

        {/* Total Crédit accordé */}
        <div className="p-4 rounded-2xl bg-slate-850 border border-slate-750 flex flex-col justify-between">
          <span className="text-xs font-semibold text-slate-400 uppercase tracking-wider block">
            Ventes à Crédit (Ardoises)
          </span>
          <div className="text-2xl font-black text-amber-400 font-mono mt-2">
            {formatFCFA(caisseSession.totalCreditAccorde)}
          </div>
          <span className="text-[11px] text-slate-400 mt-1">Ajoutées aux comptes clients</span>
        </div>
      </div>

      {/* Movements Table (Entrées & Sorties de caisse) */}
      <div className="p-5 bg-slate-850 border border-slate-750 rounded-2xl space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div className="flex items-center gap-2">
            <Calculator className="w-5 h-5 text-slate-400" />
            <h3 className="font-bold text-white text-base">Mouvements Exceptionnels de Caisse</h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">
            {mouvementsCaisse.length} mouvement(s)
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-750">
              <tr>
                <th className="py-2.5 px-3">Date / Heure</th>
                <th className="py-2.5 px-3">Type</th>
                <th className="py-2.5 px-3">Motif du Mouvement</th>
                <th className="py-2.5 px-3">Responsable</th>
                <th className="py-2.5 px-3 text-right">Montant</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {mouvementsCaisse.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-500">
                    Aucune entrée ou sortie d'espèces exceptionnelle sur cette session.
                  </td>
                </tr>
              ) : (
                mouvementsCaisse.map(mvt => (
                  <tr key={mvt.id} className="hover:bg-slate-800/40">
                    <td className="py-2.5 px-3 text-slate-400 font-mono text-[11px]">
                      {formatDateTime(mvt.date)}
                    </td>
                    <td className="py-2.5 px-3">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded font-bold ${
                          mvt.type === 'ENTREE'
                            ? 'bg-emerald-950/70 text-emerald-300 border border-emerald-800'
                            : 'bg-red-950/70 text-red-300 border border-red-800'
                        }`}
                      >
                        {mvt.type === 'ENTREE' ? '+ Entrée Espèces' : '- Sortie Caisse'}
                      </span>
                    </td>
                    <td className="py-2.5 px-3 font-semibold text-slate-200">{mvt.motif}</td>
                    <td className="py-2.5 px-3 text-slate-400">{mvt.responsable}</td>
                    <td
                      className={`py-2.5 px-3 text-right font-mono font-bold ${
                        mvt.type === 'ENTREE' ? 'text-emerald-400' : 'text-red-400'
                      }`}
                    >
                      {mvt.type === 'ENTREE' ? '+' : '-'}
                      {formatFCFA(mvt.montant)}
                    </td>
                  </tr>
                ))
              )}
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
                <label className="text-slate-300 font-semibold block">Montant en FCFA *</label>
                <input
                  type="number"
                  min="100"
                  required
                  value={mvtMontant}
                  onChange={e => setMvtMontant(parseFloat(e.target.value) || 0)}
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
                  className="px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold"
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
                  {formatFCFA(caisseSession.totalEspecesAttendu)}
                </span>
              </div>

              <div className="space-y-1">
                <label className="text-slate-300 font-semibold block">
                  Comptage Physique Réel du Tiroir (Billets &amp; Pièces) *
                </label>
                <input
                  type="number"
                  min="0"
                  required
                  value={compteReelStr}
                  onChange={e => setCompteReelStr(e.target.value)}
                  className="w-full px-3 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-white font-mono text-xl font-black focus:outline-hidden focus:border-red-500"
                />
              </div>

              {/* Écart de caisse auto-calculation */}
              <div
                className={`p-3.5 rounded-xl border flex items-center justify-between ${
                  ecartCaisse === 0
                    ? 'bg-emerald-950/60 border-emerald-800 text-emerald-300'
                    : ecartCaisse > 0
                    ? 'bg-sky-950/60 border-sky-800 text-sky-300'
                    : 'bg-red-950/70 border-red-800 text-red-300'
                }`}
              >
                <div>
                  <span className="font-bold block">
                    {ecartCaisse === 0
                      ? 'Caisse Parfaite (Aucun Écart)'
                      : ecartCaisse > 0
                      ? 'Excédent de Caisse (+)'
                      : 'Déficit / Manquant de Caisse (-)'}
                  </span>
                  <span className="text-[10px]">
                    {ecartCaisse < 0 ? 'À justifier obligatoirement' : 'Conforme'}
                  </span>
                </div>
                <div className="text-xl font-black font-mono">
                  {ecartCaisse > 0 ? `+${formatFCFA(ecartCaisse)}` : formatFCFA(ecartCaisse)}
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
                  className="px-5 py-2.5 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold flex items-center gap-1.5 shadow-lg shadow-red-600/20"
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
                  Fond de caisse initial (FCFA) *
                </label>
                <input
                  type="number"
                  min="0"
                  step="5000"
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
                  className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold flex items-center gap-1.5"
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
                  <h2 className="text-sm font-black">*** TICKET Z DU JOUR ***</h2>
                  <p className="text-xs font-bold">F.A.N.A MULTISERVICES</p>
                  <p className="text-[10px]">Cité Fadia, Dakar</p>
                  <p className="text-[9px]">CLÔTURE OFFICIELLE DE CAISSE</p>
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
                  <div className="flex justify-between">
                    <span>Fond de caisse :</span>
                    <span>{caisseSession.fondOuverture} F</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Ventes Espèces :</span>
                    <span>{caisseSession.totalEspecesAttendu - caisseSession.fondOuverture} F</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Wave :</span>
                    <span>{caisseSession.totalWave} F</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Orange Money :</span>
                    <span>{caisseSession.totalOrangeMoney} F</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Total Crédit (Ardoises) :</span>
                    <span>{caisseSession.totalCreditAccorde} F</span>
                  </div>
                </div>

                <div className="space-y-1 text-[10px] border-b border-dashed border-gray-400 pb-2 mb-2 font-bold">
                  <div className="flex justify-between">
                    <span>Espèces Théoriques :</span>
                    <span>{caisseSession.totalEspecesAttendu} F</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Comptage Réel :</span>
                    <span>{caisseSession.montantReelCompte ?? caisseSession.totalEspecesAttendu} F</span>
                  </div>
                  <div className="flex justify-between text-xs pt-1 border-t border-gray-300">
                    <span>ÉCART DE CAISSE :</span>
                    <span>
                      {(caisseSession.ecartCaisse ?? 0) >= 0 ? '+' : ''}
                      {caisseSession.ecartCaisse ?? 0} F
                    </span>
                  </div>
                </div>

                <div className="text-center text-[9px] pt-2 space-y-4">
                  <div className="flex justify-between text-[9px] pt-4">
                    <span>Signature Caissier :</span>
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
