import { randomUUID } from 'node:crypto';
import type { AppUser, BonReception, CaisseSession, Client, Currency, FlotteSolde, Fournisseur, Lot, MouvementCaisse, ParkedCart, PaymentMethod, Produit, ReglementFournisseur, ServiceCatalogItem, ServiceCatalogType, ServiceTransaction, Vente, WorkspaceSettings } from '../../src/types';
import { ApiError } from './http';
import { productImageUrl, saveProductImage } from './productImages';

const ZERO_FLOAT: FlotteSolde = { mpesa: 0, orangeMoney: 0, airtelMoney: 0, afrimoney: 0 };
const EMPTY_SESSION: CaisseSession = {
  id: '', dateOuverture: '', fondOuverture: 0, statut: 'CLOTUREE', ouvertPar: '',
  totalEspecesAttendu: 0, totalMpesa: 0, totalOrangeMoney: 0, totalAirtelMoney: 0,
  totalAfrimoney: 0, totalCreditAccorde: 0, totalEntreesDiverses: 0, totalSortiesDiverses: 0,
};
const COLLECTIONS = [
  'products', 'clients', 'suppliers', 'sales', 'services', 'service_catalog', 'cash_sessions', 'cash_movements',
  'deliveries', 'supplier_payments', 'parked_carts', 'float_balances',
] as const;
type Collection = typeof COLLECTIONS[number];

function id(prefix: string): string {
  return `${prefix}_${randomUUID()}`;
}
function asNumber(value: unknown, label: string, options: { min?: number; allowZero?: boolean } = {}): number {
  const number = typeof value === 'number' ? value : Number(value);
  if (!Number.isFinite(number) || (options.allowZero ? number < 0 : number <= 0)) {
    throw new ApiError(400, `${label} ${options.allowZero ? 'doit être un nombre positif ou nul.' : 'doit être supérieur à zéro.'}`);
  }
  if (options.min !== undefined && number < options.min) throw new ApiError(400, `${label} est trop petit.`);
  return number;
}
function text(value: unknown, label: string, min = 1, max = 160, required = true): string {
  const valueText = typeof value === 'string' ? value.trim() : '';
  if (!valueText && !required) return '';
  if (valueText.length < min || valueText.length > max) throw new ApiError(400, `${label} doit contenir entre ${min} et ${max} caractères.`);
  return valueText;
}
function validDate(value: unknown, label: string): string {
  const date = typeof value === 'string' ? value.trim() : '';
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || Number.isNaN(new Date(`${date}T00:00:00Z`).getTime())) {
    throw new ApiError(400, `${label} doit être une date valide.`);
  }
  return date;
}
function paymentMethod(value: unknown, allowCredit = true): PaymentMethod {
  const allowed: PaymentMethod[] = allowCredit
    ? ['ESPECE', 'MPESA', 'ORANGE_MONEY', 'AIRTEL_MONEY', 'AFRIMONEY', 'CREDIT']
    : ['ESPECE', 'MPESA', 'ORANGE_MONEY', 'AIRTEL_MONEY', 'AFRIMONEY'];
  if (!allowed.includes(value as PaymentMethod)) throw new ApiError(400, 'Mode de règlement invalide.');
  return value as PaymentMethod;
}
function normalizeFloat(data: any): FlotteSolde {
  return {
    mpesa: Number(data?.mpesa) || 0,
    orangeMoney: Number(data?.orangeMoney) || 0,
    airtelMoney: Number(data?.airtelMoney) || 0,
    afrimoney: Number(data?.afrimoney) || 0,
  };
}
function normalizeSession(data: any): CaisseSession {
  return { ...EMPTY_SESSION, ...(data || {}) };
}
function dataOf(row: any): any {
  if (!row) return null;
  return typeof row.data === 'string' ? JSON.parse(row.data) : row.data;
}

async function getRecord(client: any, organizationId: string, collection: Collection, recordId: string, lock = false): Promise<any | null> {
  const rows = lock
    ? await client`SELECT data FROM fana_records WHERE organization_id = ${organizationId} AND collection = ${collection} AND id = ${recordId} FOR UPDATE`
    : await client`SELECT data FROM fana_records WHERE organization_id = ${organizationId} AND collection = ${collection} AND id = ${recordId}`;
  return rows[0] ? dataOf(rows[0]) : null;
}
async function putRecord(client: any, organizationId: string, collection: Collection, recordId: string, value: any): Promise<void> {
  await client`
    INSERT INTO fana_records (organization_id, collection, id, data)
    VALUES (${organizationId}, ${collection}, ${recordId}, ${JSON.stringify(value)}::jsonb)
    ON CONFLICT (organization_id, collection, id)
    DO UPDATE SET data = EXCLUDED.data, updated_at = now()
  `;
}
async function insertRecord(client: any, organizationId: string, collection: Collection, recordId: string, value: any): Promise<void> {
  await client`
    INSERT INTO fana_records (organization_id, collection, id, data)
    VALUES (${organizationId}, ${collection}, ${recordId}, ${JSON.stringify(value)}::jsonb)
  `;
}
async function getOpenSession(client: any, organizationId: string, lock = false): Promise<CaisseSession | null> {
  const rows = lock
    ? await client`SELECT id, data FROM fana_records WHERE organization_id = ${organizationId} AND collection = 'cash_sessions' AND data->>'statut' = 'OUVERTE' ORDER BY created_at DESC LIMIT 1 FOR UPDATE`
    : await client`SELECT id, data FROM fana_records WHERE organization_id = ${organizationId} AND collection = 'cash_sessions' AND data->>'statut' = 'OUVERTE' ORDER BY created_at DESC LIMIT 1`;
  if (!rows[0]) return null;
  return normalizeSession({ ...dataOf(rows[0]), id: rows[0].id });
}
async function updateCashForPayment(client: any, organizationId: string, method: PaymentMethod, amount: number): Promise<void> {
  const session = await getOpenSession(client, organizationId, true);
  if (!session) throw new ApiError(409, 'Ouvrez une session de caisse avant d’enregistrer un règlement.');
  const next = { ...session };
  if (method === 'ESPECE') next.totalEspecesAttendu += amount;
  if (method === 'MPESA') next.totalMpesa += amount;
  if (method === 'ORANGE_MONEY') next.totalOrangeMoney += amount;
  if (method === 'AIRTEL_MONEY') next.totalAirtelMoney += amount;
  if (method === 'AFRIMONEY') next.totalAfrimoney += amount;
  await putRecord(client, organizationId, 'cash_sessions', session.id, next);
}
async function getFloat(client: any, organizationId: string, lock = false): Promise<FlotteSolde> {
  const data = await getRecord(client, organizationId, 'float_balances', 'current', lock);
  return normalizeFloat(data);
}
async function saveFloat(client: any, organizationId: string, balance: FlotteSolde): Promise<void> {
  await putRecord(client, organizationId, 'float_balances', 'current', balance);
}
function providerForPayment(method: PaymentMethod): keyof FlotteSolde | null {
  if (method === 'MPESA') return 'mpesa';
  if (method === 'ORANGE_MONEY') return 'orangeMoney';
  if (method === 'AIRTEL_MONEY') return 'airtelMoney';
  if (method === 'AFRIMONEY') return 'afrimoney';
  return null;
}

