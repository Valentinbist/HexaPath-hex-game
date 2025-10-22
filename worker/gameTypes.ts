import { Player, Board, Position } from '../src/lib/hex-logic';

export interface OnlineGameState {
  id: string;
  board: Board;
  currentPlayer: Player.BLUE | Player.RED;
  player1Id: string;
  player2Id?: string;
  player1Color: Player.BLUE | Player.RED;
  player2Color: Player.BLUE | Player.RED;
  gameState: 'waiting' | 'playing' | 'won';
  winner: Player | null;
  winningPath: Position[];
  createdAt: string;
  lastMoveAt: string;
}

export interface GameWithPlayerInfo {
  gameState: OnlineGameState;
  yourColor: Player.BLUE | Player.RED;
  isYourTurn: boolean;
}

// Helper functions
export function generateGameId(): string {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  let result = '';
  for (let i = 0; i < 6; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
}

export function generatePlayerId(): string {
  return crypto.randomUUID();
}

export function randomColor(): Player.BLUE | Player.RED {
  return Math.random() < 0.5 ? Player.BLUE : Player.RED;
}