export default async (request) => {
  try {
    const url = new URL(request.url);

    const prefix = "/.netlify/functions/oracle-api";
    let backendPath = url.pathname.startsWith(prefix)
      ? url.pathname.slice(prefix.length)
      : url.pathname;

    if (!backendPath.startsWith("/")) {
      backendPath = "/" + backendPath;
    }

    const target =
      "http://161.118.169.29:4000" +
      backendPath +
      url.search;

    const headers = new Headers(request.headers);

    // Don't forward Netlify/browser host information to Oracle.
    headers.delete("host");
    headers.delete("content-length");

    const options = {
      method: request.method,
      headers
    };

    if (request.method !== "GET" && request.method !== "HEAD") {
      options.body = await request.arrayBuffer();
    }

    const response = await fetch(target, options);

    const responseHeaders = new Headers(response.headers);
    responseHeaders.set("Cache-Control", "no-store");

    return new Response(response.body, {
      status: response.status,
      headers: responseHeaders
    });
  } catch (error) {
    console.error("Oracle proxy error:", error);

    return Response.json(
      {
        ok: false,
        error: "Oracle backend proxy failed"
      },
      { status: 502 }
    );
  }
};
