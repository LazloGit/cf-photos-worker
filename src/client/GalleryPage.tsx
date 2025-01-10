import { useState, useEffect } from "react";

const authToken = "key7SBVpw5HtvATSm"; // Replace with your actual authorization token

interface Photo {
  id: string;
  key: string;
  user_id: string;
  album_id: string | null;
  album_name: string | null;  // Add this field for album name
  created_at: string;
}

function GalleryPage() {
  const [photos, setPhotos] = useState<Photo[]>([]);
  const [imageUrls, setImageUrls] = useState<{ [key: string]: string }>({});
  const [selectedImageIndex, setSelectedImageIndex] = useState<number | null>(null);

  // Fetch the list of photos
  useEffect(() => {
    fetch("https://cf-photos-worker.paragio.workers.dev/api/photos", {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    })
      .then((response) => response.json())
      .then((data: Photo[]) => setPhotos(data))
      .catch((error) => console.error("Error fetching photos:", error));
  }, []);

  // Fetch images and create Blob URLs
  useEffect(() => {
    photos.forEach((photo) => {
      fetch(`https://cf-photos-worker.paragio.workers.dev/api/photos/${photo.key}`, {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      })
        .then((response) => response.blob())
        .then((blob) => {
          const imageUrl = URL.createObjectURL(blob);
          setImageUrls((prevUrls) => ({ ...prevUrls, [photo.key]: imageUrl }));
        })
        .catch((error) => console.error("Error fetching image:", error));
    });
  }, [photos]);

  const handleImageClick = (index: number) => {
    setSelectedImageIndex(index);
  };

  const closeModal = () => {
    setSelectedImageIndex(null);
  };

  const showPreviousImage = () => {
    if (selectedImageIndex !== null && selectedImageIndex > 0) {
      setSelectedImageIndex(selectedImageIndex - 1);
    }
  };

  const showNextImage = () => {
    if (selectedImageIndex !== null && selectedImageIndex < photos.length - 1) {
      setSelectedImageIndex(selectedImageIndex + 1);
    }
  };

  return (
    <div className="page-content">
      <h1>Photo Gallery</h1>
      <p>Total Images: {photos.length}</p>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(5, 1fr)", gap: "10px" }}>
        {photos.map((photo, index) => (
          <div key={photo.id} style={{ position: "relative" }}>
            <img
              src={imageUrls[photo.key]}
              alt={photo.key}
              style={{ width: "100%", cursor: "pointer" }}
              onClick={() => handleImageClick(index)}
            />
            {/* Display album name and created date */}
            <p style={{ fontSize: "0.8rem", textAlign: "center" }}>
              {photo.album_name ? `Album: ${photo.album_name}` : "No Album"}
            </p>
            <p style={{ fontSize: "0.8rem", textAlign: "center" }}>
              {new Date(photo.created_at).toLocaleString()}
            </p>
          </div>
        ))}
      </div>

      {selectedImageIndex !== null && (
        <div
          style={{
            position: "fixed",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            backgroundColor: "rgba(0, 0, 0, 0.8)",
            display: "flex",
            justifyContent: "center",
            alignItems: "center",
          }}
          onClick={closeModal}
        >
          <button
            onClick={(e) => {
              e.stopPropagation();
              showPreviousImage();
            }}
            style={{
              position: "absolute",
              left: "10px",
              top: "50%",
              transform: "translateY(-50%)",
              background: "none",
              border: "none",
              color: "white",
              fontSize: "2rem",
              cursor: "pointer",
            }}
          >
            &#8249; {/* Left arrow */}
          </button>
          <img
            src={imageUrls[photos[selectedImageIndex].key]}
            alt="Expanded View"
            style={{ maxWidth: "90%", maxHeight: "90%" }}
            onClick={(e) => e.stopPropagation()}
          />
          <button
            onClick={(e) => {
              e.stopPropagation();
              showNextImage();
            }}
            style={{
              position: "absolute",
              right: "10px",
              top: "50%",
              transform: "translateY(-50%)",
              background: "none",
              border: "none",
              color: "white",
              fontSize: "2rem",
              cursor: "pointer",
            }}
          >
            &#8250; {/* Right arrow */}
          </button>
        </div>
      )}
    </div>
  );
}

export default GalleryPage;
