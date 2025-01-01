const API_KEY = "key7SBVpw5HtvATSm"; // Set your API key here

export default {
  async fetch(request, env) {
    try {
      const url = new URL(request.url);

      // Set CORS headers for local development
      const headers = {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*", // Allow requests from any origin (or specify your domain)
        "Access-Control-Allow-Methods": "GET, POST, OPTIONS", // Allow GET and POST methods
        "Access-Control-Allow-Headers": "Authorization", // Allow Authorization header
      };

      // If it's a preflight request (OPTIONS), respond with CORS headers
      if (request.method === "OPTIONS") {
        return new Response(null, { headers });
      }

      // Check for Authorization header
      const authHeader = request.headers.get("Authorization");
      if (authHeader !== `Bearer ${API_KEY}`) {
        return new Response("Unauthorized", { status: 401, headers });
      }

      // Handle GET /users (list users)
      if (url.pathname === "/users" && request.method === "GET") {
        const query = "SELECT id, username FROM users";
        const { results } = await env.PHOTO_DB.prepare(query).all();

        return new Response(JSON.stringify(results), { headers });
      }

      // Handle GET /albums (list albums)
      if (url.pathname === "/albums" && request.method === "GET") {
        const query = `
          SELECT albums.id, albums.name, users.username, albums.created_at 
          FROM albums 
          INNER JOIN users ON albums.user_id = users.id
        `;
        const { results } = await env.PHOTO_DB.prepare(query).all();

        return new Response(JSON.stringify(results), { headers });
      }

      // Handle GET /photos (list photos)
      if (url.pathname === "/photos" && request.method === "GET") {
        const query = `
          SELECT images.id, images.key, users.username, albums.name AS album_name, images.created_at 
          FROM images
          INNER JOIN users ON images.user_id = users.id
          LEFT JOIN albums ON images.album_id = albums.id
        `;
        const { results } = await env.PHOTO_DB.prepare(query).all();

        return new Response(JSON.stringify(results), { headers });
      }

      // Handle other existing endpoints (upload, etc.)
      if (request.method === "POST" && url.pathname === "/upload") {
        const formData = await request.formData();
        const file = formData.get("file");
        const userId = formData.get("user_id");
        const albumId = formData.get("album_id");

        if (!file || !userId || !albumId) {
          return new Response("Invalid data", { status: 400 });
        }

        const key = `${Date.now()}-${file.name}`;
        await env.PHOTO_BUCKET.put(key, file.stream());

        // Insert the image metadata into the D1 database
        const query = `
          INSERT INTO images (id, key, user_id, album_id)
          VALUES (?, ?, ?, ?)
        `;
        await env.PHOTO_DB.prepare(query).bind(crypto.randomUUID(), key, userId, albumId).run();

        return new Response(
          JSON.stringify({ message: "File uploaded successfully", key }),
          { headers }
        );
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
      console.error("Worker Error:", error); // Log error for debugging
      return new Response("Internal Server Error", { status: 500 });
    }
  },
};
