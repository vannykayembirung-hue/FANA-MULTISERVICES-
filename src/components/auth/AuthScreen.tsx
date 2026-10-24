import React, { useState } from 'react';
import { ArrowRight, BadgeCheck, Boxes, Eye, EyeOff, LockKeyhole, Mail, PackageCheck, ShieldCheck, Store } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { PwaInstallButton } from '../pwa/PwaControls';

export const AuthScreen: React.FC = () => {
  const { login, register, error, clearError, status } = useAuth();
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [name, setName] = useState('');
  const [organizationName, setOrganizationName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [busy, setBusy] = useState(false);

  const isBackendSetupIssue = Boolean(error && /DATABASE_URL|Neon|fonctions Vercel|JSON/i.test(error));

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    clearError();
    setBusy(true);
    try {
      if (mode === 'register') {
        await register({ name, organizationName, email, password });
      } else {
        await login(email, password);
      }
    } finally {
      setBusy(false);
    }
  };

  const switchMode = (next: 'login' | 'register') => {
    clearError();
    setMode(next);
  };

  return (
    <main className="min-h-[100dvh] bg-[#0a0f18] p-4 pt-[calc(1rem+env(safe-area-inset-top))] pb-[calc(1rem+env(safe-area-inset-bottom))] text-slate-100 sm:p-8 sm:pt-[calc(2rem+env(safe-area-inset-top))] sm:pb-[calc(2rem+env(safe-area-inset-bottom))]">
      <div className="w-full max-w-6xl grid lg:grid-cols-[1.05fr_0.95fr] bg-slate-950 border border-slate-800 rounded-[2rem] overflow-hidden shadow-[0_30px_100px_rgba(0,0,0,.45)]">
        <section className="relative hidden lg:flex flex-col justify-between p-12 bg-[radial-gradient(ellipse_at_top_left,_var(--tw-gradient-stops))] from-orange-500/20 via-slate-950 to-slate-950 min-h-[700px]">
          <div className="absolute -right-20 top-28 h-80 w-80 rounded-full bg-orange-500/10 blur-3xl" />
          <div className="relative">
            <div className="flex items-center gap-3">
              <div className="h-12 w-12 rounded-2xl bg-orange-500 flex items-center justify-center text-white shadow-lg shadow-orange-950/40"><Store size={24} /></div>
              <div>
                <div className="font-black tracking-wide text-white text-lg">F.A.N.A</div>
                <div className="text-[10px] tracking-[0.22em] text-orange-300 font-bold">GESTION DU MAGASIN</div>
              </div>
            </div>
            <div className="mt-24 max-w-xl">
              <div className="inline-flex items-center gap-2 rounded-full border border-orange-400/25 bg-orange-400/10 px-3 py-1.5 text-xs font-semibold text-orange-200">
                <ShieldCheck size={14} /> Données privées, stockées dans votre espace Neon
              </div>
              <h1 className="mt-6 text-5xl font-black leading-[1.08] tracking-tight text-white">
                La gestion du magasin, <span className="text-orange-400">sans chiffres inventés.</span>
              </h1>
              <p className="mt-5 max-w-lg text-base leading-7 text-slate-400">
                Ventes, stocks, clients, fournisseurs et caisse partagent un seul espace sécurisé, accessible sur ordinateur, tablette et téléphone Android.
              </p>
            </div>
          </div>
          <div className="relative grid grid-cols-3 gap-3">
            {[
              { icon: PackageCheck, title: 'Stock réel', detail: 'Lots et inventaire' },
              { icon: Boxes, title: 'Caisse fiable', detail: 'Tickets et clôtures' },
              { icon: BadgeCheck, title: 'CDF / USD', detail: 'Taux défini par vous' },
            ].map(item => {
              const Icon = item.icon;
              return <div key={item.title} className="rounded-2xl border border-slate-800 bg-slate-900/70 p-4">
                <Icon className="h-5 w-5 text-orange-400" />
                <div className="mt-3 text-sm font-bold text-slate-100">{item.title}</div>
                <div className="mt-1 text-xs text-slate-500">{item.detail}</div>
              </div>;
            })}
          </div>
        </section>

        <section className="flex items-center justify-center p-5 sm:p-10 lg:p-12">
          <div className="w-full max-w-md">
            <div className="lg:hidden flex items-center gap-3 mb-9">
              <div className="h-11 w-11 rounded-2xl bg-orange-500 flex items-center justify-center text-white"><Store size={23} /></div>
              <div><div className="font-black text-white">F.A.N.A</div><div className="text-[10px] tracking-[0.2em] text-orange-300 font-bold">GESTION DU MAGASIN</div></div>
            </div>
            <div className="mb-8">
              <p className="text-xs font-bold uppercase tracking-[0.2em] text-orange-400">Espace magasin sécurisé</p>
              <h2 className="mt-3 text-3xl font-black text-white">{mode === 'login' ? 'Bon retour.' : 'Créer votre espace.'}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-400">
                {mode === 'login' ? 'Connectez-vous pour retrouver les données de votre entreprise.' : 'Le premier compte devient le Boss du magasin.'}
              </p>
            </div>

            {status === 'error' && isBackendSetupIssue && (
              <div className="mb-5 rounded-2xl border border-amber-700/60 bg-amber-950/30 p-4 text-sm text-amber-100">
                <div className="font-bold">Connexion à Neon à configurer</div>
                <p className="mt-1 leading-5 text-amber-100/80">Reliez le projet Vercel à Neon et vérifiez que la variable serveur <code className="rounded bg-black/20 px-1">DATABASE_URL</code> est disponible, puis redéployez. Aucun exemple de données n’est chargé.</p>
              </div>
            )}
            {error && !isBackendSetupIssue && (
              <div role="alert" className="mb-5 rounded-xl border border-red-800/70 bg-red-950/40 px-4 py-3 text-sm text-red-200">{error}</div>
            )}

            <form onSubmit={submit} className="space-y-4">
              {mode === 'register' && <>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold text-slate-300">Votre nom</span>
                  <input autoComplete="name" required minLength={2} maxLength={80} value={name} onChange={e => setName(e.target.value)} placeholder="Nom du responsable" className="auth-input" />
                </label>
                <label className="block">
                  <span className="mb-1.5 block text-xs font-semibold text-slate-300">Nom du magasin / entreprise</span>
                  <input autoComplete="organization" required minLength={2} maxLength={100} value={organizationName} onChange={e => setOrganizationName(e.target.value)} placeholder="Nom commercial" className="auth-input" />
                </label>
              </>}
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-slate-300">Adresse e-mail</span>
                <span className="relative block"><Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" /><input autoComplete="email" type="email" required maxLength={254} value={email} onChange={e => setEmail(e.target.value)} placeholder="vous@entreprise.cd" className="auth-input pl-10" /></span>
              </label>
              <label className="block">
                <span className="mb-1.5 block text-xs font-semibold text-slate-300">Mot de passe</span>
                <span className="relative block"><LockKeyhole className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" /><input autoComplete={mode === 'login' ? 'current-password' : 'new-password'} type={showPassword ? 'text' : 'password'} required minLength={mode === 'register' ? 10 : 1} maxLength={128} value={password} onChange={e => setPassword(e.target.value)} placeholder={mode === 'register' ? '10 caractères minimum' : 'Votre mot de passe'} className="auth-input pl-10 pr-11" /><button type="button" onClick={() => setShowPassword(!showPassword)} aria-label={showPassword ? 'Masquer le mot de passe' : 'Afficher le mot de passe'} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-200">{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></span>
              </label>
              <button type="submit" disabled={busy} className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl bg-orange-500 px-4 py-3.5 font-bold text-white shadow-lg shadow-orange-950/30 transition hover:bg-orange-400 disabled:cursor-wait disabled:opacity-60">
                <span>{busy ? 'Veuillez patienter…' : mode === 'login' ? 'Se connecter' : 'Créer le compte'}</span>{!busy && <ArrowRight size={17} />}
              </button>
            </form>

            <div className="mt-6 text-center text-sm text-slate-400">
              {mode === 'login' ? 'Pas encore de compte ? ' : 'Vous avez déjà un compte ? '}
              <button type="button" onClick={() => switchMode(mode === 'login' ? 'register' : 'login')} className="font-bold text-orange-400 hover:text-orange-300">
                {mode === 'login' ? 'Créer un espace' : 'Se connecter'}
              </button>
            </div>
            <div className="mt-6 flex justify-center"><PwaInstallButton /></div>
            <p className="mt-5 text-center text-[11px] leading-5 text-slate-600">Session privée · Connexion chiffrée · Données isolées par entreprise</p>
          </div>
        </section>
      </div>
    </main>
  );
};
