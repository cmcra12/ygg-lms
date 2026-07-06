// bcrypt hashing, importable from both the Next.js server context and
// standalone scripts (seed) — so it must not import next/* or "server-only".
import bcrypt from "bcryptjs";

export function hashPassword(password: string): string {
  return bcrypt.hashSync(password, 10);
}

export function verifyPassword(password: string, hash: string): boolean {
  return bcrypt.compareSync(password, hash);
}
