
import { useRef, useState } from "react";
import { useStorageSync } from "./hooks/useStorageSync";

const IFRAME_ORIGIN = "http://localhost:5174";

export default function App() {
  const iframeRef = useRef(null);

  const {
    draft,
    saveDraft,
    filters,
    saveFilters,
    authCookie,
    refreshAuthCookie,
    storageError,
    lastSync,
  } = useStorageSync({
    initialDraft: { title: "", body: "" },
    initialFilters: { status: "all" },
    iframeRef,
    allowedOrigin: IFRAME_ORIGIN,
    authCookieName: "auth",
  });

  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");

  function handleSave() {
    saveDraft({ title, body });
  }

  function handleFilterChange(event) {
    saveFilters({ ...filters, status: event.target.value });
  }

  return (
    <main>
      <h1>Draft Editor</h1>

      <label>
        Title
        <input
          value={title}
          onChange={(event) => setTitle(event.target.value)}
        />
      </label>

      <label>
        Draft
        <textarea
          value={body}
          onChange={(event) => setBody(event.target.value)}
        />
      </label>

      <button onClick={handleSave}>Save draft</button>

      <h2>Saved draft</h2>
      <p>Title: {draft.title}</p>
      <p>Body: {draft.body}</p>

      <h2>Filter</h2>
      <select value={filters.status} onChange={handleFilterChange}>
        <option value="all">All</option>
        <option value="open">Open</option>
        <option value="completed">Completed</option>
      </select>

      <h2>Sync status</h2>
      <p>Last update source: {lastSync ?? "Not synced yet"}</p>

      {storageError && <p role="alert">{storageError}</p>}

      <button onClick={refreshAuthCookie}>
        Refresh readable cookie
      </button>
      <p>
        Readable auth cookie present: {authCookie ? "Yes" : "No"}
      </p>

      <iframe
        ref={iframeRef}
  src={`${IFRAME_ORIGIN}/iframe.html`}  
        title="Trusted draft widget"
        width="100%"
        height="200"
      />
    </main>
  );
}
