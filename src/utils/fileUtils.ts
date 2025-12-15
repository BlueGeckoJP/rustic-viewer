import { readDir } from "@tauri-apps/plugin-fs";

const imageFileRegex = /\.(png|jpg|jpeg|gif|bmp|webp)$/i;

export function determineDirectory(rawPath: string): string {
  const lastSlash = rawPath.lastIndexOf("/");
  return lastSlash >= 0 ? rawPath.substring(0, lastSlash) : "";
}

export async function getSortedImageFiles(dir: string): Promise<string[]> {
  const entries = await readDir(dir);
  const files = entries
    .filter((e) => e.isFile && !!e.name && imageFileRegex.test(e.name))
    .map((e) => `${dir}/${e.name}`)
    .sort((a, b) =>
      a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" }),
    );
  return files;
}
