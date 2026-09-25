import { useState, type CSSProperties } from 'react';
import {
  ArrowUp,
  ChartNoAxesCombined,
  ClipboardPenLine,
  ListFilter,
  Menu,
  Repeat2,
  ScrollText,
  Upload,
  Wallet,
  type LucideIcon,
} from 'lucide-react';

type SectionItem = {
  id: string;
  label: string;
  icon: LucideIcon;
};

const DASHBOARD_SECTIONS: SectionItem[] = [
  { id: 'dashboard-start', label: 'Inizio', icon: ArrowUp },
  { id: 'dashboard-import', label: 'Importa CSV', icon: Upload },
  { id: 'dashboard-insights', label: 'Insight', icon: ChartNoAxesCombined },
  { id: 'dashboard-fixed', label: 'Spese fisse', icon: Repeat2 },
  { id: 'dashboard-liquidity', label: 'Liquidità', icon: Wallet },
  { id: 'dashboard-correction', label: 'Correzione', icon: ClipboardPenLine },
  { id: 'dashboard-movements', label: 'Movimenti', icon: ListFilter },
];

const RULE_SECTIONS: SectionItem[] = [
  { id: 'rules-start', label: 'Inizio', icon: ArrowUp },
  { id: 'rules-editor', label: 'Editor', icon: ClipboardPenLine },
  { id: 'rules-library', label: 'Libreria', icon: ScrollText },
];

function SectionNavToggle({ isOpen, onToggle }: { isOpen: boolean; onToggle: () => void }) {
  return (
    <button
      aria-expanded={isOpen}
      aria-label="Naviga tra le sezioni"
      className="section-rail__toggle"
      onClick={onToggle}
      title="Naviga tra le sezioni"
      type="button"
    >
      <Menu aria-hidden="true" size={20} />
    </button>
  );
}

function SectionNavLink({ item, onNavigate }: { item: SectionItem; onNavigate: (id: string) => void }) {
  const Icon = item.icon;

  return (
    <button
      aria-label={item.label}
      className="section-rail__link"
      onClick={() => onNavigate(item.id)}
      title={item.label}
      type="button"
    >
      <Icon aria-hidden="true" size={18} />
      <span>{item.label}</span>
    </button>
  );
}

export function SectionNav({ page }: { page: 'dashboard' | 'rules' }) {
  const [isOpen, setIsOpen] = useState(false);
  const items = page === 'dashboard' ? DASHBOARD_SECTIONS : RULE_SECTIONS;

  function scrollToSection(sectionId: string) {
    const section = document.getElementById(sectionId);

    if (!section) {
      return;
    }

    section.focus({ preventScroll: true });
    section.scrollIntoView({
      behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches
        ? 'auto'
        : 'smooth',
      block: 'start',
    });
    setIsOpen(false);
  }

  return (
    <nav
      aria-label="Navigazione sezioni"
      className={`section-rail ${isOpen ? 'is-open' : ''}`}
      onBlur={(event) => {
        if (!event.currentTarget.contains(event.relatedTarget)) {
          setIsOpen(false);
        }
      }}
      onKeyDown={(event) => {
        if (event.key === 'Escape') {
          setIsOpen(false);
          event.currentTarget.querySelector('button')?.focus();
        }
      }}
      onPointerEnter={(event) => {
        if (event.pointerType === 'mouse') {
          setIsOpen(true);
        }
      }}
      onPointerLeave={(event) => {
        if (event.pointerType === 'mouse') {
          setIsOpen(false);
        }
      }}
      style={{ '--section-count': items.length } as CSSProperties}
    >
      <SectionNavToggle isOpen={isOpen} onToggle={() => setIsOpen((current) => !current)} />
      <div className="section-rail__links">
        {items.map((item) => (
          <SectionNavLink item={item} key={item.id} onNavigate={scrollToSection} />
        ))}
      </div>
    </nav>
  );
}