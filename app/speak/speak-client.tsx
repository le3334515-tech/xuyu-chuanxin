"use client";

import { useSearchParams } from "next/navigation";
import { SecondVoiceStudio } from "@/components/second-voice-studio";
import { useLang } from "@/components/lang-provider";

export function SpeakClient() {
  const params = useSearchParams();
  const { copy } = useLang();
  const starter = params.get("starter");
  // 起手句 id 固定，文案随语言走
  const order = ["more-time", "ask-me", "try-again", "continue"];
  const index = order.indexOf(starter ?? "");
  const initialMessage = index >= 0 ? copy.starters[index] : "";
  return <SecondVoiceStudio initialMessage={initialMessage} />;
}
