const DART_ENV_ALIASES = [
  "DART_API_KEY",
  "OPENDART_API_KEY",
  "OPEN_DART_API_KEY",
  "DART_KEY",
  "DART_CRTFC_KEY",
] as const;

export async function register() {
  const current = process.env.DART_API_KEY?.trim();
  if (current) return;

  for (const name of DART_ENV_ALIASES) {
    const value = process.env[name]?.trim();
    if (!value) continue;
    process.env.DART_API_KEY = value;
    break;
  }
}
