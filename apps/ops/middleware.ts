// Edge middleware: gate the entire ops app behind the email allowlist.
// In dev (no OPS_BASIC_AUTH set), we skip the check. In prod, set OPS_BASIC_AUTH
// to a "user:password" string per environment.

import { NextResponse, type NextRequest } from "next/server";

export function middleware(req: NextRequest) {
  const expected = process.env.OPS_BASIC_AUTH;
  if (!expected) return NextResponse.next();

  const header = req.headers.get("authorization");
  if (header) {
    const [, encoded] = header.split(" ");
    if (encoded && atob(encoded) === expected) {
      return NextResponse.next();
    }
  }

  return new NextResponse("Auth required", {
    status: 401,
    headers: { "WWW-Authenticate": 'Basic realm="ops"' },
  });
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
