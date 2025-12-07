import { ImageResponse } from "next/og";

export const runtime = "edge";

export const alt = "Find the COW - Daily Word Search Puzzle";
export const size = {
  width: 1200,
  height: 630,
};
export const contentType = "image/png";

export default async function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          background: "linear-gradient(135deg, #fef3c7 0%, #fde68a 100%)",
          width: "100%",
          height: "100%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: "system-ui, sans-serif",
        }}
      >
        {/* Left side - Text */}
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            marginRight: 80,
          }}
        >
          <div
            style={{
              fontSize: 72,
              fontWeight: "bold",
              color: "#1f2937",
              marginBottom: 10,
            }}
          >
            Find the
          </div>
          <div
            style={{
              fontSize: 120,
              fontWeight: "bold",
              color: "#d97706",
              marginBottom: 20,
            }}
          >
            COW
          </div>
          <div
            style={{
              fontSize: 32,
              color: "#6b7280",
              marginBottom: 40,
            }}
          >
            Daily Word Search Puzzle
          </div>

          {/* COW letter tiles */}
          <div style={{ display: "flex", gap: 12 }}>
            {["C", "O", "W"].map((letter) => (
              <div
                key={letter}
                style={{
                  width: 70,
                  height: 70,
                  background: "#f59e0b",
                  borderRadius: 12,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontSize: 40,
                  fontWeight: "bold",
                  color: "white",
                }}
              >
                {letter}
              </div>
            ))}
          </div>
        </div>

        {/* Right side - Cow Emoji */}
        <div
          style={{
            fontSize: 200,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          🐮
        </div>

        {/* Daily badge */}
        <div
          style={{
            position: "absolute",
            top: 40,
            right: 60,
            width: 120,
            height: 120,
            background: "#10b981",
            borderRadius: "50%",
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
          }}
        >
          <div style={{ fontSize: 22, fontWeight: "bold", color: "white" }}>
            NEW
          </div>
          <div style={{ fontSize: 22, fontWeight: "bold", color: "white" }}>
            DAILY
          </div>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
