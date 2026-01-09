'use client';

import { SessionProvider } from "next-auth/react";
import { AuthProvider } from "../context/AuthContext";
import { CartProvider } from "../context/CartContext"; // Nuevo

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      <AuthProvider>
        <CartProvider> {/* Envolver con CartProvider */}
          {children}
        </CartProvider>
      </AuthProvider>
    </SessionProvider>
  );
}