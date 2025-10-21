import { create } from 'zustand';
import {
  Player,
  Board,
  GameState,
  Position,
  createEmptyBoard,
  checkWin,
} from '@/lib/hex-logic';
interface GameStore {
  board: Board;
  currentPlayer: Player.BLUE | Player.RED;
  gameState: GameState;
  winner: Player | null;
  winningPath: Position[];
  makeMove: (row: number, col: number) => void;
  resetGame: () => void;
}
const initialState = {
  board: createEmptyBoard(),
  currentPlayer: Player.BLUE as Player.BLUE | Player.RED,
  gameState: 'playing' as GameState,
  winner: null,
  winningPath: [],
};
export const useGameStore = create<GameStore>((set, get) => ({
  ...initialState,
  makeMove: (row, col) => {
    const { board, currentPlayer, gameState } = get();
    if (gameState !== 'playing' || board[row][col] !== Player.EMPTY) {
      return;
    }
    const newBoard = board.map((r) => [...r]);
    newBoard[row][col] = currentPlayer;
    const winningPath = checkWin(newBoard, currentPlayer);
    if (winningPath) {
      set({
        board: newBoard,
        gameState: 'won',
        winner: currentPlayer,
        winningPath,
      });
    } else {
      set({
        board: newBoard,
        currentPlayer:
          currentPlayer === Player.BLUE ? Player.RED : Player.BLUE,
      });
    }
  },
  resetGame: () => {
    set(initialState);
  },
}));