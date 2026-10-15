import React, { createContext, useContext, useState, useEffect } from 'react';
import {
  Produit,
  Lot,
  CartItem,
  Vente,
  Client,
  ServiceTransaction,
  CaisseSession,
  MouvementCaisse,
  Fournisseur,
  BonReception,
  UserRole,
  PaymentMethod,
  FlotteSolde,
  ReglementFournisseur,
} from '../types';
import {
  INITIAL_PRODUCTS,
  INITIAL_CLIENTS,
  INITIAL_SUPPLIERS,
  INITIAL_SERVICES,
  INITIAL_VENTES,
  INITIAL_CAISSE,
} from '../data/seedData';
import { deductStockFEFO } from '../utils/format';
import { posAudio } from '../utils/audio';

interface ParkedCart {
  id: string;
  savedAt: string;
  items: CartItem[];
  clientId?: string;
  clientName?: string;
  discount: number;
}

interface AppContextType {
  // Authentication & Role
  currentRole: UserRole;
  setCurrentRole: (role: UserRole) => void;
  userName: string;
  setUserName: (name: string) => void;
  managerPin: string;
  setManagerPin: (pin: string) => void;

  // Products & Lots
  products: Produit[];
  addProduct: (product: Omit<Produit, 'id' | 'lots' | 'stock'>, initialLot?: { quantite: number; dlc: string; numeroLot: string }) => void;
  updateProduct: (product: Produit) => void;
  deleteProduct: (id: string) => void;
  addLotToProduct: (produitId: string, lot: Omit<Lot, 'id' | 'produitId'>) => void;

  // POS & Cart
  cart: CartItem[];
  addToCart: (product: Produit, quantity?: number) => void;
  updateCartItemQuantity: (productId: string, quantity: number) => void;
  removeFromCart: (productId: string) => void;
  clearCart: () => void;
  cartTotalBrut: number;
  cartDiscount: number;
  setCartDiscount: (discount: number) => void;
  cartTotalNet: number;
  selectedClient: Client | null;
  setSelectedClientId: (id: string | null) => void;
  
  // Parked Carts
  parkedCarts: ParkedCart[];
  parkCurrentCart: () => void;
  recallParkedCart: (id: string) => void;
  deleteParkedCart: (id: string) => void;

  // Sales
  sales: Vente[];
  lastCompletedSale: Vente | null;
  setLastCompletedSale: (sale: Vente | null) => void;
  finalizeSale: (payment: PaymentMethod, montantRecu?: number) => Vente | null;

  // Clients & Debt
  clients: Client[];
  addClient: (client: Omit<Client, 'id' | 'credit' | 'historiquePaiements'>) => void;
  updateClient: (client: Client) => void;
  recordClientPayment: (clientId: string, montant: number, mode: PaymentMethod, note?: string) => void;

  // Multiservices & Flotte
  services: ServiceTransaction[];
  addServiceTransaction: (tx: Omit<ServiceTransaction, 'id' | 'date' | 'effectuePar'>) => ServiceTransaction;
  flotteSolde: FlotteSolde;
  updateFlotteSolde: (updates: Partial<FlotteSolde>) => void;

  // Caisse & Cash Movements
  caisseSession: CaisseSession;
  mouvementsCaisse: MouvementCaisse[];
  addMouvementCaisse: (type: 'ENTREE' | 'SORTIE', motif: string, montant: number) => void;
  openCaisse: (fondOuverture: number) => void;
  closeCaisse: (montantReelCompte: number, notes?: string) => CaisseSession;

  // Suppliers & Deliveries & Settlements
  suppliers: Fournisseur[];
  addSupplier: (supplier: Omit<Fournisseur, 'id' | 'dette'>) => void;
  updateSupplier: (supplier: Fournisseur) => void;
  bonsReception: BonReception[];
  addBonReception: (bon: Omit<BonReception, 'id' | 'date'>) => void;
  reglementsFournisseurs: ReglementFournisseur[];
  recordSupplierPayment: (
    fournisseurId: string,
    montant: number,
    mode: PaymentMethod,
    avecSortieCaisse: boolean,
    note?: string
  ) => void;

  // Utilities
  resetDemoData: () => void;
  searchQuery: string;
  setSearchQuery: (query: string) => void;
}

