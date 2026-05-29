"use client";

import { useState } from "react";
import Image from "next/image";

import { Button } from "@/components/Button";
import { Card } from "@/components/Card";
import { RequireAuth } from "@/components/auth/RequireAuth";
import { formatCurrency, getImageUrl } from "@/lib/utils";
import { useCart } from "@/hooks/useCart";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { createOrderFromCart } from "@/services/orders.service";

export default function CartPage() {
  const { user } = useAuth();
  const { items, total, loading, refresh } = useCart();
  const { pushToast } = useToast();
  const [address, setAddress] = useState("Quan 7, TP.HCM");

  async function checkout() {
    if (!items.length) {
      pushToast("Giỏ hàng trống. Vui lòng thêm sản phẩm trước khi checkout.");
      return;
    }
    if (!user) return;
    await createOrderFromCart(user.id, address);
    pushToast("Checkout thành công.", "Day la flow gia lap, chua tich hop thanh toan that.");
    await refresh();
  }

  return (
    <RequireAuth>
    <section className="mx-auto grid max-w-6xl gap-8 px-4 py-10 lg:grid-cols-[1fr_360px]">
      <div>
        <h1 className="text-3xl font-bold text-slate-950">Giỏ hàng</h1>
        <div className="mt-6 grid gap-4">
          {loading ? <p className="text-slate-500">Đang tải giỏ hàng...</p> : items.length ? items.map((item) => (
            <Card key={item.id} className="flex gap-4">
              <Image
                src={getImageUrl(item.product?.image_url)}
                alt={item.product?.name || "Sản phẩm"}
                width={96}
                height={96}
                className="h-24 w-24 rounded-lg object-cover"
              />
              <div className="flex-1">
                <p className="font-bold">{item.product?.name}</p>
                <p className="text-sm text-slate-600">Số lượng: {item.quantity}</p>
                <p className="mt-2 font-semibold text-emerald-700">{formatCurrency((item.product?.price || 0) * item.quantity)}</p>
              </div>
            </Card>
          )) : <Card><p className="text-slate-500">Giỏ hàng đang trống.</p></Card>}
        </div>
      </div>
      <Card className="h-fit">
        <h2 className="text-xl font-bold">Checkout</h2>
        <p className="mt-4 text-sm text-slate-600">Tổng tạm tính</p>
        <p className="mt-1 text-3xl font-bold text-emerald-700">{formatCurrency(total)}</p>
        <textarea className="mt-5 min-h-24 w-full rounded-lg border border-slate-300 px-3 py-2" value={address} onChange={(event) => setAddress(event.target.value)} />
        <Button className="mt-4 w-full" onClick={checkout}>Tạo đơn hàng</Button>
      </Card>
    </section>
    </RequireAuth>
  );
}