function normalizeServiceName(name: string): string {
  return name.trim().normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[\s-]+/g, ' ');
}

function providerFor(name: string): keyof FlotteSolde | null {
  const normalized = normalizeServiceName(name);
  if (normalized === 'm pesa' || normalized === 'mpesa') return 'mpesa';
  if (normalized === 'orange money') return 'orangeMoney';
  if (normalized === 'airtel money') return 'airtelMoney';
  if (normalized === 'afrimoney') return 'afrimoney';
  return null;
}

function validateProductInput(input: any): Omit<Produit, 'id' | 'stock' | 'lots'> {
  const nom = text(input?.nom, 'Le nom du produit', 2, 150);
  const ean = typeof input?.ean === 'string' ? input.ean.trim() : '';
  if (ean && !/^[0-9A-Za-z-]{4,32}$/.test(ean)) throw new ApiError(400, 'Le code-barres doit contenir entre 4 et 32 lettres ou chiffres.');
  const categorie = text(input?.categorie, 'La catégorie', 2, 80);
  const unite = input?.unite;
  if (!['PIECE', 'KG', 'LITRE', 'SACHET', 'CARTON'].includes(unite)) throw new ApiError(400, 'Unité de vente invalide.');
  const prixAchat = asNumber(input?.prixAchat, 'Le prix d’achat', { allowZero: true });
  const prixVente = asNumber(input?.prixVente, 'Le prix de vente', { min: 0.0001, allowZero: true });
  const stockAlerte = asNumber(input?.stockAlerte, 'Le seuil d’alerte', { allowZero: true });
  const image = typeof input?.image === 'string' ? input.image : '';
  const rayon = typeof input?.rayon === 'string' ? input.rayon.trim().slice(0, 80) : '';
  return { nom, ean, categorie, prixAchat, prixVente, stockAlerte, unite, rayon, image };
}
async function ensureUniqueEan(client: any, organizationId: string, ean: string, excludeId?: string): Promise<void> {
  if (!ean) return;
  const rows = excludeId
    ? await client`SELECT id FROM fana_records WHERE organization_id = ${organizationId} AND collection = 'products' AND data->>'ean' = ${ean} AND id <> ${excludeId} LIMIT 1`
    : await client`SELECT id FROM fana_records WHERE organization_id = ${organizationId} AND collection = 'products' AND data->>'ean' = ${ean} LIMIT 1`;
  if (rows[0]) throw new ApiError(409, 'Ce code-barres est déjà attribué à un autre produit.');
}

const BUILT_IN_SERVICE_NAMES = [
  'M-Pesa', 'Orange Money', 'Airtel Money', 'Afrimoney',
  'Recharge crédit mobile (saisie manuelle)', 'Photocopie N&B', 'Impression couleur',
];

function validateServiceCatalogType(value: unknown): ServiceCatalogType {
  if (value !== 'PRESTATION' && value !== 'RECHARGE') throw new ApiError(400, 'Type de service invalide.');
  return value;
}

async function ensureUniqueServiceName(client: any, organizationId: string, name: string, excludeId?: string): Promise<void> {
  if (BUILT_IN_SERVICE_NAMES.some(service => normalizeServiceName(service) === normalizeServiceName(name)) || providerFor(name)) {
    throw new ApiError(409, 'Ce service est déjà proposé dans la liste standard.');
  }
  const rows = excludeId
    ? await client`SELECT id FROM fana_records WHERE organization_id = ${organizationId} AND collection = 'service_catalog' AND lower(data->>'nom') = lower(${name}) AND id <> ${excludeId} LIMIT 1`
    : await client`SELECT id FROM fana_records WHERE organization_id = ${organizationId} AND collection = 'service_catalog' AND lower(data->>'nom') = lower(${name}) LIMIT 1`;
  if (rows[0]) throw new ApiError(409, 'Un service personnalisé porte déjà ce nom.');
}
function validateLot(input: any, productId: string, defaultPurchasePrice?: number): Lot {
  const rawPurchasePrice = input?.prixAchat ?? defaultPurchasePrice;
  if (rawPurchasePrice === undefined || rawPurchasePrice === null || rawPurchasePrice === '') {
    throw new ApiError(400, 'Indiquez le coût d’achat réel de ce lot.');
  }
  return {
    id: id('lot'),
    produitId: productId,
    numeroLot: text(input?.numeroLot, 'Le numéro de lot', 1, 80),
    quantite: asNumber(input?.quantite, 'La quantité du lot'),
    dlc: validDate(input?.dlc, 'La date limite'),
    dateReception: validDate(input?.dateReception || new Date().toISOString().slice(0, 10), 'La date de réception'),
    prixAchat: asNumber(rawPurchasePrice, 'Le coût unitaire du lot', { allowZero: true }),
  };
}

