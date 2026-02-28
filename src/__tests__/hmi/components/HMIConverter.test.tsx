import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import HMIConverter from '@/components/hmi/HMIConverter';

// Mock the dynamic imports used by exporters
vi.mock('jspdf', () => ({
  jsPDF: vi.fn().mockImplementation(() => ({
    setFontSize: vi.fn(),
    text: vi.fn(),
    addPage: vi.fn(),
    addImage: vi.fn(),
    internal: { pageSize: { getWidth: () => 800, getHeight: () => 600 } },
    output: vi.fn().mockReturnValue(new Blob()),
  })),
}));

describe('HMIConverter', () => {
  it('renders the main heading', () => {
    render(<HMIConverter />);
    expect(screen.getByText('HMI Insight')).toBeInTheDocument();
  });

  it('renders the file upload area', () => {
    render(<HMIConverter />);
    expect(screen.getAllByText(/drag.*drop|browse|upload/i).length).toBeGreaterThan(0);
  });

  it('renders conversion type selector', () => {
    render(<HMIConverter />);
    expect(screen.getByText(/render/i)).toBeInTheDocument();
  });

  it('renders the execute/convert button', () => {
    render(<HMIConverter />);
    const button = screen.getByRole('button', { name: /convert|execute/i });
    expect(button).toBeInTheDocument();
  });

  it('shows settings panel', () => {
    render(<HMIConverter />);
    expect(screen.getByText(/settings/i)).toBeInTheDocument();
  });

  it('disables convert button when no files are loaded', () => {
    render(<HMIConverter />);
    const button = screen.getByRole('button', { name: /convert|execute/i });
    expect(button).toBeDisabled();
  });
});
