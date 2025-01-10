const API_KEY = 'key7SBVpw5HtvATSm'; // Set your API key here
const WORKERS_AI_API_TOKEN = 'XKEsUF7KR6GE3y8PFY8Nd3WFaOTz5TKoW_GvFL3S'; // Set your AI API token here
const API_PREFIX = "/api/";

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const url = new URL(request.url);

		if (url.pathname.startsWith(API_PREFIX)) {
			return await handleApiRequest(request, env, ctx); // Route for API calls
		}

		return await handleStaticOrOtherRequest(request, env, ctx); // Route for non-API calls
	},
} satisfies ExportedHandler<{
	PHOTO_DB: D1Database;
	PHOTO_BUCKET: R2Bucket;
}>;

async function handleApiRequest(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
	// Set CORS headers for local development
	const headers = {
		'Content-Type': 'application/json',
		'Access-Control-Allow-Origin': '*', // Allow requests from any origin
		'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS', // Allowed methods
		'Access-Control-Allow-Headers': 'Authorization, Content-Type', // Include Content-Type
	};
	
	try {
		const url = new URL(request.url);
		const apiPath = url.pathname.slice(API_PREFIX.length - 1);

		console.log('API Path:', apiPath);

		// If it's a preflight request (OPTIONS), respond with CORS headers
		if (request.method === 'OPTIONS') {
			return new Response(null, { headers });
		}

		// Check for Authorization header
		const authHeader = request.headers.get('Authorization');
		if (authHeader !== `Bearer ${API_KEY}`) {
			return new Response('Unauthorized', { status: 401, headers });
		}

		// Handle GET /users (list users)
		if (apiPath === '/users' && request.method === 'GET') {
			const query = 'SELECT id, username FROM users';
			const { results } = await env.PHOTO_DB.prepare(query).all();

			return new Response(JSON.stringify(results), { headers });
		}

		// Handle GET /albums (list albums)
		if (apiPath === '/albums' && request.method === 'GET') {
			const query = `
          SELECT albums.id, albums.name, users.username, albums.created_at 
          FROM albums 
          INNER JOIN users ON albums.user_id = users.id
        `;
			const { results } = await env.PHOTO_DB.prepare(query).all();

			return new Response(JSON.stringify(results), { headers });
		}

		// Handle GET /photos (list photos)
		if (apiPath === '/photos' && request.method === 'GET') {
			const query = `
          SELECT images.id, images.key, users.username, albums.name AS album_name, images.created_at 
          FROM images
          INNER JOIN users ON images.user_id = users.id
          LEFT JOIN albums ON images.album_id = albums.id
        `;
			const { results } = await env.PHOTO_DB.prepare(query).all();

			return new Response(JSON.stringify(results), { headers });
		}

		// Handle POST /albums (create album)
		if (apiPath === '/albums' && request.method === 'POST') {
			try {
				const { name, user_id } = await request.json();

				if (!name || !user_id) {
					return new Response('Invalid data', { status: 400, headers });
				}

				const id = crypto.randomUUID(); // Generate the album ID
				const query = 'INSERT INTO albums (id, name, user_id) VALUES (?, ?, ?)';
				await env.PHOTO_DB.prepare(query).bind(id, name, user_id).run();

				// Fetch the inserted row to return full data
				const fetchQuery = 'SELECT id, name, user_id, created_at FROM albums WHERE id = ?';
				const results = await env.PHOTO_DB.prepare(fetchQuery).bind(id).first(); // Use the same `id`

				return new Response(JSON.stringify(results), { headers });
			} catch (err) {
				console.error('Error in POST /albums:', err);
				return new Response('Internal Server Error', { status: 500, headers });
			}
		}

		// Handle DELETE /albums/:id (delete album)
		if (apiPath.startsWith('/albums/') && request.method === 'DELETE') {
			try {
				const albumId = apiPath.split('/albums/')[1];

				if (!albumId) {
					return new Response('Album ID is required', { status: 400, headers });
				}

				// Delete album from the database
				const query = 'DELETE FROM albums WHERE id = ?';
				const result = await env.PHOTO_DB.prepare(query).bind(albumId).run();

				if (result.changes === 0) {
					return new Response('Album not found', { status: 404, headers });
				}

				return new Response(JSON.stringify({ message: 'Album deleted successfully' }), { headers });
			} catch (err) {
				console.error('Error in DELETE /albums/:id:', err);
				return new Response('Internal Server Error', { status: 500, headers });
			}
		}

		// Image upload with AI-based tag generation
		if (request.method === 'POST' && apiPath === '/upload') {
			const formData = await request.formData();
			const file = formData.get('file');
			const userId = formData.get('user_id');
			const albumId = formData.get('album_id');

			if (!file || !userId || !albumId) {
				return new Response('Invalid data', { status: 400, headers });
			}

			const key = `${Date.now()}-${file.name}`;
			await env.PHOTO_BUCKET.put(key, file.stream());

			const imageId = crypto.randomUUID();
			const query = `
				INSERT INTO images (id, key, user_id, album_id)
				VALUES (?, ?, ?, ?)
			`;
			await env.PHOTO_DB.prepare(query).bind(imageId, key, userId, albumId).run();

			// Pass the uploaded file to ResNet-50 for image classification
			const aiResponse = await fetch('https://api.cloudflare.com/client/v4/accounts/a5dd8a5db90c0842adde8d76b85c782d/ai/run/@cf/microsoft/resnet-50', {

				method: 'POST',
				body: file.stream(), // Send the image as a stream
				headers: {
					'Authorization': `Bearer ${WORKERS_AI_API_TOKEN}`, 
					'Content-Type': 'application/octet-stream',
				},
			});

			if (!aiResponse.ok) {
				console.error('AI model call failed:', await aiResponse.text());
				return new Response(JSON.stringify({ message: 'File uploaded, but AI tagging failed' }), { headers });
			}

			const aiResult = await aiResponse.json();
			const predictions = aiResult.result || [];

			console.log('AI model response:', aiResult);
			console.log('Predictions extracted:', predictions);

			// Extract tags (filter predictions based on a confidence threshold)
			const tags = predictions
				.filter(prediction => prediction.score >= 0.01) // Adjust threshold as needed
				.map(prediction => prediction.label.toLowerCase());

			console.log('Filtered predictions:', predictions);
			console.log('Extracted tags:', tags.length, tags);
			
			console.log('AI model tags added:', tags.length, tags);

			  

			// Store tags in the database
			if (tags.length > 0) {
				console.log(`Saving ${tags.length} tags to the database:`, tags);

				const tagInsert = 'INSERT OR IGNORE INTO tags (id, name) VALUES (?, ?)';
				const tagRelInsert = 'INSERT INTO image_tags (image_id, tag_id) VALUES (?, ?)';

				for (const tag of tags) {
					const tagId = `tag-${crypto.randomUUID()}`;
					await env.PHOTO_DB.prepare(tagInsert).bind(tagId, tag).run();

					const tagRow = await env.PHOTO_DB.prepare('SELECT id FROM tags WHERE name = ?').bind(tag).first();
					if (tagRow) {
						await env.PHOTO_DB.prepare(tagRelInsert).bind(imageId, tagRow.id).run();
					}
				}
			} else {
				console.log('No tags to save.');
			}

			return new Response(
				JSON.stringify({
					message: 'File uploaded successfully with AI-generated tags',
					key,
					tags
				}),
				{ headers }
			);
		}


		// Handle GET /photos/:key (fetch photo)
		if (request.method === 'GET' && apiPath.startsWith('/photos/')) {
			const key = apiPath.split('/photos/')[1];
			const object = await env.PHOTO_BUCKET.get(key);

			if (!object) {
				return new Response('File not found', { status: 404, headers });
			}

			return new Response(object.body, {
				headers: {
					'Content-Type': object.httpMetadata?.contentType || 'application/octet-stream',
					'Access-Control-Allow-Origin': '*',
					'Access-Control-Allow-Methods': 'GET',
					'Access-Control-Allow-Headers': 'Authorization',
				},
			});
		}

		if (apiPath === '/tags' && request.method === 'GET') {
			// Fetch all tags
			const query = 'SELECT * FROM tags';
			const tags = await env.PHOTO_DB.prepare(query).all();
			return new Response(JSON.stringify(tags), { status: 200, headers: { 'Content-Type': 'application/json' } });
		}

		if (apiPath === '/tags' && request.method === 'POST') {
			// Add tags to an image
			const { image_id, tags } = await request.json();

			if (!image_id || !tags?.length) {
				return new Response('Image ID and tags are required', { status: 400, headers });
			}

			const tagInsert = 'INSERT OR IGNORE INTO tags (id, name) VALUES (?, ?)';
			const tagRelInsert = 'INSERT INTO image_tags (image_id, tag_id) VALUES (?, ?)';

			for (const tag of tags) {
				const tagId = `tag-${crypto.randomUUID()}`;
				await env.PHOTO_DB.prepare(tagInsert).bind(tagId, tag).run();

				const tagRow = await env.PHOTO_DB.prepare('SELECT id FROM tags WHERE name = ?').bind(tag).first();
				if (tagRow) {
					await env.PHOTO_DB.prepare(tagRelInsert).bind(image_id, tagRow.id).run();
				}
			}

			return new Response(JSON.stringify({ message: 'Tags added successfully' }), { status: 200, headers });
		}

		if (apiPath.startsWith('/search') && request.method === 'GET') {
			const tag = url.searchParams.get('tag');

			if (!tag) {
				return new Response('Tag is required', {
					status: 400,
					headers, // Add CORS headers here
				});
			}

			try {
				const query = `
            SELECT images.* FROM images
            JOIN image_tags ON images.id = image_tags.image_id
            JOIN tags ON image_tags.tag_id = tags.id
            WHERE tags.name = ?`;
				const images = await env.PHOTO_DB.prepare(query).bind(tag).all();

				return new Response(JSON.stringify(images), { status: 200, headers });
			} catch (err) {
				console.error('Error in /search:', err);
				return new Response('Internal Server Error', {
					status: 500,
					headers, // Add CORS headers here
				});
			}
		}

		if (apiPath === '/images-with-tags' && request.method === 'GET') {
			try {
				// SQL query to fetch images and their tags
				const query = `
            SELECT images.id AS image_id, images.key, 
                  GROUP_CONCAT(tags.name) AS tags
            FROM images
            LEFT JOIN image_tags ON images.id = image_tags.image_id
            LEFT JOIN tags ON image_tags.tag_id = tags.id
            GROUP BY images.id
          `;

				const results = await env.PHOTO_DB.prepare(query).all();

				if (!results.results) {
					return new Response(JSON.stringify({ message: 'No images found.' }), { status: 404, headers });
				}

				// Format the response: tags should be an array
				const formattedResults = results.results.map((row) => ({
					id: row.image_id,
					key: row.key,
					tags: row.tags ? row.tags.split(',') : [],
				}));

				return new Response(JSON.stringify(formattedResults), {
					status: 200,
					headers,
				});
			} catch (err) {
				console.error('Error in GET /images-with-tags:', err);
				return new Response('Internal Server Error', {
					status: 500,
					headers,
				});
			}
		}

		return new Response('API EndPoint Not Found', { status: 404, headers });
	} catch (error) {
		console.error('Worker Error:', error);
		return new Response('Internal Server Error', { status: 500, headers });
	}
}

async function handleStaticOrOtherRequest(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
	const url = new URL(request.url);

	// Log for debugging
	console.log('Non-API request received:', url.pathname);

	// Serve index.html for frontend routes
	if (!url.pathname.startsWith('/api/')) {
		return fetch('https://cf-photos.pages.dev/index.html');
	}

	// Default fallback
	return new Response('Not Found', { status: 404 });
}
