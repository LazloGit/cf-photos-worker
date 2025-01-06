import { useState, useEffect } from "react";

const authToken = "key7SBVpw5HtvATSm"; // Replace with your actual authorization token

interface User {
  id: string;
  username: string;
}

interface Album {
  id: string;
  name: string;
  user_id: string;
  created_at: string;
}

function AlbumsPage() {
  const [albums, setAlbums] = useState<Album[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [newAlbumName, setNewAlbumName] = useState("");
  const [selectedUserId, setSelectedUserId] = useState("");
  const [error, setError] = useState("");

  // Fetch albums
  useEffect(() => {
    fetch("https://cf-photos-worker.paragio.workers.dev/albums", {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    })
      .then((response) => response.json())
      .then((data: Album[]) => setAlbums(data))
      .catch((error) => console.error("Error fetching albums:", error));
  }, []);

  // Fetch users
  useEffect(() => {
    fetch("https://cf-photos-worker.paragio.workers.dev/users", {
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    })
      .then((response) => response.json())
      .then((data: User[]) => setUsers(data))
      .catch((error) => console.error("Error fetching users:", error));
  }, []);

  // Add a new album
  const addAlbum = () => {
    if (!newAlbumName.trim() || !selectedUserId.trim()) {
      setError("Album name and User are required.");
      return;
    }

    fetch("https://cf-photos-worker.paragio.workers.dev/albums", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${authToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ name: newAlbumName, user_id: selectedUserId }),
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to create album.");
        }
        return response.json();
      })
      .then((newAlbum: Album) => {
        setAlbums((prevAlbums) => [...prevAlbums, newAlbum]);
        setNewAlbumName("");
        setSelectedUserId("");
        setError("");
      })
      .catch((error) => {
        console.error("Error adding album:", error);
        setError(error.message);
      });
  };

  // Delete an album
  const deleteAlbum = (albumId: string) => {
    fetch(`https://cf-photos-worker.paragio.workers.dev/albums/${albumId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${authToken}`,
      },
    })
      .then((response) => {
        if (!response.ok) {
          throw new Error("Failed to delete album.");
        }
        setAlbums(albums.filter((album) => album.id !== albumId));
      })
      .catch((error) => setError(error.message));
  };

  return (
    <div className="page-content">
      <h1>Manage Albums</h1>
      {error && <p style={{ color: "red" }}>{error}</p>}
      <div>
        <input
          type="text"
          value={newAlbumName}
          onChange={(e) => setNewAlbumName(e.target.value)}
          placeholder="New Album Name"
        />
        <select
          value={selectedUserId}
          className="add-album-form"
          onChange={(e) => setSelectedUserId(e.target.value)}
        >
          <option value="" disabled>
            Select User
          </option>
          {users.map((user) => (
            <option key={user.id} value={user.id}>
              {user.username}
            </option>
          ))}
        </select>
        <button className="add-btn" onClick={addAlbum}>Add Album</button>
      </div>
      <ul>
        {albums.map((album) => (
          <li key={album.id}>
            <span>
              {album.name} (Created on: {new Date(album.created_at).toLocaleString()}){" "}
            </span>
            <button className="delete-btn" onClick={() => deleteAlbum(album.id)}>Delete</button>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default AlbumsPage;
