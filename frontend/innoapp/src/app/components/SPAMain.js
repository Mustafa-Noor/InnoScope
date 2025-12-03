"use client";

import React, { useState } from "react";
import FileUpload from "./FileUpload";
import ChatUI from "./ChatInterface";

export default function SPAMain() {
  const [view, setView] = useState(null);

  return (
    <div style={styles.appContainer}>
      
      {/* HEADER */}
      <header style={styles.header}>
        <div style={styles.headerInner}>
          <div style={styles.logoBox}>
            <div style={styles.logo}>I</div>
            <span style={styles.logoTitle}>InnoScope</span>
          </div>

          <nav style={styles.nav}>
            <button
              className="btn btn-link"
              onClick={() => setView("upload")}
              style={{
                ...styles.navBtn,
                ...(view === "upload" ? styles.navBtnActive : {})
              }}
            >
              Upload
            </button>

            <button
              className="btn btn-link"
              onClick={() => setView("chat")}
              style={{
                ...styles.navBtn,
                ...(view === "chat" ? styles.navBtnActive : {})
              }}
            >
              Chat
            </button>
          </nav>
        </div>
      </header>

      {/* BODY */}
      <main className="container-fluid" style={styles.main}>
        <div style={styles.card}>
          {!view && (
            <div style={{ textAlign: "center", padding: "50px 20px" }}>
              <h1 style={styles.title}>Product Research Paper Analysis</h1>
              <p style={styles.subtitle}>
                Upload your research paper to evaluate feasibility and generate 
                a roadmap, or start a chat to brainstorm product ideas.
              </p>

              <div style={{ marginTop: 30 }}>
                <button
                  className="btn btn-success btn-lg mx-2"
                  onClick={() => setView("upload")}
                >
                  Upload File
                </button>

                <button
                  className="btn btn-info btn-lg mx-2 text-white"
                  onClick={() => setView("chat")}
                >
                  Chat with Assistant
                </button>
              </div>
            </div>
          )}

          {view === "upload" && <FileUpload />}
          {view === "chat" && <ChatUI />}
        </div>
      </main>
    </div>
  );
}

/* ---------------------- INTERNAL UI STYLES ---------------------- */
const styles = {
  appContainer: {
    minHeight: "100vh",
    background: "#f5f7fa",
    fontFamily: "Inter, system-ui, sans-serif",
  },

  /* Header */
  header: {
    width: "100%",
    background: "#fff",
    borderBottom: "1px solid #e5e7eb",
    boxShadow: "0 2px 6px rgba(0,0,0,0.04)",
    position: "sticky",
    top: 0,
    zIndex: 20,
  },

  headerInner: {
    maxWidth: 1200,
    margin: "0 auto",
    padding: "14px 20px",
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
  },

  logoBox: {
    display: "flex",
    alignItems: "center",
    gap: 10,
  },

  logo: {
    width: 38,
    height: 38,
    background: "linear-gradient(135deg,#0ea5a4,#10b981)",
    borderRadius: 12,
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: 700,
    fontSize: 18,
  },

  logoTitle: {
    fontSize: 20,
    fontWeight: 600,
    color: "#0f172a",
  },

  nav: {
    display: "flex",
    gap: 14,
  },

  navBtn: {
    fontSize: 16,
    color: "#475569",
    padding: "6px 14px",
    borderRadius: 8,
    border: "none",
    textDecoration: "none",
  },

  navBtnActive: {
    background: "#0ea5a4",
    color: "#fff",
    boxShadow: "0 4px 12px rgba(14,165,164,0.25)",
  },

  /* Main */
  main: {
    paddingTop: 40,
    paddingBottom: 40,
    display: "flex",
    justifyContent: "center",
  },

  card: {
    width: "100%",
    maxWidth: '100%',
    background: "#fff",
    borderRadius: 18,
    padding: 30,
    boxShadow: "0 12px 35px rgba(0,0,0,0.07)",
    minHeight: 300,
  },

  title: {
    fontSize: "2.2rem",
    fontWeight: 700,
    color: "#0f172a",
    marginBottom: 10,
  },

  subtitle: {
    fontSize: 16,
    color: "#64748b",
    maxWidth: 550,
    margin: "0 auto",
    lineHeight: 1.5,
  },
};