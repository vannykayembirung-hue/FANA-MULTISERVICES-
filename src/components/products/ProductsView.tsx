import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Produit } from '../../types';
import { formatFCFA, getDlcStatus } from '../../utils/format';
import { ProductModal } from './ProductModal';
import { AddLotModal } from './AddLotModal';
import { 
  Package, 
  Plus, 
  Search, 
  AlertTriangle, 
  Layers, 
  Edit, 
  Trash2, 
  Barcode, 
  ChevronDown, 
  ChevronUp,
  Tag,
  Calendar,
  CheckCircle2,
  Printer
} from 'lucide-react';

export const ProductsView: React.FC = () => {
  const { products, addProduct, updateProduct, deleteProduct, addLotToProduct } = useApp();

  const [search, setSearch] = useState<string>('');
  const [selectedCategory, setSelectedCategory] = useState<string>('TOUS');
  const [filterAlertOnly, setFilterAlertOnly] = useState<boolean>(false);
  const [expandedProductId, setExpandedProductId] = useState<string | null>(null);

  // Modals
  const [isProductModalOpen, setIsProductModalOpen] = useState<boolean>(false);
  const [productToEdit, setProductToEdit] = useState<Produit | null>(null);
  const [lotProductTarget, setLotProductTarget] = useState<Produit | null>(null);

  // Barcode shelf tag print modal preview
  const [printedTagProduct, setPrintedTagProduct] = useState<Produit | null>(null);

  const categories = ['TOUS', ...Array.from(new Set(products.map(p => p.categorie)))];

  const filtered = products.filter(p => {
    const matchCategory = selectedCategory === 'TOUS' || p.categorie === selectedCategory;
    const matchSearch =
      p.nom.toLowerCase().includes(search.toLowerCase()) ||
      p.ean.includes(search) ||
      (p.rayon && p.rayon.toLowerCase().includes(search.toLowerCase()));

    if (filterAlertOnly) {
      const isLowStock = p.stock <= p.stockAlerte;
      const hasDlcAlert = p.lots.some(l => {
        const s = getDlcStatus(l.dlc);
        return s.status === 'CRITICAL' || s.status === 'EXPIRED';
      });
      return matchCategory && matchSearch && (isLowStock || hasDlcAlert);
    }

    return matchCategory && matchSearch;
  });

  const handleOpenAddModal = () => {
    setProductToEdit(null);
    setIsProductModalOpen(true);
  };

  const handleOpenEditModal = (p: Produit) => {
    setProductToEdit(p);
    setIsProductModalOpen(true);
  };

  const handleSaveProduct = (
    data: Omit<Produit, 'id' | 'lots' | 'stock'>,
    initialLot?: { quantite: number; dlc: string; numeroLot: string }
  ) => {
    if (productToEdit) {
      updateProduct({
        ...productToEdit,
        ...data,
      });
    } else {
      addProduct(data, initialLot);
    }
    setIsProductModalOpen(false);
    setProductToEdit(null);
  };

  const toggleExpandLots = (id: string) => {
    setExpandedProductId(prev => (prev === id ? null : id));
  };

  return (
    <div className="flex-1 p-4 lg:p-6 overflow-y-auto space-y-5 bg-slate-900 text-slate-100">
      {/* Header bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 pb-2 border-b border-slate-800">
        <div>
          <h1 className="text-2xl font-black text-white tracking-tight flex items-center gap-2">
            <span>Catalogue Produits &amp; Stocks FEFO</span>
            <span className="text-xs px-2 py-0.5 rounded-md bg-orange-500/20 text-orange-400 font-bold border border-orange-500/30">
              {products.length} Articles
            </span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Suivi unitaire des marges réelles, traçabilité par LOT et alertes DLC automatiques.
          </p>
        </div>

        <button
          type="button"
          onClick={handleOpenAddModal}
          className="px-4 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-xs sm:text-sm flex items-center gap-2 shadow-lg shadow-orange-500/20 self-start sm:self-auto transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Nouveau Produit</span>
        </button>
      </div>

      {/* Filters and Search Bar */}
      <div className="flex flex-col md:flex-row items-stretch md:items-center justify-between gap-3 bg-slate-850 p-3 rounded-2xl border border-slate-750">
        {/* Search */}
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Rechercher par nom, code EAN, rayon..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-slate-800 border border-slate-700 rounded-xl text-white text-xs placeholder-slate-400 focus:outline-hidden focus:border-orange-500"
          />
        </div>

        {/* Category selector */}
        <div className="flex items-center gap-2 overflow-x-auto no-scrollbar py-1">
          {categories.map(cat => (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedCategory === cat
                  ? 'bg-orange-500 text-white shadow-sm'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-750 hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Filter Alert Toggle */}
        <button
          type="button"
          onClick={() => setFilterAlertOnly(!filterAlertOnly)}
          className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 border transition-all shrink-0 ${
            filterAlertOnly
              ? 'bg-red-950/80 text-red-300 border-red-700 ring-1 ring-red-600'
              : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-slate-200'
          }`}
        >
          <AlertTriangle className="w-3.5 h-3.5 text-red-400" />
          <span>Alertes Seules (DLC &lt; 3j / Rupture)</span>
        </button>
      </div>

      {/* Products Table */}
      <div className="bg-slate-850 border border-slate-750 rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950 text-slate-400 uppercase font-semibold text-[10px] tracking-wider border-b border-slate-750">
              <tr>
                <th className="py-3 px-4">Désignation &amp; EAN</th>
                <th className="py-3 px-3">Rayon / Catégorie</th>
                <th className="py-3 px-3 text-right">Prix Achat</th>
                <th className="py-3 px-3 text-right">Prix Vente</th>
                <th className="py-3 px-3 text-right">Marge Unitaire</th>
                <th className="py-3 px-3 text-center">Stock Total</th>
                <th className="py-3 px-3 text-center">Lots FEFO &amp; DLC</th>
                <th className="py-3 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="py-10 text-center text-slate-500">
                    <Package className="w-8 h-8 mx-auto text-slate-600 mb-2" />
                    <p className="font-semibold text-slate-300">Aucun produit ne correspond aux critères</p>
                  </td>
                </tr>
              ) : (
                filtered.map(product => {
                  const marge = product.prixVente - product.prixAchat;
                  const tauxMarge =
                    product.prixVente > 0 ? ((marge / product.prixVente) * 100).toFixed(1) : '0';
                  const isLowStock = product.stock <= product.stockAlerte;
                  const isExpanded = expandedProductId === product.id;

                  // Find earliest lot DLC
                  const sortedLots = [...product.lots].sort(
                    (a, b) => new Date(a.dlc).getTime() - new Date(b.dlc).getTime()
                  );
                  const nextExpiringLot = sortedLots[0];
                  const dlcInfo = nextExpiringLot ? getDlcStatus(nextExpiringLot.dlc) : null;

                  return (
                    <React.Fragment key={product.id}>
                      <tr className="hover:bg-slate-800/50 transition-colors">
                        {/* Name & EAN */}
                        <td className="py-3 px-4">
                          <div className="flex items-center gap-3">
                            <img
                              src={product.image || 'https://images.unsplash.com/photo-1542838132-92c53300491e?w=100&auto=format&fit=crop&q=80'}
                              alt={product.nom}
                              className="w-10 h-10 rounded-lg object-cover bg-slate-900 border border-slate-700 shrink-0"
                            />
                            <div>
                              <div className="font-bold text-white text-xs sm:text-sm hover:text-orange-400 cursor-pointer">
                                {product.nom}
                              </div>
                              <div className="flex items-center gap-1.5 text-[11px] text-slate-400 font-mono mt-0.5">
                                <Barcode className="w-3.5 h-3.5 text-slate-500" />
                                <span>{product.ean}</span>
                              </div>
                            </div>
                          </div>
                        </td>

                        {/* Category & Rayon */}
                        <td className="py-3 px-3">
                          <span className="text-white font-medium block">{product.categorie}</span>
                          <span className="text-[10px] text-slate-400">{product.rayon || 'Non classé'}</span>
                        </td>

                        {/* Prix Achat */}
                        <td className="py-3 px-3 text-right font-mono text-slate-300">
                          {formatFCFA(product.prixAchat)}
                        </td>

                        {/* Prix Vente */}
                        <td className="py-3 px-3 text-right font-mono font-bold text-orange-400">
                          {formatFCFA(product.prixVente)}
                          <span className="text-[10px] text-slate-400 block font-sans">
                            / {product.unite}
                          </span>
                        </td>

                        {/* Marge Unitaire */}
                        <td className="py-3 px-3 text-right font-mono">
                          <span className="font-bold text-emerald-400">+{formatFCFA(marge)}</span>
                          <span className="text-[10px] text-slate-400 block">{tauxMarge}%</span>
                        </td>

                        {/* Stock Total */}
                        <td className="py-3 px-3 text-center">
                          <div className="inline-flex flex-col items-center">
                            <span
                              className={`px-2 py-0.5 rounded-md font-mono font-bold text-xs ${
                                isLowStock
                                  ? 'bg-red-950/80 text-red-300 border border-red-800'
                                  : 'bg-slate-800 text-white border border-slate-700'
                              }`}
                            >
                              {product.stock} {product.unite === 'KG' ? 'kg' : ''}
                            </span>
                            {isLowStock && (
                              <span className="text-[9px] text-red-400 font-medium mt-0.5">
                                Alerte (&le; {product.stockAlerte})
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Lots FEFO & DLC */}
                        <td className="py-3 px-3 text-center">
                          {dlcInfo ? (
                            <button
                              type="button"
                              onClick={() => toggleExpandLots(product.id)}
                              className="inline-flex items-center gap-1.5 px-2 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 transition-colors"
                            >
                              <span className={`text-[10px] px-1.5 py-0.2 rounded ${dlcInfo.badgeClass}`}>
                                {dlcInfo.label}
                              </span>
                              <span className="text-[11px] text-slate-300 font-bold">
                                ({product.lots.length} lot{product.lots.length > 1 ? 's' : ''})
                              </span>
                              {isExpanded ? (
                                <ChevronUp className="w-3.5 h-3.5 text-slate-400" />
                              ) : (
                                <ChevronDown className="w-3.5 h-3.5 text-slate-400" />
                              )}
                            </button>
                          ) : (
                            <span className="text-slate-500 text-[11px]">Aucun lot actif</span>
                          )}
                        </td>

                        {/* Actions */}
                        <td className="py-3 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            <button
                              type="button"
                              onClick={() => setLotProductTarget(product)}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-orange-500/20 text-slate-300 hover:text-orange-400 border border-slate-700"
                              title="Réceptionner un nouveau lot (FEFO)"
                            >
                              <Plus className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => setPrintedTagProduct(product)}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700"
                              title="Imprimer étiquette code-barre rayon"
                            >
                              <Printer className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => handleOpenEditModal(product)}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white border border-slate-700"
                              title="Modifier produit"
                            >
                              <Edit className="w-3.5 h-3.5" />
                            </button>

                            <button
                              type="button"
                              onClick={() => {
                                if (confirm(`Supprimer définitivement ${product.nom} ?`)) {
                                  deleteProduct(product.id);
                                }
                              }}
                              className="p-1.5 rounded-lg bg-slate-800 hover:bg-red-950/40 text-slate-400 hover:text-red-400 border border-slate-700"
                              title="Supprimer produit"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>

                      {/* Expandable FEFO lots subtable */}
                      {isExpanded && (
                        <tr className="bg-slate-950/70 border-b border-slate-800">
                          <td colSpan={8} className="py-3 px-6">
                            <div className="p-3 bg-slate-900 rounded-xl border border-slate-800 space-y-2">
                              <div className="flex items-center justify-between">
                                <span className="font-bold text-xs text-orange-400 flex items-center gap-1.5">
                                  <Layers className="w-3.5 h-3.5" />
                                  Détail des Lots en Stock - Règle FEFO (First Expired First Out)
                                </span>
                                <button
                                  type="button"
                                  onClick={() => setLotProductTarget(product)}
                                  className="text-xs text-slate-300 hover:text-white font-semibold flex items-center gap-1"
                                >
                                  <Plus className="w-3 h-3 text-orange-400" />
                                  Ajouter un lot
                                </button>
                              </div>

                              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2 pt-1">
                                {sortedLots.map(lot => {
                                  const status = getDlcStatus(lot.dlc);
                                  return (
                                    <div
                                      key={lot.id}
                                      className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 flex items-center justify-between"
                                    >
                                      <div>
                                        <div className="font-mono text-xs font-bold text-white">
                                          {lot.numeroLot}
                                        </div>
                                        <div className="text-[10px] text-slate-400 mt-0.5">
                                          Reçu le : {lot.dateReception}
                                        </div>
                                        <div className="text-[11px] font-semibold text-slate-200 mt-1">
                                          Quantité : {lot.quantite} {product.unite}
                                        </div>
                                      </div>
                                      <div className="text-right">
                                        <span
                                          className={`text-[10px] px-2 py-0.5 rounded font-bold ${status.badgeClass}`}
                                        >
                                          {status.label}
                                        </span>
                                        <div className="text-[9px] text-slate-500 mt-1">
                                          DLC : {lot.dlc}
                                        </div>
                                      </div>
                                    </div>
                                  );
                                })}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal: Create or Edit Product */}
      {isProductModalOpen && (
        <ProductModal
          productToEdit={productToEdit}
          onSave={handleSaveProduct}
          onClose={() => {
            setIsProductModalOpen(false);
            setProductToEdit(null);
          }}
        />
      )}

      {/* Modal: Add Lot FEFO */}
      {lotProductTarget && (
        <AddLotModal
          product={lotProductTarget}
          onAddLot={lotData => {
            addLotToProduct(lotProductTarget.id, lotData);
            setLotProductTarget(null);
          }}
          onClose={() => setLotProductTarget(null)}
        />
      )}

      {/* Modal: Shelf Tag Barcode Print Preview */}
      {printedTagProduct && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm bg-slate-900 border border-slate-800 rounded-2xl shadow-2xl p-5 space-y-4">
            <h3 className="font-bold text-white text-base">Étiquette Rayon &amp; Code-barre</h3>
            <div className="p-4 bg-white text-black rounded-xl text-center space-y-1">
              <p className="font-black text-sm uppercase">{printedTagProduct.nom}</p>
              <p className="text-[10px] text-gray-600">{printedTagProduct.rayon || printedTagProduct.categorie}</p>
              <div className="text-2xl font-black py-1 font-mono text-black">
                {formatFCFA(printedTagProduct.prixVente)}
              </div>
              <div className="flex justify-center items-center gap-[2px] h-10 my-2">
                {Array.from({ length: 30 }).map((_, i) => (
                  <div
                    key={i}
                    className={`h-full bg-black ${i % 3 === 0 ? 'w-[2px]' : 'w-[1px]'}`}
                  />
                ))}
              </div>
              <p className="text-xs font-mono tracking-widest">{printedTagProduct.ean}</p>
            </div>
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setPrintedTagProduct(null)}
                className="px-3 py-2 rounded-lg bg-slate-800 text-slate-300 text-xs font-semibold"
              >
                Fermer
              </button>
              <button
                type="button"
                onClick={() => window.print()}
                className="px-4 py-2 rounded-lg bg-orange-500 text-white font-bold text-xs flex items-center gap-1.5"
              >
                <Printer className="w-4 h-4" />
                Imprimer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
