import "./globals.css";
import ThemeToggle from "../components/ThemeToggle";

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        {children}
        <ThemeToggle />
      </body>
    </html>
  );
}
