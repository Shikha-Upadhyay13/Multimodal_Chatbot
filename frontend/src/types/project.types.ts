export interface ProjectMeta {
  id: string;
  name: string;
  instructions: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface ProjectConversationMeta {
  id: string;
  projectId: string;
  title: string;
  createdAt: number;
  updatedAt: number;
}
