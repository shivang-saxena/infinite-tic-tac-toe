"use client";

import React, { useState, useEffect } from "react";
import styles from "@/styles/GameBoard.module.css";
import { motion, AnimatePresence } from "framer-motion";
import { sounds } from "@/lib/sounds";
import { GameState, SavedGame } from "@/lib/types";
import Link from "next/link";

// Function to save game to localStorage
const saveGameToLocalStorage = (
  gameId: string, 
  players: { player1: string; player2: string },
  winCount: { player1: number; player2: number }
) => {
  try {
    // Get existing saved games
    const savedGamesJson = localStorage.getItem('ticTacToeSavedGames');
    const savedGames: SavedGame[] = savedGamesJson ? JSON.parse(savedGamesJson) : [];
    
    // Check if this game already exists
    const existingGameIndex = savedGames.findIndex(game => game.id === gameId);
    
    const updatedGame: SavedGame = {
      id: gameId,
      players,
      lastPlayed: Date.now(),
      winCount
    };
    
    if (existingGameIndex >= 0) {
      // Update existing game
      savedGames[existingGameIndex] = updatedGame;
    } else {
      // Add new game
      savedGames.push(updatedGame);
    }
    
    // Keep only the 10 most recent games
    const recentGames = savedGames
      .sort((a, b) => b.lastPlayed - a.lastPlayed)
      .slice(0, 10);
    
    localStorage.setItem('ticTacToeSavedGames', JSON.stringify(recentGames));
  } catch (error) {
    console.error('Error saving game to localStorage:', error);
  }
};

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

  // Handle disconnection when component unmounts or changes
  useEffect(() => {
    // When component unmounts or changes, decrease player count
    return () => {
      updatePlayerDisconnected(gameId);
    };
  }, [gameId]);

  // Update player count when a player disconnects
  const updatePlayerDisconnected = async (id: string) => {
    try {
      const state = await fetch(`/api/game/${id}`).then(res => res.json());
      if (state && !state.deleted) {
        // Save current state information before marking as disconnected
        if (state.winCount) {
          saveGameToLocalStorage(id, state.players, state.winCount);
        }
        
        // Decrease player count to 1 to allow rejoining
        const updatedState = {
          ...state,
          playerCount: 1
        };
        await fetch(`/api/game/${id}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(updatedState),
        });
      }
    } catch (error) {
      console.error("Error updating player count:", error);
    }
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
        // Update local game state from server
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
  }, [gameId, onReset]);

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
    // Return early if:
    // 1. The cell is already taken
    // 2. There's already a winner
    // 3. It's not this player's turn
    if (
      gameState.board[index] !== null ||
      gameState.winner !== null ||
      gameState.playerTurn !== playerSymbol
    )
      return;

    sounds.move.play();
    const newBoard = [...gameState.board];
    const newMoveHistory = [...gameState.moveHistory];
    newBoard[index] = gameState.currentPlayer;

    // Determine next player's turn
    const nextPlayer = gameState.currentPlayer === "X" ? "O" : "X";

    let newState: GameState = {
      ...gameState,
      board: newBoard,
      moveHistory: [...newMoveHistory, index],
      currentPlayer: nextPlayer,
      playerTurn: nextPlayer
    };

    const winner = checkWinner(newBoard);
    if (winner) {
      sounds.win.play();
      
      // Update win counts
      const winCount = gameState.winCount || { player1: 0, player2: 0 };
      if (winner === "X") {
        winCount.player1++;
      } else {
        winCount.player2++;
      }
      
      newState = { 
        ...newState, 
        winner,
        winCount
      };
      
      // Save game in localStorage
      saveGameToLocalStorage(gameId, players, winCount);
      
      // First update state on server so other player sees the win
      await saveState(newState);
      // Then update local state
      setGameState(newState);
      
      // If I'm the winner, reset the game for both players
      if (playerSymbol === winner) {
        // Let the win animation show for 2 seconds before resetting
        setTimeout(() => handleReset(), 2000);
      }
      
      return; // Exit early to prevent double state update
    } else if (isBoardFull(newBoard)) {
      const oldestMove = newMoveHistory[0];
      newBoard[oldestMove] = null;
      newMoveHistory.shift();
      newState = {
        ...newState,
        board: newBoard,
        moveHistory: newMoveHistory
      };
      await saveState(newState);
    } else {
      await saveState(newState);
    }

    setGameState(newState);
  };

  const handleReset = async () => {
    sounds.click.play();
    
    // Determine who goes first in the next game - alternate starting player
    const firstPlayer = gameState.winner === "X" ? "O" : "X";
    
    const initialState: GameState = {
      board: Array(9).fill(null),
      moveHistory: [],
      currentPlayer: firstPlayer,
      playerTurn: firstPlayer,
      winner: null,
      players,
      isDraw: false,
      // Keep player count at 2 to avoid players getting locked out
      playerCount: 2,
    };
    
    // Initialize win counts if not present
    if (!gameState.winCount) {
      initialState.winCount = { player1: 0, player2: 0 };
    } else {
      initialState.winCount = gameState.winCount;
    }
    
    // Reset the game for both players
    
    // Update state on server first to ensure both players get updated
    await saveState(initialState);
    
    // Then update local state
    setGameState(initialState);
    setGameDeleted(false);
  };

  const renderSquare = (index: number) => (
    <motion.button
      key={`square-${index}`}
      className={styles.square}
      onClick={() => handleClick(index)}
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
      disabled={
        gameState.board[index] !== null || 
        gameState.winner !== null || 
        gameState.playerTurn !== playerSymbol
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

  // Show message when other player leaves instead of automatically redirecting
  if (gameDeleted && !gameState.winner) {
    return (
      <div className={styles.gameDeleted}>
        <h2>Other player has left the game!</h2>
        <p>Share the game link again for them to rejoin.</p>
        <p className={styles.gameLink}>
          {window.location.href}
          <button
            onClick={() => navigator.clipboard.writeText(window.location.href)}
            className={styles.copyButton}
          >
            Copy
          </button>
        </p>
        <Link href="/" className={styles.linkButton}>
          <motion.button
            className={styles.resetButton}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Return to Home
          </motion.button>
        </Link>
      </div>
    );
  }

  // Game history component
  const GameHistory = () => {
    const winCount = gameState.winCount || { player1: 0, player2: 0 };
    const turnIndicator = gameState.playerTurn === playerSymbol ? "(Your Turn)" : "(Waiting)";
    
    return (
      <div className={styles.gameHistory}>
        <div className={styles.playerInfo}>
          <div className={`${styles.currentPlayer} ${playerSymbol === "X" ? styles.activePlayer : ""}`}>
            You are: <strong>{playerSymbol === "X" ? players.player1 : players.player2}</strong> ({playerSymbol})
          </div>
          <div className={styles.turnInfo}>
            <span className={gameState.playerTurn === playerSymbol ? styles.yourTurn : ""}>
              {turnIndicator}
            </span>
          </div>
        </div>
        
        <h3>Score</h3>
        <div className={styles.scoreBoard}>
          <div className={`${styles.playerScore} ${playerSymbol === "X" ? styles.activePlayer : ""}`}>
            <span className={styles.playerName}>{players.player1}</span>
            <span className={styles.playerSymbol}>(X)</span>
            <span className={styles.score}>{winCount.player1}</span>
          </div>
          <div className={styles.scoreSeparator}>vs</div>
          <div className={`${styles.playerScore} ${playerSymbol === "O" ? styles.activePlayer : ""}`}>
            <span className={styles.playerName}>{players.player2}</span>
            <span className={styles.playerSymbol}>(O)</span>
            <span className={styles.score}>{winCount.player2}</span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <motion.div
      className={styles.gameBoard}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <GameHistory />
      
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
        Play Again (Same Players)
      </motion.button>
      <motion.button
        className={`${styles.resetButton} ${styles.newGameButton}`}
        onClick={onReset}
        whileHover={{ scale: 1.05 }}
        whileTap={{ scale: 0.95 }}
      >
        New Game (Different Players)
      </motion.button>
      
      <Link href="/" className={styles.linkButton}>
        <motion.button
          className={`${styles.resetButton} ${styles.homeButton}`}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          Return to Home
        </motion.button>
      </Link>
    </motion.div>
  );
};

export default GameBoard;
