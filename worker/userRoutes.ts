import { Hono } from "hono";
import { Env } from './core-utils';
import { createEmptyBoard, Player } from '../src/lib/hex-logic';
import {
  OnlineGameState,
  generateGameId,
  randomColor,
} from './gameTypes';

function getStub(env: Env, gameId: string) {
    const doId = env.GAME_ROOMS.idFromName(gameId);
    return env.GAME_ROOMS.get(doId);
}

export function userRoutes(app: Hono<{ Bindings: Env }>) {
    // Add more routes like this. **DO NOT MODIFY CORS OR OVERRIDE ERROR HANDLERS**
    app.get('/api/test', (c) => c.json({ success: true, data: { name: 'this works' }}));

    // WebSocket upgrade -- connects to the per-game Durable Object
    app.get('/api/games/:id/ws', async (c) => {
        const upgradeHeader = c.req.header('Upgrade');
        if (!upgradeHeader || upgradeHeader !== 'websocket') {
            return c.text('Expected Upgrade: websocket', 426);
        }

        const gameId = c.req.param('id');
        const playerId = c.req.query('playerId');
        if (!playerId) {
            return c.text('playerId query param required', 400);
        }

        const stub = getStub(c.env, gameId);

        return stub.fetch(new Request(c.req.url, {
            headers: c.req.raw.headers,
        }));
    });

    // Create new online game
    app.post('/api/games/create', async (c) => {
        const body = await c.req.json().catch(() => ({}));
        const playerId = typeof body.playerId === 'string' ? body.playerId.trim() : '';
        if (!playerId) {
            return c.json({ success: false, error: 'playerId required' }, 400);
        }

        const gameId = generateGameId();
        const playerColor = randomColor();

        const game: OnlineGameState = {
            id: gameId,
            board: createEmptyBoard(),
            currentPlayer: Player.BLUE,
            player1Id: playerId,
            player1Color: playerColor,
            player2Color: playerColor === Player.BLUE ? Player.RED : Player.BLUE,
            gameState: 'waiting',
            winner: null,
            winningPath: [],
            createdAt: new Date().toISOString(),
            lastMoveAt: new Date().toISOString(),
        };

        const stub = getStub(c.env, gameId);
        await stub.fetch(new Request('https://do/init', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ game }),
        }));

        const shareLink = `${new URL(c.req.url).origin}/?game=${gameId}`;

        return c.json({
            success: true,
            data: {
                gameId,
                playerId,
                playerColor,
                shareLink,
            },
        });
    });

    // Join existing game — forwarded to Durable Object
    app.post('/api/games/:id/join', async (c) => {
        const gameId = c.req.param('id');
        const body = await c.req.json().catch(() => ({}));
        const playerId = typeof body.playerId === 'string' ? body.playerId.trim() : '';
        if (!playerId) {
            return c.json({ success: false, error: 'playerId required' }, 400);
        }

        const stub = getStub(c.env, gameId);
        const doRes = await stub.fetch(new Request('https://do/join', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ playerId }),
        }));

        return new Response(doRes.body, {
            status: doRes.status,
            headers: { 'Content-Type': 'application/json' },
        });
    });

    // Get game state — forwarded to Durable Object for freshest data
    app.get('/api/games/:id', async (c) => {
        const gameId = c.req.param('id');
        const playerId = c.req.query('playerId');

        if (!playerId) {
            return c.json({ success: false, error: 'playerId required' }, 400);
        }

        const stub = getStub(c.env, gameId);
        const doRes = await stub.fetch(
            new Request(`https://do/state?playerId=${encodeURIComponent(playerId)}`)
        );

        return new Response(doRes.body, {
            status: doRes.status,
            headers: { 'Content-Type': 'application/json' },
        });
    });

    // Make a move — forwarded to Durable Object
    app.post('/api/games/:id/move', async (c) => {
        const gameId = c.req.param('id');
        const { playerId, row, col } = await c.req.json();

        if (!playerId || row === undefined || col === undefined) {
            return c.json({ success: false, error: 'Missing required fields' }, 400);
        }

        const stub = getStub(c.env, gameId);
        const doRes = await stub.fetch(new Request('https://do/move', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ playerId, row, col }),
        }));

        return new Response(doRes.body, {
            status: doRes.status,
            headers: { 'Content-Type': 'application/json' },
        });
    });

    // Forfeit — forwarded to Durable Object
    app.post('/api/games/:id/forfeit', async (c) => {
        const gameId = c.req.param('id');
        const body = await c.req.json().catch(() => ({}));
        const playerId = typeof body.playerId === 'string' ? body.playerId.trim() : '';

        if (!playerId) {
            return c.json({ success: false, error: 'playerId required' }, 400);
        }

        const stub = getStub(c.env, gameId);
        const doRes = await stub.fetch(new Request('https://do/forfeit', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ playerId }),
        }));

        return new Response(doRes.body, {
            status: doRes.status,
            headers: { 'Content-Type': 'application/json' },
        });
    });
}
