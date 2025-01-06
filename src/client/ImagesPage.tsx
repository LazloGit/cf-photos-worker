import { useState, useEffect } from "react";

const authToken = "key7SBVpw5HtvATSm"; // Replace with your actual authorization token

interface Image {
  id: string;
  key: string;
  tags?: string[]; // Include tags for each image
}

function ImagesPage() {
  const [images, setImages] = useState<Image[]>([]);
  const [tagInputs, setTagInputs] = useState<{ [key: string]: string }>({});
  const [error, setError] = useState("");

  // Fetch images with tags
  useEffect(() => {
    fetch("https://cf-photos-worker.paragio.workers.dev/images-with-tags", {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to fetch images.");
        }
        return response.json();
      })
      .then((data: Image[]) => setImages(data))
      .catch((error) => setError(error.message));
  }, []);

  // Add a new tag to an image
  const addTag = (imageId: string) => {
    const newTag = tagInputs[imageId]?.trim();

    if (!newTag) {
      setError("Tag cannot be empty.");
      return;
    }

    fetch(`https://cf-photos-worker.paragio.workers.dev/tags`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${authToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ image_id: imageId, tags: [newTag] }),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to add tag.");
        }
        return response.json();
      })
      .then(() => {
        setImages((prevImages) =>
          prevImages.map((img) =>
            img.id === imageId
              ? { ...img, tags: [...(img.tags || []), newTag] }
              : img
          )
        );
        setTagInputs((prevInputs) => ({ ...prevInputs, [imageId]: "" }));
        setError("");
      })
      .catch((error) => setError(error.message));
  };

  return (
    <div className="page-content">
      <h1>Manage Images</h1>
      {error && <p style={{ color: "red" }}>{error}</p>}
      <ul>
        {images.map((image) => (
          <li key={image.id}>
            <p>Image Key: {image.key}</p>
            <p>Tags: {image.tags?.join(", ") || "No tags"}</p>
            <input
              type="text"
              value={tagInputs[image.id] || ""}
              onChange={(e) =>
                setTagInputs({ ...tagInputs, [image.id]: e.target.value })
              }
              placeholder="New Tag"
            />
            <button
              className="add-btn"
              onClick={() => addTag(image.id)}
              disabled={!tagInputs[image.id]?.trim()}
            >
              Add Tag
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default ImagesPage;
