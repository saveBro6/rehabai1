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

  const handleError: NonNullable<ImageProps["onError"]> = (event) => {
    if (imageSrc !== fallbackSrc) {
      setImageSrc(fallbackSrc);
    }
    onError?.(event);
  };

  if (!canUseNextImage(imageSrc)) {
    const { width, height, fill: _fill, priority: _priority, placeholder: _placeholder, blurDataURL: _blurDataURL, ...imgProps } = props;
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        {...imgProps}
        src={imageSrc}
        alt={alt}
        width={typeof width === "number" ? width : undefined}
        height={typeof height === "number" ? height : undefined}
        onError={(event) => {
          if (imageSrc !== fallbackSrc) {
            setImageSrc(fallbackSrc);
          }
          onError?.(event as unknown as Parameters<NonNullable<ImageProps["onError"]>>[0]);
        }}
      />
    );
  }

  return <Image {...props} src={imageSrc} alt={alt} onError={handleError} />;
}

function canUseNextImage(src: string) {
  if (src.startsWith("/")) return true;

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
