import path from "path";
import { NextResponse } from "next/server";
import { requireOrgMembership } from "@/lib/auth/organization-permission";
import {
  listUploadDirectories,
  readUploadBuffer,
  safeUploadRelativePath,
} from "@/lib/upload-file.server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const CONTENT_TYPES: Record<string, string> = {
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".png": "image/png",
  ".mp4": "video/mp4",
  ".3gp": "video/3gpp",
  ".3gpp": "video/3gpp",
};

type RouteContext = {
  params: Promise<{ path: string[] }>;
};

export async function GET(_request: Request, { params }: RouteContext) {
  try {
    const { path: parts } = await params;
    const relative = safeUploadRelativePath(parts.join("/"));
    const segments = relative.split(/[/\\]/).filter(Boolean);
    const organizationId = segments[0] === "uploads" ? segments[1] : segments[0];
    if (!organizationId) {
      return NextResponse.json(
        { ok: false, message: "Accès succursale refusé" },
        { status: 403 },
      );
    }
    try {
      await requireOrgMembership(organizationId);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Accès refusé";
      return NextResponse.json(
        { ok: false, message },
        { status: message === "Non authentifié" ? 401 : 403 },
      );
    }
    const buffer = await readUploadBuffer(relative);
    const extension = path.extname(relative).toLowerCase();
    const contentType = CONTENT_TYPES[extension] ?? "application/octet-stream";
    const downloadName = path.basename(relative).replace(/"/g, "");

    return new Response(new Uint8Array(buffer), {
      status: 200,
      headers: {
        "Content-Type": contentType,
        "Content-Length": String(buffer.byteLength),
        "Content-Disposition": `inline; filename="${downloadName}"`,
        "Cache-Control": "private, max-age=3600",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    const nodeError = error as NodeJS.ErrnoException;
    console.error("UPLOAD_READ_ERROR:", {
      code: nodeError.code,
      message: nodeError.message,
      uploadDir: process.env.UPLOAD_DIR,
      searchDirs: listUploadDirectories(),
    });

    const invalid = nodeError.code === "EINVAL";
    const missing = nodeError.code === "ENOENT";
    return NextResponse.json(
      {
        ok: false,
        message: invalid
          ? "Nom de fichier invalide."
          : missing
            ? "Fichier introuvable sur le disque."
            : "Impossible de lire le fichier.",
      },
      { status: invalid ? 400 : missing ? 404 : 500 },
    );
  }
}
