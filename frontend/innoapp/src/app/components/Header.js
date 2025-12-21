import React from "react";
import { Sparkles } from "lucide-react";

// CSS for Header component (replaces Tailwind)
const headerStyles = `
.custom-header {
  border-bottom: 1px solid rgba(39,39,42,0.5);
  position: sticky;
  top: 0;
  z-index: 50;
  background: rgba(255,255,255,0.8);
  backdrop-filter: blur(6px);
  transition: background 0.3s;
}
.custom-header .header-inner {
  max-width: 1120px;
  margin: 0 auto;
  padding: 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.custom-header .logo-flex {
  display: flex;
  align-items: center;
  gap: 12px;
}
.custom-header .logo-gradient-bg {
  position: relative;
}
.custom-header .logo-gradient-bg .gradient-blur {
  position: absolute;
  inset: 0;
  background: linear-gradient(to right, #a78bfa, #06b6d4);
  border-radius: 8px;
  filter: blur(8px);
  opacity: 0.75;
  z-index: 0;
}
.custom-header .logo-gradient-bg .logo-box {
  position: relative;
  background: #000;
  padding: 8px 12px;
  border-radius: 8px;
  border: 1px solid rgba(168,139,250,0.5);
  z-index: 1;
  display: flex;
  align-items: center;
}
.custom-header .brand-title {
  background: linear-gradient(90deg, #a78bfa, #f472b6, #06b6d4);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
  background-clip: text;
  color: transparent;
  font-size: 1.3rem;
  font-weight: 700;
  margin-left: 4px;
}
.custom-header .nav-flex {
  display: flex;
  align-items: center;
  gap: 24px;
}
.custom-header .nav-btn {
  padding: 8px 16px;
  border-radius: 8px;
  font-weight: 500;
  font-size: 1rem;
  border: none;
  background: none;
  cursor: pointer;
  transition: all 0.18s;
}
.custom-header .nav-btn.selected {
  background: linear-gradient(90deg, #a78bfa, #06b6d4);
  color: #fff;
  font-weight: 800;
  box-shadow: 0 2px 12px 0 rgba(168,139,250,0.18);
  border: 2px solid #a78bfa;
  transform: scale(1.05);
  letter-spacing: 0.03em;
  text-shadow: 0 2px 8px rgba(0,0,0,0.25), 0 0 2px #fff;
}
.custom-header .nav-btn:not(.selected):hover {
  background: #f4f4f5;
  color: #000;
}
.custom-header .get-started-btn {
  padding: 8px 20px;
  border-radius: 8px;
  font-weight: 700;
  color: #fff;
  background: linear-gradient(90deg, #a78bfa, #06b6d4);
  box-shadow: 0 2px 8px 0 rgba(168,139,250,0.18);
  border: none;
  margin-left: 8px;
  cursor: pointer;
  transition: transform 0.18s;
}
.custom-header .get-started-btn:hover {
  transform: scale(1.05);
}
.custom-header .back-btn {
  padding: 8px 20px;
  border-radius: 8px;
  font-weight: 700;
  color: #fff;
  background: linear-gradient(90deg, #f97316, #ef4444);
  box-shadow: 0 2px 8px 0 rgba(239,68,68,0.18);
  border: none;
  margin-left: 8px;
  cursor: pointer;
  transition: transform 0.18s;
}
.custom-header .back-btn:hover {
  transform: scale(1.05);
}
@media (max-width: 768px) {
  .custom-header .nav-flex {
    display: none;
  }
}
`;

const navLinks = [
  { label: "Volvox", key: "volvox" },
  { label: "Kick Start", key: "kickstart" },
  { label: "Innoscope", key: "innoscope", selected: true },
  { label: "Smart Search", key: "smart_search" },
];

function getAuthSessionData() {
  let token = "";
  let userName = "";
  let userEmail = "";
  let userId = "";
  try {
    const authStorage = localStorage.getItem("token");
    const userStorage = localStorage.getItem("user");
    if (authStorage && userStorage) {
      token = authStorage;
      const userObj = JSON.parse(userStorage);
      userName = userObj.name || "";
      userEmail = userObj.email || "";
      userId = userObj.id || "";
      return { token, userName, userEmail, userId };
    }
  } catch (e) {
    // fallback to empty values
  }
  return { token, userName, userEmail, userId };
}

const openUrl = (key) => {
  let baseUrlEnv = "";
  if (key === "volvox") {
    baseUrlEnv = process.env.NEXT_PUBLIC_VOLVOX_API_KEY || "";
  } else if (key === "smart_search") {
    baseUrlEnv = process.env.NEXT_PUBLIC_SMART_SEARCH_API_KEY || "";
  } else if (key === "kickstart") {
    baseUrlEnv = process.env.NEXT_PUBLIC_KICKSTART_API_KEY || "";
  }

  const { token, userName, userEmail, userId } = getAuthSessionData();

  if (!baseUrlEnv) return;
  const url = new URL(baseUrlEnv);
  url.searchParams.set("token", token);
  url.searchParams.set("user_name", userName);
  url.searchParams.set("user_email", userEmail);
  url.searchParams.set("user_id", userId);
  window.open(url.toString(), "_blank");
};

export function Header() {
  function handleGetStarted() {
    const LOGOUT_URL =
      (process.env.NEXT_PUBLIC_LOGOUT_URL || "") + "/workflows";
    window.location.href = LOGOUT_URL;
  }

  function handleBackToDashboard() {
    const DASHBOARD_URL = process.env.NEXT_PUBLIC_LOGOUT_URL || "";
    window.location.href = DASHBOARD_URL;
  }

  return (
    <>
      <style>{headerStyles}</style>
      <header className="custom-header">
        <div className="header-inner">
          <div className="logo-flex">
            <div className="logo-gradient-bg">
              <div className="gradient-blur"></div>
              <div className="logo-box">
                <Sparkles style={{ width: 20, height: 20, color: "#a78bfa" }} />
              </div>
            </div>
            <h1 className="brand-title">idealForge AI</h1>
          </div>
          <div className="nav-flex">
            {navLinks.map((link) => (
              <button
                key={link.label}
                onClick={() => openUrl(link.key)}
                className={`nav-btn${link.selected ? " selected" : ""}`}
              >
                {link.label}
              </button>
            ))}
            <button onClick={handleGetStarted} className="get-started-btn">
              Get Started
            </button>
            <button onClick={handleBackToDashboard} className="back-btn">
              Back
            </button>
          </div>
        </div>
      </header>
    </>
  );
}
