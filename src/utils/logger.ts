// Logging utilities for consistent debug output
import { MARKER_ICONS } from '../constants';

const LOG_PREFIX = 'MorphEdit';

// Create consistent log messages with context
export const createLogger = (context: string) => {
  const prefix = `${LOG_PREFIX} [${context}]`;

  return {
    debug: (message: string, ...args: unknown[]) => {
      console.log(`${prefix} ${message}`, ...args);
    },
    info: (message: string, ...args: unknown[]) => {
      console.info(`${prefix} ${message}`, ...args);
    },
    warn: (message: string, ...args: unknown[]) => {
      console.warn(`${prefix} ${message}`, ...args);
    },
    error: (message: string, ...args: unknown[]) => {
      console.error(`${prefix} ${message}`, ...args);
    },

    // Specialized logging for audio operations
    audioOperation: (operation: string, details?: Record<string, unknown>) => {
      const detailsStr = details ? JSON.stringify(details, null, 2) : '';
      console.log(
        `${prefix} 🎵 ${operation}${detailsStr ? `\n${detailsStr}` : ''}`
      );
    },

    // Specialized logging for marker operations
    markerOperation: (operation: string, count: number, type?: string) => {
      const typeStr = type ? ` ${type}` : '';
      console.log(
        `${prefix} ${MARKER_ICONS.UNLOCKED} ${operation}:${typeStr} ${count} markers`
      );
    },

    // Specialized logging for processing states
    processingState: (state: string, isStart: boolean = true) => {
      const emoji = isStart ? '🔄' : '✅';
      console.log(
        `${prefix} ${emoji} ${state} ${isStart ? 'started' : 'completed'}`
      );
    },
  };
};

// Pre-created loggers for common contexts
export const waveformLogger = createLogger('Waveform');
export const spliceLogger = createLogger('SpliceMarkers');
export const audioLogger = createLogger('AudioProcessing');
export const regionLogger = createLogger('Regions');
export const concatenationLogger = createLogger('Concatenation');
