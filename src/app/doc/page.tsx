import { promises as fs } from "fs";
import path from "path";
import { marked } from "marked";

// Internal product/dev notes, rendered from docs/PRODUCT.md. No navigation entry on purpose: /doc is for us.
export const dynamic = "force-static";

export default async function Doc() {
  const md = await fs.readFile(path.join(process.cwd(), "docs", "PRODUCT.md"), "utf8");
  const html = await marked.parse(md);
  return (
    <main className="mx-auto max-w-3xl px-5 py-10">
      <article className="doc" dangerouslySetInnerHTML={{ __html: html }} />
    </main>
  );
}
