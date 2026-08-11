/**
 * A locally-remembered convenience list of projects this browser has created/opened —
 * NOT the source of truth (that's always the backend, by project id). There's
 * deliberately no "list all projects" backend endpoint: with no auth, that would let
 * anyone enumerate every project ever created, defeating the whole "you need the link"
 * privacy model. Opening a link cold (a project this browser has never seen) still works
 * fine by fetching directly from the backend.
 */
export interface RecentProject {
  id: string;
  name: string;
}

const KEY = "chatbot:recentProjects";

export function listRecentProjects(): RecentProject[] {
  try {
    const raw = localStorage.getItem(KEY);
    return raw ? (JSON.parse(raw) as RecentProject[]) : [];
  } catch {
    return [];
  }
}

export function rememberProject(project: RecentProject): void {
  try {
    const all = listRecentProjects().filter((p) => p.id !== project.id);
    all.unshift(project);
    localStorage.setItem(KEY, JSON.stringify(all));
  } catch (err) {
    console.warn("Failed to remember project in localStorage:", err);
  }
}

export function forgetProject(id: string): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(listRecentProjects().filter((p) => p.id !== id)));
  } catch (err) {
    console.warn("Failed to remove project from localStorage:", err);
  }
}
