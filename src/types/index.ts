export type UserRole = 'ADMIN' | 'GERANT' | 'CAISSIER';
export type Currency = 'CDF' | 'USD';
export type ProductUnit = 'PIECE' | 'KG' | 'LITRE' | 'SACHET' | 'CARTON';
export type PaymentMethod = 'ESPECE' | 'MPESA' | 'ORANGE_MONEY' | 'AIRTEL_MONEY' | 'AFRIMONEY' | 'CREDIT';

export interface AppUser {
  id: string;
  organizationId: string;
  organizationName: string;
  name: string;
  email: string;
  role: UserRole;
}

export interface WorkspaceSettings {
  currency: Currency;
  /** Manually entered rate: Congolese francs per one US dollar. */
  usdRate: number | null;
}

export interface Lot {
  id: string;
  produitId: string;
  numeroLot: string;
  quantite: number;
  dlc: string;
  dateReception: string;
  /** Unit acquisition cost captured when this batch is received (base CDF). */
  prixAchat?: number;
}

export interface Produit {
  id: string;
  nom: string;
  ean: string;
  categorie: string;
  prixAchat: number;
  prixVente: number;
  stock: number;
  stockAlerte: number;
  unite: ProductUnit;
  rayon?: string;
  /** Small, compressed data URL stored with this product in Neon. */
  image?: string;
  lots: Lot[];
}

export interface CartItem {
  produit: Produit;
  quantite: number;
  prixUnitaire: number;
  remiseLigne?: number;
}

export interface LigneVente {
  id: string;
  produitId: string;
  nomProduit: string;
  quantite: number;
  prixUnitaire: number;
  coutUnitaire: number;
  /** Exact COGS for the sold quantity; supports sales drawn from multiple FEFO lots. */
  coutTotal?: number;
  totalLigne: number;
  unite: ProductUnit;
}

export interface Vente {
  id: string;
  numeroTicket: string;
  createdAt: string;
  totalBrut: number;
  remise: number;
  totalNet: number;
  paiement: PaymentMethod;
  montantRecu?: number;
  renduMonnaie?: number;
  clientId?: string;
  nomClient?: string;
  caissierId: string;
  nomCaissier: string;
  nomMagasin: string;
  devise: Currency;
  tauxChange: number | null;
  referencePaiement?: string;
  telephonePaiement?: string;
  lignes: LigneVente[];
  margeEstimee: number;
}

export interface Client {
  id: string;
  nom: string;
  telephone: string;
  adresse?: string;
  credit: number;
  plafondCredit: number;
  historiquePaiements?: {
    id: string;
    date: string;
    montant: number;
    mode: PaymentMethod;
    note?: string;
  }[];
}

export interface ServiceTransaction {
  id: string;
  nom: string;
  type: 'DEPOT' | 'RETRAIT' | 'PRESTATION' | 'RECHARGE';
  montant: number;
  commission: number;
  date: string;
  reference?: string;
  telephoneClient?: string;
  effectuePar: string;
  devise?: Currency;
  tauxChange?: number | null;
}

export type ServiceCatalogType = 'PRESTATION' | 'RECHARGE';

export interface ServiceCatalogItem {
  id: string;
  nom: string;
  type: ServiceCatalogType;
}

export interface MouvementCaisse {
  id: string;
  sessionId: string;
  type: 'ENTREE' | 'SORTIE';
  motif: string;
  montant: number;
  date: string;
  responsable: string;
  /** False for balance-sheet movements such as buying stock or paying supplier debt. */
  impactBenefice?: boolean;
}

export interface CaisseSession {
  id: string;
  dateOuverture: string;
  dateFermeture?: string;
  fondOuverture: number;
  statut: 'OUVERTE' | 'CLOTUREE';
  ouvertPar: string;
  ouvertParId?: string;
  cloturePar?: string;
  clotureParId?: string;
  totalEspecesAttendu: number;
  totalMpesa: number;
  totalOrangeMoney: number;
  totalAirtelMoney: number;
  totalAfrimoney: number;
  totalCreditAccorde: number;
  totalEntreesDiverses: number;
  totalSortiesDiverses: number;
  montantReelCompte?: number;
  ecartCaisse?: number;
  notesCloture?: string;
}

export interface Fournisseur {
  id: string;
  nom: string;
  telephone: string;
  contact: string;
  adresse: string;
  dette: number;
}

export interface BonReception {
  id: string;
  numeroBon: string;
  fournisseurId: string;
  nomFournisseur: string;
  date: string;
  total: number;
  statutPaiement: 'PAYE' | 'A_CREDIT';
  modePaiement?: Exclude<PaymentMethod, 'CREDIT'>;
  articles: {
    produitId: string;
    nomProduit: string;
    quantite: number;
    prixAchat: number;
    numeroLot: string;
    dlc: string;
  }[];
}

export interface FlotteSolde {
  mpesa: number;
  orangeMoney: number;
  airtelMoney: number;
  afrimoney: number;
}

export interface ReglementFournisseur {
  id: string;
  fournisseurId: string;
  nomFournisseur: string;
  date: string;
  montant: number;
  mode: PaymentMethod;
  avecSortieCaisse: boolean;
  note?: string;
}

export interface ParkedCart {
  id: string;
  savedAt: string;
  items: CartItem[];
  clientId?: string;
  clientName?: string;
  discount: number;
}
