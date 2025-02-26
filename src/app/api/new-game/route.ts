import { NextResponse } from "next/server";
import { v4 as uuidv4 } from "uuid";
import { setGameState } from "@/lib/gameStore";
import { GameState } from "@/lib/types";

export async function GET(): Promise<NextResponse> {
  const gameId = uuidv4();
  const initialState: GameState = {
    board: Array(9).fill(null),
    moveHistory: [],
    currentPlayer: "X",
    winner: null,
    players: { player1: "", player2: "" },
    isDraw: false,
    playerTurn: "X",
    playerCount: 0,
    // Initialize win count
    winCount: {
      player1: 0,
      player2: 0
    }
  };
  await setGameState(gameId, initialState);
  return NextResponse.json({ gameId });
}
