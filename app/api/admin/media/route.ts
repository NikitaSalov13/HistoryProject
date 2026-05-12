import { access, mkdir, readdir, stat, writeFile } from "node:fs/promises";
import path from "node:path";

import { NextRequest, NextResponse } from "next/server";

import { isAdminRequest } from "@/lib/server/admin-auth";

export const runtime = "nodejs";

const uploadsDirPath = path.join(process.cwd(), "public", "uploads");
const allowedExtensions = new Set([".jpg", ".jpeg", ".png", ".webp", ".gif", ".avif"]);
const maxUploadSizeBytes = 10 * 1024 * 1024;

interface MediaFileInfo {
  name: string;
  url: string;
  size: number;
  updatedAt: string;
}

const ensureUploadsDir = async (): Promise<void> => {
  await mkdir(uploadsDirPath, { recursive: true });
};

const normalizeExtFromMime = (mimeType: string): string | null => {
  switch (mimeType) {
    case "image/jpeg":
      return ".jpg";
    case "image/png":
      return ".png";
    case "image/webp":
      return ".webp";
    case "image/gif":
      return ".gif";
    case "image/avif":
      return ".avif";
    default:
      return null;
  }
};

const sanitizeBaseName = (inputName: string): string => {
  const parsed = path.parse(path.basename(inputName));
  const normalized = parsed.name
    .replace(/[<>:"/\\|?*\u0000-\u001f]/g, "_")
    .replace(/\s+/g, " ")
    .trim()
    .replace(/[. ]+$/g, "");

  return normalized || "image";
};

const pickExtension = (fileName: string, mimeType: string): string | null => {
  const extFromName = path.extname(fileName).toLowerCase();
  if (allowedExtensions.has(extFromName)) {
    return extFromName;
  }

  return normalizeExtFromMime(mimeType);
};

const toMediaUrl = (fileName: string): string => `/uploads/${encodeURIComponent(fileName)}`;

const fileExists = async (fullPath: string): Promise<boolean> => {
  try {
    await access(fullPath);
    return true;
  } catch {
    return false;
  }
};

const pickUniqueFileName = async (baseName: string, extension: string): Promise<string> => {
  let attempt = 0;
  while (attempt < 10000) {
    const candidate = attempt === 0 ? `${baseName}${extension}` : `${baseName}-${attempt}${extension}`;
    const candidatePath = path.join(uploadsDirPath, candidate);
    if (!(await fileExists(candidatePath))) {
      return candidate;
    }

    attempt += 1;
  }

  throw new Error("Could not allocate a unique file name");
};

const readMediaFiles = async (): Promise<MediaFileInfo[]> => {
  await ensureUploadsDir();

  const dirEntries = await readdir(uploadsDirPath, { withFileTypes: true });
  const files = await Promise.all(
    dirEntries
      .filter((entry) => entry.isFile())
      .map(async (entry) => {
        const extension = path.extname(entry.name).toLowerCase();
        if (!allowedExtensions.has(extension)) {
          return null;
        }

        const fullPath = path.join(uploadsDirPath, entry.name);
        const fileStats = await stat(fullPath);

        return {
          name: entry.name,
          url: toMediaUrl(entry.name),
          size: fileStats.size,
          updatedAt: fileStats.mtime.toISOString()
        } satisfies MediaFileInfo;
      })
  );

  return files
    .filter((item): item is MediaFileInfo => item !== null)
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
};

export async function GET(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const data = await readMediaFiles();

  return NextResponse.json({
    count: data.length,
    data
  });
}

export async function POST(request: NextRequest) {
  if (!isAdminRequest(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const formData = await request.formData();
  const rawFile = formData.get("file");

  if (!(rawFile instanceof File)) {
    return NextResponse.json({ error: 'FormData field "file" is required' }, { status: 400 });
  }

  if (!rawFile.size) {
    return NextResponse.json({ error: "File is empty" }, { status: 400 });
  }

  if (rawFile.size > maxUploadSizeBytes) {
    return NextResponse.json(
      { error: "File is too large. Max allowed size is 10 MB" },
      { status: 400 }
    );
  }

  const extension = pickExtension(rawFile.name, rawFile.type);
  if (!extension) {
    return NextResponse.json(
      { error: "Unsupported file type. Allowed: jpg, png, webp, gif, avif" },
      { status: 400 }
    );
  }

  await ensureUploadsDir();

  const baseName = sanitizeBaseName(rawFile.name);
  const fileName = await pickUniqueFileName(baseName, extension);
  const targetPath = path.join(uploadsDirPath, fileName);

  const data = Buffer.from(await rawFile.arrayBuffer());
  await writeFile(targetPath, data);

  const fileStats = await stat(targetPath);

  return NextResponse.json(
    {
      data: {
        name: fileName,
        url: toMediaUrl(fileName),
        size: fileStats.size,
        updatedAt: fileStats.mtime.toISOString()
      } satisfies MediaFileInfo
    },
    { status: 201 }
  );
}
