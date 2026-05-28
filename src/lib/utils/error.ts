export function getErrorMessage(err: unknown, defaultMessage = "Terjadi kesalahan server"): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "object" && err !== null && "message" in err) {
    return String((err as { message: unknown }).message);
  }
  return defaultMessage;
}
