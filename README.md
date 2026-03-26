# Research Agent

A CLI tool that researches any topic for you. Give it a query, it searches the web, reads the results, and writes a structured markdown report.

Built with Bun, TypeScript, and Gemma 3 via OpenRouter.

## How it works

The agent runs in a loop — it decides what to search, reads relevant pages, and keeps going until it has enough to write a report. No manual steps.

## Setup

```bash
bun install
```

Create a `.env` file in the root:

```
OPENROUTER_API_KEY=your_key_here
TAVILY_API_KEY=your_key_here
```

## Usage

```bash
bun run src/index.ts "convex vs pocketbase for realtime apps"
```

Reports are saved to the `output/` directory as markdown files.

## Stack

- Runtime: Bun
- Language: TypeScript
- Model: `google/gemma-3-12b-it` via OpenRouter
- Search: Tavily API
- Scraping: cheerio