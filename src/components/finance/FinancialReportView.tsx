import React, { useState, useMemo } from 'react';
import { useApp } from '../../context/AppContext';
import { formatMoney, formatDateTime, formatCurrencyShort } from '../../utils/format';
import { downloadCsvFile, escapeCsvCell } from '../../utils/csvExport';
import { posAudio } from '../../utils/audio';
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
} from 'recharts';
import {
  TrendingUp,
  DollarSign,
  PieChart as PieIcon,
  Calendar,
  FileSpreadsheet,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Plus,
  Percent,
  Check,
  Building,
  ShoppingBag,
  Smartphone,
  Receipt,
  Layers,
  HelpCircle,
} from 'lucide-react';

interface DailyFinancialRecord {
  dayLabel: string;
  dateKey: string;
  dateStr: string;
  caNet: number;
  coutAchat: number; // Cost of Goods Sold (COGS)
  margeBrute: number;
  tauxMargeBrute: number; // in %
  commissionsServices: number;
  depensesMagasin: number;
  beneficeNetReel: number;
  tauxBeneficeNet: number; // in %
  nombreTickets: number;
}

const localDateKey = (value: string | Date): string => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
};

export const FinancialReportView: React.FC = () => {
  const { sales, products, services, cashMovements, settings } = useApp();

  const [period, setPeriod] = useState<'7J' | '14J' | '30J'>('7J');
  const [activeChartTab, setActiveChartTab] = useState<'PROFIT_FLOW' | 'MARGIN_RATE' | 'CATEGORY_MARGIN'>('PROFIT_FLOW');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const todayIso = localDateKey(new Date());
  const todaySales = sales.filter(sale => localDateKey(sale.createdAt) === todayIso);
  const todayServices = services.filter(service => localDateKey(service.date) === todayIso);
  const todayMouvements = cashMovements.filter(movement => localDateKey(movement.date) === todayIso);
  const caNetJour = todaySales.reduce((sum, sale) => sum + sale.totalNet, 0);
  const coutAchatJour = todaySales.reduce((sum, sale) => sum + sale.lignes.reduce((lineSum, line) => lineSum + (line.coutTotal ?? line.coutUnitaire * line.quantite), 0), 0);
  const margeBruteJour = caNetJour - coutAchatJour;
  const commissionsServicesJour = todayServices.reduce((sum, service) => sum + service.commission, 0);
  const depensesMagasinJour = todayMouvements.filter(movement => movement.type === 'SORTIE' && movement.impactBenefice !== false).reduce((sum, movement) => sum + movement.montant, 0);
  const beneficeNetJour = margeBruteJour + commissionsServicesJour - depensesMagasinJour;
  const tauxMargeBruteJour = caNetJour > 0 ? (margeBruteJour / caNetJour) * 100 : 0;
  const tauxBeneficeNetJour = caNetJour + commissionsServicesJour > 0 ? (beneficeNetJour / (caNetJour + commissionsServicesJour)) * 100 : 0;

  // Fill the selected calendar range with recorded totals; empty days remain zero rather than estimated.
  const financialTimeline: DailyFinancialRecord[] = useMemo(() => {
    const count = period === '7J' ? 7 : period === '14J' ? 14 : 30;
    const records: DailyFinancialRecord[] = [];
    for (let offset = count - 1; offset >= 0; offset--) {
      const date = new Date();
      date.setHours(12, 0, 0, 0);
      date.setDate(date.getDate() - offset);
      const dateKey = localDateKey(date);
      const daySales = sales.filter(sale => localDateKey(sale.createdAt) === dateKey);
      const dayServices = services.filter(service => localDateKey(service.date) === dateKey);
      const dayMovements = cashMovements.filter(movement => localDateKey(movement.date) === dateKey);
      const caNet = daySales.reduce((sum, sale) => sum + sale.totalNet, 0);
      const coutAchat = daySales.reduce((sum, sale) => sum + sale.lignes.reduce((lineSum, line) => lineSum + (line.coutTotal ?? line.coutUnitaire * line.quantite), 0), 0);
      const margeBrute = caNet - coutAchat;
      const commissionsServices = dayServices.reduce((sum, service) => sum + service.commission, 0);
      const depensesMagasin = dayMovements.filter(movement => movement.type === 'SORTIE' && movement.impactBenefice !== false).reduce((sum, movement) => sum + movement.montant, 0);
      const beneficeNetReel = margeBrute + commissionsServices - depensesMagasin;
      const dayLabel = offset === 0 ? "Aujourd'hui" : offset === 1 ? 'Hier' : date.toLocaleDateString('fr-CD', { weekday: 'short' });
      records.push({
        dayLabel,
        dateKey,
        dateStr: date.toLocaleDateString('fr-CD', { day: '2-digit', month: 'short', year: 'numeric' }),
        caNet,
        coutAchat,
        margeBrute,
        tauxMargeBrute: caNet > 0 ? Number(((margeBrute / caNet) * 100).toFixed(1)) : 0,
        commissionsServices,
        depensesMagasin,
        beneficeNetReel,
        tauxBeneficeNet: caNet + commissionsServices > 0 ? Number(((beneficeNetReel / (caNet + commissionsServices)) * 100).toFixed(1)) : 0,
        nombreTickets: daySales.length,
      });
    }
    return records;
  }, [period, sales, services, cashMovements]);

  const periodDateKeys = new Set(financialTimeline.map(record => record.dateKey));
  const periodSales = sales.filter(sale => periodDateKeys.has(localDateKey(sale.createdAt)));
  const periodServices = services.filter(service => periodDateKeys.has(localDateKey(service.date)));

  // Aggregated totals over selected period
  const totalPeriodCA = financialTimeline.reduce((acc, r) => acc + r.caNet, 0);
  const totalPeriodCoutAchat = financialTimeline.reduce((acc, r) => acc + r.coutAchat, 0);
  const totalPeriodMargeBrute = financialTimeline.reduce((acc, r) => acc + r.margeBrute, 0);
  const totalPeriodCommissions = financialTimeline.reduce(
    (acc, r) => acc + r.commissionsServices,
    0
  );
  const totalPeriodDepenses = financialTimeline.reduce((acc, r) => acc + r.depensesMagasin, 0);
  const totalPeriodBeneficeNet = financialTimeline.reduce(
    (acc, r) => acc + r.beneficeNetReel,
    0
  );
  const averagePeriodMarginRate =
    totalPeriodCA > 0 ? ((totalPeriodMargeBrute / totalPeriodCA) * 100).toFixed(1) : '0';
  const netRateBase = totalPeriodCA + totalPeriodCommissions;
  const averagePeriodNetRate = netRateBase > 0
    ? ((totalPeriodBeneficeNet / netRateBase) * 100).toFixed(1)
    : '0';
  const costOfSalesRate = totalPeriodCA > 0 ? (totalPeriodCoutAchat / totalPeriodCA) * 100 : 0;

  // Category margins come from sold line snapshots and recorded service commissions only.
  const categoryProfitData = useMemo(() => {
    const categoryMap = new Map<string, { ca: number; cout: number; marge: number }>();
    for (const sale of periodSales) {
      for (const line of sale.lignes) {
        const category = products.find(product => product.id === line.produitId)?.categorie || 'Produit archivé';
        const current = categoryMap.get(category) || { ca: 0, cout: 0, marge: 0 };
        const lineNet = line.totalLigne - (sale.totalBrut > 0 ? sale.remise * (line.totalLigne / sale.totalBrut) : 0);
        const lineCost = (line.coutTotal ?? line.coutUnitaire * line.quantite);
        current.ca += lineNet;
        current.cout += lineCost;
        current.marge += lineNet - lineCost;
        categoryMap.set(category, current);
      }
    }
    const serviceCommission = periodServices.reduce((sum, service) => sum + service.commission, 0);
    if (serviceCommission !== 0) categoryMap.set('Commissions multiservices', { ca: serviceCommission, cout: 0, marge: serviceCommission });
    return Array.from(categoryMap.entries()).map(([category, values]) => ({
      category,
      ca: values.ca,
      marge: values.marge,
      cout: values.cout,
      taux: values.ca > 0 ? Math.round((values.marge / values.ca) * 100) : 0,
    }));
  }, [periodSales, periodServices, products]);

  // Product ranking uses only actual sold quantities in the selected period.
  const topProfitableProducts = useMemo(() => {
    const productMap = new Map<string, { quantity: number; ca: number; cost: number; priceTotal: number; purchaseTotal: number }>();
    for (const sale of periodSales) {
      for (const line of sale.lignes) {
        const current = productMap.get(line.produitId) || { quantity: 0, ca: 0, cost: 0, priceTotal: 0, purchaseTotal: 0 };
        const lineNet = line.totalLigne - (sale.totalBrut > 0 ? sale.remise * (line.totalLigne / sale.totalBrut) : 0);
        current.quantity += line.quantite;
        current.ca += lineNet;
        current.cost += (line.coutTotal ?? line.coutUnitaire * line.quantite);
        current.priceTotal += line.prixUnitaire * line.quantite;
        current.purchaseTotal += (line.coutTotal ?? line.coutUnitaire * line.quantite);
        productMap.set(line.produitId, current);
      }
    }
    return Array.from(productMap.entries()).map(([id, values]) => {
      const product = products.find(item => item.id === id);
      const totalMarge = values.ca - values.cost;
      return {
        id,
        nom: product?.nom || periodSales.flatMap(sale => sale.lignes).find(line => line.produitId === id)?.nomProduit || 'Produit archivé',
        categorie: product?.categorie || 'Produit archivé',
        unite: product?.unite || 'PIECE',
        prixAchat: values.quantity > 0 ? values.purchaseTotal / values.quantity : 0,
        prixVente: values.quantity > 0 ? values.priceTotal / values.quantity : 0,
        margeUnitaire: values.quantity > 0 ? totalMarge / values.quantity : 0,
        volumeVente: values.quantity,
        totalCa: values.ca,
        totalCout: values.cost,
        totalMarge,
        tauxMarge: values.ca > 0 ? Number(((totalMarge / values.ca) * 100).toFixed(1)) : 0,
      };
    }).sort((a, b) => b.totalMarge - a.totalMarge).slice(0, 8);
  }, [periodSales, products]);

  // Export CSV of Financial Report
  const handleExportFinancialCsv = () => {
    const lines: string[] = [];
    const dateStr = localDateKey(new Date());
    const row = (...cells: Array<string | number | undefined | null>) => cells.map(escapeCsvCell).join(';');

    lines.push(row(settings.organizationName || 'Organisation non renseignée', 'RAPPORT FINANCIER & ANALYSE DU BÉNÉFICE NET'));
    lines.push(row('Date d’export', new Date().toLocaleString('fr-CD')));
    lines.push(row('Période analysée', period === '7J' ? '7 derniers jours' : period === '14J' ? '14 jours' : '30 jours'));
    lines.push(row('Devise des montants comptabilisés', 'CDF'));
    lines.push('');

    lines.push('=== 1. SYNTHÈSE DE LA PÉRIODE ===');
    lines.push(row('Chiffre d’affaires net total (CDF)', totalPeriodCA));
    lines.push(row('Coût d’achat des marchandises vendues (CDF)', totalPeriodCoutAchat));
    lines.push(row('Marge commerciale brute (CDF)', totalPeriodMargeBrute));
    lines.push(row('Taux de marge brute moyen', `${averagePeriodMarginRate}%`));
    lines.push(row('Commissions multiservices nettes (CDF)', totalPeriodCommissions));
    lines.push(row('Dépenses et charges d’exploitation (CDF)', totalPeriodDepenses));
    lines.push(row('Bénéfice net réel dégagé (CDF)', totalPeriodBeneficeNet));
    lines.push(row('Taux de rentabilité nette', `${averagePeriodNetRate}%`));
    lines.push('');

    lines.push('=== 2. TABLEAU CHRONOLOGIQUE DU BÉNÉFICE NET QUOTIDIEN ===');
    lines.push('Jour;Date;CA net (CDF);Coût d’achat (CDF);Marge brute (CDF);Taux marge (%);Commissions (CDF);Dépenses magasin (CDF);Bénéfice net réel (CDF);Taux net (%)');
    financialTimeline.forEach(record => {
      lines.push(row(
        record.dayLabel, record.dateStr, record.caNet, record.coutAchat, record.margeBrute,
        `${record.tauxMargeBrute}%`, record.commissionsServices, record.depensesMagasin,
        record.beneficeNetReel, `${record.tauxBeneficeNet}%`,
      ));
    });

    lines.push('');
    lines.push('=== 3. TOP PRODUITS CONTRIBUTEURS À LA MARGE ===');
    lines.push('Produit;Catégorie;Prix achat (CDF);Prix vente (CDF);Marge unitaire (CDF);Quantité vendue;CA total (CDF);Coût total (CDF);Bénéfice généré (CDF);Taux (%)');
    topProfitableProducts.forEach(product => {
      lines.push(row(
        product.nom, product.categorie, product.prixAchat, product.prixVente,
        product.margeUnitaire, product.volumeVente, product.totalCa, product.totalCout,
        product.totalMarge, `${product.tauxMarge}%`,
      ));
    });

    downloadCsvFile(lines.join('\r\n'), `FANA-Rapport-Financier-Benefice-${dateStr}.csv`);
    posAudio.playSuccess();
    setToastMessage('Rapport financier exporté en CSV avec succès !');
    setTimeout(() => setToastMessage(null), 3000);
  };

  // Custom Tooltip for Recharts
  const FinancialCustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      const dataItem = payload[0].payload as DailyFinancialRecord;
      return (
        <div className="bg-slate-950/95 border border-slate-700 rounded-xl p-3 shadow-2xl backdrop-blur-md text-xs space-y-1.5 min-w-[210px]">
          <div className="flex items-center justify-between border-b border-slate-800 pb-1.5">
            <span className="font-bold text-white text-xs">{dataItem.dayLabel}</span>
            <span className="text-[10px] text-slate-400 font-mono">{dataItem.dateStr}</span>
          </div>

          <div className="space-y-1 pt-0.5">
            <div className="flex justify-between items-center text-orange-400">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-orange-500" />
                Chiffre d'Affaires :
              </span>
              <span className="font-mono font-bold">{formatMoney(dataItem.caNet)}</span>
            </div>

            <div className="flex justify-between items-center text-slate-300">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-slate-500" />
                Coût d'Achat (COGS) :
              </span>
              <span className="font-mono font-bold">{formatMoney(dataItem.coutAchat)}</span>
            </div>

            <div className="flex justify-between items-center text-emerald-400 font-semibold border-t border-slate-800 pt-1">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500" />
                Bénéfice Net Réel :
              </span>
              <span className="font-mono font-extrabold text-sm">
                {formatMoney(dataItem.beneficeNetReel)}
              </span>
            </div>

            <div className="flex justify-between items-center text-[11px] text-slate-400">
              <span>Taux de marge brute :</span>
              <span className="font-mono text-white font-bold">{dataItem.tauxMargeBrute}%</span>
            </div>
          </div>
        </div>
      );
    }
    return null;
  };

  return (
    <div className="flex-1 p-4 lg:p-6 overflow-y-auto space-y-6 bg-slate-900 text-slate-100">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-2xl font-black text-white tracking-tight">Rapport Financier &amp; Marges</h1>
            <span className="text-xs px-2 py-0.5 rounded-md bg-emerald-500/20 text-emerald-400 font-bold border border-emerald-500/30">
              Bénéfice Réel COGS
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Calcul rigoureux du bénéfice net journalier : Chiffre d'affaires déduit du coût d'achat des marchandises (PAMP), charges et commissions.
          </p>
        </div>

        {/* Controls: Time Period & Export */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {/* Period Selector Tabs */}
          <div className="flex items-center bg-slate-850 border border-slate-750 p-1 rounded-xl text-xs font-bold">
            <button
              type="button"
              onClick={() => setPeriod('7J')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                period === '7J'
                  ? 'bg-orange-500 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              7 Jours
            </button>
            <button
              type="button"
              onClick={() => setPeriod('14J')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                period === '14J'
                  ? 'bg-orange-500 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              14 Jours
            </button>
            <button
              type="button"
              onClick={() => setPeriod('30J')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                period === '30J'
                  ? 'bg-orange-500 text-white shadow-xs'
                  : 'text-slate-400 hover:text-white'
              }`}
            >
              30 Jours
            </button>
          </div>

          {/* Export Button */}
          <button
            type="button"
            onClick={handleExportFinancialCsv}
            className="px-3.5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs flex items-center gap-1.5 shadow-md shadow-emerald-600/20 transition-all"
            title="Télécharger le rapport financier en CSV"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>
        </div>
      </div>

      {toastMessage && (
        <div className="p-3 bg-emerald-950/80 border border-emerald-800 text-emerald-300 rounded-xl text-xs font-semibold flex items-center justify-between animate-in fade-in">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span>{toastMessage}</span>
          </div>
          <button onClick={() => setToastMessage(null)} className="text-emerald-400 hover:text-white">
            ✕
          </button>
        </div>
      )}

      {/* 4 Financial Equation Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Card 1: CA Net Total */}
        <div className="p-4 rounded-2xl bg-slate-850 border border-slate-750 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Chiffre d'Affaires Net</span>
            <div className="w-8 h-8 rounded-lg bg-orange-500/10 text-orange-400 flex items-center justify-center">
              <ShoppingBag className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-white font-mono">{formatMoney(totalPeriodCA)}</div>
            <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-1">
              <span>Moyenne :</span>
              <span className="font-bold text-slate-200 font-mono">
                {formatMoney(Math.round(totalPeriodCA / financialTimeline.length))} / jour
              </span>
            </div>
          </div>
        </div>

        {/* Card 2: Coût d'Achat des Marchandises (COGS) */}
        <div className="p-4 rounded-2xl bg-slate-850 border border-slate-750 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Coût d'Achat (COGS)</span>
            <div className="w-8 h-8 rounded-lg bg-slate-800 text-slate-300 flex items-center justify-center">
              <Minus className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-slate-300 font-mono">
              {formatMoney(totalPeriodCoutAchat)}
            </div>
            <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-1">
              <span>Part du CA :</span>
              <span className="font-bold text-slate-200 font-mono">
                {costOfSalesRate.toFixed(1)}%
              </span>
            </div>
          </div>
        </div>

        {/* Card 3: Marge Commerciale Brute */}
        <div className="p-4 rounded-2xl bg-slate-850 border border-slate-750 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 mb-2">
            <span className="text-xs font-semibold uppercase tracking-wider">Marge Commerciale</span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 text-emerald-400 flex items-center justify-center">
              <Percent className="w-4 h-4" />
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-emerald-400 font-mono">
              {formatMoney(totalPeriodMargeBrute)}
            </div>
            <div className="flex items-center gap-1 text-[11px] text-slate-400 mt-1">
              <span>Taux de marge brute :</span>
              <span className="font-bold text-white font-mono">{averagePeriodMarginRate}%</span>
            </div>
          </div>
        </div>

        {/* Card 4: Bénéfice Net Réel d'Exploitation */}
        <div className="p-4 rounded-2xl bg-gradient-to-br from-emerald-950/60 via-slate-850 to-slate-850 border border-emerald-500/50 shadow-lg shadow-emerald-950/20 flex flex-col justify-between ring-1 ring-emerald-500/30">
          <div className="flex items-center justify-between text-slate-300 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">
              Bénéfice Net Réel
            </span>
            <div className="w-8 h-8 rounded-lg bg-emerald-500 text-slate-950 font-black flex items-center justify-center text-xs">
              NET
            </div>
          </div>
          <div>
            <div className="text-2xl font-black text-white font-mono tracking-tight">
              {formatMoney(totalPeriodBeneficeNet)}
            </div>
            <div className="flex items-center gap-1 text-[11px] text-emerald-300 mt-1">
              <span>Rentabilité nette globale :</span>
              <span className="font-extrabold font-mono text-white">{averagePeriodNetRate}%</span>
            </div>
          </div>
        </div>
      </div>

      {/* Accounting Breakdown Equation Banner */}
      <div className="p-3.5 bg-slate-950 rounded-2xl border border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-300">Formule Comptable F.A.N.A :</span>
          <span className="text-slate-400 font-mono">
            [CA Net ({formatCurrencyShort(totalPeriodCA)})] - [Achats ({formatCurrencyShort(totalPeriodCoutAchat)})] + [Commissions Multiservices (+{formatCurrencyShort(totalPeriodCommissions)})] - [Charges/Sorties (-{formatCurrencyShort(totalPeriodDepenses)})] = <strong className="text-emerald-400 font-extrabold">Bénéfice Net ({formatCurrencyShort(totalPeriodBeneficeNet)})</strong>
          </span>
        </div>
        <span className="text-[10px] text-slate-500">Période : {period}</span>
      </div>

      {/* Main Recharts Visualizations */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recharts Chart 1: Profit & COGS Evolution */}
        <div className="lg:col-span-2 p-5 bg-slate-850 border border-slate-750 rounded-2xl space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-400" />
                <h3 className="font-black text-white text-base">
                  {activeChartTab === 'PROFIT_FLOW'
                    ? "Flux Financiers : CA vs Coût d'Achat vs Bénéfice Net"
                    : activeChartTab === 'MARGIN_RATE'
                    ? "Évolution du Taux de Marge Nette (%)"
                    : 'Répartition de la Marge par Rayon'}
                </h3>
              </div>
              <p className="text-xs text-slate-400 mt-0.5">
                Visualisation interactive générée avec Recharts pour la période de {period}.
              </p>
            </div>

            {/* Chart Sub-tabs */}
            <div className="flex items-center gap-1 bg-slate-900 border border-slate-750 p-1 rounded-xl text-xs">
              <button
                type="button"
                onClick={() => setActiveChartTab('PROFIT_FLOW')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                  activeChartTab === 'PROFIT_FLOW'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Flux de Bénéfice
              </button>
              <button
                type="button"
                onClick={() => setActiveChartTab('MARGIN_RATE')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                  activeChartTab === 'MARGIN_RATE'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Taux Marge %
              </button>
              <button
                type="button"
                onClick={() => setActiveChartTab('CATEGORY_MARGIN')}
                className={`px-2.5 py-1 rounded-lg font-bold transition-all ${
                  activeChartTab === 'CATEGORY_MARGIN'
                    ? 'bg-emerald-600 text-white shadow-xs'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                Par Rayon
              </button>
            </div>
          </div>

          {/* Chart Display Area */}
          <div className="h-72 w-full pt-2">
            <ResponsiveContainer width="100%" height="100%">
              {activeChartTab === 'PROFIT_FLOW' ? (
                <AreaChart data={financialTimeline} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <defs>
                    <linearGradient id="profitGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.4} />
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="caGrad" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#F97316" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#F97316" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>

                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} vertical={false} />

                  <XAxis
                    dataKey="dayLabel"
                    stroke="#94A3B8"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: '#334155' }}
                  />

                  <YAxis
                    stroke="#94A3B8"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={val => formatCurrencyShort(val)}
                  />

                  <Tooltip content={<FinancialCustomTooltip />} />

                  <Legend
                    verticalAlign="top"
                    align="right"
                    iconType="circle"
                    wrapperStyle={{ paddingBottom: 10, fontSize: 11 }}
                  />

                  <Area
                    type="monotone"
                    dataKey="caNet"
                    name="Chiffre d'Affaires Net"
                    stroke="#F97316"
                    strokeWidth={2.5}
                    fillOpacity={1}
                    fill="url(#caGrad)"
                  />

                  <Area
                    type="monotone"
                    dataKey="coutAchat"
                    name="Coût d'Achat (COGS)"
                    stroke="#64748B"
                    strokeWidth={2}
                    strokeDasharray="3 3"
                    fill="transparent"
                  />

                  <Area
                    type="monotone"
                    dataKey="beneficeNetReel"
                    name="Bénéfice Net Réel"
                    stroke="#10B981"
                    strokeWidth={3}
                    fillOpacity={1}
                    fill="url(#profitGrad)"
                  />
                </AreaChart>
              ) : activeChartTab === 'MARGIN_RATE' ? (
                <LineChart data={financialTimeline} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} vertical={false} />

                  <XAxis
                    dataKey="dayLabel"
                    stroke="#94A3B8"
                    fontSize={11}
                    tickLine={false}
                    axisLine={{ stroke: '#334155' }}
                  />

                  <YAxis
                    stroke="#94A3B8"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={val => `${val}%`}
                  />

                  <Tooltip
                    formatter={(value: any) => [`${value}%`, 'Taux de Marge']}
                    contentStyle={{ backgroundColor: '#020617', borderColor: '#334155', borderRadius: '12px' }}
                  />

                  <Line
                    type="monotone"
                    dataKey="tauxMargeBrute"
                    name="Taux Marge Brute (%)"
                    stroke="#10B981"
                    strokeWidth={3}
                    dot={{ r: 4, fill: '#10B981', stroke: '#0F172A', strokeWidth: 2 }}
                    activeDot={{ r: 7 }}
                  />

                  <Line
                    type="monotone"
                    dataKey="tauxBeneficeNet"
                    name="Taux Bénéfice Net (%)"
                    stroke="#38BDF8"
                    strokeWidth={2.5}
                    strokeDasharray="4 2"
                    dot={{ r: 3, fill: '#38BDF8' }}
                  />
                </LineChart>
              ) : (
                <BarChart data={categoryProfitData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" opacity={0.4} vertical={false} />
                  <XAxis
                    dataKey="category"
                    stroke="#94A3B8"
                    fontSize={10}
                    tickLine={false}
                    axisLine={{ stroke: '#334155' }}
                  />
                  <YAxis
                    stroke="#94A3B8"
                    fontSize={10}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={val => formatCurrencyShort(val)}
                  />
                  <Tooltip
                    formatter={(val: any) => formatMoney(val)}
                    contentStyle={{ backgroundColor: '#020617', borderColor: '#334155', borderRadius: '12px' }}
                  />
                  <Legend verticalAlign="top" align="right" wrapperStyle={{ fontSize: 11 }} />
                  <Bar dataKey="ca" name="CA Réalisé" fill="#F97316" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="marge" name="Marge Dégagée" fill="#10B981" radius={[4, 4, 0, 0]} />
                </BarChart>
              )}
            </ResponsiveContainer>
          </div>
        </div>

        {/* Profitability Health & Key Ratios */}
        <div className="p-5 bg-slate-850 border border-slate-750 rounded-2xl flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center gap-2">
              <PieIcon className="w-5 h-5 text-emerald-400" />
              <h3 className="font-bold text-white text-base">Ratios de Rentabilité</h3>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">Indicateurs clés de gestion commerciale</p>

            <div className="mt-4 space-y-3">
              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                <div className="flex justify-between items-baseline text-xs mb-1">
                  <span className="text-slate-400">Taux de Marge Brute Moyen :</span>
                  <span className="text-base font-black text-emerald-400 font-mono">
                    {averagePeriodMarginRate}%
                  </span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-emerald-500 h-full rounded-full"
                    style={{ width: `${Math.min(100, Math.max(0, parseFloat(averagePeriodMarginRate) * 2.5))}%` }}
                  />
                </div>
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Taux calculé sur le chiffre d’affaires et le coût des articles réellement vendus.
                </span>
              </div>

              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                <div className="flex justify-between items-baseline text-xs mb-1">
                  <span className="text-slate-400">Coût d'Achat Marchandises (COGS) :</span>
                  <span className="text-base font-black text-slate-200 font-mono">
                    {costOfSalesRate.toFixed(1)}%
                  </span>
                </div>
                <div className="w-full bg-slate-800 rounded-full h-1.5 overflow-hidden">
                  <div
                    className="bg-slate-500 h-full rounded-full"
                    style={{ width: `${Math.min(100, Math.max(0, costOfSalesRate))}%` }}
                  />
                </div>
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Part du chiffre d'affaires correspondant au coût des articles effectivement vendus.
                </span>
              </div>

              <div className="p-3 bg-slate-900 rounded-xl border border-slate-800">
                <div className="flex justify-between items-baseline text-xs mb-1">
                  <span className="text-slate-400">Bénéfice Net d'Exploitation :</span>
                  <span className="text-base font-black text-emerald-400 font-mono">
                    {averagePeriodNetRate}%
                  </span>
                </div>
                <span className="text-[10px] text-emerald-400/90 block">
                  Rentabilité après déduction des dépenses de caisse et ajout des commissions multiservices.
                </span>
              </div>
            </div>
          </div>

          <div className="p-3 bg-emerald-950/40 border border-emerald-800/60 rounded-xl text-xs text-emerald-300">
            Les ratios ci-dessus sont calculés à partir des ventes et opérations enregistrées pendant la période.
          </div>
        </div>
      </div>

      {/* Top Profitable Products Table */}
      <div className="p-5 bg-slate-850 border border-slate-750 rounded-2xl space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div>
            <h3 className="font-bold text-white text-base">Top Produits Contributeurs au Bénéfice Net</h3>
            <p className="text-xs text-slate-400">Classement des articles dégageant la plus forte valeur ajoutée</p>
          </div>
          <span className="text-xs text-slate-400 font-mono">Top {topProfitableProducts.length} références</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-750">
              <tr>
                <th className="py-2.5 px-3">Article &amp; Rayon</th>
                <th className="py-2.5 px-3 text-right">Prix Achat</th>
                <th className="py-2.5 px-3 text-right">Prix Vente</th>
                <th className="py-2.5 px-3 text-center">Quantité</th>
                <th className="py-2.5 px-3 text-right">CA Généré</th>
                <th className="py-2.5 px-3 text-right">Coût Achat Total</th>
                <th className="py-2.5 px-3 text-right">Bénéfice Dégagé</th>
                <th className="py-2.5 px-3 text-center">Taux Marge</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {topProfitableProducts.map((p, idx) => (
                <tr key={p.id} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-2.5 px-3">
                    <div className="flex items-center gap-2">
                      <span className="w-5 h-5 rounded bg-slate-800 text-slate-400 font-mono font-bold text-[10px] flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <div>
                        <span className="font-bold text-white">{p.nom}</span>
                        <span className="text-[10px] text-slate-400 block">{p.categorie}</span>
                      </div>
                    </div>
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-300">
                    {formatMoney(p.prixAchat)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold text-orange-400">
                    {formatMoney(p.prixVente)}
                  </td>
                  <td className="py-2.5 px-3 text-center font-mono font-bold text-slate-200">
                    {p.volumeVente} {p.unite === 'KG' ? 'kg' : ''}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold text-white">
                    {formatMoney(p.totalCa)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-400">
                    {formatMoney(p.totalCout)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-extrabold text-emerald-400">
                    {formatMoney(p.totalMarge)}
                  </td>
                  <td className="py-2.5 px-3 text-center font-mono">
                    <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-emerald-950/80 text-emerald-300 border border-emerald-800">
                      {p.tauxMarge}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Daily Financial Synthesis Table */}
      <div className="p-5 bg-slate-850 border border-slate-750 rounded-2xl space-y-4">
        <div className="flex items-center justify-between pb-2 border-b border-slate-800">
          <div>
            <h3 className="font-bold text-white text-base">Journal Quotidien du Bénéfice Net Réel</h3>
            <p className="text-xs text-slate-400">Suivi chronologique consolidé jour par jour</p>
          </div>
          <span className="text-xs text-slate-400 font-mono">{financialTimeline.length} journées</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-750">
              <tr>
                <th className="py-2.5 px-3">Date</th>
                <th className="py-2.5 px-3 text-right">CA Net</th>
                <th className="py-2.5 px-3 text-right">Coût Achat (COGS)</th>
                <th className="py-2.5 px-3 text-right">Marge Brute</th>
                <th className="py-2.5 px-3 text-center">Taux Brute</th>
                <th className="py-2.5 px-3 text-right">Commissions</th>
                <th className="py-2.5 px-3 text-right">Dépenses Caisses</th>
                <th className="py-2.5 px-3 text-right">Bénéfice Net Réel</th>
                <th className="py-2.5 px-3 text-center">Taux Net</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {financialTimeline.map((record, index) => (
                <tr key={index} className="hover:bg-slate-800/40 transition-colors">
                  <td className="py-2.5 px-3 font-semibold text-white">
                    <span>{record.dayLabel}</span>
                    <span className="text-[10px] text-slate-400 font-mono block">{record.dateStr}</span>
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold text-orange-400">
                    {formatMoney(record.caNet)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-slate-400">
                    {formatMoney(record.coutAchat)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-bold text-emerald-400">
                    {formatMoney(record.margeBrute)}
                  </td>
                  <td className="py-2.5 px-3 text-center font-mono text-slate-300">
                    {record.tauxMargeBrute}%
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-sky-400 font-bold">
                    {formatMoney(record.commissionsServices)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono text-red-400">
                    {record.depensesMagasin > 0 ? `-${formatMoney(record.depensesMagasin)}` : formatMoney(0)}
                  </td>
                  <td className="py-2.5 px-3 text-right font-mono font-black text-sm text-emerald-400">
                    {formatMoney(record.beneficeNetReel)}
                  </td>
                  <td className="py-2.5 px-3 text-center font-mono">
                    <span className="px-2 py-0.5 rounded font-bold text-[10px] bg-emerald-950/80 text-emerald-300 border border-emerald-800">
                      {record.tauxBeneficeNet}%
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
