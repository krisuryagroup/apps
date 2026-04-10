import { Injectable } from '@angular/core';

export interface Tile {
  value: number;
  row: number;
  col: number;
  id: number;
  merged?: boolean;
}

export interface GameState {
  grid: (Tile | null)[][];
  score: number;
  highestTile: number;
  isGameOver: boolean;
  hasWon: boolean;
  canContinue: boolean;
}

/**
 * Service implementing classic 2048 game mechanics
 * - 4x4 grid
 * - Correct merging rules
 * - Score tracking
 * - Win/loss detection
 */
@Injectable({
  providedIn: 'root'
})
export class Game2048Service {
  private readonly GRID_SIZE = 4;
  private readonly WIN_TILE = 2048;
  private nextTileId = 0;

  /**
   * Initialize a new game with empty grid
   */
  initializeGame(): GameState {
    const grid: (Tile | null)[][] = Array(this.GRID_SIZE)
      .fill(null)
      .map(() => Array(this.GRID_SIZE).fill(null));

    const gameState: GameState = {
      grid,
      score: 0,
      highestTile: 0,
      isGameOver: false,
      hasWon: false,
      canContinue: true
    };

    // Add two initial tiles
    this.addRandomTile(gameState);
    this.addRandomTile(gameState);

    return gameState;
  }

  /**
   * Add a random tile (2 or 4) to an empty cell
   */
  private addRandomTile(state: GameState): boolean {
    const emptyCells: { row: number; col: number }[] = [];

    for (let row = 0; row < this.GRID_SIZE; row++) {
      for (let col = 0; col < this.GRID_SIZE; col++) {
        if (!state.grid[row][col]) {
          emptyCells.push({ row, col });
        }
      }
    }

    if (emptyCells.length === 0) {
      return false;
    }

    const { row, col } = emptyCells[Math.floor(Math.random() * emptyCells.length)];
    const value = Math.random() < 0.7 ? 2 : 4; // 70% chance for 2, 30% for 4

    state.grid[row][col] = {
      value,
      row,
      col,
      id: this.nextTileId++
    };

    return true;
  }

  /**
   * Move tiles in the specified direction
   * @returns true if move was successful, false if no move possible
   */
  move(state: GameState, direction: 'up' | 'down' | 'left' | 'right'): boolean {
    const originalGrid = JSON.stringify(state.grid);
    let moved = false;

    // Clear merged flags
    this.clearMergedFlags(state);

    switch (direction) {
      case 'left':
        moved = this.moveLeft(state);
        break;
      case 'right':
        moved = this.moveRight(state);
        break;
      case 'up':
        moved = this.moveUp(state);
        break;
      case 'down':
        moved = this.moveDown(state);
        break;
    }

    // Check if grid actually changed
    if (!moved || JSON.stringify(state.grid) === originalGrid) {
      return false;
    }

    // Add new tile after successful move
    this.addRandomTile(state);

    // Update highest tile
    state.highestTile = this.getHighestTile(state);

    // Check for win condition
    if (!state.hasWon && state.highestTile >= this.WIN_TILE) {
      state.hasWon = true;
    }

    // Check for game over
    state.isGameOver = this.isGameOver(state);

    return true;
  }

  /**
   * Move tiles left
   */
  private moveLeft(state: GameState): boolean {
    let moved = false;

    for (let row = 0; row < this.GRID_SIZE; row++) {
      let result = this.slideAndMergeRow(state.grid[row]);
      if (result.moved) {
        state.grid[row] = result.row;
        // Update tile positions
        for (let col = 0; col < this.GRID_SIZE; col++) {
          if (state.grid[row][col]) {
            state.grid[row][col]!.row = row;
            state.grid[row][col]!.col = col;
          }
        }
        state.score += result.scoreGain;
        moved = true;
      }
    }

    return moved;
  }

  /**
   * Move tiles right
   */
  private moveRight(state: GameState): boolean {
    let moved = false;

    for (let row = 0; row < this.GRID_SIZE; row++) {
      let reversed = [...state.grid[row]].reverse();
      let result = this.slideAndMergeRow(reversed);
      if (result.moved) {
        state.grid[row] = result.row.reverse();
        // Update tile positions
        for (let col = 0; col < this.GRID_SIZE; col++) {
          if (state.grid[row][col]) {
            state.grid[row][col]!.row = row;
            state.grid[row][col]!.col = col;
          }
        }
        state.score += result.scoreGain;
        moved = true;
      }
    }

    return moved;
  }

  /**
   * Move tiles up
   */
  private moveUp(state: GameState): boolean {
    let moved = false;

    for (let col = 0; col < this.GRID_SIZE; col++) {
      let column = this.getColumn(state, col);
      let result = this.slideAndMergeRow(column);
      if (result.moved) {
        this.setColumn(state, col, result.row);
        state.score += result.scoreGain;
        moved = true;
      }
    }

    return moved;
  }

