import { Currency, Lot } from '../types';

let activeCurrency: Currency = 'CDF';
let currentUsdRate: number | null = null;

/** The ledger is always stored in CDF; the selected currency is only a display/input layer. */
export function configureCurrencyDisplay(currency: Currency, usdRate: number | null): void {
  activeCurrency = currency;
  currentUsdRate = usdRate && usdRate > 0 ? usdRate : null;
}

export function getCurrencyLabel(currency: Currency = activeCurrency): string {
  return currency === 'USD' ? 'USD' : 'CDF';
}

export function fromBaseCdf(amountCdf: number, currency: Currency = activeCurrency, usdRate = currentUsdRate): number {
  if (!Number.isFinite(amountCdf)) return 0;
  if (currency === 'USD') {
    if (!usdRate || usdRate <= 0) return 0;
    return amountCdf / usdRate;
  }
  return amountCdf;
}

export function toBaseCdf(amount: number, currency: Currency = activeCurrency, usdRate = currentUsdRate): number {
  if (!Number.isFinite(amount)) return 0;
  if (currency === 'USD') {
    if (!usdRate || usdRate <= 0) throw new Error('Configurez le taux CDF/USD avant d’utiliser les dollars américains.');
    return amount * usdRate;
  }
  return amount;
}

export function formatMoney(amountCdf: number, currency: Currency = activeCurrency, usdRate = currentUsdRate): string {
  if (!Number.isFinite(amountCdf)) amountCdf = 0;
  const displayed = fromBaseCdf(amountCdf, currency, usdRate);
  const formatted = new Intl.NumberFormat('fr-FR', {
    minimumFractionDigits: currency === 'USD' ? 2 : 0,
    maximumFractionDigits: currency === 'USD' ? 2 : 0,
  }).format(displayed);
  return `${formatted} ${currency}`;
}

/** Compact currency format for POS and small summaries. */
export function formatCurrencyShort(amount: number): string {
  if (!Number.isFinite(amount)) amount = 0;
  const displayed = fromBaseCdf(amount);
  const formatted = new Intl.NumberFormat('fr-FR', {
    notation: 'compact',
    maximumFractionDigits: activeCurrency === 'USD' ? 2 : 1,
  }).format(displayed);
  return `${formatted} ${activeCurrency}`;
}

export function formatDateTime(isoString: string): string {
  if (!isoString) return '—';
  try {
    const d = new Date(isoString);
    return Number.isNaN(d.getTime()) ? isoString : d.toLocaleString('fr-CD', {
      day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit',
    });
  } catch {
    return isoString;
  }
}

export function formatDateShort(isoString: string): string {
  if (!isoString) return '—';
  try {
    const d = new Date(isoString);
    return Number.isNaN(d.getTime()) ? isoString : d.toLocaleDateString('fr-CD', {
      day: '2-digit', month: '2-digit', year: 'numeric',
    });
  } catch {
    return isoString;
  }
}

export type DlcStatus = 'EXPIRED' | 'CRITICAL' | 'WARNING' | 'OK';

export function getDlcStatus(dlcString: string): {
  status: DlcStatus;
  daysRemaining: number;
  label: string;
  badgeClass: string;
} {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  const dlcDate = new Date(`${dlcString}T00:00:00`);
  const diffTime = dlcDate.getTime() - now.getTime();
  const daysRemaining = Number.isFinite(diffTime) ? Math.ceil(diffTime / 86400000) : 0;

  if (daysRemaining < 0) {
    return { status: 'EXPIRED', daysRemaining, label: `Périmé (${Math.abs(daysRemaining)} j)`, badgeClass: 'bg-red-950/80 text-red-400 border border-red-800/80 font-bold' };
  }
  if (daysRemaining <= 3) {
    return { status: 'CRITICAL', daysRemaining, label: `DLC proche (${daysRemaining} j)`, badgeClass: 'bg-red-900/60 text-red-300 border border-red-700 font-semibold' };
  }
  if (daysRemaining <= 7) {
    return { status: 'WARNING', daysRemaining, label: `DLC bientôt (${daysRemaining} j)`, badgeClass: 'bg-amber-900/50 text-amber-300 border border-amber-600 font-medium' };
  }
  return { status: 'OK', daysRemaining, label: `${daysRemaining} j`, badgeClass: 'bg-emerald-950/40 text-emerald-300 border border-emerald-800/60' };
}

export function sortLotsFEFO(lots: Lot[]): Lot[] {
  return [...lots].sort((a, b) => new Date(a.dlc).getTime() - new Date(b.dlc).getTime());
}

export function deductStockFEFO(lots: Lot[], quantityToDeduct: number): { updatedLots: Lot[]; remainingToDeduct: number } {
  const sorted = sortLotsFEFO(lots);
  let needed = quantityToDeduct;
  const resultLots: Lot[] = [];

  for (const lot of sorted) {
    if (needed <= 0) {
      resultLots.push({ ...lot });
      continue;
    }
    if (lot.quantite <= needed) {
      needed -= lot.quantite;
      if (lot.quantite > 0) resultLots.push({ ...lot, quantite: 0 });
    } else {
      resultLots.push({ ...lot, quantite: Number((lot.quantite - needed).toFixed(3)) });
      needed = 0;
    }
  }

  return { updatedLots: resultLots.filter(l => l.quantite > 0), remainingToDeduct: Math.max(0, needed) };
}
