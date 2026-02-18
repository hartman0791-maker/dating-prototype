// app/layout.tsx
import "./globals.css";
import ThemeToggle from "../components/ThemeToggle";
import PresenceProvider from "../components/PresenceProvider";
import { Toaster } from "sonner";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <PresenceProvider>{children}</PresenceProvider>

        <ThemeToggle />

        {/* ✅ Toasts (global) */}
        <Toaster
          position="top-center"
          richColors
          closeButton
          expand={false}
          toastOptions={{
            duration: 2200,
            style: { borderRadius: 14, fontWeight: 800 },
          }}
        />
      </body>
    </html>
  );
}
