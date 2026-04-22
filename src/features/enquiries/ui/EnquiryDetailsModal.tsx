import { useState, useEffect, useMemo } from 'react';
import { api } from '@/shared/lib/api';
import type { Enquiry, Asset, Personnel, RecurrenceWeekday, AssetCompliance, CorrespondenceTemplate } from '@/shared/validation/schemas';
import { Spinner } from '@/shared/ui';

interface EnquiryDetailsModalProps {
  enquiry: Enquiry;
  onClose: () => void;
  onConvert: (data: any) => Promise<{ success: boolean; data?: any; error?: string }>;
}

interface AssetWithMetadata extends Asset {
  asset_type_name?: string;
}

interface ComplianceWarning {
  entityId: string;
  entityName: string;
  entityType: 'asset' | 'personnel';
  items: { label: string; expiry: string; daysRemaining: number }[];
  hasExpired: boolean;
}

function daysUntil(dateStr: string): number {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  return Math.floor((new Date(dateStr).getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
}

function getAssetComplianceWarning(asset: AssetWithMetadata): ComplianceWarning | null {
  const items: ComplianceWarning['items'] = [];
  const checkDate = (label: string, dateStr: string | null | undefined) => {
    if (!dateStr) return;
    const days = daysUntil(dateStr);
    if (days <= 30) items.push({ label, expiry: dateStr, daysRemaining: days });
  };
  checkDate('Rego', asset.rego_expiry);
  checkDate('Insurance', asset.insurance_expiry);
  for (const entry of (asset.compliance_entries as AssetCompliance[] | undefined) ?? []) {
    checkDate(entry.compliance_type_name ?? 'Compliance', entry.expiry_date);
  }
  if (items.length === 0) return null;
  return { entityId: asset.id!, entityName: asset.name, entityType: 'asset', items, hasExpired: items.some(i => i.daysRemaining < 0) };
}

function getPersonnelComplianceWarning(person: Personnel): ComplianceWarning | null {
  const items: ComplianceWarning['items'] = [];
  for (const qual of person.qualifications ?? []) {
    if (!qual.expiry_date) continue;
    const days = daysUntil(qual.expiry_date);
    if (days <= 30) items.push({ label: qual.name, expiry: qual.expiry_date, daysRemaining: days });
  }
  if (items.length === 0) return null;
  return { entityId: person.id!, entityName: person.name, entityType: 'personnel', items, hasExpired: items.some(i => i.daysRemaining < 0) };
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
  const [assetSearch, setAssetSearch] = useState('');
  const [personnelSearch, setPersonnelSearch] = useState('');
  const [selectedQualifications, setSelectedQualifications] = useState<string[]>([]);
  const [convertTo, setConvertTo] = useState<'Job' | 'Quote'>('Job');
  const [quoteRecipient, setQuoteRecipient] = useState<'site' | 'billing' | 'both' | 'other'>('site');
  const [quoteOtherEmail, setQuoteOtherEmail] = useState('');
  const [estimatedHours, setEstimatedHours] = useState<string>('');
  const [hoursType, setHoursType] = useState<'quoted' | 'estimated'>('quoted');
  const [includesTravel, setIncludesTravel] = useState(false);
  const [templates, setTemplates] = useState<CorrespondenceTemplate[]>([]);
  const [selectedTemplateIds, setSelectedTemplateIds] = useState<string[]>([]);
  const [complianceWarning, setComplianceWarning] = useState<ComplianceWarning | null>(null);
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
        const [assetsData, personnelData, templatesData] = await Promise.all([
          api.get<Asset[]>('/assets'),
          api.get<Personnel[]>('/personnel'),
          api.get<CorrespondenceTemplate[]>('/correspondence-templates'),
        ]);
        setAssets(assetsData);
        setPersonnel(personnelData);
        setTemplates(templatesData);
      } catch (err) {
        console.error('Failed to fetch resources', err);
      } finally {
        setLoading(false);
      }
    }
    fetchData();
  }, []);

  const handleToggleAsset = (id: string) => {
    if (selectedAssets.includes(id)) {
      setSelectedAssets(prev => prev.filter(a => a !== id));
      return;
    }
    const asset = assets.find(a => a.id === id);
    if (asset) {
      const warning = getAssetComplianceWarning(asset);
      if (warning) { setComplianceWarning(warning); return; }
    }
    setSelectedAssets(prev => [...prev, id]);
  };

  const handleTogglePersonnelCorrected = (id: string) => {
    if (selectedPersonnel.includes(id)) {
      setSelectedPersonnel(prev => prev.filter((p: string) => p !== id));
      return;
    }
    const person = personnel.find(p => p.id === id);
    if (person) {
      const warning = getPersonnelComplianceWarning(person);
      if (warning) { setComplianceWarning(warning); return; }
    }
    setSelectedPersonnel(prev => [...prev, id]);
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
    return assets.filter(a => {
      const matchesSearch = a.name.toLowerCase().includes(assetSearch.toLowerCase());
      const matchesType = selectedAssetTypes.length === 0 || selectedAssetTypes.includes((a as AssetWithMetadata).asset_type_name || 'Other');
      return matchesSearch && matchesType;
    });
  }, [assets, assetSearch, selectedAssetTypes]);

  const requiredQualIds = useMemo(() => {
    return assets
      .filter(a => selectedAssets.includes(a.id!))
      .map(a => a.required_qualification_id)
      .filter((id): id is string => !!id);
  }, [assets, selectedAssets]);

  const filteredPersonnel = useMemo(() => {
    return personnel.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(personnelSearch.toLowerCase());
      const matchesQual = selectedQualifications.length === 0 ||
        p.qualifications?.some(q => selectedQualifications.includes(q.name));
      const matchesAssetQual = requiredQualIds.length === 0 ||
        selectedPersonnel.includes(p.id!) ||
        p.qualifications?.some(q => q.id !== undefined && requiredQualIds.includes(q.id));
      return matchesSearch && matchesQual && matchesAssetQual;
    });
  }, [personnel, personnelSearch, selectedQualifications, requiredQualIds, selectedPersonnel]);

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
        quote_other_email: convertTo === 'Quote' && quoteRecipient === 'other' ? quoteOtherEmail : undefined,
        estimated_hours: convertTo === 'Quote' && estimatedHours ? parseFloat(estimatedHours) : undefined,
        hours_type: convertTo === 'Quote' && estimatedHours ? hoursType : undefined,
        includes_travel: convertTo === 'Quote' ? includesTravel : undefined,
        selected_template_ids: convertTo === 'Quote' ? selectedTemplateIds : [],
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
      <div className="modal-content" style={{ maxWidth: '680px', width: '95%' }}>
        <div className="modal-header">
          <h2>Process Enquiry: {enquiry.customer_name}</h2>
          <button className="btn-close" onClick={onClose}>&times;</button>
        </div>

        <div className="modal-body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>

          {/* ── Enquiry Details ──────────────────────────────────────────── */}
          <section>
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
          </section>

          {/* ── PROJECT RECURRENCE SECTION ───────────────────────────────── */}
          {isProject && (
            <section style={{
              border: '1px solid var(--color-primary-200)',
              borderRadius: '8px',
              overflow: 'hidden',
            }}>
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
            </section>
          )}

          {/* ── Allocations ──────────────────────────────────────────────── */}
          <section>
            <h3>Allocations</h3>
            {loading ? <Spinner /> : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>

                {/* Assets */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
                    <label style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-gray-700)' }}>
                      Assets
                      <span style={{ marginLeft: '6px', fontSize: 'var(--text-xs)', fontWeight: 700, background: 'var(--color-primary-100)', color: 'var(--color-primary-700)', borderRadius: '999px', padding: '0 6px' }}>
                        {selectedAssets.length}
                      </span>
                    </label>
                    <input type="text" placeholder="Search…" className="form-input" style={{ width: '120px', padding: '3px 8px', fontSize: 'var(--text-xs)' }} value={assetSearch} onChange={(e) => setAssetSearch(e.target.value)} />
                  </div>

                  {uniqueTypes.length > 1 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: 'var(--space-2)' }}>
                      <button type="button" onClick={() => setSelectedAssetTypes([])} className={`btn btn--sm ${selectedAssetTypes.length === 0 ? 'btn--primary' : 'btn--secondary'}`} style={{ borderRadius: '20px', padding: '1px 8px', fontSize: '10px' }}>All</button>
                      {uniqueTypes.map(type => (
                        <button key={type} type="button" onClick={() => toggleAssetType(type)} className={`btn btn--sm ${selectedAssetTypes.includes(type) ? 'btn--primary' : 'btn--secondary'}`} style={{ borderRadius: '20px', padding: '1px 8px', fontSize: '10px' }}>
                          {type}
                        </button>
                      ))}
                    </div>
                  )}

                  <div style={{ border: '1px solid var(--color-gray-200)', borderRadius: 'var(--radius-md)', height: '160px', overflowY: 'auto' }}>
                    {filteredAssets.length === 0 ? (
                      <div style={{ padding: 'var(--space-4)', textAlign: 'center', color: 'var(--color-gray-400)', fontSize: 'var(--text-sm)' }}>No assets found</div>
                    ) : filteredAssets.map(asset => (
                      <label key={asset.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', padding: '8px var(--space-3)', borderBottom: '1px solid var(--color-gray-50)', cursor: 'pointer', background: selectedAssets.includes(asset.id!) ? 'var(--color-primary-50)' : 'white', transition: 'background var(--transition-fast)' }}>
                        <input
                          type="checkbox"
                          checked={selectedAssets.includes(asset.id!)}
                          onChange={() => handleToggleAsset(asset.id!)}
                          style={{ flexShrink: 0 }}
                        />
                        <div>
                          <div style={{ fontSize: 'var(--text-sm)', fontWeight: selectedAssets.includes(asset.id!) ? 600 : 400 }}>{asset.name}</div>
                          <div style={{ fontSize: '10px', color: 'var(--color-gray-400)' }}>{(asset as AssetWithMetadata).asset_type_name || 'General'}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Personnel */}
                <div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 'var(--space-2)' }}>
                    <label style={{ fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-gray-700)' }}>
                      Personnel
                      <span style={{ marginLeft: '6px', fontSize: 'var(--text-xs)', fontWeight: 700, background: 'var(--color-primary-100)', color: 'var(--color-primary-700)', borderRadius: '999px', padding: '0 6px' }}>
                        {selectedPersonnel.length}
                      </span>
                    </label>
                    <input type="text" placeholder="Search…" className="form-input" style={{ width: '120px', padding: '3px 8px', fontSize: 'var(--text-xs)' }} value={personnelSearch} onChange={(e) => setPersonnelSearch(e.target.value)} />
                  </div>

                  {requiredQualIds.length > 0 && (
                    <div style={{
                      fontSize: '11px', color: 'var(--color-primary-700)',
                      background: 'var(--color-primary-50)',
                      border: '1px solid var(--color-primary-200)',
                      borderRadius: '4px', padding: '6px 8px', marginBottom: 'var(--space-2)',
                    }}>
                      Showing personnel qualified for the selected asset{selectedAssets.length > 1 ? 's' : ''}.
                    </div>
                  )}

                  {isProject && (selectedAssets.length > 0 || selectedPersonnel.length > 0) && (
                    <div style={{
                      fontSize: '11px', color: 'var(--color-primary-700)',
                      background: 'var(--color-primary-50)',
                      border: '1px solid var(--color-primary-200)',
                      borderRadius: '4px', padding: '6px 8px', marginBottom: 'var(--space-2)',
                    }}>
                      ℹ️ These resources will be assigned to <strong>all {doesRepeat ? 'generated' : ''} job cycles</strong>.
                    </div>
                  )}

                  {uniqueQualifications.length > 0 && (
                    <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', marginBottom: 'var(--space-2)' }}>
                      <button type="button" onClick={() => setSelectedQualifications([])} className={`btn btn--sm ${selectedQualifications.length === 0 ? 'btn--primary' : 'btn--secondary'}`} style={{ borderRadius: '20px', padding: '1px 8px', fontSize: '10px' }}>All</button>
                      {uniqueQualifications.map(qual => (
                        <button key={qual} type="button" onClick={() => toggleQualification(qual)} className={`btn btn--sm ${selectedQualifications.includes(qual) ? 'btn--primary' : 'btn--secondary'}`} style={{ borderRadius: '20px', padding: '1px 8px', fontSize: '10px' }}>
                          {qual}
                        </button>
                      ))}
                    </div>
                  )}

                  <div style={{ border: '1px solid var(--color-gray-200)', borderRadius: 'var(--radius-md)', height: '160px', overflowY: 'auto' }}>
                    {filteredPersonnel.length === 0 ? (
                      <div style={{ padding: 'var(--space-4)', textAlign: 'center', color: 'var(--color-gray-400)', fontSize: 'var(--text-sm)' }}>No personnel found</div>
                    ) : filteredPersonnel.map(p => (
                      <label key={p.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', padding: '8px var(--space-3)', borderBottom: '1px solid var(--color-gray-50)', cursor: 'pointer', background: selectedPersonnel.includes(p.id!) ? 'var(--color-primary-50)' : 'white', transition: 'background var(--transition-fast)' }}>
                        <input
                          type="checkbox"
                          checked={selectedPersonnel.includes(p.id!)}
                          onChange={() => handleTogglePersonnelCorrected(p.id!)}
                          style={{ flexShrink: 0 }}
                        />
                        <div>
                          <div style={{ fontSize: 'var(--text-sm)', fontWeight: selectedPersonnel.includes(p.id!) ? 600 : 400 }}>{p.name}</div>
                          <div style={{ fontSize: '10px', color: 'var(--color-gray-400)' }}>
                            {p.qualifications?.map(q => q.name).join(', ') || 'No qualifications'}
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

              </div>
            )}
          </section>

          {/* ── Conversion Options ───────────────────────────────────────── */}
          <section className="progression-options">
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

            {convertTo === 'Quote' && (() => {
              const hrs = parseFloat(estimatedHours) || 0;
              const assignedAssetObjs = assets.filter(a => selectedAssets.includes(a.id!));
              const assignedPersonnelObjs = personnel.filter(p => selectedPersonnel.includes(p.id!));

              const assetRows = assignedAssetObjs.map(a => ({
                name: a.name,
                rate: a.rate_hourly ?? null,
                cost: hrs && a.rate_hourly ? hrs * a.rate_hourly : null,
              }));
              const personnelRows = assignedPersonnelObjs.map(p => {
                const primaryQual = p.qualifications?.[0];
                const rate = primaryQual?.rate_hourly ?? null;
                return {
                  name: p.name,
                  rate,
                  qualLabel: primaryQual?.name ?? null,
                  cost: hrs && rate ? hrs * rate : null,
                };
              });
              const totalCost = [...assetRows, ...personnelRows].every(r => r.cost !== null)
                ? assetRows.reduce((s, r) => s + (r.cost ?? 0), 0) + personnelRows.reduce((s, r) => s + (r.cost ?? 0), 0)
                : null;

              return (
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>

                  {/* Hours */}
                  <div style={{ padding: 'var(--space-4)', background: 'var(--color-gray-50)', borderRadius: '6px', border: '1px solid var(--color-gray-200)', display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <div style={{ display: 'flex', gap: 'var(--space-3)' }}>
                        {(['quoted', 'estimated'] as const).map(type => (
                          <label key={type} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 'var(--text-sm)', fontWeight: 600, color: 'var(--color-gray-700)', cursor: 'pointer' }}>
                            <input
                              type="radio"
                              name="hoursType"
                              checked={hoursType === type}
                              onChange={() => setHoursType(type)}
                            />
                            {type === 'quoted' ? 'Quoted Hrs' : 'Estimated Hrs'}
                          </label>
                        ))}
                      </div>
                      <label style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 'var(--text-sm)', color: 'var(--color-gray-600)', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={includesTravel}
                          onChange={e => setIncludesTravel(e.target.checked)}
                        />
                        Includes Travel
                      </label>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                      <input
                        type="number"
                        min="0.5"
                        step="0.5"
                        className="form-input"
                        style={{ width: '100px' }}
                        placeholder="e.g. 8"
                        value={estimatedHours}
                        onChange={e => setEstimatedHours(e.target.value)}
                      />
                      <span style={{ fontSize: 'var(--text-sm)', color: 'var(--color-gray-500)' }}>hours</span>
                    </div>
                  </div>

                  {/* Quote summary */}
                  {(assignedAssetObjs.length > 0 || assignedPersonnelObjs.length > 0) && (
                    <div style={{ borderRadius: '6px', border: '1px solid var(--color-gray-200)', overflow: 'hidden' }}>
                      <div style={{ padding: 'var(--space-2) var(--space-3)', background: 'var(--color-gray-100)', borderBottom: '1px solid var(--color-gray-200)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontSize: 'var(--text-xs)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--color-gray-600)' }}>
                          Quote Summary
                        </span>
                        {hrs > 0 && (
                          <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-gray-500)' }}>
                            {hrs}h · {hoursType === 'quoted' ? 'Quoted' : 'Estimated'}{includesTravel ? ' · incl. travel' : ''}
                          </span>
                        )}
                      </div>
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 'var(--text-sm)' }}>
                        <thead>
                          <tr style={{ background: 'var(--color-gray-50)' }}>
                            <th style={{ padding: 'var(--space-2) var(--space-3)', textAlign: 'left', fontWeight: 600, color: 'var(--color-gray-600)', fontSize: 'var(--text-xs)' }}>Item</th>
                            <th style={{ padding: 'var(--space-2) var(--space-3)', textAlign: 'right', fontWeight: 600, color: 'var(--color-gray-600)', fontSize: 'var(--text-xs)' }}>Rate/hr</th>
                            {hrs > 0 && <th style={{ padding: 'var(--space-2) var(--space-3)', textAlign: 'right', fontWeight: 600, color: 'var(--color-gray-600)', fontSize: 'var(--text-xs)' }}>Est. Cost</th>}
                          </tr>
                        </thead>
                        <tbody>
                          {assetRows.map((row, i) => (
                            <tr key={i} style={{ borderTop: '1px solid var(--color-gray-100)' }}>
                              <td style={{ padding: 'var(--space-2) var(--space-3)', color: 'var(--color-gray-800)' }}>
                                <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--color-primary-600)', marginRight: 'var(--space-1)', textTransform: 'uppercase' }}>Asset</span>
                                {row.name}
                              </td>
                              <td style={{ padding: 'var(--space-2) var(--space-3)', textAlign: 'right', color: row.rate ? 'var(--color-gray-700)' : 'var(--color-gray-400)' }}>
                                {row.rate ? `$${row.rate.toFixed(2)}` : '—'}
                              </td>
                              {hrs > 0 && (
                                <td style={{ padding: 'var(--space-2) var(--space-3)', textAlign: 'right', fontWeight: 600, color: row.cost ? 'var(--color-gray-800)' : 'var(--color-gray-400)' }}>
                                  {row.cost ? `$${row.cost.toFixed(2)}` : '—'}
                                </td>
                              )}
                            </tr>
                          ))}
                          {personnelRows.map((row, i) => (
                            <tr key={i} style={{ borderTop: '1px solid var(--color-gray-100)' }}>
                              <td style={{ padding: 'var(--space-2) var(--space-3)', color: 'var(--color-gray-800)' }}>
                                <span style={{ fontSize: '10px', fontWeight: 700, color: 'var(--color-success-600, #16a34a)', marginRight: 'var(--space-1)', textTransform: 'uppercase' }}>Crew</span>
                                {row.name}
                                {row.qualLabel && <span style={{ color: 'var(--color-gray-400)', fontSize: 'var(--text-xs)', marginLeft: 'var(--space-1)' }}>({row.qualLabel})</span>}
                              </td>
                              <td style={{ padding: 'var(--space-2) var(--space-3)', textAlign: 'right', color: row.rate ? 'var(--color-gray-700)' : 'var(--color-gray-400)' }}>
                                {row.rate ? `$${row.rate.toFixed(2)}` : '—'}
                              </td>
                              {hrs > 0 && (
                                <td style={{ padding: 'var(--space-2) var(--space-3)', textAlign: 'right', fontWeight: 600, color: row.cost ? 'var(--color-gray-800)' : 'var(--color-gray-400)' }}>
                                  {row.cost ? `$${row.cost.toFixed(2)}` : '—'}
                                </td>
                              )}
                            </tr>
                          ))}
                        </tbody>
                        {hrs > 0 && totalCost !== null && (
                          <tfoot>
                            <tr style={{ borderTop: '2px solid var(--color-gray-200)', background: 'var(--color-gray-50)' }}>
                              <td colSpan={2} style={{ padding: 'var(--space-2) var(--space-3)', fontWeight: 700, fontSize: 'var(--text-sm)', color: 'var(--color-gray-700)' }}>
                                Total ({hoursType === 'quoted' ? 'Quoted' : 'Estimated'})
                              </td>
                              <td style={{ padding: 'var(--space-2) var(--space-3)', textAlign: 'right', fontWeight: 700, fontSize: 'var(--text-sm)', color: 'var(--color-gray-900)' }}>
                                ${totalCost.toFixed(2)}
                              </td>
                            </tr>
                          </tfoot>
                        )}
                      </table>
                      {hrs === 0 && (
                        <p style={{ margin: 0, padding: 'var(--space-2) var(--space-3)', fontSize: 'var(--text-xs)', color: 'var(--color-gray-400)', borderTop: '1px solid var(--color-gray-100)' }}>
                          Enter hours above to see estimated costs.
                        </p>
                      )}
                    </div>
                  )}

                  {/* Recipient */}
                  <div style={{ padding: 'var(--space-4)', background: 'var(--color-primary-50)', borderRadius: '6px', border: '1px solid var(--color-primary-100)' }}>
                    <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontWeight: 600, color: 'var(--color-primary-800)', fontSize: 'var(--text-sm)' }}>
                      Send Quote To:
                    </label>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                      {([
                        { value: 'site', label: `Site Contact (${enquiry.site_contact_name || 'N/A'})` },
                        { value: 'billing', label: 'Billing Contact' },
                        { value: 'both', label: 'Both (Site & Billing)' },
                        { value: 'other', label: 'Other (manual email)' },
                      ] as const).map(({ value, label }) => (
                        <label key={value} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 'var(--text-sm)', cursor: 'pointer' }}>
                          <input
                            type="radio"
                            name="recipient"
                            checked={quoteRecipient === value}
                            onChange={() => setQuoteRecipient(value)}
                          />
                          {label}
                        </label>
                      ))}
                      {quoteRecipient === 'other' && (
                        <input
                          type="email"
                          required
                          className="form-input"
                          placeholder="recipient@example.com"
                          style={{ marginTop: 'var(--space-1)' }}
                          value={quoteOtherEmail}
                          onChange={e => setQuoteOtherEmail(e.target.value)}
                        />
                      )}
                    </div>
                  </div>

                  {/* Correspondence templates */}
                  {templates.length > 0 && (
                    <div style={{ padding: 'var(--space-4)', background: 'var(--color-gray-50)', borderRadius: '6px', border: '1px solid var(--color-gray-200)' }}>
                      <label style={{ display: 'block', marginBottom: 'var(--space-2)', fontWeight: 600, fontSize: 'var(--text-sm)', color: 'var(--color-gray-700)' }}>
                        Include with Quote:
                      </label>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                        {templates.map(t => (
                          <label key={t.id} style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)', fontSize: 'var(--text-sm)', cursor: 'pointer' }}>
                            <input
                              type="checkbox"
                              checked={selectedTemplateIds.includes(t.id!)}
                              onChange={e => {
                                setSelectedTemplateIds(prev =>
                                  e.target.checked
                                    ? [...prev, t.id!]
                                    : prev.filter(id => id !== t.id)
                                );
                              }}
                            />
                            {t.name}
                          </label>
                        ))}
                      </div>
                    </div>
                  )}

                </div>
              );
            })()}
          </section>

        </div>

        {/* Compliance Warning Modal */}
        {complianceWarning && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1200 }}>
            <div className="card" style={{ width: '440px', maxWidth: '95vw' }}>
              <div className="card__header" style={{ background: complianceWarning.hasExpired ? 'var(--color-danger-50)' : 'var(--color-warning-50)', borderBottom: `1px solid ${complianceWarning.hasExpired ? 'var(--color-danger-200)' : 'var(--color-warning-200)'}` }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                  <svg viewBox="0 0 24 24" fill="none" stroke={complianceWarning.hasExpired ? 'var(--color-danger-600)' : 'var(--color-warning-600)'} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ width: 20, flexShrink: 0 }}>
                    <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                    <line x1="12" y1="9" x2="12" y2="13" /><line x1="12" y1="17" x2="12.01" y2="17" />
                  </svg>
                  <h3 style={{ color: complianceWarning.hasExpired ? 'var(--color-danger-800)' : 'var(--color-warning-800)' }}>
                    {complianceWarning.hasExpired ? 'Compliance Expired — Cannot Assign' : 'Compliance Expiry Warning'}
                  </h3>
                </div>
              </div>
              <div className="card__body" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
                <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-gray-700)' }}>
                  <strong>{complianceWarning.entityName}</strong>{' '}
                  {complianceWarning.hasExpired
                    ? 'has expired compliance items and cannot be assigned:'
                    : 'has compliance items expiring within 30 days:'}
                </p>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-2)' }}>
                  {complianceWarning.items.map((item, i) => (
                    <div key={i} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: 'var(--space-2) var(--space-3)', background: item.daysRemaining < 0 ? 'var(--color-danger-50)' : 'var(--color-warning-50)', borderRadius: 'var(--radius-md)', border: `1px solid ${item.daysRemaining < 0 ? 'var(--color-danger-200)' : 'var(--color-warning-200)'}` }}>
                      <span style={{ fontWeight: 600, fontSize: 'var(--text-sm)' }}>{item.label}</span>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-gray-600)' }}>Expires {item.expiry}</div>
                        <div style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: item.daysRemaining < 0 ? 'var(--color-danger-600)' : 'var(--color-warning-600)' }}>
                          {item.daysRemaining < 0 ? `Expired ${Math.abs(item.daysRemaining)}d ago` : item.daysRemaining === 0 ? 'Expires today' : `${item.daysRemaining}d remaining`}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
                {!complianceWarning.hasExpired && (
                  <p style={{ fontSize: 'var(--text-sm)', color: 'var(--color-gray-500)' }}>
                    Do you still want to assign this {complianceWarning.entityType}?
                  </p>
                )}
                <div style={{ display: 'flex', gap: 'var(--space-2)', justifyContent: 'flex-end' }}>
                  <button type="button" className="btn btn--secondary" onClick={() => setComplianceWarning(null)}>
                    {complianceWarning.hasExpired ? 'Close' : 'Cancel'}
                  </button>
                  {!complianceWarning.hasExpired && (
                    <button
                      type="button"
                      className="btn btn--warning"
                      onClick={() => {
                        if (complianceWarning.entityType === 'asset') {
                          setSelectedAssets(prev => [...prev, complianceWarning.entityId]);
                        } else {
                          setSelectedPersonnel(prev => [...prev, complianceWarning.entityId]);
                        }
                        setComplianceWarning(null);
                      }}
                    >
                      Assign Anyway
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}

        <div className="modal-footer mt-6 flex justify-end gap-3">
          <button className="btn btn--secondary" onClick={onClose} disabled={isSubmitting}>Cancel</button>
          <button
            className="btn btn--primary"
            onClick={handleSubmit}
            disabled={
              isSubmitting ||
              (convertTo === 'Job' && (selectedAssets.length === 0 || selectedPersonnel.length === 0)) ||
              (convertTo === 'Quote' && quoteRecipient === 'other' && !quoteOtherEmail.trim()) ||
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
