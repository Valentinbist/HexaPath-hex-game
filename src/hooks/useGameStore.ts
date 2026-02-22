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

let ws: WebSocket | null = null;
let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
let reconnectAttempt = 0;
const MAX_RECONNECT_DELAY = 5000;

interface GameStore {
  board: Board;
  currentPlayer: Player.BLUE | Player.RED;
  gameState: GameState | 'waiting';
  winner: Player | null;
  winningPath: Position[];

  gameMode: GameMode;
  gameId: string | null;
  playerId: string | null;
  playerColor: Player.BLUE | Player.RED | null;
  isYourTurn: boolean;
  opponentJoined: boolean;
  shareLink: string | null;
  wsConnected: boolean;

  makeMove: (row: number, col: number) => Promise<void>;
  resetGame: () => void;
  setLocalMode: () => void;
  createOnlineGame: () => Promise<{ gameId: string; shareLink: string }>;
  joinOnlineGame: (gameId: string) => Promise<void>;
  loadOnlineGame: (gameId: string, playerId: string) => Promise<void>;
  connectWebSocket: () => void;
  disconnectWebSocket: () => void;
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
  wsConnected: false,
};

function clearReconnect() {
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  reconnectAttempt = 0;
}

export const useGameStore = create<GameStore>((set, get) => ({
  ...initialState,

  makeMove: async (row, col) => {
    const { gameMode, board, currentPlayer, gameState, gameId, playerId, isYourTurn } = get();

    if (gameState !== 'playing' || board[row][col] !== Player.EMPTY) {
      return;
    }

    if (gameMode === 'online') {
      if (!isYourTurn) return;

      if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'move', row, col }));
        return;
      }

      // Fallback to REST if WebSocket isn't connected
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
    get().disconnectWebSocket();
    set(initialState);
  },

  setLocalMode: () => {
    get().disconnectWebSocket();
    set({ ...initialState, gameMode: 'local' });
  },

  connectWebSocket: () => {
    const { gameId, playerId, gameMode } = get();
    if (gameMode !== 'online' || !gameId || !playerId) return;

    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    clearReconnect();

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const url = `${protocol}//${window.location.host}/api/games/${gameId}/ws?playerId=${playerId}`;

    const socket = new WebSocket(url);
    ws = socket;

    socket.onopen = () => {
      reconnectAttempt = 0;
      set({ wsConnected: true });
    };

    socket.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);

        if (msg.type === 'state') {
          set({
            board: msg.gameState.board,
            currentPlayer: msg.gameState.currentPlayer,
            gameState: msg.gameState.gameState,
            winner: msg.gameState.winner,
            winningPath: msg.gameState.winningPath,
            isYourTurn: msg.isYourTurn,
            opponentJoined: !!msg.gameState.player2Id,
          });
        } else if (msg.type === 'opponent_connected') {
          set({ opponentJoined: true });
        } else if (msg.type === 'opponent_disconnected') {
          // Opponent disconnected but game is still active
        } else if (msg.type === 'error') {
          console.error('Game error:', msg.message);
        }
      } catch {
        // ignore non-JSON messages (e.g. pong)
      }
    };

    socket.onclose = () => {
      set({ wsConnected: false });
      if (ws !== socket) return;
      ws = null;

      const { gameMode: mode, gameState: state } = get();
      if (mode !== 'online' || state === 'won') return;

      const delay = Math.min(1000 * Math.pow(2, reconnectAttempt), MAX_RECONNECT_DELAY);
      reconnectAttempt++;
      reconnectTimer = setTimeout(() => {
        get().connectWebSocket();
      }, delay);
    };

    socket.onerror = () => {
      // onclose will fire after this, which handles reconnection
    };
  },

  disconnectWebSocket: () => {
    clearReconnect();
    if (ws) {
      const socket = ws;
      ws = null;
      socket.close();
    }
    set({ wsConnected: false });
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
          wsConnected: false,
        });

        localStorage.setItem(`game:${gameId}:playerId`, playerId);

        // Connect WebSocket after state is set
        setTimeout(() => get().connectWebSocket(), 0);

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
          wsConnected: false,
        });

        localStorage.setItem(`game:${gameId}:playerId`, playerId);

        setTimeout(() => get().connectWebSocket(), 0);
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
          wsConnected: false,
        });

        setTimeout(() => get().connectWebSocket(), 0);
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
