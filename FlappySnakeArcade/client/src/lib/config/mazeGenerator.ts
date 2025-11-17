import { WorldConfig } from './worldConfig';

export interface MazeCell {
  walls: {
    top: boolean;
    right: boolean;
    bottom: boolean;
    left: boolean;
  };
  visited?: boolean;
  isEntry?: boolean;
  isExit?: boolean;
  isFakeExit?: boolean;
  hasKey?: boolean;
  hasDoor?: boolean;
  doorId?: string;
  keyId?: string;
  isMovingBlock?: boolean;
  moveDirection?: 'horizontal' | 'vertical';
}

export interface Maze {
  grid: MazeCell[][];
  width: number;
  height: number;
  entryRow: number;
  entryCol: number;
  exitRow: number;
  exitCol: number;
  complexity: number;
  worldId: string;
  fakeExits: Array<{row: number; col: number}>;
  keys: Array<{row: number; col: number; id: string}>;
  doors: Array<{row: number; col: number; id: string}>;
  movingBlocks: Array<{row: number; col: number; direction: 'horizontal' | 'vertical'}>;
}

function createEmptyCell(): MazeCell {
  return {
    walls: {
      top: true,
      right: true,
      bottom: true,
      left: true,
    },
    visited: false,
  };
}

function shuffle<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

function carvePath(
  grid: MazeCell[][],
  row: number,
  col: number,
  height: number,
  width: number
) {
  grid[row][col].visited = true;
  
  const directions = shuffle([
    { dr: -1, dc: 0, wall: 'top', opposite: 'bottom' },
    { dr: 1, dc: 0, wall: 'bottom', opposite: 'top' },
    { dr: 0, dc: -1, wall: 'left', opposite: 'right' },
    { dr: 0, dc: 1, wall: 'right', opposite: 'left' },
  ]);
  
  for (const dir of directions) {
    const newRow = row + dir.dr;
    const newCol = col + dir.dc;
    
    if (
      newRow >= 0 &&
      newRow < height &&
      newCol >= 0 &&
      newCol < width &&
      !grid[newRow][newCol].visited
    ) {
      grid[row][col].walls[dir.wall as keyof MazeCell['walls']] = false;
      grid[newRow][newCol].walls[dir.opposite as keyof MazeCell['walls']] = false;
      
      carvePath(grid, newRow, newCol, height, width);
    }
  }
}

function addBranches(grid: MazeCell[][], height: number, width: number, complexity: number) {
  const branchCount = Math.min(complexity * 5, 25);
  
  for (let i = 0; i < branchCount; i++) {
    const row = Math.floor(Math.random() * height);
    const col = Math.floor(Math.random() * width);
    
    const directions = shuffle([
      { dr: -1, dc: 0, wall: 'top', opposite: 'bottom' },
      { dr: 1, dc: 0, wall: 'bottom', opposite: 'top' },
      { dr: 0, dc: -1, wall: 'left', opposite: 'right' },
      { dr: 0, dc: 1, wall: 'right', opposite: 'left' },
    ]);
    
    const dir = directions[0];
    const newRow = row + dir.dr;
    const newCol = col + dir.dc;
    
    if (newRow >= 0 && newRow < height && newCol >= 0 && newCol < width) {
      grid[row][col].walls[dir.wall as keyof MazeCell['walls']] = false;
      grid[newRow][newCol].walls[dir.opposite as keyof MazeCell['walls']] = false;
    }
  }
}

