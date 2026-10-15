import React, { useState } from 'react';
import { CartItem, Client, PaymentMethod } from '../../types';
import { formatFCFA, formatCurrencyShort } from '../../utils/format';
import { 
  ShoppingBag, 
  Trash2, 
  Plus, 
  Minus, 
  User, 
  Tag, 
  Clock, 
  ChevronRight,
  AlertCircle,
  CreditCard,
  Banknote,
  BookOpen,
  Receipt
} from 'lucide-react';

interface CartSidebarProps {
  cart: CartItem[];
  cartTotalBrut: number;
  cartDiscount: number;
  cartTotalNet: number;
  onUpdateQuantity: (productId: string, quantity: number) => void;
  onRemoveItem: (productId: string) => void;
  onClearCart: () => void;
  selectedClient: Client | null;
  clients: Client[];
  onSelectClient: (clientId: string | null) => void;
  onSetDiscount: (discount: number) => void;
  onOpenPaymentModal: (presetMethod?: PaymentMethod) => void;
  onParkCart: () => void;
  parkedCount: number;
  onOpenParkedModal: () => void;
  onOpenRecentSales?: () => void;
  ticketNumber: string;
}

export const CartSidebar: React.FC<CartSidebarProps> = ({
  cart,
  cartTotalBrut,
  cartDiscount,
  cartTotalNet,
  onUpdateQuantity,
  onRemoveItem,
  onClearCart,
  selectedClient,
  clients,
  onSelectClient,
  onSetDiscount,
  onOpenPaymentModal,
  onParkCart,
  parkedCount,
  onOpenParkedModal,
  onOpenRecentSales,
  ticketNumber,
}) => {
  const [showDiscountInput, setShowDiscountInput] = useState<boolean>(false);
  const [customDiscountValue, setCustomDiscountValue] = useState<string>('');
  const [discountType, setDiscountType] = useState<'FIXED' | 'PERCENT'>('FIXED');
  const [showClientSelector, setShowClientSelector] = useState<boolean>(false);

  const handleApplyDiscount = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    const val = parseFloat(customDiscountValue) || 0;
    if (discountType === 'PERCENT') {
      const computed = Math.round((cartTotalBrut * val) / 100);
      onSetDiscount(computed);
    } else {
      onSetDiscount(val);
    }
    setShowDiscountInput(false);
  };

  return (
    <div className="w-full sm:w-[380px] lg:w-[420px] flex flex-col h-full bg-slate-950 border-l border-slate-800 shrink-0">
      {/* Cart Header */}
      <div className="p-3.5 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-orange-500/10 border border-orange-500/30 flex items-center justify-center text-orange-400">
            <ShoppingBag className="w-4 h-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white text-sm">Panier En Cours</span>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700">
                {ticketNumber}
              </span>
            </div>
            <p className="text-[11px] text-slate-400">
              {cart.length} article{cart.length > 1 ? 's' : ''}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-1.5">
          {onOpenRecentSales && (
            <button
              type="button"
              onClick={onOpenRecentSales}
              className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-750 border border-slate-700 text-slate-300 hover:text-white text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
              title="Derniers tickets encaissés / Réimpression duplicata"
            >
              <Receipt className="w-3.5 h-3.5 text-orange-400" />
              <span className="hidden sm:inline">Tickets</span>
            </button>
          )}

          {parkedCount > 0 && (
            <button
              type="button"
              onClick={onOpenParkedModal}
              className="px-2 py-1.5 rounded-lg bg-amber-950/40 border border-amber-700/60 text-amber-300 hover:bg-amber-900/50 text-xs font-semibold flex items-center gap-1 transition-colors cursor-pointer"
              title="Paniers en attente"
            >
              <Clock className="w-3.5 h-3.5" />
              <span>{parkedCount}</span>
            </button>
          )}

          {cart.length > 0 && (
            <button
              type="button"
              onClick={onClearCart}
              className="p-1.5 rounded-lg text-slate-400 hover:text-red-400 hover:bg-red-950/30 transition-colors"
              title="Vider le panier"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Client Quick Picker Bar */}
      <div className="px-3 py-2 bg-slate-900/60 border-b border-slate-800 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2 truncate">
          <User className="w-3.5 h-3.5 text-orange-400 shrink-0" />
          {selectedClient ? (
            <div className="truncate">
              <span className="font-bold text-white truncate">{selectedClient.nom}</span>
              <span className="text-[10px] text-slate-400 ml-1.5">
                (Dette : {formatCurrencyShort(selectedClient.credit)})
              </span>
            </div>
          ) : (
            <span className="text-slate-400">Client Comptant (Passage)</span>
          )}
        </div>

        <button
          type="button"
          onClick={() => setShowClientSelector(!showClientSelector)}
          className="text-orange-400 hover:text-orange-300 font-semibold text-[11px] shrink-0 ml-2"
        >
          {selectedClient ? 'Changer' : '+ Choisir Client'}
        </button>
      </div>

      {/* Client dropdown selection */}
      {showClientSelector && (
        <div className="p-3 bg-slate-900 border-b border-slate-800 space-y-2 animate-in slide-in-from-top-1 text-xs">
          <div className="flex items-center justify-between">
            <span className="text-slate-300 font-semibold">Associer un client habituel :</span>
            <button
              onClick={() => setShowClientSelector(false)}
              className="text-slate-400 hover:text-white"
            >
              ✕
            </button>
          </div>
          <select
            value={selectedClient?.id || ''}
            onChange={e => {
              onSelectClient(e.target.value || null);
              setShowClientSelector(false);
            }}
            className="w-full px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white text-xs"
          >
            <option value="">-- Client Comptant (Sans compte) --</option>
            {clients.map(c => (
              <option key={c.id} value={c.id}>
                {c.nom} ({c.telephone}) - Dette: {formatCurrencyShort(c.credit)}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Cart Items List */}
      <div className="flex-1 overflow-y-auto p-3 space-y-2">
        {cart.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-slate-500 text-center p-6">
            <div className="w-16 h-16 rounded-2xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-600 mb-3">
              <ShoppingBag className="w-8 h-8" />
            </div>
            <p className="font-semibold text-slate-300 text-sm">Le panier est vide</p>
            <p className="text-xs text-slate-500 mt-1">
              Touchez un produit sur la grille ou scannez son code-barre pour commencer la vente.
            </p>
          </div>
        ) : (
          cart.map(item => {
            const lineTotal = item.prixUnitaire * item.quantite;
            const isWeight = item.produit.unite === 'KG';

            return (
              <div
                key={item.produit.id}
                className="p-2.5 bg-slate-900/90 border border-slate-800/80 rounded-xl flex items-center justify-between gap-2 hover:border-slate-700 transition-colors"
              >
                {/* Item description */}
                <div className="flex-1 min-w-0">
                  <h4 className="font-semibold text-white text-xs sm:text-sm truncate">
                    {item.produit.nom}
                  </h4>
                  <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400">
                    <span className="font-mono">{formatCurrencyShort(item.prixUnitaire)}</span>
                    <span className="text-[10px] text-slate-500">×</span>
                    <span className="text-orange-400 font-mono font-semibold">
                      {item.quantite} {item.produit.unite === 'KG' ? 'kg' : ''}
                    </span>
                  </div>
                </div>

                {/* Tactile quantity controls */}
                <div className="flex items-center gap-1.5 shrink-0">
                  <div className="flex items-center bg-slate-800 rounded-lg border border-slate-700 p-0.5">
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateQuantity(
                          item.produit.id,
                          isWeight ? Math.max(0, item.quantite - 0.25) : item.quantite - 1
                        )
                      }
                      className="w-7 h-7 rounded-md text-slate-300 hover:text-white hover:bg-slate-700 flex items-center justify-center transition-colors active:scale-90"
                    >
                      <Minus className="w-3.5 h-3.5" />
                    </button>

                    <span className="w-10 text-center font-mono font-bold text-xs text-white">
                      {item.quantite}
                    </span>

                    <button
                      type="button"
                      onClick={() =>
                        onUpdateQuantity(
                          item.produit.id,
                          isWeight ? item.quantite + 0.25 : item.quantite + 1
                        )
                      }
                      className="w-7 h-7 rounded-md text-slate-300 hover:text-white hover:bg-slate-700 flex items-center justify-center transition-colors active:scale-90"
                    >
                      <Plus className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  {/* Line Total */}
                  <div className="w-16 text-right font-bold text-xs sm:text-sm text-slate-200 font-mono">
                    {formatCurrencyShort(lineTotal)}
                  </div>

                  <button
                    type="button"
                    onClick={() => onRemoveItem(item.produit.id)}
                    className="p-1 rounded text-slate-500 hover:text-red-400 transition-colors"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Cart Bottom Summary & Checkout Pad */}
      <div className="p-3.5 bg-slate-900 border-t border-slate-800 space-y-3">
        {/* Discount form toggle */}
        {showDiscountInput ? (
          <form
            onSubmit={handleApplyDiscount}
            className="p-2.5 bg-slate-950 rounded-xl border border-orange-500/30 space-y-2 animate-in fade-in text-xs"
          >
            <div className="flex items-center justify-between">
              <span className="font-bold text-orange-400">Appliquer une Remise</span>
              <button
                type="button"
                onClick={() => setShowDiscountInput(false)}
                className="text-slate-400 hover:text-white"
              >
                ✕
              </button>
            </div>
            <div className="flex gap-2">
              <input
                type="number"
                placeholder={discountType === 'FIXED' ? 'Montant en FCFA' : 'Pourcentage %'}
                value={customDiscountValue}
                onChange={e => setCustomDiscountValue(e.target.value)}
                className="flex-1 px-2.5 py-1.5 bg-slate-800 border border-slate-700 rounded-lg text-white font-mono text-xs focus:outline-hidden focus:border-orange-500"
                autoFocus
              />
              <div className="flex rounded-lg overflow-hidden border border-slate-700">
                <button
                  type="button"
                  onClick={() => setDiscountType('FIXED')}
                  className={`px-2 py-1 text-[11px] font-bold ${
                    discountType === 'FIXED' ? 'bg-orange-500 text-white' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  F
                </button>
                <button
                  type="button"
                  onClick={() => setDiscountType('PERCENT')}
                  className={`px-2 py-1 text-[11px] font-bold ${
                    discountType === 'PERCENT' ? 'bg-orange-500 text-white' : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  %
                </button>
              </div>
              <button
                type="submit"
                className="px-3 py-1.5 rounded-lg bg-orange-500 text-white font-bold text-xs hover:bg-orange-600"
              >
                OK
              </button>
            </div>
          </form>
        ) : null}

        {/* Pricing totals */}
        <div className="space-y-1.5 text-xs">
          <div className="flex items-center justify-between text-slate-400">
            <span>Sous-total brut</span>
            <span className="font-mono font-medium text-slate-200">
              {formatFCFA(cartTotalBrut)}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <button
              type="button"
              onClick={() => setShowDiscountInput(!showDiscountInput)}
              className="text-orange-400 hover:text-orange-300 font-semibold flex items-center gap-1 text-xs"
            >
              <Tag className="w-3 h-3" />
              {cartDiscount > 0 ? `Remise accordée (-${cartDiscount} F)` : '+ Ajouter une Remise'}
            </button>
            {cartDiscount > 0 && (
              <span className="font-mono font-bold text-red-400">
                -{formatCurrencyShort(cartDiscount)}
              </span>
            )}
          </div>

          <div className="pt-2 border-t border-slate-800 flex items-baseline justify-between">
            <div>
              <span className="text-xs uppercase font-extrabold tracking-wider text-slate-300 block">
                Total Net
              </span>
              <span className="text-[10px] text-slate-500">Toutes taxes comprises</span>
            </div>
            <span className="text-2xl font-black text-white font-mono tracking-tight">
              {formatFCFA(cartTotalNet)}
            </span>
          </div>
        </div>

        {/* Fast Payment Preset Buttons */}
        <div className="grid grid-cols-4 gap-1.5 pt-1">
          <button
            type="button"
            disabled={cart.length === 0}
            onClick={() => onOpenPaymentModal('ESPECE')}
            className="py-2.5 px-2 rounded-xl bg-slate-800 hover:bg-emerald-950/60 hover:border-emerald-700/80 border border-slate-750 text-slate-200 hover:text-emerald-300 font-bold text-[11px] flex flex-col items-center gap-1 transition-all disabled:opacity-40"
          >
            <Banknote className="w-4 h-4 text-emerald-400" />
            <span>Espèce</span>
          </button>

          <button
            type="button"
            disabled={cart.length === 0}
            onClick={() => onOpenPaymentModal('WAVE')}
            className="py-2.5 px-2 rounded-xl bg-slate-800 hover:bg-sky-950/60 hover:border-sky-700/80 border border-slate-750 text-slate-200 hover:text-sky-300 font-bold text-[11px] flex flex-col items-center gap-1 transition-all disabled:opacity-40"
          >
            <div className="w-4 h-4 rounded-full bg-sky-500 text-white font-extrabold text-[9px] flex items-center justify-center">
              W
            </div>
            <span>Wave</span>
          </button>

          <button
            type="button"
            disabled={cart.length === 0}
            onClick={() => onOpenPaymentModal('ORANGE_MONEY')}
            className="py-2.5 px-2 rounded-xl bg-slate-800 hover:bg-orange-950/60 hover:border-orange-700/80 border border-slate-750 text-slate-200 hover:text-orange-300 font-bold text-[11px] flex flex-col items-center gap-1 transition-all disabled:opacity-40"
          >
            <div className="w-4 h-4 rounded bg-orange-600 text-white font-extrabold text-[9px] flex items-center justify-center">
              OM
            </div>
            <span>Orange</span>
          </button>

          <button
            type="button"
            disabled={cart.length === 0}
            onClick={() => onOpenPaymentModal('CREDIT')}
            className="py-2.5 px-2 rounded-xl bg-slate-800 hover:bg-amber-950/60 hover:border-amber-700/80 border border-slate-750 text-slate-200 hover:text-amber-300 font-bold text-[11px] flex flex-col items-center gap-1 transition-all disabled:opacity-40"
          >
            <BookOpen className="w-4 h-4 text-amber-400" />
            <span>Ardoise</span>
          </button>
        </div>

        {/* Master Pay Button & Park action */}
        <div className="flex items-center gap-2 pt-1">
          <button
            type="button"
            disabled={cart.length === 0}
            onClick={onParkCart}
            className="px-3 py-3.5 rounded-xl bg-slate-800 hover:bg-slate-750 disabled:opacity-40 text-slate-300 font-semibold text-xs border border-slate-700 flex items-center justify-center transition-colors shrink-0"
            title="Mettre en attente ce ticket pour servir un autre client"
          >
            <Clock className="w-4 h-4" />
          </button>

          <button
            type="button"
            disabled={cart.length === 0}
            onClick={() => onOpenPaymentModal()}
            className="flex-1 py-3.5 px-4 rounded-xl bg-orange-500 hover:bg-orange-600 active:bg-orange-700 disabled:opacity-40 disabled:cursor-not-allowed text-white font-black text-sm sm:text-base flex items-center justify-center gap-2 shadow-xl shadow-orange-500/25 transition-all"
          >
            <span>PAYER {formatCurrencyShort(cartTotalNet)}</span>
            <ChevronRight className="w-5 h-5" />
          </button>
        </div>
      </div>
    </div>
  );
};
