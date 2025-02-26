// src/lib/gameStore.ts
import fs from "fs-extra";
import path from "path";
import { GameState } from "./types"; // Import from types.ts

const storePath = path.join(process.cwd(), "gameData");

export async function ensureDirectory(): Promise<void> {
  await fs.ensureDir(storePath);
}

export async function getGameState(gameId: string): Promise<GameState | null> {
  await ensureDirectory();
  const filePath = path.join(storePath, `${gameId}.json`);
  try {
    const data = await fs.readFile(filePath, "utf-8");
    return JSON.parse(data) as GameState;
  } catch {
    return null;
  }
}

export async function setGameState(
  gameId: string,
  state: GameState
): Promise<void> {
  await ensureDirectory();
  const filePath = path.join(storePath, `${gameId}.json`);
  await fs.writeFile(filePath, JSON.stringify(state, null, 2), "utf-8");
}

export async function clearGameState(gameId: string): Promise<void> {
  await ensureDirectory();
  const filePath = path.join(storePath, `${gameId}.json`);
  await fs.remove(filePath);
}
