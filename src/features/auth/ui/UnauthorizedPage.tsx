import './UnauthorizedPage.css';

export function UnauthorizedPage() {
  return (
    <div className="unauthorized-page">
      <div className="unauthorized-card">
        <div className="unauthorized-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
            <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
            <path d="M7 11V7a5 5 0 0 1 10 0v4" />
          </svg>
        </div>
        <h1 className="unauthorized-title">Access Required</h1>
        <p className="unauthorized-body">
          You need to be logged in and have an account set up to access this application.
          Contact your administrator if you believe this is a mistake.
        </p>
        <a href="/cdn-cgi/access/login" className="btn btn--primary unauthorized-btn">
          Log in
        </a>
      </div>
    </div>
  );
}