const AppContext = createContext<AppContextType | undefined>(undefined);

const STORAGE_KEYS = {
  ROLE: 'fana_pos_role_v1',
  USER: 'fana_pos_user_v1',
  PRODUCTS: 'fana_pos_products_v1',
  CLIENTS: 'fana_pos_clients_v1',
  SUPPLIERS: 'fana_pos_suppliers_v1',
  SERVICES: 'fana_pos_services_v1',
  SALES: 'fana_pos_sales_v1',
  CAISSE: 'fana_pos_caisse_v1',
  MOUVEMENTS: 'fana_pos_mouvements_v1',
  BONS: 'fana_pos_bons_v1',
  PARKED: 'fana_pos_parked_v1',
  FLOTTE: 'fana_pos_flotte_v1',
  REGLEMENTS_SUPPLIERS: 'fana_pos_reglements_suppliers_v1',
  MANAGER_PIN: 'fana_pos_pin_v1',
};

const INITIAL_FLOTTE: FlotteSolde = {
  wave: 350000,
  orangeMoney: 280000,
  woyofal: 150000,
};

export const AppProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // Current user & role (Admin/Gérant has full access, Caissier has POS only)
  const [currentRole, setCurrentRoleState] = useState<UserRole>(() => {
    return (localStorage.getItem(STORAGE_KEYS.ROLE) as UserRole) || 'GERANT';
  });

  const [managerPin, setManagerPinState] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEYS.MANAGER_PIN) || '1234';
  });

  const setManagerPin = (pin: string) => {
    setManagerPinState(pin);
    localStorage.setItem(STORAGE_KEYS.MANAGER_PIN, pin);
  };

  const [userName, setUserNameState] = useState<string>(() => {
    return localStorage.getItem(STORAGE_KEYS.USER) || 'Directeur F.A.N.A';
  });

  const setCurrentRole = (role: UserRole) => {
    setCurrentRoleState(role);
    localStorage.setItem(STORAGE_KEYS.ROLE, role);
    if (role === 'CAISSIER') {
      setUserName('Amadou Diop (Caisse 1)');
    } else {
      setUserName('Directeur F.A.N.A');
    }
  };

  const setUserName = (name: string) => {
    setUserNameState(name);
    localStorage.setItem(STORAGE_KEYS.USER, name);
  };

  // Products & Inventory
  const [products, setProducts] = useState<Produit[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.PRODUCTS);
    return saved ? JSON.parse(saved) : INITIAL_PRODUCTS;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PRODUCTS, JSON.stringify(products));
  }, [products]);

  // Clients
  const [clients, setClients] = useState<Client[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.CLIENTS);
    return saved ? JSON.parse(saved) : INITIAL_CLIENTS;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CLIENTS, JSON.stringify(clients));
  }, [clients]);

  // Suppliers
  const [suppliers, setSuppliers] = useState<Fournisseur[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.SUPPLIERS);
    return saved ? JSON.parse(saved) : INITIAL_SUPPLIERS;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SUPPLIERS, JSON.stringify(suppliers));
  }, [suppliers]);

  // Multiservices Transactions
  const [services, setServices] = useState<ServiceTransaction[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.SERVICES);
    return saved ? JSON.parse(saved) : INITIAL_SERVICES;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SERVICES, JSON.stringify(services));
  }, [services]);

  // Sales History
  const [sales, setSales] = useState<Vente[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.SALES);
    return saved ? JSON.parse(saved) : INITIAL_VENTES;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.SALES, JSON.stringify(sales));
  }, [sales]);

  // Cash Register Session
  const [caisseSession, setCaisseSession] = useState<CaisseSession>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.CAISSE);
    return saved ? JSON.parse(saved) : INITIAL_CAISSE;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.CAISSE, JSON.stringify(caisseSession));
  }, [caisseSession]);

  // Cash Movements (Entrées / Sorties de caisse)
  const [mouvementsCaisse, setMouvementsCaisse] = useState<MouvementCaisse[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.MOUVEMENTS);
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.MOUVEMENTS, JSON.stringify(mouvementsCaisse));
  }, [mouvementsCaisse]);

  // Supplier Delivery Notes (Bons de réception)
  const [bonsReception, setBonsReception] = useState<BonReception[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.BONS);
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.BONS, JSON.stringify(bonsReception));
  }, [bonsReception]);

  // Parked Carts
  const [parkedCarts, setParkedCarts] = useState<ParkedCart[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.PARKED);
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.PARKED, JSON.stringify(parkedCarts));
  }, [parkedCarts]);

  // Multiservices Flotte (Agent Mobile Money balances)
  const [flotteSolde, setFlotteSolde] = useState<FlotteSolde>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.FLOTTE);
    return saved ? JSON.parse(saved) : INITIAL_FLOTTE;
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.FLOTTE, JSON.stringify(flotteSolde));
  }, [flotteSolde]);

  const updateFlotteSolde = (updates: Partial<FlotteSolde>) => {
    setFlotteSolde(prev => ({ ...prev, ...updates }));
  };

  // Supplier Settlements (Règlements Fournisseurs)
  const [reglementsFournisseurs, setReglementsFournisseurs] = useState<ReglementFournisseur[]>(() => {
    const saved = localStorage.getItem(STORAGE_KEYS.REGLEMENTS_SUPPLIERS);
    return saved ? JSON.parse(saved) : [];
  });

  useEffect(() => {
    localStorage.setItem(STORAGE_KEYS.REGLEMENTS_SUPPLIERS, JSON.stringify(reglementsFournisseurs));
  }, [reglementsFournisseurs]);

  // Active POS Cart
  const [cart, setCart] = useState<CartItem[]>([]);
  const [cartDiscount, setCartDiscount] = useState<number>(0);
  const [selectedClientId, setSelectedClientIdState] = useState<string | null>(null);
  const [lastCompletedSale, setLastCompletedSale] = useState<Vente | null>(null);
  const [searchQuery, setSearchQuery] = useState<string>('');

  const selectedClient = clients.find(c => c.id === selectedClientId) || null;

  const setSelectedClientId = (id: string | null) => {
    setSelectedClientIdState(id);
  };

  // Cart Totals
  const cartTotalBrut = cart.reduce((acc, item) => acc + item.prixUnitaire * item.quantite, 0);
  const cartTotalNet = Math.max(0, cartTotalBrut - cartDiscount);

  // Cart operations
  const addToCart = (product: Produit, quantityToAdd: number = 1) => {
    posAudio.playBeep();
    setCart(prev => {
      const existingIndex = prev.findIndex(item => item.produit.id === product.id);
      if (existingIndex > -1) {
        const next = [...prev];
        const newQty = Number((next[existingIndex].quantite + quantityToAdd).toFixed(3));
        next[existingIndex] = {
          ...next[existingIndex],
          quantite: newQty,
        };
        return next;
      } else {
        return [
          ...prev,
          {
            produit: product,
            quantite: Number(quantityToAdd.toFixed(3)),
            prixUnitaire: product.prixVente,
          },
        ];
      }
    });
  };

  const updateCartItemQuantity = (productId: string, quantity: number) => {
    if (quantity <= 0) {
      removeFromCart(productId);
      return;
    }
    setCart(prev =>
      prev.map(item =>
        item.produit.id === productId
          ? { ...item, quantite: Number(quantity.toFixed(3)) }
          : item
      )
    );
  };

  const removeFromCart = (productId: string) => {
    setCart(prev => prev.filter(item => item.produit.id !== productId));
  };

  const clearCart = () => {
    setCart([]);
    setCartDiscount(0);
    setSelectedClientIdState(null);
  };

  // Park current cart to serve another customer
  const parkCurrentCart = () => {
    if (cart.length === 0) return;
    const parked: ParkedCart = {
      id: `park-${Date.now()}`,
      savedAt: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
      items: [...cart],
      clientId: selectedClientId || undefined,
      clientName: selectedClient ? selectedClient.nom : undefined,
      discount: cartDiscount,
    };
    setParkedCarts(prev => [parked, ...prev]);
    clearCart();
  };

  const recallParkedCart = (id: string) => {
    const found = parkedCarts.find(p => p.id === id);
    if (!found) return;
    setCart(found.items);
    setCartDiscount(found.discount);
    setSelectedClientIdState(found.clientId || null);
    setParkedCarts(prev => prev.filter(p => p.id !== id));
  };

  const deleteParkedCart = (id: string) => {
    setParkedCarts(prev => prev.filter(p => p.id !== id));
  };

  // Finalize Sale with FEFO lot deduction
  const finalizeSale = (payment: PaymentMethod, montantRecu?: number): Vente | null => {
    if (cart.length === 0) return null;

    let saleEstimatedMargin = 0;

    // FEFO stock decrement across products and lots
    const updatedProducts = [...products];

    cart.forEach(cartItem => {
      const prodIndex = updatedProducts.findIndex(p => p.id === cartItem.produit.id);
      if (prodIndex > -1) {
        const prod = updatedProducts[prodIndex];
        const { updatedLots } = deductStockFEFO(prod.lots, cartItem.quantite);
        const newTotalStock = Math.max(0, Number((prod.stock - cartItem.quantite).toFixed(3)));

        // Margin calculation: (Selling Price - Cost Price) * Quantity
        const lineMargin = (cartItem.prixUnitaire - prod.prixAchat) * cartItem.quantite;
        saleEstimatedMargin += lineMargin;

        updatedProducts[prodIndex] = {
          ...prod,
          stock: newTotalStock,
          lots: updatedLots,
        };
      }
    });

    // Subtract general discount from margin
    saleEstimatedMargin = Math.max(0, saleEstimatedMargin - cartDiscount);

    const ticketNumber = `TICK-${1000 + sales.length + 1}`;
    const rendu = montantRecu && montantRecu > cartTotalNet ? montantRecu - cartTotalNet : 0;

    const newSale: Vente = {
      id: `v-${Date.now()}`,
      numeroTicket: ticketNumber,
      createdAt: new Date().toISOString(),
      totalBrut: cartTotalBrut,
      remise: cartDiscount,
      totalNet: cartTotalNet,
      paiement: payment,
      montantRecu: montantRecu || cartTotalNet,
      renduMonnaie: rendu,
      clientId: selectedClient?.id,
      nomClient: selectedClient?.nom,
      caissierId: currentRole === 'CAISSIER' ? 'cais-1' : 'admin-1',
      nomCaissier: userName,
      lignes: cart.map((item, idx) => ({
        id: `l-${Date.now()}-${idx}`,
        produitId: item.produit.id,
        nomProduit: item.produit.nom,
        quantite: item.quantite,
        prixUnitaire: item.prixUnitaire,
        totalLigne: item.quantite * item.prixUnitaire,
        unite: item.produit.unite,
      })),
      margeEstimee: saleEstimatedMargin,
    };

    // Update product stock in state
    setProducts(updatedProducts);

    // If payment is CREDIT, update client debt
    if (payment === 'CREDIT' && selectedClient) {
      setClients(prev =>
        prev.map(c =>
          c.id === selectedClient.id
            ? { ...c, credit: Number((c.credit + cartTotalNet).toFixed(0)) }
            : c
        )
      );
    }

    // Update cash register totals
    setCaisseSession(prev => {
      const next = { ...prev };
      if (payment === 'ESPECE') {
        next.totalEspecesAttendu += cartTotalNet;
      } else if (payment === 'WAVE') {
        next.totalWave += cartTotalNet;
      } else if (payment === 'ORANGE_MONEY') {
        next.totalOrangeMoney += cartTotalNet;
      } else if (payment === 'CREDIT') {
        next.totalCreditAccorde += cartTotalNet;
      }
      return next;
    });

    // Save sale
    setSales(prev => [newSale, ...prev]);
    setLastCompletedSale(newSale);

    // Sound chime
    posAudio.playSuccess();

    // Clear cart
    clearCart();

    return newSale;
  };

  // Add Product & initial Lot
  const addProduct = (
    productData: Omit<Produit, 'id' | 'lots' | 'stock'>,
    initialLot?: { quantite: number; dlc: string; numeroLot: string }
  ) => {
    const newId = `prod-${Date.now()}`;
    const initialStock = initialLot ? initialLot.quantite : 0;
    const initialLots: Lot[] = initialLot
      ? [
          {
            id: `lot-${Date.now()}`,
            produitId: newId,
            numeroLot: initialLot.numeroLot || `LOT-${Date.now().toString().slice(-4)}`,
            quantite: initialLot.quantite,
            dlc: initialLot.dlc,
            dateReception: new Date().toISOString().split('T')[0],
          },
        ]
      : [];

    const newProd: Produit = {
      ...productData,
      id: newId,
      stock: initialStock,
      lots: initialLots,
    };

    setProducts(prev => [newProd, ...prev]);
  };

  const updateProduct = (updated: Produit) => {
    setProducts(prev => prev.map(p => (p.id === updated.id ? updated : p)));
  };

  const deleteProduct = (id: string) => {
    setProducts(prev => prev.filter(p => p.id !== id));
  };

  const addLotToProduct = (produitId: string, lotData: Omit<Lot, 'id' | 'produitId'>) => {
    setProducts(prev =>
      prev.map(p => {
        if (p.id !== produitId) return p;
        const newLot: Lot = {
          ...lotData,
          id: `lot-${Date.now()}`,
          produitId,
        };
        const updatedLots = [...p.lots, newLot];
        const newStock = Number((p.stock + lotData.quantite).toFixed(3));
        return {
          ...p,
          stock: newStock,
          lots: updatedLots,
        };
      })
    );
  };

  // Client operations
  const addClient = (clientData: Omit<Client, 'id' | 'credit' | 'historiquePaiements'>) => {
    const newClient: Client = {
      ...clientData,
      id: `cl-${Date.now()}`,
      credit: 0,
      historiquePaiements: [],
    };
    setClients(prev => [...prev, newClient]);
  };

  const updateClient = (updated: Client) => {
    setClients(prev => prev.map(c => (c.id === updated.id ? updated : c)));
  };

  const recordClientPayment = (clientId: string, montant: number, mode: PaymentMethod, note?: string) => {
    setClients(prev =>
      prev.map(c => {
        if (c.id !== clientId) return c;
        const newDebt = Math.max(0, c.credit - montant);
        const paymentRecord = {
          id: `pay-${Date.now()}`,
          date: new Date().toISOString(),
          montant,
          mode,
          note: note || `Règlement d'ardoise via ${mode}`,
        };
        return {
          ...c,
          credit: newDebt,
          historiquePaiements: [paymentRecord, ...(c.historiquePaiements || [])],
        };
      })
    );

    // Update cash if paid in cash
    if (mode === 'ESPECE') {
      setCaisseSession(prev => ({
        ...prev,
        totalEspecesAttendu: prev.totalEspecesAttendu + montant,
      }));
    } else if (mode === 'WAVE') {
      setCaisseSession(prev => ({
        ...prev,
        totalWave: prev.totalWave + montant,
      }));
    } else if (mode === 'ORANGE_MONEY') {
      setCaisseSession(prev => ({
        ...prev,
        totalOrangeMoney: prev.totalOrangeMoney + montant,
      }));
    }

    posAudio.playSuccess();
  };

  // Multiservices
  const addServiceTransaction = (txData: Omit<ServiceTransaction, 'id' | 'date' | 'effectuePar'>) => {
    const newTx: ServiceTransaction = {
      ...txData,
      id: `srv-${Date.now()}`,
      date: new Date().toISOString(),
      effectuePar: userName,
    };
    setServices(prev => [newTx, ...prev]);

    const serviceLower = txData.nom.toLowerCase();

    // Flotte & Cash Drawer tracking according to financial transaction type
    if (serviceLower.includes('wave')) {
      if (txData.type === 'DEPOT') {
        // Client brings cash to agent, agent sends electronic Wave:
        // Cash drawer increases, agent Wave balance decreases
        setFlotteSolde(prev => ({ ...prev, wave: Math.max(0, prev.wave - txData.montant) }));
        setCaisseSession(prev => ({
          ...prev,
          totalEspecesAttendu: prev.totalEspecesAttendu + txData.montant + txData.commission,
        }));
      } else if (txData.type === 'RETRAIT') {
        // Client sends electronic Wave to agent, agent pays out cash:
        // Agent Wave balance increases, cash drawer decreases
        setFlotteSolde(prev => ({ ...prev, wave: prev.wave + txData.montant }));
        setCaisseSession(prev => ({
          ...prev,
          totalEspecesAttendu: Math.max(0, prev.totalEspecesAttendu - txData.montant + txData.commission),
        }));
      } else {
        setCaisseSession(prev => ({
          ...prev,
          totalEspecesAttendu: prev.totalEspecesAttendu + txData.commission,
        }));
      }
    } else if (serviceLower.includes('orange')) {
      if (txData.type === 'DEPOT') {
        setFlotteSolde(prev => ({ ...prev, orangeMoney: Math.max(0, prev.orangeMoney - txData.montant) }));
        setCaisseSession(prev => ({
          ...prev,
          totalEspecesAttendu: prev.totalEspecesAttendu + txData.montant + txData.commission,
        }));
      } else if (txData.type === 'RETRAIT') {
        setFlotteSolde(prev => ({ ...prev, orangeMoney: prev.orangeMoney + txData.montant }));
        setCaisseSession(prev => ({
          ...prev,
          totalEspecesAttendu: Math.max(0, prev.totalEspecesAttendu - txData.montant + txData.commission),
        }));
      } else {
        setCaisseSession(prev => ({
          ...prev,
          totalEspecesAttendu: prev.totalEspecesAttendu + txData.commission,
        }));
      }
    } else if (serviceLower.includes('woyofal') || serviceLower.includes('recharge')) {
      setFlotteSolde(prev => ({ ...prev, woyofal: Math.max(0, prev.woyofal - txData.montant) }));
      setCaisseSession(prev => ({
        ...prev,
        totalEspecesAttendu: prev.totalEspecesAttendu + txData.montant,
      }));
    } else {
      // Photocopies, impression, plastification
      setCaisseSession(prev => ({
        ...prev,
        totalEspecesAttendu: prev.totalEspecesAttendu + txData.montant,
      }));
    }

    posAudio.playSuccess();
    return newTx;
  };

  // Cash Drawer Movements (Entrées / Sorties exceptionnelles)
  const addMouvementCaisse = (type: 'ENTREE' | 'SORTIE', motif: string, montant: number) => {
    const mvt: MouvementCaisse = {
      id: `mvt-${Date.now()}`,
      type,
      motif,
      montant,
      date: new Date().toISOString(),
      responsable: userName,
    };
    setMouvementsCaisse(prev => [mvt, ...prev]);

    setCaisseSession(prev => {
      if (type === 'ENTREE') {
        return {
          ...prev,
          totalEntreesDiverses: prev.totalEntreesDiverses + montant,
          totalEspecesAttendu: prev.totalEspecesAttendu + montant,
        };
      } else {
        return {
          ...prev,
          totalSortiesDiverses: prev.totalSortiesDiverses + montant,
          totalEspecesAttendu: prev.totalEspecesAttendu - montant,
        };
      }
    });
  };

  const openCaisse = (fondOuverture: number) => {
    const newSession: CaisseSession = {
      id: `sess-${Date.now()}`,
      dateOuverture: new Date().toISOString(),
      fondOuverture,
      statut: 'OUVERTE',
      ouvertPar: userName,
      totalEspecesAttendu: fondOuverture,
      totalWave: 0,
      totalOrangeMoney: 0,
      totalCreditAccorde: 0,
      totalEntreesDiverses: 0,
      totalSortiesDiverses: 0,
    };
    setCaisseSession(newSession);
    setMouvementsCaisse([]);
  };

  const closeCaisse = (montantReelCompte: number, notes?: string): CaisseSession => {
    const ecart = montantReelCompte - caisseSession.totalEspecesAttendu;
    const closed: CaisseSession = {
      ...caisseSession,
      statut: 'CLOTUREE',
      dateFermeture: new Date().toISOString(),
      cloturePar: userName,
      montantReelCompte,
      ecartCaisse: ecart,
      notesCloture: notes,
    };
    setCaisseSession(closed);
    return closed;
  };

  // Supplier Deliveries & Stock replenishment
  const addSupplier = (supplierData: Omit<Fournisseur, 'id' | 'dette'>) => {
    const newSup: Fournisseur = {
      ...supplierData,
      id: `sup-${Date.now()}`,
      dette: 0,
    };
    setSuppliers(prev => [...prev, newSup]);
  };

  const updateSupplier = (updated: Fournisseur) => {
    setSuppliers(prev => prev.map(s => (s.id === updated.id ? updated : s)));
  };

  const addBonReception = (bonData: Omit<BonReception, 'id' | 'date'>) => {
    const newBon: BonReception = {
      ...bonData,
      id: `bon-${Date.now()}`,
      date: new Date().toISOString(),
    };

    // Increment stocks and create lots for each received item
    setProducts(prev => {
      const next = [...prev];
      bonData.articles.forEach(art => {
        const prodIndex = next.findIndex(p => p.id === art.produitId);
        if (prodIndex > -1) {
          const prod = next[prodIndex];
          const newLot: Lot = {
            id: `lot-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
            produitId: prod.id,
            numeroLot: art.numeroLot,
            quantite: art.quantite,
            dlc: art.dlc,
            dateReception: new Date().toISOString().split('T')[0],
          };
          next[prodIndex] = {
            ...prod,
            stock: Number((prod.stock + art.quantite).toFixed(3)),
            lots: [...prod.lots, newLot],
          };
        }
      });
      return next;
    });

    // If unpaid, add to supplier debt
    if (bonData.statutPaiement === 'A_CREDIT') {
      setSuppliers(prev =>
        prev.map(s =>
          s.id === bonData.fournisseurId ? { ...s, dette: s.dette + bonData.total } : s
        )
      );
    }

    setBonsReception(prev => [newBon, ...prev]);
  };

  const recordSupplierPayment = (
    fournisseurId: string,
    montant: number,
    mode: PaymentMethod,
    avecSortieCaisse: boolean,
    note?: string
  ) => {
    const sup = suppliers.find(s => s.id === fournisseurId);
    if (!sup) return;

    const reglement: ReglementFournisseur = {
      id: `reg-sup-${Date.now()}`,
      fournisseurId,
      nomFournisseur: sup.nom,
      date: new Date().toISOString(),
      montant,
      mode,
      avecSortieCaisse,
      note,
    };

    setReglementsFournisseurs(prev => [reglement, ...prev]);

    // Decrease supplier debt
    setSuppliers(prev =>
      prev.map(s =>
        s.id === fournisseurId ? { ...s, dette: Math.max(0, s.dette - montant) } : s
      )
    );

    // If cash settlement with cash register withdrawal requested
    if (avecSortieCaisse && mode === 'ESPECE') {
      addMouvementCaisse(
        'SORTIE',
        `Règlement dette fournisseur: ${sup.nom}${note ? ` (${note})` : ''}`,
        montant
      );
    }

    posAudio.playCash();
  };

  // Reset to default demo data
  const resetDemoData = () => {
    localStorage.clear();
    setProducts(INITIAL_PRODUCTS);
    setClients(INITIAL_CLIENTS);
    setSuppliers(INITIAL_SUPPLIERS);
    setServices(INITIAL_SERVICES);
    setSales(INITIAL_VENTES);
    setCaisseSession(INITIAL_CAISSE);
    setMouvementsCaisse([]);
    setBonsReception([]);
    setCart([]);
    setCartDiscount(0);
    setSelectedClientIdState(null);
    setParkedCarts([]);
    setFlotteSolde(INITIAL_FLOTTE);
    setReglementsFournisseurs([]);
    setManagerPinState('1234');
  };

  return (
    <AppContext.Provider
      value={{
        currentRole,
        setCurrentRole,
        userName,
        setUserName,
        managerPin,
        setManagerPin,
        products,
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
        parkedCarts,
        parkCurrentCart,
        recallParkedCart,
        deleteParkedCart,
        sales,
        lastCompletedSale,
        setLastCompletedSale,
        finalizeSale,
        clients,
        addClient,
        updateClient,
        recordClientPayment,
        services,
        addServiceTransaction,
        flotteSolde,
        updateFlotteSolde,
        caisseSession,
        mouvementsCaisse,
        addMouvementCaisse,
        openCaisse,
        closeCaisse,
        suppliers,
        addSupplier,
        updateSupplier,
        bonsReception,
        addBonReception,
        reglementsFournisseurs,
        recordSupplierPayment,
        resetDemoData,
        searchQuery,
        setSearchQuery,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useApp = () => {
  const context = useContext(AppContext);
  if (!context) {
    throw new Error('useApp must be used within an AppProvider');
  }
  return context;
};
