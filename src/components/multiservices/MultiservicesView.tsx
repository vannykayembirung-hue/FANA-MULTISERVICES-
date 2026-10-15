import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { formatMoney, formatDateTime } from '../../utils/format';
import { FlotteSolde, ServiceCatalogType, ServiceTransaction } from '../../types';
import { MultiserviceReceiptModal } from './MultiserviceReceiptModal';
import { Smartphone, Send, ArrowDownLeft, Printer, Check, Clock, Wallet, Coins, X, Plus, Pencil, Trash2 } from 'lucide-react';

type ServiceOption = { nom: string; type: 'DEPOT' | 'PRESTATION' | 'RECHARGE'; customId?: string };

const BUILT_IN_SERVICES: ServiceOption[] = [
  { nom: 'M-Pesa', type: 'DEPOT' },
  { nom: 'Orange Money', type: 'DEPOT' },
  { nom: 'Airtel Money', type: 'DEPOT' },
  { nom: 'Afrimoney', type: 'DEPOT' },
  { nom: 'Recharge crédit mobile (saisie manuelle)', type: 'RECHARGE' },
  { nom: 'Photocopie N&B', type: 'PRESTATION' },
  { nom: 'Impression couleur', type: 'PRESTATION' },
];

export const MultiservicesView: React.FC = () => {
  const {
    services, serviceCatalog, addServiceTransaction, addServiceCatalogItem, updateServiceCatalogItem, deleteServiceCatalogItem,
    currentRole, flotteSolde, updateFlotteSolde, caisseSession, toBaseAmount, displayCurrency, isSaving,
  } = useApp();
  const providers: Array<{ id: keyof FlotteSolde; label: string }> = [
    { id: 'mpesa', label: 'M-Pesa' },
    { id: 'orangeMoney', label: 'Orange Money' },
    { id: 'airtelMoney', label: 'Airtel Money' },
    { id: 'afrimoney', label: 'Afrimoney' },
  ];
  const serviceOptions: ServiceOption[] = [
    ...BUILT_IN_SERVICES,
    ...serviceCatalog.map(item => ({ nom: item.nom, type: item.type, customId: item.id })),
  ];
  const [selectedService, setSelectedService] = useState<string>('M-Pesa');
  const [txType, setTxType] = useState<'DEPOT' | 'RETRAIT' | 'PRESTATION' | 'RECHARGE'>('DEPOT');
  const [montantStr, setMontantStr] = useState<string>('');
  const [telephoneClient, setTelephoneClient] = useState<string>('');
  const [reference, setReference] = useState<string>('');
  const [customCommission, setCustomCommission] = useState<string>('');
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [receiptTx, setReceiptTx] = useState<ServiceTransaction | null>(null);
  const [isFlotteModalOpen, setIsFlotteModalOpen] = useState<boolean>(false);
  const [flotteTarget, setFlotteTarget] = useState<keyof FlotteSolde>('mpesa');
  const [flotteAction, setFlotteAction] = useState<'AJOUT' | 'RETRAIT'>('AJOUT');
  const [flotteAmountStr, setFlotteAmountStr] = useState<string>('');
  const [flotteError, setFlotteError] = useState<string | null>(null);
  const [isServiceManagerOpen, setIsServiceManagerOpen] = useState(false);
  const [serviceNameInput, setServiceNameInput] = useState('');
  const [serviceTypeInput, setServiceTypeInput] = useState<ServiceCatalogType>('PRESTATION');
  const [editingServiceId, setEditingServiceId] = useState<string | null>(null);

  const montantNum = Number(montantStr) || 0;
  const commissionNum = Number(customCommission) || 0;
  const isMobileMoney = providers.some(provider => provider.label === selectedService);
  const handleServiceCatalogSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    const nom = serviceNameInput.trim();
    if (nom.length < 2 || nom.length > 100) return;
    const saved = editingServiceId
      ? await updateServiceCatalogItem(editingServiceId, nom, serviceTypeInput)
      : await addServiceCatalogItem(nom, serviceTypeInput);
    if (!saved) return;
    setSelectedService(nom);
    setTxType(serviceTypeInput);
    setServiceNameInput('');
    setServiceTypeInput('PRESTATION');
    setEditingServiceId(null);
  };

  const handleEditService = (item: { id: string; nom: string; type: ServiceCatalogType }) => {
    setEditingServiceId(item.id);
    setServiceNameInput(item.nom);
    setServiceTypeInput(item.type);
  };

  const handleDeleteService = async (item: { id: string; nom: string }) => {
    if (!window.confirm(`Supprimer « ${item.nom} » de la liste des services ? Les opérations déjà enregistrées resteront dans l’historique.`)) return;
    const deleted = await deleteServiceCatalogItem(item.id);
    if (!deleted) return;
    if (selectedService === item.nom) {
      setSelectedService('M-Pesa');
      setTxType('DEPOT');
    }
    if (editingServiceId === item.id) {
      setEditingServiceId(null);
      setServiceNameInput('');
      setServiceTypeInput('PRESTATION');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (montantNum <= 0 || commissionNum < 0) return;
    let montantCdf: number;
    let commissionCdf: number;
    try {
      montantCdf = toBaseAmount(montantNum);
      commissionCdf = toBaseAmount(commissionNum);
    } catch { return; }
    const created = await addServiceTransaction({
      nom: selectedService,
      type: txType,
      montant: montantCdf,
      commission: commissionCdf,
      reference: reference.trim(),
      telephoneClient: telephoneClient.trim() || undefined,
    });
    if (!created) return;
    setReceiptTx(created);
    setSuccessToast(`Opération enregistrée : ${selectedService}, ${formatMoney(created.montant)}.`);
    setTimeout(() => setSuccessToast(null), 3000);
    setMontantStr('');
    setTelephoneClient('');
    setReference('');
    setCustomCommission('');
  };

  const localDateKey = (value: string) => {
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? '' : `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  };
  const todayStr = localDateKey(new Date().toISOString());
  const todayServices = services.filter(service => localDateKey(service.date) === todayStr);
  const totalVolumeToday = todayServices.reduce((acc, service) => acc + service.montant, 0);
  const totalCommissionsToday = todayServices.reduce((acc, service) => acc + service.commission, 0);

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
          <p className="mt-0.5 max-w-3xl text-xs leading-5 text-slate-400">
            Saisie et suivi manuels des opérations mobile money et prestations. L’application n’exécute aucun transfert et ne calcule pas de commission réglementaire : saisissez le montant réellement constaté.
          </p>
        </div>

        {/* Quick KPI stats */}
        <div className="flex items-center gap-3">
          <div className="px-3 py-2 bg-slate-850 rounded-xl border border-slate-750 text-right">
            <span className="text-[10px] text-slate-400 uppercase font-semibold block">Volume Traité Jour</span>
            <span className="text-sm font-black text-white font-mono">{formatMoney(totalVolumeToday)}</span>
          </div>
          <div className="px-3 py-2 bg-slate-850 rounded-xl border border-slate-750 text-right">
            <span className="text-[10px] text-sky-400 uppercase font-bold block">Vos Commissions</span>
            <span className="text-sm font-black text-emerald-400 font-mono">+{formatMoney(totalCommissionsToday)}</span>
          </div>
        </div>
      </div>

      {successToast && (
        <div className="p-3 bg-emerald-950/80 border border-emerald-800 text-emerald-300 rounded-xl text-xs font-semibold flex items-center gap-2 animate-in fade-in">
          <Check className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{successToast}</span>
        </div>
      )}

      {/* Operator float balances are empty until entered by the organization */}
      <div className="space-y-3 rounded-2xl border border-slate-750 bg-slate-850 p-4">
        <div className="flex flex-col gap-2 border-b border-slate-800 pb-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2"><Wallet className="h-5 w-5 text-sky-400" /><h3 className="text-sm font-bold text-white">Soldes de portefeuille saisis par l’entreprise</h3></div>
          <button type="button" onClick={() => { setFlotteError(null); setIsFlotteModalOpen(true); }} className="flex items-center gap-1.5 self-start rounded-xl border border-sky-500/30 bg-sky-500/10 px-3 py-1.5 text-xs font-bold text-sky-400 hover:bg-sky-500/20 sm:self-auto"><Coins className="h-3.5 w-3.5" />Ajuster un solde réel</button>
        </div>
        <p className="text-[11px] leading-5 text-slate-500">Ces soldes sont tenus manuellement. Vérifiez-les auprès des comptes opérateurs; F.A.N.A ne se connecte pas aux réseaux mobile money.</p>
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {providers.map((provider, index) => <div key={provider.id} className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900 p-3.5">
            <div><span className="block text-[11px] font-medium text-slate-400">{provider.label}</span><span className="font-mono text-lg font-black text-white">{formatMoney(flotteSolde[provider.id])}</span></div>
            <span className={`flex h-9 w-9 items-center justify-center rounded-xl text-xs font-black ${index === 0 ? 'bg-red-500/15 text-red-300' : index === 1 ? 'bg-orange-500/15 text-orange-300' : index === 2 ? 'bg-rose-500/15 text-rose-300' : 'bg-violet-500/15 text-violet-300'}`}>{provider.label.slice(0, 2).toUpperCase()}</span>
          </div>)}
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
                {serviceOptions.map(service => (
                  <button
                    key={service.customId || service.nom}
                    type="button"
                    onClick={() => { setSelectedService(service.nom); setTxType(service.type); }}
                    className={`rounded-xl border p-2.5 text-left text-xs font-bold transition-all ${selectedService === service.nom ? 'bg-sky-500/20 border-sky-500 text-sky-300 ring-1 ring-sky-500' : 'bg-slate-800 border-slate-700 text-slate-300 hover:bg-slate-750'}`}
                  >
                    <span className="block">{service.nom}</span>
                    {service.customId && <span className="mt-1 block text-[9px] font-semibold uppercase tracking-wide text-violet-300">Personnalisé</span>}
                  </button>
                ))}
                {currentRole !== 'CAISSIER' && (
                  <button type="button" onClick={() => { setEditingServiceId(null); setServiceNameInput(''); setServiceTypeInput('PRESTATION'); setIsServiceManagerOpen(true); }} className="col-span-2 flex items-center justify-center gap-2 rounded-xl border border-dashed border-sky-500/40 bg-sky-500/5 p-2.5 text-xs font-bold text-sky-300 hover:bg-sky-500/10">
                    <Plus className="h-4 w-4" /> Ajouter ou gérer les services
                  </button>
                )}
              </div>
            </div>

            {/* Transaction Type (Dépôt vs Retrait) */}
            {isMobileMoney && (
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

            <div className="space-y-1">
              <label className="form-label">Montant réel de l’opération ({displayCurrency}) *</label>
              <input type="number" min="0.01" step={displayCurrency === 'USD' ? '0.01' : '1'} required value={montantStr} onChange={event => setMontantStr(event.target.value)} className="form-control font-mono text-base font-bold" />
            </div>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <label className="block"><span className="form-label">Téléphone (facultatif)</span><input inputMode="tel" placeholder="+243…" value={telephoneClient} onChange={event => setTelephoneClient(event.target.value)} className="form-control font-mono" /></label>
              <label className="block"><span className="form-label">Référence réelle (facultatif)</span><input maxLength={100} value={reference} onChange={event => setReference(event.target.value)} placeholder="Référence fournie par l’opérateur" className="form-control font-mono" /></label>
            </div>

            <label className="block"><span className="form-label">Commission réellement perçue ({displayCurrency}) *</span><input type="number" min="0" step={displayCurrency === 'USD' ? '0.01' : '1'} required value={customCommission} onChange={event => setCustomCommission(event.target.value)} placeholder="Entrez 0 si aucune commission n’a été perçue" className="form-control font-mono" /></label>
            <div className="rounded-xl border border-amber-800/60 bg-amber-950/25 p-3 text-[10px] leading-5 text-amber-100">Aucun transfert n’est envoyé par l’application. Confirmez l’opération auprès de l’opérateur avant de l’enregistrer. Une session de caisse doit être ouverte.</div>

            <button type="submit" disabled={isSaving || caisseSession.statut !== 'OUVERTE' || montantNum <= 0} className="flex w-full items-center justify-center gap-2 rounded-xl bg-sky-500 px-4 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-sky-500/20 transition-all hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-50">
              <Check className="h-4 w-4" /><span>{isSaving ? 'Enregistrement…' : caisseSession.statut !== 'OUVERTE' ? 'Ouvrez une caisse pour continuer' : 'Enregistrer l’opération vérifiée'}</span>
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
                  {todayServices.length === 0 ? (
                    <tr><td colSpan={7} className="py-8 text-center text-slate-500">Aucune opération enregistrée aujourd’hui.</td></tr>
                  ) : (
                    todayServices.map(srv => (
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
                          {formatMoney(srv.montant)}
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-400">
                          +{formatMoney(srv.commission)}
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
            <span className="text-slate-400">Commissions enregistrées aujourd’hui :</span>
            <span className="text-lg font-black text-emerald-400 font-mono">
              {formatMoney(totalCommissionsToday)}
            </span>
          </div>
        </div>
      </div>

      {/* Modal: Manage the organization's additional services */}
      {isServiceManagerOpen && currentRole !== 'CAISSIER' && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm" onMouseDown={event => { if (event.target === event.currentTarget) setIsServiceManagerOpen(false); }}>
          <div role="dialog" aria-modal="true" aria-labelledby="service-manager-title" className="flex max-h-[90vh] w-full max-w-xl flex-col overflow-hidden rounded-2xl border border-slate-700 bg-slate-900 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950 p-4">
              <div>
                <h3 id="service-manager-title" className="font-bold text-white">Gestion des services</h3>
                <p className="mt-1 text-[11px] text-slate-400">Ajoutez et modifiez les services proposés par votre organisation.</p>
              </div>
              <button type="button" onClick={() => setIsServiceManagerOpen(false)} aria-label="Fermer" className="flex h-8 w-8 items-center justify-center rounded-lg text-slate-400 hover:bg-slate-800 hover:text-white"><X className="h-5 w-5" /></button>
            </div>

            <div className="space-y-4 overflow-y-auto p-4">
              <form onSubmit={handleServiceCatalogSubmit} className="space-y-3 rounded-xl border border-slate-800 bg-slate-950/60 p-4">
                <h4 className="text-xs font-bold text-slate-200">{editingServiceId ? 'Modifier un service' : 'Ajouter un service'}</h4>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <div>
                    <label htmlFor="service-catalog-name" className="mb-1 block text-[11px] font-semibold text-slate-300">Nom du service</label>
                    <input id="service-catalog-name" autoFocus value={serviceNameInput} onChange={event => setServiceNameInput(event.target.value)} maxLength={100} minLength={2} required className="form-control" placeholder="Nom du service" />
                  </div>
                  <div>
                    <label htmlFor="service-catalog-type" className="mb-1 block text-[11px] font-semibold text-slate-300">Catégorie</label>
                    <select id="service-catalog-type" value={serviceTypeInput} onChange={event => setServiceTypeInput(event.target.value as ServiceCatalogType)} className="form-control">
                      <option value="PRESTATION">Prestation</option>
                      <option value="RECHARGE">Recharge</option>
                    </select>
                  </div>
                </div>
                <div className="flex justify-end gap-2">
                  {editingServiceId && <button type="button" onClick={() => { setEditingServiceId(null); setServiceNameInput(''); setServiceTypeInput('PRESTATION'); }} className="rounded-lg px-3 py-2 text-xs font-semibold text-slate-300 hover:bg-slate-800">Annuler</button>}
                  <button type="submit" disabled={isSaving || serviceNameInput.trim().length < 2} className="inline-flex items-center gap-1.5 rounded-lg bg-sky-500 px-3 py-2 text-xs font-bold text-white hover:bg-sky-400 disabled:cursor-not-allowed disabled:opacity-50">
                    <Plus className="h-3.5 w-3.5" />{isSaving ? 'Enregistrement…' : editingServiceId ? 'Enregistrer les modifications' : 'Ajouter le service'}
                  </button>
                </div>
              </form>

              <section aria-label="Services personnalisés" className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="text-xs font-bold text-slate-200">Services personnalisés</h4>
                  <span className="rounded-full bg-slate-800 px-2 py-0.5 text-[10px] text-slate-400">{serviceCatalog.length}</span>
                </div>
                {serviceCatalog.length === 0 ? (
                  <p className="rounded-xl border border-dashed border-slate-800 p-4 text-center text-xs text-slate-500">Aucun service personnalisé. Les services standards restent disponibles.</p>
                ) : (
                  <div className="divide-y divide-slate-800 rounded-xl border border-slate-800">
                    {serviceCatalog.map(item => (
                      <div key={item.id} className="flex items-center justify-between gap-3 p-3">
                        <div className="min-w-0">
                          <p className="truncate text-sm font-semibold text-slate-100">{item.nom}</p>
                          <p className="mt-0.5 text-[10px] uppercase tracking-wide text-slate-500">{item.type === 'RECHARGE' ? 'Recharge' : 'Prestation'}</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-1">
                          <button type="button" onClick={() => handleEditService(item)} title={`Modifier ${item.nom}`} aria-label={`Modifier ${item.nom}`} className="flex h-8 w-8 items-center justify-center rounded-lg text-sky-300 hover:bg-sky-500/10"><Pencil className="h-4 w-4" /></button>
                          <button type="button" onClick={() => void handleDeleteService(item)} title={`Supprimer ${item.nom}`} aria-label={`Supprimer ${item.nom}`} className="flex h-8 w-8 items-center justify-center rounded-lg text-red-300 hover:bg-red-500/10"><Trash2 className="h-4 w-4" /></button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                <p className="text-[10px] leading-4 text-slate-500">La suppression retire le service de la liste sans modifier les opérations déjà enregistrées.</p>
              </section>
            </div>
          </div>
        </div>
      )}

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
              onSubmit={async event => {
                event.preventDefault();
                setFlotteError(null);
                const enteredAmount = Number(flotteAmountStr);
                if (!Number.isFinite(enteredAmount) || enteredAmount <= 0) return;
                let amountCdf: number;
                try { amountCdf = toBaseAmount(enteredAmount); } catch { return; }
                const delta = flotteAction === 'AJOUT' ? amountCdf : -amountCdf;
                const nextBalance = flotteSolde[flotteTarget] + delta;
                if (nextBalance < 0) { setFlotteError('Le retrait dépasse le solde enregistré pour cet opérateur.'); return; }
                const saved = await updateFlotteSolde({ [flotteTarget]: nextBalance });
                if (!saved) return;
                const providerLabel = providers.find(provider => provider.id === flotteTarget)?.label || flotteTarget;
                setSuccessToast(`Solde ${providerLabel} enregistré : ${formatMoney(nextBalance)}.`);
                setIsFlotteModalOpen(false);
                setFlotteAmountStr('');
              }}
              className="space-y-4 p-5 text-xs"
            >
              <div>
                <label className="text-slate-300 font-semibold block mb-1">Compte Flotte *</label>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                  {providers.map(item => (
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
                      <div className="text-[10px] font-mono mt-0.5">{formatMoney(flotteSolde[item.id])}</div>
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
                <label className="form-label">Montant réel de l’ajustement ({displayCurrency}) *</label>
                <input type="number" min="0.01" step={displayCurrency === 'USD' ? '0.01' : '1'} required value={flotteAmountStr} onChange={event => setFlotteAmountStr(event.target.value)} className="form-control font-mono text-base font-bold" />
                <p className="text-[10px] leading-5 text-slate-500">Saisissez l’ajout ou le retrait constaté sur le compte de cet opérateur.</p>
                {flotteError && <p role="alert" className="text-xs text-red-300">{flotteError}</p>}
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
                  disabled={isSaving}
                  className="px-5 py-2 rounded-xl bg-sky-500 hover:bg-sky-400 text-white font-bold cursor-pointer disabled:opacity-50"
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
