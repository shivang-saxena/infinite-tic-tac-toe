// src/lib/gameStore.ts
import fs from "fs-extra";
import path from "path";
import { GameState } from "./types"; // Import from types.ts

const baseStorePath = path.join(process.cwd(), "gameData");

// Get today's date in YYYY-MM-DD format
function getDateFolder(): string {
  const date = new Date();
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
}

// Ensure the directory for today exists
export async function ensureDirectory(): Promise<string> {
  const dateFolder = getDateFolder();
  const storePath = path.join(baseStorePath, dateFolder);
  await fs.ensureDir(storePath);
  return storePath;
}

// Search for a game ID across all date folders
async function findGamePath(gameId: string): Promise<string | null> {
  try {
    // First check today's folder
    const todayPath = path.join(baseStorePath, getDateFolder(), `${gameId}.json`);
    if (await fs.pathExists(todayPath)) {
      return todayPath;
    }
    
    // If not found, search all date folders
    await fs.ensureDir(baseStorePath);
    const dateFolders = await fs.readdir(baseStorePath);
    
    for (const folder of dateFolders) {
      const filePath = path.join(baseStorePath, folder, `${gameId}.json`);
      if (await fs.pathExists(filePath)) {
        return filePath;
      }
    }
    
    return null;
  } catch (error) {
    console.error("Error finding game:", error);
    return null;
  }
}

export async function getGameState(gameId: string): Promise<GameState | null> {
  try {
    const filePath = await findGamePath(gameId);
    if (!filePath) return null;
    
    const data = await fs.readFile(filePath, "utf-8");
    return JSON.parse(data) as GameState;
  } catch (error) {
    console.error("Error getting game state:", error);
    return null;
  }
}

export async function setGameState(
  gameId: string,
  state: GameState
): Promise<void> {
  try {
    // Always save to latest date folder when updating
    const storePath = await ensureDirectory();
    const filePath = path.join(storePath, `${gameId}.json`);
    
    // Ensure we keep the existing winCount if it exists
    const existingState = await getGameState(gameId);
    if (existingState?.winCount && !state.winCount) {
      state.winCount = existingState.winCount;
    }
    
    await fs.writeFile(filePath, JSON.stringify(state, null, 2), "utf-8");
    
    // If this game exists in an older folder, remove it to avoid duplicates
    const oldPath = await findGamePath(gameId);
    if (oldPath && oldPath !== filePath) {
      await fs.remove(oldPath);
    }
  } catch (error) {
    console.error("Error setting game state:", error);
  }
}

// Never actually delete the game, just mark it as deleted
export async function clearGameState(gameId: string): Promise<void> {
  try {
    const existingState = await getGameState(gameId);
    if (existingState) {
      await setGameState(gameId, { ...existingState, deleted: true });
    }
  } catch (error) {
    console.error("Error marking game as deleted:", error);
  }
}
