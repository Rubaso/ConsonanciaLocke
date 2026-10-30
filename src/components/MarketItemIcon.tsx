"use client";

import Image from "next/image";
import { useState } from "react";
import { getMarketItem, itemSpriteUrl } from "@/lib/market-items";

type MarketItemIconProps = {
  slug: string | null;
  photoData?: string | null;
  size?: number;
  alt?: string;
};

export default function MarketItemIcon({
  slug,
  photoData,
  size = 40,
  alt = "",
}: MarketItemIconProps) {
  const [failed, setFailed] = useState(false);
  const spriteSlug = getMarketItem(slug)?.slug ?? slug;
  const src = photoData || (spriteSlug && !failed ? itemSpriteUrl(spriteSlug) : null);

  return (
    <span
      className="inline-flex shrink-0 items-center justify-center overflow-hidden rounded-[3px] border border-fuchsia-300/20 bg-black/50"
      style={{ width: size, height: size }}
    >
      {src ? (
        <Image
          src={src}
          alt={alt}
          width={size}
          height={size}
          unoptimized
          onError={() => {
            if (!photoData) setFailed(true);
          }}
          className="h-full w-full object-contain"
        />
      ) : (
        <span className="text-[10px] font-black text-fuchsia-200/70">OBJ</span>
      )}
    </span>
  );
}
