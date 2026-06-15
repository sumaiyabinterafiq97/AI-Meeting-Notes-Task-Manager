// UI state store — will use React Context or Zustand in auth feature

export interface AppState {
  sidebarOpen: boolean;
  activeWorkspaceId: string | null;
}

export const initialAppState: AppState = {
  sidebarOpen: true,
  activeWorkspaceId: null,
};
