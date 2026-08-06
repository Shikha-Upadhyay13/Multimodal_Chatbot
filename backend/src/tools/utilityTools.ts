import type { ToolDefinition } from "./index";

const getCurrentTime: ToolDefinition = {
  schema: {
    type: "function",
    function: {
      name: "get_current_time",
      description: "Get the current date and time.",
      parameters: { type: "object", properties: {}, required: [] },
    },
  },
  run: async () => new Date().toString(),
};

const calculatorSchema = {
  type: "object" as const,
  properties: {
    expression: {
      type: "string",
      description: "A basic arithmetic expression, e.g. '12 * (3 + 4)'",
    },
  },
  required: ["expression"],
};

const calculator: ToolDefinition = {
  schema: {
    type: "function",
    function: {
      name: "calculator",
      description: "Evaluate a basic arithmetic expression (+, -, *, /, parentheses).",
      parameters: calculatorSchema,
    },
  },
  run: async (args) => {
    const expression = String((args as { expression: string }).expression ?? "");
    if (!/^[\d\s+\-*/().]+$/.test(expression)) {
      return "Error: expression contains disallowed characters.";
    }
    try {
      // eslint-disable-next-line no-new-func
      const result = Function(`"use strict"; return (${expression});`)();
      return String(result);
    } catch {
      return "Error: could not evaluate that expression.";
    }
  },
};

export const utilityTools: ToolDefinition[] = [getCurrentTime, calculator];
