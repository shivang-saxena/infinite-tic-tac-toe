"use client";

import React, { useState, useEffect, Suspense } from "react";
import GameBoard from "@/components/GameBoard";
import PlayerSelection from "@/components/PlayerSelection";
import styles from "./page.module.css";
import { motion } from "framer-motion";
import { useSearchParams, useRouter } from "next/navigation";
import { GameState } from "@/lib/types";

// Types
type PlayerNames = {
  player1: string;
  player2: string;
};

// Component for game content
function GameContent() {
  // State management
  const [players, setPlayers] = useState<PlayerNames | null>(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameId, setGameId] = useState<string | null>(null);
  const [playerSymbol, setPlayerSymbol] = useState<"X" | "O" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Hooks
  const searchParams = useSearchParams();
  const router = useRouter();

  // Only check for game ID in URL params - don't auto-join from localStorage
  useEffect(() => {
    const loadGame = async () => {
      // Only check URL params
      const id = searchParams.get("gameId");

      if (id && !gameStarted) {
        setLoading(true);
        setGameId(id);
        await joinGame(id);
        setLoading(false);
      }
    };

    loadGame();
  }, [searchParams]);

  // Game API interactions
  const fetchGameState = async (id: string) => {
    try {
      const response = await fetch(`/api/game/${id}`);
      if (!response.ok) throw new Error("Game not found");
      return (await response.json()) as GameState;
    } catch (error) {
      console.error("Error fetching game state:", error);
      return null;
    }
  };

  const updateGameState = async (id: string, state: GameState) => {
    await fetch(`/api/game/${id}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(state),
    });
  };

  // Game actions
  const joinGame = async (
    id: string,
    preferredPlayers?: { player1: string; player2: string }
  ) => {
    try {
      setLoading(true);
      const state = await fetchGameState(id);
      if (!state) {
        throw new Error("Game not found");
      }

      // Allow joining regardless of player count if it's a saved game
      const updatedState: GameState = {
        ...state,
        // Always set playerCount to 2 to ensure both players are in
        playerCount: 2,
      };

      // Keep existing player names if available, otherwise use preferred names
      if (preferredPlayers) {
        if (!state.players.player1) {
          updatedState.players.player1 = preferredPlayers.player1;
        }
        if (!state.players.player2) {
          updatedState.players.player2 = preferredPlayers.player2;
        }
      }

      // Always ensure we have default player names
      if (!updatedState.players.player1) {
        updatedState.players.player1 = "Player 1";
      }
      if (!updatedState.players.player2) {
        updatedState.players.player2 = "Player 2";
      }

      await updateGameState(id, updatedState);

      // Update local state
      setPlayers(updatedState.players);

      // Determine player symbol: try to keep it consistent for returning players
      const savedGamesJson = localStorage.getItem("ticTacToeSavedGames");
      if (savedGamesJson) {
        const games = JSON.parse(savedGamesJson);
        const savedGame = games.find((game: { id: string }) => game.id === id);
        if (savedGame) {
          // If we're the first player in local storage, use X, otherwise O
          setPlayerSymbol(savedGame.players.player1 ? "X" : "O");
        } else {
          setPlayerSymbol(state.playerCount === 0 ? "X" : "O");
        }
      } else {
        setPlayerSymbol(state.playerCount === 0 ? "X" : "O");
      }

      setGameStarted(true);
      setLoading(false);
    } catch (error) {
      console.error("Error joining game:", error);
      setError("Error joining game");
      setLoading(false);
      router.push("/");
    }
  };

  const startGame = async (playerNames: PlayerNames) => {
    try {
      setLoading(true);
      // Create a new game
      const response = await fetch("/api/new-game");
      const { gameId: newGameId } = await response.json();

      // Set up initial game state with both player names
      const initialState: GameState = {
        board: Array(9).fill(null),
        moveHistory: [],
        currentPlayer: "X",
        winner: null,
        players: {
          player1: playerNames.player1 || "Player 1",
          player2: playerNames.player2 || "Player 2",
        },
        isDraw: false,
        playerTurn: "X",
        playerCount: 1,
        winCount: {
          player1: 0,
          player2: 0,
        },
      };

      await updateGameState(newGameId, initialState);

      // Save to localStorage immediately so the other player can join
      saveGameToLocalStorage(
        newGameId,
        initialState.players,
        initialState.winCount
      );

      // Update local state
      setPlayers(initialState.players);
      setGameId(newGameId);
      setPlayerSymbol("X");
      setGameStarted(true);
      setLoading(false);

      // Update URL with game ID
      router.push(`/?gameId=${newGameId}`, { scroll: false });
    } catch (error) {
      console.error("Error starting game:", error);
      setError("Failed to start game");
      setLoading(false);
    }
  };

  // Save game to localStorage
  const saveGameToLocalStorage = (
    id: string,
    players: { player1: string; player2: string },
    winCount: { player1: number; player2: number } = { player1: 0, player2: 0 }
  ) => {
    try {
      const savedGamesJson = localStorage.getItem("ticTacToeSavedGames");
      const savedGames = savedGamesJson ? JSON.parse(savedGamesJson) : [];

      const existingIndex = savedGames.findIndex(
        (game: { id: string }) => game.id === id
      );
      const updatedGame = {
        id,
        players,
        lastPlayed: Date.now(),
        winCount,
      };

      if (existingIndex >= 0) {
        savedGames[existingIndex] = updatedGame;
      } else {
        savedGames.unshift(updatedGame); // Add to beginning (most recent)
      }

      // Keep only 10 most recent games
      const recentGames = savedGames.slice(0, 10);
      localStorage.setItem("ticTacToeSavedGames", JSON.stringify(recentGames));
    } catch (error) {
      console.error("Error saving game to localStorage:", error);
    }
  };

  const resetGame = async () => {
    try {
      if (gameId) {
        // Delete the game completely when explicitly requesting a new game
        await fetch(`/api/game/${gameId}`, { method: "DELETE" });
      }

      // Reset all state
      setPlayers(null);
      setGameStarted(false);
      setGameId(null);
      setPlayerSymbol(null);
      setError(null);

      router.push("/", { scroll: false });
    } catch (error) {
      console.error("Error resetting game:", error);
      setError("Failed to reset game");
    }
  };

  // Share link component
  const ShareGameLink = () => (
    <div className={styles.gameLink}>
      Share this link: {window.location.href}
      <button
        onClick={() => navigator.clipboard.writeText(window.location.href)}
        className={styles.copyButton}
      >
        Copy
      </button>
    </div>
  );

  // Render game content
  return (
    <main className={styles.app}>
      <motion.h1
        className={styles.title}
        initial={{ y: -50, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.5 }}
      >
        Vanishing Tic Tac Toe
      </motion.h1>

      {error && <div className={styles.error}>{error}</div>}

      {gameStarted && gameId && !error && <ShareGameLink />}

      {loading ? (
        <div className={styles.loading}>Loading game...</div>
      ) : !gameStarted ? (
        <PlayerSelection onStart={startGame} joinGame={joinGame} />
      ) : gameId && players && playerSymbol ? (
        <GameBoard
          players={players}
          onReset={resetGame}
          gameId={gameId}
          playerSymbol={playerSymbol}
        />
      ) : (
        <div className={styles.loading}>Loading game...</div>
      )}
    </main>
  );
}

// Main component with Suspense
export default function Home() {
  return (
    <Suspense fallback={<div className={styles.loading}>Loading...</div>}>
      <GameContent />
    </Suspense>
  );
}
