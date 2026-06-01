"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { useAuth } from "@/hooks/useAuth";
import { getCartItems } from "@/services/cart.service";
import { getProductsByIds } from "@/services/products.service";
import type { CartItem, Product } from "@/types";

export function useCart() {
  const { user, isLoading: isAuthLoading } = useAuth();
  const [items, setItems] = useState<CartItem[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const refresh = useCallback(async () => {
    if (!user) {
      setItems([]);
      setProducts([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const cartItems = await getCartItems(user.id);
    const productItems = await getProductsByIds(cartItems.map((item) => item.product_id));
    setItems(cartItems);
    setProducts(productItems);
    setLoading(false);
  }, [user]);

  useEffect(() => {
    if (isAuthLoading) return;
    void refresh();
  }, [isAuthLoading, refresh]);

  const enriched = useMemo(
    () =>
      items.map((item) => ({
        ...item,
        product: products.find((product) => product.id === item.product_id)
      })),
    [items, products]
  );

  const total = enriched.reduce((sum, item) => sum + (item.product?.price || 0) * item.quantity, 0);

  return { items: enriched, loading: isAuthLoading || loading, total, refresh };
}
