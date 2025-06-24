declare global {
  interface Window {
    electronAPI?: {
      onOpenAudioDialog: (callback: () => void) => void;
      onAppendAudioDialog: (callback: () => void) => void;
      showOpenDialog: (options?: {
        title?: string;
        defaultPath?: string;
        buttonLabel?: string;
        filters?: Array<{
          name: string;
          extensions: string[];
        }>;
        properties?: Array<
          | 'openFile'
          | 'openDirectory'
          | 'multiSelections'
          | 'showHiddenFiles'
          | 'createDirectory'
          | 'promptToCreate'
          | 'noResolveAliases'
          | 'treatPackageAsDirectory'
        >;
      }) => Promise<{ canceled: boolean; filePaths: string[] }>;
      readFile: (filePath: string) => Promise<{
        success: boolean;
        data?: number[];
        path?: string;
        name?: string;
        error?: string;
      }>;
      // Auto-updater APIs
      checkForUpdates: () => Promise<{
        success: boolean;
        result?: unknown;
        error?: string;
      }>;
      onUpdateAvailable: (
        callback: (info: {
          version: string;
          releaseNotes?: string;
          releaseName?: string;
          releaseDate: string;
        }) => void
      ) => void;
      onUpdateDownloaded: (
        callback: (info: {
          version: string;
          releaseNotes?: string;
          releaseName?: string;
          releaseDate: string;
        }) => void
      ) => void;
      onDownloadProgress: (
        callback: (progress: {
          bytesPerSecond: number;
          percent: number;
          transferred: number;
          total: number;
        }) => void
      ) => void;
      installUpdate: () => void;
      isElectron: boolean;
      platform: string;
    };
  }
}
