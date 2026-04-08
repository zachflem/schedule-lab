import { useState, useEffect, useMemo } from 'react';
import { api } from '@/shared/lib/api';
import type { Enquiry, Asset, Personnel, RecurrenceWeekday } from '@/shared/validation/schemas';
import { Spinner } from '@/shared/ui';

interface EnquiryDetailsModalProps {
  enquiry: Enquiry;
  onClose: () => void;
  onConvert: (data: any) => Promise<{ success: boolean; data?: any; error?: string }>;
}

interface AssetWithMetadata extends Asset {
  asset_type_name?: string;
}

type RecurrenceType = 'none' | 'interval' | 'weekdays';
type RecurrenceUnit = 'hours' | 'days' | 'weeks' | 'months';
type EndType = 'date' | 'ongoing';

const WEEKDAYS: { key: RecurrenceWeekday; label: string }[] = [
  { key: 'Mon', label: 'Mon' },
  { key: 'Tue', label: 'Tue' },
  { key: 'Wed', label: 'Wed' },
  { key: 'Thu', label: 'Thu' },
  { key: 'Fri', label: 'Fri' },
  { key: 'Sat', label: 'Sat' },
  { key: 'Sun', label: 'Sun' },
];

const UNIT_OPTIONS: RecurrenceUnit[] = ['hours', 'days', 'weeks', 'months'];

