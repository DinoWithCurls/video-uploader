import { FFmpeg } from "@ffmpeg/ffmpeg";
import { fetchFile, toBlobURL } from "@ffmpeg/util";

const ffmpeg = new FFmpeg();

/**
 * Loads the FFmpeg core.
 * Must be called before any other FFmpeg operations.
 */
export const loadFFmpeg = async () => {
  if (ffmpeg.loaded) return;

  const baseURL = "https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm";
  
  await ffmpeg.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, "text/javascript"),
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, "application/wasm"),
  });
};

export interface CompressionProgress {
  ratio: number; // 0 to 1
  time: number;
}

/**
 * Compresses a video file using FFmpeg.wasm
 * Target: 720p, CRF 28, Preset Ultrafast (balanced for speed/size)
 */
export const compressVideo = async (
  file: File,
  onProgress?: (progress: number) => void
): Promise<Blob> => {
  if (!ffmpeg.loaded) {
    await loadFFmpeg();
  }

  const inputFileName = "input" + file.name.substring(file.name.lastIndexOf("."));
  const outputFileName = "output.mp4";

  // Write file to FFmpeg's virtual file system
  await ffmpeg.writeFile(inputFileName, await fetchFile(file));

  // Hook into progress
  ffmpeg.on("progress", ({ progress }) => {
    if (onProgress) {
        // progress is 0-1
        onProgress(Math.round(progress * 100));
    }
  });

  // Run compression command
  // -vf scale=-2:720 : Scale to 720p height, keep aspect ratio
  // -crf 28 : Good balance of quality and size (lower is better quality)
  // -preset ultrafast : Fastest compression speed (trade-off: slightly larger file size)
  // -threads 0: Auto-detect threads (requires shared memory headers)
  await ffmpeg.exec([
    "-i", inputFileName,
    "-vf", "scale=-2:720", 
    "-c:v", "libx264",
    "-crf", "28",
    "-preset", "ultrafast",
    "-c:a", "aac",
    "-b:a", "128k",
    outputFileName
  ]);

  // Read the result
  const data = await ffmpeg.readFile(outputFileName);
  
  // Clean up
  await ffmpeg.deleteFile(inputFileName);
  await ffmpeg.deleteFile(outputFileName);

  return new Blob([data as any], { type: "video/mp4" });
};
