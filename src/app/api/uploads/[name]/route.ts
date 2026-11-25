import { existsSync, readFileSync } from "fs";
import { join } from "path";
import { NextResponse } from "next/server";
import { ensureTenancyMigrated } from "@/lib/migrate-tenancy";
import { resolveTenantActor } from "@/lib/request-context";
import { tenantUploadsDir } from "@/lib/tenant-paths";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Params = { params: Promise<{ name: string }> };

export async function GET(request: Request, { params }: Params) {
  ensureTenancyMigrated();
  const resolved = resolveTenantActor(request);
  if (!resolved.ok) {
    return NextResponse.json({ error: resolved.error }, { status: resolved.status });
  }
  const { ctx } = resolved;

  const { name } = await params;
  const decoded = decodeURIComponent(name);
  if (
    !decoded ||
    decoded.includes("..") ||
    decoded.includes("/") ||
    decoded.includes("\\")
  ) {
    return NextResponse.json({ error: "Invalid file." }, { status: 400 });
  }

  const path = join(tenantUploadsDir(ctx.company.id), decoded);
  if (!existsSync(path)) {
    return NextResponse.json({ error: "Not found." }, { status: 404 });
  }

  // Soft authz: file must be referenced in this tenant's tasks (when attached)
  const referenced = ctx.state.tasks.some((t) =>
    (t.attachments ?? []).some((a) => a.url.includes(encodeURIComponent(decoded)) || a.url.endsWith(decoded)),
  );
  // Allow download if referenced OR actor is admin/manager (company-scoped)
  if (!referenced && ctx.actor.role === "employee") {
    // Employees may still download attachments on their assigned tasks
    const onMine = ctx.state.tasks.some(
      (t) =>
        t.assigneeId === ctx.actor.id &&
        (t.attachments ?? []).some(
          (a) => a.url.includes(encodeURIComponent(decoded)) || a.url.endsWith(decoded),
        ),
    );
    if (!onMine) {
      return NextResponse.json({ error: "Forbidden." }, { status: 403 });
    }
  }

  const data = readFileSync(path);
  const original = decoded.includes("__")
    ? decoded.slice(decoded.indexOf("__") + 2)
    : decoded;

  return new NextResponse(data, {
    headers: {
      "Content-Type": "application/octet-stream",
      "Content-Disposition": `attachment; filename="${original.replace(/"/g, "")}"`,
      "Cache-Control": "private, max-age=3600",
    },
  });
}
