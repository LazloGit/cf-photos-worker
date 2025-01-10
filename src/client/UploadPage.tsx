import { useState, useEffect } from "react";

const authToken = "key7SBVpw5HtvATSm"; // Replace with your actual authorization token

function UploadPage() {
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadStatus, setUploadStatus] = useState<string>("");
  const [users, setUsers] = useState<{ id: string; username: string }[]>([]);
  const [albums, setAlbums] = useState<{ id: string; name: string }[]>([]);
  const [selectedUser, setSelectedUser] = useState<string>("");
  const [selectedAlbum, setSelectedAlbum] = useState<string>("");

  // Fetch users and albums on page load
  useEffect(() => {
    async function fetchMetadata() {
      try {
        const userResponse = await fetch(
          "https://cf-photos-worker.paragio.workers.dev/api/users",
          { headers: { Authorization: `Bearer ${authToken}` } }
        );
        const albumResponse = await fetch(
          "https://cf-photos-worker.paragio.workers.dev/api/albums",
          { headers: { Authorization: `Bearer ${authToken}` } }
        );

        if (userResponse.ok && albumResponse.ok) {
          const usersData = await userResponse.json();
          const albumsData = await albumResponse.json();
          setUsers(usersData);
          setAlbums(albumsData);
        } else {
          console.error("Failed to fetch users or albums.");
        }
      } catch (error) {
        console.error("Error fetching metadata:", error);
      }
    }

    fetchMetadata();
  }, []);

  // Handle file selection
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0]) {
      setSelectedFile(event.target.files[0]);
    }
  };

  // Handle upload
  const handleUpload = async () => {
    if (!selectedFile || !selectedUser || !selectedAlbum) {
      setUploadStatus("Please select a file, user, and album.");
      return;
    }

    const formData = new FormData();
    formData.append("file", selectedFile);
    formData.append("user_id", selectedUser);
    formData.append("album_id", selectedAlbum);

    try {
      const response = await fetch(
        "https://cf-photos-worker.paragio.workers.dev/api/upload",
        {
          method: "POST",
          headers: {
            Authorization: `Bearer ${authToken}`,
          },
          body: formData,
        }
      );

      if (response.ok) {
        const data = await response.json();
        setUploadStatus(`Upload successful: ${data.message}`);
      } else {
        const errorText = await response.text();
        setUploadStatus(`Upload failed: ${response.status} - ${errorText}`);
      }
    } catch (error) {
      console.error("Upload error:", error);
      setUploadStatus("Error during upload.");
    }
  };

  return (
    <div className="page-content">
      <h1>Upload a Photo</h1>
      <div>
        <label htmlFor="user-select">Select User:</label>
        <select
          id="user-select"
          className="add-album-form"
          value={selectedUser}
          onChange={(e) => setSelectedUser(e.target.value)}
        >
          <option value="">Select a user</option>
          {users.map((user) => (
            <option key={user.id} value={user.id}>
              {user.username}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label htmlFor="album-select">Select Album:</label>
        <select
          id="album-select"
          className="add-album-form"
          value={selectedAlbum}
          onChange={(e) => setSelectedAlbum(e.target.value)}
        >
          <option value="">Select an album</option>
          {albums.map((album) => (
            <option key={album.id} value={album.id}>
              {album.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <input type="file" onChange={handleFileChange} />
        <button className="add-btn" onClick={handleUpload}>Upload</button>
        {uploadStatus && <p>{uploadStatus}</p>}
      </div>
    </div>

  );
}

export default UploadPage;
