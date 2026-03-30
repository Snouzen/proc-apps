// src/app/actions/ritel.ts
// [ENV] Use env for API URL, no hardcoded localhost fallback in production
const API_URL = process.env.NEXT_PUBLIC_API_URL;

export async function submitRitel(formData: any) {
  if (!API_URL) {
    // [SECURITY] In production, missing API URL is a fatal config error
    if (process.env.NODE_ENV === "production") {
      throw new Error("FATAL: NEXT_PUBLIC_API_URL is not set in production.");
    }
    console.warn("WARNING: NEXT_PUBLIC_API_URL not set, using localhost fallback.");
  }
  const baseUrl = API_URL || "http://localhost:5000";
  try {
    const response = await fetch(`${baseUrl}/api/ritel`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(formData),
    });

    if (!response.ok) {
      throw new Error("Gagal simpan data ke backend");
    }

    return await response.json();
  } catch (error) {
    console.error("Error submit:", error);
    return { error: "Terjadi kesalahan pada server" };
  }
}
