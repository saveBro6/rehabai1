"use client";

import { useEffect, useState } from "react";
import Image, { type ImageProps } from "next/image";

import { getImageUrl } from "@/lib/utils";

const PRODUCT_IMAGE_FALLBACK = "/images/placeholders/rehab-equipment.jpg";

export function getProductImageSrc(src: string | null | undefined) {
  return getImageUrl(src, PRODUCT_IMAGE_FALLBACK);
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
