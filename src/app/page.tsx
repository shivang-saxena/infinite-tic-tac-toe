"use client";

import React, { useState, useEffect, Suspense } from "react";
import GameBoard from "@/components/GameBoard";
import PlayerSelection from "@/components/PlayerSelection";
import styles from "./page.module.css";
import { motion } from "framer-motion";
import { useSearchParams, useRouter } from "next/navigation";
import { GameState } from "@/lib/types"; // Import from types.ts

function GameContent() {
  const [players, setPlayers] = useState<{
    player1: string;
    player2: string;
  } | null>(null);
  const [gameStarted, setGameStarted] = useState(false);
  const [gameId, setGameId] = useState<string | null>(null);
  const [playerSymbol, setPlayerSymbol] = useState<"X" | "O" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const router = useRouter();

  useEffect(() => {
    const id = searchParams.get("gameId");
    if (id && !gameStarted) {
      setGameId(id);
      joinGame(id);
    }
  }, [searchParams]);

  const joinGame = async (id: string) => {
    try {
      const response = await fetch(`/api/game/${id}`);
      if (response.ok) {
        const state: GameState = await response.json();
        if (state.playerCount < 2) {
          const updatedState: GameState = {
            ...state,
            playerCount: state.playerCount + 1,
            players: {
              player1: state.players.player1 || "Player 1",
              player2: state.players.player2 || "Player 2",
            },
          };
          if (!state.players.player1) {
            updatedState.players.player1 = "Player 1";
          } else if (!state.players.player2) {
            updatedState.players.player2 = "Player 2";
          }
          await fetch(`/api/game/${id}`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(updatedState),
          });
          setPlayers(updatedState.players);
          setPlayerSymbol(state.playerCount === 0 ? "X" : "O");
          setGameStarted(true);
        } else {
          setError("Game is full");
          router.push("/");
        }
      } else {
        setError("Game not found");
        router.push("/");
      }
    } catch (error) {
      console.error("Error joining game:", error);
      setError("Error joining game");
      router.push("/");
    }
  };

  const startGame = async (playerNames: {
    player1: string;
    player2: string;
  }) => {
    const response = await fetch("/api/new-game");
    const { gameId: newGameId } = await response.json();

    const initialState: GameState = {
      board: Array(9).fill(null),
      moveHistory: [],
      currentPlayer: "X",
      winner: null,
      players: { player1: playerNames.player1, player2: "" },
      isDraw: false,
      playerTurn: "X",
      playerCount: 1,
    };
    await fetch(`/api/game/${newGameId}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(initialState),
    });

    setPlayers(initialState.players);
    setGameId(newGameId);
    setPlayerSymbol("X");
    setGameStarted(true);
    router.push(`/?gameId=${newGameId}`, { scroll: false });
  };

  const resetGame = async () => {
    if (gameId) {
      await fetch(`/api/game/${gameId}`, { method: "DELETE" });
    }
    setPlayers(null);
    setGameStarted(false);
    setGameId(null);
    setPlayerSymbol(null);
    setError(null);
    router.push("/", { scroll: false });
  };

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
      {gameStarted && gameId && !error && (
        <div className={styles.gameLink}>
          Share this link: {window.location.href}
          <button
            onClick={() => navigator.clipboard.writeText(window.location.href)}
            className={styles.copyButton}
          >
            Copy
          </button>
        </div>
      )}
      {!gameStarted ? (
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

export default function Home() {
  return (
    <Suspense fallback={<div className={styles.loading}>Loading...</div>}>
      <GameContent />
    </Suspense>
  );
}
