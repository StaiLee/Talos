import { NextRequest, NextResponse } from "next/server";

export function proxy(request: NextRequest) {
  const password = process.env.TALOS_AUTH_PASSWORD;
  if (!password) return NextResponse.next();
  const username = process.env.TALOS_AUTH_USER ?? "talos";
  const authorization = request.headers.get("authorization");
  if (authorization?.startsWith("Basic ")) {
    try {
      const [user, pass] = atob(authorization.slice(6)).split(":");
      if (user === username && pass === password) return NextResponse.next();
    } catch {}
  }
  return new NextResponse("Authentification requise", { status: 401, headers: { "WWW-Authenticate": 'Basic realm="Talos", charset="UTF-8"' } });
}

export const config = {
  matcher: "/((?!_next/static|_next/image|talos-mark.svg).*)",
};
