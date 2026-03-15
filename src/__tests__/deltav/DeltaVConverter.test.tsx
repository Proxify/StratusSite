import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import DeltaVConverter from '@/components/deltav/DeltaVConverter';

describe('DeltaVConverter', () => {
  it('renders the main heading', () => {
    render(<DeltaVConverter />);
    expect(screen.getByText('DeltaV Render')).toBeInTheDocument();
  });

  it('renders display file upload area with .di.ahc label', () => {
    render(<DeltaVConverter />);
    expect(screen.getAllByText(/\.di\.ahc/).length).toBeGreaterThan(0);
  });

  it('renders gem library upload area with .gc.ahc label', () => {
    render(<DeltaVConverter />);
    expect(screen.getAllByText(/\.gc\.ahc/).length).toBeGreaterThan(0);
  });

  it('renders the convert button', () => {
    render(<DeltaVConverter />);
    const button = screen.getByRole('button', { name: /convert/i });
    expect(button).toBeInTheDocument();
  });

  it('disables convert button when no display files are loaded', () => {
    render(<DeltaVConverter />);
    const button = screen.getByRole('button', { name: /convert/i });
    expect(button).toBeDisabled();
  });

  it('shows settings panel when toggled', () => {
    render(<DeltaVConverter />);
    const settingsToggle = screen.getByText('Settings');
    fireEvent.click(settingsToggle);
    expect(screen.getByText(/conversion type/i)).toBeInTheDocument();
  });

  it('shows conversion type options in settings', () => {
    render(<DeltaVConverter />);
    fireEvent.click(screen.getByText('Settings'));
    expect(screen.getByText('RENDER')).toBeInTheDocument();
    expect(screen.getByText('RADDICAL')).toBeInTheDocument();
    expect(screen.getByText('PROCESS_BOOK')).toBeInTheDocument();
  });

  it('shows color theme options in settings', () => {
    render(<DeltaVConverter />);
    fireEvent.click(screen.getByText('Settings'));
    expect(screen.getByText('DEFAULT')).toBeInTheDocument();
    expect(screen.getByText('DG')).toBeInTheDocument();
    expect(screen.getByText('MOT')).toBeInTheDocument();
  });
});
