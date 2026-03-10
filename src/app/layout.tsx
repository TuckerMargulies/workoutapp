import type { Metadata } from "next";
import "./globals.css";
import { BottomNav } from "./BottomNav";

export const metadata: Metadata = {
  title: "Workout App",
  description: "Quick workout suggestions when you are ready to exercise",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body>
        <div
          style={{
            maxWidth: 480,
            margin: "0 auto",
            minHeight: "100dvh",
            position: "relative",
          }}
        >
          {children}
          <BottomNav />
        </div>
      </body>
    </html>
  );
}
