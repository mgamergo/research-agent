import { AgentResult, LLMResponse, Message, OnEvent } from "./types";
import { search, scrape } from "./tools";

export const runAgent = async (
  query: string,
  onEvent?: OnEvent,
): Promise<AgentResult> => {
  const emit = onEvent ?? (() => {});
  const messages: Message[] = [];
  const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY;
  const MAX_ITERATIONS = process.env.MAX_ITERATIONS
    ? parseInt(process.env.MAX_ITERATIONS)
    : 5;
  const system = process.env.SYSTEM_PROMPT;
  const model = process.env.MODEL;

  if (!OPENROUTER_API_KEY || !system || !model) {
    console.error("API key, system prompt, or model is missing");
    return {
      query,
      report: "API key, system prompt, or model is missing. Please add them.",
      isSuccessful: false,
    };
  }

  // 1. push the system prompt and initial user query into messages
  messages.push({
    role: "system",
    content: system,
  });

  messages.push({
    role: "user",
    content: query,
  });

  console.log("Agent Loop starting with query: ", query);
  for (let i = 0; i < MAX_ITERATIONS; i++) {
    console.log(`Iteration ${i + 1} of ${MAX_ITERATIONS}`);
    emit({
      type: "iteration",
      data: { iteration: i + 1, maxIterations: MAX_ITERATIONS },
    });

    // 2. call the LLM with messages + system prompt
    emit({ type: "thinking", data: { message: "Thinking..." } });
    const response = await fetch(
      "https://openrouter.ai/api/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${OPENROUTER_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model,
          messages,
        }),
      },
    );

    // 3. parse the response as JSON
    const unparsedData = await response.json();
    if (!unparsedData.choices || !unparsedData.choices[0]?.message?.content) {
      console.error("Bad response from LLM, retrying...");
      continue;
    }
    const raw = unparsedData.choices[0].message.content;
    const cleaned = raw.replace(/```json|```/g, "").trim();
    const data: LLMResponse = JSON.parse(cleaned);
    messages.push({
      role: "assistant",
      content: unparsedData.choices[0].message.content,
    });

    // 4. if it has tool_calls → run each tool, push results into messages, continue
    if (data?.tool_call && data.tool_call.length > 0) {
      const toolCalls = data.tool_call;
      for (let j = 0; j < toolCalls.length; j++) {
        const tool = toolCalls[j];
        if (tool.tool_name === "search") {
          console.log(`Calling search tool with input: ${tool.input}`);
          emit({
            type: "tool_call",
            data: { tool: "search", input: tool.input },
          });
          const toolCallRes = await search(tool.input);
          emit({
            type: "tool_result",
            data: { tool: "search", input: tool.input },
          });
          messages.push({
            role: "user",
            content: `Tool result for "${tool.tool_name}": ${JSON.stringify(toolCallRes)}`,
          });
        } else if (tool.tool_name === "scrape") {
          console.log(`Calling scrape tool with input: ${tool.input}`);
          emit({
            type: "tool_call",
            data: { tool: "scrape", input: tool.input },
          });
          const toolCallRes = await scrape(tool.input);
          emit({
            type: "tool_result",
            data: { tool: "scrape", input: tool.input },
          });
          messages.push({
            role: "user",
            content: `Tool result for "${tool.tool_name}": ${JSON.stringify(toolCallRes)}`,
          });
        }
      }
    }
    // 5. if it has final_response → return AgentResult
    if (data?.final_response) {
      const result = { query, report: data.final_response, isSuccessful: true };
      emit({ type: "done", data: result });
      return result;
    }
  }

  // 6. fallback if max iterations hit without a final_response
  const result = {
    query,
    report: "Max iterations reached without a final response.",
    isSuccessful: false,
  };
  emit({ type: "error", data: result });
  return result;
};
