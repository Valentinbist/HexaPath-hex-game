import React from 'react';
import { motion } from 'framer-motion';
import { Player, BOARD_SIZE } from '@/lib/hex-logic';
import { cn } from '@/lib/utils';
interface HexagonProps {
  row: number;
  col: number;
  player: Player;
  currentPlayer: Player;
  isWinning: boolean;
  isGameOver: boolean;
  onClick: (row: number, col: number) => void;
}
const HEX_WIDTH = 100;
const HEX_HEIGHT = 86.6; // sqrt(3)/2 * 100
const points = `
  ${HEX_WIDTH * 0.25},${HEX_HEIGHT * 0}
  ${HEX_WIDTH * 0.75},${HEX_HEIGHT * 0}
  ${HEX_WIDTH * 1},${HEX_HEIGHT * 0.5}
  ${HEX_WIDTH * 0.75},${HEX_HEIGHT * 1}
  ${HEX_WIDTH * 0.25},${HEX_HEIGHT * 1}
  ${HEX_WIDTH * 0},${HEX_HEIGHT * 0.5}
`;
const playerColors = {
  [Player.EMPTY]: 'fill-gray-200 dark:fill-gray-700',
  [Player.BLUE]: 'fill-player-blue',
  [Player.RED]: 'fill-player-red',
};
const hoverPlayerColors = {
  [Player.BLUE]: 'hover:fill-player-blue/50',
  [Player.RED]: 'hover:fill-player-red/50',
};
const edges = {
  topLeft: `M ${HEX_WIDTH * 0} ${HEX_HEIGHT * 0.5} L ${HEX_WIDTH * 0.25} ${HEX_HEIGHT * 0}`,
  top: `M ${HEX_WIDTH * 0.25} ${HEX_HEIGHT * 0} L ${HEX_WIDTH * 0.75} ${HEX_HEIGHT * 0}`,
  topRight: `M ${HEX_WIDTH * 0.75} ${HEX_HEIGHT * 0} L ${HEX_WIDTH * 1} ${HEX_HEIGHT * 0.5}`,
  bottomRight: `M ${HEX_WIDTH * 1} ${HEX_HEIGHT * 0.5} L ${HEX_WIDTH * 0.75} ${HEX_HEIGHT * 1}`,
  bottom: `M ${HEX_WIDTH * 0.75} ${HEX_HEIGHT * 1} L ${HEX_WIDTH * 0.25} ${HEX_HEIGHT * 1}`,
  bottomLeft: `M ${HEX_WIDTH * 0.25} ${HEX_HEIGHT * 1} L ${HEX_WIDTH * 0} ${HEX_HEIGHT * 0.5}`,
};
type BorderPlayer = 'blue' | 'red';
type BorderSegment = { edge: keyof typeof edges; player: BorderPlayer };
const borderConfig: Array<{
  edge: keyof typeof edges;
  offset: [number, number];
  getPlayer: (row: number, col: number) => BorderPlayer | null;
}> = [
  {
    edge: 'top',
    offset: [-1, 0],
    getPlayer: () => 'blue',
  },
  {
    edge: 'topRight',
    offset: [-1, 1],
    getPlayer: (row, col) =>
      row === 0 ? 'blue' : col === BOARD_SIZE - 1 ? 'red' : null,
  },
  {
    edge: 'bottomRight',
    offset: [0, 1],
    getPlayer: () => 'red',
  },
  {
    edge: 'bottom',
    offset: [1, 0],
    getPlayer: () => 'blue',
  },
  {
    edge: 'bottomLeft',
    offset: [1, -1],
    getPlayer: (row, col) =>
      row === BOARD_SIZE - 1 ? 'blue' : col === 0 ? 'red' : null,
  },
  {
    edge: 'topLeft',
    offset: [0, -1],
    getPlayer: () => 'red',
  },
];
const BorderPath = ({ d, player }: { d: string; player: 'blue' | 'red' }) => (
  <path
    d={d}
    className={cn(player === 'blue' ? 'stroke-player-blue' : 'stroke-player-red')}
    strokeWidth="8"
    strokeLinecap="round"
  />
);
export const Hexagon = React.memo(
  ({
    row,
    col,
    player,
    currentPlayer,
    isWinning,
    isGameOver,
    onClick,
  }: HexagonProps) => {
    const handleClick = () => {
      if (player === Player.EMPTY && !isGameOver) {
        onClick(row, col);
      }
    };
    const isClickable = player === Player.EMPTY && !isGameOver;
    const borderSegments = borderConfig.reduce<BorderSegment[]>((segments, { edge, offset, getPlayer }) => {
      const [dr, dc] = offset;
      const neighborRow = row + dr;
      const neighborCol = col + dc;
      if (
        neighborRow < 0 ||
        neighborRow >= BOARD_SIZE ||
        neighborCol < 0 ||
        neighborCol >= BOARD_SIZE
      ) {
        const borderPlayer = getPlayer(row, col);
        if (borderPlayer) {
          segments.push({ edge, player: borderPlayer });
        }
      }
      return segments;
    }, []);
    return (
      <motion.g
        initial={{ scale: 0.5, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.3, delay: (row + col) * 0.02 }}
        whileHover={isClickable ? { scale: 1.1, zIndex: 10 } : {}}
        className={cn(
          'transition-transform duration-200',
          isClickable && 'cursor-pointer'
        )}
        onClick={handleClick}
      >
        <polygon
          points={points}
          className={cn(
            'stroke-black/20 dark:stroke-white/30 stroke-2 transition-colors duration-200',
            playerColors[player],
            isClickable && hoverPlayerColors[currentPlayer],
            isWinning && 'animate-win-pulse'
          )}
        />
        {borderSegments.map(({ edge, player: borderPlayer }) => (
          <BorderPath key={edge} d={edges[edge]} player={borderPlayer} />
        ))}
      </motion.g>
    );
  }
);
Hexagon.displayName = 'Hexagon';
