"use client";

import React, { useState, useEffect, FormEvent } from "react";
import styles from "@/styles/PlayerSelection.module.css";
import { motion } from "framer-motion";
import { sounds } from "@/lib/sounds";
import { SavedGame } from "@/lib/types";

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
  const [savedGames, setSavedGames] = useState<SavedGame[]>([]);
  
  // Load saved games from localStorage
  useEffect(() => {
    try {
      const savedGamesJson = localStorage.getItem('ticTacToeSavedGames');
      if (savedGamesJson) {
        const games: SavedGame[] = JSON.parse(savedGamesJson);
        // Sort by most recently played
        setSavedGames(games.sort((a, b) => b.lastPlayed - a.lastPlayed));
      } else {
        // Initialize with empty array if no saved games
        setSavedGames([]);
      }
    } catch (error) {
      console.error('Error loading saved games:', error);
      setSavedGames([]); // Set to empty array on error
    }
  }, []);

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
      
      {savedGames.length > 0 && (
        <div className={styles.savedGames}>
          <h2 className={styles.sectionTitle}>Recent Games</h2>
          <div className={styles.gamesList}>
            {savedGames.map((game) => (
              <motion.div
                key={game.id}
                className={styles.savedGame}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={() => {
                  sounds.click.play();
                  joinGame(game.id);
                }}
              >
                <div className={styles.gameInfo}>
                  <span className={styles.players}>
                    {game.players.player1} vs {game.players.player2}
                  </span>
                  <div className={styles.score}>
                    <span className={styles.player1Score}>{game.winCount.player1}</span>
                    <span className={styles.scoreDivider}>-</span>
                    <span className={styles.player2Score}>{game.winCount.player2}</span>
                  </div>
                </div>
                <div className={styles.gameDate}>
                  {new Date(game.lastPlayed).toLocaleDateString()}
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default PlayerSelection;
