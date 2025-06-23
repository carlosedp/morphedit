// BPM detection utility using web-audio-beat-detector
import { analyze } from "web-audio-beat-detector";
import { createLogger } from "./logger";

const bpmLogger = createLogger("BPMDetection");

/**
 * Detects the BPM of an audio buffer using web-audio-beat-detector
 * @param audioBuffer - The AudioBuffer to analyze
 * @returns Promise that resolves to the detected BPM or null if detection fails
 */
export async function detectBPM(
  audioBuffer: AudioBuffer,
): Promise<number | null> {
  try {
    bpmLogger.debug("Starting BPM detection...", {
      duration: audioBuffer.duration,
      sampleRate: audioBuffer.sampleRate,
      channels: audioBuffer.numberOfChannels,
    });

    // The web-audio-beat-detector guess function returns an object with tempo
    const result = await analyze(audioBuffer);

    // Extract the tempo from the result
    const bpm =
      typeof result === "object" && result !== null && "tempo" in result
        ? (result as { tempo: number }).tempo
        : typeof result === "number"
          ? result
          : null;

    if (bpm === null) {
      bpmLogger.warn("BPM detection returned no valid result");
      return null;
    }

    // Round to one decimal place for display
    const roundedBpm = Math.round(bpm * 10) / 10;

    bpmLogger.debug("BPM detection completed", {
      detectedBpm: roundedBpm,
      originalBpm: bpm,
      result: result,
    });

    return roundedBpm;
  } catch (error) {
    bpmLogger.error("BPM detection failed:", error);
    return null;
  }
}

/**
 * Detects BPM with a timeout to prevent hanging on very long audio files
 * @param audioBuffer - The AudioBuffer to analyze
 * @param timeoutMs - Timeout in milliseconds (default: 30 seconds)
 * @returns Promise that resolves to the detected BPM or null if detection fails/times out
 */
export async function detectBPMWithTimeout(
  audioBuffer: AudioBuffer,
  timeoutMs: number = 30000,
): Promise<number | null> {
  try {
    const bpmPromise = detectBPM(audioBuffer);
    const timeoutPromise = new Promise<null>((resolve) => {
      setTimeout(() => {
        bpmLogger.warn("BPM detection timed out");
        resolve(null);
      }, timeoutMs);
    });

    const result = await Promise.race([bpmPromise, timeoutPromise]);
    return result;
  } catch (error) {
    bpmLogger.error("BPM detection with timeout failed:", error);
    return null;
  }
}

/**
 * Formats BPM for display
 * @param bpm - The BPM value to format
 * @returns Formatted BPM string
 */
export function formatBPM(bpm: number | null): string {
  if (bpm === null) {
    return "--";
  }
  return `${bpm} BPM`;
}
