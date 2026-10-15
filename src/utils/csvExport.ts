import type { Vente, Produit, ServiceTransaction, Client } from '../types';
import type { DaySalesData } from '../components/dashboard/SalesLineChart';
import { formatDateTime } from './format';

function toCsvNumber(value: number): string {
  if (!Number.isFinite(value)) return '0';
  return value.toFixed(2).replace(/\.?0+$/, '');
}

export function escapeCsvCell(value: string | number | undefined | null): string {
  if (value === null || value === undefined) return '""';
  let text = String(value);
  // Avoid spreadsheet formula execution when a user-controlled name begins with a formula marker.
  if (typeof value === 'string' && /^[=+\-@\t\r]/.test(text)) text = `'${text}`;
  return `"${text.replace(/"/g, '""')}"`;
}

const escapeCsv = escapeCsvCell;

function localDateKey(value: string | Date): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

export function downloadCsvFile(csvContent: string, fileName: string): void {
  const blob = new Blob(['\uFEFF' + csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/** Export amounts in the ledger's base currency (CDF); no assumed address or currency is inserted. */
export function exportFullAccountingCsv({
  sales,
  trendData,
  caJour,
  margeJour,
  services,
  clients,
  products,
  organizationName,
}: {
  sales: Vente[];
  trendData: DaySalesData[];
  caJour: number;
  margeJour: number;
  services: ServiceTransaction[];
  clients: Client[];
  products: Produit[];
  organizationName?: string;
}): void {
  const now = new Date();
  const todayKey = localDateKey(now);
  const dateStr = todayKey || now.toISOString().slice(0, 10);
  const todaySales = sales.filter(sale => localDateKey(sale.createdAt) === todayKey);
  const todayServices = services.filter(service => localDateKey(service.date) === todayKey);
  const lines: string[] = [];

  lines.push(escapeCsv(organizationName || 'Organisation non renseignée') + ';RAPPORT COMMERCIAL ET COMPTABILITÉ');
  lines.push(`Date d’exportation;${escapeCsv(now.toLocaleString('fr-CD'))}`);
  lines.push('Devise du grand livre;CDF');
  lines.push('');

  lines.push('=== 1. SYNTHÈSE DU JOUR (DONNÉES ENREGISTRÉES) ===');
  lines.push('Indicateur;Valeur');
  lines.push(`Chiffre d’affaires net du jour (CDF);${toCsvNumber(caJour)}`);
  lines.push(`Marge estimée du jour (CDF);${toCsvNumber(margeJour)}`);
  lines.push(`Taux de marge;${caJour > 0 ? ((margeJour / caJour) * 100).toFixed(1) : '0'}%`);
  lines.push(`Nombre de ventes du jour;${todaySales.length}`);
  lines.push(`Commissions multiservices du jour (CDF);${toCsvNumber(todayServices.reduce((sum, service) => sum + service.commission, 0))}`);
  lines.push(`Encours des crédits clients (CDF);${toCsvNumber(clients.reduce((sum, client) => sum + client.credit, 0))}`);
  lines.push(`Produits enregistrés;${products.length}`);
  lines.push('');

  lines.push('=== 2. VENTES DES 7 DERNIERS JOURS (DONNÉES ENREGISTRÉES) ===');
  lines.push('Période;Date;Chiffre d’affaires (CDF);Marge (CDF);Taux de marge (%);Nombre de tickets');
  trendData.forEach(item => {
    const rate = item.ca > 0 ? ((item.marge / item.ca) * 100).toFixed(1) : '0';
    lines.push([
      escapeCsv(item.day), escapeCsv(item.dateLabel), toCsvNumber(item.ca),
      toCsvNumber(item.marge), escapeCsv(`${rate}%`), item.nombreVentes,
    ].join(';'));
  });
  lines.push('');

  lines.push('=== 3. GRAND LIVRE DES VENTES ===');
  lines.push('N° ticket;Date et heure;Caissier;Client;Mode de paiement;Sous-total brut (CDF);Remise (CDF);Net à payer (CDF);Marge estimée (CDF);Articles vendus');
  sales.forEach(sale => {
    const articles = sale.lignes.map(line => `${line.nomProduit} (x${line.quantite})`).join(' + ');
    lines.push([
      escapeCsv(sale.numeroTicket), escapeCsv(formatDateTime(sale.createdAt)),
      escapeCsv(sale.nomCaissier), escapeCsv(sale.nomClient || 'Comptant'),
      escapeCsv(sale.paiement), toCsvNumber(sale.totalBrut), toCsvNumber(sale.remise),
      toCsvNumber(sale.totalNet), toCsvNumber(sale.margeEstimee), escapeCsv(articles),
    ].join(';'));
  });
  lines.push('');

  lines.push('=== 4. JOURNAL DES OPÉRATIONS MULTISERVICES ===');
  lines.push('ID transaction;Date et heure;Service;Type;Montant de l’opération (CDF);Commission (CDF);Téléphone client;Référence');
  services.forEach(service => {
    lines.push([
      escapeCsv(service.id), escapeCsv(formatDateTime(service.date)), escapeCsv(service.nom),
      escapeCsv(service.type), toCsvNumber(service.montant), toCsvNumber(service.commission),
      escapeCsv(service.telephoneClient || ''), escapeCsv(service.reference || ''),
    ].join(';'));
  });

  downloadCsvFile(lines.join('\r\n'), `FANA-Rapport-Comptable-${dateStr}.csv`);
}

export function exportSalesTrendsCsv(trendData: DaySalesData[]): void {
  const dateStr = localDateKey(new Date());
  const lines = [
    'F.A.N.A MULTISERVICES - TENDANCES DES VENTES (DONNÉES ENREGISTRÉES)',
    `Date d’extraction;${escapeCsv(new Date().toLocaleString('fr-CD'))}`,
    'Devise du grand livre;CDF',
    '',
    'Jour;Date;Chiffre d’affaires (CDF);Marge (CDF);Rentabilité (%);Nombre de ventes',
  ];
  trendData.forEach(item => {
    const rate = item.ca > 0 ? ((item.marge / item.ca) * 100).toFixed(1) : '0';
    lines.push([
      escapeCsv(item.day), escapeCsv(item.dateLabel), toCsvNumber(item.ca),
      toCsvNumber(item.marge), escapeCsv(`${rate}%`), item.nombreVentes,
    ].join(';'));
  });
  downloadCsvFile(lines.join('\r\n'), `FANA-Tendances-Ventes-7J-${dateStr}.csv`);
}
