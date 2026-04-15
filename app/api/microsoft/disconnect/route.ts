import { createClient } from "@/lib/supabase/server";
import { NextResponse, type NextRequest } from "next/server";

export async function GET(request: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const login = new URL("/login", request.nextUrl.origin);
    return NextResponse.redirect(login);
  }

  await supabase.from("microsoft_oauth_tokens").delete().eq("user_id", user.id);

  const cal = new URL("/kalender", request.nextUrl.origin);
  cal.searchParams.set("outlook_disconnected", "1");
  return NextResponse.redirect(cal);
}
