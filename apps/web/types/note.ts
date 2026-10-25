export interface Note {
  id: string;
  title: string;
  body: string;
  workspaceId?: string;
  revision?: number;
  createdAt: string;
  updatedAt: string;
}
