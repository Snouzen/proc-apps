import { NextResponse } from "next/server";
import prisma from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { cookies } from "next/headers";
import { verifySession } from "@/lib/auth";

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const retailerId = searchParams.get("retailerId");
    const q = searchParams.get("q") || "";
    const inisial = searchParams.get("inisial");
    const toko = searchParams.get("toko");
    const dateFrom = searchParams.get("dateFrom");
    const dateTo = searchParams.get("dateTo");

    // [RBAC] Ambil Session & Role
    const cookieStore = await cookies();
    const sessionToken = cookieStore.get("session")?.value;
    const user = verifySession(sessionToken);

    let siteScopeId: string | null = null;
    let rmInisial: string | null = null;

    const safeRole = String(user?.role || "").toLowerCase().trim();

    if (safeRole === "sitearea" && user?.siteArea) {
      const unit = await prisma.unitProduksi.findFirst({
        where: { siteArea: { contains: user.siteArea, mode: "insensitive" } },
      });
      if (unit) siteScopeId = unit.idRegional;
    } else if (safeRole === "rm" && user?.regional) {
      rmInisial = user.regional;
    }

    // Construct common where filter
    const filters: Prisma.DataReturWhereInput[] = [];
    if (siteScopeId) filters.push({ lokasiBarangId: siteScopeId });
    if (rmInisial) filters.push({ inisial: { equals: rmInisial, mode: 'insensitive' } });
    
    if (retailerId) {
      const selectedRitel = await prisma.ritelModern.findUnique({ where: { id: retailerId } });
      if (selectedRitel) {
        filters.push({ RitelModern: { namaPt: { equals: selectedRitel.namaPt, mode: 'insensitive' } } });
      } else {
        filters.push({ ritelId: retailerId });
      }
    }

    if (inisial) filters.push({ inisial: inisial });
    if (toko) filters.push({ namaCompany: toko });
    
    if (dateFrom || dateTo) {
      const dateRange: any = {};
      if (dateFrom) dateRange.gte = new Date(dateFrom);
      if (dateTo) {
        const d = new Date(dateTo);
        d.setHours(23, 59, 59, 999);
        dateRange.lte = d;
      }
      filters.push({ tanggalRtv: dateRange });
    }

    if (q) {
      filters.push({
        OR: [
          { rtvCn: { contains: q, mode: "insensitive" } },
          { namaCompany: { contains: q, mode: "insensitive" } },
          { produk: { contains: q, mode: "insensitive" } },
        ]
      });
    }

    const where: Prisma.DataReturWhereInput = filters.length > 0 ? { AND: filters } : {};

    // Ambil stats berdasarkan statusBarang
    const [sudah, belum, musnah] = await Promise.all([
      prisma.dataRetur.count({
        where: {
          ...where,
          statusBarang: { equals: "SUDAH DIAMBIL", mode: "insensitive" }
        }
      }),
      prisma.dataRetur.count({
        where: {
          ...where,
          OR: [
            { statusBarang: { equals: "BELUM DIAMBIL", mode: "insensitive" } },
            { statusBarang: null },
            { statusBarang: { equals: "" } }
          ]
        }
      }),
      prisma.dataRetur.count({
        where: {
          ...where,
          statusBarang: { equals: "DIMUSNAHKAN", mode: "insensitive" }
        }
      })
    ]);

    return NextResponse.json({
      sudah_diambil: sudah,
      belum_diambil: belum,
      dimusnahkan: musnah,
      total: sudah + belum + musnah
    });
  } catch (error: any) {
    console.error("GET Retur Stats Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
