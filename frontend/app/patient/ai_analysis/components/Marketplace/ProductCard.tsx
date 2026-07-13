"use client";

import Image from "next/image";
import { ShoppingCart } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/Button";
import { useAuth } from "@/hooks/useAuth";
import { useToast } from "@/hooks/useToast";
import { addToCart } from "@/services/cart.service";
import { getImageUrl } from "@/lib/utils";
import type { MatchedProduct } from "../../types";

interface ProductCardProps {
  product: MatchedProduct;
}

export function ProductCard({ product }: ProductCardProps) {
  const { user, isAuthenticated, profile } = useAuth();
  const { pushToast } = useToast();
  const [isAdding, setIsAdding] = useState(false);

  const handleAddToCart = async () => {
    if (!isAuthenticated) {
      pushToast("Yêu cầu đăng nhập", "Bạn cần đăng nhập tài khoản bệnh nhân để mua sản phẩm.");
      return;
    }

    if (profile?.account_type !== "patient") {
      pushToast("Không khả dụng", "Chỉ tài khoản Bệnh nhân mới có thể mua sản phẩm.");
      return;
    }

    if (!user) return;

    setIsAdding(true);
    try {
      await addToCart(user.id, product.id, 1);
      pushToast("Đã thêm vào giỏ hàng", `Đã thêm ${product.name} vào giỏ hàng thành công.`);
      // Kích hoạt event cập nhật giỏ hàng nếu cần thiết
      window.dispatchEvent(new Event("rehabai:cart-updated"));
    } catch (error: any) {
      pushToast(
        "Lỗi thêm sản phẩm",
        error instanceof Error ? error.message : "Không thể thêm sản phẩm vào giỏ hàng."
      );
    } finally {
      setIsAdding(false);
    }
  };

  const imageUrl = getImageUrl(product.image_url);
  const formattedPrice = new Intl.NumberFormat("vi-VN", {
    style: "currency",
    currency: "VND"
  }).format(product.price);

  return (
    <article className="overflow-hidden rounded-[24px] border border-emerald-100 bg-white shadow-sm transition hover:-translate-y-1 hover:shadow-lg flex flex-col justify-between h-full">
      <div>
        <div className="relative aspect-[16/11] overflow-hidden bg-emerald-50/50">
          <Image
            src={imageUrl}
            alt={product.name}
            width={400}
            height={270}
            className="h-full w-full object-cover"
          />
          <span className="absolute top-3 left-3 inline-flex rounded-full bg-slate-900/70 px-2.5 py-0.5 text-xs font-semibold text-white backdrop-blur">
            {product.category}
          </span>
        </div>

        <div className="p-5">
          <h3 className="line-clamp-1 text-base font-black text-slate-900">
            {product.name}
          </h3>
          <p className="mt-2 text-lg font-black text-emerald-700">
            {formattedPrice}
          </p>
          <p className="mt-2.5 line-clamp-2 text-sm leading-6 text-slate-500">
            {product.description || "Dụng cụ chất lượng cao hỗ trợ quá trình tập luyện phục hồi."}
          </p>
        </div>
      </div>

      <div className="p-5 pt-0">
        <Button
          type="button"
          onClick={handleAddToCart}
          disabled={isAdding}
          className="flex w-full items-center justify-center gap-2 rounded-xl text-xs font-black"
        >
          <ShoppingCart className="h-4 w-4" />
          {isAdding ? "Đang thêm..." : "Thêm vào giỏ hàng"}
        </Button>
      </div>
    </article>
  );
}
