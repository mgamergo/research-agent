export interface Message {
  role: "user" | "assistant" | "tool" | "system";
  content: string;
}

export interface Tool {
  name: string;
  parameters: Record<string, string>;
}

export interface AgentResult {
  query: string;
  report: string;
  isSuccessful: boolean;
}

export interface ToolCall {
  tool_name: string;
  input: string;
}

export interface LLMResponse {
  tool_call?: ToolCall[];
  final_response: string;
}
