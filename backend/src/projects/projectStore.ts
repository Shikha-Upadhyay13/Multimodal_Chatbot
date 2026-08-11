import { randomUUID } from "node:crypto";
import { db } from "../storage/db";

db.exec(`
  CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    instructions TEXT,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );
  CREATE TABLE IF NOT EXISTS project_conversations (
    id TEXT PRIMARY KEY,
    project_id TEXT NOT NULL REFERENCES projects(id),
    title TEXT NOT NULL,
    created_at INTEGER NOT NULL,
    updated_at INTEGER NOT NULL
  );
`);

export interface Project {
  id: string;
  name: string;
  instructions: string | null;
  createdAt: number;
  updatedAt: number;
}

export interface ProjectConversation {
  id: string;
  projectId: string;
  title: string;
  createdAt: number;
  updatedAt: number;
}

export function createProject(name: string, instructions?: string): Project {
  const project: Project = {
    id: randomUUID(),
    name,
    instructions: instructions?.trim() || null,
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  db.prepare(
    "INSERT INTO projects (id, name, instructions, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
  ).run(project.id, project.name, project.instructions, project.createdAt, project.updatedAt);
  return project;
}

export function getProject(id: string): Project | undefined {
  const row = db
    .prepare(
      "SELECT id, name, instructions, created_at as createdAt, updated_at as updatedAt FROM projects WHERE id = ?",
    )
    .get(id) as Project | undefined;
  return row;
}

export function updateProjectInstructions(id: string, instructions: string | null): void {
  db.prepare("UPDATE projects SET instructions = ?, updated_at = ? WHERE id = ?").run(
    instructions?.trim() || null,
    Date.now(),
    id,
  );
}

export function listProjectConversations(projectId: string): ProjectConversation[] {
  return db
    .prepare(
      "SELECT id, project_id as projectId, title, created_at as createdAt, updated_at as updatedAt " +
        "FROM project_conversations WHERE project_id = ? ORDER BY updated_at DESC",
    )
    .all(projectId) as ProjectConversation[];
}

export function createProjectConversation(projectId: string): ProjectConversation {
  const conversation: ProjectConversation = {
    id: randomUUID(),
    projectId,
    title: "New chat",
    createdAt: Date.now(),
    updatedAt: Date.now(),
  };
  db.prepare(
    "INSERT INTO project_conversations (id, project_id, title, created_at, updated_at) VALUES (?, ?, ?, ?, ?)",
  ).run(conversation.id, conversation.projectId, conversation.title, conversation.createdAt, conversation.updatedAt);
  return conversation;
}

export function getProjectConversation(conversationId: string): ProjectConversation | undefined {
  return db
    .prepare(
      "SELECT id, project_id as projectId, title, created_at as createdAt, updated_at as updatedAt " +
        "FROM project_conversations WHERE id = ?",
    )
    .get(conversationId) as ProjectConversation | undefined;
}

export function renameProjectConversation(conversationId: string, title: string): void {
  db.prepare("UPDATE project_conversations SET title = ?, updated_at = ? WHERE id = ?").run(
    title,
    Date.now(),
    conversationId,
  );
}

export function touchProjectConversation(conversationId: string): void {
  db.prepare("UPDATE project_conversations SET updated_at = ? WHERE id = ?").run(Date.now(), conversationId);
}

export function deleteProjectConversation(conversationId: string): void {
  db.prepare("DELETE FROM project_messages WHERE conversation_id = ?").run(conversationId);
  db.prepare("DELETE FROM project_conversations WHERE id = ?").run(conversationId);
}
