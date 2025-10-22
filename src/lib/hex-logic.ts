export const BOARD_SIZE = 11;
export enum Player {
  EMPTY = 0,
  BLUE = 1,
  RED = 2,
}
export type Board = Player[][];
export type GameState = 'playing' | 'won';
export type Position = { row: number; col: number };
export const createEmptyBoard = (): Board =>
  Array.from({ length: BOARD_SIZE }, () =>
    Array(BOARD_SIZE).fill(Player.EMPTY)
  );
// Neighbor finding for a rhombus (skewed) grid layout
const getNeighbors = (row: number, col: number): Position[] => {
  const neighbors: Position[] = [];
  const candidates = [
    { row: row - 1, col: col },     // Top
    { row: row - 1, col: col + 1 }, // Top-Right
    { row: row, col: col + 1 },     // Right
    { row: row + 1, col: col },     // Bottom
    { row: row + 1, col: col - 1 }, // Bottom-Left
    { row: row, col: col - 1 },     // Left
  ];
  for (const pos of candidates) {
    if (
      pos.row >= 0 &&
      pos.row < BOARD_SIZE &&
      pos.col >= 0 &&
      pos.col < BOARD_SIZE
    ) {
      neighbors.push(pos);
    }
  }
  return neighbors;
};
type Edge = 'topLeft' | 'top' | 'topRight' | 'bottomRight' | 'bottom' | 'bottomLeft';
type BorderPlayer = 'blue' | 'red';
// Mirrors the rim rendering so win detection uses the same edge ownership.
const edgeOwnersForCell = (row: number, col: number): Partial<Record<Edge, BorderPlayer>> => {
  const owners: Partial<Record<Edge, BorderPlayer>> = {};
  const isTopRow = row === 0;
  const isBottomRow = row === BOARD_SIZE - 1;
  const isLeftCol = col === 0;
  const isRightCol = col === BOARD_SIZE - 1;
  if (isTopRow) {
    owners.top = isLeftCol ? 'red' : 'blue';
    owners.topRight = 'blue';
  }
  if (isRightCol) {
    owners.bottomRight = 'red';
    if (!isBottomRow) {
      owners.bottom = 'red';
    }
  }
  if (isBottomRow) {
    owners.bottom = isRightCol ? 'red' : 'blue';
    owners.bottomLeft = 'blue';
  }
  if (isLeftCol) {
    owners.topLeft = 'red';
    if (!isTopRow) {
      owners.top = 'red';
    }
  }
  return owners;
};
const playerEdgeConfig: Record<Player.BLUE | Player.RED, {
  color: BorderPlayer;
  startEdges: Edge[];
  goalEdges: Edge[];
}> = {
  [Player.BLUE]: {
    color: 'blue',
    startEdges: ['top', 'topRight'],
    goalEdges: ['bottom', 'bottomLeft'],
  },
  [Player.RED]: {
    color: 'red',
    startEdges: ['top', 'topLeft'],
    goalEdges: ['bottom', 'bottomRight'],
  },
};
const touchesPlayerEdges = (
  row: number,
  col: number,
  edges: Edge[],
  color: BorderPlayer
) => {
  const owners = edgeOwnersForCell(row, col);
  return edges.some((edge) => owners[edge] === color);
};
export const checkWin = (board: Board, player: Player): Position[] | null => {
  if (player === Player.EMPTY) {
    return null;
  }
  const visited = new Set<string>();
  const queue: Position[][] = [];
  const { color, startEdges, goalEdges } = playerEdgeConfig[player as Player.BLUE | Player.RED];
  for (let r = 0; r < BOARD_SIZE; r++) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (
        board[r][c] === player &&
        touchesPlayerEdges(r, c, startEdges, color)
      ) {
        const key = `${r},${c}`;
        visited.add(key);
        queue.push([{ row: r, col: c }]);
      }
    }
  }
  while (queue.length > 0) {
    const path = queue.shift()!;
    const lastPos = path[path.length - 1];

    // Check for win condition
    if (touchesPlayerEdges(lastPos.row, lastPos.col, goalEdges, color)) {
      return path;
    }
    const neighbors = getNeighbors(lastPos.row, lastPos.col);
    for (const neighbor of neighbors) {
      const key = `${neighbor.row},${neighbor.col}`;
      if (
        !visited.has(key) &&
        board[neighbor.row][neighbor.col] === player
      ) {
        visited.add(key);
        const newPath = [...path, neighbor];
        queue.push(newPath);
      }
    }
  }
  return null;
};
