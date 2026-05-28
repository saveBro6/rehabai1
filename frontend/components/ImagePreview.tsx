"use client";

import { useEffect, useMemo, useState } from "react";

import { getImageUrl } from "@/lib/utils";

const DEFAULT_IMAGE_FALLBACK = "/images/placeholders/rehab-equipment.jpg";

type ImagePreviewProps = {
  src: string | null | undefined;
  alt: string;
  className?: string;
  fallbackSrc?: string;
  hintClassName?: string;
};

export function normalizeImagePreviewSrc(src: string | null | undefined, fallbackSrc = DEFAULT_IMAGE_FALLBACK) {
  const trimmed = src?.trim();
  if (!trimmed) return fallbackSrc;
  return getImageUrl(trimmed, fallbackSrc);
}

export function ImagePreview({
  src,
  alt,
  className,
  fallbackSrc = DEFAULT_IMAGE_FALLBACK,
  hintClassName = "mt-2 text-sm font-semibold text-rose-700"
}: ImagePreviewProps) {
  const hasInputValue = Boolean(src?.trim());
  const normalizedSrc = useMemo(() => normalizeImagePreviewSrc(src, fallbackSrc), [fallbackSrc, src]);
  const [imageSrc, setImageSrc] = useState(normalizedSrc);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setImageSrc(normalizedSrc);
    setFailed(false);
  }, [normalizedSrc]);

  return (
    <>
      {/* Form previews intentionally use img so arbitrary admin-entered URLs are testable without Next.js domain allowlist churn. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={imageSrc}
        alt={alt}
        className={className}
        onError={() => {
          if (imageSrc !== fallbackSrc) {
            setImageSrc(fallbackSrc);
          }
          setFailed(hasInputValue);
        }}
      />
      {failed ? <p className={hintClassName}>Không thể tải ảnh từ đường dẫn này.</p> : null}
    </>
  );
}
