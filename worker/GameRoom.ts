import { DurableObject } from 'cloudflare:workers';
import { checkWin, Player } from '../src/lib/hex-logic';
import type { OnlineGameState } from './gameTypes';
import type { Env } from './core-utils';

interface SessionAttachment {
  gameId: string;
  playerId: string;
  playerColor: Player.BLUE | Player.RED;
}

type ClientMessage =
  | { type: 'move'; row: number; col: number }
  | { type: 'forfeit' };

type ServerMessage =
  | { type: 'state'; gameState: OnlineGameState; yourColor: Player.BLUE | Player.RED; isYourTurn: boolean }
  | { type: 'error'; message: string }
  | { type: 'opponent_connected' }
  | { type: 'opponent_disconnected' };

interface ProcessResult {
  success: boolean;
  error?: string;
  data?: Record<string, unknown>;
}

const GAME_TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 days

export class GameRoom extends DurableObject<Env> {
  private sessions: Map<WebSocket, SessionAttachment>;
  private cachedGame: OnlineGameState | null = null;

  constructor(ctx: DurableObjectState, env: Env) {
    super(ctx, env);
    this.sessions = new Map();

    this.ctx.getWebSockets().forEach((ws) => {
      const attachment = ws.deserializeAttachment() as SessionAttachment | null;
      if (attachment) {
        this.sessions.set(ws, attachment);
      }
    });

    this.ctx.setWebSocketAutoResponse(
      new WebSocketRequestResponsePair('ping', 'pong'),
    );
  }

  // ── Routing ──────────────────────────────────────────────────────────

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const upgradeHeader = request.headers.get('Upgrade');

    if (upgradeHeader === 'websocket') {
      return this.handleWsUpgrade(url);
    }

    const action = url.pathname.replace(/^\//, '');

    if (request.method === 'POST') {
      const body = await request.json() as Record<string, unknown>;

      switch (action) {
        case 'init': {
          await this.persistGame(body.game as OnlineGameState);
          return jsonResponse({ success: true });
        }
        case 'join': {
          const result = await this.processJoin(body.playerId as string);
          return jsonResponse(result, result.success ? 200 : 400);
        }
        case 'move': {
          const result = await this.processMove(
            body.playerId as string,
            body.row as number,
            body.col as number,
          );
          return jsonResponse(result, result.success ? 200 : 400);
        }
        case 'forfeit': {
          const result = await this.processForfeit(body.playerId as string);
          return jsonResponse(result, result.success ? 200 : 400);
        }
        default:
          return jsonResponse({ success: false, error: 'Unknown action' }, 400);
      }
    }

    if (request.method === 'GET' && action === 'state') {
      const playerId = url.searchParams.get('playerId');
      if (!playerId) {
        return jsonResponse({ success: false, error: 'playerId required' }, 400);
      }
      return this.handleGetState(playerId);
    }

    return new Response('Method not allowed', { status: 405 });
  }

  async alarm() {
    if (this.ctx.getWebSockets().length > 0) {
      await this.ctx.storage.setAlarm(Date.now() + GAME_TTL_MS);
      return;
    }
    this.cachedGame = null;
    await this.ctx.storage.deleteAll();
  }

  // ── WebSocket lifecycle ──────────────────────────────────────────────

  private async handleWsUpgrade(url: URL): Promise<Response> {
    const playerId = url.searchParams.get('playerId');
    if (!playerId) {
      return new Response('playerId query param required', { status: 400 });
    }

    const game = await this.loadGame();
    if (!game) {
      return new Response('Game not found', { status: 404 });
    }

    const isPlayer1 = game.player1Id === playerId;
    const isPlayer2 = game.player2Id === playerId;

    if (!isPlayer1 && !isPlayer2) {
      return new Response('Not a player in this game', { status: 403 });
    }

    const yourColor = isPlayer1 ? game.player1Color : game.player2Color;

    const webSocketPair = new WebSocketPair();
    const [client, server] = Object.values(webSocketPair);

    const attachment: SessionAttachment = {
      gameId: game.id,
      playerId,
      playerColor: yourColor,
    };
    this.ctx.acceptWebSocket(server);
    server.serializeAttachment(attachment);
    this.sessions.set(server, attachment);

    this.broadcast({ type: 'opponent_connected' }, server);

    if (game.player2Id) {
      this.broadcastState(game);
    } else {
      server.send(JSON.stringify({
        type: 'state',
        gameState: game,
        yourColor,
        isYourTurn: game.currentPlayer === yourColor,
      } satisfies ServerMessage));
    }

    return new Response(null, { status: 101, webSocket: client });
  }

  async webSocketMessage(ws: WebSocket, message: ArrayBuffer | string) {
    if (typeof message !== 'string') return;

    const session = this.sessions.get(ws);
    if (!session) {
      ws.send(JSON.stringify({ type: 'error', message: 'Unknown session' } satisfies ServerMessage));
      return;
    }

    let parsed: ClientMessage;
    try {
      parsed = JSON.parse(message);
    } catch {
      ws.send(JSON.stringify({ type: 'error', message: 'Invalid JSON' } satisfies ServerMessage));
      return;
    }

    if (parsed.type === 'move') {
      const result = await this.processMove(session.playerId, parsed.row, parsed.col);
      if (!result.success) {
        this.sendError(ws, result.error!);
      }
    } else if (parsed.type === 'forfeit') {
      const result = await this.processForfeit(session.playerId);
      if (!result.success) {
        this.sendError(ws, result.error!);
      }
    }
  }

