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

  return (
    <div className="voice-control">
      <button
        type="button"
        className="voice-button"
        data-state={state}
        onClick={handleClick}
        disabled={state === "transcribing"}
        title={state === "recording" ? "Stop recording" : "Talk to the assistant"}
        aria-label={state === "recording" ? "Stop recording" : "Talk to the assistant"}
      >
        {state === "recording" ? <StopIcon /> : state === "transcribing" ? <span className="voice-dots">…</span> : <MicIcon />}
      </button>
      {error && <span className="upload-error">{error}</span>}
    </div>
  );
}

function MicIcon() {
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="9" y="2" width="6" height="11" rx="3" />
      <path d="M5 11a7 7 0 0 0 14 0" />
      <path d="M12 18v4" />
      <path d="M8 22h8" />
    </svg>
  );
}

function StopIcon() {
  return (
    <svg viewBox="0 0 24 24" width="14" height="14" fill="currentColor" aria-hidden="true">
      <rect x="6" y="6" width="12" height="12" rx="2" />
    </svg>
  );
}
