import { randomBytes } from "crypto";
import { writeFileSync } from "fs";
import { join } from "path";
import { NextResponse } from "next/server";
import { ensureTenancyMigrated } from "@/lib/migrate-tenancy";
import { resolveTenantActor } from "@/lib/request-context";
import { tenantUploadsDir } from "@/lib/tenant-paths";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const MAX_BYTES = 12 * 1024 * 1024;

export async function POST(request: Request) {
  ensureTenancyMigrated();
  const resolved = resolveTenantActor(request);
  if (!resolved.ok) {
    return NextResponse.json({ error: resolved.error }, { status: resolved.status });
  }
  const { ctx } = resolved;

  try {
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File)) {
      return NextResponse.json({ error: "Missing file." }, { status: 400 });
    }
    if (file.size <= 0) {
      return NextResponse.json({ error: "Empty file." }, { status: 400 });
    }
    if (file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: "File too large. Max size is 12 MB." },
        { status: 400 },
      );
    }

    const bytes = Buffer.from(await file.arrayBuffer());
    const id = `up_${Date.now().toString(36)}_${randomBytes(4).toString("hex")}`;
    const safeName = file.name.replace(/[^\w.\- ()[\]]+/g, "_").slice(0, 120);
    const storedName = `${id}__${safeName}`;
    writeFileSync(join(tenantUploadsDir(ctx.company.id), storedName), bytes);

    return NextResponse.json({
      id,
      name: file.name,
      mimeType: file.type || "application/octet-stream",
      size: file.size,
      url: `/api/uploads/${encodeURIComponent(storedName)}`,
      uploadedAt: new Date().toISOString(),
      tenantId: ctx.company.id,
    });
  } catch (e) {
    const message = e instanceof Error ? e.message : "Upload failed";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