  async webSocketClose(ws: WebSocket, code: number, reason: string, _wasClean: boolean) {
    ws.close(code, reason);
    this.sessions.delete(ws);
    this.broadcast({ type: 'opponent_disconnected' });
  }

  // ── HTTP handler ─────────────────────────────────────────────────────

  private async handleGetState(playerId: string): Promise<Response> {
    const game = await this.loadGame();
    if (!game) {
      return jsonResponse({ success: false, error: 'Game not found' }, 404);
    }

    const isPlayer1 = game.player1Id === playerId;
    const isPlayer2 = game.player2Id === playerId;

    if (!isPlayer1 && !isPlayer2) {
      return jsonResponse({ success: false, error: 'Not a player in this game' }, 403);
    }

    const yourColor = isPlayer1 ? game.player1Color : game.player2Color;
    const isYourTurn = game.currentPlayer === yourColor;

    return jsonResponse({
      success: true,
      data: { gameState: game, yourColor, isYourTurn },
    });
  }

  // ── Shared game logic (used by both WS and HTTP paths) ──────────────

  private async processJoin(playerId: string): Promise<ProcessResult> {
    const game = await this.loadGame();
    if (!game) return { success: false, error: 'Game not found' };

    if (game.player2Id) return { success: false, error: 'Game already has 2 players' };
    if (game.player1Id === playerId) return { success: false, error: 'Player already in game' };

    game.player2Id = playerId;
    game.gameState = 'playing';
    game.lastMoveAt = new Date().toISOString();

    await this.persistGame(game);
    this.broadcastState(game);

    return {
      success: true,
      data: {
        playerId,
        playerColor: game.player2Color as unknown as string,
        gameState: game as unknown as Record<string, unknown>,
      },
    };
  }

  private async processMove(playerId: string, row: number, col: number): Promise<ProcessResult> {
    const game = await this.loadGame();
    if (!game) return { success: false, error: 'Game not found' };

    const isPlayer1 = game.player1Id === playerId;
    const isPlayer2 = game.player2Id === playerId;
    if (!isPlayer1 && !isPlayer2) return { success: false, error: 'Not a player in this game' };

    const yourColor = isPlayer1 ? game.player1Color : game.player2Color;

    if (game.currentPlayer !== yourColor) return { success: false, error: 'Not your turn' };
    if (game.gameState !== 'playing') return { success: false, error: 'Game is not in playing state' };
    if (row < 0 || row >= game.board.length || col < 0 || col >= game.board[0].length) {
      return { success: false, error: 'Invalid position' };
    }
    if (game.board[row][col] !== Player.EMPTY) return { success: false, error: 'Cell already occupied' };

    game.board[row][col] = yourColor;
    game.lastMoveAt = new Date().toISOString();

    const winningPath = checkWin(game.board, yourColor);
    if (winningPath) {
      game.gameState = 'won';
      game.winner = yourColor;
      game.winningPath = winningPath;
    } else {
      game.currentPlayer = game.currentPlayer === Player.BLUE ? Player.RED : Player.BLUE;
    }

    await this.persistGame(game);
    this.broadcastState(game);

    return { success: true, data: { gameState: game as unknown as Record<string, unknown> } };
  }

  private async processForfeit(playerId: string): Promise<ProcessResult> {
    const game = await this.loadGame();
    if (!game) return { success: false, error: 'Game not found' };
    if (game.gameState !== 'playing') return { success: false, error: 'Game is not in playing state' };

    const isPlayer1 = game.player1Id === playerId;
    const isPlayer2 = game.player2Id === playerId;
    if (!isPlayer1 && !isPlayer2) return { success: false, error: 'Not a player in this game' };

    const yourColor = isPlayer1 ? game.player1Color : game.player2Color;
    const opponentColor = yourColor === Player.BLUE ? Player.RED : Player.BLUE;

    game.gameState = 'won';
    game.winner = opponentColor;
    game.winningPath = [];

    await this.persistGame(game);
    this.broadcastState(game);

    return { success: true, data: { gameState: game as unknown as Record<string, unknown> } };
  }

  // ── State management ─────────────────────────────────────────────────

  private async loadGame(): Promise<OnlineGameState | null> {
    if (this.cachedGame) {
      return this.cachedGame;
    }
    const game = await this.ctx.storage.get<OnlineGameState>('game');
    if (game) {
      this.cachedGame = game;
    }
    return game ?? null;
  }

  private async persistGame(game: OnlineGameState): Promise<void> {
    this.cachedGame = game;
    await this.ctx.storage.put('game', game);
    await this.ctx.storage.setAlarm(Date.now() + GAME_TTL_MS);
  }

  // ── Messaging ────────────────────────────────────────────────────────

  private sendError(ws: WebSocket, message: string) {
    ws.send(JSON.stringify({ type: 'error', message } satisfies ServerMessage));
  }

  private broadcastState(game: OnlineGameState) {
    this.sessions.forEach((attachment, connectedWs) => {
      const msg: ServerMessage = {
        type: 'state',
        gameState: game,
        yourColor: attachment.playerColor,
        isYourTurn: game.currentPlayer === attachment.playerColor,
      };
      connectedWs.send(JSON.stringify(msg));
    });
  }

  private broadcast(msg: ServerMessage, exclude?: WebSocket) {
    const data = JSON.stringify(msg);
    this.sessions.forEach((_attachment, connectedWs) => {
      if (connectedWs !== exclude) {
        connectedWs.send(data);
      }
    });
  }
}

function jsonResponse(data: unknown, status = 200): Response {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
