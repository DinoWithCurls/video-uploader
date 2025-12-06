import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import RangeFilter from '../components/common/RangeFilter';

describe('RangeFilter', () => {
  const mockOnMinChange = vi.fn();
  const mockOnMaxChange = vi.fn();

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should render with label', () => {
    render(
      <RangeFilter
        label="File Size"
        minValue={null}
        maxValue={null}
        onMinChange={mockOnMinChange}
        onMaxChange={mockOnMaxChange}
      />
    );

    expect(screen.getByText('File Size')).toBeInTheDocument();
  });

  it('should render min and max input fields with placeholders', () => {
    render(
      <RangeFilter
        label="File Size"
        minValue={null}
        maxValue={null}
        onMinChange={mockOnMinChange}
        onMaxChange={mockOnMaxChange}
        placeholder={{ min: 'Minimum', max: 'Maximum' }}
      />
    );

    expect(screen.getByPlaceholderText('Minimum')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Maximum')).toBeInTheDocument();
  });

  it('should display current values', () => {
    render(
      <RangeFilter
        label="File Size"
        minValue={10}
        maxValue={100}
        onMinChange={mockOnMinChange}
        onMaxChange={mockOnMaxChange}
      />
    );

    const inputs = screen.getAllByRole('spinbutton');
    expect(inputs[0]).toHaveValue(10);
    expect(inputs[1]).toHaveValue(100);
  });

  it('should call onMinChange when min value changes', () => {
    render(
      <RangeFilter
        label="File Size"
        minValue={null}
        maxValue={null}
        onMinChange={mockOnMinChange}
        onMaxChange={mockOnMaxChange}
      />
    );

    const inputs = screen.getAllByRole('spinbutton');
    fireEvent.change(inputs[0], { target: { value: '50' } });

    expect(mockOnMinChange).toHaveBeenCalledWith(50);
  });

  it('should call onMaxChange when max value changes', () => {
    render(
      <RangeFilter
        label="File Size"
        minValue={null}
        maxValue={null}
        onMinChange={mockOnMinChange}
        onMaxChange={mockOnMaxChange}
      />
    );

    const inputs = screen.getAllByRole('spinbutton');
    fireEvent.change(inputs[1], { target: { value: '200' } });

    expect(mockOnMaxChange).toHaveBeenCalledWith(200);
  });

  it('should call with null when input is cleared', () => {
    render(
      <RangeFilter
        label="File Size"
        minValue={50}
        maxValue={100}
        onMinChange={mockOnMinChange}
        onMaxChange={mockOnMaxChange}
      />
    );

    const inputs = screen.getAllByRole('spinbutton');
    fireEvent.change(inputs[0], { target: { value: '' } });

    expect(mockOnMinChange).toHaveBeenCalledWith(null);
  });

  it('should use formatter to display values', () => {
    const formatter = (value: number) => (value / 1024).toFixed(2);

    render(
      <RangeFilter
        label="File Size"
        minValue={1024}
        maxValue={2048}
        onMinChange={mockOnMinChange}
        onMaxChange={mockOnMaxChange}
        formatter={formatter}
      />
    );

    const inputs = screen.getAllByRole('spinbutton');
    expect(inputs[0]).toHaveValue(1);
    expect(inputs[1]).toHaveValue(2);
  });

  it('should use parser when handling input', () => {
    const parser = (value: string) => parseFloat(value) * 1024;

    render(
      <RangeFilter
        label="File Size"
        minValue={null}
        maxValue={null}
        onMinChange={mockOnMinChange}
        onMaxChange={mockOnMaxChange}
        parser={parser}
      />
    );

    const inputs = screen.getAllByRole('spinbutton');
    fireEvent.change(inputs[0], { target: { value: '10' } });

    expect(mockOnMinChange).toHaveBeenCalledWith(10240);
  });

  it('should display unit when provided', () => {
    render(
      <RangeFilter
        label="File Size"
        minValue={null}
        maxValue={null}
        onMinChange={mockOnMinChange}
        onMaxChange={mockOnMaxChange}
        unit="MB"
      />
    );

    const units = screen.getAllByText('MB');
    expect(units).toHaveLength(2); // One for min, one for max
  });

  it('should handle decimal values', () => {
    render(
      <RangeFilter
        label="Duration"
        minValue={null}
        maxValue={null}
        onMinChange={mockOnMinChange}
        onMaxChange={mockOnMaxChange}
      />
    );

    const inputs = screen.getAllByRole('spinbutton');
    fireEvent.change(inputs[0], { target: { value: '10.5' } });

    expect(mockOnMinChange).toHaveBeenCalledWith(10.5);
  });
});
