// src/app/actions/ritel.ts

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000";

export async function submitRitel(formData: any) {
  try {
    const response = await fetch(`${API_URL}/api/ritel`, {
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
