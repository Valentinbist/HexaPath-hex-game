import { Hono } from "hono";
import { Env } from './core-utils';
import { createEmptyBoard, checkWin, Player } from '../src/lib/hex-logic';
import {
  OnlineGameState,
  generateGameId,
  generatePlayerId,
  randomColor,
} from './gameTypes';

export function userRoutes(app: Hono<{ Bindings: Env }>) {
    // Add more routes like this. **DO NOT MODIFY CORS OR OVERRIDE ERROR HANDLERS**
    app.get('/api/test', (c) => c.json({ success: true, data: { name: 'this works' }}));

    // Create new online game
    app.post('/api/games/create', async (c) => {
        const gameId = generateGameId();
        const playerId = generatePlayerId();
        const playerColor = randomColor();

        const game: OnlineGameState = {
            id: gameId,
            board: createEmptyBoard(),
            currentPlayer: Player.BLUE, // Blue always starts
            player1Id: playerId,
            player1Color: playerColor,
            player2Color: playerColor === Player.BLUE ? Player.RED : Player.BLUE,
            gameState: 'waiting',
            winner: null,
            winningPath: [],
            createdAt: new Date().toISOString(),
            lastMoveAt: new Date().toISOString(),
        };

        // Store in KV with 7-day TTL (604800 seconds)
        await c.env.GAMES_KV.put(
            `game:${gameId}`,
            JSON.stringify(game),
            { expirationTtl: 604800 }
        );

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

    // Join existing game
    app.post('/api/games/:id/join', async (c) => {
        const gameId = c.req.param('id');
        const gameData = await c.env.GAMES_KV.get(`game:${gameId}`);

        if (!gameData) {
            return c.json({ success: false, error: 'Game not found' }, 404);
        }

        const game: OnlineGameState = JSON.parse(gameData);

        if (game.player2Id) {
            return c.json({ success: false, error: 'Game already has 2 players' }, 400);
        }

        const playerId = generatePlayerId();
        game.player2Id = playerId;
        game.gameState = 'playing';
        game.lastMoveAt = new Date().toISOString();

        await c.env.GAMES_KV.put(
            `game:${gameId}`,
            JSON.stringify(game),
            { expirationTtl: 604800 }
        );

        return c.json({
            success: true,
            data: {
                playerId,
                playerColor: game.player2Color,
                gameState: game,
            },
        });
    });

    // Get game state
    app.get('/api/games/:id', async (c) => {
        const gameId = c.req.param('id');
        const playerId = c.req.query('playerId');

        if (!playerId) {
            return c.json({ success: false, error: 'playerId required' }, 400);
        }

        const gameData = await c.env.GAMES_KV.get(`game:${gameId}`);

        if (!gameData) {
            return c.json({ success: false, error: 'Game not found' }, 404);
        }

        const game: OnlineGameState = JSON.parse(gameData);

        const isPlayer1 = game.player1Id === playerId;
        const isPlayer2 = game.player2Id === playerId;

        if (!isPlayer1 && !isPlayer2) {
            return c.json({ success: false, error: 'Not a player in this game' }, 403);
        }

        const yourColor = isPlayer1 ? game.player1Color : game.player2Color;
        const isYourTurn = game.currentPlayer === yourColor;

        return c.json({
            success: true,
            data: {
                gameState: game,
                yourColor,
                isYourTurn,
            },
        });
    });

    // Make a move
    app.post('/api/games/:id/move', async (c) => {
        const gameId = c.req.param('id');
        const { playerId, row, col } = await c.req.json();

        if (!playerId || row === undefined || col === undefined) {
            return c.json({ success: false, error: 'Missing required fields' }, 400);
        }

        const gameData = await c.env.GAMES_KV.get(`game:${gameId}`);

        if (!gameData) {
            return c.json({ success: false, error: 'Game not found' }, 404);
        }

        const game: OnlineGameState = JSON.parse(gameData);

        // Validate player
        const isPlayer1 = game.player1Id === playerId;
        const isPlayer2 = game.player2Id === playerId;

        if (!isPlayer1 && !isPlayer2) {
            return c.json({ success: false, error: 'Not a player in this game' }, 403);
        }

        const yourColor = isPlayer1 ? game.player1Color : game.player2Color;

        // Validate turn
        if (game.currentPlayer !== yourColor) {
            return c.json({ success: false, error: 'Not your turn' }, 400);
        }

        if (game.gameState !== 'playing') {
            return c.json({ success: false, error: 'Game is not in playing state' }, 400);
        }

        // Validate move
        if (game.board[row][col] !== Player.EMPTY) {
            return c.json({ success: false, error: 'Cell already occupied' }, 400);
        }

        // Make move
        game.board[row][col] = yourColor;
        game.lastMoveAt = new Date().toISOString();

        // Check for win
        const winningPath = checkWin(game.board, yourColor);
        if (winningPath) {
            game.gameState = 'won';
            game.winner = yourColor;
            game.winningPath = winningPath;
        } else {
            // Switch turn
            game.currentPlayer = game.currentPlayer === Player.BLUE ? Player.RED : Player.BLUE;
        }

        // Save updated game
        await c.env.GAMES_KV.put(
            `game:${gameId}`,
            JSON.stringify(game),
            { expirationTtl: 604800 }
        );

        return c.json({
            success: true,
            data: {
                gameState: game,
            },
        });
    });
}
