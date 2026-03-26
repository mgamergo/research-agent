import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { runAgent } from "./agent";

function slugify(value: string): string {
  return (
    value
      .toLowerCase()
      .trim()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "")
      .slice(0, 80) || "report"
  );
}

async function main(): Promise<void> {
  const query = process.argv.slice(2).join(" ").trim();

  if (!query) {
    console.error('Usage: bun run src/index.ts "your query"');
    process.exit(1);
  }

  const result = await runAgent(query);
  if (result.isSuccessful) {
      const outputDir = join(process.cwd(), "output");
      const outputFile = join(outputDir, `${slugify(query)}.md`);
    
      await mkdir(outputDir, { recursive: true });
      await Bun.write(outputFile, result.report);
      console.log(`\nSaved report to ${outputFile}`);
  } else {
    console.log("Generation Failed");
  }

}

main().catch((error: unknown) => {
  const message = error instanceof Error ? error.message : String(error);
  console.error(`Research agent failed: ${message}`);
  process.exit(1);
});