export async function readWorkspaceState(db: any, user: AppUser): Promise<any> {
  const [orgRows, rows] = await Promise.all([
    db`SELECT name, settings FROM fana_organizations WHERE id = ${user.organizationId} LIMIT 1`,
    db`SELECT collection, id, data, created_at FROM fana_records WHERE organization_id = ${user.organizationId} ORDER BY created_at DESC`,
  ]);
  const organization = orgRows[0];
  if (!organization) throw new ApiError(404, 'Espace de travail introuvable.');
  const grouped: Record<string, any[]> = {};
  for (const collection of COLLECTIONS) grouped[collection] = [];
  for (const row of rows) {
    if (!grouped[row.collection]) continue;
    const data = dataOf(row);
    grouped[row.collection].push({ ...data, id: row.id });
  }
  const products = grouped.products as Produit[];
  // Migrate older inline data URLs once, then return lightweight same-origin image URLs.
  const legacyImages = products.filter(product => typeof product.image === 'string' && product.image.startsWith('data:image/'));
  if (legacyImages.length) {
    await db.begin(async (tx: any) => {
      for (const product of legacyImages) {
        await saveProductImage(tx, user.organizationId, product.id, product.image || '');
        await putRecord(tx, user.organizationId, 'products', product.id, { ...product, image: '' });
        product.image = '';
      }
    });
  }
  const imageRows = await db`SELECT product_id FROM fana_product_images WHERE organization_id = ${user.organizationId}`;
  const imageIds = new Set<string>(imageRows.map((row: any) => row.product_id));
  for (const product of products) {
    product.image = imageIds.has(product.id) ? productImageUrl(product.id) : '';
  }
  const productById = new Map(products.map(product => [product.id, product]));
  const parkedCarts: ParkedCart[] = grouped.parked_carts.map(cart => ({
    ...cart,
    items: (cart.items || []).map((item: any) => {
      const product = productById.get(item.productId);
      if (!product) return null;
      return { produit: product, quantite: item.quantite, prixUnitaire: item.prixUnitaire };
    }).filter(Boolean),
  }));
  const sessionRows = grouped.cash_sessions as CaisseSession[];
  const currentSession = sessionRows[0] ? normalizeSession(sessionRows[0]) : { ...EMPTY_SESSION };
  const cashMovements = (grouped.cash_movements as MouvementCaisse[]).map(movement => ({
    ...movement,
    // Older supplier and stock-purchase outflows are balance-sheet movements, not operating expenses.
    impactBenefice: movement.impactBenefice ?? !/Achat de stock|Règlement fournisseur/i.test(movement.motif || ''),
  }));
  const settings = typeof organization.settings === 'string' ? JSON.parse(organization.settings) : organization.settings;
  const safeRate = Number(settings?.usdRate);

  return {
    settings: {
      currency: settings?.currency === 'USD' ? 'USD' : 'CDF',
      usdRate: Number.isFinite(safeRate) && safeRate > 0 ? safeRate : null,
      organizationName: organization.name,
    } satisfies WorkspaceSettings & { organizationName: string },
    products,
    clients: grouped.clients as Client[],
    suppliers: grouped.suppliers as Fournisseur[],
    sales: grouped.sales as Vente[],
    services: grouped.services as ServiceTransaction[],
    serviceCatalog: grouped.service_catalog as ServiceCatalogItem[],
    caisseSession: currentSession,
    cashSessions: sessionRows,
    mouvementsCaisse: cashMovements.filter(movement => movement.sessionId === currentSession.id),
    cashMovements,
    bonsReception: grouped.deliveries as BonReception[],
    reglementsFournisseurs: grouped.supplier_payments as ReglementFournisseur[],
    parkedCarts,
    flotteSolde: normalizeFloat(grouped.float_balances[0]),
  };
}

