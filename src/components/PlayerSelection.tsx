"use client";

import React, { useState, FormEvent } from "react";
import styles from "@/styles/PlayerSelection.module.css";
import { motion } from "framer-motion";
import { sounds } from "@/lib/sounds";

interface PlayerSelectionProps {
  onStart: (players: { player1: string; player2: string }) => void;
  joinGame: (gameId: string) => void;
}

export const PlayerSelection: React.FC<PlayerSelectionProps> = ({
  onStart,
  joinGame,
}) => {
  const [player1, setPlayer1] = useState("");
  const [player2, setPlayer2] = useState("");
  const [gameIdInput, setGameIdInput] = useState("");

  const handleStart = (e: FormEvent) => {
    e.preventDefault();
    if (player1 && player2) {
      sounds.click.play();
      onStart({ player1, player2 });
    }
  };

  const handleJoin = (e: FormEvent) => {
    e.preventDefault();
    if (gameIdInput) {
      sounds.click.play();
      joinGame(gameIdInput);
    }
  };

  return (
    <motion.div
      className={styles.playerSelection}
      initial={{ scale: 0.8, opacity: 0 }}
      animate={{ scale: 1, opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <h2 className={styles.sectionTitle}>New Game</h2>
      <form onSubmit={handleStart}>
        <div className={styles.inputGroup}>
          <input
            type="text"
            value={player1}
            onChange={(e) => setPlayer1(e.target.value)}
            placeholder="Player 1"
            required
          />
          <span className={styles.playerSymbol}>X</span>
        </div>
        <div className={styles.inputGroup}>
          <input
            type="text"
            value={player2}
            onChange={(e) => setPlayer2(e.target.value)}
            placeholder="Player 2"
            required
          />
          <span className={styles.playerSymbol}>O</span>
        </div>
        <motion.button
          type="submit"
          className={styles.startButton}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          Start Game
        </motion.button>
      </form>
      <h2 className={styles.sectionTitle}>Join Existing Game</h2>
      <form onSubmit={handleJoin}>
        <div className={styles.inputGroup}>
          <input
            type="text"
            value={gameIdInput}
            onChange={(e) => setGameIdInput(e.target.value)}
            placeholder="Enter Game ID"
            required
          />
        </div>
        <motion.button
          type="submit"
          className={styles.startButton}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          Join Game
        </motion.button>
      </form>
    </motion.div>
  );
};

export default PlayerSelection;
