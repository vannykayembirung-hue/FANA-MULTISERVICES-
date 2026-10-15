import { Lot } from '../types';

/**
 * Format currency in FCFA (Francs CFA)
 */
export function formatFCFA(amount: number): string {
  if (isNaN(amount) || amount === null || amount === undefined) {
    return '0 FCFA';
  }
  const formatted = Math.round(amount).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  return `${formatted} FCFA`;
}

/**
 * Short currency format for POS receipts & quick totals
 */
export function formatCurrencyShort(amount: number): string {
  if (isNaN(amount)) return '0 F';
  return `${Math.round(amount).toLocaleString('fr-FR')} F`;
}

/**
 * Format date & time in French locale
 */
export function formatDateTime(isoString: string): string {
  try {
    const d = new Date(isoString);
    return d.toLocaleString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  } catch {
    return isoString;
  }
}

export function formatDateShort(isoString: string): string {
  try {
    const d = new Date(isoString);
    return d.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  } catch {
    return isoString;
  }
}

export type DlcStatus = 'EXPIRED' | 'CRITICAL' | 'WARNING' | 'OK';

/**
 * Calculate DLC state:
 * - Red if < 3 days or expired
 * - Orange if < 7 days
 * - Green if > 7 days
 */
export function getDlcStatus(dlcString: string): {
  status: DlcStatus;
  daysRemaining: number;
  label: string;
  badgeClass: string;
} {
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  
  const dlcDate = new Date(dlcString);
  dlcDate.setHours(0, 0, 0, 0);

  const diffTime = dlcDate.getTime() - now.getTime();
  const daysRemaining = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (daysRemaining < 0) {
    return {
      status: 'EXPIRED',
      daysRemaining,
      label: `Périmé (${Math.abs(daysRemaining)}j)`,
      badgeClass: 'bg-red-950/80 text-red-400 border border-red-800/80 font-bold',
    };
  } else if (daysRemaining <= 3) {
    return {
      status: 'CRITICAL',
      daysRemaining,
      label: `DLC < 3j (${daysRemaining}j restant${daysRemaining > 1 ? 's' : ''})`,
      badgeClass: 'bg-red-900/60 text-red-300 border border-red-700 font-semibold',
    };
  } else if (daysRemaining <= 7) {
    return {
      status: 'WARNING',
      daysRemaining,
      label: `DLC < 7j (${daysRemaining}j)`,
      badgeClass: 'bg-amber-900/50 text-amber-300 border border-amber-600 font-medium',
    };
  } else {
    return {
      status: 'OK',
      daysRemaining,
      label: `${daysRemaining}j`,
      badgeClass: 'bg-emerald-950/40 text-emerald-300 border border-emerald-800/60',
    };
  }
}

/**
 * Sorts lots according to FEFO (First Expired First Out)
 */
export function sortLotsFEFO(lots: Lot[]): Lot[] {
  return [...lots].sort((a, b) => new Date(a.dlc).getTime() - new Date(b.dlc).getTime());
}

/**
 * Decrement lots based on FEFO algorithm
 * Returns updated lots array
 */
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
      // lot exhausted, quantity becomes 0 or removed
      resultLots.push({ ...lot, quantite: 0 });
    } else {
      resultLots.push({
        ...lot,
        quantite: Number((lot.quantite - needed).toFixed(3)),
      });
      needed = 0;
    }
  }

  // Filter out exhausted lots or keep with 0
  const activeLots = resultLots.filter(l => l.quantite > 0);
  return { updatedLots: activeLots, remainingToDeduct: Math.max(0, needed) };
}
