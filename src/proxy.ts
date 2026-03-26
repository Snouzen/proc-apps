import { NextRequest, NextResponse } from "next/server";
import { verifySessionEdge } from "@/lib/auth-edge";

function isPublicPath(pathname: string) {
  if (pathname === "/login") return true;
  if (pathname.startsWith("/_next")) return true;
  if (pathname === "/favicon.ico") return true;
  if (pathname.startsWith("/images")) return true;
  if (pathname.startsWith("/static")) return true;
  return false;
}

export async function proxy(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get("session")?.value;
  const session = await verifySessionEdge(token);

  if (pathname.startsWith("/api/po") || pathname.startsWith("/api/stats")) {
    if (!session) {
      const res = NextResponse.json({ error: "Unauthorized" }, { status: 401 });
      res.headers.set("X-RateLimit-Limit", "3");
      return res;
    }

    const method = req.method.toUpperCase();
    if (method === "POST" || method === "PUT" || method === "PATCH") {
      const ct = req.headers.get("content-type") || "";
      const isJson = ct.toLowerCase().includes("application/json");
      if (!isJson) {
        const res = NextResponse.json(
          { error: "Content-Type harus application/json" },
          { status: 415 },
        );
        res.headers.set("X-RateLimit-Limit", "3");
        return res;
      }
    }

    const res = NextResponse.next();
    res.headers.set("X-RateLimit-Limit", "3");
    return res;
  }

  if (pathname === "/login" && session) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  if (isPublicPath(pathname)) {
    return NextResponse.next();
  }

  if (!session) {
    const url = new URL("/login", req.url);
    url.searchParams.set(
      "next",
      `${req.nextUrl.pathname}${req.nextUrl.search}`,
    );
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/api/po/:path*",
    "/api/stats/:path*",
    "/((?!_next|api|favicon.ico|images|static).*)",
  ],
};