export function EnquiryDetailsModal({ enquiry, onClose, onConvert }: EnquiryDetailsModalProps) {
  const isProject = enquiry.enquiry_type === 'Project';

  const [assets, setAssets] = useState<AssetWithMetadata[]>([]);
  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [loading, setLoading] = useState(true);

  const [selectedAssets, setSelectedAssets] = useState<string[]>([]);
  const [selectedPersonnel, setSelectedPersonnel] = useState<string[]>([]);
  const [selectedAssetTypes, setSelectedAssetTypes] = useState<string[]>([]);
  const [personnelSearch, setPersonnelSearch] = useState('');
  const [selectedQualifications, setSelectedQualifications] = useState<string[]>([]);
  const [convertTo, setConvertTo] = useState<'Job' | 'Quote'>('Job');
  const [quoteRecipient, setQuoteRecipient] = useState<'site' | 'billing' | 'both'>('site');
  const [isSubmitting, setIsSubmitting] = useState(false);

  // ── Recurrence State ───────────────────────────────────────────────────
  const [doesRepeat, setDoesRepeat] = useState(false);
  const [recurrenceType, setRecurrenceType] = useState<RecurrenceType>('interval');
  // Interval mode
  const [intervalValue, setIntervalValue] = useState(1);
  const [intervalUnit, setIntervalUnit] = useState<RecurrenceUnit>('days');
  const [downtimeValue, setDowntimeValue] = useState(0);
  const [downtimeUnit, setDowntimeUnit] = useState<RecurrenceUnit>('days');
  // Weekday mode
  const [selectedWeekdays, setSelectedWeekdays] = useState<RecurrenceWeekday[]>([]);
  // End condition
  const [endType, setEndType] = useState<EndType>('ongoing');
  const [endDate, setEndDate] = useState('');
  // Default hours
  const [defaultStartTime, setDefaultStartTime] = useState('07:00');
  const [defaultEndTime, setDefaultEndTime] = useState('17:00');

  useEffect(() => {
    async function fetchData() {
      try {
        const [assetsData, personnelData] = await Promise.all([
          api.get<Asset[]>('/assets'),
          api.get<Personnel[]>('/personnel')
        ]);
        setAssets(assetsData);
        setPersonnel(personnelData);
      } catch (err) {
        console.error('Failed to fetch resources', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const handleToggleAsset = (id: string) => {
    setSelectedAssets(prev =>
      prev.includes(id) ? prev.filter(a => a !== id) : [...prev, id]
    );
  };

  const handleTogglePersonnelCorrected = (id: string) => {
    setSelectedPersonnel(prev =>
      prev.includes(id) ? prev.filter((p: string) => p !== id) : [...prev, id]
    );
  };

  const toggleWeekday = (day: RecurrenceWeekday) => {
    setSelectedWeekdays(prev =>
      prev.includes(day) ? prev.filter(d => d !== day) : [...prev, day]
    );
  };

  const toggleAssetType = (type: string) => {
    setSelectedAssetTypes(prev =>
      prev.includes(type)
        ? prev.filter(t => t !== type)
        : [...prev, type]
    );
  };

  const toggleQualification = (qual: string) => {
    setSelectedQualifications(prev =>
      prev.includes(qual)
        ? prev.filter(q => q !== qual)
        : [...prev, qual]
    );
  };

  const uniqueTypes = useMemo(() => {
    const types = assets.map(a => (a as AssetWithMetadata).asset_type_name || 'Other');
    return Array.from(new Set(types)).sort();
  }, [assets]);

  const uniqueQualifications = useMemo(() => {
    const quals = personnel.flatMap(p => p.qualifications?.map(q => q.name) || []);
    return Array.from(new Set(quals)).sort();
  }, [personnel]);

  const filteredAssets = useMemo(() => {
    if (selectedAssetTypes.length === 0) return assets;
    return assets.filter(a => selectedAssetTypes.includes((a as AssetWithMetadata).asset_type_name || 'Other'));
  }, [assets, selectedAssetTypes]);

  const filteredPersonnel = useMemo(() => {
    return personnel.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(personnelSearch.toLowerCase());
      const matchesQual = selectedQualifications.length === 0 ||
        p.qualifications?.some(q => selectedQualifications.includes(q.name));
      return matchesSearch && matchesQual;
    });
  }, [personnel, personnelSearch, selectedQualifications]);

  const buildRecurrencePayload = () => {
    if (!isProject || !doesRepeat) return null;
    return {
      type: recurrenceType,
      interval_value: recurrenceType === 'interval' ? intervalValue : null,
      interval_unit: recurrenceType === 'interval' ? intervalUnit : null,
      downtime_value: recurrenceType === 'interval' ? downtimeValue : null,
      downtime_unit: recurrenceType === 'interval' ? downtimeUnit : null,
      weekdays: recurrenceType === 'weekdays' ? selectedWeekdays : null,
      end_type: endType,
      end_date: endType === 'date' ? endDate : null,
      default_start_time: defaultStartTime,
      default_end_time: defaultEndTime,
    };
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onConvert({
        enquiry_id: enquiry.id,
        convert_to: convertTo,
        assigned_assets: selectedAssets,
        assigned_personnel: selectedPersonnel,
        quote_recipient: convertTo === 'Quote' ? quoteRecipient : undefined,
        recurrence: buildRecurrencePayload(),
      });
      onClose();
    } catch (err) {
      console.error('Conversion failed', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  // ── Cycle preview string ────────────────────────────────────────────────
  const cyclePreview = useMemo(() => {
    if (!doesRepeat) return null;
    if (recurrenceType === 'interval') {
      const activeStr = `${intervalValue} ${intervalUnit}`;
      const downStr = downtimeValue > 0 ? `, ${downtimeValue} ${downtimeUnit} downtime` : '';
      const endStr = endType === 'date' && endDate ? ` until ${endDate}` : ' (12 cycles max)';
      return `Runs for ${activeStr}${downStr}${endStr}`;
    }
    if (recurrenceType === 'weekdays') {
      const days = selectedWeekdays.join(', ') || 'no days selected';
      const endStr = endType === 'date' && endDate ? ` until ${endDate}` : ' (12 occurrences max)';
      return `Every ${days}${endStr} · ${defaultStartTime}–${defaultEndTime}`;
    }
    return null;
  }, [doesRepeat, recurrenceType, intervalValue, intervalUnit, downtimeValue, downtimeUnit, selectedWeekdays, endType, endDate, defaultStartTime, defaultEndTime]);

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '860px', width: '95%' }}>
        <div className="modal-header">
          <h2>Process Enquiry: {enquiry.customer_name}</h2>
          <button className="btn-close" onClick={onClose}>&times;</button>
        </div>

        <div className="modal-body" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-6)' }}>
          <div className="enquiry-info">
            <h3>Enquiry Details</h3>
            <div className="info-grid" style={{ fontSize: 'var(--text-sm)' }}>
              <div className="info-item">
                <label>Location:</label>
                <span>{enquiry.location || 'N/A'}</span>
              </div>
              <div className="info-item">
                <label>Enquiry Type:</label>
                <div className="flex items-center gap-2 font-semibold">
                  {enquiry.enquiry_type === 'Project' ? (
                    <span className="badge badge--active flex items-center gap-1" style={{ fontSize: '10px' }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ width: '12px', height: '12px' }}>
                        <polygon points="12 2 2 7 12 12 22 7 12 2" />
                        <polyline points="2 17 12 22 22 17" />
                      </svg>
                      Ongoing Project
                    </span>
                  ) : (
                    <span className="badge badge--locked flex items-center gap-1" style={{ fontSize: '10px', background: 'var(--color-primary-50)', color: 'var(--color-primary-700)' }}>
                      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" style={{ width: '12px', height: '12px' }}>
                        <rect x="2" y="7" width="20" height="14" rx="2" ry="2" />
                      </svg>
                      One-off Job
                    </span>
                  )}
                </div>
              </div>
              <div className="info-item">
                <label>Preferred Date:</label>
                <span>{enquiry.preferred_date || 'N/A'}</span>
              </div>
              <div className="info-item">
                <label>Asset Requirement:</label>
                <span className="text-primary font-semibold">{enquiry.asset_requirement || 'N/A'}</span>
              </div>
              <div className="info-item" style={{ gridColumn: 'span 2' }}>
                <label>Job Brief:</label>
                <p className="mt-1 p-2 bg-gray-50 rounded" style={{ whiteSpace: 'pre-wrap' }}>
                  {enquiry.job_brief || 'No details provided.'}
                </p>
              </div>
            </div>

            {/* ── PROJECT RECURRENCE SECTION ───────────────────────────── */}
            {isProject && (
              <div className="mt-5" style={{
                border: '1px solid var(--color-primary-200)',
                borderRadius: '8px',
                overflow: 'hidden',
              }}>
                {/* Header */}
                <div style={{
                  background: 'linear-gradient(135deg, var(--color-primary-600), var(--color-primary-700))',
                  padding: '10px 14px',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2" style={{ width: '14px', height: '14px', flexShrink: 0 }}>
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" /><line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                    <polyline points="17 14 12 14 12 19" />
                  </svg>
                  <span style={{ color: 'white', fontWeight: 700, fontSize: '12px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                    Project Recurrence Schedule
                  </span>
                </div>

                <div style={{ padding: '14px', background: 'var(--color-primary-50)' }}>
                  {/* Repeat toggle */}
                  <div className="flex gap-2 mb-4">
                    <button
                      type="button"
                      onClick={() => setDoesRepeat(false)}
                      style={{
                        flex: 1, padding: '7px 0', borderRadius: '6px', fontSize: '12px', fontWeight: 600,
                        border: `2px solid ${!doesRepeat ? 'var(--color-primary-600)' : '#e5e7eb'}`,
                        background: !doesRepeat ? 'var(--color-primary-600)' : 'white',
                        color: !doesRepeat ? 'white' : '#6b7280', cursor: 'pointer', transition: 'all 0.15s',
                      }}
                    >
                      Does Not Repeat
                    </button>
                    <button
                      type="button"
                      onClick={() => setDoesRepeat(true)}
                      style={{
                        flex: 1, padding: '7px 0', borderRadius: '6px', fontSize: '12px', fontWeight: 600,
                        border: `2px solid ${doesRepeat ? 'var(--color-primary-600)' : '#e5e7eb'}`,
                        background: doesRepeat ? 'var(--color-primary-600)' : 'white',
                        color: doesRepeat ? 'white' : '#6b7280', cursor: 'pointer', transition: 'all 0.15s',
                      }}
                    >
                      ↻ Repeats
                    </button>
                  </div>

                  {doesRepeat && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      {/* Schedule type */}
                      <div>
                        <div style={{ fontSize: '10px', fontWeight: 700, color: 'var(--color-primary-700)', textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: '6px' }}>
                          Schedule Type
                        </div>
                        <div className="flex gap-2">
                          {(['interval', 'weekdays'] as RecurrenceType[]).map(type => (
                            <label key={type} className="flex items-center gap-2 cursor-pointer" style={{ fontSize: '12px', fontWeight: 500 }}>
                              <input
                                type="radio"
                                name="recurrenceType"
                                checked={recurrenceType === type}
                                onChange={() => setRecurrenceType(type)}
                              />
                              {type === 'interval' ? '📅 Interval (days/weeks)' : '📆 Days of Week'}
                            </label>
                          ))}
                        </div>
                      </div>

                      {/* ─ Interval mode ─ */}
                      {recurrenceType === 'interval' && (
                        <div style={{ background: 'white', borderRadius: '6px', padding: '10px', border: '1px solid #e5e7eb' }}>
                          <div style={{ fontSize: '10px', fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                            Interval Settings
                          </div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                            <div>
                              <label style={{ fontSize: '11px', color: '#6b7280', display: 'block', marginBottom: '3px' }}>Active work period</label>
                              <div className="flex gap-1">
                                <input
                                  type="number" min={1} value={intervalValue}
                                  onChange={e => setIntervalValue(Number(e.target.value))}
                                  className="form-input"
                                  style={{ width: '56px', padding: '5px 6px', fontSize: '12px' }}
                                />
                                <select value={intervalUnit} onChange={e => setIntervalUnit(e.target.value as RecurrenceUnit)}
                                  className="form-input" style={{ padding: '5px 6px', fontSize: '12px' }}>
                                  {UNIT_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}
                                </select>
                              </div>
                            </div>
                            <div>
                              <label style={{ fontSize: '11px', color: '#6b7280', display: 'block', marginBottom: '3px' }}>Downtime gap</label>
                              <div className="flex gap-1">
                                <input
                                  type="number" min={0} value={downtimeValue}
                                  onChange={e => setDowntimeValue(Number(e.target.value))}
                                  className="form-input"
                                  style={{ width: '56px', padding: '5px 6px', fontSize: '12px' }}
                                />
                                <select value={downtimeUnit} onChange={e => setDowntimeUnit(e.target.value as RecurrenceUnit)}
                                  className="form-input" style={{ padding: '5px 6px', fontSize: '12px' }}>
                                  {UNIT_OPTIONS.map(u => <option key={u} value={u}>{u}</option>)}
                                </select>
                              </div>
                            </div>
                          </div>
                        </div>
                      )}

                      {/* ─ Weekday mode ─ */}
                      {recurrenceType === 'weekdays' && (
                        <div style={{ background: 'white', borderRadius: '6px', padding: '10px', border: '1px solid #e5e7eb' }}>
                          <div style={{ fontSize: '10px', fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                            Repeat on Days
                          </div>
                          <div className="flex flex-wrap gap-1">
                            {WEEKDAYS.map(({ key, label }) => (
                              <button
                                type="button"
                                key={key}
                                onClick={() => toggleWeekday(key)}
                                style={{
                                  padding: '5px 10px', borderRadius: '20px', fontSize: '11px', fontWeight: 600, cursor: 'pointer',
                                  border: `2px solid ${selectedWeekdays.includes(key) ? 'var(--color-primary-600)' : '#d1d5db'}`,
                                  background: selectedWeekdays.includes(key) ? 'var(--color-primary-600)' : 'white',
                                  color: selectedWeekdays.includes(key) ? 'white' : '#374151',
                                  transition: 'all 0.12s',
                                }}
                              >
                                {label}
                              </button>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* ─ Default job hours ─ */}
                      <div style={{ background: 'white', borderRadius: '6px', padding: '10px', border: '1px solid #e5e7eb' }}>
                        <div style={{ fontSize: '10px', fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                          Default Job Hours
                        </div>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                          <div>
                            <label style={{ fontSize: '11px', color: '#6b7280', display: 'block', marginBottom: '3px' }}>Start time</label>
                            <input
                              type="time" value={defaultStartTime}
                              onChange={e => setDefaultStartTime(e.target.value)}
                              className="form-input"
                              style={{ padding: '5px 6px', fontSize: '12px' }}
                            />
                          </div>
                          <div>
                            <label style={{ fontSize: '11px', color: '#6b7280', display: 'block', marginBottom: '3px' }}>End time</label>
                            <input
                              type="time" value={defaultEndTime}
                              onChange={e => setDefaultEndTime(e.target.value)}
                              className="form-input"
                              style={{ padding: '5px 6px', fontSize: '12px' }}
                            />
                          </div>
                        </div>
                      </div>

                      {/* ─ End condition ─ */}
                      <div style={{ background: 'white', borderRadius: '6px', padding: '10px', border: '1px solid #e5e7eb' }}>
                        <div style={{ fontSize: '10px', fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '8px' }}>
                          End Condition
                        </div>
                        <div className="flex flex-col gap-2">
                          <label className="flex items-center gap-2 cursor-pointer" style={{ fontSize: '12px' }}>
                            <input type="radio" name="endType" checked={endType === 'ongoing'} onChange={() => setEndType('ongoing')} />
                            Ongoing — generate {recurrenceType === 'weekdays' ? '12 occurrences' : '12 cycles'} max
                          </label>
                          <label className="flex items-center gap-2 cursor-pointer" style={{ fontSize: '12px' }}>
                            <input type="radio" name="endType" checked={endType === 'date'} onChange={() => setEndType('date')} />
                            Ends on date:&nbsp;
                            <input
                              type="date"
                              value={endDate}
                              onChange={e => setEndDate(e.target.value)}
                              disabled={endType !== 'date'}
                              className="form-input"
                              style={{ padding: '3px 6px', fontSize: '12px', width: 'auto' }}
                            />
                          </label>
                        </div>
                      </div>

                      {/* Preview */}
                      {cyclePreview && (
                        <div style={{
                          padding: '8px 12px', borderRadius: '6px',
                          background: 'var(--color-primary-100)',
                          border: '1px solid var(--color-primary-200)',
                          fontSize: '11px', color: 'var(--color-primary-800)',
                          fontStyle: 'italic',
                        }}>
                          📋 {cyclePreview}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Conversion options */}
            <div className="progression-options mt-5">
              <h3>Conversion Options</h3>
              <div className="flex gap-4 mb-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    name="convertTo"
                    checked={convertTo === 'Job'}
                    onChange={() => setConvertTo('Job')}
                  />
                  {isProject ? 'Create Project' : 'Direct to Job'}
                </label>
                {!isProject && (
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="convertTo"
                      checked={convertTo === 'Quote'}
                      onChange={() => setConvertTo('Quote')}
                    />
                    Create Quote
                  </label>
                )}
              </div>

              {convertTo === 'Quote' && (
                <div className="quote-options p-4 bg-blue-50 rounded-md border border-blue-100">
                  <label className="block mb-2 font-semibold text-blue-800">Send Quote To:</label>
                  <div className="flex flex-col gap-2">
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="radio"
                        name="recipient"
                        checked={quoteRecipient === 'site'}
                        onChange={() => setQuoteRecipient('site')}
                      />
                      Site Contact ({enquiry.site_contact_name || 'N/A'})
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="radio"
                        name="recipient"
                        checked={quoteRecipient === 'billing'}
                        onChange={() => setQuoteRecipient('billing')}
                      />
                      Billing Contact
                    </label>
                    <label className="flex items-center gap-2 text-sm">
                      <input
                        type="radio"
                        name="recipient"
                        checked={quoteRecipient === 'both'}
                        onChange={() => setQuoteRecipient('both')}
                      />
                      Both
                    </label>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ── Resource Assignment ────────────────────────────────────── */}
          <div className="resource-assignment">
            {loading ? <Spinner /> : (
              <>
                <div className="mb-6">
                  <h3>Assign Assets</h3>

                  <div className="filters mb-3 flex flex-wrap gap-2">
                    <button
                      onClick={() => setSelectedAssetTypes([])}
                      className={`btn btn--sm ${selectedAssetTypes.length === 0 ? 'btn--primary' : 'btn--secondary'}`}
                      style={{ borderRadius: '20px', padding: '2px 12px', fontSize: '11px' }}
                    >
                      All
                    </button>
                    {uniqueTypes.map(type => (
                      <button
                        key={type}
                        onClick={() => toggleAssetType(type)}
                        className={`btn btn--sm ${selectedAssetTypes.includes(type) ? 'btn--primary' : 'btn--secondary'}`}
                        style={{ borderRadius: '20px', padding: '2px 12px', fontSize: '11px' }}
                      >
                        {type}
                      </button>
                    ))}
                  </div>

                  <div className="resource-list" style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #eee', borderRadius: '4px' }}>
                    {filteredAssets.map(asset => (
                      <label key={asset.id} className="flex items-center p-2 hover:bg-gray-50 cursor-pointer border-b last:border-0">
                        <input
                          type="checkbox"
                          checked={selectedAssets.includes(asset.id!)}
                          onChange={() => handleToggleAsset(asset.id!)}
                          className="mr-3"
                        />
                        <div className="text-sm">
                          <div className="font-semibold">{asset.name}</div>
                          <div className="text-xs text-gray-500">{(asset as AssetWithMetadata).asset_type_name || 'General'}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <h3>Assign Personnel</h3>
                  {isProject && (selectedAssets.length > 0 || selectedPersonnel.length > 0) && (
                    <div style={{
                      fontSize: '11px', color: 'var(--color-primary-700)',
                      background: 'var(--color-primary-50)',
                      border: '1px solid var(--color-primary-200)',
                      borderRadius: '4px', padding: '6px 8px', marginBottom: '8px',
                    }}>
                      ℹ️ These resources will be assigned to <strong>all {doesRepeat ? 'generated' : ''} job cycles</strong>.
                    </div>
                  )}

                  <div className="filters mb-2">
                    <input
                      type="text"
                      placeholder="Search personnel..."
                      className="form-input mb-3"
                      style={{ fontSize: '12px', padding: '6px 10px' }}
                      value={personnelSearch}
                      onChange={(e) => setPersonnelSearch(e.target.value)}
                    />

                    <div className="flex flex-wrap gap-1 mb-3">
                      <button
                        onClick={() => setSelectedQualifications([])}
                        className={`btn btn--sm ${selectedQualifications.length === 0 ? 'btn--primary' : 'btn--secondary'}`}
                        style={{ borderRadius: '20px', padding: '1px 10px', fontSize: '10px' }}
                      >
                        All
                      </button>
                      {uniqueQualifications.map(qual => (
                        <button
                          key={qual}
                          onClick={() => toggleQualification(qual)}
                          className={`btn btn--sm ${selectedQualifications.includes(qual) ? 'btn--primary' : 'btn--secondary'}`}
                          style={{ borderRadius: '20px', padding: '1px 10px', fontSize: '10px' }}
                        >
                          {qual}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="resource-list" style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #eee', borderRadius: '4px' }}>
                    {filteredPersonnel.map(p => (
                      <label key={p.id} className="flex items-center p-2 hover:bg-gray-50 cursor-pointer border-b last:border-0">
                        <input
                          type="checkbox"
                          checked={selectedPersonnel.includes(p.id!)}
                          onChange={() => handleTogglePersonnelCorrected(p.id!)}
                          className="mr-3"
                        />
                        <div className="text-sm">
                          <div className="font-semibold">{p.name}</div>
                          <div className="text-xs text-gray-500">
                            {p.qualifications?.map(q => q.name).join(', ') || 'No Certs'}
                          </div>
                        </div>
                      </label>
                    ))}
                    {filteredPersonnel.length === 0 && (
                      <div className="p-4 text-center text-gray-400 text-sm">No personnel found</div>
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
        </div>

        <div className="modal-footer mt-6 flex justify-end gap-3">
          <button className="btn btn--secondary" onClick={onClose} disabled={isSubmitting}>Cancel</button>
          <button
            className="btn btn--primary"
            onClick={handleSubmit}
            disabled={
              isSubmitting ||
              (convertTo === 'Job' && (selectedAssets.length === 0 || selectedPersonnel.length === 0)) ||
              (isProject && doesRepeat && recurrenceType === 'weekdays' && selectedWeekdays.length === 0) ||
              (isProject && doesRepeat && endType === 'date' && !endDate)
            }
          >
            {isSubmitting
              ? 'Processing...'
              : isProject
                ? `Confirm Project${doesRepeat ? ` (${recurrenceType === 'weekdays' ? selectedWeekdays.length + ' days/wk' : intervalValue + ' ' + intervalUnit + ' cycles'})` : ''}`
                : `Confirm ${convertTo}`
            }
          </button>
        </div>
      </div>
    </div>
  );
}
