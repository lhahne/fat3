import { useEffect, useRef } from 'react';
import type { ExportDetail, Orientation, PaperSize, PdfMode } from '../lib/exports/types';

export type PdfExportModalProps = {
  pdfMode: PdfMode;
  setPdfMode: (value: PdfMode) => void;
  paperSize: PaperSize;
  setPaperSize: (value: PaperSize) => void;
  orientation: Orientation;
  setOrientation: (value: Orientation) => void;
  grayscale: boolean;
  setGrayscale: (value: boolean) => void;
  inkSaver: boolean;
  setInkSaver: (value: boolean) => void;
  includeLegend: boolean;
  setIncludeLegend: (value: boolean) => void;
  includeProgressionChart: boolean;
  setIncludeProgressionChart: (value: boolean) => void;
  exportDetail: ExportDetail;
  isExporting: boolean;
  onExport: () => void;
  onClose: () => void;
};

export function PdfExportModal({
  pdfMode,
  setPdfMode,
  paperSize,
  setPaperSize,
  orientation,
  setOrientation,
  grayscale,
  setGrayscale,
  inkSaver,
  setInkSaver,
  includeLegend,
  setIncludeLegend,
  includeProgressionChart,
  setIncludeProgressionChart,
  isExporting,
  onExport,
  onClose,
}: PdfExportModalProps) {
  const headingRef = useRef<HTMLHeadingElement | null>(null);
  const panelRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    headingRef.current?.focus();

    function handleKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        if (!isExporting) onClose();
        return;
      }

      if (event.key === 'Tab') {
        const panel = panelRef.current;
        if (!panel) return;

        const focusable = Array.from(
          panel.querySelectorAll<HTMLElement>('button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'),
        );
        if (focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (event.shiftKey) {
          if (document.activeElement === first) {
            event.preventDefault();
            last?.focus();
          }
        } else {
          if (document.activeElement === last) {
            event.preventDefault();
            first?.focus();
          }
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isExporting, onClose]);

  return (
    <div className="modal-backdrop" onClick={isExporting ? undefined : onClose}>
      <div
        className="modal-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="pdf-export-modal-title"
        ref={panelRef}
        onClick={(event) => event.stopPropagation()}
      >
        <h2 id="pdf-export-modal-title" tabIndex={-1} ref={headingRef}>
          PDF export settings
        </h2>

        <label htmlFor="pdf-mode">PDF mode</label>
        <select
          id="pdf-mode"
          aria-label="PDF mode"
          value={pdfMode}
          onChange={(event) => setPdfMode(event.target.value as PdfMode)}
        >
          <option value="compact">Compact</option>
          <option value="detailed">Detailed</option>
        </select>

        <label htmlFor="paper-size">Paper size</label>
        <select
          id="paper-size"
          aria-label="Paper size"
          value={paperSize}
          onChange={(event) => setPaperSize(event.target.value as PaperSize)}
        >
          <option value="letter">Letter</option>
          <option value="a4">A4</option>
        </select>

        <label htmlFor="orientation">Orientation</label>
        <select
          id="orientation"
          aria-label="Orientation"
          value={orientation}
          onChange={(event) => setOrientation(event.target.value as Orientation)}
        >
          <option value="auto">Auto</option>
          <option value="portrait">Portrait</option>
          <option value="landscape">Landscape</option>
        </select>

        <label htmlFor="grayscale-toggle">
          <input
            id="grayscale-toggle"
            aria-label="Grayscale"
            type="checkbox"
            checked={grayscale}
            onChange={(event) => setGrayscale(event.target.checked)}
          />
          Grayscale
        </label>

        <label htmlFor="ink-saver-toggle">
          <input
            id="ink-saver-toggle"
            aria-label="Ink saver"
            type="checkbox"
            checked={inkSaver}
            onChange={(event) => setInkSaver(event.target.checked)}
          />
          Ink saver
        </label>

        <label htmlFor="legend-toggle">
          <input
            id="legend-toggle"
            aria-label="Include legend"
            type="checkbox"
            checked={includeLegend}
            onChange={(event) => setIncludeLegend(event.target.checked)}
          />
          Include legend
        </label>

        <label htmlFor="progression-toggle">
          <input
            id="progression-toggle"
            aria-label="Include progression chart"
            type="checkbox"
            checked={includeProgressionChart}
            onChange={(event) => setIncludeProgressionChart(event.target.checked)}
          />
          Include progression chart
        </label>

        <div className="modal-actions">
          <button type="button" onClick={onClose} disabled={isExporting}>
            Cancel
          </button>
          <button type="button" onClick={onExport} disabled={isExporting}>
            Generate PDF
          </button>
        </div>
      </div>
    </div>
  );
}
