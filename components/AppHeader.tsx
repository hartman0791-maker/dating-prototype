"use client";
export {};

type Props = {
  title?: string;
  right?: React.ReactNode;
};

export default function AppHeader({ title = "Modern & Catchy Dating", right }: Props) {
  return (
    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        {/* Logo */}
        <div
          style={{
            width: 38,
            height: 38,
            borderRadius: 14,
            background: "linear-gradient(135deg, var(--warm1), var(--warm2))",
            display: "grid",
            placeItems: "center",
            boxShadow: "0 10px 18px rgba(255, 77, 121, 0.18)",
          }}
          aria-label="Logo"
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
            <path
              d="M12 21s-7-4.5-9.5-9C.2 8.6 2.3 5 6.4 5c2 0 3.4 1 4.6 2.4C12.2 6 13.6 5 15.6 5c4.1 0 6.2 3.6 3.9 7-2.5 4.5-9.5 9-9.5 9z"
              fill="white"
              opacity="0.95"
            />
          </svg>
        </div>

        <div>
          <div style={{ fontSize: 16, fontWeight: 950, letterSpacing: -0.2 }}>{title}</div>
          <div style={{ fontSize: 12, opacity: 0.7 }}>Match • Chat • Connect</div>
        </div>
      </div>

      <div style={{ display: "flex", gap: 10, flexWrap: "wrap", justifyContent: "flex-end" }}>{right}</div>
    </div>
  );
}
