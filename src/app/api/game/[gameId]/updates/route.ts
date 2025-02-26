import { NextResponse } from "next/server";
import { getGameState } from "@/lib/gameStore";

export async function GET(
  request: Request,
  { params }: { params: Promise<{ gameId: string }> }
) {
  const { gameId } = await params;

  const headers = {
    "Content-Type": "text/event-stream",
    "Cache-Control": "no-cache",
    Connection: "keep-alive",
  };

  const stream = new ReadableStream({
    async start(controller) {
      let lastState = await getGameState(gameId);
      if (lastState) {
        controller.enqueue(`data: ${JSON.stringify(lastState)}\n\n`);
      } else {
        controller.enqueue(
          `data: ${JSON.stringify({ error: "Game not found" })}\n\n`
        );
        controller.close();
        return;
      }

      const interval = setInterval(async () => {
        const currentState = await getGameState(gameId);
        if (!currentState || currentState.deleted) {
          controller.enqueue(`data: ${JSON.stringify({ deleted: true })}\n\n`);
          controller.close();
          clearInterval(interval);
          return;
        }
        if (
          currentState &&
          JSON.stringify(currentState) !== JSON.stringify(lastState)
        ) {
          controller.enqueue(`data: ${JSON.stringify(currentState)}\n\n`);
          lastState = currentState;
        }
      }, 1000);

      request.signal.addEventListener("abort", () => {
        clearInterval(interval);
        controller.close();
      });
    },
  });

  return new NextResponse(stream, { headers });
}
