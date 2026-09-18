import { documentDownloadUrls } from "../api/base";
import type { ChatMessage, ReasoningStep } from "../types/chat.types";

export interface NextMove {
  label: string;
  prompt: string;
}

const TOOL_COPY: Record<string, { gerund: string; done: string }> = {
  get_current_time: { gerund: "Checking the clock", done: "Checked the clock" },
  calculator: { gerund: "Crunching numbers", done: "Crunched the numbers" },
  web_search: { gerund: "Searching the live web", done: "Searched the live web" },
  fetch_url: { gerund: "Reading a page", done: "Read a page" },
  generate_image: { gerund: "Painting an image", done: "Painted an image" },
  search_documents: { gerund: "Searching your files", done: "Searched your files" },
  read_document: { gerund: "Reading a document", done: "Read a document" },
  create_word_document: { gerund: "Writing a Word file", done: "Wrote a Word file" },
  create_excel_document: { gerund: "Building a spreadsheet", done: "Built a spreadsheet" },
  create_pptx_document: { gerund: "Designing a deck", done: "Designed a deck" },
  create_pdf_document: { gerund: "Composing a PDF", done: "Composed a PDF" },
  edit_excel_document: { gerund: "Updating the spreadsheet", done: "Updated the spreadsheet" },
  edit_pdf_document: { gerund: "Updating the PDF", done: "Updated the PDF" },
};

export function toolStepCopy(name: string, done: boolean): string {
  const copy = TOOL_COPY[name];
  if (!copy) return done ? `Used ${name}` : `Using ${name}…`;
  return done ? copy.done : `${copy.gerund}…`;
}

export function planSteps(steps: ReasoningStep[]): Extract<ReasoningStep, { kind: "chatter" }>[] {
  return steps.filter((step): step is Extract<ReasoningStep, { kind: "chatter" }> => step.kind === "chatter");
}

export function toolSteps(steps: ReasoningStep[]): Extract<ReasoningStep, { kind: "tool" }>[] {
  return steps.filter((step): step is Extract<ReasoningStep, { kind: "tool" }> => step.kind === "tool");
}

export function nextMovesFor(message: ChatMessage): NextMove[] {
  const tools = [...new Set(toolSteps(message.reasoningSteps).map((step) => step.name))];
  const hasFile = documentDownloadUrls(message.text).length > 0;
  const moves: NextMove[] = [];

  const add = (label: string, prompt: string) => {
    if (!moves.some((move) => move.label === label)) moves.push({ label, prompt });
  };

  if (tools.includes("web_search") || tools.includes("fetch_url")) {
    add("Save as a briefing", "Turn what you just found into a one-page Word briefing with sources and a download link. Don't recap it in chat.");
  }
  if (tools.includes("search_documents") || tools.includes("read_document")) {
    add("Make a summary deck", "Create a short PowerPoint that captures only the facts you actually found in the uploaded files.");
  }
  if (tools.includes("create_excel_document") || tools.includes("edit_excel_document")) {
    add("PDF one-pager", "Make a one-page PDF of the same numbers, as a clean summary table, and give me the download link.");
    add("Add a second scenario", "Edit the spreadsheet: add another sheet with a more optimistic version of the same figures.");
  }
  if (tools.includes("create_pptx_document")) {
    add("Matching one-pager", "Write a one-page Word version of that deck — same story, denser, with a download link.");
  }
  if (tools.includes("create_word_document") || tools.includes("create_pdf_document")) {
    add("Turn it into slides", "Turn that document into a 5-slide PowerPoint. Keep the specifics; skip generic filler.");
  }
  if (tools.includes("generate_image")) {
    add("Drop it on a slide", "Create a one-slide PowerPoint that features the image you just generated, with a short caption.");
  }
  if (hasFile && tools.includes("calculator")) {
    add("Put the math in Excel", "Put those calculations into a small Excel file with labels and the download link.");
  }

  return moves.slice(0, 3);
}
