import { useState, useEffect } from 'react';


const authToken = "key7SBVpw5HtvATSm"; // Replace with your actual authorization token

function App() {
  const [photos, setPhotos] = useState<string[]>([]);
  const [imageUrls, setImageUrls] = useState<{ [key: string]: string }>({});

  // Fetch the list of photos
  useEffect(() => {
    fetch("https://cf-photos-worker.paragio.workers.dev/photos", {
      headers: {
        "Authorization": `Bearer ${authToken}`,
      },
    })
      .then((response) => response.json())
      .then((data) => {
        setPhotos(data);
      })
      .catch((error) => {
        console.error("Error fetching photos:", error);
      });
  }, []);

  // Fetch images and create Blob URLs
  useEffect(() => {
    photos.forEach((photo) => {
      fetch(`https://cf-photos-worker.paragio.workers.dev/photos/${photo}`, {
        headers: {
          "Authorization": `Bearer ${authToken}`,
        },
      })
        .then((response) => response.blob())
        .then((blob) => {
          const imageUrl = URL.createObjectURL(blob);
          setImageUrls((prevUrls) => ({ ...prevUrls, [photo]: imageUrl }));
        })
        .catch((error) => {
          console.error("Error fetching image:", error);
        });
    });
  }, [photos]);

  // Clean up Blob URLs when the component is unmounted
  useEffect(() => {
    return () => {
      Object.values(imageUrls).forEach((url) => {
        URL.revokeObjectURL(url); // Clean up Blob URL
      });
    };
  }, [imageUrls]);

  return (
    <div className="App">
      <h1>Photo Gallery</h1>
      <div>
        {photos.length === 0 ? (
          <p>No photos available.</p>
        ) : (
          photos.map((photo) => (
            <div key={photo} className="photo-item">
              <img
                src={imageUrls[photo]} // Use Blob URL
                alt={photo}
                style={{ width: '200px', height: '200px' }}
              />
              <p>{photo}</p>
            </div>
          ))
        )}
      </div>
    </div>
  );
}

export default App;
