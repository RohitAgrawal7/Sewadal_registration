import { NextRequest, NextResponse } from "next/server";
import { writeFile, mkdir, readdir, unlink } from "fs/promises";
import path from "path";

function slugifyName(name: string) {
  const slug = name
    .trim()
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 60);
  return slug || "member";
}

function extensionFor(file: File) {
  const fromName = path.extname(file.name).toLowerCase();
  if (fromName && fromName.length <= 5) return fromName;
  if (file.type === "application/pdf") return ".pdf";
  if (file.type === "image/png") return ".png";
  if (file.type === "image/webp") return ".webp";
  if (file.type === "image/gif") return ".gif";
  return ".jpg";
}

export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const file = formData.get("file");
    const kindRaw = String(formData.get("kind") || "photo");
    const kind = kindRaw === "identity" ? "identity" : "photo";
    const memberName = String(formData.get("name") || "").trim();
    const memberId = String(formData.get("memberId") || "").trim();

    if (!file || !(file instanceof File)) {
      return NextResponse.json({ error: "No file provided" }, { status: 400 });
    }

    if (!memberName) {
      return NextResponse.json(
        { error: "Enter the member name before uploading" },
        { status: 400 }
      );
    }

    if (kind === "photo" && !file.type.startsWith("image/")) {
      return NextResponse.json(
        { error: "Profile photo must be an image" },
        { status: 400 }
      );
    }

    if (
      kind === "identity" &&
      !file.type.startsWith("image/") &&
      file.type !== "application/pdf"
    ) {
      return NextResponse.json(
        { error: "Identity doc must be an image or PDF" },
        { status: 400 }
      );
    }

    if (file.size > 8 * 1024 * 1024) {
      return NextResponse.json(
        { error: "File must be under 8MB" },
        { status: 400 }
      );
    }

    const slug = slugifyName(memberName);
    const idPart = memberId ? `-${memberId.slice(0, 8)}` : "";
    const base = `${slug}${idPart}-${kind}`;
    const ext = extensionFor(file);
    const filename = `${base}${ext}`;

    const uploadDir = path.join(process.cwd(), "public", "uploads", "members");
    await mkdir(uploadDir, { recursive: true });

    // Remove older uploads for this person/kind (different extension or leftover UUID files not touched)
    try {
      const existing = await readdir(uploadDir);
      await Promise.all(
        existing
          .filter((name) => {
            const lower = name.toLowerCase();
            return (
              lower.startsWith(`${base}.`) ||
              lower === filename.toLowerCase()
            );
          })
          .map((name) => unlink(path.join(uploadDir, name)).catch(() => undefined))
      );
    } catch {
      // ignore cleanup errors
    }

    const bytes = await file.arrayBuffer();
    const buffer = Buffer.from(bytes);
    await writeFile(path.join(uploadDir, filename), buffer);

    // Stable path in DB; query param only helps browsers refresh the preview
    const url = `/uploads/members/${filename}`;
    return NextResponse.json({
      url,
      photoUrl: kind === "photo" ? url : undefined,
      filename,
    });
  } catch {
    return NextResponse.json({ error: "Upload failed" }, { status: 500 });
  }
}
