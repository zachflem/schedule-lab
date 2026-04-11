import { useState, useEffect, type FormEvent } from 'react';
import { api, ApiRequestError } from '@/shared/lib/api';
import { PersonnelSchema, type Personnel, type Qualification } from '@/shared/validation/schemas';
import { Spinner } from '@/shared/ui';
import { useToast } from '@/shared/lib/toast';
import { InviteModal } from './InviteModal';

type ArchivedPersonInfo = {
  id: string;
  name: string;
  email: string;
  archived_at: string;
};

interface PersonnelEditModalProps {
  personnelId: string | null; // null = new person
  onClose: () => void;
  onSaved: () => void;
}

export function PersonnelEditModal({ personnelId, onClose, onSaved }: PersonnelEditModalProps) {
  const isNew = personnelId === null;
  const { showToast } = useToast();
  const [loading, setLoading] = useState(!isNew);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showArchiveConfirm, setShowArchiveConfirm] = useState(false);
  const [archivedUser, setArchivedUser] = useState<ArchivedPersonInfo | null>(null);
  const [pendingInviteId, setPendingInviteId] = useState<string | null>(null);
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

        if (isNew) {
          setLoading(false);
          return;
        }

        const data = await api.get<Personnel>(`/personnel/${personnelId}`);
        setFormData(data);
      } catch (err) {
        console.error('Failed to fetch personnel', err);
        setError('Failed to load personnel data');
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [personnelId, isNew]);

  const willAutoInvite = isNew && !!(formData.can_login && formData.email);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    await doSave();
  };

  const doSave = async () => {
    setSaving(true);
    setError(null);
    try {
      const validated = PersonnelSchema.parse({
        ...formData,
        role: formData.role || 'operator',
      });

      if (!isNew) {
        await api.put(`/personnel/${personnelId}`, validated);
        onSaved();
        return;
      }

      let result: { id: string };
      try {
        result = await api.post<{ id: string }>('/personnel', validated);
      } catch (err) {
        if (err instanceof ApiRequestError && err.status === 409 && (err.body as any)?.code === 'ARCHIVED_USER') {
          setArchivedUser((err.body as any).person);
          setSaving(false);
          return;
        }
        throw err;
      }

      if (willAutoInvite) {
        setPendingInviteId(result.id);
        setShowInviteModal(true);
        setSaving(false);
        return;
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save personnel');
      setSaving(false);
    }
  };

  const handleReactivate = async () => {
    if (!archivedUser) return;
    setSaving(true);
    setError(null);
    try {
      await api.post(`/personnel/${archivedUser.id}/restore`, {});
      const validated = PersonnelSchema.parse({ ...formData, role: formData.role || 'operator' });
      await api.put(`/personnel/${archivedUser.id}`, validated);
      setArchivedUser(null);
      if (willAutoInvite) {
        setPendingInviteId(archivedUser.id);
        setShowInviteModal(true);
        setSaving(false);
        return;
      }
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to reactivate personnel');
      setSaving(false);
    }
  };

  const handleArchive = async () => {
    if (isNew) return;
    setSaving(true);
    setError(null);
    try {
      await api.delete(`/personnel/${personnelId}`);
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to archive personnel');
      setSaving(false);
    }
  };

  const toggleQualification = (qual: Qualification) => {
    const current = formData.qualifications || [];
    const exists = current.find(q => q.id === qual.id);
    if (exists) {
      setFormData({ ...formData, qualifications: current.filter(q => q.id !== qual.id) });
    } else {
      setFormData({ ...formData, qualifications: [...current, qual] });
    }
  };

  const handleExpiryChange = (qualId: string, date: string) => {
    const current = formData.qualifications || [];
    setFormData({
      ...formData,
      qualifications: current.map(q => q.id === qualId ? { ...q, expiry_date: date } : q),
    });
  };

  const doSendInviteNew = async (message: string) => {
    const targetId = pendingInviteId;
    if (!targetId) return;
    setSaving(true);
    try {
      await api.post(`/personnel/${targetId}/invite`, { message });
      onSaved();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send invitation');
      setSaving(false);
    }
  };

  const doSkipInviteNew = () => {
    onSaved();
  };

  const doSendInviteExisting = async (message: string) => {
    if (isNew) return;
    setSaving(true);
    try {
      await api.post(`/personnel/${personnelId}/invite`, { message });
      const data = await api.get<Personnel>(`/personnel/${personnelId}`);
      setFormData(data);
      setShowInviteModal(false);
      showToast(`Invitation sent to ${data.name || data.email}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to send invitation');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content modal-slide-in" style={{ maxWidth: '680px', width: '100%' }} onClick={e => e.stopPropagation()}>
        <form onSubmit={handleSubmit} style={{ display: 'contents' }}>
          <div className="modal-header">
            <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 700 }}>{isNew ? 'Add Person' : 'Edit Personnel'}</h2>
            <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
              {!isNew && formData.email && formData.can_login && (
                <button
                  type="button"
                  className="btn btn--secondary btn--sm"
                  onClick={() => setShowInviteModal(true)}
                  disabled={saving}
                >
                  Send Invite
                </button>
              )}
              <button type="button" className="btn-close" onClick={onClose}>&times;</button>
            </div>
          </div>

          <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
            {loading ? (
              <Spinner />
            ) : (
              <>
                {error && (
                  <div style={{ padding: 'var(--space-4)', background: 'var(--color-danger-50)', color: 'var(--color-danger-700)', borderRadius: 'var(--radius-md)' }}>
                    {error}
                  </div>
                )}

                {/* Contact Details */}
                <div className="card" style={{ padding: 'var(--space-6)' }}>
                  <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 700, marginBottom: 'var(--space-4)' }}>Contact Details</h3>
                  <div className="form-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 'var(--space-4)' }}>
                    <div className="form-group">
                      <label className="form-label">Full Name *</label>
                      <input
                        required
                        className="form-input"
                        value={formData.name ?? ''}
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
                  <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 700, marginBottom: 'var(--space-4)' }}>Access & Notifications</h3>
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
                        id="modal_can_login"
                        checked={formData.can_login}
                        onChange={e => setFormData({ ...formData, can_login: e.target.checked })}
                      />
                      <label htmlFor="modal_can_login" className="form-label" style={{ marginBottom: 0 }}>Can login to system</label>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                      <input
                        type="checkbox"
                        id="modal_receives_emails"
                        checked={formData.receives_emails}
                        onChange={e => setFormData({ ...formData, receives_emails: e.target.checked })}
                      />
                      <label htmlFor="modal_receives_emails" className="form-label" style={{ marginBottom: 0 }}>Receives email notifications</label>
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

                {/* Qualifications */}
                <div className="card" style={{ padding: 'var(--space-6)' }}>
                  <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 700, marginBottom: 'var(--space-4)' }}>Qualifications & Licenses</h3>
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
                              cursor: 'pointer',
                            }}
                          >
                            {q.name}
                          </button>
                        );
                      })}
                    </div>

                    {formData.qualifications && formData.qualifications.length > 0 && (
                      <div style={{ marginTop: 'var(--space-4)', borderTop: '1px solid var(--color-gray-100)', paddingTop: 'var(--space-4)' }}>
                        <h4 style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-gray-500)', marginBottom: 'var(--space-3)' }}>
                          Set Expiry Dates
                        </h4>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          {formData.qualifications.map(q => {
                            const expiry = q.expiry_date ? new Date(q.expiry_date) : null;
                            const today = new Date();
                            const diffDays = expiry ? Math.ceil((expiry.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)) : null;
                            let color = { bg: 'var(--color-gray-50)', text: 'var(--color-gray-600)' };
                            if (diffDays !== null) {
                              if (diffDays <= 30) color = { bg: 'var(--color-danger-50)', text: 'var(--color-danger-700)' };
                              else if (diffDays <= 90) color = { bg: 'var(--color-warning-50)', text: 'var(--color-warning-600)' };
                              else color = { bg: 'var(--color-success-50)', text: 'var(--color-success-700)' };
                            }
                            return (
                              <div
                                key={q.id}
                                style={{
                                  display: 'flex',
                                  justifyContent: 'space-between',
                                  alignItems: 'center',
                                  background: color.bg,
                                  color: color.text,
                                  padding: 'var(--space-2) var(--space-3)',
                                  borderRadius: 'var(--radius-md)',
                                  border: diffDays !== null ? `1px solid ${color.text}30` : '1px solid transparent',
                                }}
                              >
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
              </>
            )}
          </div>

          {!loading && (
            <div className="modal-footer" style={{ justifyContent: 'space-between' }}>
              {!isNew ? (
                <button
                  type="button"
                  className="btn btn--sm"
                  style={{ background: 'var(--color-danger-50)', color: 'var(--color-danger-700)', border: '1px solid var(--color-danger-200)' }}
                  onClick={() => setShowArchiveConfirm(true)}
                  disabled={saving}
                >
                  Archive Person
                </button>
              ) : <span />}
              <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                <button type="button" className="btn btn--secondary" onClick={onClose}>Cancel</button>
                <button type="submit" className="btn btn--primary" disabled={saving}>
                  {saving ? 'Saving...' : 'Save Personnel'}
                </button>
              </div>
            </div>
          )}
        </form>

        {showInviteModal && (
          <InviteModal
            recipientName={formData.name || formData.email || 'this person'}
            isNewUser={isNew}
            onSend={pendingInviteId ? doSendInviteNew : doSendInviteExisting}
            onSkip={pendingInviteId ? doSkipInviteNew : undefined}
            onClose={() => setShowInviteModal(false)}
            isSending={saving}
          />
        )}

        {/* Archive confirmation */}
        {showArchiveConfirm && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2100 }}>
            <div className="card" style={{ padding: 'var(--space-6)', maxWidth: '420px', width: '100%', margin: 'var(--space-4)' }}>
              <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, marginBottom: 'var(--space-2)' }}>Archive {formData.name}?</h2>
              <p style={{ color: 'var(--color-gray-600)', marginBottom: 'var(--space-6)', fontSize: 'var(--text-sm)' }}>
                This person will be removed from the active personnel list. Their data and history will be preserved. You can reactivate them later by adding a user with the same email address.
              </p>
              <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn--secondary" onClick={() => setShowArchiveConfirm(false)} disabled={saving}>
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn"
                  style={{ background: 'var(--color-danger-600)', color: 'white' }}
                  onClick={handleArchive}
                  disabled={saving}
                >
                  {saving ? 'Archiving...' : 'Archive'}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Reactivate archived user */}
        {archivedUser && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 2100 }}>
            <div className="card" style={{ padding: 'var(--space-6)', maxWidth: '460px', width: '100%', margin: 'var(--space-4)' }}>
              <h2 style={{ fontSize: 'var(--text-lg)', fontWeight: 700, marginBottom: 'var(--space-2)' }}>Archived user found</h2>
              <p style={{ color: 'var(--color-gray-600)', marginBottom: 'var(--space-4)', fontSize: 'var(--text-sm)' }}>
                An archived user already exists with this email address:
              </p>
              <div style={{ background: 'var(--color-gray-50)', borderRadius: 'var(--radius-md)', padding: 'var(--space-3)', marginBottom: 'var(--space-6)', fontSize: 'var(--text-sm)' }}>
                <div style={{ fontWeight: 700 }}>{archivedUser.name}</div>
                <div style={{ color: 'var(--color-gray-500)' }}>{archivedUser.email}</div>
                <div style={{ color: 'var(--color-gray-400)', fontSize: 'var(--text-xs)', marginTop: 'var(--space-1)' }}>
                  Archived {new Date(archivedUser.archived_at).toLocaleDateString()}
                </div>
              </div>
              <p style={{ color: 'var(--color-gray-600)', marginBottom: 'var(--space-6)', fontSize: 'var(--text-sm)' }}>
                Would you like to reactivate this person and update their details with the information you just entered?
              </p>
              <div style={{ display: 'flex', gap: 'var(--space-3)', justifyContent: 'flex-end' }}>
                <button type="button" className="btn btn--secondary" onClick={() => setArchivedUser(null)} disabled={saving}>
                  Cancel
                </button>
                <button type="button" className="btn btn--primary" onClick={handleReactivate} disabled={saving}>
                  {saving ? 'Reactivating...' : 'Reactivate'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
