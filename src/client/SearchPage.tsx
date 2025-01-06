import { useState } from "react";

const authToken = "key7SBVpw5HtvATSm"; // Replace with your actual authorization token

type SearchResult = {
  id: string;
  key: string;
  tags: string[];
};

type ApiResponseItem = {
  id: string;
  key: string;
};

function SearchPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResult[]>([]);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const searchImages = (e?: React.FormEvent) => {
    if (e) e.preventDefault(); // Prevent form submission reload

    if (!searchQuery.trim()) {
      setError("Search query cannot be empty.");
      return;
    }

    setLoading(true);
    fetch(
      `https://cf-photos-worker.paragio.workers.dev/search?tag=${encodeURIComponent(
        searchQuery
      )}`,
      {
        headers: {
          Authorization: `Bearer ${authToken}`,
        },
      }
    )
      .then((response) => {
        if (!response.ok) {
          throw new Error(`HTTP error! Status: ${response.status}`);
        }
        return response.json();
      })
      .then((data) => {
        if (data.success) {
          // Access the `results` array from the response
          const results = data.results.map((item: ApiResponseItem) => ({
            id: item.id,
            key: item.key,
            tags: [], // Add an empty array for tags since they're not provided
          }));
          setSearchResults(results);
          setError("");
        } else {
          setError("Search failed. Please try again.");
        }
      })
      .catch((error) => {
        console.error("Error searching images:", error);
        setError(`Failed to perform search: ${error.message}`);
      })
      .finally(() => setLoading(false));
  };

  return (
    <div className="page-content">
      <h1>Search Images</h1>
      {error && <p style={{ color: "red" }}>{error}</p>}
      <form onSubmit={searchImages}>
        <input
          type="text"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          placeholder="Search by tags (e.g., dog, vacation)"
        />
        <button
            className="add-btn"
            type="submit"
            disabled={!searchQuery.trim()}
          >
          Search
        </button>
      </form>

      {loading && <p>Loading...</p>}
      {searchResults.length === 0 && !loading && !error && (
        <p>No images found for the search query.</p>
      )}
      <ul>
        {searchResults.map((result: SearchResult) => (
          <li key={result.id}>
            <p>Image Key: {result.key}</p>
          </li>
        ))}
      </ul>
    </div>
  );
}

export default SearchPage;
