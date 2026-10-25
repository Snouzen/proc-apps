/**
 * Client-side helper for submitting Ritel Modern data.
 * Pure browser/client-safe module with zero server or Prisma dependencies.
 */

export async function submitRitelClient(formData: any) {
  try {
    const response = await fetch("/api/ritel", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData),
    });
    const json = await response.json();
    if (!response.ok) {
      return { error: json.error || "Gagal menyimpan data ritel" };
    }
    return { success: true, data: json };
  } catch (error: any) {
    return { error: error?.message || "Terjadi kesalahan jaringan" };
  }
}
