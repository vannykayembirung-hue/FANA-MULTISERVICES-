import React, { useState } from 'react';
import { Produit, ProductUnit } from '../../types';
import { formatFCFA } from '../../utils/format';
import { X, Check, PackagePlus, AlertCircle } from 'lucide-react';

interface ProductModalProps {
  productToEdit?: Produit | null;
  onSave: (
    productData: Omit<Produit, 'id' | 'lots' | 'stock'>,
    initialLot?: { quantite: number; dlc: string; numeroLot: string }
  ) => void;
  onClose: () => void;
}

export const ProductModal: React.FC<ProductModalProps> = ({
  productToEdit,
  onSave,
  onClose,
}) => {
  const [nom, setNom] = useState<string>(productToEdit?.nom || '');
  const [ean, setEan] = useState<string>(
    productToEdit?.ean || `61511000${Math.floor(10000 + Math.random() * 90000)}`
  );
  const [categorie, setCategorie] = useState<string>(productToEdit?.categorie || 'Épicerie');
  const [rayon, setRayon] = useState<string>(productToEdit?.rayon || '');
  const [prixAchat, setPrixAchat] = useState<number>(productToEdit?.prixAchat || 1000);
  const [prixVente, setPrixVente] = useState<number>(productToEdit?.prixVente || 1350);
  const [stockAlerte, setStockAlerte] = useState<number>(productToEdit?.stockAlerte || 10);
  const [unite, setUnite] = useState<ProductUnit>(productToEdit?.unite || 'PIECE');
  const [image, setImage] = useState<string>(
    productToEdit?.image ||
      'https://images.unsplash.com/photo-1542838132-92c53300491e?w=400&auto=format&fit=crop&q=80'
  );

  // Initial lot state (for new product creation)
  const [lotQuantite, setLotQuantite] = useState<number>(20);
  const [lotDlc, setLotDlc] = useState<string>(() => {
    const d = new Date();
    d.setMonth(d.getMonth() + 6);
    return d.toISOString().split('T')[0];
  });
  const [lotNumero, setLotNumero] = useState<string>(
    `LOT-${Date.now().toString().slice(-4)}`
  );

  // Real-time margin calculation
  const margeUnitaire = prixVente - prixAchat;
  const tauxMarge = prixVente > 0 ? ((margeUnitaire / prixVente) * 100).toFixed(1) : '0';

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!nom || prixVente <= 0) return;

    onSave(
      {
        nom,
        ean,
        categorie,
        rayon,
        prixAchat,
        prixVente,
        stockAlerte,
        unite,
        image,
      },
      !productToEdit
        ? {
            quantite: lotQuantite,
            dlc: lotDlc,
            numeroLot: lotNumero,
          }
        : undefined
    );
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="p-4 bg-slate-950 border-b border-slate-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <PackagePlus className="w-5 h-5 text-orange-400" />
            <h3 className="font-bold text-white text-base">
              {productToEdit ? 'Modifier le Produit' : 'Nouveau Produit & Lot Initial'}
            </h3>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 flex items-center justify-center"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 overflow-y-auto space-y-4 text-xs">
          {/* Product Name & EAN */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div className="space-y-1">
              <label className="text-slate-300 font-semibold block">Désignation du Produit *</label>
              <input
                type="text"
                required
                placeholder="Ex: Riz Parfumé Dinor 5kg"
                value={nom}
                onChange={e => setNom(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-hidden focus:border-orange-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-slate-300 font-semibold block">Code-Barres EAN-13</label>
              <input
                type="text"
                placeholder="Ex: 6151100010011"
                value={ean}
                onChange={e => setEan(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono focus:outline-hidden focus:border-orange-500"
              />
            </div>
          </div>

          {/* Category, Rayon, Unit */}
          <div className="grid grid-cols-3 gap-3">
            <div className="space-y-1">
              <label className="text-slate-300 font-semibold block">Catégorie</label>
              <select
                value={categorie}
                onChange={e => setCategorie(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-hidden focus:border-orange-500"
              >
                <option value="Épicerie">Épicerie</option>
                <option value="Frais & Boucherie">Frais &amp; Boucherie</option>
                <option value="Fruits & Légumes">Fruits &amp; Légumes</option>
                <option value="Boissons">Boissons</option>
                <option value="Boulangerie">Boulangerie</option>
                <option value="Entretien & Hygiène">Entretien &amp; Hygiène</option>
                <option value="Frais & Produits Laitiers">Produits Laitiers</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="text-slate-300 font-semibold block">Rayon / Allée</label>
              <input
                type="text"
                placeholder="Ex: Allée 2 - Riz"
                value={rayon}
                onChange={e => setRayon(e.target.value)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-hidden focus:border-orange-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-slate-300 font-semibold block">Unité de Vente</label>
              <select
                value={unite}
                onChange={e => setUnite(e.target.value as ProductUnit)}
                className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-bold text-orange-400 focus:outline-hidden focus:border-orange-500"
              >
                <option value="PIECE">Pièce (Unité)</option>
                <option value="KG">Au KG (Pesée)</option>
                <option value="LITRE">Au Litre</option>
                <option value="SACHET">Sachet</option>
                <option value="CARTON">Carton / Pack</option>
              </select>
            </div>
          </div>

          {/* Pricing & Automatic Margin */}
          <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
            <h4 className="font-bold text-slate-200">Tarification &amp; Marge Automatique</h4>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-slate-400 font-medium block">Prix Achat Fournisseur (FCFA)</label>
                <input
                  type="number"
                  min="0"
                  value={prixAchat}
                  onChange={e => setPrixAchat(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono focus:outline-hidden focus:border-orange-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 font-medium block">Prix Vente Client (FCFA) *</label>
                <input
                  type="number"
                  min="0"
                  value={prixVente}
                  onChange={e => setPrixVente(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-orange-400 font-bold font-mono focus:outline-hidden focus:border-orange-500"
                />
              </div>

              <div className="space-y-1">
                <label className="text-slate-400 font-medium block">Stock Seuil Alerte</label>
                <input
                  type="number"
                  min="1"
                  value={stockAlerte}
                  onChange={e => setStockAlerte(parseFloat(e.target.value) || 5)}
                  className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono focus:outline-hidden focus:border-orange-500"
                />
              </div>
            </div>

            {/* Calculated Margin Pill */}
            <div className="p-2.5 bg-slate-900 rounded-lg border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-slate-400">Marge Brute Réalisée :</span>
                <span className="font-bold text-emerald-400 font-mono ml-2">
                  +{formatFCFA(margeUnitaire)}
                </span>
              </div>
              <div>
                <span className="text-slate-400">Taux de marge :</span>
                <span className="font-bold text-white font-mono ml-2">{tauxMarge}%</span>
              </div>
            </div>
          </div>

          {/* Initial Lot (FEFO & DLC) for new product */}
          {!productToEdit && (
            <div className="p-3.5 bg-slate-950 border border-slate-800 rounded-xl space-y-3">
              <div className="flex items-center gap-2 text-slate-200 font-bold">
                <AlertCircle className="w-4 h-4 text-orange-400" />
                <span>Premier Lot de Réception (FEFO)</span>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div className="space-y-1">
                  <label className="text-slate-400 font-medium block">Numéro de Lot</label>
                  <input
                    type="text"
                    value={lotNumero}
                    onChange={e => setLotNumero(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono focus:outline-hidden focus:border-orange-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-400 font-medium block">Quantité Reçue ({unite})</label>
                  <input
                    type="number"
                    min="1"
                    value={lotQuantite}
                    onChange={e => setLotQuantite(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono focus:outline-hidden focus:border-orange-500"
                  />
                </div>

                <div className="space-y-1">
                  <label className="text-slate-400 font-medium block">DLC (Date Limite Consommation)</label>
                  <input
                    type="date"
                    required
                    value={lotDlc}
                    onChange={e => setLotDlc(e.target.value)}
                    className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white focus:outline-hidden focus:border-orange-500"
                  />
                </div>
              </div>
            </div>
          )}

          {/* Image URL & Preset Picker */}
          <div className="space-y-2">
            <label className="text-slate-300 font-semibold block">Photo du Produit</label>
            <div className="flex gap-3 items-center">
              <div className="w-14 h-14 rounded-xl bg-slate-950 border border-slate-750 overflow-hidden shrink-0 flex items-center justify-center">
                {image ? (
                  <img src={image} alt="Aperçu" className="w-full h-full object-cover" />
                ) : (
                  <span className="text-[10px] text-slate-500">Sans image</span>
                )}
              </div>
              <input
                type="url"
                placeholder="https://images.unsplash.com/... (ou sélectionnez ci-dessous)"
                value={image}
                onChange={e => setImage(e.target.value)}
                className="flex-1 px-3 py-2 bg-slate-800 border border-slate-750 rounded-xl text-white font-mono text-[11px] focus:outline-hidden focus:border-orange-500"
              />
            </div>

            {/* Quick Presets */}
            <div className="flex flex-wrap gap-1.5 pt-1">
              {[
                { label: 'Riz', url: 'https://images.unsplash.com/photo-1586201375761-83865001e31c?w=400&auto=format&fit=crop&q=80' },
                { label: 'Huile', url: 'https://images.unsplash.com/photo-1474979266404-7eaacbcd87c5?w=400&auto=format&fit=crop&q=80' },
                { label: 'Lait', url: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?w=400&auto=format&fit=crop&q=80' },
                { label: 'Sucre', url: 'https://images.unsplash.com/photo-1581441363689-1f3c3c414635?w=400&auto=format&fit=crop&q=80' },
                { label: 'Pain', url: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?w=400&auto=format&fit=crop&q=80' },
                { label: 'Tomates', url: 'https://images.unsplash.com/photo-1592924357228-91a4daadcfea?w=400&auto=format&fit=crop&q=80' },
                { label: 'Oignons', url: 'https://images.unsplash.com/photo-1618512496248-a07fe83aa8cb?w=400&auto=format&fit=crop&q=80' },
                { label: 'Poulet', url: 'https://images.unsplash.com/photo-1604503468506-a8da13d82791?w=400&auto=format&fit=crop&q=80' },
                { label: 'Eau', url: 'https://images.unsplash.com/photo-1548839140-29a749e1bc4e?w=400&auto=format&fit=crop&q=80' },
                { label: 'Café', url: 'https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=400&auto=format&fit=crop&q=80' },
                { label: 'Savon', url: 'https://images.unsplash.com/photo-1607006314649-96894c50259b?w=400&auto=format&fit=crop&q=80' },
              ].map(preset => (
                <button
                  key={preset.label}
                  type="button"
                  onClick={() => setImage(preset.url)}
                  className={`px-2 py-0.5 rounded-md text-[10px] font-bold border transition-colors cursor-pointer ${
                    image === preset.url
                      ? 'bg-orange-500 text-white border-orange-500'
                      : 'bg-slate-800 text-slate-300 border-slate-750 hover:bg-slate-750'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold"
            >
              Annuler
            </button>
            <button
              type="submit"
              className="px-5 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold flex items-center gap-1.5 shadow-lg shadow-orange-500/20"
            >
              <Check className="w-4 h-4" />
              <span>Enregistrer le Produit</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
