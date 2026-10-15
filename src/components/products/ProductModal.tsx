import React, { useRef, useState } from 'react';
import { Produit, ProductUnit } from '../../types';
import { formatMoney } from '../../utils/format';
import { useApp } from '../../context/AppContext';
import { Check, ImagePlus, PackagePlus, Trash2, UploadCloud, X } from 'lucide-react';

interface ProductModalProps {
  productToEdit?: Produit | null;
  onSave: (productData: Omit<Produit, 'id' | 'lots' | 'stock'>, initialLot?: { quantite: number; dlc: string; numeroLot: string }) => Promise<boolean> | boolean;
  onClose: () => void;
}

async function compressProductPhoto(file: File): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('Choisissez un fichier image.');
  if (file.size > 8 * 1024 * 1024) throw new Error('La photo d’origine doit faire moins de 8 Mo.');

  const image = await new Promise<HTMLImageElement>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const element = new Image();
    element.onload = () => { URL.revokeObjectURL(url); resolve(element); };
    element.onerror = () => { URL.revokeObjectURL(url); reject(new Error('Impossible de lire cette photo.')); };
    element.src = url;
  });

  const maxDimension = 800;
  const scale = Math.min(1, maxDimension / Math.max(image.width, image.height));
  const canvas = document.createElement('canvas');
  canvas.width = Math.max(1, Math.round(image.width * scale));
  canvas.height = Math.max(1, Math.round(image.height * scale));
  const context = canvas.getContext('2d');
  if (!context) throw new Error('La compression de la photo n’est pas disponible sur cet appareil.');
  context.drawImage(image, 0, 0, canvas.width, canvas.height);
  // 800,000 characters of base64 (including the data-URL prefix) stays below 600 KB decoded.
  let dataUrl = '';
  for (const quality of [0.72, 0.55, 0.4, 0.28]) {
    dataUrl = canvas.toDataURL('image/jpeg', quality);
    if (dataUrl.length <= 800_000) return dataUrl;
  }
  throw new Error('Photo trop volumineuse après compression. Choisissez une image plus petite.');
}

