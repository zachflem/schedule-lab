import React, { useEffect, useState } from 'react';
import { Link } from 'react-router';
import './DocsPage.css';

export const DocsPage: React.FC = () => {
  const [activeSection, setActiveSection] = useState('getting-started');

  useEffect(() => {
    const sections = ['getting-started', 'workflow', 'modules', 'features', 'architecture'];

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveSection(entry.target.id);
          }
        });
      },
      { threshold: 0.5, rootMargin: '-10% 0px -70% 0px' }
    );

    sections.forEach((id) => {
      const el = document.getElementById(id);
      if (el) observer.observe(el);
    });

    return () => observer.disconnect();
  }, []);

  const scrollToSection = (id: string) => {
    const el = document.getElementById(id);
    if (el) {
      el.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="docs-page">
      <nav className="docs-sidebar">
        <div className="sidebar-header">
          <div className="logo-icon">SL</div>
          <span>Navigation</span>
        </div>
        <ul className="sidebar-links">
          <li>
            <button 
              onClick={() => scrollToSection('getting-started')} 
              className={activeSection === 'getting-started' ? 'active' : ''}
            >
              <span className="dot"></span> 01. Getting Started
            </button>
          </li>
          <li>
            <button 
              onClick={() => scrollToSection('workflow')} 
              className={activeSection === 'workflow' ? 'active' : ''}
            >
              <span className="dot"></span> 02. Workflow
            </button>
          </li>
          <li>
            <button 
              onClick={() => scrollToSection('modules')} 
              className={activeSection === 'modules' ? 'active' : ''}
            >
              <span className="dot"></span> 03. Core Modules
            </button>
          </li>
          <li>
            <button 
              onClick={() => scrollToSection('features')} 
              className={activeSection === 'features' ? 'active' : ''}
            >
              <span className="dot"></span> 04. Key Features
            </button>
          </li>
          <li>
            <button 
              onClick={() => scrollToSection('architecture')} 
              className={activeSection === 'architecture' ? 'active' : ''}
            >
              <span className="dot"></span> 05. Technical Stack
            </button>
          </li>
        </ul>
      </nav>

      <div className="docs-container">
        <header className="docs-header">
          <div className="badge badge--active">Documentation</div>
          <h1>ScheduleLab Workflow & Features</h1>
          <p>Welcome to the central documentation for your scheduling and operations platform. This guide explains how to manage your entire operational lifecycle.</p>
        </header>

        <section id="getting-started" className="docs-section">
          <h2>1. Getting Started / FAQ</h2>
          <div className="faq-grid">
            <div className="faq-item">
              <h4>How do I create a new job?</h4>
              <p>Go to the <strong>Jobs</strong> page, look for unscheduled enquiries in the bucket, and drag them onto the calendar to assign a time and resource.</p>
            </div>
            <div className="faq-item">
              <h4>Can I customize the safety questions?</h4>
              <p>Yes. Navigate to <strong>Settings &gt; Asset Settings</strong>. You can configure specific safety questions for each asset type.</p>
            </div>
            <div className="faq-item">
              <h4>What happens after a docket is signed?</h4>
              <p>The docket is finalized and stored in the system history. You can view or print the generated docket from the <strong>Jobs</strong> or <strong>Dockets</strong> management pages.</p>
            </div>
            <div className="faq-item">
              <h4>How are staff qualifications tracked?</h4>
              <p>In the <strong>Personnel</strong> module, you can add qualifications to each person. Expiring items will be highlighted in red on their profile.</p>
            </div>
          </div>
        </section>

        <section id="workflow" className="docs-section">
          <h2>2. The Operational Workflow</h2>
          <div className="workflow-grid">
            <div className="workflow-item">
              <div className="workflow-step">01</div>
              <h3>Enquiry</h3>
              <p>Clients submit work requests through the public enquiry form. These are captured directly into your pipeline for review.</p>
              <Link to="/enquiry" className="btn btn--secondary btn--sm">View Public Form</Link>
            </div>
            <div className="workflow-connector">→</div>
            <div className="workflow-item">
              <div className="workflow-step">02</div>
              <h3>Management</h3>
              <p>Staff reviews incoming enquiries, adding details and prioritizing work based on urgency and resource availability.</p>
              <Link to="/enquiries" className="btn btn--secondary btn--sm">Manage Enquiries</Link>
            </div>
            <div className="workflow-connector">→</div>
            <div className="workflow-item">
              <div className="workflow-step">03</div>
              <h3>Scheduling</h3>
              <p>Convert approved enquiries into jobs. Use the Gantt chart to assign assets and personnel to specific time slots.</p>
              <Link to="/jobs" className="btn btn--secondary btn--sm">Go to Jobs</Link>
            </div>
            <div className="workflow-connector">→</div>
            <div className="workflow-item">
              <div className="workflow-step">04</div>
              <h3>Execution & Docket</h3>
              <p>Field staff execute the job and complete a digital docket, capturing signatures, photos, and safety checklists.</p>
              <Link to="/docket" className="btn btn--secondary btn--sm">Digital Docket</Link>
            </div>
          </div>
        </section>

        <section id="modules" className="docs-section">
          <h2>3. Core Modules</h2>
          <div className="modules-grid">
            <div className="module-card">
              <div className="module-icon">👥</div>
              <h3>Customers</h3>
              <p>Manage client relationships, billing contacts, and project history in one central location.</p>
              <Link to="/customers" className="text-link">Explore Customers →</Link>
            </div>
            <div className="module-card">
              <div className="module-icon">🚜</div>
              <h3>Assets</h3>
              <p>Track equipment fleet, maintenance schedules, and type-specific safety requirements for each asset.</p>
              <Link to="/assets" className="text-link">Explore Assets →</Link>
            </div>
            <div className="module-card">
              <div className="module-icon">👷</div>
              <h3>Personnel</h3>
              <p>Manage staff qualifications, induction status, and availability. Monitor expiring certifications.</p>
              <Link to="/personnel" className="text-link">Explore Personnel →</Link>
            </div>
            <div className="module-card">
              <div className="module-icon">⚙️</div>
              <h3>Settings</h3>
              <p>Configure qualification rates, asset types, safety checklists, and global system preferences.</p>
              <Link to="/settings" className="text-link">System Settings →</Link>
            </div>
          </div>
        </section>

        <section id="features" className="docs-section">
          <h2>4. Key Features</h2>
          <div className="features-list">
            <div className="feature-item">
              <div className="feature-check">✓</div>
              <div>
                <h4>Interactive Gantt Scheduling</h4>
                <p>A visual timeline for managing complex schedules, assets, and personnel with intuitive drag-and-drop actions.</p>
              </div>
            </div>
            <div className="feature-item">
              <div className="feature-check">✓</div>
              <div>
                <h4>Digital Signature Capture</h4>
                <p>Complete legally binding proof of work by capturing signatures directly on tablets or smartphones.</p>
              </div>
            </div>
            <div className="feature-item">
              <div className="feature-check">✓</div>
              <div>
                <h4>Dynamic Safety Checklists</h4>
                <p>Asset-specific hazard assessments and safety checks required before job commencement to ensure compliance.</p>
              </div>
            </div>
            <div className="feature-item">
              <div className="feature-check">✓</div>
              <div>
                <h4>Photo Documentation</h4>
                <p>Attach site photos or document scans directly to the electronic docket for complete job records.</p>
              </div>
            </div>
          </div>
        </section>

        <section id="architecture" className="docs-section">
          <h2>5. Technical Architecture</h2>
          <details className="tech-details">
            <summary className="tech-summary">Show technical stack information</summary>
            <div className="architecture-card">
              <div className="tech-stack">
                <div className="tech-item">
                  <strong>Frontend:</strong> React 19 + TypeScript + Vite
                </div>
                <div className="tech-item">
                  <strong>Backend:</strong> Cloudflare Workers (Functions)
                </div>
                <div className="tech-item">
                  <strong>Database:</strong> Cloudflare D1 (Serverless SQL)
                </div>
                <div className="tech-item">
                  <strong>Styling:</strong> Vanilla CSS with Design Tokens
                </div>
              </div>
              <div className="architecture-description">
                <p>ScheduleLab is built on a serverless edge architecture, ensuring low latency and high availability globally. The system uses a modern React single-page application (SPA) model connected to a distributed SQL database through a secure API layer.</p>
              </div>
            </div>
          </details>
        </section>

        <footer className="docs-footer">
          <p>This documentation page is a temporary landing point while the main dashboard is under development.</p>
          <div className="footer-actions">
            <Link to="/jobs" className="btn btn--primary">Get Started</Link>
          </div>
        </footer>
      </div>
    </div>
  );
};
