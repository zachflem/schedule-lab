import { useState, useEffect, type FormEvent } from 'react';
import { useNavigate, useParams } from 'react-router';
import { api } from '@/shared/lib/api';
import { PersonnelSchema, type Personnel, type Qualification } from '@/shared/validation/schemas';
import { Spinner } from '@/shared/ui';
import { useToast } from '@/shared/lib/toast';
import { InviteModal } from './InviteModal';

export function PersonnelFormPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const [loading, setLoading] = useState(!!(id && id !== 'new'));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [allQualifications, setAllQualifications] = useState<Qualification[]>([]);
  const [formData, setFormData] = useState<Partial<Personnel>>({
    name: '',
    email: '',
    phone: '',
    can_login: false,
    receives_emails: true,
    role: 'operator',
    qualifications: [],
  });

  useEffect(() => {
    const fetchData = async () => {
      try {
        const qualifications = await api.get<Qualification[]>('/qualifications');
        setAllQualifications(qualifications);

        if (!id || id === 'new') {
          setFormData({
            name: '',
            email: '',
            phone: '',
            can_login: false,
            receives_emails: true,
            role: 'operator',
            qualifications: [],
          });
          setLoading(false);
          return;
        }

        const data = await api.get<Personnel>(`/personnel/${id}`);
        setFormData(data);
      } catch (err) {
        console.error('Failed to fetch personnel', err);
        setError('Failed to load personnel data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [id]);

  const isNewUser = !id || id === 'new';
  const willAutoInvite = isNewUser && !!(formData.can_login && formData.email);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (willAutoInvite) {
      setShowInviteModal(true);
      return;
    }
    await doSave(false);
  };

  const doSave = async (sendInvite: boolean, inviteMessage?: string) => {
    setSaving(true);
    setError(null);
    try {
      const validated = PersonnelSchema.parse({
        ...formData,
        role: formData.role || 'operator'
      });
      if (!isNewUser) {
        await api.put(`/personnel/${id}`, validated);
      } else {
        const result = await api.post<{ id: string }>('/personnel', validated);
        if (sendInvite && result.id) {
          await api.post(`/personnel/${result.id}/invite`, { message: inviteMessage ?? '' });
        }
      }
      navigate('/personnel');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save personnel');
      setSaving(false);
    }
  };

  const toggleQualification = (qual: Qualification) => {
    const current = formData.qualifications || [];
    const exists = current.find(q => q.id === qual.id);
    
    if (exists) {
      setFormData({
        ...formData,
        qualifications: current.filter(q => q.id !== qual.id)
      });
    } else {
      setFormData({
        ...formData,
        qualifications: [...current, qual]
      });
    }
  };

  const handleExpiryChange = (qualId: string, date: string) => {
    const current = formData.qualifications || [];
    setFormData({
      ...formData,
      qualifications: current.map(q => q.id === qualId ? { ...q, expiry_date: date } : q)
    });
  };

  const handleSendInvite = () => {
    setShowInviteModal(true);
  };

  const doSendInvite = async (message: string) => {
    if (!id || id === 'new') return;
    setSaving(true);
    try {
      await api.post(`/personnel/${id}/invite`, { message });
      const data = await api.get<Personnel>(`/personnel/${id}`);
      setFormData(data);
      setShowInviteModal(false);
      showToast(`Invitation sent to ${data.name || data.email}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send invitation');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Spinner />;

  return (
    <div className="container" style={{ padding: 'var(--space-8)', maxWidth: '800px' }}>
      <div style={{ marginBottom: 'var(--space-6)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1 className="docket-page__title">{id === 'new' ? 'Add Person' : 'Edit Personnel'}</h1>
        
        {id !== 'new' && formData.email && formData.can_login && (
          <button 
            type="button" 
            className="btn btn--secondary btn--sm"
            onClick={handleSendInvite}
            disabled={saving}
          >
            {saving ? 'Sending...' : 'Send Invite'}
          </button>
        )}
      </div>

      <form onSubmit={handleSubmit} className="flex-col gap-6" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
        {error && (
          <div style={{ padding: 'var(--space-4)', background: 'var(--color-danger-50)', color: 'var(--color-danger-700)', borderRadius: 'var(--radius-md)' }}>
            {error}
          </div>
        )}

        {/* Basic Details */}
        <div className="card" style={{ padding: 'var(--space-6)' }}>
          <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, marginBottom: 'var(--space-4)' }}>Contact Details</h2>
          <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-4)' }}>
            <div className="form-group">
              <label className="form-label">Full Name *</label>
              <input
                required
                className="form-input"
                value={formData.name}
                onChange={e => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Email Address</label>
              <input
                type="email"
                className="form-input"
                value={formData.email || ''}
                onChange={e => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div className="form-group">
              <label className="form-label">Phone Number</label>
              <input
                className="form-input"
                value={formData.phone || ''}
                onChange={e => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
          </div>
        </div>

        {/* Access & Notifications */}
        <div className="card" style={{ padding: 'var(--space-6)' }}>
          <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, marginBottom: 'var(--space-4)' }}>Access & Notifications</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
            <div className="form-group">
              <label className="form-label">Role</label>
              <select
                className="form-input"
                value={formData.role || 'operator'}
                onChange={e => setFormData({ ...formData, role: e.target.value as 'admin' | 'dispatcher' | 'operator' })}
              >
                <option value="admin">Admin</option>
                <option value="dispatcher">Dispatcher</option>
                <option value="operator">Operator</option>
              </select>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <input
                type="checkbox"
                id="can_login"
                checked={formData.can_login}
                onChange={e => setFormData({ ...formData, can_login: e.target.checked })}
              />
              <label htmlFor="can_login" className="form-label" style={{ marginBottom: 0 }}>Can login to system</label>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              <input
                type="checkbox"
                id="receives_emails"
                checked={formData.receives_emails}
                onChange={e => setFormData({ ...formData, receives_emails: e.target.checked })}
              />
              <label htmlFor="receives_emails" className="form-label" style={{ marginBottom: 0 }}>Receives email notifications</label>
            </div>
            {formData.last_login_date && (
              <div style={{ marginTop: 'var(--space-2)', paddingTop: 'var(--space-3)', borderTop: '1px solid var(--color-gray-100)' }}>
                <span className="form-label" style={{ color: 'var(--color-gray-500)' }}>Last Login: </span>
                <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-gray-600)', fontStyle: 'italic' }}>
                  {new Date(formData.last_login_date).toLocaleString()}
                </span>
              </div>
            )}
          </div>
        </div>

        {/* Qualifications / Tickets */}
        <div className="card" style={{ padding: 'var(--space-6)' }}>
          <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, marginBottom: 'var(--space-4)' }}>Qualifications & Licenses</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 'var(--space-2)' }}>
              {allQualifications.map(q => {
                const isSelected = formData.qualifications?.some(sq => sq.id === q.id);
                return (
                  <button
                    key={q.id}
                    type="button"
                    onClick={() => toggleQualification(q)}
                    style={{
                      padding: 'var(--space-2) var(--space-4)',
                      borderRadius: 'var(--radius-full)',
                      border: '1px solid',
                      borderColor: isSelected ? 'var(--color-primary-500)' : 'var(--color-gray-200)',
                      background: isSelected ? 'var(--color-primary-50)' : 'var(--color-white)',
                      color: isSelected ? 'var(--color-primary-700)' : 'var(--color-gray-600)',
                      fontSize: 'var(--text-sm)',
                      fontWeight: 600,
                      cursor: 'pointer'
                    }}
                  >
                    {q.name}
                  </button>
                );
              })}
            </div>

            {/* Selected Qualifications detail (Expiries) */}
            {formData.qualifications && formData.qualifications.length > 0 && (
              <div style={{ marginTop: 'var(--space-4)', borderTop: '1px solid var(--color-gray-100)', paddingTop: 'var(--space-4)' }}>
                <h3 style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-gray-500)', marginBottom: 'var(--space-3)' }}>
                  Set Expiry Dates
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {formData.qualifications.map(q => {
                    const expiry = q.expiry_date ? new Date(q.expiry_date) : null;
                    const today = new Date();
                    const diffDays = expiry ? Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) : null;

                    let color = { bg: 'var(--color-gray-50)', text: 'var(--color-gray-600)' };
                    if (diffDays !== null) {
                      if (diffDays <= 30) {
                        color = { bg: 'var(--color-danger-50)', text: 'var(--color-danger-700)' };
                      } else if (diffDays <= 90) {
                        color = { bg: 'var(--color-warning-50)', text: 'var(--color-warning-600)' };
                      } else {
                        color = { bg: 'var(--color-success-50)', text: 'var(--color-success-700)' };
                      }
                    }

                    return (
                      <div key={q.id} style={{ 
                        display: 'flex', 
                        justifyContent: 'space-between', 
                        alignItems: 'center', 
                        background: color.bg, 
                        color: color.text,
                        padding: 'var(--space-2) var(--space-3)', 
                        borderRadius: 'var(--radius-md)',
                        border: diffDays !== null ? `1px solid ${color.text}30` : '1px solid transparent'
                      }}>
                        <span style={{ fontWeight: 600 }}>{q.name}</span>
                        <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                          {diffDays !== null && (
                            <span style={{ fontSize: '10px', fontWeight: 700 }}>
                              {diffDays <= 0 ? 'EXPIRED' : `${diffDays} days left`}
                            </span>
                          )}
                          <input
                            type="date"
                            className="form-input"
                            style={{ width: '150px', padding: 'var(--space-1) var(--space-2)', border: '1px solid var(--color-gray-200)' }}
                            value={q.expiry_date || ''}
                            onChange={e => handleExpiryChange(q.id!, e.target.value)}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>

        <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
          <button type="button" className="btn btn--secondary" onClick={() => navigate('/personnel')}>Cancel</button>
          <button type="submit" className="btn btn--primary" disabled={saving}>
            {saving ? 'Saving...' : 'Save Personnel'}
          </button>
        </div>
      </form>

      {showInviteModal && (
        <InviteModal
          recipientName={formData.name || formData.email || 'this person'}
          isNewUser={isNewUser}
          onSend={isNewUser ? (msg) => doSave(true, msg) : doSendInvite}
          onSkip={isNewUser ? () => doSave(false) : undefined}
          onClose={() => setShowInviteModal(false)}
          isSending={saving}
        />
      )}
    </div>
  );
}
