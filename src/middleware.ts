import { NextResponse, type NextRequest } from "next/server";

// Pages need the demo session cookie; APIs, assets, the intro, login and the internal /doc stay open.
export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const open = pathname.startsWith("/api") || pathname.startsWith("/_next") || pathname === "/intro" || pathname === "/login" || pathname === "/doc" || /\.[a-z0-9]+$/i.test(pathname);
  if (open) return NextResponse.next();
  if (!req.cookies.get("mp_session")) {
    const url = req.nextUrl.clone();
    url.pathname = "/intro";
    return NextResponse.redirect(url);
  }
  return NextResponse.next();
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
