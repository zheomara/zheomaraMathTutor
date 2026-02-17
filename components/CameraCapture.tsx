"use client";

import { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { Camera, X } from "lucide-react";

interface CameraCaptureProps {
    onCapture: (file: File) => void;
    onClose: () => void;
}

export default function CameraCapture({ onCapture, onClose }: CameraCaptureProps) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [stream, setStream] = useState<MediaStream | null>(null);
    const [error, setError] = useState("");

    useEffect(() => {
        startCamera();
        return () => stopCamera();
    }, []);

    const startCamera = async () => {
        try {
            const mediaStream = await navigator.mediaDevices.getUserMedia({
                video: { facingMode: "environment" },
            });
            setStream(mediaStream);
            if (videoRef.current) {
                videoRef.current.srcObject = mediaStream;
            }
        } catch (err) {
            setError("Could not access camera. Please allow permissions.");
            console.error(err);
        }
    };

    const stopCamera = () => {
        if (stream) {
            stream.getTracks().forEach((track) => track.stop());
            setStream(null);
        }
    };

    const handleCapture = () => {
        if (videoRef.current && canvasRef.current) {
            const video = videoRef.current;
            const canvas = canvasRef.current;

            canvas.width = video.videoWidth;
            canvas.height = video.videoHeight;

            const ctx = canvas.getContext("2d");
            if (ctx) {
                ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
                canvas.toBlob((blob) => {
                    if (blob) {
                        const file = new File([blob], "camera-capture.jpg", { type: "image/jpeg" });
                        onCapture(file);
                        stopCamera();
                    }
                }, "image/jpeg", 0.9);
            }
        }
    };

    return (
        <div className="fixed inset-0 z-50 bg-black flex flex-col">
            <div className="flex justify-between items-center p-4 bg-black/50 text-white z-10">
                <h2 className="text-lg font-semibold">Take a Photo</h2>
                <Button variant="ghost" onClick={() => { stopCamera(); onClose(); }} className="text-white hover:bg-white/20">
                    <X className="w-6 h-6" />
                </Button>
            </div>

            <div className="flex-1 relative flex items-center justify-center bg-black overflow-hidden">
                {error ? (
                    <div className="text-red-500 p-4 text-center">{error}</div>
                ) : (
                    <video
                        ref={videoRef}
                        autoPlay
                        playsInline
                        muted
                        className="absolute inset-0 w-full h-full object-cover"
                    />
                )}
                <canvas ref={canvasRef} className="hidden" />
            </div>

            <div className="p-8 bg-black/50 flex justify-center z-10">
                <button
                    onClick={handleCapture}
                    className="w-20 h-20 rounded-full border-4 border-white bg-white/20 flex items-center justify-center transition-transform active:scale-95"
                    disabled={!!error}
                >
                    <div className="w-16 h-16 rounded-full bg-white" />
                </button>
            </div>
        </div>
    );
}
