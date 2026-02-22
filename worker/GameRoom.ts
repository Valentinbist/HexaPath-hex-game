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
  | { type: 'move'; row: number; col: number };

type ServerMessage =
  | { type: 'state'; gameState: OnlineGameState; yourColor: Player.BLUE | Player.RED; isYourTurn: boolean }
  | { type: 'error'; message: string }
  | { type: 'opponent_connected' }
  | { type: 'opponent_disconnected' };

export class GameRoom extends DurableObject<Env> {
  private sessions: Map<WebSocket, SessionAttachment>;

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

  async fetch(request: Request): Promise<Response> {
    const url = new URL(request.url);
    const playerId = url.searchParams.get('playerId');

    if (!playerId) {
      return new Response('playerId query param required', { status: 400 });
    }

    const upgradeHeader = request.headers.get('Upgrade');
    if (!upgradeHeader || upgradeHeader !== 'websocket') {
      return new Response('Expected Upgrade: websocket', { status: 426 });
    }

    const gameId = url.searchParams.get('gameId');
    if (!gameId) {
      return new Response('gameId query param required', { status: 400 });
    }

    const gameData = await this.env.GAMES_KV.get(`game:${gameId}`);
    if (!gameData) {
      return new Response('Game not found', { status: 404 });
    }

    const game: OnlineGameState = JSON.parse(gameData);

    const isPlayer1 = game.player1Id === playerId;
    const isPlayer2 = game.player2Id === playerId;

    if (!isPlayer1 && !isPlayer2) {
      return new Response('Not a player in this game', { status: 403 });
    }

    const yourColor = isPlayer1 ? game.player1Color : game.player2Color;

    const webSocketPair = new WebSocketPair();
    const [client, server] = Object.values(webSocketPair);

    const attachment: SessionAttachment = { gameId, playerId, playerColor: yourColor };
    this.ctx.acceptWebSocket(server);
    server.serializeAttachment(attachment);
    this.sessions.set(server, attachment);

    this.broadcast({ type: 'opponent_connected' }, server);

    server.send(JSON.stringify({
      type: 'state',
      gameState: game,
      yourColor,
      isYourTurn: game.currentPlayer === yourColor,
    } satisfies ServerMessage));

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
      await this.handleMove(ws, session, parsed.row, parsed.col);
    }
  }

  async webSocketClose(ws: WebSocket, code: number, reason: string, _wasClean: boolean) {
    ws.close(code, reason);
    this.sessions.delete(ws);
    this.broadcast({ type: 'opponent_disconnected' });
  }

  private async handleMove(ws: WebSocket, session: SessionAttachment, row: number, col: number) {
    const gameId = this.getGameId();
    if (!gameId) {
      this.sendError(ws, 'No game associated with this room');
      return;
    }

    const gameData = await this.env.GAMES_KV.get(`game:${gameId}`);
    if (!gameData) {
      this.sendError(ws, 'Game not found');
      return;
    }

    const game: OnlineGameState = JSON.parse(gameData);

    if (game.currentPlayer !== session.playerColor) {
      this.sendError(ws, 'Not your turn');
      return;
    }

    if (game.gameState !== 'playing') {
      this.sendError(ws, 'Game is not in playing state');
      return;
    }

    if (row < 0 || row >= game.board.length || col < 0 || col >= game.board[0].length) {
      this.sendError(ws, 'Invalid position');
      return;
    }

    if (game.board[row][col] !== Player.EMPTY) {
      this.sendError(ws, 'Cell already occupied');
      return;
    }

    game.board[row][col] = session.playerColor;
    game.lastMoveAt = new Date().toISOString();

    const winningPath = checkWin(game.board, session.playerColor);
    if (winningPath) {
      game.gameState = 'won';
      game.winner = session.playerColor;
      game.winningPath = winningPath;
    } else {
      game.currentPlayer = game.currentPlayer === Player.BLUE ? Player.RED : Player.BLUE;
    }

    await this.env.GAMES_KV.put(
      `game:${gameId}`,
      JSON.stringify(game),
      { expirationTtl: 604800 },
    );

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

  private getGameId(): string | null {
    for (const [, attachment] of this.sessions) {
      return attachment.gameId;
    }
    for (const ws of this.ctx.getWebSockets()) {
      const attachment = ws.deserializeAttachment() as SessionAttachment | null;
      if (attachment?.gameId) return attachment.gameId;
    }
    return null;
  }

  private sendError(ws: WebSocket, message: string) {
    ws.send(JSON.stringify({ type: 'error', message } satisfies ServerMessage));
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
