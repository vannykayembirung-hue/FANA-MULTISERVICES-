import React, { useCallback, useEffect, useState } from 'react';
import { KeyRound, Mail, ShieldCheck, UserPlus, Users, UserRoundCog } from 'lucide-react';
import { UserRole } from '../../types';
import { roleLabel } from '../../utils/roles';
import { requestJson } from '../../utils/request';
import { useApp } from '../../context/AppContext';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  isActive: boolean;
  createdAt: string;
}

const ROLE_OPTIONS: Array<{ role: UserRole; detail: string }> = [
  { role: 'ADMIN', detail: 'Accès complet, paramètres et gestion des comptes.' },
  { role: 'GERANT', detail: 'Stocks, clients, fournisseurs, caisse et rapports.' },
  { role: 'CAISSIER', detail: 'Ventes et ouverture / clôture de sa session de caisse.' },
];

export const TeamView: React.FC = () => {
  const { user } = useApp();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<UserRole>('CAISSIER');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);

  const loadMembers = useCallback(async () => {
    setLoading(true);
    try {
      const response = await requestJson<{ members: TeamMember[] }>('/api/team');
      setMembers(response.members);
      setError(null);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Impossible de charger les comptes.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { void loadMembers(); }, [loadMembers]);

  const submitNewMember = async (event: React.FormEvent) => {
    event.preventDefault();
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const response = await requestJson<{ members: TeamMember[] }>('/api/team', {
        method: 'POST',
        body: JSON.stringify({ action: 'create', name, email, password, role }),
      });
      setMembers(response.members);
      setName('');
      setEmail('');
      setPassword('');
      setRole('CAISSIER');
      setNotice('Compte créé. Le membre peut maintenant se connecter avec cet e-mail et ce mot de passe.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Création du compte impossible.');
    } finally {
      setSaving(false);
    }
  };

  const updateMember = async (memberId: string, update: { action: 'update-role'; role: UserRole } | { action: 'set-active'; isActive: boolean }) => {
    setSaving(true);
    setError(null);
    setNotice(null);
    try {
      const response = await requestJson<{ members: TeamMember[] }>('/api/team', {
        method: 'POST',
        body: JSON.stringify({ ...update, memberId }),
      });
      setMembers(response.members);
      setNotice('Accès mis à jour. Les ventes et l’historique du compte sont conservés.');
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Modification du compte impossible.');
    } finally {
      setSaving(false);
    }
  };

  return <div className="flex-1 space-y-6 overflow-y-auto bg-slate-900 p-4 text-slate-100 lg:p-6">
    <header className="flex flex-col gap-3 border-b border-slate-800 pb-4 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-black tracking-tight text-white"><Users className="h-6 w-6 text-orange-400" />Équipe et rôles</h1>
        <p className="mt-1 text-xs text-slate-400">Créez les accès Boss, Gérant et Vendeur de ce magasin.</p>
      </div>
      <div className="inline-flex w-fit items-center gap-2 rounded-xl border border-orange-900/60 bg-orange-950/30 px-3 py-2 text-xs font-semibold text-orange-200"><ShieldCheck size={15} />Gestion réservée au Boss</div>
    </header>

    <section className="grid grid-cols-1 gap-3 lg:grid-cols-3">
      {ROLE_OPTIONS.map(option => <article key={option.role} className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4">
        <div className="flex items-center gap-2"><UserRoundCog size={17} className="text-orange-400" /><h2 className="font-bold text-white">{roleLabel(option.role)}</h2></div>
        <p className="mt-2 text-xs leading-5 text-slate-400">{option.detail}</p>
      </article>)}
    </section>

    <section className="grid grid-cols-1 gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(320px,0.8fr)]">
      <div className="rounded-2xl border border-slate-800 bg-slate-950/70 p-4 sm:p-5">
        <div className="mb-4 flex items-center justify-between gap-3">
          <div><h2 className="font-bold text-white">Comptes du magasin</h2><p className="mt-1 text-[11px] text-slate-500">Désactiver un accès ne supprime jamais son compte ni ses opérations.</p></div>
          <span className="rounded-lg border border-slate-800 bg-slate-900 px-2.5 py-1 text-xs font-bold text-slate-300">{members.length}</span>
        </div>
        {error && <div role="alert" className="mb-3 rounded-xl border border-red-900/70 bg-red-950/30 px-3 py-2 text-xs text-red-200">{error}</div>}
        {notice && <div role="status" className="mb-3 rounded-xl border border-emerald-900/70 bg-emerald-950/30 px-3 py-2 text-xs text-emerald-200">{notice}</div>}
        {loading ? <p className="rounded-xl border border-slate-800 bg-slate-900 px-4 py-6 text-center text-sm text-slate-400">Chargement des comptes…</p> : members.length === 0 ? <p className="rounded-xl border border-dashed border-slate-800 px-4 py-8 text-center text-sm text-slate-500">Aucun compte enregistré pour ce magasin.</p> : <div className="space-y-2">
          {members.map(member => <article key={member.id} className={`rounded-xl border p-3 ${member.isActive ? 'border-slate-800 bg-slate-900/80' : 'border-slate-800/70 bg-slate-950 opacity-70'}`}>
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2"><h3 className="truncate text-sm font-bold text-white">{member.name}{member.id === user.id ? ' (vous)' : ''}</h3><span className={`rounded-md px-2 py-0.5 text-[10px] font-bold ${member.isActive ? 'bg-emerald-950/60 text-emerald-300' : 'bg-slate-800 text-slate-400'}`}>{member.isActive ? 'Actif' : 'Désactivé'}</span></div>
                <p className="mt-1 flex items-center gap-1.5 truncate text-xs text-slate-400"><Mail size={13} className="shrink-0" />{member.email}</p>
                <p className="mt-1 text-[10px] text-slate-600">Compte créé le {new Date(member.createdAt).toLocaleDateString('fr-CD')}</p>
              </div>
              <div className="flex shrink-0 flex-wrap items-center gap-2">
                <label className="sr-only" htmlFor={`role-${member.id}`}>Rôle de {member.name}</label>
                <select id={`role-${member.id}`} value={member.role} disabled={saving || !member.isActive || member.id === user.id} onChange={event => void updateMember(member.id, { action: 'update-role', role: event.target.value as UserRole })} className="min-w-28 rounded-lg border border-slate-700 bg-slate-950 px-2.5 py-2 text-xs font-semibold text-white disabled:opacity-50">
                  {ROLE_OPTIONS.map(option => <option key={option.role} value={option.role}>{roleLabel(option.role)}</option>)}
                </select>
                <button type="button" disabled={saving || member.id === user.id} onClick={() => void updateMember(member.id, { action: 'set-active', isActive: !member.isActive })} className={`rounded-lg border px-3 py-2 text-xs font-bold transition disabled:opacity-50 ${member.isActive ? 'border-red-900/60 bg-red-950/30 text-red-200 hover:bg-red-900/50' : 'border-emerald-900/60 bg-emerald-950/30 text-emerald-200 hover:bg-emerald-900/50'}`}>{member.isActive ? 'Désactiver' : 'Réactiver'}</button>
              </div>
            </div>
          </article>)}
        </div>}
      </div>

      <aside className="h-fit rounded-2xl border border-slate-800 bg-slate-950/70 p-4 sm:p-5">
        <div className="mb-4 flex items-center gap-2"><UserPlus size={18} className="text-orange-400" /><div><h2 className="font-bold text-white">Ajouter un membre</h2><p className="mt-0.5 text-[11px] text-slate-500">Son compte sera rattaché à ce magasin.</p></div></div>
        <form onSubmit={submitNewMember} className="space-y-3">
          <label className="block"><span className="form-label">Nom complet</span><input required minLength={2} maxLength={80} autoComplete="name" value={name} onChange={event => setName(event.target.value)} className="form-control" placeholder="Nom du membre" /></label>
          <label className="block"><span className="form-label">Adresse e-mail</span><input required type="email" maxLength={254} autoComplete="email" value={email} onChange={event => setEmail(event.target.value)} className="form-control" placeholder="membre@magasin.cd" /></label>
          <label className="block"><span className="form-label">Mot de passe initial</span><span className="relative block"><KeyRound size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" /><input required type="password" minLength={10} maxLength={128} autoComplete="new-password" value={password} onChange={event => setPassword(event.target.value)} className="form-control pl-9" placeholder="10 caractères minimum" /></span></label>
          <label className="block"><span className="form-label">Rôle</span><select value={role} onChange={event => setRole(event.target.value as UserRole)} className="form-control">{ROLE_OPTIONS.map(option => <option key={option.role} value={option.role}>{roleLabel(option.role)}</option>)}</select></label>
          <button type="submit" disabled={saving} className="flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-3 text-sm font-bold text-white transition hover:bg-orange-400 disabled:cursor-wait disabled:opacity-60"><UserPlus size={17} />{saving ? 'Enregistrement…' : 'Créer le compte'}</button>
        </form>
        <p className="mt-4 text-[10px] leading-5 text-slate-500">Le mot de passe initial est communiqué directement au membre. Les comptes et historiques ne sont pas effacés quand un accès est désactivé.</p>
      </aside>
    </section>
  </div>;
};
