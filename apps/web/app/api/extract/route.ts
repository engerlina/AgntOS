import mammoth from "mammoth";
import { NextResponse } from "next/server";
import { extractText, getDocumentProxy } from "unpdf";

import { getSession } from "@/lib/session";

export const maxDuration = 30;

const MAX_BYTES = 12 * 1024 * 1024; // 12 MB
const MAX_CHARS = 200_000; // keep the prompt sane

/**
 * Extract plain text from an uploaded PDF or Word (.docx) document so the chat
 * can feed it to the agent (the agent's API has no file endpoint). Auth'd by the
 * AgntOS session; nothing is stored.
 */
export async function POST(req: Request) {
  const session = await getSession();
  if (!session?.user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "No file" }, { status: 400 });
  if (file.size > MAX_BYTES) {
    return NextResponse.json({ error: "File too large (max 12 MB)." }, { status: 413 });
  }

  const name = file.name || "document";
  const lower = name.toLowerCase();
  const buf = await file.arrayBuffer();

  try {
    let text = "";
    if (file.type === "application/pdf" || lower.endsWith(".pdf")) {
      const pdf = await getDocumentProxy(new Uint8Array(buf));
      const res = await extractText(pdf, { mergePages: true });
      text = Array.isArray(res.text) ? res.text.join("\n") : res.text;
    } else if (lower.endsWith(".docx") || file.type.includes("wordprocessingml")) {
      const out = await mammoth.extractRawText({ buffer: Buffer.from(buf) });
      text = out.value;
    } else {
      return NextResponse.json({ error: "Unsupported file type." }, { status: 415 });
    }

    text = text.trim();
    if (!text) return NextResponse.json({ error: "No readable text in that document." }, { status: 422 });
    if (text.length > MAX_CHARS) text = `${text.slice(0, MAX_CHARS)}\n\n…(truncated)`;
    return NextResponse.json({ name, text });
  } catch (e) {
    return NextResponse.json({ error: "Couldn't read that document.", detail: String(e) }, { status: 500 });
  }
}
