// UI deadline only: rejecting this promise does not cancel server/database work.
export async function withReadDeadline<T>(work: Promise<T>, timeoutMs = 20000): Promise<T> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      work,
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error("Pemuatan melewati batas waktu. Silakan coba lagi.")), timeoutMs);
      }),
    ]);
  } finally {
    clearTimeout(timer);
  }
}
