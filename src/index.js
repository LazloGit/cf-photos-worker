const API_KEY = "key7SBVpw5HtvATSm"; // Set your API key here

export default {
  async fetch(request, env) {
    try {
      const url = new URL(request.url);

      // Set CORS headers
      const headers = {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
        "Access-Control-Allow-Headers": "Authorization",
      };

      // Handle OPTIONS preflight
      if (request.method === "OPTIONS") {
        return new Response(null, { headers });
      }

      // Authorization check
      const authHeader = request.headers.get("Authorization");
      if (authHeader !== `Bearer ${API_KEY}`) {
        return new Response("Unauthorized", { status: 401, headers });
      }

      // Handle GET /photos (list photos)
      if (url.pathname === "/photos" && request.method === "GET") {
        // Fetch photos from R2 and metadata from D1
        const objectList = await env.PHOTO_BUCKET.list();
        const photoKeys = objectList.objects.map((obj) => obj.key);

        // Query D1 for metadata
        const query = `SELECT * FROM images WHERE key IN (${photoKeys.map(() => '?').join(',')})`;
        const metadata = await env.PHOTO_DB.prepare(query).bind(...photoKeys).all();

        return new Response(JSON.stringify({ photos: photoKeys, metadata: metadata.results }), { headers });
      }

      // Handle POST /upload (upload photo)
      if (request.method === "POST" && url.pathname === "/upload") {
        const formData = await request.formData();
        const file = formData.get("file");
        const userId = formData.get("userId"); // Add user association
        const albumId = formData.get("albumId") || null; // Optional album ID

        if (!file) {
          return new Response("No file uploaded", { status: 400 });
        }

        const key = `${Date.now()}-${file.name}`;
        await env.PHOTO_BUCKET.put(key, file.stream());

        // Insert metadata into D1
        const insertQuery = `INSERT INTO images (key, user_id, album_id, created_at) VALUES (?, ?, ?, ?)`;
        await env.PHOTO_DB.prepare(insertQuery).bind(key, userId, albumId, new Date().toISOString()).run();

        return new Response(JSON.stringify({ message: `File uploaded as ${key}`, key }), { headers });
      }

      // Handle GET /photos/:key (fetch photo)
      if (request.method === "GET" && url.pathname.startsWith("/photos/")) {
        const key = url.pathname.split("/photos/")[1];
        const object = await env.PHOTO_BUCKET.get(key);

        if (!object) {
          return new Response("File not found", { status: 404 });
        }

        return new Response(object.body, {
          headers: {
            "Content-Type": object.httpMetadata?.contentType || "application/octet-stream",
            "Access-Control-Allow-Origin": "*",
            "Access-Control-Allow-Methods": "GET",
            "Access-Control-Allow-Headers": "Authorization",
          },
        });
      }

      return new Response("Not Found", { status: 404, headers });
    } catch (error) {
      console.error("Worker Error:", error);
      return new Response("Internal Server Error", { status: 500 });
    }
  },
};
