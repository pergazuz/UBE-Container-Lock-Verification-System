import { useCallback, useEffect, useRef, useState } from "react";

export type CameraState = "idle" | "starting" | "live" | "denied" | "unavailable";

/**
 * Wraps a fixed-camera / webcam feed. In production this would point at the
 * station's mounted IP camera; for the POC it uses the browser webcam via
 * getUserMedia and falls back gracefully (upload / demo) when unavailable.
 */
export function useCamera() {
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [state, setState] = useState<CameraState>("idle");

  const stop = useCallback(() => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
    setState("idle");
  }, []);

  const start = useCallback(async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      setState("unavailable");
      return;
    }
    setState("starting");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: 1280, height: 720 },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => undefined);
      }
      setState("live");
    } catch (err) {
      const name = (err as DOMException)?.name;
      setState(name === "NotAllowedError" ? "denied" : "unavailable");
    }
  }, []);

  /** Grab the current frame as a JPEG data URL. */
  const capture = useCallback((): string | undefined => {
    const video = videoRef.current;
    if (!video || state !== "live" || !video.videoWidth) return undefined;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return undefined;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/jpeg", 0.7);
  }, [state]);

  useEffect(() => stop, [stop]);

  return { videoRef, state, start, stop, capture };
}
