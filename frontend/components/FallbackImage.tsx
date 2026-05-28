"use client";

import { useEffect, useState } from "react";
import Image, { type ImageProps } from "next/image";

import { getImageUrl } from "@/lib/utils";

type FallbackImageProps = Omit<ImageProps, "src"> & {
  src: string | null | undefined;
  fallbackSrc?: string;
};

export function FallbackImage({
  src,
  alt,
  fallbackSrc = "/images/placeholders/rehab-equipment.jpg",
  onError,
  ...props
}: FallbackImageProps) {
  const normalizedSrc = getImageUrl(src, fallbackSrc);
  const [imageSrc, setImageSrc] = useState(normalizedSrc);

  useEffect(() => {
    setImageSrc(normalizedSrc);
  }, [normalizedSrc]);

  return (
    <Image
      {...props}
      src={imageSrc}
      alt={alt}
      onError={(event) => {
        if (imageSrc !== fallbackSrc) {
          setImageSrc(fallbackSrc);
        }
        onError?.(event);
      }}
    />
  );
}
