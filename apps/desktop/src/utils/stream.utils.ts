import type { LlmStreamEvent } from "@repo/types";

export async function* readNdjsonStream(
  response: Response,
): AsyncGenerator<LlmStreamEvent> {
  const reader = response.body!.getReader();
  const decoder = new TextDecoder();
  let buffer = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;

    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split("\n");
    buffer = lines.pop()!;

    for (const line of lines) {
      if (line.trim()) {
        yield JSON.parse(line) as LlmStreamEvent;
      }
    }
  }

  if (buffer.trim()) {
    yield JSON.parse(buffer) as LlmStreamEvent;
  }
}
