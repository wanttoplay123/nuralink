export function getErrorMessage(error: unknown): string {
  if (!error) return "Ocurrió un error inesperado.";
  if (typeof error === "string") return error;

  const candidate = error as {
    message?: string;
    details?: string;
    hint?: string;
    code?: string;
    status?: number;
  };

  const message = candidate.message ?? "";
  const code = candidate.code ?? "";

  if (code === "23505" || message.includes("duplicate key")) {
    return "Ese registro ya existe.";
  }
  if (
    message.includes("Invalid login credentials") ||
    message.includes("invalid_grant")
  ) {
    return "Correo o contraseña incorrectos.";
  }
  if (message.includes("Email not confirmed")) {
    return "Debes confirmar tu correo antes de iniciar sesión.";
  }
  if (
    message.toLowerCase().includes("email rate limit") ||
    code === "over_email_send_rate_limit"
  ) {
    return "No pudimos enviar el correo de confirmación en este momento. Intenta de nuevo en unos minutos.";
  }
  if (
    (message.toLowerCase().includes("email address") &&
      message.toLowerCase().includes("invalid")) ||
    code === "email_address_invalid"
  ) {
    return "Ingresa un correo electrónico válido.";
  }
  if (message.includes("User already registered")) {
    return "No pudimos crear la cuenta. Si ya tienes una, inicia sesión o recupera tu contraseña.";
  }
  if (
    message.includes("Network request failed") ||
    message.includes("Failed to fetch") ||
    message.includes("fetch failed")
  ) {
    return "No se pudo conectar con el servidor. Revisa tu conexión a internet.";
  }
  if (message.includes("row-level security")) {
    return "No tienes permisos para realizar esta acción.";
  }
  if (message.includes("JWT expired")) {
    return "Tu sesión expiró. Vuelve a iniciar sesión.";
  }

  return message || candidate.details || "Ocurrió un error inesperado.";
}
