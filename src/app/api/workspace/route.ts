import { NextResponse } from "next/server";
import { getAuthToken } from "@/lib/auth";

const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";

export async function GET() {
  try {
    const token = await getAuthToken();
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const res = await fetch(`${API_URL}/api/workspaces/me`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      cache: 'no-store', // Always fetch fresh workspace status
    });

    if (!res.ok) {
      if (res.status === 404) {
        return NextResponse.json({ workspace: null });
      }
      return NextResponse.json({ error: "Failed to fetch workspace" }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json({ workspace: data });
  } catch (error) {
    console.error("Workspace API Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const token = await getAuthToken();
    if (!token) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await request.json();

    const res = await fetch(`${API_URL}/api/workspaces`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        name: body.name || "Default Workspace",
        clerk_user_id: "placeholder" // Backend ignores this and uses the token's sub claim
      }),
    });

    if (!res.ok) {
      return NextResponse.json({ error: "Failed to create workspace" }, { status: res.status });
    }

    const data = await res.json();
    return NextResponse.json({ workspace: data });
  } catch (error) {
    console.error("Workspace Creation Error:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
