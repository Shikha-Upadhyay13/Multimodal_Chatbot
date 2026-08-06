import { toFile } from "groq-sdk";
import { groq, MODELS } from "../agent/groqClient";

export async function transcribeAudio(buffer: Buffer, mimeType: string): Promise<string> {
  const file = await toFile(buffer, "speech.webm", { type: mimeType });
  const result = await groq.audio.transcriptions.create({
    file,
    model: MODELS.whisper,
  });
  return result.text;
}
