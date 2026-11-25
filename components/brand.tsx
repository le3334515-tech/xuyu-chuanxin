"use client";

import Link from "next/link";
import { Waves } from "lucide-react";
import { useCopy } from "@/components/lang-provider";

export function Brand() {
  const copy = useCopy();
  return (
    <Link className="brand" href="/" aria-label={copy.brand.home}>
      <Waves size={25} strokeWidth={2} />
      <span>
        {copy.brand.name}
        <span className="brand-dot">.</span>
      </span>
    </Link>
  );
}
