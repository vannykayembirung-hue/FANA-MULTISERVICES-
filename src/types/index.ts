export type UserRole = 'ADMIN' | 'GERANT' | 'CAISSIER';

export type ProductUnit = 'PIECE' | 'KG' | 'LITRE' | 'SACHET' | 'CARTON';

export type PaymentMethod = 'ESPECE' | 'WAVE' | 'ORANGE_MONEY' | 'CREDIT';

export interface Lot {
  id: string;
  produitId: string;
  numeroLot: string;
  quantite: number;
  dlc: string; // ISO date YYYY-MM-DD
  dateReception: string;
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
  image?: string;
  lots: Lot[];
}

export interface CartItem {
  produit: Produit;
  quantite: number; // can be float for KG/Litre (e.g. 1.25)
  prixUnitaire: number;
  remiseLigne?: number;
}

export interface LigneVente {
  id: string;
  produitId: string;
  nomProduit: string;
  quantite: number;
  prixUnitaire: number;
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
  lignes: LigneVente[];
  margeEstimee: number;
}

export interface Client {
  id: string;
  nom: string;
  telephone: string;
  adresse?: string;
  credit: number; // Total dette actuelle
  plafondCredit: number; // Plafond max autorisé
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
  nom: string; // Wave, Orange Money, Photocopie, Recharge, Woyofal, etc.
  type: 'DEPOT' | 'RETRAIT' | 'PRESTATION' | 'RECHARGE';
  montant: number;
  commission: number;
  date: string;
  reference?: string;
  telephoneClient?: string;
  effectuePar: string;
}

export interface MouvementCaisse {
  id: string;
  type: 'ENTREE' | 'SORTIE';
  motif: string;
  montant: number;
  date: string;
  responsable: string;
}

export interface CaisseSession {
  id: string;
  dateOuverture: string;
  dateFermeture?: string;
  fondOuverture: number;
  statut: 'OUVERTE' | 'CLOTUREE';
  ouvertPar: string;
  cloturePar?: string;
  totalEspecesAttendu: number;
  totalWave: number;
  totalOrangeMoney: number;
  totalCreditAccorde: number;
  totalEntreesDiverses: number;
  totalSortiesDiverses: number;
  montantReelCompte?: number;
  ecartCaisse?: number; // reel - attendu
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
  wave: number;
  orangeMoney: number;
  woyofal: number;
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
