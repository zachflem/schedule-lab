import { useRef, useState } from 'react';
import SignatureCanvas from 'react-signature-canvas';
import type { SignatureMetadata } from '@/shared/validation/schemas';

interface SignatureCaptureProps {
  signatures: SignatureMetadata[];
  onChange: (sigs: SignatureMetadata[]) => void;
  disabled: boolean;
}

const ROLES = ['Operator', 'Customer', 'Site Representative', 'Other'] as const;

export function SignatureCapture({ signatures, onChange, disabled }: SignatureCaptureProps) {
  const sigRef = useRef<SignatureCanvas>(null);
  const [name, setName] = useState('');
  const [role, setRole] = useState<string>('Operator');
  const [isSigning, setIsSigning] = useState(false);

  const captureSignature = async () => {
    if (!sigRef.current || sigRef.current.isEmpty() || !name.trim()) return;

    const blob = sigRef.current.toDataURL('image/png');

    // Capture GPS (fails silently)
    let lat: number | undefined;
    let lng: number | undefined;
    try {
      const pos = await new Promise<GeolocationPosition>((resolve, reject) =>
        navigator.geolocation.getCurrentPosition(resolve, reject, { timeout: 5000 })
      );
      lat = pos.coords.latitude;
      lng = pos.coords.longitude;
    } catch {
      // GPS not available — continue without
    }

    const sig: SignatureMetadata = {
      signatory_name: name.trim(),
      signatory_role: role as SignatureMetadata['signatory_role'],
      signature_blob: blob,
      signed_at: new Date().toISOString(),
      signed_lat: lat,
      signed_lng: lng,
      device_info: navigator.userAgent,
    };

    onChange([...signatures, sig]);
    setName('');
    setIsSigning(false);
    sigRef.current?.clear();
  };

  const removeSignature = (idx: number) => {
    onChange(signatures.filter((_, i) => i !== idx));
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-4)' }}>
      {/* Existing signatures */}
      {signatures.map((sig, idx) => (
        <div key={idx} className="signature-entry">
          <img
            src={sig.signature_blob}
            alt={`Signature by ${sig.signatory_name}`}
            className="signature-entry__preview"
          />
          <div className="signature-entry__meta">
            <div style={{ fontWeight: 700, color: 'var(--color-gray-800)', fontSize: 'var(--text-sm)' }}>
              {sig.signatory_name}
            </div>
            <div>{sig.signatory_role}</div>
            <div>{new Date(sig.signed_at).toLocaleString()}</div>
            {sig.signed_lat && sig.signed_lng && (
              <div>📍 {sig.signed_lat.toFixed(4)}, {sig.signed_lng.toFixed(4)}</div>
            )}
          </div>
          {!disabled && (
            <button type="button" className="btn btn--danger btn--icon btn--sm" onClick={() => removeSignature(idx)}>
              ✕
            </button>
          )}
        </div>
      ))}

      {/* Add new signature */}
      {!disabled && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label">Name</label>
              <input
                className="form-input"
                value={name}
                onChange={e => setName(e.target.value)}
                placeholder="Signatory name"
              />
            </div>
            <div className="form-group">
              <label className="form-label">Role</label>
              <select className="form-input" value={role} onChange={e => setRole(e.target.value)}>
                {ROLES.map(r => (
                  <option key={r} value={r}>{r}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="form-label" style={{ marginBottom: 'var(--space-1)' }}>Signature</label>
            <div className={`signature-pad ${isSigning ? 'signature-pad--signing' : ''}`}>
              <SignatureCanvas
                ref={sigRef}
                canvasProps={{ width: 500, height: 150, style: { width: '100%', height: '150px' } }}
                onBegin={() => setIsSigning(true)}
              />
            </div>
          </div>

          <div style={{ display: 'flex', gap: 'var(--space-2)' }}>
            <button
              type="button"
              className="btn btn--primary"
              onClick={captureSignature}
              disabled={!name.trim()}
            >
              Capture Signature
            </button>
            <button
              type="button"
              className="btn btn--secondary"
              onClick={() => { sigRef.current?.clear(); setIsSigning(false); }}
            >
              Clear
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
