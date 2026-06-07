import { ImageResponse } from "next/og";

export const alt = "Saudi IPO Tracker";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OpengraphImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "100%",
          height: "100%",
          display: "flex",
          flexDirection: "column",
          justifyContent: "space-between",
          background: "#f8f6ef",
          color: "#1f2a24",
          padding: "76px",
          fontFamily: "serif",
        }}
      >
        <div
          style={{
            display: "flex",
            fontSize: 26,
            letterSpacing: 8,
            color: "#2f6b4f",
          }}
        >
          TASI MAIN MARKET
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ display: "flex", fontSize: 92, fontWeight: 700, lineHeight: 1.04 }}>
            Saudi IPO Tracker
          </div>
          <div style={{ display: "flex", fontSize: 34, color: "#5b6660", marginTop: 26, maxWidth: 920 }}>
            Every Main Market IPO since December 2019, with returns adjusted for bonus
            issues and splits.
          </div>
        </div>
        <div style={{ display: "flex", fontSize: 23, color: "#5b6660" }}>
          Informational only. Not investment advice.
        </div>
      </div>
    ),
    { ...size },
  );
}
