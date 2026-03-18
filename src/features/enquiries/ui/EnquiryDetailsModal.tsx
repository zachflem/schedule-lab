import { useState, useEffect } from 'react';
import { api } from '@/shared/lib/api';
import type { Enquiry, Asset, Personnel } from '@/shared/validation/schemas';
import { Spinner } from '@/shared/ui';

interface EnquiryDetailsModalProps {
  enquiry: Enquiry;
  onClose: () => void;
  onConvert: (data: any) => Promise<{ success: boolean; data?: any; error?: string }>;
}

export function EnquiryDetailsModal({ enquiry, onClose, onConvert }: EnquiryDetailsModalProps) {
  const [assets, setAssets] = useState<Asset[]>([]);
  const [personnel, setPersonnel] = useState<Personnel[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selectedAssets, setSelectedAssets] = useState<string[]>([]);
  const [selectedPersonnel, setSelectedPersonnel] = useState<string[]>([]);
  const [convertTo, setConvertTo] = useState<'Job' | 'Quote'>('Job');
  const [quoteRecipient, setQuoteRecipient] = useState<'site' | 'billing' | 'both'>('site');
  const [isSubmitting, setIsSubmitting] = useState(false);

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

  const handleTogglePersonnel = (id: string) => {
    setSelectedPersonnel(prev => 
      prev.includes(id) ? prev.filter(p => p !== id) : [...prev, id]
    );
  };

  const handleSubmit = async () => {
    setIsSubmitting(true);
    try {
      await onConvert({
        enquiry_id: enquiry.id,
        convert_to: convertTo,
        assigned_assets: selectedAssets,
        assigned_personnel: selectedPersonnel,
        quote_recipient: convertTo === 'Quote' ? quoteRecipient : undefined
      });
      onClose();
    } catch (err) {
      console.error('Conversion failed', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '800px', width: '95%' }}>
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

            <div className="progression-options mt-6">
              <h3>Conversion Options</h3>
              <div className="flex gap-4 mb-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="radio" 
                    name="convertTo" 
                    checked={convertTo === 'Job'} 
                    onChange={() => setConvertTo('Job')} 
                  />
                  Direct to Job
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input 
                    type="radio" 
                    name="convertTo" 
                    checked={convertTo === 'Quote'} 
                    onChange={() => setConvertTo('Quote')} 
                  />
                  Create Quote
                </label>
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

          <div className="resource-assignment">
            {loading ? <Spinner /> : (
              <>
                <div className="mb-6">
                  <h3>Assign Assets</h3>
                  <div className="resource-list" style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #eee', borderRadius: '4px' }}>
                    {assets.map(asset => (
                      <label key={asset.id} className="flex items-center p-2 hover:bg-gray-50 cursor-pointer border-b last:border-0">
                        <input 
                          type="checkbox" 
                          checked={selectedAssets.includes(asset.id!)} 
                          onChange={() => handleToggleAsset(asset.id!)}
                          className="mr-3"
                        />
                        <div className="text-sm">
                          <div className="font-semibold">{asset.name}</div>
                          <div className="text-xs text-gray-500">{asset.category}</div>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <h3>Assign Personnel</h3>
                  <div className="resource-list" style={{ maxHeight: '200px', overflowY: 'auto', border: '1px solid #eee', borderRadius: '4px' }}>
                    {personnel.map(p => (
                      <label key={p.id} className="flex items-center p-2 hover:bg-gray-50 cursor-pointer border-b last:border-0">
                        <input 
                          type="checkbox" 
                          checked={selectedPersonnel.includes(p.id!)} 
                          onChange={() => handleTogglePersonnel(p.id!)}
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
            disabled={isSubmitting || (convertTo === 'Job' && (selectedAssets.length === 0 || selectedPersonnel.length === 0))}
          >
            {isSubmitting ? 'Processing...' : `Confirm ${convertTo}`}
          </button>
        </div>
      </div>
    </div>
  );
}
