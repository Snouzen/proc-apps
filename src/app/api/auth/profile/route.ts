import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { randomBytes, timingSafeEqual } from "crypto";
import prisma from "@/lib/prisma";
import {
  getSession,
  signSession,
  SessionPayload,
  invalidateActiveSessionCache,
} from "@/lib/auth";

export async function PATCH(req: Request) {
  try {
    const session = await getSession(req);
    if (!session || !session.email) {
      return NextResponse.json(
        { error: "Sesi telah berakhir, silakan login kembali." },
        { status: 401 }
      );
    }

    const body = await req.json();
    const { username, email, currentPassword, newPassword } = body;

    const lowerCurrentEmail = session.email.toLowerCase().trim();

    // 1. Find user in DB
    let user = await prisma.user.findFirst({
      where: { email: lowerCurrentEmail },
    });

    // If user record doesn't exist in DB (e.g. initial superadmin from env)
    if (!user && session.role === "pusat") {
      const fallbackPw =
        process.env.AUTH_SUPER_PASSWORD || process.env.AUTH_PASSWORD || "password";
      const hashed = await bcrypt.hash(fallbackPw, 12);
      user = await prisma.user.create({
        data: {
          email: lowerCurrentEmail,
          role: "pusat",
          password: hashed,
        },
      });
    }

    if (!user) {
      return NextResponse.json(
        { error: "Akun pengguna tidak ditemukan di database." },
        { status: 404 }
      );
    }

    // 2. Security verification: Current password MUST be provided and match
    if (!currentPassword || typeof currentPassword !== "string") {
      return NextResponse.json(
        { error: "Password saat ini wajib diisi untuk verifikasi keamanan." },
        { status: 400 }
      );
    }

    const storedPw = user.password || "";
    const isHashed = storedPw.startsWith("$2");
    const isPasswordValid = isHashed
      ? await bcrypt.compare(currentPassword, storedPw)
      : (() => {
          const a = Buffer.from(currentPassword);
          const b = Buffer.from(storedPw);
          return a.length === b.length && timingSafeEqual(a, b);
        })();

    if (!isPasswordValid) {
      return NextResponse.json(
        { error: "Password saat ini salah." },
        { status: 400 }
      );
    }

    const updateData: Record<string, any> = {};

    // 3. Update Password if requested
    if (newPassword && typeof newPassword === "string" && newPassword.trim() !== "") {
      if (newPassword === currentPassword) {
        return NextResponse.json(
          {
            error:
              "Password baru tidak boleh sama dengan password saat ini. Silakan buat password yang berbeda.",
          },
          { status: 400 }
        );
      }
      if (newPassword.length < 6) {
        return NextResponse.json(
          { error: "Password baru minimal harus 6 karakter." },
          { status: 400 }
        );
      }
      updateData.password = await bcrypt.hash(newPassword, 12);
    }

    // 4. Update Email / Username if requested
    let targetEmail = user.email;
    if (username && typeof username === "string" && username.trim() !== "") {
      const cleanUsername = username.trim().toLowerCase().replace(/[^a-z0-9._-]/g, "");
      if (!cleanUsername) {
        return NextResponse.json(
          { error: "Format username tidak valid. Gunakan huruf, angka, titik, atau minus." },
          { status: 400 }
        );
      }
      targetEmail = `${cleanUsername}@bulog.co.id`;
    } else if (email && typeof email === "string" && email.trim() !== "") {
      targetEmail = email.trim().toLowerCase();
    }

    if (targetEmail !== user.email) {
      // Check if email already taken by another account
      const existing = await prisma.user.findFirst({
        where: { email: targetEmail },
      });
      if (existing && existing.id !== user.id) {
        return NextResponse.json(
          {
            error: `Email / Username "${targetEmail.split("@")[0]}" sudah digunakan oleh akun lain.`,
          },
          { status: 400 }
        );
      }
      updateData.email = targetEmail;
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json(
        { message: "Tidak ada perubahan data." },
        { status: 200 }
      );
    }

    // Execute update in database atomically with audit log
    const updatedUser = await prisma.$transaction(async (tx) => {
      const userResult = await tx.user.update({
        where: { id: user.id },
        data: updateData,
      });

      await tx.auditLog.create({
        data: {
          entity: "User",
          entityId: userResult.id,
          action: "PROFILE_UPDATED",
          newData: {
            email: userResult.email,
            fields: Object.keys(updateData),
          },
          userId: userResult.id,
          userName: userResult.email,
          userRole: userResult.role,
        },
      });

      return userResult;
    });

    invalidateActiveSessionCache(updatedUser.id);
    if (session.jti) invalidateActiveSessionCache(session.jti);

    // Refresh and sign new session with updated email, userId, and sessionVersion
    const newSessionPayload: SessionPayload = {
      ...session,
      userId: updatedUser.id,
      email: updatedUser.email,
      exp: Date.now() + 60 * 60 * 1000,
      jti: randomBytes(8).toString("hex"),
      sessionVersion: updatedUser.updatedAt.getTime(),
    };

    const token = signSession(newSessionPayload);

    const res = NextResponse.json({
      ok: true,
      message: "Profil dan kredensial akun berhasil diperbarui.",
      user: {
        email: updatedUser.email,
        username: updatedUser.email.split("@")[0],
        role: updatedUser.role,
        regional: updatedUser.regional,
        siteArea: updatedUser.siteArea,
      },
    });

    res.cookies.set("session", token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 1 * 60 * 60,
      path: "/",
    });

    return res;
  } catch (err: any) {
    console.error("Error updating profile:", err);
    return NextResponse.json(
      { error: "Terjadi kesalahan server saat memperbarui profil." },
      { status: 500 }
    );
  }
}
