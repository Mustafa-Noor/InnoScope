'use client';
import 'bootstrap/dist/css/bootstrap.min.css';
import { useEffect } from 'react';
import Navbar from '../components/Navbar';

export default function DashboardPage() {
  useEffect(() => {
    import('bootstrap/dist/js/bootstrap.bundle.min.js');
  }, []);

  return (
    <main>
      <Navbar />
      <div style={{ paddingTop: '80px' }}>
        <div className="container-fluid">
          <div className="row">
            {/* Sidebar */}
            <div className="col-md-3 col-lg-2 bg-light min-vh-100 p-3">
              <div className="d-flex flex-column">
                <h6 className="fw-bold text-muted mb-3">MENU</h6>
                <ul className="nav nav-pills flex-column">
                  <li className="nav-item">
                    <a className="nav-link active" href="#">
                      📊 Dashboard
                    </a>
                  </li>
                  <li className="nav-item">
                    <a className="nav-link" href="#">
                      📈 Analytics
                    </a>
                  </li>
                  <li className="nav-item">
                    <a className="nav-link" href="#">
                      👥 Team
                    </a>
                  </li>
                  <li className="nav-item">
                    <a className="nav-link" href="#">
                      ⚙️ Settings
                    </a>
                  </li>
                </ul>
              </div>
            </div>

            {/* Main Content */}
            <div className="col-md-9 col-lg-10 p-4">
              <div className="d-flex justify-content-between align-items-center mb-4">
                <h2 className="fw-bold">Dashboard</h2>
                <button className="btn btn-primary">+ New Project</button>
              </div>

              {/* Stats Cards */}
              <div className="row g-4 mb-4">
                <div className="col-lg-3 col-md-6">
                  <div className="card">
                    <div className="card-body">
                      <div className="d-flex justify-content-between">
                        <div>
                          <h6 className="card-title text-muted">Total Users</h6>
                          <h3 className="fw-bold">1,234</h3>
                        </div>
                        <div className="text-primary fs-2">👥</div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="col-lg-3 col-md-6">
                  <div className="card">
                    <div className="card-body">
                      <div className="d-flex justify-content-between">
                        <div>
                          <h6 className="card-title text-muted">Revenue</h6>
                          <h3 className="fw-bold">$45,678</h3>
                        </div>
                        <div className="text-success fs-2">💰</div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="col-lg-3 col-md-6">
                  <div className="card">
                    <div className="card-body">
                      <div className="d-flex justify-content-between">
                        <div>
                          <h6 className="card-title text-muted">Projects</h6>
                          <h3 className="fw-bold">89</h3>
                        </div>
                        <div className="text-warning fs-2">📁</div>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="col-lg-3 col-md-6">
                  <div className="card">
                    <div className="card-body">
                      <div className="d-flex justify-content-between">
                        <div>
                          <h6 className="card-title text-muted">Tasks</h6>
                          <h3 className="fw-bold">156</h3>
                        </div>
                        <div className="text-info fs-2">✅</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Charts Section */}
              <div className="row g-4">
                <div className="col-lg-8">
                  <div className="card">
                    <div className="card-header">
                      <h5 className="card-title mb-0">Analytics Overview</h5>
                    </div>
                    <div className="card-body">
                      <div className="bg-light rounded p-5 text-center">
                        <div className="display-1 mb-3">📊</div>
                        <h4>Chart Placeholder</h4>
                        <p className="text-muted">Interactive charts would go here</p>
                      </div>
                    </div>
                  </div>
                </div>
                <div className="col-lg-4">
                  <div className="card">
                    <div className="card-header">
                      <h5 className="card-title mb-0">Recent Activity</h5>
                    </div>
                    <div className="card-body">
                      <div className="d-flex align-items-center mb-3">
                        <div className="bg-primary rounded-circle me-3" style={{width: '8px', height: '8px'}}></div>
                        <small>New user registered</small>
                      </div>
                      <div className="d-flex align-items-center mb-3">
                        <div className="bg-success rounded-circle me-3" style={{width: '8px', height: '8px'}}></div>
                        <small>Payment received</small>
                      </div>
                      <div className="d-flex align-items-center mb-3">
                        <div className="bg-warning rounded-circle me-3" style={{width: '8px', height: '8px'}}></div>
                        <small>Task completed</small>
                      </div>
                      <div className="d-flex align-items-center mb-3">
                        <div className="bg-info rounded-circle me-3" style={{width: '8px', height: '8px'}}></div>
                        <small>New message</small>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
}