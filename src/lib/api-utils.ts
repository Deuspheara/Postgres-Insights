import { NextResponse } from "next/server";

export function apiError(e: unknown, status = 500): NextResponse<{ error: string }> {
  const message = e instanceof Error ? e.message : "An unexpected error occurred";
  return NextResponse.json({ error: message }, { status });
}

export function badRequest(message: string): NextResponse<{ error: string }> {
  return NextResponse.json({ error: message }, { status: 400 });
}

export function notFound(message = "Not found"): NextResponse<{ error: string }> {
  return NextResponse.json({ error: message }, { status: 404 });
}
