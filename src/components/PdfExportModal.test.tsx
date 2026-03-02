import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { PdfExportModal } from './PdfExportModal';

function defaultProps() {
  return {
    pdfMode: 'compact' as const,
    setPdfMode: vi.fn(),
    paperSize: 'a4' as const,
    setPaperSize: vi.fn(),
    orientation: 'auto' as const,
    setOrientation: vi.fn(),
    grayscale: false,
    setGrayscale: vi.fn(),
    inkSaver: true,
    setInkSaver: vi.fn(),
    includeLegend: true,
    setIncludeLegend: vi.fn(),
    includeProgressionChart: false,
    setIncludeProgressionChart: vi.fn(),
    isExporting: false,
    onExport: vi.fn(),
    onClose: vi.fn(),
  };
}

describe('PdfExportModal', () => {
  it('renders with correct role and name', () => {
    render(<PdfExportModal {...defaultProps()} />);
    expect(screen.getByRole('dialog', { name: 'PDF export settings' })).toBeInTheDocument();
  });

  it('renders all controls with correct initial values', () => {
    render(<PdfExportModal {...defaultProps()} />);

    expect(screen.getByLabelText('PDF mode')).toHaveValue('compact');
    expect(screen.getByLabelText('Paper size')).toHaveValue('a4');
    expect(screen.getByLabelText('Orientation')).toHaveValue('auto');
    expect(screen.getByLabelText('Grayscale')).not.toBeChecked();
    expect(screen.getByLabelText('Ink saver')).toBeChecked();
    expect(screen.getByLabelText('Include legend')).toBeChecked();
    expect(screen.getByLabelText('Include progression chart')).not.toBeChecked();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Generate PDF' })).toBeInTheDocument();
  });

  it('calls setPdfMode when PDF mode dropdown changes', () => {
    const props = defaultProps();
    render(<PdfExportModal {...props} />);
    fireEvent.change(screen.getByLabelText('PDF mode'), { target: { value: 'detailed' } });
    expect(props.setPdfMode).toHaveBeenCalledWith('detailed');
  });

  it('calls setPaperSize when paper size dropdown changes', () => {
    const props = defaultProps();
    render(<PdfExportModal {...props} />);
    fireEvent.change(screen.getByLabelText('Paper size'), { target: { value: 'letter' } });
    expect(props.setPaperSize).toHaveBeenCalledWith('letter');
  });

  it('calls setOrientation when orientation dropdown changes', () => {
    const props = defaultProps();
    render(<PdfExportModal {...props} />);
    fireEvent.change(screen.getByLabelText('Orientation'), { target: { value: 'portrait' } });
    expect(props.setOrientation).toHaveBeenCalledWith('portrait');
  });

  it('calls setGrayscale when grayscale checkbox is toggled', () => {
    const props = defaultProps();
    render(<PdfExportModal {...props} />);
    fireEvent.click(screen.getByLabelText('Grayscale'));
    expect(props.setGrayscale).toHaveBeenCalledWith(true);
  });

  it('calls setInkSaver when ink saver checkbox is toggled', () => {
    const props = defaultProps();
    render(<PdfExportModal {...props} />);
    fireEvent.click(screen.getByLabelText('Ink saver'));
    expect(props.setInkSaver).toHaveBeenCalledWith(false);
  });

  it('calls setIncludeLegend when include legend checkbox is toggled', () => {
    const props = defaultProps();
    render(<PdfExportModal {...props} />);
    fireEvent.click(screen.getByLabelText('Include legend'));
    expect(props.setIncludeLegend).toHaveBeenCalledWith(false);
  });

  it('calls setIncludeProgressionChart when include progression chart checkbox is toggled', () => {
    const props = defaultProps();
    render(<PdfExportModal {...props} />);
    fireEvent.click(screen.getByLabelText('Include progression chart'));
    expect(props.setIncludeProgressionChart).toHaveBeenCalledWith(true);
  });

  it('calls onExport when Generate PDF button is clicked', () => {
    const props = defaultProps();
    render(<PdfExportModal {...props} />);
    fireEvent.click(screen.getByRole('button', { name: 'Generate PDF' }));
    expect(props.onExport).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when Cancel button is clicked', () => {
    const props = defaultProps();
    render(<PdfExportModal {...props} />);
    fireEvent.click(screen.getByRole('button', { name: 'Cancel' }));
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });

  it('calls onClose when Escape key is pressed and not exporting', () => {
    const props = defaultProps();
    render(<PdfExportModal {...props} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });

  it('does not call onClose when Escape key is pressed while exporting', () => {
    const props = { ...defaultProps(), isExporting: true };
    render(<PdfExportModal {...props} />);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(props.onClose).not.toHaveBeenCalled();
  });

  it('disables both buttons while exporting', () => {
    const props = { ...defaultProps(), isExporting: true };
    render(<PdfExportModal {...props} />);
    expect(screen.getByRole('button', { name: 'Generate PDF' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeDisabled();
  });

  it('enables buttons when not exporting', () => {
    render(<PdfExportModal {...defaultProps()} />);
    expect(screen.getByRole('button', { name: 'Generate PDF' })).toBeEnabled();
    expect(screen.getByRole('button', { name: 'Cancel' })).toBeEnabled();
  });

  it('calls onClose when backdrop is clicked and not exporting', () => {
    const props = defaultProps();
    const { container } = render(<PdfExportModal {...props} />);
    const backdrop = container.querySelector('.modal-backdrop') as HTMLElement;
    fireEvent.click(backdrop);
    expect(props.onClose).toHaveBeenCalledTimes(1);
  });

  it('does not call onClose when modal panel content is clicked', () => {
    const props = defaultProps();
    render(<PdfExportModal {...props} />);
    fireEvent.click(screen.getByRole('dialog'));
    expect(props.onClose).not.toHaveBeenCalled();
  });

  it('traps Tab: moves focus from last element back to first', () => {
    render(<PdfExportModal {...defaultProps()} />);

    const dialog = screen.getByRole('dialog');
    const focusable = Array.from(
      dialog.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    );

    const first = focusable[0] as HTMLElement;
    const last = focusable[focusable.length - 1] as HTMLElement;

    last.focus();
    fireEvent.keyDown(document, { key: 'Tab' });
    expect(document.activeElement).toBe(first);
  });

  it('traps Shift+Tab: moves focus from first element back to last', () => {
    render(<PdfExportModal {...defaultProps()} />);

    const dialog = screen.getByRole('dialog');
    const focusable = Array.from(
      dialog.querySelectorAll<HTMLElement>(
        'button:not([disabled]), input:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])',
      ),
    );

    const first = focusable[0] as HTMLElement;
    const last = focusable[focusable.length - 1] as HTMLElement;

    first.focus();
    fireEvent.keyDown(document, { key: 'Tab', shiftKey: true });
    expect(document.activeElement).toBe(last);
  });
});
