import type { Produit } from '../types';

const utcToday = (): string => new Date().toISOString().slice(0, 10);

function positiveLots(product: Pick<Produit, 'lots'>) {
  return (Array.isArray(product.lots) ? product.lots : [])
    .filter(lot => Number(lot.quantite) > 0);
}

/** Mirrors the server's FEFO rule so expired stock cannot be added to a sale. */
export function getSellableStock(product: Pick<Produit, 'stock' | 'lots'>, today = utcToday()): number {
  const stock = Math.max(0, Number(product.stock) || 0);
  const lots = positiveLots(product);

  // Products without active lot records retain the legacy stock behavior.
  if (lots.length === 0) return stock;

  const validLotStock = lots.reduce((total, lot) => {
    if (lot.dlc && lot.dlc < today) return total;
    return total + (Number(lot.quantite) || 0);
  }, 0);

  return Number(Math.max(0, Math.min(stock, validLotStock)).toFixed(3));
}

export function getExpiredStock(product: Pick<Produit, 'lots'>, today = utcToday()): number {
  const expired = positiveLots(product).reduce((total, lot) => {
    if (!lot.dlc || lot.dlc >= today) return total;
    return total + (Number(lot.quantite) || 0);
  }, 0);
  return Number(expired.toFixed(3));
}
