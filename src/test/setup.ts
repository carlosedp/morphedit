import '@testing-library/jest-dom/vitest';

// Mock Web Audio API
class MockAudioContext {
  createBuffer(numberOfChannels: number, length: number, sampleRate: number) {
    return {
      length,
      sampleRate,
      numberOfChannels,
      duration: length / sampleRate,
      getChannelData: () => new Float32Array(length),
      copyFromChannel: () => {},
      copyToChannel: () => {},
    };
  }

  createBufferSource() {
    return {
      buffer: null,
      connect: () => {},
      start: () => {},
      stop: () => {},
    };
  }

  createGain() {
    return {
      gain: { value: 1 },
      connect: () => {},
    };
  }

  get destination() {
    return {
      connect: () => {},
    };
  }

  decodeAudioData() {
    return Promise.resolve(this.createBuffer(2, 44100, 44100));
  }

  close() {
    return Promise.resolve();
  }
}

// Mock Audio element
class MockAudio {
  duration = 0;
  currentTime = 0;

  addEventListener(event: string, handler: () => void) {
    if (event === 'loadedmetadata') {
      setTimeout(handler, 0);
    }
  }

  removeEventListener() {}

  set src(_url: string) {
    this.duration = 10; // Default duration
  }

  play() {
    return Promise.resolve();
  }

  pause() {}

  load() {}
}

// Mock Worker
class MockWorker {
  onmessage: ((event: MessageEvent) => void) | null = null;
  onerror: ((error: ErrorEvent) => void) | null = null;

  constructor() {}

  postMessage() {
    // Mock worker response
    setTimeout(() => {
      if (this.onmessage) {
        this.onmessage({ data: { tempo: 120 } } as MessageEvent);
      }
    }, 0);
  }

  terminate() {}
}

// Mock URL.createObjectURL and revokeObjectURL
const mockCreateObjectURL = () => 'mock-url';
const mockRevokeObjectURL = () => {};

// Apply mocks to global scope
Object.defineProperty(globalThis, 'AudioContext', {
  writable: true,
  value: MockAudioContext,
});

Object.defineProperty(globalThis, 'webkitAudioContext', {
  writable: true,
  value: MockAudioContext,
});

// Also ensure AudioContext is available on window
Object.defineProperty(window, 'AudioContext', {
  writable: true,
  value: MockAudioContext,
});

Object.defineProperty(window, 'webkitAudioContext', {
  writable: true,
  value: MockAudioContext,
});

Object.defineProperty(globalThis, 'Audio', {
  writable: true,
  value: MockAudio,
});

Object.defineProperty(globalThis, 'Worker', {
  writable: true,
  value: MockWorker,
});

Object.defineProperty(globalThis, 'URL', {
  writable: true,
  value: {
    createObjectURL: mockCreateObjectURL,
    revokeObjectURL: mockRevokeObjectURL,
  },
});

// Mock navigator.serviceWorker
if (!navigator.serviceWorker) {
  Object.defineProperty(navigator, 'serviceWorker', {
    value: {
      register: () => Promise.resolve(),
    },
    writable: true,
  });
}

// Mock window.electronAPI
const mockElectronAPI = {
  onOpenAudioDialog: () => {},
  onAppendAudioDialog: () => {},
  showOpenDialog: () => Promise.resolve({ canceled: true, filePaths: [] }),
  readFile: () => Promise.resolve({ success: false }),
  checkForUpdates: () => Promise.resolve({ success: false }),
  onUpdateAvailable: () => {},
  onUpdateDownloaded: () => {},
  onDownloadProgress: () => {},
  installUpdate: () => {},
  isElectron: false,
  platform: 'test',
};

Object.defineProperty(window, 'electronAPI', {
  value: mockElectronAPI,
  writable: true,
});

// Mock localStorage
const mockLocalStorage = {
  getItem: (key: string) => {
    return mockLocalStorage.store[key] || null;
  },
  setItem: (key: string, value: string) => {
    mockLocalStorage.store[key] = value;
  },
  removeItem: (key: string) => {
    delete mockLocalStorage.store[key];
  },
  clear: () => {
    mockLocalStorage.store = {};
  },
  key: (index: number) => {
    const keys = Object.keys(mockLocalStorage.store);
    return keys[index] || null;
  },
  get length() {
    return Object.keys(mockLocalStorage.store).length;
  },
  store: {} as Record<string, string>,
};

Object.defineProperty(window, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
});

Object.defineProperty(global, 'localStorage', {
  value: mockLocalStorage,
  writable: true,
});
