import React, { useState } from 'react';
import { useApp } from '../../context/AppContext';
import { Produit, PaymentMethod } from '../../types';
import { ProductGrid } from './ProductGrid';
import { CartSidebar } from './CartSidebar';
import { WeightModal } from './WeightModal';
import { PaymentModal } from './PaymentModal';
import { ThermalReceiptModal } from './ThermalReceiptModal';
import { ParkedCartsModal } from './ParkedCartsModal';
import { RecentSalesModal } from './RecentSalesModal';

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
  } = useApp();

  // Modals state
  const [weighingProduct, setWeighingProduct] = useState<Produit | null>(null);
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState<boolean>(false);
  const [isParkedModalOpen, setIsParkedModalOpen] = useState<boolean>(false);
  const [isRecentSalesModalOpen, setIsRecentSalesModalOpen] = useState<boolean>(false);

  const nextTicketNumber = `TICK-${1000 + sales.length + 1}`;

  const handleSelectProduct = (product: Produit) => {
    addToCart(product, 1);
  };

  const handleRequestWeigh = (product: Produit) => {
    setWeighingProduct(product);
  };

  const handleConfirmWeight = (weight: number) => {
    if (weighingProduct) {
      addToCart(weighingProduct, weight);
      setWeighingProduct(null);
    }
  };

  const handleOpenPaymentModal = (presetMethod?: PaymentMethod) => {
    setIsPaymentModalOpen(true);
  };

  const handleConfirmPayment = (method: PaymentMethod, receivedAmount?: number) => {
    const sale = finalizeSale(method, receivedAmount);
    setIsPaymentModalOpen(false);
  };

  return (
    <div className="flex-1 flex flex-col md:flex-row h-full overflow-hidden bg-slate-900">
      {/* Left: Product Grid & Barcode scanner */}
      <ProductGrid
        products={products}
        onSelectProduct={handleSelectProduct}
        onRequestWeigh={handleRequestWeigh}
      />

      {/* Right: Cart & Checkout sidebar */}
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
        ticketNumber={nextTicketNumber}
      />

      {/* Modal: Weighing for KG / bulk items */}
      {weighingProduct && (
        <WeightModal
          product={weighingProduct}
          onConfirm={handleConfirmWeight}
          onClose={() => setWeighingProduct(null)}
        />
      )}

      {/* Modal: Payment & Auto Change */}
      {isPaymentModalOpen && (
        <PaymentModal
          totalNet={cartTotalNet}
          selectedClient={selectedClient}
          clients={clients}
          onSelectClient={setSelectedClientId}
          onConfirmPayment={handleConfirmPayment}
          onClose={() => setIsPaymentModalOpen(false)}
        />
      )}

      {/* Modal: 58mm/80mm Thermal Receipt */}
      {lastCompletedSale && (
        <ThermalReceiptModal
          sale={lastCompletedSale}
          onClose={() => setLastCompletedSale(null)}
        />
      )}

      {/* Modal: Parked Carts */}
      {isParkedModalOpen && (
        <ParkedCartsModal
          parkedCarts={parkedCarts}
          onRecall={recallParkedCart}
          onDelete={deleteParkedCart}
          onClose={() => setIsParkedModalOpen(false)}
        />
      )}

      {/* Modal: Recent Sales & Duplicata Reprint */}
      {isRecentSalesModalOpen && (
        <RecentSalesModal
          sales={sales}
          onReprint={sale => {
            setLastCompletedSale(sale);
            setIsRecentSalesModalOpen(false);
          }}
          onClose={() => setIsRecentSalesModalOpen(false)}
        />
      )}
    </div>
  );
};
