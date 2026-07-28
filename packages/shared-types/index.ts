export type ManifestOrientation = "portrait" | "landscape" | "any";
export type ManifestControl = "touch" | "mouse" | "keyboard";

export type GameManifest = {
  schemaVersion: string;
  id: string;
  slug: string;
  title: string;
  shortDescription: string;
  description: string;
  version: string;
  author?: string;
  entry: string;
  cover: string;
  icon?: string;
  tags: string[];
  orientation: ManifestOrientation;
  controls: ManifestControl[];
  display?: {
    aspectRatio?: string;
    minWidth?: number;
    maxWidth?: number;
    supportsFullscreen?: boolean;
  };
  permissions?: {
    audio?: boolean;
    storage?: boolean;
    fullscreen?: boolean;
    networkDomains?: string[];
  };
  analytics?: { enabled?: boolean };
  adCapabilities?: {
    banner?: boolean;
    interstitial?: boolean;
    rewarded?: boolean;
  };
};

export type ValidationLevel = "ERROR" | "WARNING" | "INFO";

export type ValidationIssue = {
  code: string;
  level: ValidationLevel;
  file?: string;
  field?: string;
  message: string;
  current?: string;
  expected?: string;
  suggestion?: string;
  line?: number;
};

export type ValidationReport = {
  passed: boolean;
  errorCount: number;
  warningCount: number;
  infoCount: number;
  compressedSize: number;
  uncompressedSize: number;
  fileCount: number;
  manifest?: GameManifest;
  issues: ValidationIssue[];
};

export type BridgeSource = "panpan-game" | "panpan-host";

export type GameToHostType =
  | "GAME_READY"
  | "GAME_START"
  | "GAME_PAUSE"
  | "GAME_RESUME"
  | "GAME_END"
  | "SCORE_UPDATE"
  | "LEVEL_COMPLETE"
  | "GAME_ERROR"
  | "RESIZE_REQUEST"
  | "FULLSCREEN_REQUEST"
  | "AD_REQUEST";

export type HostToGameType =
  | "HOST_INIT"
  | "HOST_PAUSE"
  | "HOST_RESUME"
  | "AUDIO_CHANGE"
  | "AD_RESULT";

export type BridgeMessage<T extends string = string> = {
  source: BridgeSource;
  version: "1.0";
  type: T;
  payload?: Record<string, unknown>;
};
