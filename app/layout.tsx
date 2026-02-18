import "./globals.css";
import ThemeToggle from "../components/ThemeToggle";
import PresenceProvider from "../components/PresenceProvider";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {/* ✅ GLOBAL PRESENCE TRACKING */}
        <PresenceProvider>
          {children}
        </PresenceProvider>

        <ThemeToggle />
      </body>
    </html>
  );
}
