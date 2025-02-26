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
}
