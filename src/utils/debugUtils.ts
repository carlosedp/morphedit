// Debug utilities for standardized console output

import { waveformLogger, regionLogger, audioLogger } from "./logger";

// Map of debug categories to their respective loggers
const DEBUG_LOGGERS = {
  waveform: waveformLogger,
  region: regionLogger,
  audio: audioLogger,
  crop: regionLogger,
  ready: waveformLogger,
} as const;

type DebugCategory = keyof typeof DEBUG_LOGGERS;

/**
 * Standardized debug logging that can be easily disabled in production
 * @param category - The debug category (waveform, region, audio, etc.)
 * @param message - The message to log
 * @param args - Additional arguments to log
 */
export const debugLog = (
  category: DebugCategory,
  message: string,
  ...args: unknown[]
): void => {
  if (process.env.NODE_ENV === "development") {
    const logger = DEBUG_LOGGERS[category];
    logger.debug(message, ...args);
  }
};

/**
 * Check if a console.log statement should be migrated to use debugLog
 * This helps identify legacy console.log statements that need updating
 */
export const shouldMigrateConsoleLog = (message: string): boolean => {
  const debugKeywords = ["DEBUG", "CROP", "ready", "Loading", "Found"];
  return debugKeywords.some((keyword) =>
    message.toUpperCase().includes(keyword.toUpperCase()),
  );
};

/**
 * Performance timing utility for debug builds
 */
export class DebugTimer {
  private startTime: number;
  private label: string;
  private category: DebugCategory;

  constructor(label: string, category: DebugCategory = "waveform") {
    this.label = label;
    this.category = category;
    this.startTime = performance.now();
    debugLog(this.category, `⏱️ Timer started: ${this.label}`);
  }

  end(): number {
    const elapsed = performance.now() - this.startTime;
    debugLog(
      this.category,
      `⏱️ Timer ended: ${this.label} took ${elapsed.toFixed(2)}ms`,
    );
    return elapsed;
  }
}
