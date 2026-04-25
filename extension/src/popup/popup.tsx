import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";

const APP_URL = "https://vantage-three-murex.vercel.app";

type Status = "idle" | "scanning" | "confirming" | "filling" | "done" | "error";
type AuthState = "loading" | "connected" | "disconnected";

function Popup() {
  const [userId, setUserId]         = useState<string>("");
  const [authState, setAuthState]   = useState<AuthState>("loading");
  const [status, setStatus]         = useState<Status>("idle");
  const [fieldCount, setFieldCount] = useState<number>(0);
  const [errorMsg, setErrorMsg]     = useState<string>("");

  useEffect(() => {
    // First check local storage
    chrome.storage.sync.get(["vantage_user_id"], async (res) => {
      if (res.vantage_user_id) {
        setUserId(res.vantage_user_id);
        setAuthState("connected");
        return;
      }
      // Try fetching from the API (works if user is signed in to Vantage in Chrome)
      await tryAutoConnect();
    });
  }, []);

  async function tryAutoConnect(): Promise<boolean> {
    try {
      const resp = await fetch(`${APP_URL}/api/whoami`, {
        credentials: "include",
      });
      if (!resp.ok) { setAuthState("disconnected"); return false; }
      const { userId: id } = await resp.json();
      if (id) {
        chrome.storage.sync.set({ vantage_user_id: id });
        setUserId(id);
        setAuthState("connected");
        return true;
      }
    } catch { /* network error */ }
    setAuthState("disconnected");
    return false;
  }

  async function handleConnect() {
    // Open Vantage sign-in, then poll /api/whoami until we get a userId
    chrome.tabs.create({ url: `${APP_URL}/sign-in` });
    setAuthState("loading");
    const poll = setInterval(async () => {
      const ok = await tryAutoConnect();
      if (ok) clearInterval(poll);
    }, 1500);
    setTimeout(() => { clearInterval(poll); setAuthState("disconnected"); }, 60000);
  }

  function handleDisconnect() {
    chrome.storage.sync.remove("vantage_user_id");
    setUserId("");
    setAuthState("disconnected");
    setStatus("idle");
  }

  async function handleScan() {
    setStatus("scanning");
    setErrorMsg("");
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab.id) return;
    chrome.tabs.sendMessage(tab.id, { type: "SCAN_FORM" }, (response) => {
      if (!response?.formHtml) {
        setStatus("error");
        setErrorMsg("No form detected on this page.");
        return;
      }
      setFieldCount(response.fieldCount ?? 0);
      setStatus("confirming");
      chrome.storage.session.set({ pending_form_html: response.formHtml });
    });
  }

  async function handleFill() {
    setStatus("filling");
    chrome.storage.session.get(["pending_form_html"], async (res) => {
      const formHtml = res.pending_form_html;
      if (!formHtml) { setStatus("error"); setErrorMsg("Session expired. Scan again."); return; }
      try {
        const resp = await fetch(`${APP_URL}/api/autofill`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ formHtml, userId }),
        });
        if (!resp.ok) throw new Error(`API error ${resp.status}`);
        const { mapping } = await resp.json();
        const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
        if (!tab.id) return;
        chrome.tabs.sendMessage(tab.id, { type: "FILL_FORM", mapping }, () => setStatus("done"));
      } catch (err) {
        setStatus("error");
        setErrorMsg(err instanceof Error ? err.message : "Unknown error");
      }
    });
  }

  return (
    <div style={{ fontFamily: "system-ui,sans-serif", padding: "16px", display: "flex", flexDirection: "column", gap: "14px", minHeight: "160px" }}>

      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <img src={`${APP_URL}/vantage-mark.svg`} alt="" width={26} height={27} />
          <span style={{ fontWeight: 800, fontSize: "15px", color: "#fafafa" }}>Vantage</span>
        </div>
        <span style={{ fontSize: "10px", color: "#52525b", fontFamily: "monospace" }}>v1.0.0</span>
      </div>

      <div style={{ height: "1px", background: "#27272a" }} />

      {/* Auth states */}
      {authState === "loading" && (
        <p style={{ color: "#71717a", fontSize: "13px", textAlign: "center", marginTop: "8px" }}>Connecting…</p>
      )}

      {authState === "disconnected" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <p style={{ color: "#a1a1aa", fontSize: "13px", textAlign: "center", lineHeight: 1.5 }}>
            Sign in to Vantage to enable auto-fill.
          </p>
          <button onClick={handleConnect} style={btn("#2dcfbe", "#09090b")}>
            Sign in to Vantage
          </button>
        </div>
      )}

      {authState === "connected" && (
        <>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
            <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
              <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#2dcfbe", display: "inline-block" }} />
              <span style={{ fontSize: "12px", color: "#2dcfbe" }}>Connected</span>
            </div>
            <button onClick={handleDisconnect} style={{ background: "none", border: "none", color: "#52525b", fontSize: "11px", cursor: "pointer" }}>
              Disconnect
            </button>
          </div>

          {status === "idle" && (
            <button onClick={handleScan} style={btn("#fafafa", "#09090b")}>Scan Form on This Page</button>
          )}
          {status === "scanning" && (
            <p style={{ color: "#71717a", fontSize: "13px", textAlign: "center" }}>Scanning…</p>
          )}
          {status === "confirming" && (
            <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
              <div style={{ background: "#18181b", border: "1px solid #27272a", borderRadius: "8px", padding: "11px", fontSize: "13px", color: "#a1a1aa" }}>
                Found <strong style={{ color: "#fafafa" }}>{fieldCount} fields</strong>. Allow Vantage to fill this form?
              </div>
              <div style={{ display: "flex", gap: "8px" }}>
                <button onClick={handleFill} style={{ ...btn("#2dcfbe", "#09090b"), flex: 1 }}>Allow & Fill</button>
                <button onClick={() => setStatus("idle")} style={{ ...btn("transparent", "#a1a1aa", "#3f3f46"), flex: 1 }}>Cancel</button>
              </div>
            </div>
          )}
          {status === "filling" && (
            <p style={{ color: "#71717a", fontSize: "13px", textAlign: "center" }}>Filling in your details…</p>
          )}
          {status === "done" && (
            <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: "10px" }}>
              <p style={{ color: "#2dcfbe", fontWeight: 700, fontSize: "14px" }}>Form filled ✓</p>
              <button onClick={() => setStatus("idle")} style={btn("#27272a", "#a1a1aa")}>Done</button>
            </div>
          )}
          {status === "error" && (
            <div style={{ textAlign: "center", display: "flex", flexDirection: "column", gap: "10px" }}>
              <p style={{ color: "#f87171", fontSize: "13px" }}>{errorMsg || "Something went wrong."}</p>
              <button onClick={() => setStatus("idle")} style={btn("#27272a", "#a1a1aa")}>Retry</button>
            </div>
          )}
        </>
      )}
    </div>
  );
}

function btn(bg: string, color: string, border?: string): React.CSSProperties {
  return {
    background: bg, color,
    border: border ? `1px solid ${border}` : "none",
    borderRadius: "8px", padding: "9px 14px",
    fontWeight: 600, cursor: "pointer", fontSize: "13px", width: "100%",
  };
}

createRoot(document.getElementById("root")!).render(<Popup />);