  /**
   * Move tiles down
   */
  private moveDown(state: GameState): boolean {
    let moved = false;

    for (let col = 0; col < this.GRID_SIZE; col++) {
      let column = this.getColumn(state, col).reverse();
      let result = this.slideAndMergeRow(column);
      if (result.moved) {
        this.setColumn(state, col, result.row.reverse());
        state.score += result.scoreGain;
        moved = true;
      }
    }

    return moved;
  }

  /**
   * Slide and merge a row/column
   */
  private slideAndMergeRow(row: (Tile | null)[]): {
    row: (Tile | null)[];
    moved: boolean;
    scoreGain: number;
  } {
    const originalRow = [...row];
    let scoreGain = 0;

    // Filter out nulls
    let tiles = row.filter(tile => tile !== null) as Tile[];

    // Merge adjacent equal tiles
    const merged: Tile[] = [];
    let i = 0;
    while (i < tiles.length) {
      if (i < tiles.length - 1 && tiles[i].value === tiles[i + 1].value) {
        // Merge tiles
        const newValue = tiles[i].value * 2;
        merged.push({
          ...tiles[i],
          value: newValue,
          merged: true,
          id: this.nextTileId++
        });
        scoreGain += newValue;
        i += 2; // Skip the next tile
      } else {
        merged.push(tiles[i]);
        i++;
      }
    }

    // Fill with nulls
    const newRow: (Tile | null)[] = [
      ...merged,
      ...Array(this.GRID_SIZE - merged.length).fill(null)
    ];

    // Check if anything moved
    const moved = JSON.stringify(originalRow) !== JSON.stringify(newRow);

    return { row: newRow, moved, scoreGain };
  }

  /**
   * Get column as array
   */
  private getColumn(state: GameState, col: number): (Tile | null)[] {
    return state.grid.map(row => row[col]);
  }

  /**
   * Set column from array
   */
  private setColumn(state: GameState, col: number, column: (Tile | null)[]): void {
    for (let row = 0; row < this.GRID_SIZE; row++) {
      state.grid[row][col] = column[row];
      if (column[row]) {
        column[row]!.row = row;
        column[row]!.col = col;
      }
    }
  }

  /**
   * Clear merged flags for all tiles
   */
  private clearMergedFlags(state: GameState): void {
    for (let row = 0; row < this.GRID_SIZE; row++) {
      for (let col = 0; col < this.GRID_SIZE; col++) {
        if (state.grid[row][col]) {
          state.grid[row][col]!.merged = false;
        }
      }
    }
  }

  /**
   * Get the highest tile value on the board
   */
  private getHighestTile(state: GameState): number {
    let max = 0;
    for (let row = 0; row < this.GRID_SIZE; row++) {
      for (let col = 0; col < this.GRID_SIZE; col++) {
        const tile = state.grid[row][col];
        if (tile && tile.value > max) {
          max = tile.value;
        }
      }
    }
    return max;
  }

  /**
   * Check if the game is over (no more moves possible)
   */
  private isGameOver(state: GameState): boolean {
    // Check for empty cells
    for (let row = 0; row < this.GRID_SIZE; row++) {
      for (let col = 0; col < this.GRID_SIZE; col++) {
        if (!state.grid[row][col]) {
          return false;
        }
      }
    }

    // Check for possible merges horizontally
    for (let row = 0; row < this.GRID_SIZE; row++) {
      for (let col = 0; col < this.GRID_SIZE - 1; col++) {
        const current = state.grid[row][col];
        const next = state.grid[row][col + 1];
        if (current && next && current.value === next.value) {
          return false;
        }
      }
    }

    // Check for possible merges vertically
    for (let col = 0; col < this.GRID_SIZE; col++) {
      for (let row = 0; row < this.GRID_SIZE - 1; row++) {
        const current = state.grid[row][col];
        const next = state.grid[row + 1][col];
        if (current && next && current.value === next.value) {
          return false;
        }
      }
    }

    return true;
  }

  /**
   * Check if a move is possible in any direction
   */
  canMove(state: GameState): boolean {
    return !this.isGameOver(state);
  }

  /**
   * Get all tiles as flat array for rendering
   */
  getAllTiles(state: GameState): Tile[] {
    const tiles: Tile[] = [];
    for (let row = 0; row < this.GRID_SIZE; row++) {
      for (let col = 0; col < this.GRID_SIZE; col++) {
        if (state.grid[row][col]) {
          tiles.push(state.grid[row][col]!);
        }
      }
    }
    return tiles;
  }
}
