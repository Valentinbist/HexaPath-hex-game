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
export const checkWin = (board: Board, player: Player): Position[] | null => {
  const visited = new Set<string>();
  const queue: Position[][] = [];
  // Initialize queue with starting positions for the player
  if (player === Player.BLUE) {
    for (let c = 0; c < BOARD_SIZE; c++) {
      if (board[0][c] === player) {
        const path = [{ row: 0, col: c }];
        queue.push(path);
        visited.add(`0,${c}`);
      }
    }
  } else { // Player.RED
    for (let r = 0; r < BOARD_SIZE; r++) {
      if (board[r][0] === player) {
        const path = [{ row: r, col: 0 }];
        queue.push(path);
        visited.add(`${r},0`);
      }
    }
  }
  while (queue.length > 0) {
    const path = queue.shift()!;
    const lastPos = path[path.length - 1];
    // Check for win condition
    if (player === Player.BLUE && lastPos.row === BOARD_SIZE - 1) {
      return path;
    }
    if (player === Player.RED && lastPos.col === BOARD_SIZE - 1) {
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