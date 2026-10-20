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

/**
 * Quem recebe o conteúdo pessoal do dono do app: rotina (estágio, aulas, academia), trilha DevOps
 * e trilha de Segurança. Sem OWNER_EMAILS, todo mundo recebe (como antes); com ela, os outros
 * emails de ALLOWED_EMAILS começam com o app vazio.
 */
export function recebeConteudoPessoal(
  email: string | null | undefined,
  lista = process.env.OWNER_EMAILS,
): boolean {
  if (!lista?.trim()) return true;
  return emailPermitido(email, lista);
}
