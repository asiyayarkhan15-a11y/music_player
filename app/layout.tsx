import type { Metadata, Viewport } from "next";
import "./globals.css";
import PlayerProvider from "@/components/PlayerProvider";

export const metadata: Metadata = {
  title: "Music Player",
  description: "Search and listen to full-length tracks from Audius.",
};

export const viewport: Viewport = {
  themeColor: "#0a0a0f",
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        {/* PlayerProvider wraps everything because it holds the one <audio>
            element. Mounted here, React never unmounts it, so playback
            survives every re-render in the app. */}
        <PlayerProvider>{children}</PlayerProvider>
      </body>
    </html>
  );
}
