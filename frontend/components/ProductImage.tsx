"use client";

import { useEffect, useState } from "react";
import Image, { type ImageProps } from "next/image";

import { getImageUrl } from "@/lib/utils";

const PRODUCT_IMAGE_FALLBACK = "/images/placeholders/rehab-equipment.jpg";

function isAllowedProductRemoteImageUrl(src: string) {
  try {
    const url = new URL(src);
    const isSupabaseStorage =
      url.protocol === "https:" &&
      url.hostname.endsWith(".supabase.co") &&
      url.pathname.startsWith("/storage/v1/object/public/");
    const isLocalSupabaseStorage =
      url.protocol === "http:" &&
      url.hostname === "127.0.0.1" &&
      url.port === "54321" &&
      url.pathname.startsWith("/storage/v1/object/public/");
    const isSforumCdn = url.protocol === "https:" && url.hostname === "cdn-media.sforum.vn";

    return isSupabaseStorage || isLocalSupabaseStorage || isSforumCdn;
  } catch {
    return false;
  }
}

export function getProductImageSrc(src: string | null | undefined) {
  const normalizedSrc = getImageUrl(src, PRODUCT_IMAGE_FALLBACK);
  if (normalizedSrc.startsWith("/")) return normalizedSrc;
  if (isAllowedProductRemoteImageUrl(normalizedSrc)) return normalizedSrc;
  return PRODUCT_IMAGE_FALLBACK;
}

type ProductImageProps = Omit<ImageProps, "src"> & {
  src: string | null | undefined;
};

export function ProductImage({ src, alt, onError, ...props }: ProductImageProps) {
  const [imageSrc, setImageSrc] = useState(() => getProductImageSrc(src));
  const normalizedSrc = getProductImageSrc(src);

  useEffect(() => {
    setImageSrc(normalizedSrc);
  }, [normalizedSrc]);

  return (
    <Image
      {...props}
      src={imageSrc}
      alt={alt}
      onError={(event) => {
        if (imageSrc !== PRODUCT_IMAGE_FALLBACK) {
          setImageSrc(PRODUCT_IMAGE_FALLBACK);
        }
        onError?.(event);
      }}
    />
  );
}
