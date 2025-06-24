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
      isElectron: boolean;
      platform: string;
    };
  }
}
