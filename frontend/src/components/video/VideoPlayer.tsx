import React, { useRef, useState, useEffect } from "react";
import type { Video } from "../../services/videoService";
import { getStreamUrl } from "../../services/videoService";

interface VideoPlayerProps {
  video: Video;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ video }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [playing, setPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [error, setError] = useState<string | null>(null);

  const streamUrl = getStreamUrl(video._id);

  useEffect(() => {
    const videoElement = videoRef.current;
    if (!videoElement) return;

    const handleTimeUpdate = () => {
      setCurrentTime(videoElement.currentTime);
    };

    const handleLoadedMetadata = () => {
      setDuration(videoElement.duration);
    };

    const handleError = () => {
      setError("Error loading video. Please try again.");
    };

    videoElement.addEventListener("timeupdate", handleTimeUpdate);
    videoElement.addEventListener("loadedmetadata", handleLoadedMetadata);
    videoElement.addEventListener("error", handleError);

    return () => {
      videoElement.removeEventListener("timeupdate", handleTimeUpdate);
      videoElement.removeEventListener("loadedmetadata", handleLoadedMetadata);
      videoElement.removeEventListener("error", handleError);
    };
  }, []);

  const togglePlay = () => {
    if (videoRef.current) {
      if (playing) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
      setPlaying(!playing);
    }
  };

  const handleSeek = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newTime = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.currentTime = newTime;
      setCurrentTime(newTime);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    if (videoRef.current) {
      videoRef.current.volume = newVolume;
      setVolume(newVolume);
    }
  };

  const toggleFullscreen = () => {
    if (videoRef.current) {
      if (document.fullscreenElement) {
        document.exitFullscreen();
      } else {
        videoRef.current.requestFullscreen();
      }
    }
  };

  const formatTime = (seconds: number): string => {
    if (isNaN(seconds)) return "0:00";
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, "0")}`;
  };

  if (video.status !== "completed") {
    return (
      <div className="bg-gray-100 rounded-lg p-8 text-center">
        <p className="text-gray-600">
          Video is {video.status}. Please wait for processing to complete.
        </p>
        {video.status === "processing" && (
          <div className="mt-4">
            <div className="w-full bg-gray-200 rounded-full h-2 max-w-md mx-auto">
              <div
                className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                style={{ width: `${video.processingProgress}%` }}
              />
            </div>
            <p className="mt-2 text-sm text-gray-500">
              {video.processingProgress}% complete
            </p>
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Video Element */}
      <div className="relative bg-black rounded-lg overflow-hidden">
        <video
          ref={videoRef}
          src={streamUrl}
          className="w-full"
          onClick={togglePlay}
          crossOrigin="use-credentials"
        />

        {error && (
          <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75">
            <p className="text-white">{error}</p>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="bg-white rounded-lg p-4 space-y-3">
        {/* Progress Bar */}
        <div className="space-y-1">
          <input
            type="range"
            min="0"
            max={duration || 0}
            value={currentTime}
            onChange={handleSeek}
            className="w-full"
          />
          <div className="flex justify-between text-sm text-gray-600">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration)}</span>
          </div>
        </div>

        {/* Control Buttons */}
        <div className="flex items-center gap-4">
          {/* Play/Pause */}
          <button
            onClick={togglePlay}
            className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700 transition-colors"
          >
            {playing ? "⏸ Pause" : "▶ Play"}
          </button>

          {/* Volume */}
          <div className="flex items-center gap-2">
            <span className="text-sm">🔊</span>
            <input
              type="range"
              min="0"
              max="1"
              step="0.1"
              value={volume}
              onChange={handleVolumeChange}
              className="w-24"
            />
          </div>

          {/* Fullscreen */}
          <button
            onClick={toggleFullscreen}
            className="ml-auto bg-gray-200 px-4 py-2 rounded-lg hover:bg-gray-300 transition-colors"
          >
            ⛶ Fullscreen
          </button>
        </div>
      </div>

      {/* Video Info */}
      <div className="bg-white rounded-lg p-4 space-y-2">
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Resolution:</span>
          <span>
            {video.resolution.width} x {video.resolution.height}
          </span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Codec:</span>
          <span>{video.codec || "N/A"}</span>
        </div>
        <div className="flex justify-between text-sm">
          <span className="text-gray-600">Format:</span>
          <span>{video.mimetype}</span>
        </div>
      </div>
    </div>
  );
};

export default VideoPlayer;
