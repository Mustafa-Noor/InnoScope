"use client";

import React, { useEffect, useState } from "react";
import { Line, Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  LineElement,
  BarElement,
  CategoryScale,
  LinearScale,
  PointElement,
  Tooltip,
  Legend,
} from "chart.js";
import "bootstrap/dist/css/bootstrap.min.css";

ChartJS.register(LineElement, BarElement, CategoryScale, LinearScale, PointElement, Tooltip, Legend);

export default function Dashboard() {
  const [user, setUser] = useState({ name: "Sumaira" });
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);

  // 🌱 Dummy fallback data
  const dummyData = {
    collaborators: 8,
    major_interest: "AI / ML",
    reports_generated: 18,
    daily_usage_minutes: [30, 60, 45, 80, 50, 40, 70],
    projects_discussed: ["Solitaire", "WeatherApp", "TourGuide"],
    project_hours: [4, 6, 8],
  };

  // 🌐 Fetch from FastAPI (fallbacks to dummy)
  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      window.location.href = "/login";
      return;
    }

    fetch("http://127.0.0.1:8000/api/dashboard", {
      headers: { Authorization: `Bearer ${token}` },
    })
      .then((res) => {
        if (!res.ok) throw new Error("Bad response");
        return res.json();
      })
      .then((data) => {
        if (data && Object.keys(data).length > 0) setStats(data);
        else setStats(dummyData);
        setLoading(false);
      })
      .catch(() => {
        setStats(dummyData);
        setLoading(false);
      });
  }, []);

  // 🚪 Logout
  const handleLogout = () => {
    localStorage.removeItem("token");
    sessionStorage.removeItem("token");
    window.location.href = "/auth/login";
  };

  if (loading)
    return (
      <div className="d-flex justify-content-center align-items-center vh-100 bg-white">
        <div className="spinner-border text-success" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
      </div>
    );

  if (!stats)
    return (
      <div className="text-center mt-5 text-danger">No data available</div>
    );

  // 📈 Line chart data
  const lineData = {
    labels: ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"],
    datasets: [
      {
        label: "Daily Usage (min)",
        data: stats.daily_usage_minutes,
        borderColor: "#10b981",
        backgroundColor: "rgba(16,185,129,0.15)",
        fill: true,
        tension: 0.4,
      },
    ],
  };

  // 📊 Bar chart data
  const barData = {
    labels: stats.projects_discussed,
    datasets: [
      {
        label: "Hours Spent",
        data: stats.project_hours,
        backgroundColor: "#10b981",
        borderRadius: 6,
      },
    ],
  };

  return (
    <div style={{ backgroundColor: "#f3f4f6", minHeight: "100vh", borderRadius: '10px', border: '1px solid #e5e7eb', padding: '10px' }}>
      {/* Navbar */}
      <div className="d-flex justify-content-between align-items-center px-4 py-3 bg-white shadow-sm">
        <h2 className="fw-bold" style={{ color: "#065f46" }}>
          Hi, {user.name} 👋
        </h2>
        <button
          className="btn"
          style={{
            backgroundColor: "#10b981",
            color: "white",
            borderRadius: "10px",
            padding: "6px 20px",
          }}
          onClick={handleLogout}
        >
          Logout
        </button>
      </div>

      {/* Content */}
      <div className="container py-4">
        {/* Stats Cards */}
        <div className="row g-4 mb-4">
          <div className="col-md-4">
            <div
              className="card border-0 shadow-sm text-center p-4"
              style={{ backgroundColor: "white" }}
            >
              <h6 style={{ color: "#6b7280" }}>Collaborators</h6>
              <h2 style={{ color: "#10b981", fontWeight: "700" }}>
                {stats.collaborators}
              </h2>
            </div>
          </div>
          <div className="col-md-4">
            <div
              className="card border-0 shadow-sm text-center p-4"
              style={{ backgroundColor: "white" }}
            >
              <h6 style={{ color: "#6b7280" }}>Major Interest</h6>
              <h5 style={{ color: "#065f46", fontWeight: "600" }}>
                {stats.major_interest}
              </h5>
            </div>
          </div>
          <div className="col-md-4">
            <div
              className="card border-0 shadow-sm text-center p-4"
              style={{ backgroundColor: "white" }}
            >
              <h6 style={{ color: "#6b7280" }}>Reports Generated</h6>
              <h2 style={{ color: "#10b981", fontWeight: "700" }}>
                {stats.reports_generated}
              </h2>
            </div>
          </div>
        </div>

        {/* Charts */}
        <div className="row g-4">
          <div className="col-md-6">
            <div
              className="card border-0 shadow-sm p-4"
              style={{ backgroundColor: "white" }}
            >
              <h6 style={{ color: "#065f46" }}>Daily Usage</h6>
              <Line data={lineData} />
            </div>
          </div>
          <div className="col-md-6">
            <div
              className="card border-0 shadow-sm p-4"
              style={{ backgroundColor: "white" }}
            >
              <h6 style={{ color: "#065f46" }}>Projects Discussed</h6>
              <Bar data={barData} />
            </div>
          </div>
        </div>

        {/* Summary */}
        <div
          className="card border-0 shadow-sm mt-4 p-4"
          style={{ backgroundColor: "white" }}
        >
          <h6 style={{ color: "#065f46" }}>Weekly Summary</h6>
          <p style={{ color: "#374151" }}>
            You worked with <b>{stats.collaborators}</b> collaborators, generated{" "}
            <b>{stats.reports_generated}</b> reports, and focused on{" "}
            <b>{stats.major_interest}</b>. Keep going strong,{" "}
            <span style={{ color: "#10b981", fontWeight: 600 }}>
              {user.name}!
            </span>{" "}
            🚀
          </p>
        </div>
      </div>
    </div>
  );
}
