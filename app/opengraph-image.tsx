import { ImageResponse } from "next/og";
export const dynamic = "force-static";
export const alt =
  "续语传心 — 为你说不出口的那句话。中文辅助沟通原型。";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";
export default function Image() {
  return new ImageResponse(
    <div
      style={{
        display: "flex",
        width: "100%",
        height: "100%",
        background: "#faf9fc",
        color: "#252231",
        padding: "52px 64px",
        flexDirection: "column",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          fontSize: 26,
        }}
      >
        <span>SecondVoice.</span>
        <span style={{ fontSize: 15, color: "#625d70" }}>
          AssemblyAI Hack into Speech · Winner
        </span>
      </div>
      <div
        style={{
          display: "flex",
          flex: 1,
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            fontSize: 88,
            lineHeight: 1.05,
            letterSpacing: -4,
          }}
        >
          <span>为你说不出口的</span>
          <span style={{ color: "#6846dc" }}>那一句话。</span>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 10,
            height: 150,
          }}
        >
          {[24, 48, 82, 122, 68, 146, 105, 54, 96, 38].map((height, i) => (
            <div
              key={i}
              style={{
                width: 6,
                height,
                background: "#6846dc",
                borderRadius: 5,
              }}
            />
          ))}
        </div>
      </div>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          borderTop: "1px solid #e2dfe9",
          paddingTop: 26,
          color: "#625d70",
          fontSize: 19,
        }}
      >
        <span>你的话。你的节奏。你的下一句。</span>
        <span>改编自 Tarang Goyal 的 SecondVoice</span>
      </div>
    </div>,
    size,
  );
}
