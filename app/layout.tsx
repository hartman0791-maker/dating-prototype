import "./globals.css";

export const metadata = {
  title: "Dating Prototype",
  description: "Supabase + Next.js dating prototype"
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
