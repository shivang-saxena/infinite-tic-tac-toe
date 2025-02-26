import { NextResponse } from "next/server";
import { getGameState, setGameState } from "@/lib/gameStore";
import { GameState } from "@/lib/types";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ gameId: string }> }
): Promise<NextResponse> {
  const { gameId } = await params;
  const state = await getGameState(gameId);
  if (!state) {
    return NextResponse.json({ error: "Game not found" }, { status: 404 });
  }
  return NextResponse.json(state);
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ gameId: string }> }
): Promise<NextResponse> {
  const { gameId } = await params;
  const state: GameState = await request.json();
  await setGameState(gameId, state);
  return NextResponse.json({ success: true });
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ gameId: string }> }
): Promise<NextResponse> {
  const { gameId } = await params;
  const currentState = await getGameState(gameId);

  if (!currentState) {
    return NextResponse.json({ error: "Game not found" }, { status: 404 });
  }

  const updatedState = { ...currentState, deleted: true };
  await setGameState(gameId, updatedState);

  return NextResponse.json({ success: true });
}
