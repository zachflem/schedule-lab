import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router';
import { api } from '@/shared/lib/api';
import type { PlatformSettings } from '@/shared/validation/schemas';

interface CreateEnquiryModalProps {
  onClose: () => void;
}

export function CreateEnquiryModal({ onClose }: CreateEnquiryModalProps) {
  const navigate = useNavigate();
  const [baseUrl, setBaseUrl] = useState<string>('');

  useEffect(() => {
    async function fetchSettings() {
      try {
        const settings = await api.get<PlatformSettings>('/settings');
        setBaseUrl(settings.base_url || window.location.origin);
      } catch (err) {
        setBaseUrl(window.location.origin);
      }
    }
    fetchSettings();
  }, []);

  const handleYes = () => {
    navigate('/enquiry');
    onClose();
  };

  const enquiryUrl = `${baseUrl.replace(/\/$/, '')}/enquiry`;

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '450px', width: '90%' }}>
        <div className="modal-header">
          <h2>Create New Enquiry</h2>
          <button className="btn-close" onClick={onClose}>&times;</button>
        </div>
        
        <div className="modal-body p-6">
          <p className="mb-4 text-gray-700 leading-relaxed">
            Public enquiries can be made by directing your customers to:
            <div className="mt-2 p-2 bg-gray-100 rounded border font-mono text-sm break-all text-primary">
              {enquiryUrl}
            </div>
          </p>
          <p className="font-semibold text-lg">
            Do you wish to create a new enquiry?
          </p>
        </div>

        <div className="modal-footer flex justify-end gap-3 p-4 bg-gray-50 rounded-b-lg">
          <button 
            className="btn btn--secondary" 
            onClick={onClose}
            style={{ minWidth: '80px' }}
          >
            No
          </button>
          <button 
            className="btn btn--primary" 
            onClick={handleYes}
            style={{ minWidth: '80px' }}
          >
            Yes
          </button>
        </div>
      </div>
    </div>
  );
}
