"use client";

import React, { useState, useEffect } from "react";
import styles from "@/styles/GameBoard.module.css";
import { motion, AnimatePresence } from "framer-motion";
import { sounds } from "@/lib/sounds";
import { GameState } from "@/lib/types";

interface GameBoardProps {
  players: { player1: string; player2: string };
  onReset: () => void;
  gameId: string;
  playerSymbol: "X" | "O";
}

export const GameBoard: React.FC<GameBoardProps> = ({
  players,
  onReset,
  gameId,
  playerSymbol,
}) => {
  const [gameState, setGameState] = useState<GameState>({
    board: Array(9).fill(null),
    moveHistory: [],
    currentPlayer: "X",
    winner: null,
    players,
    isDraw: false,
    playerTurn: "X",
    playerCount: 1,
  });
  const [gameDeleted, setGameDeleted] = useState(false);

  const playerColors: Record<"X" | "O", string> = {
    X: "#ff6b6b", // Red for Player X
    O: "#4ecdc4", // Turquoise for Player O
  };

  useEffect(() => {
    const eventSource = new EventSource(`/api/game/${gameId}/updates`);

    eventSource.onmessage = (event) => {
      const data = JSON.parse(event.data);
      if (data.deleted) {
        setGameDeleted(true);
      } else if (data.error) {
        onReset();
      } else {
        setGameState(data);
      }
    };

    eventSource.onerror = () => {
      // Only set gameDeleted if not a win (player left)
      if (!gameState.winner) {
        setGameDeleted(true);
      }
      eventSource.close();
    };

    return () => {
      eventSource.close();
    };
  }, [gameId, onReset, gameState.winner]);

  const saveState = async (newState: GameState) => {
    try {
      await fetch(`/api/game/${gameId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newState),
      });
    } catch (error) {
      console.error("Error saving game state:", error);
    }
  };

  const checkWinner = (board: (string | null)[]): "X" | "O" | null => {
    const winningCombinations: [number, number, number][] = [
      [0, 1, 2],
      [3, 4, 5],
      [6, 7, 8],
      [0, 3, 6],
      [1, 4, 7],
      [2, 5, 8],
      [0, 4, 8],
      [2, 4, 6],
    ];

    for (const [a, b, c] of winningCombinations) {
      if (board[a] && board[a] === board[b] && board[a] === board[c]) {
        return board[a] as "X" | "O";
      }
    }
    return null;
  };

  const isBoardFull = (board: (string | null)[]): boolean => {
    return board.every((cell) => cell !== null);
  };

  const handleClick = async (index: number) => {
    if (
      gameState.board[index] ||
      gameState.winner ||
      gameState.playerTurn !== playerSymbol
    )
      return;

    sounds.move.play();
    const newBoard = [...gameState.board];
    const newMoveHistory = [...gameState.moveHistory];
    newBoard[index] = gameState.currentPlayer;

    let newState: GameState = {
      ...gameState,
      board: newBoard,
      moveHistory: [...newMoveHistory, index],
    };

    const winner = checkWinner(newBoard);
    if (winner) {
      sounds.win.play();
      newState = { ...newState, winner };
      await saveState(newState);
      setTimeout(() => handleReset(), 2000); // Reset after 2 seconds to show winner
    } else if (isBoardFull(newBoard)) {
      const oldestMove = newMoveHistory[0];
      newBoard[oldestMove] = null;
      newMoveHistory.shift();
      newState = {
        ...newState,
        board: newBoard,
        moveHistory: newMoveHistory,
        currentPlayer: gameState.currentPlayer === "X" ? "O" : "X",
        playerTurn: gameState.currentPlayer === "X" ? "O" : "X",
      };
      await saveState(newState);
    } else {
      newState = {
        ...newState,
        currentPlayer: gameState.currentPlayer === "X" ? "O" : "X",
        playerTurn: gameState.currentPlayer === "X" ? "O" : "X",
      };
      await saveState(newState);
    }

    setGameState(newState);
  };

  const handleReset = async () => {
    sounds.click.play();
    const initialState: GameState = {
      board: Array(9).fill(null),
      moveHistory: [],
      currentPlayer: "X",
      winner: null,
      players,
      isDraw: false,
      playerTurn: "X",
      playerCount: gameState.playerCount,
    };
    setGameState(initialState);
    await saveState(initialState);
    setGameDeleted(false); // Ensure game continues with same ID
  };

  const renderSquare = (index: number) => (
    <motion.button
      key={`square-${index}`}
      className={styles.square}
      onClick={() => handleClick(index)}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      disabled={
        gameState.winner !== null || gameState.playerTurn !== playerSymbol
      }
    >
      <AnimatePresence>
        {gameState.board[index] && (
          <motion.span
            key={`mark-${index}`}
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            exit={{ scale: 0 }}
            transition={{ duration: 0.2 }}
            style={{ color: playerColors[gameState.board[index] as "X" | "O"] }}
          >
            {gameState.board[index]}
          </motion.span>
        )}
      </AnimatePresence>
    </motion.button>
  );

  if (gameDeleted && !gameState.winner) {
    onReset(); // Redirect to home only if a player leaves
    return null;
  }

  return (
    <motion.div
      className={styles.gameBoard}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <motion.div
        className={styles.status}
        animate={gameState.winner ? { scale: [1, 1.1, 1] } : {}}
        transition={{ duration: 0.5, repeat: gameState.winner ? Infinity : 0 }}
      >
        {gameState.winner
          ? `Winner: ${
              gameState.winner === "X" ? players.player1 : players.player2
            }`
          : `Turn: ${
              gameState.playerTurn === "X" ? players.player1 : players.player2
            } (${gameState.playerTurn})`}
      </motion.div>
      <div
        className={styles.board}
        style={{
          backgroundColor: gameState.winner
            ? "#fff"
            : playerColors[gameState.playerTurn],
        }}
      >
        {[0, 1, 2].map((row) => (
          <div className={styles.boardRow} key={`row-${row}`}>
            {[0, 1, 2].map((col) => renderSquare(row * 3 + col))}
          </div>
        ))}
      </div>
      <motion.button
        className={styles.resetButton}
        onClick={handleReset}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        Play Again
      </motion.button>
      <motion.button
        className={styles.resetButton}
        onClick={onReset}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        New Game
      </motion.button>
    </motion.div>
  );
};

export default GameBoard;
