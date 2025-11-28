import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const targetUrl = searchParams.get("url");
    if (!targetUrl) {
      return NextResponse.json({ error: "Missing url query param" }, { status: 400 });
    }

    const contentType = request.headers.get("x-content-type") || undefined;

    // Read the raw body as ArrayBuffer and forward to S3
    const bodyArrayBuffer = await request.arrayBuffer();

    const s3Response = await fetch(targetUrl, {
      method: "PUT",
      // Stream/body forwarding
      body: bodyArrayBuffer,
      headers: contentType ? { "Content-Type": contentType } : undefined,
    });

    const etag = s3Response.headers.get("ETag") || s3Response.headers.get("etag") || undefined;

    if (!s3Response.ok) {
      const txt = await s3Response.text().catch(() => "");
      return new NextResponse(txt || "Upstream error", {
        status: s3Response.status,
        headers: {
          ...(etag ? { ETag: etag } : {}),
          "Access-Control-Allow-Origin": "*",
        },
      });
    }

    return new NextResponse(null, {
      status: s3Response.status || 200,
      headers: {
        ...(etag ? { ETag: etag } : {}),
        "Access-Control-Allow-Origin": "*",
      },
    });
  } catch (err) {
    console.error("s3-upload-proxy error", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 200,
    headers: {
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "POST, OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type, x-content-type",
    },
  });
}
