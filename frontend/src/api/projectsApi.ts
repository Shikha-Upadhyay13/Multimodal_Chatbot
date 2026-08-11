import type { ServerEvent, ReasoningStep } from "../types/chat.types";
import type { ProjectMeta, ProjectConversationMeta } from "../types/project.types";
import type { UploadedDoc } from "./uploadApi";
import { streamSSEPost } from "./sseStream";

const API_BASE = import.meta.env.VITE_API_BASE ?? "http://localhost:3001";

async function asJson<T>(res: Response): Promise<T> {
  const data = await res.json();
  if (!res.ok) throw new Error(data.error ? JSON.stringify(data.error) : `Request failed: ${res.status}`);
  return data as T;
}

export async function createProject(name: string, instructions?: string): Promise<ProjectMeta> {
  const res = await fetch(`${API_BASE}/api/projects`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, instructions }),
  });
  return asJson<ProjectMeta>(res);
}

export async function getProject(id: string): Promise<ProjectMeta> {
  const res = await fetch(`${API_BASE}/api/projects/${id}`);
  return asJson<ProjectMeta>(res);
}

export async function updateProjectInstructions(id: string, instructions: string | null): Promise<ProjectMeta> {
  const res = await fetch(`${API_BASE}/api/projects/${id}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ instructions }),
  });
  return asJson<ProjectMeta>(res);
}

export async function listProjectConversations(projectId: string): Promise<ProjectConversationMeta[]> {
  const res = await fetch(`${API_BASE}/api/projects/${projectId}/conversations`);
  return asJson<ProjectConversationMeta[]>(res);
}

export async function createProjectConversation(projectId: string): Promise<ProjectConversationMeta> {
  const res = await fetch(`${API_BASE}/api/projects/${projectId}/conversations`, { method: "POST" });
  return asJson<ProjectConversationMeta>(res);
}

export async function deleteProjectConversation(projectId: string, conversationId: string): Promise<void> {
  await fetch(`${API_BASE}/api/projects/${projectId}/conversations/${conversationId}`, { method: "DELETE" });
}

export async function renameProjectConversation(projectId: string, conversationId: string, title: string): Promise<void> {
  await fetch(`${API_BASE}/api/projects/${projectId}/conversations/${conversationId}`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ title }),
  });
}

export interface ProjectDisplayMessage {
  id: string;
  role: "user" | "assistant";
  text: string;
  reasoningSteps: ReasoningStep[];
}

export async function getProjectMessages(projectId: string, conversationId: string): Promise<ProjectDisplayMessage[]> {
  const res = await fetch(`${API_BASE}/api/projects/${projectId}/conversations/${conversationId}/messages`);
  return asJson<ProjectDisplayMessage[]>(res);
}

export function streamProjectChat(projectId: string, conversationId: string, message: string): AsyncGenerator<ServerEvent> {
  return streamSSEPost(`${API_BASE}/api/projects/${projectId}/conversations/${conversationId}/messages`, { message });
}

export async function uploadProjectDocument(projectId: string, file: File): Promise<UploadedDoc> {
  const formData = new FormData();
  formData.append("file", file);
  const res = await fetch(`${API_BASE}/api/projects/${projectId}/upload`, { method: "POST", body: formData });
  return asJson<UploadedDoc>(res);
}

export async function listProjectDocuments(projectId: string): Promise<UploadedDoc[]> {
  const res = await fetch(`${API_BASE}/api/projects/${projectId}/documents`);
  return asJson<UploadedDoc[]>(res);
}
