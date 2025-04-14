import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Play Airplane Shooter Game",
  description:
    "Play the exciting airplane shooter game with multiple powerups and enemies",
};

export default function GameLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return children;
}
