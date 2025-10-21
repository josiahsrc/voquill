import { NextResponse } from "next/server";

const RELEASE_MANIFEST_URL =
  "https://github.com/josiahsrc/voquill/releases/download/desktop-prod/latest.json";

export async function GET() {
  try {
    const response = await fetch(RELEASE_MANIFEST_URL, {
      cache: "no-store",
    });

    if (!response.ok) {
      return NextResponse.json(
        { error: "Failed to load release manifest" },
        { status: response.status },
      );
    }

    const manifest = await response.json();

    return NextResponse.json(manifest, {
      status: 200,
      headers: {
        "Cache-Control": "public, s-maxage=300, max-age=120",
      },
    });
  } catch (error) {
    console.error("Failed to proxy release manifest", error);
    return NextResponse.json(
      { error: "Failed to load release manifest" },
      { status: 502 },
    );
  }
}
