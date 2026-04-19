import { NextResponse } from "next/server";
import { SESSION_COOKIE } from "@/lib/session";
import { isDemoUserKey } from "@/lib/demo-users";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const as = body?.as;

  if (!isDemoUserKey(as)) {
    return NextResponse.json({ error: "invalid profile" }, { status: 400 });
  }

  const res = NextResponse.json({ ok: true, as });
  res.cookies.set(SESSION_COOKIE, as, {
    path: "/",
    sameSite: "lax",
  });
  return res;
}
