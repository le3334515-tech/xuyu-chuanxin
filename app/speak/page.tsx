import { Suspense } from "react";
import type { Metadata } from "next";
import { SpeakClient } from "./speak-client";

export const metadata: Metadata = {
  title: "你的话 — 续语传心",
  description:
    "听一个问题，挑一句可用的回应，念出来；或者自己写、停下、修订，把话显示给对方看。",
};

export default function SpeakPage() {
  return (
    <Suspense fallback={<main className="studio-shell" aria-busy="true" />}>
      <SpeakClient />
    </Suspense>
  );
}
