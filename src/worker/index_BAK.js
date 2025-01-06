const API_KEY = "key7SBVpw5HtvATSm"; // Set your API key here

export default {
  async fetch(request, env) {
    try {
      const url = new URL(request.url);

      // Set CORS headers for local development
      const headers = {
        "Content-Type": "application/json",
        "Access-Control-Allow-Origin": "*", // Allow requests from any origin (or specify your domain)
        "Access-Control-Allow-Methods": "GET, POST", // Allow GET and POST methods
        "Access-Control-Allow-Headers": "Authorization", // Allow Authorization header
      };

      // If it's a preflight request (OPTIONS), respond with CORS headers
      if (request.method === "OPTIONS") {
        return new Response(null, {
          headers,
        });
      }

      // Check for Authorization header
      const authHeader = request.headers.get("Authorization");
      if (authHeader !== `Bearer ${API_KEY}`) {
        return new Response("Unauthorized", { status: 401, headers });
      }

      // Handle GET /photos (list photos)
      if (url.pathname === "/photos" && request.method === "GET") {
        const objects = [];
        const objectList = await env.PHOTO_BUCKET.list(); // Await the result

        if (objectList && objectList.objects) {
          for (const object of objectList.objects) {
            objects.push(object.key); // Push the object key (filename)
          }
        }

        return new Response(JSON.stringify(objects), {
          headers,
        });
      }

      // Handle POST /upload (upload photo)
      if (request.method === "POST" && url.pathname === "/upload") {
        const formData = await request.formData();
        const file = formData.get("file");

        if (!file) {
          return new Response("No file uploaded", { status: 400 });
        }

        const key = `${Date.now()}-${file.name}`;
        await env.PHOTO_BUCKET.put(key, file.stream());

        return new Response(`File uploaded as ${key}`, { status: 200 });
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
				"Content-Type": object.httpMetadata?.contentType || "application/octet-stream"
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
