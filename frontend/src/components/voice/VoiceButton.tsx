import { useRef, useState } from "react";
import { transcribeAudio } from "../../api/voiceApi";

type VoiceState = "idle" | "recording" | "transcribing";

export function VoiceButton({ onTranscript }: { onTranscript: (text: string) => void }) {
  const [state, setState] = useState<VoiceState>("idle");
  const [error, setError] = useState<string | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  const startRecording = async () => {
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      chunksRef.current = [];

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };

      recorder.onstop = async () => {
        stream.getTracks().forEach((track) => track.stop());
        const blob = new Blob(chunksRef.current, { type: recorder.mimeType || "audio/webm" });

        setState("transcribing");
        try {
          const text = await transcribeAudio(blob);
          if (text.trim()) onTranscript(text.trim());
        } catch (err) {
          setError(err instanceof Error ? err.message : String(err));
        } finally {
          setState("idle");
        }
      };

      recorderRef.current = recorder;
      recorder.start();
      setState("recording");
    } catch {
      setError("Microphone access denied or unavailable.");
      setState("idle");
    }
  };

  const stopRecording = () => {
    recorderRef.current?.stop();
  };

  const handleClick = () => {
    if (state === "idle") void startRecording();
    else if (state === "recording") stopRecording();
  };

  const label = state === "recording" ? "⏹" : state === "transcribing" ? "…" : "🎤";

  return (
    <div className="voice-control">
      <button
        type="button"
        className="voice-button"
        data-state={state}
        onClick={handleClick}
        disabled={state === "transcribing"}
        title={state === "recording" ? "Stop recording" : "Talk to the assistant"}
      >
        {label}
      </button>
      {error && <span className="upload-error">{error}</span>}
    </div>
  );
}
