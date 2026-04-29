export interface Hotkeys {
  region: string;
  active_window: string;
}

export interface Settings {
  version: number;
  hotkeys: Hotkeys;
  launch_at_startup: boolean;
}

export interface PingResponse {
  version: string;
  name: string;
}
