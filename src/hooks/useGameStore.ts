import { create } from 'zustand';
import {
  Player,
  Board,
  GameState,
  Position,
  createEmptyBoard,
  checkWin,
} from '@/lib/hex-logic';

type GameMode = 'local' | 'online';

interface GameStore {
  // Existing local state
  board: Board;
  currentPlayer: Player.BLUE | Player.RED;
  gameState: GameState | 'waiting';
  winner: Player | null;
  winningPath: Position[];
  
  // Online game state
  gameMode: GameMode;
  gameId: string | null;
  playerId: string | null;
  playerColor: Player.BLUE | Player.RED | null;
  isYourTurn: boolean;
  opponentJoined: boolean;
  shareLink: string | null;
  
  // Actions
  makeMove: (row: number, col: number) => Promise<void>;
  resetGame: () => void;
  setLocalMode: () => void;
  createOnlineGame: () => Promise<{ gameId: string; shareLink: string }>;
  joinOnlineGame: (gameId: string) => Promise<void>;
  loadOnlineGame: (gameId: string, playerId: string) => Promise<void>;
  syncOnlineGame: () => Promise<void>;
}

const initialState = {
  board: createEmptyBoard(),
  currentPlayer: Player.BLUE as Player.BLUE | Player.RED,
  gameState: 'playing' as GameState | 'waiting',
  winner: null,
  winningPath: [],
  gameMode: 'local' as GameMode,
  gameId: null,
  playerId: null,
  playerColor: null,
  isYourTurn: true,
  opponentJoined: false,
  shareLink: null,
};

export const useGameStore = create<GameStore>((set, get) => ({
  ...initialState,
  
  makeMove: async (row, col) => {
    const { gameMode, board, currentPlayer, gameState, gameId, playerId, isYourTurn } = get();
    
    if (gameState !== 'playing' || board[row][col] !== Player.EMPTY) {
      return;
    }
    
    if (gameMode === 'online') {
      if (!isYourTurn) {
        return; // Not your turn
      }
      
      // Make move via API
      try {
        const response = await fetch(`/api/games/${gameId}/move`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ playerId, row, col }),
        });
        
        const result = await response.json();
        
        if (result.success) {
          const game = result.data.gameState;
          set({
            board: game.board,
            currentPlayer: game.currentPlayer,
            gameState: game.gameState,
            winner: game.winner,
            winningPath: game.winningPath,
            isYourTurn: game.currentPlayer === get().playerColor,
          });
        }
      } catch (error) {
        console.error('Failed to make move:', error);
      }
    } else {
      // Local mode (existing logic)
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
          currentPlayer: currentPlayer === Player.BLUE ? Player.RED : Player.BLUE,
        });
      }
    }
  },
  
  resetGame: () => {
    set(initialState);
  },
  
  setLocalMode: () => {
    set({ ...initialState, gameMode: 'local' });
  },
  
  createOnlineGame: async () => {
    try {
      const response = await fetch('/api/games/create', {
        method: 'POST',
      });
      
      const result = await response.json();
      
      if (result.success) {
        const { gameId, playerId, playerColor, shareLink } = result.data;
        
        set({
          gameMode: 'online',
          gameId,
          playerId,
          playerColor,
          shareLink,
          gameState: 'waiting',
          isYourTurn: playerColor === Player.BLUE,
          opponentJoined: false,
          board: createEmptyBoard(),
          currentPlayer: Player.BLUE,
          winner: null,
          winningPath: [],
        });
        
        // Store playerId in localStorage for reconnection
        localStorage.setItem(`game:${gameId}:playerId`, playerId);
        
        return { gameId, shareLink };
      }
      
      throw new Error('Failed to create game');
    } catch (error) {
      console.error('Failed to create online game:', error);
      throw error;
    }
  },
  
  joinOnlineGame: async (gameId: string) => {
    try {
      const response = await fetch(`/api/games/${gameId}/join`, {
        method: 'POST',
      });
      
      const result = await response.json();
      
      if (result.success) {
        const { playerId, playerColor, gameState: game } = result.data;
        
        set({
          gameMode: 'online',
          gameId,
          playerId,
          playerColor,
          shareLink: `${window.location.origin}/?game=${gameId}`,
          board: game.board,
          currentPlayer: game.currentPlayer,
          gameState: game.gameState,
          winner: game.winner,
          winningPath: game.winningPath,
          isYourTurn: game.currentPlayer === playerColor,
          opponentJoined: true,
        });
        
        // Store playerId in localStorage
        localStorage.setItem(`game:${gameId}:playerId`, playerId);
      } else {
        const errorMessage = result.error || 'Failed to join game';
        throw new Error(errorMessage);
      }
    } catch (error) {
      if (error instanceof Error) {
        console.error('Failed to join game:', error.message);
      } else {
        console.error('Failed to join game:', error);
      }
      throw error;
    }
  },
  
  loadOnlineGame: async (gameId: string, playerId: string) => {
    try {
      const response = await fetch(`/api/games/${gameId}?playerId=${playerId}`);
      const result = await response.json();
      
      if (result.success) {
        const { gameState: game, yourColor, isYourTurn } = result.data;
        
        set({
          gameMode: 'online',
          gameId,
          playerId,
          playerColor: yourColor,
          shareLink: `${window.location.origin}/?game=${gameId}`,
          board: game.board,
          currentPlayer: game.currentPlayer,
          gameState: game.gameState,
          winner: game.winner,
          winningPath: game.winningPath,
          isYourTurn,
          opponentJoined: !!game.player2Id,
        });
      }
    } catch (error) {
      console.error('Failed to load game:', error);
      throw error;
    }
  },
  
  syncOnlineGame: async () => {
    const { gameId, playerId, gameMode } = get();
    
    if (gameMode !== 'online' || !gameId || !playerId) {
      return;
    }
    
    try {
      const response = await fetch(`/api/games/${gameId}?playerId=${playerId}`);
      const result = await response.json();
      
      if (result.success) {
        const { gameState: game, isYourTurn } = result.data;
        
        set({
          board: game.board,
          currentPlayer: game.currentPlayer,
          gameState: game.gameState,
          winner: game.winner,
          winningPath: game.winningPath,
          isYourTurn,
          opponentJoined: !!game.player2Id,
        });
      }
    } catch (error) {
      console.error('Failed to sync game:', error);
    }
  },
}));