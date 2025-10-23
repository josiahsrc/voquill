import type { APIRoute } from "astro";

const RELEASE_MANIFEST_URL =
  "https://github.com/josiahsrc/voquill/releases/download/desktop-prod/latest.json";

export const prerender = true;

export const GET: APIRoute = async () => {
  try {
    const response = await fetch(RELEASE_MANIFEST_URL, {
      cache: "no-store",
    });

    if (!response.ok) {
      return new Response(
        JSON.stringify({ error: "Failed to load release manifest" }),
        {
          status: response.status,
          headers: {
            "Content-Type": "application/json",
          },
        },
      );
    }

    const manifest = await response.json();

    return new Response(JSON.stringify(manifest), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        "Cache-Control": "public, s-maxage=300, max-age=120",
      },
    });
  } catch (error) {
    console.error("Failed to proxy release manifest", error);
    return new Response(
      JSON.stringify({ error: "Failed to load release manifest" }),
      {
        status: 502,
        headers: {
          "Content-Type": "application/json",
        },
      },
    );
  }
};
