import { useNavigate } from 'react-router';

interface CreateEnquiryModalProps {
  onClose: () => void;
}

export function CreateEnquiryModal({ onClose }: CreateEnquiryModalProps) {
  const navigate = useNavigate();

  const handleYes = () => {
    navigate('/enquiry');
    onClose();
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" style={{ maxWidth: '450px', width: '90%' }}>
        <div className="modal-header">
          <h2>Create New Enquiry</h2>
          <button className="btn-close" onClick={onClose}>&times;</button>
        </div>
        
        <div className="modal-body p-6">
          <p className="mb-4 text-gray-700 leading-relaxed">
            Public enquiries can be made by directing your customers to <code className="bg-gray-100 px-1 rounded text-primary">url/enquiry</code>.
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
