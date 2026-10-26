import { useCallback, useEffect, useRef, useState } from "react";
import Cookies from "js-cookie";

const draftKey = "app:draft";
const filterKey = "app:filters";
const channelName = "app-storage-sync";
const messageType = "DRAFT_UPDATE";
const EMPTY_OBJECT = {};

function readJSON(storage, key, fallback) {
try {
    const raw = storage.getItem(key);
    return raw === null ? fallback : JSON.parse(raw);
} catch (error) {
    console.error(`Could not read ${key}:`, error);
    return fallback;
}
}

function isQuotaError(error) {
return (
    typeof DOMException !== "undefined" &&
    error instanceof DOMException &&
    (error.name === "QuotaExceededError" ||
    error.name === "NS_ERROR_DOM_QUOTA_REACHED")
);
}

function isValidDraftMessage(message) {
return (
    message !== null &&
    typeof message === "object" &&
    !Array.isArray(message) &&
    message.type === messageType &&
    Object.hasOwn(message, "draft")
);
}

export function useStorageSync({
initialDraft = EMPTY_OBJECT,
initialFilters = EMPTY_OBJECT,
iframeRef,
 allowedOrigin,
authCookieName = "auth",
} = {}) {
const [draft, setDraft] = useState(initialDraft);
const [filters, setFilters] = useState(initialFilters);  
const [authCookie, setAuthCookie] = useState(null);
const [storageError, setStorageError] = useState(null);
const [lastSync, setLastSync] = useState(null);

  // Keep one BroadcastChannel instance for this hook.
const channelRef = useRef(null);

  // Restore persisted values and read the cookie.
useEffect(() => {
    if (typeof window === "undefined") return;

    setDraft(
    readJSON(window.localStorage, draftKey, initialDraft)
    );

    setFilters(
    readJSON(window.sessionStorage, filterKey, initialFilters)
    );

    setAuthCookie(Cookies.get(authCookieName) ?? null);
}, [authCookieName, initialDraft, initialFilters]);

  // Receive updates from other same-origin tabs.
useEffect(() => {
    if (
    typeof window === "undefined" ||
    !("BroadcastChannel" in window)
    ) {
    return;
    }

    const channel = new BroadcastChannel(channelName);
    channelRef.current = channel;

    channel.onmessage = (event) => {
    if (!isValidDraftMessage(event.data)) return;

    setDraft(event.data.draft);
    setLastSync("BroadcastChannel");
    setStorageError(null);
    };

    return () => {
    channel.close();
    channelRef.current = null;
    };
}, []);

  // Receive localStorage updates from other tabs.
useEffect(() => {
    if (typeof window === "undefined") return;

    function handleStorage(event) {
    if (event.key !== draftKey || event.newValue === null) {
        return;
    }

    try {
        setDraft(JSON.parse(event.newValue));
        setLastSync("storage event");
        setStorageError(null);
    } catch {
        setStorageError("Another tab saved invalid draft JSON.");
    }
    }

    window.addEventListener("storage", handleStorage);

    return () => {
    window.removeEventListener("storage", handleStorage);
    };
}, []);

  // Receive messages only from the trusted iframe and origin.
useEffect(() => {
    if (
    typeof window === "undefined" ||
    !iframeRef?.current ||
    !allowedOrigin
    ) {
    return;
    }

    function handleMessage(event) {
    if (event.origin !== allowedOrigin) return;

    if (event.source !== iframeRef.current?.contentWindow) {
        return;
    }

    if (!isValidDraftMessage(event.data)) return;

    setDraft(event.data.draft);
    setLastSync("iframe");
    setStorageError(null);
    }

    window.addEventListener("message", handleMessage);

    return () => {
    window.removeEventListener("message", handleMessage);
    };
}, [iframeRef, allowedOrigin]);

  // Save the draft locally before broadcasting it.
const saveDraft = useCallback(
    (nextDraft) => {
    if (typeof window === "undefined") {
        setStorageError("Browser storage is unavailable.");
        return false;
    }

    let serialized;

    try {
        serialized = JSON.stringify(nextDraft);

        if (serialized === undefined) {
        throw new TypeError(
            "Draft must be JSON-serializable."
        );
        }

        window.localStorage.setItem(draftKey, serialized);
    } catch (error) {
        const message = isQuotaError(error)
        ? "Storage quota exceeded. Draft was not saved."
        : `Draft could not be saved: ${
            error instanceof Error ? error.message : String(error)
            }`;

        setStorageError(message);
        return false;
    }

    setDraft(nextDraft);
    setStorageError(null);

    const message = {
        type: messageType,
        draft: nextDraft,
    };

      // Notify other tabs through the persistent channel.
channelRef.current?.postMessage(message);

      // Send to the configured iframe origin.
if (iframeRef?.current?.contentWindow && allowedOrigin) {
        iframeRef.current.contentWindow.postMessage(
        message,
        allowedOrigin
        );
    }

    setLastSync("local");
    return true;
    },
    [iframeRef, allowedOrigin]
);

  // Save filters only in sessionStorage.
const saveFilters = useCallback((nextFilters) => {
    if (typeof window === "undefined") {
    setStorageError("Browser storage is unavailable.");
    return false;
    }

    try {
            const serialized = JSON.stringify(nextFilters);

    if (serialized === undefined) {
        throw new TypeError(
        "Filters must be JSON-serializable."
        );
    }

    window.sessionStorage.setItem(filterKey, serialized);

    setFilters(nextFilters);
    setStorageError(null);
    return true;
    } catch (error) {
    setStorageError(
        `Filters could not be saved: ${
        error instanceof Error ? error.message : String(error)
        }`
    );
    return false;
    }
}, []);

  // Refresh the readable cookie value.
const refreshAuthCookie = useCallback(() => {
    setAuthCookie(Cookies.get(authCookieName) ?? null);
}, [authCookieName]);

return {
    draft,
    saveDraft,
    filters,
    saveFilters,
    authCookie,
    refreshAuthCookie,
    storageError,
    lastSync,
};
}