export function generateMaze(options: {
  complexity: number;
  worldId: string;
  world: WorldConfig;
}): Maze {
  const { complexity, worldId, world } = options;
  
  const baseSize = 10;
  const sizeIncrease = Math.min(Math.floor(complexity * 2), 10);
  const width = baseSize + sizeIncrease;
  const height = baseSize + sizeIncrease;
  
  const grid: MazeCell[][] = [];
  for (let r = 0; r < height; r++) {
    grid[r] = [];
    for (let c = 0; c < width; c++) {
      grid[r][c] = createEmptyCell();
    }
  }
  
  const entryRow = 0;
  const entryCol = 0;
  const exitRow = height - 1;
  const exitCol = width - 1;
  
  carvePath(grid, entryRow, entryCol, height, width);
  
  if (complexity > 0) {
    addBranches(grid, height, width, complexity);
  }
  
  grid[entryRow][entryCol].isEntry = true;
  grid[entryRow][entryCol].walls.left = false;
  
  grid[exitRow][exitCol].isExit = true;
  grid[exitRow][exitCol].walls.right = false;
  
  const fakeExits: Array<{row: number; col: number}> = [];
  const fakeExitCount = Math.min(complexity, 3);
  for (let i = 0; i < fakeExitCount; i++) {
    let row: number = 0;
    let col: number = 0;
    do {
      row = Math.floor(Math.random() * height);
      col = Math.floor(Math.random() * width);
    } while (
      (row === entryRow && col === entryCol) ||
      (row === exitRow && col === exitCol) ||
      fakeExits.some(fe => fe.row === row && fe.col === col)
    );
    
    grid[row][col].isFakeExit = true;
    fakeExits.push({ row, col });
  }
  
  const keys: Array<{row: number; col: number; id: string}> = [];
  const doors: Array<{row: number; col: number; id: string}> = [];
  
  if (complexity >= 2) {
    const keyDoorPairs = Math.min(Math.floor(complexity / 2), 2);
    
    for (let i = 0; i < keyDoorPairs; i++) {
      const keyId = `key-${i}`;
      const doorId = `door-${i}`;
      
      let keyRow: number = 0;
      let keyCol: number = 0;
      let doorRow: number = 0;
      let doorCol: number = 0;
      
      do {
        keyRow = Math.floor(Math.random() * height);
        keyCol = Math.floor(Math.random() * width);
      } while (
        (keyRow === entryRow && keyCol === entryCol) ||
        (keyRow === exitRow && keyCol === exitCol) ||
        grid[keyRow][keyCol].isFakeExit ||
        keys.some(k => k.row === keyRow && k.col === keyCol)
      );
      
      do {
        doorRow = Math.floor(Math.random() * height);
        doorCol = Math.floor(Math.random() * width);
      } while (
        (doorRow === entryRow && doorCol === entryCol) ||
        (doorRow === exitRow && doorCol === exitCol) ||
        grid[doorRow][doorCol].isFakeExit ||
        (doorRow === keyRow && doorCol === keyCol) ||
        doors.some(d => d.row === doorRow && d.col === doorCol)
      );
      
      grid[keyRow][keyCol].hasKey = true;
      grid[keyRow][keyCol].keyId = keyId;
      keys.push({ row: keyRow, col: keyCol, id: keyId });
      
      grid[doorRow][doorCol].hasDoor = true;
      grid[doorRow][doorCol].doorId = doorId;
      doors.push({ row: doorRow, col: doorCol, id: doorId });
    }
  }
  
  const movingBlocks: Array<{row: number; col: number; direction: 'horizontal' | 'vertical'}> = [];
  
  if (complexity >= 3 && world.mechanics.hasMovingPlatforms) {
    const movingBlockCount = Math.min(complexity, 4);
    
    for (let i = 0; i < movingBlockCount; i++) {
      let row: number = 0;
      let col: number = 0;
      do {
        row = Math.floor(Math.random() * height);
        col = Math.floor(Math.random() * width);
      } while (
        (row === entryRow && col === entryCol) ||
        (row === exitRow && col === exitCol) ||
        grid[row][col].isFakeExit ||
        grid[row][col].hasKey ||
        grid[row][col].hasDoor ||
        movingBlocks.some(mb => mb.row === row && mb.col === col)
      );
      
      const direction = Math.random() > 0.5 ? 'horizontal' : 'vertical';
      grid[row][col].isMovingBlock = true;
      grid[row][col].moveDirection = direction;
      movingBlocks.push({ row, col, direction });
    }
  }
  
  return {
    grid,
    width,
    height,
    entryRow,
    entryCol,
    exitRow,
    exitCol,
    complexity,
    worldId,
    fakeExits,
    keys,
    doors,
    movingBlocks,
  };
}
