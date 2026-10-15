import { Vente, Produit, ServiceTransaction, Client } from '../types';
import { DaySalesData } from '../components/dashboard/SalesLineChart';
import { formatDateTime } from './format';

/**
 * Cleanly format numbers for CSV (integer or 2 decimal places without thousand spaces)
 */
function toCsvNumber(num: number): string {
  if (isNaN(num)) return '0';
  return Math.round(num).toString();
}

/**
 * Escape CSV cell value according to RFC 4180
 */
function escapeCsv(val: string | number | undefined | null): string {
  if (val === null || val === undefined) return '""';
  const str = String(val).replace(/"/g, '""');
  return `"${str}"`;
}

/**
 * Triggers browser download of a CSV file with UTF-8 BOM for Microsoft Excel / Google Sheets compatibility
 */
export function downloadCsvFile(csvContent: string, fileName: string): void {
  // \uFEFF is the UTF-8 Byte Order Mark (BOM) ensuring French accents (é, è, à) display properly in Excel
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

/**
 * Export complete bookkeeping and sales report:
 * 1. Global Store & Day KPIs
 * 2. 7-Day Sales & Profit Trends
 * 3. Detailed Sales Transactions Ledger
 * 4. Multiservices Commission Ledger
 */
export function exportFullAccountingCsv({
  sales,
  trendData,
  caJour,
  margeJour,
  services,
  clients,
  products,
}: {
  sales: Vente[];
  trendData: DaySalesData[];
  caJour: number;
  margeJour: number;
  services: ServiceTransaction[];
  clients: Client[];
  products: Produit[];
}): void {
  const now = new Date();
  const dateStr = now.toISOString().split('T')[0];
  const lines: string[] = [];

  // --- HEADER SECTION ---
  lines.push('F.A.N.A MULTISERVICES - RAPPORT COMMERCIAL ET COMPTABILITE');
  lines.push(`Date d'exportation;${now.toLocaleString('fr-FR')}`);
  lines.push('Etablissement;Cite Fadia, Dakar - Senegal');
  lines.push('Devise;FCFA (Francs CFA)');
  lines.push('');

  // --- SECTION 1: SYNTHESE DES PERFORMANCES DU JOUR ---
  lines.push('=== 1. SYNTHESE DES PERFORMANCES DU JOUR ===');
  lines.push('Indicateur;Valeur');
  lines.push(`Chiffre d'Affaires du Jour (FCFA);${toCsvNumber(caJour)}`);
  lines.push(`Marge Nette Reelle du Jour (FCFA);${toCsvNumber(margeJour)}`);
  lines.push(`Taux de Marge Reelle;${caJour > 0 ? ((margeJour / caJour) * 100).toFixed(1) : 0}%`);
  lines.push(`Nombre de Ventes du Jour;${sales.filter(s => s.createdAt.startsWith(dateStr)).length}`);
  lines.push(`Commissions Multiservices (Wave / OM);${toCsvNumber(services.reduce((acc, s) => acc + s.commission, 0))}`);
  lines.push(`Total Encours Dettes Clients (Ardoises);${toCsvNumber(clients.reduce((acc, c) => acc + c.credit, 0))}`);
  lines.push('');

  // --- SECTION 2: TENDANCES DES VENTES SUR 7 JOURS ---
  lines.push('=== 2. TENDANCES DES VENTES SUR LES 7 DERNIERS JOURS ===');
  lines.push('Periode;Date;Chiffre Affaires (FCFA);Marge Nette (FCFA);Taux de Marge (%);Nombre de Tickets');
  trendData.forEach(item => {
    const rate = item.ca > 0 ? ((item.marge / item.ca) * 100).toFixed(1) : '0';
    lines.push([
      escapeCsv(item.day),
      escapeCsv(item.dateLabel),
      toCsvNumber(item.ca),
      toCsvNumber(item.marge),
      escapeCsv(`${rate}%`),
      item.nombreVentes,
    ].join(';'));
  });
  lines.push('');

  // --- SECTION 3: JOURNAL DETAILLE DES VENTES (GRAND LIVRE CAISSE) ---
  lines.push('=== 3. JOURNAL DETAILLE DES VENTES (TICKETS DE CAISSE) ===');
  lines.push('N Ticket;Date et Heure;Caissier;Client / Titulaire;Mode de Paiement;Sous-Total Brut (FCFA);Remise (FCFA);Net a Payer (FCFA);Marge Estimee (FCFA);Articles Vendus');
  sales.forEach(sale => {
    const articlesSummary = sale.lignes.map(l => `${l.nomProduit} (x${l.quantite})`).join(' + ');
    lines.push([
      escapeCsv(sale.numeroTicket),
      escapeCsv(formatDateTime(sale.createdAt)),
      escapeCsv(sale.nomCaissier),
      escapeCsv(sale.nomClient || 'Client Comptant'),
      escapeCsv(sale.paiement),
      toCsvNumber(sale.totalBrut),
      toCsvNumber(sale.remise),
      toCsvNumber(sale.totalNet),
      toCsvNumber(sale.margeEstimee),
      escapeCsv(articlesSummary),
    ].join(';'));
  });
  lines.push('');

  // --- SECTION 4: OPERATIONS MULTISERVICES & COMMISSIONS ---
  lines.push('=== 4. JOURNAL DES OPERATIONS MULTISERVICES (WAVE / OM / BUREAUTIQUE) ===');
  lines.push('ID Transaction;Date et Heure;Service;Type;Montant de Operation (FCFA);Commission Nette FANA (FCFA);Telephone Client;Reference');
  services.forEach(srv => {
    lines.push([
      escapeCsv(srv.id),
      escapeCsv(formatDateTime(srv.date)),
      escapeCsv(srv.nom),
      escapeCsv(srv.type),
      toCsvNumber(srv.montant),
      toCsvNumber(srv.commission),
      escapeCsv(srv.telephoneClient || '-'),
      escapeCsv(srv.reference || '-'),
    ].join(';'));
  });

  const content = lines.join('\r\n');
  downloadCsvFile(content, `FANA-Rapport-Comptable-Ventes-${dateStr}.csv`);
}

/**
 * Export 7-day Sales Trends only
 */
export function exportSalesTrendsCsv(trendData: DaySalesData[]): void {
  const dateStr = new Date().toISOString().split('T')[0];
  const lines: string[] = [];

  lines.push('F.A.N.A MULTISERVICES - TENDANCE DES VENTES 7 JOURS');
  lines.push(`Date d'extraction;${new Date().toLocaleString('fr-FR')}`);
  lines.push('');
  lines.push('Jour;Date;Chiffre d Affaires (FCFA);Marge Nette (FCFA);Rentabilite (%);Nombre de Ventes');

  trendData.forEach(item => {
    const rate = item.ca > 0 ? ((item.marge / item.ca) * 100).toFixed(1) : '0';
    lines.push([
      escapeCsv(item.day),
      escapeCsv(item.dateLabel),
      toCsvNumber(item.ca),
      toCsvNumber(item.marge),
      escapeCsv(`${rate}%`),
      item.nombreVentes,
    ].join(';'));
  });

  const content = lines.join('\r\n');
  downloadCsvFile(content, `FANA-Tendances-Ventes-7J-${dateStr}.csv`);
}
