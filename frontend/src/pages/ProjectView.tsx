import { useCallback, useEffect, useRef, useState } from "react";
import { ChatWindow } from "../components/chat/ChatWindow";
import { ConversationList } from "../components/layout/ConversationList";
import type { ProjectMeta, ProjectConversationMeta } from "../types/project.types";
import type { ChatMessage } from "../types/chat.types";
import {
  getProject,
  listProjectConversations,
  createProjectConversation,
  deleteProjectConversation,
  renameProjectConversation,
  getProjectMessages,
  streamProjectChat,
  uploadProjectDocument,
  listProjectDocuments,
  updateProjectInstructions,
  postTypingStatus,
} from "../api/projectsApi";
import { rememberProject } from "../utils/localProjectsStore";
import { useRemoteTurnStream } from "../hooks/useRemoteTurnStream";

export function ProjectView({ projectId }: { projectId: string }) {
  const [project, setProject] = useState<ProjectMeta | null>(null);
  const [notFound, setNotFound] = useState(false);
  const [conversations, setConversations] = useState<ProjectConversationMeta[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [initialMessages, setInitialMessages] = useState<ChatMessage[] | null>(null);
  const [copyLabel, setCopyLabel] = useState("Share");
  const [isEditingInstructions, setIsEditingInstructions] = useState(false);
  const [instructionsDraft, setInstructionsDraft] = useState("");
  const [isLocalStreaming, setIsLocalStreaming] = useState(false);
  const [historyVersion, setHistoryVersion] = useState(0);
  const hasInitialized = useRef(false);
  const participantId = useRef(crypto.randomUUID()).current;
  const typingIdleTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastTypingSentAt = useRef(0);
  const messagesRequestId = useRef(0);

  // Load the project + its conversation list once on mount.
  useEffect(() => {
    if (hasInitialized.current) return;
    hasInitialized.current = true;
    getProject(projectId)
      .then(async (p) => {
        setProject(p);
        rememberProject({ id: p.id, name: p.name });
        const convos = await listProjectConversations(projectId);
        if (convos.length === 0) {
          const fresh = await createProjectConversation(projectId);
          setConversations([fresh]);
          setActiveId(fresh.id);
        } else {
          setConversations(convos);
          setActiveId(convos[0].id);
        }
      })
      .catch(() => setNotFound(true));
  }, [projectId]);

  // Fetch this conversation's history whenever the active conversation changes.
  // Guarded by a request id in case activeId changes again before this resolves.
  useEffect(() => {
    if (!activeId) return;
    const requestId = ++messagesRequestId.current;
    getProjectMessages(projectId, activeId)
      .then((messages) => {
        if (messagesRequestId.current === requestId) setInitialMessages(messages as ChatMessage[]);
      })
      .catch(() => {
        if (messagesRequestId.current === requestId) setInitialMessages([]);
      });
  }, [projectId, activeId]);

  const refreshConversations = () => {
    listProjectConversations(projectId).then(setConversations).catch(() => {});
  };

  // Fired when another participant's turn settles (see useRemoteTurnStream). The fetch
  // must complete and populate `initialMessages` *before* historyVersion bumps — bumping
  // first would remount ChatWindow (its key includes historyVersion) with whatever
  // `initialMessages` still held at that instant, and useChatStream only seeds its state
  // from that prop once on mount, so an earlier bump would lock in stale (often empty) data.
  const handleRemoteTurnSettled = useCallback(() => {
    listProjectConversations(projectId).then(setConversations).catch(() => {});
    if (!activeId) return;
    const requestId = ++messagesRequestId.current;
    getProjectMessages(projectId, activeId)
      .then((messages) => {
        if (messagesRequestId.current !== requestId) return;
        setInitialMessages(messages as ChatMessage[]);
        setHistoryVersion((v) => v + 1);
      })
      .catch(() => {});
  }, [projectId, activeId]);

  const { remoteUserText, remoteAssistant, isRemoteStreaming, othersTyping } = useRemoteTurnStream(
    projectId,
    activeId ?? "",
    participantId,
    handleRemoteTurnSettled,
  );

  const handleComposerActivity = useCallback(() => {
    if (!activeId) return;
    const now = Date.now();
    if (now - lastTypingSentAt.current > 2000) {
      lastTypingSentAt.current = now;
      void postTypingStatus(projectId, activeId, participantId, true);
    }
    if (typingIdleTimer.current) clearTimeout(typingIdleTimer.current);
    typingIdleTimer.current = setTimeout(() => {
      void postTypingStatus(projectId, activeId, participantId, false);
    }, 3000);
  }, [projectId, activeId, participantId]);

  const handleNewChat = async () => {
    const fresh = await createProjectConversation(projectId);
    setConversations((prev) => [fresh, ...prev]);
    setActiveId(fresh.id);
  };

  const handleDeleteConversation = async (id: string) => {
    await deleteProjectConversation(projectId, id);
    const remaining = conversations.filter((c) => c.id !== id);
    if (id === activeId) {
      if (remaining.length > 0) {
        setActiveId(remaining[0].id);
        setConversations(remaining);
      } else {
        const fresh = await createProjectConversation(projectId);
        setConversations([fresh]);
        setActiveId(fresh.id);
        return;
      }
    } else {
      setConversations(remaining);
    }
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopyLabel("Copied!");
      setTimeout(() => setCopyLabel("Share"), 1500);
    });
  };

  const handleSaveInstructions = async () => {
    const updated = await updateProjectInstructions(projectId, instructionsDraft.trim() || null);
    setProject(updated);
    setIsEditingInstructions(false);
  };

  if (notFound) {
    return (
      <div className="app-shell">
        <div className="project-not-found">
          <h1>Project not found</h1>
          <p>This link doesn't point to a project that exists (or it was deleted).</p>
          <a href="/">← Back to my chats</a>
        </div>
      </div>
    );
  }

  if (!project || !activeId || initialMessages === null) {
    return (
      <div className="app-shell">
        <div className="project-loading">Loading project…</div>
      </div>
    );
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <a href="/" className="back-to-chats-link">
          ← My chats
        </a>
        <div className="sidebar-brand project-brand">{project.name}</div>
        <button type="button" className="new-chat-button" onClick={handleShare}>
          🔗 {copyLabel}
        </button>
        <button type="button" className="new-chat-button" onClick={handleNewChat}>
          <span className="new-chat-icon">+</span> New chat
        </button>

        <ConversationList
          conversations={conversations.map((c) => ({ id: c.id, title: c.title, createdAt: c.createdAt, updatedAt: c.updatedAt }))}
          activeId={activeId}
          onSelect={setActiveId}
          onDelete={handleDeleteConversation}
        />

        <div className="project-instructions-section">
          {isEditingInstructions ? (
            <>
              <textarea
                className="settings-textarea"
                value={instructionsDraft}
                onChange={(e) => setInstructionsDraft(e.target.value)}
                placeholder="Custom instructions applied to every chat in this project…"
              />
              <div className="new-project-actions">
                <button type="button" className="settings-toggle" onClick={() => setIsEditingInstructions(false)}>
                  Cancel
                </button>
                <button type="button" className="settings-toggle" data-on="true" onClick={handleSaveInstructions}>
                  Save
                </button>
              </div>
            </>
          ) : (
            <button
              type="button"
              className="project-instructions-button"
              onClick={() => {
                setInstructionsDraft(project.instructions ?? "");
                setIsEditingInstructions(true);
              }}
            >
              ✎ {project.instructions ? "Edit instructions" : "Add instructions"}
            </button>
          )}
        </div>
      </aside>

      <ChatWindow
        key={`${activeId}-${historyVersion}`}
        conversationId={activeId}
        initialMessages={initialMessages}
        streamFn={(cid, text) => streamProjectChat(projectId, cid, text)}
        uploadFn={(file) => uploadProjectDocument(projectId, file)}
        listDocsFn={() => listProjectDocuments(projectId)}
        onTitleGenerated={(title) => {
          renameProjectConversation(projectId, activeId, title).then(refreshConversations);
        }}
        onTurnComplete={refreshConversations}
        onStreamingChange={setIsLocalStreaming}
        onComposerActivity={handleComposerActivity}
        topBanner={othersTyping ? <div className="typing-indicator-bar">Someone is typing…</div> : null}
        // Two people sending at once: runExclusive already serializes on the backend, so
        // this tab's own pending send (isLocalStreaming) takes priority — it does not also
        // render someone else's concurrent live turn while queued behind it (accepted v1
        // limitation; see plan notes).
        extraMessages={
          isRemoteStreaming && !isLocalStreaming
            ? [
                ...(remoteUserText !== null
                  ? [{ id: "remote-user", role: "user" as const, text: remoteUserText, reasoningSteps: [] }]
                  : []),
                ...(remoteAssistant ? [remoteAssistant] : []),
              ]
            : []
        }
      />
    </div>
  );
}
