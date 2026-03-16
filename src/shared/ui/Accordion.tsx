import { useState, type ReactNode } from 'react';

interface AccordionProps {
  number: number;
  title: string;
  defaultOpen?: boolean;
  badge?: ReactNode;
  children: ReactNode;
}

export function Accordion({ number, title, defaultOpen = false, badge, children }: AccordionProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <div className={`accordion ${isOpen ? 'accordion--open accordion--active' : ''}`}>
      <button
        type="button"
        className="accordion__trigger"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
      >
        <div className="accordion__header">
          <span className="accordion__number">{number}</span>
          <span className="accordion__title">{title}</span>
          {badge}
        </div>
        <svg className="accordion__chevron" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M5.23 7.21a.75.75 0 011.06.02L10 11.168l3.71-3.938a.75.75 0 111.08 1.04l-4.25 4.5a.75.75 0 01-1.08 0l-4.25-4.5a.75.75 0 01.02-1.06z" clipRule="evenodd" />
        </svg>
      </button>
      <div className="accordion__body">
        <div className="accordion__content">
          {children}
        </div>
      </div>
    </div>
  );
}
