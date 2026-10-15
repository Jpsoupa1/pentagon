/** App pessoal: só entram os emails listados em ALLOWED_EMAILS (separados por vírgula). */
export function emailPermitido(
  email: string | null | undefined,
  lista = process.env.ALLOWED_EMAILS,
): boolean {
  if (!email || !lista) return false;
  const permitidos = lista
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
  return permitidos.includes(email.trim().toLowerCase());
}
