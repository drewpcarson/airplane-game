"use client";

import { useEffect, useRef } from "react";
import Phaser from "phaser";
import { AirplaneShooterGame } from "./AirplaneShooterGame";

const Game = () => {
  const gameRef = useRef<Phaser.Game | null>(null);
  const gameContainerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (
      typeof window !== "undefined" &&
      !gameRef.current &&
      gameContainerRef.current
    ) {
      const config: Phaser.Types.Core.GameConfig = {
        type: Phaser.AUTO,
        width: 800,
        height: 600,
        parent: gameContainerRef.current,
        physics: {
          default: "arcade",
          arcade: {
            gravity: { x: 0, y: 0 },
            debug: false,
          },
        },
        scene: [AirplaneShooterGame],
      };

      try {
        gameRef.current = new Phaser.Game(config);
        console.log("Game initialized");
      } catch (e) {
        console.error("Game failed to start:", e);
      }
    }

    return () => {
      if (gameRef.current) {
        gameRef.current.destroy(true);
        gameRef.current = null;
        console.log("Game destroyed");
      }
    };
  }, []);

  return (
    <div className="game-container">
      <div ref={gameContainerRef} style={{ border: "2px solid #fff" }} />
    </div>
  );
};

export default Game;
