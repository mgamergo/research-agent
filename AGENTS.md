# Research Agent — Project Spec

## Stack

| Layer    | Tool                                      |
| -------- | ----------------------------------------- |
| Runtime  | Bun                                       |
| Language | TypeScript                                |
| AI       | OpenRouter → `google/gemma-3-12b-it:free` |
| Search   | Tavily API (free tier)                    |
| Scraping | `cheerio`                                 |
| Output   | Markdown files saved to `/output`         |

---

## Project Rules

1. **No frontend.** This is a CLI tool. Entry point is `bun run src/index.ts "your query"`.

2. **One model, one provider.** google/gemma-3-27b-it:free via OpenRouter. No fallbacks for now — keep it simple.

3. **Tools are just functions.** `search()` and `scrape()` are plain async TypeScript functions. The agent decides when to call them.

4. **Agent loop has a max iteration cap.** Stop at 5 iterations max to avoid infinite loops and burning free API quota.

5. **Every report gets saved.** Output goes to `/output/<slugified-query>.md` automatically. Never just print and forget.

6. **No premature abstraction.** Don't over-engineer. Get it working first, clean it up later.

7. **`.env` holds all secrets.** `OPENROUTER_API_KEY` and `TAVILY_API_KEY`. Never hardcode.

8. **Types live in `types.ts`.** Any shared interface or type — don't scatter them across files.

---

## File Responsibilities

```
src/index.ts   → parse CLI args, kick off agent, save output
src/agent.ts   → the agent loop (think → tool call → observe → repeat)
src/tools.ts   → search() and scrape() implementations
src/types.ts   → shared types (Message, ToolCall, AgentResult, etc.)
output/        → saved markdown reports
```

---

## Agent Loop (concept)

```
user query
   ↓
[system prompt + tools description] → LLM
   ↓
LLM decides: call a tool OR give final answer
   ↓ (if tool call)
run the tool → feed result back to LLM
   ↓
repeat (max 5x)
   ↓
final answer → save as markdown
```
