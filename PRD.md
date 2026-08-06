# PRD — Personal AI Chatbot (Built From Scratch, $0 Stack)

## 1. Overview

A personal, self-built AI chatbot — functionally similar to ChatGPT / Claude / Groq's chat UI — that the user owns end-to-end instead of relying on a public product. It answers general questions, calls tools, understands uploaded documents of any common type (PDF, Excel, PowerPoint, images), creates and edits documents, and supports talking to it by voice. The build must cost **$0** and must be understandable "from scratch": every core mechanic (the agent loop, retrieval, document generation) should be hand-rolled and inspectable rather than delegated to an opaque framework.

## 2. Problem Statement / Motivation

The user wants to genuinely **learn how a chatbot like ChatGPT/Claude is actually built** — the request calling loop, tool-calling, retrieval-augmented generation (RAG), document generation, and voice I/O — rather than assembling someone else's SaaS building blocks. A secondary, standing motivation is having a **personal** assistant they fully control (their own data, their own logic, no dependence on a public product's limits or policies). Every design decision in this project should be weighed against "does this teach the mechanism, and is it still free" before "is this the fastest way to ship."

## 3. Goals

- **G1.** Working general-purpose chat (any topic), powered by an LLM API.
- **G2.** The model can call tools (functions) that the backend executes and feeds results back into — a real agentic loop, not a single request/response.
- **G3.** The user can upload a file — image, `.xlsx`, `.pptx`, `.pdf` (and `.docx`) — and ask questions about it; the bot retrieves and grounds its answer in the file's actual content (RAG).
- **G4.** The bot can create and edit documents (Word, Excel, PowerPoint, PDF) as an action it takes, not just describe how to.
- **G5.** The user can press a mic icon and have a spoken conversation with the bot (voice in, voice out).
- **G6.** The entire system runs at **$0 cost** — no paid API tiers, no credit card, anywhere in the stack.
- **G7.** The implementation is simple enough that the user can read and understand every core mechanism (agent loop, retrieval, tool dispatch) — this rules out heavy agent frameworks (e.g. LangChain/LangGraph) by default.
- **G8.** Buildable and testable **incrementally**, in independent phases, so learning and verification happen step by step rather than as one big-bang integration.

## 4. Non-Goals (out of scope for this build)