export async function handleWorkspaceAction(db: any, user: AppUser, body: Record<string, any>): Promise<any> {
  const action = typeof body.action === 'string' ? body.action : '';
  const orgId = user.organizationId;
  const managerOnly = ['addProduct', 'updateProduct', 'deleteProduct', 'addLot', 'addClient', 'updateClient', 'addSupplier', 'updateSupplier', 'receiveGoods', 'paySupplier', 'adjustFloat', 'openCash', 'closeCash', 'cashMovement', 'updateSettings', 'addServiceCatalogItem', 'updateServiceCatalogItem', 'deleteServiceCatalogItem'];
  if (managerOnly.includes(action) && user.role === 'CAISSIER') {
    throw new ApiError(403, 'Cette action est réservée au gérant du magasin.', 'FORBIDDEN');
  }

  await db.begin(async (tx: any) => {
    if (action === 'addServiceCatalogItem') {
      const nom = text(body.nom, 'Le nom du service', 2, 100);
      const type = validateServiceCatalogType(body.type);
      await ensureUniqueServiceName(tx, orgId, nom);
      const service: ServiceCatalogItem = { id: id('svcdef'), nom, type };
      await insertRecord(tx, orgId, 'service_catalog', service.id, service);
      return;
    }

    if (action === 'updateServiceCatalogItem') {
      const serviceId = text(body.id, 'Service', 1, 100);
      const current = await getRecord(tx, orgId, 'service_catalog', serviceId, true);
      if (!current) throw new ApiError(404, 'Service personnalisé introuvable.');
      const nom = text(body.nom, 'Le nom du service', 2, 100);
      const type = validateServiceCatalogType(body.type);
      await ensureUniqueServiceName(tx, orgId, nom, serviceId);
      await putRecord(tx, orgId, 'service_catalog', serviceId, { id: serviceId, nom, type });
      return;
    }

    if (action === 'deleteServiceCatalogItem') {
      const serviceId = text(body.id, 'Service', 1, 100);
      const current = await getRecord(tx, orgId, 'service_catalog', serviceId, true);
      if (!current) throw new ApiError(404, 'Service personnalisé introuvable.');
      await tx`DELETE FROM fana_records WHERE organization_id = ${orgId} AND collection = 'service_catalog' AND id = ${serviceId}`;
      return;
    }

    if (action === 'addProduct') {
      const productInput = validateProductInput(body.product);
      await ensureUniqueEan(tx, orgId, productInput.ean);
      const productId = id('prod');
      const image = productInput.image;
      const initialLotInput = body.initialLot;
      let lots: Lot[] = [];
      let stock = 0;
      if (initialLotInput && Number(initialLotInput.quantite) > 0) {
        const lot = validateLot(initialLotInput, productId, productInput.prixAchat);
        lots = [lot];
        stock = lot.quantite;
      }
      await saveProductImage(tx, orgId, productId, image || '');
      const product: Produit = { ...productInput, image: '', id: productId, stock, lots };
      await insertRecord(tx, orgId, 'products', productId, product);
      return;
    }

    if (action === 'updateProduct') {
      const productId = text(body.id, 'Produit', 1, 80);
      const current = await getRecord(tx, orgId, 'products', productId, true);
      if (!current) throw new ApiError(404, 'Produit introuvable.');
      const productInput = validateProductInput(body.product);
      await ensureUniqueEan(tx, orgId, productInput.ean, productId);
      await saveProductImage(tx, orgId, productId, productInput.image || '');
      await putRecord(tx, orgId, 'products', productId, { ...current, ...productInput, image: '', id: productId });
      return;
    }

    if (action === 'deleteProduct') {
      const productId = text(body.id, 'Produit', 1, 80);
      await tx`DELETE FROM fana_records WHERE organization_id = ${orgId} AND collection = 'products' AND id = ${productId}`;
      await tx`DELETE FROM fana_product_images WHERE organization_id = ${orgId} AND product_id = ${productId}`;
      return;
    }

    if (action === 'addLot') {
      const productId = text(body.productId, 'Produit', 1, 80);
      const product = await getRecord(tx, orgId, 'products', productId, true);
      if (!product) throw new ApiError(404, 'Produit introuvable.');
      const lot = validateLot(body.lot, productId);
      await putRecord(tx, orgId, 'products', productId, {
        ...product,
        lots: [...(product.lots || []), lot],
        stock: Number((Number(product.stock || 0) + lot.quantite).toFixed(3)),
      });
      return;
    }

    if (action === 'addClient') {
      const input = body.client || {};
      const clientId = id('client');
      const client: Client = {
        id: clientId,
        nom: text(input.nom, 'Le nom du client', 2, 120),
        telephone: text(input.telephone, 'Le téléphone', 3, 40),
        adresse: typeof input.adresse === 'string' ? input.adresse.trim().slice(0, 180) : '',
        credit: 0,
        plafondCredit: asNumber(input.plafondCredit, 'Le plafond de crédit', { allowZero: true }),
        historiquePaiements: [],
      };
      await insertRecord(tx, orgId, 'clients', clientId, client);
      return;
    }

    if (action === 'updateClient') {
      const clientId = text(body.id, 'Client', 1, 80);
      const current = await getRecord(tx, orgId, 'clients', clientId, true);
      if (!current) throw new ApiError(404, 'Client introuvable.');
      const input = body.client || {};
      await putRecord(tx, orgId, 'clients', clientId, {
        ...current,
        nom: text(input.nom, 'Le nom du client', 2, 120),
        telephone: text(input.telephone, 'Le téléphone', 3, 40),
        adresse: typeof input.adresse === 'string' ? input.adresse.trim().slice(0, 180) : '',
        plafondCredit: asNumber(input.plafondCredit, 'Le plafond de crédit', { allowZero: true }),
      });
      return;
    }

    if (action === 'payClient') {
      const clientId = text(body.clientId, 'Client', 1, 80);
      const amount = asNumber(body.montant, 'Le montant', { min: 0.01 });
      const mode = paymentMethod(body.mode, false);
      const client = await getRecord(tx, orgId, 'clients', clientId, true);
      if (!client) throw new ApiError(404, 'Client introuvable.');
      if (amount > Number(client.credit || 0) + 0.0001) throw new ApiError(400, 'Le règlement dépasse la dette actuelle du client.');
      const payment = { id: id('pay'), date: new Date().toISOString(), montant: amount, mode, note: typeof body.note === 'string' ? body.note.trim().slice(0, 180) : '' };
      await putRecord(tx, orgId, 'clients', clientId, {
        ...client,
        credit: Number(Math.max(0, Number(client.credit || 0) - amount).toFixed(2)),
        historiquePaiements: [payment, ...(client.historiquePaiements || [])],
      });
      await updateCashForPayment(tx, orgId, mode, amount);
      return;
    }

    if (action === 'addSupplier') {
      const input = body.supplier || {};
      const supplierId = id('sup');
      const supplier: Fournisseur = {
        id: supplierId,
        nom: text(input.nom, 'Le nom du fournisseur', 2, 120),
        contact: typeof input.contact === 'string' ? input.contact.trim().slice(0, 120) : '',
        telephone: typeof input.telephone === 'string' ? input.telephone.trim().slice(0, 40) : '',
        adresse: typeof input.adresse === 'string' ? input.adresse.trim().slice(0, 180) : '',
        dette: 0,
      };
      await insertRecord(tx, orgId, 'suppliers', supplierId, supplier);
      return;
    }

    if (action === 'updateSupplier') {
      const supplierId = text(body.id, 'Fournisseur', 1, 80);
      const current = await getRecord(tx, orgId, 'suppliers', supplierId, true);
      if (!current) throw new ApiError(404, 'Fournisseur introuvable.');
      const input = body.supplier || {};
      await putRecord(tx, orgId, 'suppliers', supplierId, {
        ...current,
        nom: text(input.nom, 'Le nom du fournisseur', 2, 120),
        contact: typeof input.contact === 'string' ? input.contact.trim().slice(0, 120) : '',
        telephone: typeof input.telephone === 'string' ? input.telephone.trim().slice(0, 40) : '',
        adresse: typeof input.adresse === 'string' ? input.adresse.trim().slice(0, 180) : '',
      });
      return;
    }

    if (action === 'receiveGoods') {
      const input = body.delivery || {};
      const supplierId = text(input.fournisseurId, 'Fournisseur', 1, 80);
      const supplier = await getRecord(tx, orgId, 'suppliers', supplierId, true);
      if (!supplier) throw new ApiError(404, 'Fournisseur introuvable.');
      const articlesInput = Array.isArray(input.articles) ? input.articles : [];
      if (articlesInput.length === 0 || articlesInput.length > 100) throw new ApiError(400, 'Ajoutez au moins un article à la réception (100 maximum).');
      const articles: BonReception['articles'] = [];
      let total = 0;
      for (const articleInput of articlesInput) {
        const productId = text(articleInput.produitId, 'Produit reçu', 1, 80);
        const product = await getRecord(tx, orgId, 'products', productId, true);
        if (!product) throw new ApiError(404, 'Un produit de la réception est introuvable.');
        const quantite = asNumber(articleInput.quantite, 'La quantité reçue');
        const prixAchat = asNumber(articleInput.prixAchat, 'Le coût unitaire', { allowZero: true });
        const numeroLot = text(articleInput.numeroLot, 'Le numéro de lot', 1, 80);
        const dlc = validDate(articleInput.dlc, 'La date limite');
        const lineTotal = quantite * prixAchat;
        total += lineTotal;
        const lot: Lot = { id: id('lot'), produitId: productId, numeroLot, quantite, dlc, dateReception: new Date().toISOString().slice(0, 10), prixAchat };
        await putRecord(tx, orgId, 'products', productId, {
          ...product,
          prixAchat,
          stock: Number((Number(product.stock || 0) + quantite).toFixed(3)),
          lots: [...(product.lots || []), lot],
        });
        articles.push({ produitId: product.id, nomProduit: product.nom, quantite, prixAchat, numeroLot, dlc });
      }
      const paidStatus = input.statutPaiement === 'A_CREDIT' ? 'A_CREDIT' : 'PAYE';
      const modePaiement = paidStatus === 'PAYE' ? paymentMethod(input.modePaiement ?? 'ESPECE', false) : undefined;
      const bon: BonReception = {
        id: id('bon'),
        numeroBon: text(input.numeroBon, 'Le numéro du bon', 2, 80),
        fournisseurId: supplierId,
        nomFournisseur: supplier.nom,
        date: new Date().toISOString(),
        total: Number(total.toFixed(2)),
        statutPaiement: paidStatus,
        modePaiement: modePaiement as Exclude<PaymentMethod, 'CREDIT'> | undefined,
        articles,
      };
      await insertRecord(tx, orgId, 'deliveries', bon.id, bon);
      if (paidStatus === 'A_CREDIT') {
        await putRecord(tx, orgId, 'suppliers', supplierId, { ...supplier, dette: Number((Number(supplier.dette || 0) + total).toFixed(2)) });
      } else {
        const session = await getOpenSession(tx, orgId, true);
        if (!session) throw new ApiError(409, 'Ouvrez une session de caisse avant d’enregistrer un achat payé.');
        if (modePaiement === 'ESPECE') {
          if (session.totalEspecesAttendu + 0.0001 < total) throw new ApiError(409, 'Les espèces disponibles dans la caisse ne suffisent pas pour cet achat.');
          session.totalEspecesAttendu -= total;
          session.totalSortiesDiverses += total;
          await putRecord(tx, orgId, 'cash_sessions', session.id, session);
          const movement: MouvementCaisse = {
            id: id('mvt'), sessionId: session.id, type: 'SORTIE', motif: `Achat de stock · ${bon.numeroBon}`,
            montant: total, date: new Date().toISOString(), responsable: user.name, impactBenefice: false,
          };
          await insertRecord(tx, orgId, 'cash_movements', movement.id, movement);
        } else if (modePaiement) {
          const provider = providerForPayment(modePaiement);
          if (!provider) throw new ApiError(400, 'Mode de règlement mobile non pris en charge.');
          const balance = await getFloat(tx, orgId, true);
          if (balance[provider] + 0.0001 < total) throw new ApiError(409, `Solde ${modePaiement} insuffisant pour régler cet achat.`);
          balance[provider] = Number((balance[provider] - total).toFixed(2));
          await saveFloat(tx, orgId, balance);
        }
      }
      return;
    }

    if (action === 'paySupplier') {
      const supplierId = text(body.supplierId, 'Fournisseur', 1, 80);
      const amount = asNumber(body.montant, 'Le montant du règlement');
      const mode = paymentMethod(body.mode, false);
      const supplier = await getRecord(tx, orgId, 'suppliers', supplierId, true);
      if (!supplier) throw new ApiError(404, 'Fournisseur introuvable.');
      const session = await getOpenSession(tx, orgId, true);
      if (!session) throw new ApiError(409, 'Ouvrez une session de caisse avant d’enregistrer un règlement fournisseur.');
      if (amount > Number(supplier.dette || 0) + 0.0001) throw new ApiError(400, 'Le règlement dépasse la dette enregistrée pour ce fournisseur.');
      const payment: ReglementFournisseur = {
        id: id('reg'), fournisseurId: supplierId, nomFournisseur: supplier.nom, date: new Date().toISOString(),
        montant: amount, mode, avecSortieCaisse: body.avecSortieCaisse === true,
        note: typeof body.note === 'string' ? body.note.trim().slice(0, 180) : '',
      };
      await putRecord(tx, orgId, 'suppliers', supplierId, { ...supplier, dette: Number(Math.max(0, Number(supplier.dette || 0) - amount).toFixed(2)) });
      await insertRecord(tx, orgId, 'supplier_payments', payment.id, payment);
      if (payment.avecSortieCaisse && mode === 'ESPECE') {
        if (session.totalEspecesAttendu + 0.0001 < amount) throw new ApiError(409, 'Le montant dépasse les espèces disponibles dans la caisse.');
        session.totalEspecesAttendu -= amount;
        session.totalSortiesDiverses += amount;
        await putRecord(tx, orgId, 'cash_sessions', session.id, session);
        const movement: MouvementCaisse = {
          id: id('mvt'), sessionId: session.id, type: 'SORTIE', motif: `Règlement fournisseur · ${supplier.nom}`,
          montant: amount, date: new Date().toISOString(), responsable: user.name, impactBenefice: false,
        };
        await insertRecord(tx, orgId, 'cash_movements', movement.id, movement);
      } else if (mode !== 'ESPECE') {
        const provider = providerForPayment(mode);
        if (!provider) throw new ApiError(400, 'Mode de règlement mobile non pris en charge.');
        const balance = await getFloat(tx, orgId, true);
        if (balance[provider] + 0.0001 < amount) throw new ApiError(409, `Solde ${mode} insuffisant pour ce règlement fournisseur.`);
        balance[provider] = Number((balance[provider] - amount).toFixed(2));
        await saveFloat(tx, orgId, balance);
      }
      return;
    }

    if (action === 'finalizeSale') {
      const session = await getOpenSession(tx, orgId, true);
      if (!session) throw new ApiError(409, 'Ouvrez une session de caisse avant d’enregistrer une vente.');
      const inputItems = Array.isArray(body.items) ? body.items : [];
      if (inputItems.length === 0 || inputItems.length > 100) throw new ApiError(400, 'Le panier est vide ou trop volumineux.');
      const mergedItems = new Map<string, number>();
      for (const item of inputItems) {
        const productId = text(item?.productId, 'Produit du panier', 1, 80);
        const quantity = asNumber(item?.quantity, 'La quantité');
        mergedItems.set(productId, Number(((mergedItems.get(productId) || 0) + quantity).toFixed(3)));
      }
      const saleItems: Array<{ product: Produit; quantity: number; lineTotal: number; lineCost: number }> = [];
      for (const [productId, quantity] of mergedItems) {
        const product = await getRecord(tx, orgId, 'products', productId, true) as Produit | null;
        if (!product) throw new ApiError(404, 'Un produit de ce panier n’existe plus.');
        if (Number(product.stock) < quantity) throw new ApiError(409, `Stock insuffisant pour « ${product.nom} » (disponible : ${product.stock}).`);
        const today = new Date().toISOString().slice(0, 10);
        const lots = [...(product.lots || [])].filter(lot => lot.quantite > 0).sort((a, b) => a.dlc.localeCompare(b.dlc));
        const eligibleLots = lots.filter(lot => !lot.dlc || lot.dlc >= today);
        const lotQuantity = eligibleLots.reduce((sum, lot) => sum + Number(lot.quantite || 0), 0);
        if (lots.length > 0 && lotQuantity + 0.0001 < quantity) {
          throw new ApiError(409, `Le stock disponible pour « ${product.nom} » provient de lots périmés ou incomplets. Vérifiez la réception.`);
        }
        let remainingForCost = quantity;
        let lineCost = 0;
        for (const lot of eligibleLots) {
          if (remainingForCost <= 0) break;
          const fromLot = Math.min(Number(lot.quantite || 0), remainingForCost);
          lineCost += fromLot * Number(lot.prixAchat ?? product.prixAchat ?? 0);
          remainingForCost = Number((remainingForCost - fromLot).toFixed(3));
        }
        if (lots.length === 0) lineCost = Number(product.prixAchat || 0) * quantity;
        saleItems.push({ product, quantity, lineTotal: product.prixVente * quantity, lineCost: Number(lineCost.toFixed(2)) });
      }
      const totalBrut = saleItems.reduce((sum, item) => sum + item.lineTotal, 0);
      const discount = asNumber(body.discount ?? 0, 'La remise', { allowZero: true });
      if (discount > totalBrut) throw new ApiError(400, 'La remise ne peut pas dépasser le total du panier.');
      const totalNet = Number((totalBrut - discount).toFixed(2));
      const method = paymentMethod(body.payment);
      const rate = await tx`SELECT settings, name FROM fana_organizations WHERE id = ${orgId} FOR UPDATE`;
      const settings = typeof rate[0]?.settings === 'string' ? JSON.parse(rate[0].settings) : rate[0]?.settings || {};
      const currency: Currency = settings.currency === 'USD' ? 'USD' : 'CDF';
      const usdRate = Number(settings.usdRate) > 0 ? Number(settings.usdRate) : null;
      if (currency === 'USD' && !usdRate) throw new ApiError(409, 'Configurez le taux CDF/USD avant de valider une vente en dollars.');
      const received = body.receivedAmount == null ? totalNet : asNumber(body.receivedAmount, 'Le montant reçu', { allowZero: true });
      if (method === 'ESPECE' && received + 0.0001 < totalNet) throw new ApiError(400, 'Le montant reçu est inférieur au total du ticket.');

      let client: Client | null = null;
      if (method === 'CREDIT') {
        const clientId = text(body.clientId, 'Client', 1, 80);
        client = await getRecord(tx, orgId, 'clients', clientId, true) as Client | null;
        if (!client) throw new ApiError(400, 'Sélectionnez un client pour cette vente à crédit.');
        if (Number(client.credit || 0) + totalNet > Number(client.plafondCredit || 0) + 0.0001) {
          throw new ApiError(409, 'Cette vente dépasserait le plafond de crédit du client.');
        }
      }

      const saleId = id('sale');
      const now = new Date();
      const ticket = `FANA-${now.toISOString().slice(2, 10).replaceAll('-', '')}-${randomUUID().slice(0, 6).toUpperCase()}`;
      const lines = saleItems.map(({ product, quantity, lineTotal, lineCost }) => ({
        id: id('line'), produitId: product.id, nomProduit: product.nom, quantite: quantity,
        prixUnitaire: product.prixVente,
        coutUnitaire: Number((lineCost / quantity).toFixed(6)),
        coutTotal: Number(lineCost.toFixed(2)),
        totalLigne: Number(lineTotal.toFixed(2)), unite: product.unite,
      }));
      const margin = saleItems.reduce((sum, item) => sum + (item.lineTotal - item.lineCost), 0) - discount;
      const sale: Vente = {
        id: saleId, numeroTicket: ticket, createdAt: now.toISOString(), totalBrut: Number(totalBrut.toFixed(2)),
        remise: discount, totalNet, paiement: method, montantRecu: method === 'ESPECE' ? received : totalNet,
        renduMonnaie: method === 'ESPECE' ? Math.max(0, Number((received - totalNet).toFixed(2))) : 0,
        clientId: client?.id, nomClient: client?.nom, caissierId: user.id, nomCaissier: user.name,
        nomMagasin: rate[0]?.name || 'F.A.N.A Multiservices', devise: currency, tauxChange: usdRate,
        referencePaiement: typeof body.referencePaiement === 'string' ? body.referencePaiement.trim().slice(0, 100) : '',
        telephonePaiement: typeof body.telephonePaiement === 'string' ? body.telephonePaiement.trim().slice(0, 40) : '',
        lignes: lines, margeEstimee: Number(margin.toFixed(2)),
      };

      for (const item of saleItems) {
        const product = item.product;
        let quantityRemaining = item.quantity;
        const nextLots = [...(product.lots || [])].sort((a, b) => a.dlc.localeCompare(b.dlc)).map(lot => ({ ...lot }));
        const today = now.toISOString().slice(0, 10);
        for (const lot of nextLots) {
          if (lot.dlc && lot.dlc < today) continue;
          if (quantityRemaining <= 0) break;
          const deducted = Math.min(lot.quantite, quantityRemaining);
          lot.quantite = Number((lot.quantite - deducted).toFixed(3));
          quantityRemaining = Number((quantityRemaining - deducted).toFixed(3));
        }
        const next = {
          ...product,
          stock: Number((Number(product.stock) - item.quantity).toFixed(3)),
          lots: nextLots.filter(lot => lot.quantite > 0),
        };
        await putRecord(tx, orgId, 'products', product.id, next);
      }
      await insertRecord(tx, orgId, 'sales', saleId, sale);
      if (client) {
        await putRecord(tx, orgId, 'clients', client.id, { ...client, credit: Number((Number(client.credit || 0) + totalNet).toFixed(2)) });
      }
      if (method === 'ESPECE') session.totalEspecesAttendu += totalNet;
      if (method === 'MPESA') session.totalMpesa += totalNet;
      if (method === 'ORANGE_MONEY') session.totalOrangeMoney += totalNet;
      if (method === 'AIRTEL_MONEY') session.totalAirtelMoney += totalNet;
      if (method === 'AFRIMONEY') session.totalAfrimoney += totalNet;
      if (method === 'CREDIT') session.totalCreditAccorde += totalNet;
      await putRecord(tx, orgId, 'cash_sessions', session.id, session);
      return;
    }

    if (action === 'addService') {
      const input = body.transaction || {};
      const name = text(input.nom, 'Le service', 2, 100);
      const type = input.type;
      if (!['DEPOT', 'RETRAIT', 'PRESTATION', 'RECHARGE'].includes(type)) throw new ApiError(400, 'Type de service invalide.');
      const amount = asNumber(input.montant, 'Le montant');
      const commission = asNumber(input.commission ?? 0, 'La commission', { allowZero: true });
      const session = await getOpenSession(tx, orgId, true);
      if (!session) throw new ApiError(409, 'Ouvrez une session de caisse avant d’enregistrer une opération multiservices.');
      const provider = providerFor(name);
      const balance = await getFloat(tx, orgId, true);
      if (provider && type === 'DEPOT') {
        if (balance[provider] < amount) throw new ApiError(409, `Solde ${name} insuffisant pour ce dépôt. Enregistrez un réapprovisionnement.`);
        balance[provider] -= amount;
        session.totalEspecesAttendu += amount + commission;
      } else if (provider && type === 'RETRAIT') {
        if (session.totalEspecesAttendu + 0.0001 < amount) throw new ApiError(409, 'Fonds en espèces insuffisants pour ce retrait.');
        balance[provider] += amount;
        session.totalEspecesAttendu += commission - amount;
      } else if (provider && type === 'RECHARGE') {
        if (balance[provider] < amount) throw new ApiError(409, `Solde ${name} insuffisant pour cette recharge.`);
        balance[provider] -= amount;
        session.totalEspecesAttendu += amount + commission;
      } else {
        // For local prestations/recharges, the entered amount already represents the cash received.
        session.totalEspecesAttendu += type === 'PRESTATION' || type === 'RECHARGE' ? amount : amount + commission;
      }
      const organizationRows = await tx`SELECT settings FROM fana_organizations WHERE id = ${orgId}`;
      const organizationSettings = typeof organizationRows[0]?.settings === 'string' ? JSON.parse(organizationRows[0].settings) : organizationRows[0]?.settings || {};
      const transaction: ServiceTransaction = {
        id: id('service'), nom: name, type, montant: amount, commission, date: new Date().toISOString(),
        devise: organizationSettings.currency === 'USD' ? 'USD' : 'CDF',
        tauxChange: Number(organizationSettings.usdRate) > 0 ? Number(organizationSettings.usdRate) : null,
        reference: typeof input.reference === 'string' ? input.reference.trim().slice(0, 100) : '',
        telephoneClient: typeof input.telephoneClient === 'string' ? input.telephoneClient.trim().slice(0, 40) : '',
        effectuePar: user.name,
      };
      await putRecord(tx, orgId, 'cash_sessions', session.id, session);
      if (provider) await saveFloat(tx, orgId, balance);
      await insertRecord(tx, orgId, 'services', transaction.id, transaction);
      return;
    }

    if (action === 'adjustFloat') {
      const provider = body.provider as keyof FlotteSolde;
      if (!['mpesa', 'orangeMoney', 'airtelMoney', 'afrimoney'].includes(provider)) throw new ApiError(400, 'Opérateur de portefeuille invalide.');
      if (body.type !== 'RETRAIT' && body.type !== 'AJOUT') throw new ApiError(400, 'Type d’ajustement du portefeuille invalide.');
      const delta = asNumber(body.delta, 'Le montant de l’ajustement');
      const session = await getOpenSession(tx, orgId, true);
      if (!session) throw new ApiError(409, 'Ouvrez une session de caisse avant d’ajuster un portefeuille mobile.');
      const balance = await getFloat(tx, orgId, true);
      const isWalletWithdrawal = body.type === 'RETRAIT';
      if (isWalletWithdrawal && balance[provider] < delta) throw new ApiError(409, 'Le solde du portefeuille ne peut pas devenir négatif.');
      if (!isWalletWithdrawal && session.totalEspecesAttendu + 0.0001 < delta) throw new ApiError(409, 'Les espèces disponibles ne suffisent pas pour réapprovisionner ce portefeuille.');
      balance[provider] = Number((balance[provider] + (isWalletWithdrawal ? -delta : delta)).toFixed(2));
      session.totalEspecesAttendu = Number((session.totalEspecesAttendu + (isWalletWithdrawal ? delta : -delta)).toFixed(2));
      if (isWalletWithdrawal) session.totalEntreesDiverses += delta;
      else session.totalSortiesDiverses += delta;
      await saveFloat(tx, orgId, balance);
      await putRecord(tx, orgId, 'cash_sessions', session.id, session);
      const providerLabel = { mpesa: 'M-Pesa', orangeMoney: 'Orange Money', airtelMoney: 'Airtel Money', afrimoney: 'Afrimoney' }[provider];
      const movement: MouvementCaisse = {
        id: id('mvt'), sessionId: session.id, type: isWalletWithdrawal ? 'ENTREE' : 'SORTIE',
        motif: `${isWalletWithdrawal ? 'Retrait du portefeuille' : 'Réapprovisionnement du portefeuille'} ${providerLabel}`,
        montant: delta, date: new Date().toISOString(), responsable: user.name, impactBenefice: false,
      };
      await insertRecord(tx, orgId, 'cash_movements', movement.id, movement);
      return;
    }

    if (action === 'openCash') {
      await tx`SELECT id FROM fana_organizations WHERE id = ${orgId} FOR UPDATE`;
      if (await getOpenSession(tx, orgId, true)) throw new ApiError(409, 'Une session de caisse est déjà ouverte.');
      const openingFund = asNumber(body.fondOuverture, 'Le fond de caisse', { allowZero: true });
      const sessionId = id('session');
      const session: CaisseSession = {
        ...EMPTY_SESSION, id: sessionId, dateOuverture: new Date().toISOString(), fondOuverture: openingFund,
        statut: 'OUVERTE', ouvertPar: user.name, totalEspecesAttendu: openingFund,
      };
      await insertRecord(tx, orgId, 'cash_sessions', sessionId, session);
      return;
    }

    if (action === 'closeCash') {
      const sessionId = text(body.sessionId, 'Session de caisse', 1, 100);
      const session = await getRecord(tx, orgId, 'cash_sessions', sessionId, true) as CaisseSession | null;
      if (!session || session.statut !== 'OUVERTE') throw new ApiError(409, 'Cette session de caisse n’est plus ouverte.');
      const actual = asNumber(body.montantReelCompte, 'Le montant compté', { allowZero: true });
      const closed: CaisseSession = {
        ...session, statut: 'CLOTUREE', dateFermeture: new Date().toISOString(), cloturePar: user.name,
        montantReelCompte: actual, ecartCaisse: Number((actual - session.totalEspecesAttendu).toFixed(2)),
        notesCloture: typeof body.notes === 'string' ? body.notes.trim().slice(0, 500) : '',
      };
      await putRecord(tx, orgId, 'cash_sessions', sessionId, closed);
      return;
    }

    if (action === 'cashMovement') {
      const type = body.type;
      if (type !== 'ENTREE' && type !== 'SORTIE') throw new ApiError(400, 'Type de mouvement invalide.');
      const amount = asNumber(body.montant, 'Le montant');
      const motif = text(body.motif, 'Le motif', 2, 180);
      const session = await getOpenSession(tx, orgId, true);
      if (!session) throw new ApiError(409, 'Ouvrez une session de caisse avant d’enregistrer un mouvement.');
      if (type === 'SORTIE' && session.totalEspecesAttendu < amount) throw new ApiError(409, 'Le montant de la sortie dépasse les espèces disponibles dans la caisse.');
      session.totalEspecesAttendu += type === 'ENTREE' ? amount : -amount;
      if (type === 'ENTREE') session.totalEntreesDiverses += amount;
      else session.totalSortiesDiverses += amount;
      await putRecord(tx, orgId, 'cash_sessions', session.id, session);
      const movement: MouvementCaisse = { id: id('mvt'), sessionId: session.id, type, motif, montant: amount, date: new Date().toISOString(), responsable: user.name, impactBenefice: type === 'SORTIE' };
      await insertRecord(tx, orgId, 'cash_movements', movement.id, movement);
      return;
    }

    if (action === 'parkCart') {
      const cart = body.cart || {};
      const items = Array.isArray(cart.items) ? cart.items : [];
      if (items.length === 0) throw new ApiError(400, 'Impossible de mettre un panier vide en attente.');
      const parkedId = id('park');
      const saved: any = {
        id: parkedId, savedAt: new Date().toISOString(), clientId: typeof cart.clientId === 'string' ? cart.clientId : undefined,
        clientName: typeof cart.clientName === 'string' ? cart.clientName.slice(0, 120) : undefined,
        discount: asNumber(cart.discount ?? 0, 'La remise', { allowZero: true }),
        items: items.map((item: any) => ({
          productId: text(item.productId, 'Produit', 1, 80),
          quantite: asNumber(item.quantite, 'La quantité'),
          prixUnitaire: asNumber(item.prixUnitaire, 'Le prix unitaire', { allowZero: true }),
        })),
      };
      await insertRecord(tx, orgId, 'parked_carts', parkedId, saved);
      return;
    }

    if (action === 'deleteParkedCart') {
      const parkedId = text(body.id, 'Panier en attente', 1, 100);
      await tx`DELETE FROM fana_records WHERE organization_id = ${orgId} AND collection = 'parked_carts' AND id = ${parkedId}`;
      return;
    }

    if (action === 'updateSettings') {
      const input = body.settings || {};
      const currency: Currency = input.currency === 'USD' ? 'USD' : 'CDF';
      const usdRate = input.usdRate == null || input.usdRate === '' ? null : asNumber(input.usdRate, 'Le taux CDF par dollar');
      if (currency === 'USD' && !usdRate) throw new ApiError(400, 'Entrez d’abord le taux de conversion CDF/USD.');
      await tx`UPDATE fana_organizations SET settings = ${JSON.stringify({ currency, usdRate })}::jsonb WHERE id = ${orgId}`;
      return;
    }

    throw new ApiError(400, 'Action non reconnue.');
  });

  return readWorkspaceState(db, user);
}
