import React, { useEffect, useState } from "react";
import { createRoot } from "react-dom/client";

const APP_URL = "https://vantage-three-murex.vercel.app";

type Status = "idle" | "scanning" | "confirming" | "filling" | "done" | "error";

function Popup() {
  const [userId, setUserId] = useState<string>("");
  const [status, setStatus] = useState<Status>("idle");
  const [fieldCount, setFieldCount] = useState<number>(0);
  const [errorMsg, setErrorMsg] = useState<string>("");

  useEffect(() => {
    chrome.storage.sync.get(["vantage_user_id"], (res) => {
      if (res.vantage_user_id) setUserId(res.vantage_user_id);
    });
  }, []);

  function saveUserId() {
    chrome.storage.sync.set({ vantage_user_id: userId });
  }

  async function handleScan() {
    setStatus("scanning");
    setErrorMsg("");

    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
    if (!tab.id) return;

    // Ask content script to collect the form HTML
    chrome.tabs.sendMessage(tab.id, { type: "SCAN_FORM" }, (response) => {
      if (!response || !response.formHtml) {
        setStatus("error");
        setErrorMsg("No form detected on this page.");
        return;
      }

      setFieldCount(response.fieldCount ?? 0);
      setStatus("confirming");

      // Store the formHtml temporarily
      chrome.storage.session.set({ pending_form_html: response.formHtml });
    });
  }

  async function handleFill() {
    setStatus("filling");

    chrome.storage.session.get(["pending_form_html"], async (res) => {
      const formHtml = res.pending_form_html;
      if (!formHtml) {
        setStatus("error");
        setErrorMsg("Session expired. Scan again.");
        return;
      }

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

        chrome.tabs.sendMessage(tab.id, { type: "FILL_FORM", mapping }, () => {
          setStatus("done");
        });
      } catch (err) {
        setStatus("error");
        setErrorMsg(err instanceof Error ? err.message : "Unknown error");
      }
    });
  }

  return (
    <div style={{ padding: "20px", display: "flex", flexDirection: "column", gap: "16px" }}>
      {/* Header */}
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <img
            src={`${APP_URL}/vantage-mark.svg`}
            alt="Vantage"
            width={28}
            height={29}
            style={{ display: "block" }}
          />
          <span style={{ fontWeight: 800, fontSize: "15px", letterSpacing: "-0.2px", color: "#fafafa" }}>
            Vantage
          </span>
        </div>
        <span style={{ fontSize: "10px", color: "#52525b", fontFamily: "monospace" }}>
          v1.0.0
        </span>
      </div>

      {/* User ID input */}
      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
        <label style={{ fontSize: "11px", color: "#71717a", textTransform: "uppercase", letterSpacing: "0.05em" }}>
          Your Clerk User ID
        </label>
        <div style={{ display: "flex", gap: "6px" }}>
          <input
            value={userId}
            onChange={(e) => setUserId(e.target.value)}
            placeholder="user_..."
            style={{
              flex: 1, background: "#18181b", border: "1px solid #27272a",
              borderRadius: "6px", color: "#fafafa", padding: "6px 10px", fontSize: "12px",
              fontFamily: "monospace",
            }}
          />
          <button
            onClick={saveUserId}
            style={{
              background: "#27272a", border: "none", borderRadius: "6px",
              color: "#a1a1aa", padding: "6px 10px", cursor: "pointer", fontSize: "12px",
            }}
          >
            Save
          </button>
        </div>
        <p style={{ fontSize: "10px", color: "#52525b" }}>
          Find this in your Vantage dashboard settings.
        </p>
      </div>

      <hr style={{ borderColor: "#27272a" }} />

      {/* Actions */}
      {status === "idle" && (
        <button
          onClick={handleScan}
          disabled={!userId}
          style={{
            background: userId ? "#fafafa" : "#27272a",
            color: userId ? "#09090b" : "#52525b",
            border: "none", borderRadius: "8px", padding: "10px",
            fontWeight: 600, cursor: userId ? "pointer" : "not-allowed",
            fontSize: "14px",
          }}
        >
          Scan Form on This Page
        </button>
      )}

      {status === "scanning" && (
        <p style={{ textAlign: "center", color: "#71717a", fontSize: "13px" }}>Scanning…</p>
      )}

      {status === "confirming" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
          <div style={{
            background: "#18181b", border: "1px solid #27272a", borderRadius: "8px",
            padding: "12px", fontSize: "13px", color: "#a1a1aa",
          }}>
            Found <strong style={{ color: "#fafafa" }}>{fieldCount} fields</strong>.
            Grant permission to auto-fill this form?
          </div>
          <div style={{ display: "flex", gap: "8px" }}>
            <button
              onClick={handleFill}
              style={{
                flex: 1, background: "#fafafa", color: "#09090b", border: "none",
                borderRadius: "8px", padding: "9px", fontWeight: 600,
                cursor: "pointer", fontSize: "13px",
              }}
            >
              Allow & Fill
            </button>
            <button
              onClick={() => setStatus("idle")}
              style={{
                flex: 1, background: "transparent", color: "#71717a",
                border: "1px solid #27272a", borderRadius: "8px",
                padding: "9px", cursor: "pointer", fontSize: "13px",
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}

      {status === "filling" && (
        <p style={{ textAlign: "center", color: "#71717a", fontSize: "13px" }}>Filling…</p>
      )}

      {status === "done" && (
        <div style={{ textAlign: "center" }}>
          <p style={{ color: "#4ade80", fontWeight: 600, fontSize: "14px" }}>Form filled!</p>
          <button
            onClick={() => setStatus("idle")}
            style={{
              marginTop: "10px", background: "transparent", color: "#71717a",
              border: "1px solid #27272a", borderRadius: "6px",
              padding: "6px 12px", cursor: "pointer", fontSize: "12px",
            }}
          >
            Done
          </button>
        </div>
      )}

      {status === "error" && (
        <div style={{ textAlign: "center" }}>
          <p style={{ color: "#f87171", fontSize: "13px" }}>{errorMsg || "Something went wrong."}</p>
          <button
            onClick={() => setStatus("idle")}
            style={{
              marginTop: "10px", background: "transparent", color: "#71717a",
              border: "1px solid #27272a", borderRadius: "6px",
              padding: "6px 12px", cursor: "pointer", fontSize: "12px",
            }}
          >
            Retry
          </button>
        </div>
      )}
    </div>
  );
}

createRoot(document.getElementById("root")!).render(<Popup />);
