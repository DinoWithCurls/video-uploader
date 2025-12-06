import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import DateRangePicker from '../components/common/DateRangePicker';

describe('DateRangePicker', () => {
  const mockOnStartDateChange = vi.fn();
  const mockOnEndDateChange = vi.fn();

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should render with label', () => {
    render(
      <DateRangePicker
        label="Upload Date"
        startDate={null}
        endDate={null}
        onStartDateChange={mockOnStartDateChange}
        onEndDateChange={mockOnEndDateChange}
      />
    );

    expect(screen.getByText('Upload Date')).toBeInTheDocument();
  });

  it('should render two date inputs', () => {
    const { container } = render(
      <DateRangePicker
        label="Upload Date"
        startDate={null}
        endDate={null}
        onStartDateChange={mockOnStartDateChange}
        onEndDateChange={mockOnEndDateChange}
      />
    );

    const dateInputs = container.querySelectorAll('input[type="date"]');
    expect(dateInputs).toHaveLength(2);
  });

  it('should display current date values', () => {
    const { container } = render(
      <DateRangePicker
        label="Upload Date"
        startDate="2025-01-01"
        endDate="2025-12-31"
        onStartDateChange={mockOnStartDateChange}
        onEndDateChange={mockOnEndDateChange}
      />
    );

    const dateInputs = container.querySelectorAll('input[type="date"]');
    expect(dateInputs[0]).toHaveValue('2025-01-01');
    expect(dateInputs[1]).toHaveValue('2025-12-31');
  });

  it('should call onStartDateChange when start date changes', () => {
    const { container } = render(
      <DateRangePicker
        label="Upload Date"
        startDate={null}
        endDate={null}
        onStartDateChange={mockOnStartDateChange}
        onEndDateChange={mockOnEndDateChange}
      />
    );

    const dateInputs = container.querySelectorAll('input[type="date"]');
    fireEvent.change(dateInputs[0], { target: { value: '2025-01-15' } });

    expect(mockOnStartDateChange).toHaveBeenCalledWith('2025-01-15');
  });

  it('should call onEndDateChange when end date changes', () => {
    const { container } = render(
      <DateRangePicker
        label="Upload Date"
        startDate={null}
        endDate={null}
        onStartDateChange={mockOnStartDateChange}
        onEndDateChange={mockOnEndDateChange}
      />
    );

    const dateInputs = container.querySelectorAll('input[type="date"]');
    fireEvent.change(dateInputs[1], { target: { value: '2025-12-31' } });

    expect(mockOnEndDateChange).toHaveBeenCalledWith('2025-12-31');
  });

  it('should call with null when date input is cleared', () => {
    const { container } = render(
      <DateRangePicker
        label="Upload Date"
        startDate="2025-01-01"
        endDate="2025-12-31"
        onStartDateChange={mockOnStartDateChange}
        onEndDateChange={mockOnEndDateChange}
      />
    );

    const dateInputs = container.querySelectorAll('input[type="date"]');
    fireEvent.change(dateInputs[0], { target: { value: '' } });

    expect(mockOnStartDateChange).toHaveBeenCalledWith(null);
  });

  it('should set max constraint on start date based on end date', () => {
    const { container } = render(
      <DateRangePicker
        label="Upload Date"
        startDate={null}
        endDate="2025-12-31"
        onStartDateChange={mockOnStartDateChange}
        onEndDateChange={mockOnEndDateChange}
      />
    );

    const dateInputs = container.querySelectorAll('input[type="date"]');
    expect(dateInputs[0]).toHaveAttribute('max', '2025-12-31');
  });

  it('should set min constraint on end date based on start date', () => {
    const { container } = render(
      <DateRangePicker
        label="Upload Date"
        startDate="2025-01-01"
        endDate={null}
        onStartDateChange={mockOnStartDateChange}
        onEndDateChange={mockOnEndDateChange}
      />
    );

    const dateInputs = container.querySelectorAll('input[type="date"]');
    expect(dateInputs[1]).toHaveAttribute('min', '2025-01-01');
  });

  it('should display "to" separator between inputs', () => {
    render(
      <DateRangePicker
        label="Upload Date"
        startDate={null}
        endDate={null}
        onStartDateChange={mockOnStartDateChange}
        onEndDateChange={mockOnEndDateChange}
      />
    );

    expect(screen.getByText('to')).toBeInTheDocument();
  });

  it('should handle both dates being set', () => {
    const { container } = render(
      <DateRangePicker
        label="Upload Date"
        startDate="2025-01-01"
        endDate="2025-12-31"
        onStartDateChange={mockOnStartDateChange}
        onEndDateChange={mockOnEndDateChange}
      />
    );

    const dateInputs = container.querySelectorAll('input[type="date"]');
    expect(dateInputs[0]).toHaveValue('2025-01-01');
    expect(dateInputs[1]).toHaveValue('2025-12-31');
    expect(dateInputs[0]).toHaveAttribute('max', '2025-12-31');
    expect(dateInputs[1]).toHaveAttribute('min', '2025-01-01');
  });
});
