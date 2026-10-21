import { useEffect, useRef, useState } from "react";
import jsQR from "jsqr";
import { Camera, X } from "../icons";

/**
 * Camera-based QR reader for the front desk. Calls onScan(text) once with the first QR it reads.
 * Uses the browser's BarcodeDetector when present, and jsQR everywhere else.
 */
export default function QrScanner({ onScan, onClose }) {
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const [error, setError] = useState("");

  useEffect(() => {
    let stream;
    let frame;
    let stopped = false;

    const start = async () => {
      if (!navigator.mediaDevices?.getUserMedia) {
        setError("This browser can't open the camera. Type the booking code instead.");
        return;
      }
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "environment" }, audio: false });
      } catch {
        setError("Camera access was blocked. Allow camera permission, or type the booking code instead.");
        return;
      }
      if (stopped) { stream.getTracks().forEach((track) => track.stop()); return; }
      const video = videoRef.current;
      video.srcObject = stream;
      await video.play().catch(() => {});

      const detector = "BarcodeDetector" in window ? new window.BarcodeDetector({ formats: ["qr_code"] }) : null;
      const canvas = canvasRef.current;
      const context = canvas.getContext("2d", { willReadFrequently: true });

      const tick = async () => {
        if (stopped) return;
        if (video.readyState >= 2 && video.videoWidth) {
          let text = null;
          try {
            if (detector) {
              text = (await detector.detect(video))[0]?.rawValue || null;
            } else {
              canvas.width = video.videoWidth;
              canvas.height = video.videoHeight;
              context.drawImage(video, 0, 0, canvas.width, canvas.height);
              text = jsQR(context.getImageData(0, 0, canvas.width, canvas.height).data, canvas.width, canvas.height)?.data || null;
            }
          } catch { /* keep scanning */ }
          if (text) { stopped = true; onScan(text); return; }
        }
        frame = requestAnimationFrame(tick);
      };
      tick();
    };

    start();
    return () => {
      stopped = true;
      cancelAnimationFrame(frame);
      stream?.getTracks().forEach((track) => track.stop());
    };
  }, [onScan]);

  return (
    <div className="card overflow-hidden">
      <div className="flex items-center justify-between border-b border-ink-100 px-4 py-3">
        <b className="flex items-center gap-2 text-sm text-ink-800"><Camera size={16} /> Scan guest QR code</b>
        <button type="button" onClick={onClose} aria-label="Close scanner" className="rounded-full p-1.5 text-ink-400 hover:bg-ink-100"><X size={16} /></button>
      </div>
      {error ? (
        <p className="p-4 text-sm text-rose-700">{error}</p>
      ) : (
        <div className="relative bg-ink-900">
          <video ref={videoRef} muted playsInline className="aspect-video w-full object-cover" />
          <div className="pointer-events-none absolute inset-0 grid place-items-center"><div className="h-40 w-40 rounded-2xl border-2 border-white/80" /></div>
        </div>
      )}
      <canvas ref={canvasRef} className="hidden" />
      <p className="px-4 py-3 text-xs text-ink-500">Hold the guest's booking QR inside the frame. The check-in form opens automatically.</p>
    </div>
  );
}