export const ProductModal: React.FC<ProductModalProps> = ({ productToEdit, onSave, onClose }) => {
  const { toBaseAmount, fromBaseAmount, displayCurrency, isSaving } = useApp();
  const fileInput = useRef<HTMLInputElement>(null);
  const [nom, setNom] = useState(productToEdit?.nom || '');
  const [ean, setEan] = useState(productToEdit?.ean || '');
  const [categorie, setCategorie] = useState(productToEdit?.categorie || '');
  const [rayon, setRayon] = useState(productToEdit?.rayon || '');
  const [prixAchat, setPrixAchat] = useState(productToEdit ? String(fromBaseAmount(productToEdit.prixAchat)) : '');
  const [prixVente, setPrixVente] = useState(productToEdit ? String(fromBaseAmount(productToEdit.prixVente)) : '');
  const [stockAlerte, setStockAlerte] = useState(productToEdit ? String(productToEdit.stockAlerte) : '');
  const [unite, setUnite] = useState<ProductUnit>(productToEdit?.unite || 'PIECE');
  const [image, setImage] = useState(productToEdit?.image || '');
  const [lotQuantite, setLotQuantite] = useState('');
  const [lotDlc, setLotDlc] = useState('');
  const [lotNumero, setLotNumero] = useState('');
  const [photoError, setPhotoError] = useState<string | null>(null);
  const [photoBusy, setPhotoBusy] = useState(false);

  const purchase = Number(prixAchat) || 0;
  const retail = Number(prixVente) || 0;
  const margin = retail - purchase;
  const marginRate = retail > 0 ? ((margin / retail) * 100).toFixed(1) : '0';

  const selectPhoto = async (file?: File) => {
    if (!file) return;
    setPhotoBusy(true);
    setPhotoError(null);
    try { setImage(await compressProductPhoto(file)); }
    catch (reason) { setPhotoError(reason instanceof Error ? reason.message : 'Téléversement impossible.'); }
    finally { setPhotoBusy(false); if (fileInput.current) fileInput.current.value = ''; }
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setPhotoError(null);
    if (!nom.trim() || !categorie.trim() || Number(prixVente) <= 0) return;
    const quantity = Number(lotQuantite) || 0;
    if (quantity > 0 && (!lotNumero.trim() || !lotDlc)) {
      setPhotoError('Pour ajouter du stock, indiquez le numéro du lot et sa date limite.');
      return;
    }
    let purchaseCdf = 0;
    let retailCdf = 0;
    try {
      purchaseCdf = toBaseAmount(purchase);
      retailCdf = toBaseAmount(retail);
    } catch (reason) {
      setPhotoError(reason instanceof Error ? reason.message : 'Taux de conversion manquant.');
      return;
    }
    const saved = await onSave({
      nom: nom.trim(), ean: ean.trim(), categorie: categorie.trim(), rayon: rayon.trim(),
      prixAchat: purchaseCdf, prixVente: retailCdf, stockAlerte: Number(stockAlerte) || 0,
      unite, image,
    }, quantity > 0 ? { quantite: quantity, dlc: lotDlc, numeroLot: lotNumero.trim() } : undefined);
    if (!saved) setPhotoError('Le produit n’a pas été enregistré. Vérifiez le message d’erreur puis réessayez.');
  };

  return <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-3 backdrop-blur-sm sm:p-5">
    <div className="flex max-h-[94dvh] w-full max-w-2xl flex-col overflow-hidden rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl">
      <div className="flex items-center justify-between border-b border-slate-800 bg-slate-950 px-4 py-3.5 sm:px-5">
        <div className="flex items-center gap-2"><PackagePlus className="h-5 w-5 text-orange-400" /><h2 className="font-bold text-white">{productToEdit ? 'Modifier le produit' : 'Nouveau produit'}</h2></div>
        <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white" aria-label="Fermer"><X size={18} /></button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4 overflow-y-auto p-4 sm:p-5">
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block"><span className="form-label">Nom du produit *</span><input autoFocus required maxLength={150} value={nom} onChange={event => setNom(event.target.value)} placeholder="Nom exact figurant sur le produit" className="form-control" /></label>
          <label className="block"><span className="form-label">Code-barres / EAN (facultatif)</span><input maxLength={32} inputMode="numeric" value={ean} onChange={event => setEan(event.target.value)} placeholder="Scanner ou saisir le code" className="form-control font-mono" /></label>
          <label className="block"><span className="form-label">Catégorie *</span><input required maxLength={80} value={categorie} onChange={event => setCategorie(event.target.value)} placeholder="Ex. Boissons, alimentation…" className="form-control" /></label>
          <label className="block"><span className="form-label">Rayon (facultatif)</span><input maxLength={80} value={rayon} onChange={event => setRayon(event.target.value)} placeholder="Emplacement en magasin" className="form-control" /></label>
        </div>

        <div className="grid grid-cols-1 gap-3 rounded-2xl border border-slate-800 bg-slate-950/70 p-4 sm:grid-cols-3">
          <label className="block"><span className="form-label">Prix d’achat unitaire ({displayCurrency}) *</span><input type="number" min="0" step="any" required value={prixAchat} onChange={event => setPrixAchat(event.target.value)} placeholder="Coût réellement payé" className="form-control font-mono" /></label>
          <label className="block"><span className="form-label">Prix de vente ({displayCurrency}) *</span><input type="number" min="0.01" step="any" required value={prixVente} onChange={event => setPrixVente(event.target.value)} placeholder="0" className="form-control font-mono" /></label>
          <label className="block"><span className="form-label">Seuil d’alerte</span><input type="number" min="0" step="any" value={stockAlerte} onChange={event => setStockAlerte(event.target.value)} placeholder="0" className="form-control font-mono" /></label>
          <label className="block sm:col-span-3"><span className="form-label">Marge unitaire calculée</span><div className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-900 px-3 py-2.5"><span className={margin >= 0 ? 'font-bold text-emerald-400' : 'font-bold text-red-400'}>{formatMoney(toBaseAmount(margin))}</span><span className="text-xs text-slate-500">{marginRate}% sur le prix de vente</span></div></label>
        </div>

        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          <label className="block"><span className="form-label">Unité de vente</span><select value={unite} onChange={event => setUnite(event.target.value as ProductUnit)} className="form-control"><option value="PIECE">Pièce</option><option value="KG">Kilogramme (kg)</option><option value="LITRE">Litre</option><option value="SACHET">Sachet</option><option value="CARTON">Carton / pack</option></select></label>
          {!productToEdit && <label className="block"><span className="form-label">Stock initial (facultatif)</span><input type="number" min="0" step="0.001" value={lotQuantite} onChange={event => setLotQuantite(event.target.value)} placeholder="Laissez vide si le produit n’est pas encore reçu" className="form-control font-mono" /></label>}
        </div>
        {!productToEdit && Number(lotQuantite) > 0 && <div className="grid grid-cols-1 gap-3 rounded-2xl border border-orange-500/20 bg-orange-950/10 p-4 sm:grid-cols-3">
          <label className="block"><span className="form-label">Numéro de lot *</span><input required value={lotNumero} onChange={event => setLotNumero(event.target.value)} className="form-control font-mono" /></label>
          <label className="block"><span className="form-label">DLC / date limite *</span><input required type="date" value={lotDlc} onChange={event => setLotDlc(event.target.value)} className="form-control" /></label>
          <div className="self-end pb-2 text-[11px] leading-5 text-slate-500">Le stock et le lot seront enregistrés ensemble.</div>
        </div>}

        <div className="rounded-2xl border border-slate-800 p-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
            <div className="flex h-20 w-20 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-slate-700 bg-slate-950">
              {image ? <img src={image} alt="Aperçu du produit" className="h-full w-full object-cover" /> : <ImagePlus className="h-7 w-7 text-slate-600" />}
            </div>
            <div className="min-w-0 flex-1">
              <div className="text-sm font-semibold text-white">Photo du produit</div>
              <p className="mt-1 text-xs leading-5 text-slate-500">Ajoutez une vraie photo depuis votre appareil. Elle est compressée et stockée avec le produit.</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" disabled={photoBusy} onClick={() => fileInput.current?.click()} className="inline-flex items-center gap-2 rounded-lg bg-slate-800 px-3 py-2 text-xs font-bold text-slate-200 hover:bg-slate-700 disabled:opacity-50"><UploadCloud size={15} />{photoBusy ? 'Compression…' : 'Téléverser une photo'}</button>
                {image && <button type="button" onClick={() => setImage('')} className="inline-flex items-center gap-2 rounded-lg border border-red-900/70 px-3 py-2 text-xs font-semibold text-red-300 hover:bg-red-950/40"><Trash2 size={14} />Retirer</button>}
                <input ref={fileInput} className="hidden" type="file" accept="image/jpeg,image/png,image/webp" capture="environment" onChange={event => void selectPhoto(event.target.files?.[0])} />
              </div>
              {photoError && <p role="alert" className="mt-2 text-xs text-red-300">{photoError}</p>}
            </div>
          </div>
        </div>

        <div className="flex flex-col-reverse gap-2 border-t border-slate-800 pt-4 sm:flex-row sm:justify-end">
          <button type="button" onClick={onClose} className="rounded-xl bg-slate-800 px-5 py-3 text-sm font-semibold text-slate-300 hover:bg-slate-700">Annuler</button>
          <button type="submit" disabled={photoBusy || isSaving} className="flex items-center justify-center gap-2 rounded-xl bg-orange-500 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-orange-950/30 hover:bg-orange-400 disabled:cursor-not-allowed disabled:opacity-50"><Check size={17} />{isSaving ? 'Enregistrement…' : 'Enregistrer le produit'}</button>
        </div>
      </form>
    </div>
  </div>;
};
