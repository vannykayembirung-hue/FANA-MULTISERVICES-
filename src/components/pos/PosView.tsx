import React, { useState } from 'react';
import { LockKeyhole, Package, ShoppingBag, UnlockKeyhole, X } from 'lucide-react';
import { useApp } from '../../context/AppContext';
import { Produit, PaymentMethod } from '../../types';
import { formatCurrencyShort, formatMoney } from '../../utils/format';
import { ProductGrid } from './ProductGrid';
import { CartSidebar } from './CartSidebar';
import { WeightModal } from './WeightModal';
import { PaymentModal } from './PaymentModal';
import { ThermalReceiptModal } from './ThermalReceiptModal';
import { ParkedCartsModal } from './ParkedCartsModal';
import { RecentSalesModal } from './RecentSalesModal';

type MobilePosPanel = 'products' | 'cart';

export const PosView: React.FC = () => {
  const {
    products,
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
    clients,
    setSelectedClientId,
    parkCurrentCart,
    parkedCarts,
    recallParkedCart,
    deleteParkedCart,
    finalizeSale,
    lastCompletedSale,
    setLastCompletedSale,
    sales,
    caisseSession,
    currentRole,
    user,
    openCaisse,
    closeCaisse,
    toBaseAmount,
    displayCurrency,
    isSaving,
  } = useApp();

  const [weighingProduct, setWeighingProduct] = useState<Produit | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);
  const [isParkedModalOpen, setIsParkedModalOpen] = useState(false);
  const [isRecentSalesModalOpen, setIsRecentSalesModalOpen] = useState(false);
  const [paymentPreset, setPaymentPreset] = useState<PaymentMethod>('ESPECE');
  const [mobilePanel, setMobilePanel] = useState<MobilePosPanel>('products');

  const [isSessionModalOpen, setIsSessionModalOpen] = useState(false);
  const [openingFund, setOpeningFund] = useState('0');
  const [countedCash, setCountedCash] = useState('');
  const [closingNotes, setClosingNotes] = useState('');
  const [sessionError, setSessionError] = useState<string | null>(null);

  const ticketInProgress = 'Nouveau ticket';
  const sessionOpen = caisseSession.statut === 'OUVERTE';
  const canManageCurrentSession = currentRole !== 'CAISSIER' || caisseSession.ouvertParId === user.id;

  const handleSelectProduct = (product: Produit) => addToCart(product, 1);
  const handleRequestWeigh = (product: Produit) => setWeighingProduct(product);
  const handleConfirmWeight = (weight: number) => {
    if (!weighingProduct) return;
    addToCart(weighingProduct, weight);
    setWeighingProduct(null);
  };

  const handleOpenPaymentModal = (presetMethod?: PaymentMethod) => {
    setPaymentPreset(presetMethod || 'ESPECE');
    setIsPaymentModalOpen(true);
  };

  const handleConfirmPayment = async (method: PaymentMethod, receivedAmount?: number, reference?: string, telephone?: string) => {
    const sale = await finalizeSale(method, receivedAmount, reference, telephone);
    if (sale) setIsPaymentModalOpen(false);
  };

  const handleManageCashSession = () => {
    if (sessionOpen && !canManageCurrentSession) return;
    setSessionError(null);
    setOpeningFund('0');
    setCountedCash('');
    setClosingNotes('');
    setIsSessionModalOpen(true);
  };

  const handleSubmitCashSession = async (event: React.FormEvent) => {
    event.preventDefault();
    setSessionError(null);
    try {
      if (!sessionOpen) {
        const amount = toBaseAmount(Number(openingFund) || 0);
        const opened = await openCaisse(amount);
        if (opened) setIsSessionModalOpen(false);
        else setSessionError('La caisse n’a pas pu être ouverte. Vérifiez si une autre session est déjà active.');
        return;
      }
      if (countedCash.trim() === '' || !Number.isFinite(Number(countedCash)) || Number(countedCash) < 0) {
        setSessionError('Saisissez le montant réellement compté.');
        return;
      }
      const actual = toBaseAmount(Number(countedCash));
      const closed = await closeCaisse(actual, closingNotes.trim());
      if (closed) setIsSessionModalOpen(false);
      else setSessionError('La caisse n’a pas pu être clôturée. Vérifiez les droits et l’état de la session.');
    } catch {
      setSessionError('Vérifiez le montant et le taux de change configuré par le Boss.');
    }
  };

  const countedCashBase = (() => {
    if (!countedCash.trim() || !Number.isFinite(Number(countedCash))) return null;
    try { return toBaseAmount(Number(countedCash)); } catch { return null; }
  })();

  return (
    <div className="flex min-h-0 flex-1 flex-col overflow-hidden bg-slate-900">
      {/* Mobile: switch between the catalogue and basket without squeezing either panel. */}
      <div className="grid shrink-0 grid-cols-[1fr_1.2fr_auto] gap-2 border-b border-slate-800 bg-slate-950 p-2 md:hidden">
        <button type="button" onClick={() => setMobilePanel('products')} aria-pressed={mobilePanel === 'products'} className={`flex min-w-0 items-center justify-center gap-1.5 rounded-xl px-2 py-2.5 text-xs font-bold ${mobilePanel === 'products' ? 'bg-orange-500 text-white' : 'bg-slate-900 text-slate-400'}`}>
          <Package size={15} /> Produits
        </button>
        <button type="button" onClick={() => setMobilePanel('cart')} aria-pressed={mobilePanel === 'cart'} className={`flex min-w-0 items-center justify-center gap-1.5 rounded-xl px-2 py-2.5 text-xs font-bold ${mobilePanel === 'cart' ? 'bg-orange-500 text-white' : 'bg-slate-900 text-slate-300'}`}>
          <ShoppingBag size={15} /> Panier ({cart.length}) <span className="truncate font-mono text-orange-300">{formatCurrencyShort(cartTotalNet)}</span>
        </button>
        <button type="button" onClick={handleManageCashSession} disabled={sessionOpen && !canManageCurrentSession || isSaving} className={`flex items-center justify-center gap-1 rounded-xl border px-2 py-2.5 text-[10px] font-bold disabled:opacity-45 ${sessionOpen ? 'border-emerald-900 bg-emerald-950/40 text-emerald-300' : 'border-amber-800 bg-amber-950/40 text-amber-200'}`} aria-label={sessionOpen ? 'Clôturer la caisse' : 'Ouvrir la caisse'}>
          {sessionOpen ? <LockKeyhole size={14} /> : <UnlockKeyhole size={14} />}
          {sessionOpen ? 'Caisse' : 'Ouvrir'}
        </button>
      </div>

      <div className="flex min-h-0 flex-1 flex-col overflow-hidden md:flex-row">
        <div className={`${mobilePanel === 'products' ? 'flex' : 'hidden'} min-h-0 flex-1 flex-col md:flex`}>
          <ProductGrid products={products} onSelectProduct={handleSelectProduct} onRequestWeigh={handleRequestWeigh} />
        </div>
        <div className={`${mobilePanel === 'cart' ? 'flex' : 'hidden'} min-h-0 flex-1 flex-col md:flex md:flex-none`}>
          <CartSidebar
            cart={cart}
            cartTotalBrut={cartTotalBrut}
            cartDiscount={cartDiscount}
            cartTotalNet={cartTotalNet}
            onUpdateQuantity={updateCartItemQuantity}
            onRemoveItem={removeFromCart}
            onClearCart={clearCart}
            selectedClient={selectedClient}
            clients={clients}
            onSelectClient={setSelectedClientId}
            onSetDiscount={setCartDiscount}
            onOpenPaymentModal={handleOpenPaymentModal}
            onParkCart={parkCurrentCart}
            parkedCount={parkedCarts.length}
            onOpenParkedModal={() => setIsParkedModalOpen(true)}
            onOpenRecentSales={() => setIsRecentSalesModalOpen(true)}
            ticketNumber={ticketInProgress}
            onManageCashSession={handleManageCashSession}
          />
        </div>
      </div>

      {weighingProduct && <WeightModal product={weighingProduct} onConfirm={handleConfirmWeight} onClose={() => setWeighingProduct(null)} />}
      {isPaymentModalOpen && <PaymentModal
        totalNet={cartTotalNet}
        selectedClient={selectedClient}
        clients={clients}
        onSelectClient={setSelectedClientId}
        onConfirmPayment={handleConfirmPayment}
        initialMethod={paymentPreset}
        onClose={() => setIsPaymentModalOpen(false)}
      />}
      {lastCompletedSale && <ThermalReceiptModal sale={lastCompletedSale} onClose={() => setLastCompletedSale(null)} />}
      {isParkedModalOpen && <ParkedCartsModal
        parkedCarts={parkedCarts}
        onRecall={recallParkedCart}
        onDelete={deleteParkedCart}
        onClose={() => setIsParkedModalOpen(false)}
      />}
      {isRecentSalesModalOpen && <RecentSalesModal
        sales={sales}
        onReprint={sale => { setLastCompletedSale(sale); setIsRecentSalesModalOpen(false); }}
        onClose={() => setIsRecentSalesModalOpen(false)}
      />}

      {isSessionModalOpen && <div className="fixed inset-0 z-[65] flex items-center justify-center bg-black/75 p-3 backdrop-blur-sm sm:p-5">
        <section role="dialog" aria-modal="true" aria-labelledby="pos-session-title" className="w-full max-w-lg overflow-hidden rounded-2xl border border-slate-700 bg-slate-950 shadow-2xl">
          <header className="flex items-center justify-between border-b border-slate-800 px-4 py-4 sm:px-5">
            <div>
              <h2 id="pos-session-title" className="flex items-center gap-2 text-lg font-black text-white">{sessionOpen ? <LockKeyhole size={19} className="text-amber-400" /> : <UnlockKeyhole size={19} className="text-emerald-400" />}{sessionOpen ? 'Clôturer la caisse' : 'Ouvrir la caisse'}</h2>
              <p className="mt-1 text-xs text-slate-400">Ouvrez une fois au début du service, puis clôturez en fin de service.</p>
            </div>
            <button type="button" onClick={() => setIsSessionModalOpen(false)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white" aria-label="Fermer"><X size={18} /></button>
          </header>
          <form onSubmit={handleSubmitCashSession} className="space-y-4 p-4 sm:p-5">
            {!sessionOpen ? <>
              <label className="block"><span className="form-label">Fond de caisse initial ({displayCurrency})</span><input type="number" min="0" step="any" required value={openingFund} onChange={event => setOpeningFund(event.target.value)} className="form-control font-mono text-lg" /></label>
              <p className="rounded-xl border border-slate-800 bg-slate-900 p-3 text-xs leading-5 text-slate-400">La session reste ouverte pendant votre service. Il n’est pas nécessaire d’en ouvrir une pour chaque vente.</p>
            </> : <>
              <div className="rounded-xl border border-slate-800 bg-slate-900 p-3"><div className="text-xs text-slate-400">Espèces attendues en caisse</div><div className="mt-1 font-mono text-xl font-black text-white">{formatMoney(caisseSession.totalEspecesAttendu)}</div></div>
              <label className="block"><span className="form-label">Espèces réellement comptées ({displayCurrency})</span><input type="number" min="0" step="any" required value={countedCash} onChange={event => setCountedCash(event.target.value)} className="form-control font-mono text-lg" /></label>
              {countedCashBase !== null && <div className={`rounded-xl border p-3 text-xs ${Math.abs(countedCashBase - caisseSession.totalEspecesAttendu) < 0.01 ? 'border-emerald-900 bg-emerald-950/30 text-emerald-200' : 'border-amber-800 bg-amber-950/30 text-amber-200'}`}><span>Écart de caisse : </span><strong className="font-mono">{formatMoney(countedCashBase - caisseSession.totalEspecesAttendu)}</strong></div>}
              <label className="block"><span className="form-label">Note de clôture (facultatif)</span><textarea maxLength={500} rows={2} value={closingNotes} onChange={event => setClosingNotes(event.target.value)} className="form-control resize-y" placeholder="Commentaire éventuel" /></label>
            </>}
            {sessionError && <p role="alert" className="rounded-lg border border-red-900 bg-red-950/40 px-3 py-2 text-xs text-red-200">{sessionError}</p>}
            <footer className="flex flex-col-reverse gap-2 border-t border-slate-800 pt-4 sm:flex-row sm:justify-end">
              <button type="button" onClick={() => setIsSessionModalOpen(false)} className="rounded-xl bg-slate-800 px-4 py-3 text-sm font-semibold text-slate-300 hover:bg-slate-700">Annuler</button>
              <button type="submit" disabled={isSaving} className={`rounded-xl px-4 py-3 text-sm font-extrabold text-white disabled:opacity-50 ${sessionOpen ? 'bg-red-600 hover:bg-red-500' : 'bg-emerald-600 hover:bg-emerald-500'}`}>{isSaving ? 'Enregistrement…' : sessionOpen ? 'Confirmer la clôture' : 'Ouvrir la session'}</button>
            </footer>
          </form>
        </section>
      </div>}
    </div>
  );
};
