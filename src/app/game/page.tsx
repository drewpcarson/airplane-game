"use client";

import dynamic from "next/dynamic";
import { useEffect, useState } from "react";

// Dynamically import the Game component with no SSR
const GameComponent = dynamic(() => import("../../components/Game"), {
  ssr: false,
});

export default function GamePage() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  return (
    <div className="flex justify-center items-center min-h-screen bg-[#222]">
      {mounted && <GameComponent />}
    </div>
  );
}
