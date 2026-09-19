import fs from "fs/promises";
import path from "path";
import { publicUploadUrl } from "@/lib/upload-url";

export { publicUploadUrl };

/** Windows : C:\api-uploads — Linux : /var/www/api-uploads */
export const WINDOWS_UPLOAD_DIRECTORY = "C:\\api-uploads";
export const LINUX_UPLOAD_DIRECTORY = "/var/www/api-uploads";

/** Lecture runtime (évite que Next inline UPLOAD_DIR au build). */
function runtimeEnv(name: string): string {
  const bag = process.env as Record<string, string | undefined>;
  return (bag[name] ?? "").trim();
}

function isWindowsDrivePath(value: string) {
  return /^[A-Za-z]:[\\/]/.test(value);
}

function addUniqueDir(dirs: string[], value?: string | null) {
  const trimmed = value?.trim();
  if (!trimmed) return;
  const resolved = path.resolve(trimmed);
  if (!dirs.includes(resolved)) dirs.push(resolved);
}

export function platformUploadDirectory(): string {
  return process.platform === "win32"
    ? WINDOWS_UPLOAD_DIRECTORY
    : LINUX_UPLOAD_DIRECTORY;
}

/**
 * Dossier physique des médias campagnes (images / vidéos).
 * UPLOAD_DIR surcharge (ex. C:/api-uploads).
 */
export function getUploadDirectory(): string {
  const configured = runtimeEnv("UPLOAD_DIR");
  if (configured) {
    if (process.platform === "win32" || !isWindowsDrivePath(configured)) {
      return path.resolve(configured);
    }
  }
  return path.resolve(platformUploadDirectory());
}

export function listUploadDirectories(): string[] {
  const dirs: string[] = [];
  addUniqueDir(dirs, getUploadDirectory());
  addUniqueDir(dirs, WINDOWS_UPLOAD_DIRECTORY);
  addUniqueDir(dirs, LINUX_UPLOAD_DIRECTORY);
  addUniqueDir(dirs, "C:/api-uploads");
  addUniqueDir(dirs, runtimeEnv("UPLOAD_DIR"));
  // Ancien chemin relatif au projet
  addUniqueDir(dirs, path.join(process.cwd(), "uploads"));
  return dirs;
}

function isPathInsideDirectory(directory: string, filePath: string) {
  const relative = path.relative(path.resolve(directory), path.resolve(filePath));
  return relative !== "" && !relative.startsWith("..") && !path.isAbsolute(relative);
}

export function safeUploadRelativePath(fileName: string): string {
  let decoded = fileName.trim();
  try {
    decoded = decodeURIComponent(decoded);
  } catch {
    // already decoded
  }
  decoded = decoded.replace(/\\/g, "/");
  const parts = decoded.split("/").filter((part) => part && part !== ".");
  if (
    parts.length === 0 ||
    parts.some((part) => part === ".." || part.includes("\0"))
  ) {
    throw Object.assign(new Error("Nom de fichier invalide."), {
      code: "EINVAL",
    });
  }
  return path.join(...parts);
}

export async function ensureUploadDirectory(): Promise<string> {
  const dir = getUploadDirectory();
  await fs.mkdir(dir, { recursive: true });
  return dir;
}

/**
 * Écrit un fichier sous `{UPLOAD_DIR}/{orgId}/{safeName}`.
 * Retourne le chemin relatif stocké en base (posix).
 */
export async function writeOrgUpload(input: {
  organizationId: string;
  filename: string;
  buffer: Buffer;
}): Promise<{ relativePath: string; absolutePath: string }> {
  const root = await ensureUploadDirectory();
  const safeName = `${Date.now()}-${input.filename.replace(/[^\w.\-]+/g, "_")}`;
  const relativePath = path.posix.join(input.organizationId, safeName);
  const absolutePath = path.join(root, input.organizationId, safeName);
  await fs.mkdir(path.dirname(absolutePath), { recursive: true });
  await fs.writeFile(absolutePath, input.buffer);
  return { relativePath, absolutePath };
}

/**
 * Résout un `storagePath` DB vers un fichier absolu.
 * Accepte : relatif sous UPLOAD_DIR, ancien `uploads/...`, ou chemin absolu.
 */
export async function resolveUploadAbsolutePath(
  storagePath: string,
): Promise<string> {
  const raw = storagePath.trim();
  if (!raw) {
    throw Object.assign(new Error("Chemin média vide."), { code: "ENOENT" });
  }

  if (path.isAbsolute(raw)) {
    await fs.access(raw);
    return raw;
  }

  const relative = safeUploadRelativePath(
    raw.replace(/^uploads[\\/]/, ""),
  );

  let lastError: NodeJS.ErrnoException | undefined;
  for (const directory of listUploadDirectories()) {
    const fullPath = path.join(directory, relative);
    if (!isPathInsideDirectory(directory, fullPath)) continue;
    try {
      await fs.access(fullPath);
      return fullPath;
    } catch (error) {
      const nodeError = error as NodeJS.ErrnoException;
      if (nodeError.code !== "ENOENT") throw nodeError;
      lastError = nodeError;
    }

    // Legacy: cwd/uploads/...
    const legacy = path.join(directory, raw);
    if (!isPathInsideDirectory(directory, legacy) && !path.isAbsolute(raw)) {
      // skip unsafe
    } else {
      try {
        await fs.access(legacy);
        return legacy;
      } catch {
        // continue
      }
    }
  }

  throw (
    lastError ??
    Object.assign(new Error(`Fichier introuvable: ${raw}`), { code: "ENOENT" })
  );
}

export async function readUploadBuffer(storagePath: string): Promise<Buffer> {
  const absolute = await resolveUploadAbsolutePath(storagePath);
  return fs.readFile(absolute);
}
