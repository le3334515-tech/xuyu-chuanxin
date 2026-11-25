"use client";

import { useEffect } from "react";
import { useLang } from "@/components/lang-provider";

/** 静态导出下 metadata 固定，这里按当前语言更新标签页标题。 */
export function PageTitle({
  zh,
  en,
}: {
  zh: string;
  en: string;
}) {
  const { lang } = useLang();
  useEffect(() => {
    document.title = lang === "en" ? en : zh;
  }, [lang, zh, en]);
  return null;
}
