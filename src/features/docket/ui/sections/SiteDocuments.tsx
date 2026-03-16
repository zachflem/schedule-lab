import { useRef } from 'react';
import type { DocumentImage } from '@/shared/validation/schemas';

interface SiteDocumentsProps {
  images: DocumentImage[];
  onChange: (images: DocumentImage[]) => void;
  disabled: boolean;
}

export function SiteDocuments({ images, onChange, disabled }: SiteDocumentsProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Improved file handling to avoid race conditions
  const processFiles = async (files: FileList) => {
    const remainingSlots = 6 - images.length;
    const filesToProcess = Array.from(files).slice(0, remainingSlots);
    
    const newImages: DocumentImage[] = await Promise.all(
      filesToProcess.map(file => {
        return new Promise<DocumentImage>((resolve) => {
          const reader = new FileReader();
          reader.onload = (e) => {
            resolve({
              id: crypto.randomUUID(),
              data_uri: e.target?.result as string,
              captured_at: new Date().toISOString(),
            });
          };
          reader.readAsDataURL(file);
        });
      })
    );

    onChange([...images, ...newImages]);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const removeImage = (id: string) => {
    onChange(images.filter(img => img.id !== id));
  };

  return (
    <div className="flex-col gap-3" style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-3)' }}>
      <p style={{ fontSize: 'var(--text-xs)', color: 'var(--color-gray-500)', fontStyle: 'italic' }}>
        Capture or upload up to 6 site documents, photos of hazards, or general site images.
      </p>

      <div className="document-grid">
        {images.map((img) => (
          <div key={img.id} className="document-card">
            <img src={img.data_uri} alt="Site Document" className="document-card__img" />
            {!disabled && (
              <button 
                type="button" 
                className="document-card__remove" 
                onClick={() => removeImage(img.id)}
                aria-label="Remove image"
              >
                ✕
              </button>
            )}
          </div>
        ))}

        {!disabled && images.length < 6 && (
          <label className="document-upload-card">
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              multiple
              onChange={(e) => e.target.files && processFiles(e.target.files)}
              className="sr-only"
            />
            <svg className="document-upload-card__icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <span className="document-upload-card__label">Add Photo</span>
            <span style={{ fontSize: '0.6rem', color: 'var(--color-gray-400)' }}>{images.length} / 6</span>
          </label>
        )}
      </div>
    </div>
  );
}
