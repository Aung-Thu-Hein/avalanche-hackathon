import type { Metadata } from "next";
import { Providers } from "./providers";
// Self-hosted fonts: bundled with the app, so a venue wifi drop can't break them.
import "@fontsource-variable/inter";
import "@fontsource-variable/sora";
import "./globals.css";

export const metadata: Metadata = {
  title: "SafeHold",
  description: "Know before you hold.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