- Multi-user accounts, auth, or a publicly hosted/shared deployment — this is a **personal, single-user** tool run locally.
- Full-duplex, continuous low-latency voice (like paid "advanced voice mode" products) — free STT/TTS is inherently turn-based (record → transcribe → respond → speak).
- True in-place binary editing of arbitrary existing `.docx`/`.pptx` files — free tooling can't reliably do this; "editing" those formats means read-content → regenerate-file (this PRD treats that as acceptable and expected, not a gap to fix later).
- Large-scale/production vector search (HNSW indexes, sharding, etc.) — acceptable for a personal document library (dozens–low thousands of chunks); noted as a future upgrade path, not a v1 requirement.
- Any paid add-on for "more natural" voice (e.g., ElevenLabs, Groq's own PlayAI TTS) — explicitly excluded by the cost constraint.

## 5. Target User / Persona

Single persona: **the builder is the end user.** A developer who wants a private daily-driver chatbot and, in parallel, a working reference implementation they built and understand themselves. No other end users, no permissions model, no multi-tenancy.

## 6. Functional Requirements

### 6.1 Core Chat
- FR-1: User sends a text message; bot responds, streamed token-by-token (not a wait-then-dump).
- FR-2: Conversation history is maintained per session so follow-up questions have context.
- FR-3: Bot can answer general-knowledge questions on any topic (bounded by the underlying LLM's knowledge/capability).

### 6.2 Tool Calling (Agentic Loop)
- FR-4: The model can be offered a set of callable tools (JSON-schema function definitions) and can choose to invoke one or more per turn.
- FR-5: The backend executes the requested tool(s) with the model-supplied arguments and returns results to the model, which continues reasoning until it produces a final answer (multi-round tool use, not just one call).
- FR-6: A safety cap on loop iterations prevents runaway tool-calling.
- FR-7: The frontend visibly indicates when a tool is being called (transparency into the mechanism is a stated learning goal, not just a UX nicety).

### 6.3 Document Understanding (RAG)
- FR-8: User can upload a file of type PDF, DOCX, XLSX, PPTX, or a common image format (PNG/JPG).
- FR-9: Uploaded documents are parsed to text, split into chunks, embedded, and stored so they can be searched later.
- FR-10: When the user asks a question, the bot can retrieve the most relevant chunks from previously uploaded documents and ground its answer in them (via a tool call, not a hidden side-channel — consistent with FR-4/5).
- FR-11: For images specifically, the bot can either describe/answer questions about the image directly (vision) or extract literal text from it (OCR) when that text needs to be indexed for later search.
- FR-12: Answers grounded in a document should not hallucinate facts not present in the source when the retrieved chunks don't support them.

### 6.4 Document Creation & Editing
- FR-13: User can ask the bot to generate a new Word document, Excel spreadsheet, PowerPoint deck, or PDF, with content it authors (e.g., a summary, a report, a table).
- FR-14: User can ask the bot to modify an existing Excel spreadsheet or PDF in place (true load-modify-save).
- FR-15: For Word/PowerPoint, "editing" is satisfied via parse-existing-content → produce revised content → regenerate a new file (documented limitation, see Non-Goals).
- FR-16: Generated/edited files are downloadable from the chat UI.

### 6.5 Voice Interface
- FR-17: A mic button lets the user record a spoken message.
- FR-18: Recorded audio is transcribed to text and fed through the same chat/tool/RAG pipeline as typed input (voice is an input method, not a separate feature path).
- FR-19: The bot's text response is read aloud automatically once ready.

## 7. Non-Functional Requirements

- NFR-1 (**Cost**): $0 total. No component may require billing/a credit card, including at scale of normal personal use.
- NFR-2 (**Transparency/educational value**): Core mechanics (agent loop, retrieval, tool dispatch) must be plain, readable, hand-rolled code — a learner should be able to read the loop top to bottom and understand it, not need to reverse-engineer a framework.
- NFR-3 (**Latency**): Text chat should stream incrementally rather than block. Voice turns are expected to have ~1-3s added round-trip latency (acceptable per Non-Goals).
- NFR-4 (**Reliability of tool loop**): Malformed tool-call arguments from the model must not crash the server (parse defensively).
- NFR-5 (**Portability**): Runs on the user's own machine (Windows), no external server/hosting required.
- NFR-6 (**Incremental verifiability**): Each build phase must be independently testable without requiring later phases to exist.

## 8. Technical Architecture (decided)

**Stack:** Node.js + TypeScript (Express) backend, React + TypeScript frontend, **Groq API** (free tier) as the LLM provider.

**Component decisions:**

| Concern | Choice | Why |
|---|---|---|
| LLM + tool calling | `groq-sdk`; `llama-3.3-70b-versatile` (chat/tools), `llama-4-scout-17b-16e-instruct` (vision), `whisper-large-v3-turbo` (STT) | OpenAI-compatible API, free tier, tool-calling + vision + STT in one provider |
| Agentic loop | Hand-rolled loop in `agent/agentLoop.ts` | No framework — this loop is the core thing being learned |
| Embeddings | `@huggingface/transformers`, `Xenova/all-MiniLM-L6-v2` (local, ONNX, ~90MB, CPU, no API key) | Groq has no embeddings endpoint; stays inside one `npm install`, no extra service |
| Vector store | Hand-rolled cosine similarity, persisted via `better-sqlite3` | Readable, fine at personal scale; documented upgrade path to `hnswlib-node`/`sqlite-vec` |
| PDF parsing | `pdf-parse` | Simple text extraction |
| Excel parse+write | `exceljs` | One library for read and write |
| PPTX parsing | `officeparser` | Best-maintained free PPTX text extractor |
| DOCX parsing | `mammoth` | Clean OOXML→text |
| Image understanding | Groq vision model (semantic Q&A) + `tesseract.js` (OCR, only when text needs indexing) | Avoids redundant free-tier requests |
| Word generation | `docx` | Declarative doc-building |
| Excel generation/editing | `exceljs` | True load-modify-save |
| PPTX generation | `pptxgenjs` | Standard free deck-builder |
| PDF generation/editing | `pdf-lib` | Only free lib that both creates and edits existing PDFs |
| STT | Groq `whisper-large-v3-turbo` | Inspectable real HTTP call, free tier, cross-browser (vs. Chrome-only `SpeechRecognition`) |
| TTS | Browser `window.speechSynthesis` | Groq TTS is paid-only; browser TTS is free but more robotic — accepted tradeoff |

**Folder structure, request lifecycles, and phased build order:** see the approved implementation plan at `C:\Users\Sheetal\.claude\plans\fuzzy-bubbling-kahn.md` (mirrored into this repo's `/docs` if the user wants it version-controlled — not yet copied).

## 9. Acceptance Criteria (per phase)

- **Phase 1 (core loop):** A typed question with no tool need gets a streamed answer. A question requiring a trivial tool (e.g. "what time is it?") triggers a visible tool call, correct result, and correct final answer.
- **Phase 2 (RAG):** Uploading one file of each supported type and asking a fact only present in that file returns a correct, grounded answer; a question unrelated to any upload does not falsely trigger retrieval or hallucinate a source.
- **Phase 3 (doc gen/editing):** Requesting a Word doc, an Excel edit, a PPTX deck, and a PDF report each produces a file that opens correctly in its native application.
- **Phase 4 (voice):** Pressing the mic, speaking a question, produces an accurate transcript, a correct pipeline response (including tool/RAG paths if triggered), and an audible spoken reply.

## 10. Risks & Known Limitations

- Groq free tier is rate-limited (~30 req/min, ~1,000 req/day for chat; ~20 req/min, 2,000/day for Whisper) — a tool-heavy chat turn consumes multiple requests per user message.
- Groq's own TTS is paid-only and is excluded; browser TTS is the accepted free substitute despite lower voice naturalness.
- Local embedding model has a one-time ~90MB download and cold-start load time.
- DOCX/PPTX "editing" is read+regenerate, not true in-place editing (see Non-Goals).
- Voice is turn-based, not continuous/full-duplex.
- Hand-rolled linear vector search doesn't scale past a personal-sized document library without a later upgrade.

## 11. Future Enhancements (explicitly deferred)

- Swap hand-rolled vector search for `hnswlib-node` or `sqlite-vec` if the document library grows large.
- Self-hosted `Piper` TTS for more natural free speech output (adds a native binary dependency, deferred from v1).
- Multi-user support / hosted deployment (currently a non-goal).

## 12. Open Questions

- None blocking Phase 1 — all decisions above were confirmed with the user. Revisit "Future Enhancements" once Phase 1-4 are complete and in use.

---
*This PRD reflects requirements gathered directly from the user across this conversation and the architecture plan they approved. It supersedes prior informal notes; the linked plan file remains the implementation-level detail reference.*
