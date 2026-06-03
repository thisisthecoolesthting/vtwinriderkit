import fs from 'node:fs';
import path from 'node:path';

const PUBLIC_ROOT = path.join(process.cwd(), 'public');

/** True when a local or remote hero path should render on index cards. */
export function isHeroImageAvailable(src: string | undefined | null): boolean {
  if (!src?.trim()) return false;
  const trimmed = src.trim();
  if (/^https?:\/\//i.test(trimmed)) return true;
  const rel = trimmed.startsWith('/') ? trimmed.slice(1) : trimmed;
  return fs.existsSync(path.join(PUBLIC_ROOT, rel));
}
