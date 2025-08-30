import React, { useEffect, useMemo, useState } from "react";

export default function App() {
  const PAGE_SIZE = 20;

  const [params, setParams] = useState({
    title: "harry potter",
    author: "",
    subject: "",
    isbn: "",
    language: "any",
    yearFrom: "",
    yearTo: "",
    sort: "relevance",
  });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [results, setResults] = useState([]);
  const [numFound, setNumFound] = useState(0);
  // eslint-disable-next-line no-unused-vars
  const [selected, setSelected] = useState(null);
  const [favorites, setFavorites] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem("bf_favorites") || "[]");
    } catch {
      return [];
    }
  });

  useEffect(() => {
    localStorage.setItem("bf_favorites", JSON.stringify(favorites));
  }, [favorites]);

  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(numFound / PAGE_SIZE)),
    [numFound]
  );

  const query = useMemo(() => {
    const sp = new URLSearchParams();
    if (params.title) sp.set("title", params.title);
    if (params.author) sp.set("author", params.author);
    if (params.subject) sp.set("subject", params.subject);
    if (params.isbn) sp.set("isbn", params.isbn);
    sp.set(
      "fields",
      [
        "key",
        "title",
        "author_name",
        "first_publish_year",
        "edition_count",
        "cover_i",
        "language",
        "isbn",
      ].join(",")
    );
    sp.set("limit", PAGE_SIZE);
    sp.set("page", page);
    if (params.language !== "any") sp.set("language", params.language);
    if (params.yearFrom) sp.set("first_publish_year>=", params.yearFrom);
    if (params.yearTo) sp.set("first_publish_year<=", params.yearTo);

    if (params.sort === "newest")
      sp.set("sort", "first_publish_year desc");
    else if (params.sort === "oldest")
      sp.set("sort", "first_publish_year asc");
    else if (params.sort === "editions")
      sp.set("sort", "edition_count desc");

    return sp.toString();
  }, [params, page]);

  useEffect(() => {
    setPage(1);
  }, [params.title, params.author, params.subject, params.isbn]);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      setError("");
      try {
        const res = await fetch(`https://openlibrary.org/search.json?${query}`);
        if (!res.ok) throw new Error("Network error");
        const data = await res.json();
        if (!cancelled) {
          setResults(data.docs || []);
          setNumFound(data.numFound || 0);
        }
      } catch (e) {
        if (!cancelled) setError(e.message || "Failed to fetch");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    run();
    return () => {
      cancelled = true;
    };
  }, [query]);

  function toggleFavorite(doc) {
    setFavorites((prev) => {
      const exists = prev.find((b) => b.key === doc.key);
      if (exists) return prev.filter((b) => b.key !== doc.key);
      const compact = {
        key: doc.key,
        title: doc.title,
        author_name: doc.author_name,
        cover_i: doc.cover_i,
        first_publish_year: doc.first_publish_year,
      };
      return [compact, ...prev].slice(0, 100);
    });
  }

  function coverUrl(cover_i, size = "M") {
    if (!cover_i) return "https://via.placeholder.com/200x300?text=No+Cover";
    return `https://covers.openlibrary.org/b/id/${cover_i}-${size}.jpg`;
  }

  return (
    <div style={styles.app}>
      <h1 style={styles.header}>📚 Book Finder</h1>
      <p style={{ color: "#aaa", textAlign: "center" }}>
        Find books fast with Open Library
      </p>

      <div style={styles.card}>
        <input
          style={styles.input}
          value={params.title}
          onChange={(e) => setParams((p) => ({ ...p, title: e.target.value }))}
          placeholder="Search by title..."
        />
      </div>

      
      <div style={styles.card}>
        {loading && <p>Loading...</p>}
        {error && <p style={{ color: "red" }}>{error}</p>}
        <p>{numFound.toLocaleString()} results</p>
        <div style={styles.grid}>
          {results.map((doc) => {
            const isFav = !!favorites.find((f) => f.key === doc.key);
            return (
              <div key={doc.key} style={styles.book}>
                <img
                  src={coverUrl(doc.cover_i)}
                  alt={doc.title}
                  style={styles.cover}
                />
                <h3>{doc.title}</h3>
                <p style={{ color: "#999" }}>
                  {(doc.author_name || ["Unknown"]).join(", ")}
                </p>
                <p style={{ fontSize: "12px", color: "#bbb" }}>
                  {doc.first_publish_year || "—"} • {doc.edition_count || 0} ed.
                </p>
                <button
                  style={styles.btn}
                  onClick={() => toggleFavorite(doc)}
                >
                  {isFav ? "★ Favorite" : "☆ Favorite"}
                </button>
              </div>
            );
          })}
        </div>
        <div style={styles.pagination}>
          <button
            style={styles.btn}
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
          >
            Prev
          </button>
          <span>
            Page {page} / {totalPages}
          </span>
          <button
            style={styles.btn}
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
          >
            Next
          </button>
        </div>
      </div>
    </div>
  );
}

const styles = {
  app: { maxWidth: 1000, margin: "0 auto", padding: 20, fontFamily: "sans-serif", color: "#eee" },
  header: { textAlign: "center" },
  card: { background: "#111", padding: 20, borderRadius: 12, margin: "20px 0" },
  input: { width: "100%", padding: 10, borderRadius: 8, border: "1px solid #333", background: "#222", color: "#fff" },
  grid: { display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(160px, 1fr))", gap: 16 },
  book: { background: "#1a1a1a", padding: 10, borderRadius: 8, textAlign: "center" },
  cover: { width: "100%", borderRadius: 6 },
  btn: { marginTop: 8, padding: "6px 10px", borderRadius: 6, border: "1px solid #444", background: "#333", color: "#fff", cursor: "pointer" },
  pagination: { display: "flex", justifyContent: "center", alignItems: "center", gap: 12, marginTop: 20 },
};
