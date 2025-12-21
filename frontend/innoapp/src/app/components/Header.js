import React from "react";
import { Sparkles, Menu, X } from "lucide-react";
import { useState } from "react";

// CSS for Header component - aligned with app design system
const headerStyles = `
.custom-header {
  border-bottom: 1px solid rgba(226, 232, 240, 0.6);
  position: sticky;
  top: 0;
  z-index: 1000;
  background: rgba(255, 255, 255, 0.8);
  backdrop-filter: blur(12px);
  transition: all 0.3s ease;
}

.custom-header .header-inner {
  max-width: 1280px;
  margin: 0 auto;
  padding: 20px 24px;
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.custom-header .logo-flex {
  display: flex;
  align-items: center;
  gap: 12px;
}

.custom-header .logo-icon {
  width: 44px;
  height: 44px;
  background: linear-gradient(135deg, #059669 0%, #047857 100%);
  border-radius: 12px;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 4px 12px rgba(5, 150, 105, 0.2);
  color: white;
  flex-shrink: 0;
}

.custom-header .logo-icon svg {
  width: 24px;
  height: 24px;
}

.custom-header .brand-title {
  font-size: 18px;
  font-weight: 500;
  color: #0f172a;
  letter-spacing: -0.01em;
  margin: 0;
}

.custom-header .nav-flex {
  display: flex;
  align-items: center;
  gap: 32px;
}

.custom-header .nav-btn {
  padding: 8px 12px;
  border-radius: 8px;
  font-weight: 500;
  font-size: 15px;
  border: none;
  background: transparent;
  color: #64748b;
  cursor: pointer;
  transition: all 0.2s ease;
}

.custom-header .nav-btn:hover {
  color: #059669;
}

.custom-header .nav-btn.selected {
  color: #059669;
  background: rgba(5, 150, 105, 0.08);
  font-weight: 600;
}

.custom-header .btn-group {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-left: 20px;
}

.custom-header .get-started-btn {
  padding: 10px 20px;
  border-radius: 8px;
  font-weight: 500;
  color: #fff;
  background: linear-gradient(135deg, #059669 0%, #047857 100%);
  box-shadow: 0 4px 12px rgba(5, 150, 105, 0.2);
  border: none;
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 14px;
}

.custom-header .get-started-btn:hover {
  box-shadow: 0 6px 16px rgba(5, 150, 105, 0.3);
  transform: translateY(-1px);
}

.custom-header .back-btn {
  padding: 10px 20px;
  border-radius: 8px;
  font-weight: 500;
  color: #64748b;
  background: rgba(0, 0, 0, 0.03);
  border: 1px solid rgba(226, 232, 240, 0.6);
  cursor: pointer;
  transition: all 0.2s ease;
  font-size: 14px;
}

.custom-header .back-btn:hover {
  background: rgba(226, 232, 240, 0.4);
  color: #0f172a;
}

.custom-header .menu-btn {
  display: none;
  background: none;
  border: none;
  cursor: pointer;
  color: #0f172a;
  padding: 8px;
  border-radius: 8px;
  transition: all 0.2s ease;
}

.custom-header .menu-btn:hover {
  background: rgba(226, 232, 240, 0.4);
}

@media (max-width: 768px) {
  .custom-header .nav-flex {
    display: none;
  }
  
  .custom-header .menu-btn {
    display: block;
  }
  
  .custom-header .btn-group {
    margin-left: 0;
  }
  
  .custom-header .mobile-nav {
    position: absolute;
    top: 100%;
    left: 0;
    right: 0;
    background: rgba(255, 255, 255, 0.95);
    backdrop-filter: blur(12px);
    border-bottom: 1px solid rgba(226, 232, 240, 0.6);
    display: flex;
    flex-direction: column;
    gap: 0;
    padding: 12px 0;
  }
  
  .custom-header .mobile-nav .nav-btn {
    width: 100%;
    text-align: left;
    padding: 12px 24px;
    border-radius: 0;
  }
  
  .custom-header .mobile-nav .nav-btn:hover {
    background: rgba(5, 150, 105, 0.08);
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
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

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
            <div className="logo-icon">
              <Sparkles style={{ width: 24, height: 24 }} />
            </div>
            <h1 className="brand-title">InnoScope</h1>
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
          </div>
          <div className="btn-group">
            <button onClick={handleGetStarted} className="get-started-btn">
              Agentic Workflows
            </button>
            <button onClick={handleBackToDashboard} className="back-btn">
              Back
            </button>
            <button
              className="menu-btn"
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            >
              {mobileMenuOpen ? (
                <X style={{ width: 24, height: 24 }} />
              ) : (
                <Menu style={{ width: 24, height: 24 }} />
              )}
            </button>
          </div>
        </div>
        {mobileMenuOpen && (
          <div className="mobile-nav">
            {navLinks.map((link) => (
              <button
                key={link.label}
                onClick={() => {
                  openUrl(link.key);
                  setMobileMenuOpen(false);
                }}
                className={`nav-btn${link.selected ? " selected" : ""}`}
              >
                {link.label}
              </button>
            ))}
          </div>
        )}
      </header>
    </>
  );
}
