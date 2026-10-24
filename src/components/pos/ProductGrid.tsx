import React, { useState, useEffect, useCallback } from 'react';
import { Produit } from '../../types';
import { formatCurrencyShort, getDlcStatus } from '../../utils/format';
import { getExpiredStock, getSellableStock } from '../../utils/inventory';
import { hardwareScanner, ScannerStatus } from '../../utils/hardwareScanner';
import { HardwareScannerModal } from './HardwareScannerModal';
import { 
  Search, 
  Scale, 
  AlertCircle,
  Layers,
  Check,
  Usb
} from 'lucide-react';
import { posAudio } from '../../utils/audio';

interface ProductGridProps {
  products: Produit[];
  onSelectProduct: (product: Produit) => void;
  onRequestWeigh: (product: Produit) => void;
}

export const ProductGrid: React.FC<ProductGridProps> = ({
  products,
  onSelectProduct,
  onRequestWeigh,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('TOUS');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [scanSuccessMessage, setScanSuccessMessage] = useState<string | null>(null);
  const [scanMessageIsError, setScanMessageIsError] = useState(false);
  const showScanMessage = useCallback((message: string, isError = false) => {
    setScanMessageIsError(isError);
    setScanSuccessMessage(message);
    window.setTimeout(() => setScanSuccessMessage(current => current === message ? null : current), 3000);
  }, []);
  const [isHardwareModalOpen, setIsHardwareModalOpen] = useState<boolean>(false);
  const [scannerStatus, setScannerStatus] = useState<ScannerStatus>(hardwareScanner.getStatus());

  // Listen to background Web Serial, Web HID, and USB Keyboard Wedge barcode scans
  useEffect(() => {
    const unsubStatus = hardwareScanner.subscribeStatus(st => {
      setScannerStatus(st);
    });

    const unsubBarcode = hardwareScanner.subscribeBarcode((barcode, source) => {
      const cleanEan = barcode.trim();
      const matched = products.find(p => p.ean === cleanEan);

      if (matched) {
        if (getSellableStock(matched) <= 0) {
          posAudio.playError();
          showScanMessage(getExpiredStock(matched) > 0
            ? `« ${matched.nom} » est périmé : vente impossible.`
            : `« ${matched.nom} » est en rupture de stock.`, true);
          setSearchQuery('');
          return;
        }
        posAudio.playBeep();
        if (matched.unite === 'KG') {
          onRequestWeigh(matched);
        } else {
          onSelectProduct(matched);
        }
        const srcLabel = source === 'SERIAL' ? 'Web Serial' : source === 'HID' ? 'Web HID' : 'Douchette USB';
        setSearchQuery('');
        showScanMessage(`Scanné via ${srcLabel} : ${matched.nom}`);
      } else {
        posAudio.playError();
        setSearchQuery('');
        showScanMessage(`Code-barre [${cleanEan}] non répertorié.`, true);
      }
    });

    return () => {
      unsubStatus();
      unsubBarcode();
    };
  }, [products, onSelectProduct, onRequestWeigh, showScanMessage]);

  // Extract unique categories
  const categories = ['TOUS', ...Array.from(new Set(products.map(p => p.categorie)))];

  // Filter products
  const filteredProducts = products.filter(p => {
    const matchesCategory = selectedCategory === 'TOUS' || p.categorie === selectedCategory;
    const matchesSearch =
      p.nom.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.ean.includes(searchQuery) ||
      (p.rayon && p.rayon.toLowerCase().includes(searchQuery.toLowerCase()));
    return matchesCategory && matchesSearch;
  });

  // Pressing Enter on a full barcode adds that product; ordinary text remains a search filter.
  const handleSearchSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const cleanEan = searchQuery.trim();
    if (!cleanEan) return;
    const matched = products.find(product => product.ean === cleanEan);
    if (!matched) return;
    if (getSellableStock(matched) <= 0) {
      posAudio.playError();
      showScanMessage(getExpiredStock(matched) > 0
        ? `« ${matched.nom} » est périmé : vente impossible.`
        : `« ${matched.nom} » est en rupture de stock.`, true);
      return;
    }
    if (matched.unite === 'KG') onRequestWeigh(matched);
    else onSelectProduct(matched);
    posAudio.playBeep();
    showScanMessage(`Code reconnu : ${matched.nom}`);
    setSearchQuery('');
  };

  const handleProductCardClick = (product: Produit) => {
    if (getSellableStock(product) <= 0) {
      posAudio.playError();
      showScanMessage(getExpiredStock(product) > 0
        ? `« ${product.nom} » est périmé : vente impossible.`
        : `« ${product.nom} » est en rupture de stock.`, true);
      return;
    }
    if (product.unite === 'KG') {
      onRequestWeigh(product);
    } else {
      onSelectProduct(product);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-slate-900 overflow-hidden border-r border-slate-800">
      {/* One field for product names and direct EAN entry */}
      <div className="p-3 bg-slate-950 border-b border-slate-800 flex items-center gap-2">
        <form onSubmit={handleSearchSubmit} className="relative flex-1 min-w-0">
          <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="text"
            placeholder="Rechercher un produit ou saisir un code-barres…"
            value={searchQuery}
            onChange={event => setSearchQuery(event.target.value)}
            className="w-full pl-9 pr-9 py-2.5 bg-slate-850 border border-slate-750 rounded-xl text-white text-sm placeholder-slate-400 focus:outline-hidden focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all"
            aria-label="Rechercher un produit ou saisir un code-barres"
          />
          {searchQuery && <button type="button" onClick={() => setSearchQuery('')} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-xs text-slate-400 hover:text-white" aria-label="Effacer la recherche">✕</button>}
        </form>
        <button
          type="button"
          onClick={() => setIsHardwareModalOpen(true)}
          className={`p-2.5 rounded-xl border flex items-center gap-1.5 text-xs font-semibold shrink-0 transition-all ${
            scannerStatus.isSerialConnected || scannerStatus.isHidConnected
              ? 'bg-emerald-950/80 border-emerald-600 text-emerald-300 shadow-sm'
              : 'bg-slate-850 hover:bg-slate-800 text-slate-300 hover:text-white border-slate-750'
          }`}
          title="Configurer une douchette code-barres"
          aria-label="Configurer une douchette code-barres"
        >
          <Usb className="w-4 h-4 text-orange-400" />
          <span className="hidden lg:inline">{scannerStatus.isSerialConnected ? 'Scanner connecté' : scannerStatus.isHidConnected ? 'Scanner connecté' : 'Scanner'}</span>
          {(scannerStatus.isSerialConnected || scannerStatus.isHidConnected) && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />}
        </button>
      </div>

      {/* Notification Toast for Scan */}
      {scanSuccessMessage && (
        <div className={`px-4 py-1.5 text-xs font-semibold border-b flex items-center justify-between animate-in fade-in ${scanMessageIsError ? 'bg-red-950/90 text-red-200 border-red-800' : 'bg-emerald-950/80 text-emerald-300 border-emerald-800'}`} role={scanMessageIsError ? 'alert' : 'status'}>
          <span className="flex items-center gap-2">
            {scanMessageIsError ? <AlertCircle className="w-3.5 h-3.5 text-red-300" /> : <Check className="w-3.5 h-3.5 text-emerald-400" />}
            {scanSuccessMessage}
          </span>
        </div>
      )}

      {/* Category Pills Bar */}
      <div className="px-3 py-2 bg-slate-950/40 border-b border-slate-800 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        {categories.map(cat => {
          const isActive = selectedCategory === cat;
          return (
            <button
              key={cat}
              type="button"
              onClick={() => setSelectedCategory(cat)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all whitespace-nowrap shrink-0 ${
                isActive
                  ? 'bg-orange-500 text-white shadow-md shadow-orange-500/25 ring-1 ring-orange-400'
                  : 'bg-slate-800/80 text-slate-300 hover:bg-slate-800 hover:text-white border border-slate-750'
              }`}
            >
              {cat}
            </button>
          );
        })}
      </div>

      {/* Tactile Grid of Products */}
      <div className="flex-1 p-3 overflow-y-auto">
        {filteredProducts.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 p-8 text-center">
            <AlertCircle className="w-12 h-12 text-slate-600 mb-2" />
            <p className="text-sm font-semibold text-slate-300">Aucun produit trouvé</p>
            <p className="text-xs text-slate-500 mt-1">
              Essayez un autre mot-clé ou vérifiez la catégorie sélectionnée.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2.5">
            {filteredProducts.map(product => {
              const sellableStock = getSellableStock(product);
              const expiredStock = getExpiredStock(product);
              const isLowStock = sellableStock <= product.stockAlerte;
              const isOutOfStock = sellableStock <= 0;
              const today = new Date().toISOString().slice(0, 10);
              const eligibleLots = (product.lots || [])
                .filter(lot => lot.quantite > 0 && (!lot.dlc || lot.dlc >= today))
                .sort((a, b) => a.dlc.localeCompare(b.dlc));

              let urgentDlcAlert: string | null = null;
              if (isOutOfStock && expiredStock > 0) {
                urgentDlcAlert = 'Périmé — vente bloquée';
              } else if (eligibleLots[0]?.dlc) {
                const dlc = getDlcStatus(eligibleLots[0].dlc);
                if (dlc.status === 'CRITICAL') urgentDlcAlert = dlc.label;
              }

              return (
                <div
                  key={product.id}
                  onClick={() => handleProductCardClick(product)}
                  aria-disabled={isOutOfStock}
                  className={`group relative flex flex-col rounded-xl overflow-hidden border transition-all duration-150 select-none cursor-pointer ${
                    isOutOfStock
                      ? 'bg-slate-900/50 border-slate-800 opacity-60 cursor-not-allowed'
                      : 'bg-slate-850 hover:bg-slate-800 border-slate-750 hover:border-orange-500/50 hover:shadow-lg hover:shadow-orange-950/20 active:scale-[0.98]'
                  }`}
                >
                  {/* Image container */}
                  <div className="relative h-24 sm:h-28 w-full bg-slate-950 overflow-hidden">
                    {product.image ? (
                      <img
                        src={product.image}
                        alt={product.nom}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        loading="lazy"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-slate-900 text-slate-600">
                        <Layers className="w-8 h-8" />
                      </div>
                    )}

                    {/* Gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-slate-900 via-transparent to-transparent opacity-80" />

                    {/* Stock badge */}
                    <div className="absolute top-1.5 right-1.5">
                      <span
                        className={`text-[10px] font-bold px-1.5 py-0.5 rounded-md font-mono ${
                          isOutOfStock
                            ? 'bg-red-950 text-red-400 border border-red-800'
                            : isLowStock
                            ? 'bg-amber-950 text-amber-300 border border-amber-800'
                            : 'bg-slate-900/80 text-emerald-400 border border-slate-700 backdrop-blur-xs'
                        }`}
                      >
                        {sellableStock} {product.unite === 'KG' ? 'kg' : ''}
                      </span>
                    </div>

                    {/* Weight indicator or DLC alert */}
                    <div className="absolute bottom-1.5 left-1.5 flex items-center gap-1">
                      {product.unite === 'KG' ? (
                        <span className="flex items-center gap-1 text-[10px] font-bold bg-orange-950/80 text-orange-300 border border-orange-700/80 px-1.5 py-0.5 rounded">
                          <Scale className="w-3 h-3" />
                          Au poids
                        </span>
                      ) : null}

                      {urgentDlcAlert && (
                        <span className="text-[10px] font-bold bg-red-950/90 text-red-300 border border-red-700 px-1.5 py-0.5 rounded">
                          {urgentDlcAlert}
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Card content */}
                  <div className="p-2.5 flex-1 flex flex-col justify-between">
                    <div>
                      <h4 className="text-xs sm:text-sm font-semibold text-white line-clamp-2 leading-snug group-hover:text-orange-300 transition-colors">
                        {product.nom}
                      </h4>
                      <p className="text-[10px] text-slate-400 mt-0.5 truncate">
                        {product.rayon || product.categorie}
                      </p>
                    </div>

                    <div className="mt-2 pt-1.5 border-t border-slate-800/80 flex items-baseline justify-between">
                      <span className="text-sm sm:text-base font-extrabold text-orange-400 font-mono tracking-tight">
                        {formatCurrencyShort(product.prixVente)}
                      </span>
                      {product.unite === 'KG' && (
                        <span className="text-[10px] text-slate-400">/kg</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Modal: Web Serial & Web HID Hardware Scanner Configuration */}
      {isHardwareModalOpen && (
        <HardwareScannerModal
          onBarcodeDetected={(barcode, source) => {
            const cleanEan = barcode.trim();
            const matched = products.find(p => p.ean === cleanEan);
            if (matched) {
              if (getSellableStock(matched) <= 0) {
                posAudio.playError();
                showScanMessage(getExpiredStock(matched) > 0
                  ? `« ${matched.nom} » est périmé : vente impossible.`
                  : `« ${matched.nom} » est en rupture de stock.`, true);
                return;
              }
              if (matched.unite === 'KG') {
                onRequestWeigh(matched);
              } else {
                onSelectProduct(matched);
              }
              const srcLabel = source === 'SERIAL' ? 'Web Serial' : source === 'HID' ? 'Web HID' : 'Douchette USB';
              setSearchQuery('');
              showScanMessage(`Scanné via ${srcLabel} : ${matched.nom}`);
            } else {
              showScanMessage(`Code-barre [${cleanEan}] inconnu.`, true);
            }
          }}
          onClose={() => setIsHardwareModalOpen(false)}
        />
      )}
    </div>
  );
};
