export interface GameState {
  board: (string | null)[];
  moveHistory: number[];
  currentPlayer: "X" | "O";
  winner: "X" | "O" | null;
  players: { player1: string; player2: string };
  isDraw: boolean;
  playerTurn: "X" | "O";
  playerCount: number;
  deleted?: boolean;
  winCount?: {
    player1: number;
    player2: number;
  };
}

export interface SavedGame {
  id: string;
  players: { player1: string; player2: string };
  lastPlayed: number; // timestamp
  winCount: {
    player1: number;
    player2: number;
  };
}
