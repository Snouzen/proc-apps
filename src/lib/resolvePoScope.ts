import prisma from "@/lib/prisma";
import { poScopeFromUnits } from "./utils/poScope";

/** Resolve actual master unit IDs using the same rules as PO ownership checks. */
export async function resolvePoScope(auth: { role: string; dbUser?: any; session: any }) {
  if (["pusat", "magang"].includes(auth.role)) return {};
  const regional = auth.dbUser ? auth.dbUser.regional : auth.session?.regional;
  const siteArea = auth.dbUser ? auth.dbUser.siteArea : auth.session?.siteArea;
  if ((auth.role === "rm" && !regional?.trim()) || (auth.role === "sitearea" && !siteArea?.trim())) return { id: "__NO_CONFIGURED_SCOPE__" };
  const units = await prisma.unitProduksi.findMany({ select: { idRegional: true, namaRegional: true, kodeRegional: true, siteArea: true } });
  return poScopeFromUnits(auth.role, regional, siteArea, units);
}
