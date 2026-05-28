import { NextResponse } from "next/server";
import { supabaseAdmin } from "@/lib/supabase";
import { getSession } from "@/lib/auth";

export async function POST(request: Request) {
  try {
    const session = await getSession(request);
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const formData = await request.formData();
    const file = formData.get("file") as File;
    const rekonId = formData.get("rekonId") as string;

    if (!file) {
      return NextResponse.json({ error: "File is required" }, { status: 400 });
    }

    if (file.size > 1024 * 1024) {
      return NextResponse.json({ error: "File terlalu besar. Max 1MB." }, { status: 400 });
    }

    // Generate unique filename
    const ext = file.name.split(".").pop() || "file";
    const timestamp = Date.now();
    const fileName = `bukti-bayar/${rekonId || "unknown"}_${timestamp}.${ext}`;

    // Convert File to Buffer
    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);

    // Upload to Supabase Storage
    const { data, error } = await supabaseAdmin.storage
      .from("bukti_bayar_rekon")
      .upload(fileName, buffer, {
        contentType: file.type,
        upsert: true,
      });

    if (error) {
      console.error("Supabase Upload Error:", error);
      return NextResponse.json({ error: `Upload gagal: ${error.message}` }, { status: 500 });
    }

    // Get public URL
    const { data: urlData } = supabaseAdmin.storage
      .from("bukti_bayar_rekon")
      .getPublicUrl(data.path);

    return NextResponse.json({ 
      success: true, 
      url: urlData.publicUrl 
    });
  } catch (error: any) {
    console.error("Upload API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
