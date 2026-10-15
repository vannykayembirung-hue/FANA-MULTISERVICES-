import React, { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react';
import {
  AppUser, BonReception, CartItem, CaisseSession, Client, Currency, FlotteSolde,
  Fournisseur, Lot, MouvementCaisse, ParkedCart, PaymentMethod, Produit,
  ReglementFournisseur, ServiceCatalogItem, ServiceCatalogType, ServiceTransaction, UserRole, Vente, WorkspaceSettings,
} from '../types';
import { configureCurrencyDisplay, fromBaseCdf, toBaseCdf } from '../utils/format';
import { posAudio } from '../utils/audio';
import { requestJson } from '../utils/request';

const EMPTY_SESSION: CaisseSession = {
  id: '', dateOuverture: '', fondOuverture: 0, statut: 'CLOTUREE', ouvertPar: '',
  totalEspecesAttendu: 0, totalMpesa: 0, totalOrangeMoney: 0, totalAirtelMoney: 0,
  totalAfrimoney: 0, totalCreditAccorde: 0, totalEntreesDiverses: 0, totalSortiesDiverses: 0,
};
const EMPTY_FLOATS: FlotteSolde = { mpesa: 0, orangeMoney: 0, airtelMoney: 0, afrimoney: 0 };

interface AppData {
  settings: WorkspaceSettings & { organizationName: string };
  products: Produit[];
  clients: Client[];
  suppliers: Fournisseur[];
  sales: Vente[];
  services: ServiceTransaction[];
  serviceCatalog: ServiceCatalogItem[];
  caisseSession: CaisseSession;
  cashSessions: CaisseSession[];
  mouvementsCaisse: MouvementCaisse[];
  cashMovements: MouvementCaisse[];
  bonsReception: BonReception[];
  reglementsFournisseurs: ReglementFournisseur[];
  parkedCarts: ParkedCart[];
  flotteSolde: FlotteSolde;
}

const EMPTY_DATA: AppData = {
  settings: { currency: 'CDF', usdRate: null, organizationName: '' },
  products: [], clients: [], suppliers: [], sales: [], services: [], serviceCatalog: [],
  caisseSession: EMPTY_SESSION, cashSessions: [], mouvementsCaisse: [], cashMovements: [],
  bonsReception: [], reglementsFournisseurs: [], parkedCarts: [], flotteSolde: EMPTY_FLOATS,
};

interface AppContextType extends AppData {
  currentRole: UserRole;
  userName: string;
  user: AppUser;
  isLoading: boolean;
  isSaving: boolean;
  error: string | null;
  clearError: () => void;
  refresh: () => Promise<void>;
  displayCurrency: Currency;
  usdRate: number | null;
  toBaseAmount: (displayAmount: number) => number;
  fromBaseAmount: (cdfAmount: number) => number;
  setDisplayCurrency: (currency: Currency) => Promise<boolean>;
  saveUsdRate: (rate: number) => Promise<boolean>;
  addProduct: (product: Omit<Produit, 'id' | 'lots' | 'stock'>, initialLot?: { quantite: number; dlc: string; numeroLot: string }) => Promise<boolean>;
  updateProduct: (product: Produit) => Promise<boolean>;
  deleteProduct: (id: string) => Promise<boolean>;
  addLotToProduct: (produitId: string, lot: Omit<Lot, 'id' | 'produitId'>) => Promise<boolean>;
  cart: CartItem[];
  addToCart: (product: Produit, quantity?: number) => void;
  updateCartItemQuantity: (productId: string, quantity: number) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  cartTotalBrut: number;
  cartDiscount: number;
  setCartDiscount: (discountCdf: number) => void;
  cartTotalNet: number;
  selectedClient: Client | null;
  setSelectedClientId: (id: string | null) => void;
  selectedClientId: string | null;
  parkedCarts: ParkedCart[];
  parkCurrentCart: () => Promise<boolean>;
  recallParkedCart: (id: string) => Promise<boolean>;
  deleteParkedCart: (id: string) => Promise<boolean>;
  lastCompletedSale: Vente | null;
  setLastCompletedSale: (sale: Vente | null) => void;
  finalizeSale: (payment: PaymentMethod, montantRecuCdf?: number, referencePaiement?: string, telephonePaiement?: string) => Promise<Vente | null>;
  addClient: (client: Omit<Client, 'id' | 'credit' | 'historiquePaiements'>) => Promise<boolean>;
  updateClient: (client: Client) => Promise<boolean>;
  recordClientPayment: (clientId: string, montantCdf: number, mode: PaymentMethod, note?: string) => Promise<boolean>;
  addServiceTransaction: (tx: Omit<ServiceTransaction, 'id' | 'date' | 'effectuePar'>) => Promise<ServiceTransaction | null>;
  addServiceCatalogItem: (nom: string, type: ServiceCatalogType) => Promise<boolean>;
  updateServiceCatalogItem: (id: string, nom: string, type: ServiceCatalogType) => Promise<boolean>;
  deleteServiceCatalogItem: (id: string) => Promise<boolean>;
  updateFlotteSolde: (updates: Partial<FlotteSolde>) => Promise<boolean>;
  addMouvementCaisse: (type: 'ENTREE' | 'SORTIE', motif: string, montantCdf: number) => Promise<boolean>;
  openCaisse: (fondOuvertureCdf: number) => Promise<boolean>;
  closeCaisse: (montantReelCompteCdf: number, notes?: string) => Promise<CaisseSession | null>;
  addSupplier: (supplier: Omit<Fournisseur, 'id' | 'dette'>) => Promise<boolean>;
  updateSupplier: (supplier: Fournisseur) => Promise<boolean>;
  addBonReception: (bon: Omit<BonReception, 'id' | 'date'>, modePaiement?: Exclude<PaymentMethod, 'CREDIT'>) => Promise<boolean>;
  recordSupplierPayment: (fournisseurId: string, montantCdf: number, mode: PaymentMethod, avecSortieCaisse: boolean, note?: string) => Promise<boolean>;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

export const AppProvider: React.FC<{ children: React.ReactNode; user: AppUser }> = ({ children, user }) => {
  const [data, setData] = useState<AppData>(EMPTY_DATA);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartDiscount, setCartDiscountState] = useState(0);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [lastCompletedSale, setLastCompletedSale] = useState<Vente | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const queue = useRef<Promise<unknown>>(Promise.resolve());

  const applyState = useCallback((next: AppData) => {
    setData({ ...EMPTY_DATA, ...next, caisseSession: next.caisseSession || EMPTY_SESSION, flotteSolde: next.flotteSolde || EMPTY_FLOATS });
  }, []);

  const refresh = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await requestJson<{ state: AppData }>('/api/state');
      applyState(response.state);
      setError(null);
    } catch (reason) {
      const message = reason instanceof Error ? reason.message : 'Impossible de charger les données du magasin.';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, [applyState]);

  useEffect(() => { void refresh(); }, [refresh, user.id]);
  useEffect(() => { configureCurrencyDisplay(data.settings.currency, data.settings.usdRate); }, [data.settings.currency, data.settings.usdRate]);

  const commit = useCallback((action: string, payload: Record<string, unknown> = {}) => {
    const task = queue.current.then(async () => {
      setIsSaving(true);
      setError(null);
      try {
        const response = await requestJson<{ state: AppData; result?: any }>('/api/state', {
          method: 'POST',
          body: JSON.stringify({ action, ...payload }),
        });
        applyState(response.state);
        return response;
      } catch (reason) {
        setError(reason instanceof Error ? reason.message : 'Enregistrement impossible.');
        return null;
      } finally {
        setIsSaving(false);
      }
    });
    queue.current = task.then(() => undefined, () => undefined);
    return task;
  }, [applyState]);

  const displayCurrency = data.settings.currency;
  const usdRate = data.settings.usdRate;
  const toBaseAmount = useCallback((value: number) => toBaseCdf(value, displayCurrency, usdRate), [displayCurrency, usdRate]);
  const fromBaseAmount = useCallback((value: number) => fromBaseCdf(value, displayCurrency, usdRate), [displayCurrency, usdRate]);

  const setDisplayCurrency = async (currency: Currency) => {
    if (currency === 'USD' && !usdRate) {
      setError('Avant de passer en USD, définissez le taux de change réel (CDF pour 1 USD).');
      return false;
    }
    return Boolean(await commit('updateSettings', { settings: { currency, usdRate } }));
  };
  const saveUsdRate = async (rate: number) => {
    if (!Number.isFinite(rate) || rate <= 0) {
      setError('Le taux doit être un nombre supérieur à zéro.');
      return false;
    }
    return Boolean(await commit('updateSettings', { settings: { currency: displayCurrency, usdRate: rate } }));
  };

  const products = data.products;
  const clients = data.clients;
  const suppliers = data.suppliers;
  const sales = data.sales;
  const services = data.services;
  const caisseSession = data.caisseSession;
  const mouvementsCaisse = data.mouvementsCaisse;
  const bonsReception = data.bonsReception;
  const reglementsFournisseurs = data.reglementsFournisseurs;
  const parkedCarts = data.parkedCarts;
  const flotteSolde = data.flotteSolde;
  const selectedClient = useMemo(() => clients.find(client => client.id === selectedClientId) || null, [clients, selectedClientId]);

  const cartTotalBrut = useMemo(() => cart.reduce((sum, item) => sum + item.prixUnitaire * item.quantite, 0), [cart]);
  const cartTotalNet = Math.max(0, cartTotalBrut - cartDiscount);

  const addToCart = (product: Produit, quantity = 1) => {
    if (!Number.isFinite(quantity) || quantity <= 0) return;
    if (product.stock <= 0) {
      setError(`« ${product.nom} » est en rupture de stock.`);
      return;
    }
    setError(null);
    posAudio.playBeep();
    setCart(previous => {
      const found = previous.find(item => item.produit.id === product.id);
      if (found) return previous.map(item => item.produit.id === product.id
        ? { ...item, quantite: Number((item.quantite + quantity).toFixed(3)), produit: product, prixUnitaire: product.prixVente }
        : item);
      return [...previous, { produit: product, quantite: Number(quantity.toFixed(3)), prixUnitaire: product.prixVente }];
    });
  };
  const updateCartItemQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) { setCart(previous => previous.filter(item => item.produit.id !== productId)); return; }
    setCart(previous => previous.map(item => item.produit.id === productId ? { ...item, quantite: Number(quantity.toFixed(3)) } : item));
  };
  const removeFromCart = (productId: string) => setCart(previous => previous.filter(item => item.produit.id !== productId));
  const clearCart = () => { setCart([]); setCartDiscountState(0); setSelectedClientId(null); };
  const setCartDiscount = (discountCdf: number) => setCartDiscountState(Math.max(0, Math.min(Number(discountCdf) || 0, cartTotalBrut)));

  const parkCurrentCart = async () => {
    if (!cart.length) return false;
    const response = await commit('parkCart', { cart: {
      items: cart.map(item => ({ productId: item.produit.id, quantite: item.quantite, prixUnitaire: item.prixUnitaire })),
      clientId: selectedClient?.id, clientName: selectedClient?.nom, discount: cartDiscount,
    } });
    if (!response) return false;
    clearCart();
    return true;
  };
  const recallParkedCart = async (id: string) => {
    const parked = parkedCarts.find(item => item.id === id);
    if (!parked) return false;
    setCart(parked.items.filter(item => products.some(product => product.id === item.produit.id)));
    setCartDiscountState(parked.discount);
    setSelectedClientId(parked.clientId || null);
    const response = await commit('deleteParkedCart', { id });
    return Boolean(response);
  };
  const deleteParkedCart = async (id: string) => Boolean(await commit('deleteParkedCart', { id }));

  const finalizeSale = async (payment: PaymentMethod, montantRecuCdf?: number, referencePaiement?: string, telephonePaiement?: string): Promise<Vente | null> => {
    if (!cart.length) return null;
    const response = await commit('finalizeSale', {
      items: cart.map(item => ({ productId: item.produit.id, quantity: item.quantite })),
      discount: cartDiscount,
      payment,
      receivedAmount: montantRecuCdf,
      referencePaiement,
      telephonePaiement,
      clientId: selectedClient?.id,
    });
    if (!response) return null;
    const sale = response.state.sales?.[0] || null;
    clearCart();
    if (sale) {
      setLastCompletedSale(sale);
      posAudio.playSuccess();
    }
    return sale;
  };

  const addProduct = async (product: Omit<Produit, 'id' | 'lots' | 'stock'>, initialLot?: { quantite: number; dlc: string; numeroLot: string }) => Boolean(await commit('addProduct', { product, initialLot }));
  const updateProduct = async (product: Produit) => Boolean(await commit('updateProduct', { id: product.id, product }));
  const deleteProduct = async (id: string) => Boolean(await commit('deleteProduct', { id }));
  const addLotToProduct = async (produitId: string, lot: Omit<Lot, 'id' | 'produitId'>) => Boolean(await commit('addLot', { productId: produitId, lot }));
  const addClient = async (client: Omit<Client, 'id' | 'credit' | 'historiquePaiements'>) => Boolean(await commit('addClient', { client }));
  const updateClient = async (client: Client) => Boolean(await commit('updateClient', { id: client.id, client }));
  const recordClientPayment = async (clientId: string, montantCdf: number, mode: PaymentMethod, note?: string) => Boolean(await commit('payClient', { clientId, montant: montantCdf, mode, note }));
  const addServiceTransaction = async (tx: Omit<ServiceTransaction, 'id' | 'date' | 'effectuePar'>) => {
    const response = await commit('addService', { transaction: tx });
    if (!response) return null;
    posAudio.playSuccess();
    return response.state.services?.[0] || null;
  };
  const addServiceCatalogItem = async (nom: string, type: ServiceCatalogType) => Boolean(await commit('addServiceCatalogItem', { nom, type }));
  const updateServiceCatalogItem = async (id: string, nom: string, type: ServiceCatalogType) => Boolean(await commit('updateServiceCatalogItem', { id, nom, type }));
  const deleteServiceCatalogItem = async (id: string) => Boolean(await commit('deleteServiceCatalogItem', { id }));
  const updateFlotteSolde = async (updates: Partial<FlotteSolde>) => {
    const entries = Object.entries(updates) as Array<[keyof FlotteSolde, number]>;
    let success = true;
    for (const [provider, nextValue] of entries) {
      const current = flotteSolde[provider] || 0;
      const delta = Math.abs(nextValue - current);
      if (delta === 0) continue;
      const response = await commit('adjustFloat', { provider, delta, type: nextValue < current ? 'RETRAIT' : 'AJOUT' });
      if (!response) success = false;
    }
    return success;
  };
  const addMouvementCaisse = async (type: 'ENTREE' | 'SORTIE', motif: string, montantCdf: number) => Boolean(await commit('cashMovement', { type, motif, montant: montantCdf }));
  const openCaisse = async (fondOuvertureCdf: number) => Boolean(await commit('openCash', { fondOuverture: fondOuvertureCdf }));
  const closeCaisse = async (montantReelCompteCdf: number, notes?: string) => {
    const response = await commit('closeCash', { sessionId: caisseSession.id, montantReelCompte: montantReelCompteCdf, notes });
    return response?.state.caisseSession || null;
  };
  const addSupplier = async (supplier: Omit<Fournisseur, 'id' | 'dette'>) => Boolean(await commit('addSupplier', { supplier }));
  const updateSupplier = async (supplier: Fournisseur) => Boolean(await commit('updateSupplier', { id: supplier.id, supplier }));
  const addBonReception = async (bon: Omit<BonReception, 'id' | 'date'>, modePaiement: Exclude<PaymentMethod, 'CREDIT'> = 'ESPECE') => Boolean(await commit('receiveGoods', { delivery: { ...bon, modePaiement } }));
  const recordSupplierPayment = async (fournisseurId: string, montantCdf: number, mode: PaymentMethod, avecSortieCaisse: boolean, note?: string) => Boolean(await commit('paySupplier', { supplierId: fournisseurId, montant: montantCdf, mode, avecSortieCaisse, note }));

  const clearError = () => setError(null);

  const value: AppContextType = {
    ...data,
    currentRole: user.role,
    userName: user.name,
    user,
    isLoading,
    isSaving,
    error,
    clearError,
    refresh,
    displayCurrency,
    usdRate,
    toBaseAmount,
    fromBaseAmount,
    setDisplayCurrency,
    saveUsdRate,
    addProduct,
    updateProduct,
    deleteProduct,
    addLotToProduct,
    cart,
    addToCart,
    updateCartItemQuantity,
    removeFromCart,
    clearCart,
    cartTotalBrut,
    cartDiscount,
    setCartDiscount,
    cartTotalNet,
    selectedClient,
    setSelectedClientId,
    selectedClientId,
    parkCurrentCart,
    recallParkedCart,
    deleteParkedCart,
    lastCompletedSale,
    setLastCompletedSale,
    finalizeSale,
    addClient,
    updateClient,
    recordClientPayment,
    addServiceTransaction,
    addServiceCatalogItem,
    updateServiceCatalogItem,
    deleteServiceCatalogItem,
    updateFlotteSolde,
    addMouvementCaisse,
    openCaisse,
    closeCaisse,
    addSupplier,
    updateSupplier,
    addBonReception,
    recordSupplierPayment,
    searchQuery,
    setSearchQuery,
  };

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
};

export const useApp = (): AppContextType => {
  const context = useContext(AppContext);
  if (!context) throw new Error('useApp must be used within an AppProvider');
  return context;
};
