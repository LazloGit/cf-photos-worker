import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import GalleryPage from "./GalleryPage";
import UploadPage from "./UploadPage";
import AlbumsPage from "./AlbumsPage";
import ImagesPage from "./ImagesPage";
import SearchPage from "./SearchPage";
import { Link } from "react-router-dom";
import "./App.css"; 

function App() {
  return (
    <Router>
      <div className="App">
        {/* Top navigation menu */}
        <nav className="top-menu">
          <Link to="/">Gallery</Link>
          <Link to="/albums">Albums</Link>
          <Link to="/upload">Upload</Link>
          <Link to="/images">Manage Tags</Link>
          <Link to="/search">Search</Link>
        </nav>

        {/* Main content area */}
        <div className="main-content">
          <Routes>
            <Route path="/" element={<GalleryPage />} />
            <Route path="/upload" element={<UploadPage />} />
            <Route path="/albums" element={<AlbumsPage />} />
            <Route path="/images" element={<ImagesPage />} />
            <Route path="/search" element={<SearchPage />} />
          </Routes>
        </div>

        {/* Footer */}
        <footer className="footer">
          <p>&copy; 2025 CF Photo Gallery App. All rights reserved.</p>
        </footer>
      </div>
    </Router>
  );
}

export default App;

