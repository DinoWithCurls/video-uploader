import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import VideoFilters from '../components/video/VideoFilters';
import type { AdvancedFilters } from '../components/video/VideoFilters';

describe('VideoFilters', () => {
  const mockFilterChange = vi.fn();
  const mockClearAll = vi.fn();

  const defaultFilters: AdvancedFilters = {
    status: '',
    sensitivityStatus: '',
    search: '',
    dateFrom: null,
    dateTo: null,
    filesizeMin: null,
    filesizeMax: null,
    durationMin: null,
    durationMax: null,
    sortBy: 'createdAt',
    order: 'desc',
    page: 1,
    limit: 12
  };

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Basic Filters', () => {
    it('should render search input', () => {
      render(
        <VideoFilters
          filters={defaultFilters}
          onFilterChange={mockFilterChange}
          onClearAll={mockClearAll}
        />
      );

      expect(screen.getByPlaceholderText('Search videos...')).toBeInTheDocument();
    });

    it('should render all basic filter dropdowns', () => {
      render(
        <VideoFilters
          filters={defaultFilters}
          onFilterChange={mockFilterChange}
          onClearAll={mockClearAll}
        />
      );

      expect(screen.getByLabelText('Status')).toBeInTheDocument();
      expect(screen.getByLabelText('Sensitivity')).toBeInTheDocument();
      expect(screen.getByLabelText('Sort By')).toBeInTheDocument();
      expect(screen.getByLabelText('Order')).toBeInTheDocument();
    });

    it('should call onFilterChange when search input changes', () => {
      render(
        <VideoFilters
          filters={defaultFilters}
          onFilterChange={mockFilterChange}
          onClearAll={mockClearAll}
        />
      );

      const searchInput = screen.getByPlaceholderText('Search videos...');
      fireEvent.change(searchInput, { target: { value: 'test video' } });

      expect(mockFilterChange).toHaveBeenCalledWith('search', 'test video');
    });

    it('should call onFilterChange when status changes', () => {
      render(
        <VideoFilters
          filters={defaultFilters}
          onFilterChange={mockFilterChange}
          onClearAll={mockClearAll}
        />
      );

      const statusSelect = screen.getByLabelText('Status');
      fireEvent.change(statusSelect, { target: { value: 'completed' } });

      expect(mockFilterChange).toHaveBeenCalledWith('status', 'completed');
    });

    it('should display current filter values', () => {
      const filtersWithValues: AdvancedFilters = {
        ...defaultFilters,
        status: 'completed',
        search: 'my video',
        sortBy: 'filesize'
      };

      render(
        <VideoFilters
          filters={filtersWithValues}
          onFilterChange={mockFilterChange}
          onClearAll={mockClearAll}
        />
      );

      expect(screen.getByPlaceholderText('Search videos...')).toHaveValue('my video');
      expect(screen.getByLabelText('Status')).toHaveValue('completed');
      expect(screen.getByLabelText('Sort By')).toHaveValue('filesize');
    });
  });

  describe('Advanced Filters Toggle', () => {
    it('should show Advanced Filters button', () => {
      render(
        <VideoFilters
          filters={defaultFilters}
          onFilterChange={mockFilterChange}
          onClearAll={mockClearAll}
        />
      );

      expect(screen.getByText('Advanced Filters')).toBeInTheDocument();
    });

    it('should not show advanced filters panel by default', () => {
      render(
        <VideoFilters
          filters={defaultFilters}
          onFilterChange={mockFilterChange}
          onClearAll={mockClearAll}
        />
      );

      expect(screen.queryByText('Upload Date Range')).not.toBeInTheDocument();
    });

    it('should toggle advanced filters panel when button clicked', () => {
      render(
        <VideoFilters
          filters={defaultFilters}
          onFilterChange={mockFilterChange}
          onClearAll={mockClearAll}
        />
      );

      const advancedButton = screen.getByText('Advanced Filters');
      fireEvent.click(advancedButton);

      expect(screen.getByText('Upload Date Range')).toBeInTheDocument();
      expect(screen.getByText('File Size (MB)')).toBeInTheDocument();
      expect(screen.getByText('Duration (minutes)')).toBeInTheDocument();
    });
  });

  describe('Clear All Filters', () => {
    it('should not show Clear All button when no filters are active', () => {
      render(
        <VideoFilters
          filters={defaultFilters}
          onFilterChange={mockFilterChange}
          onClearAll={mockClearAll}
        />
      );

      expect(screen.queryByText('Clear All Filters')).not.toBeInTheDocument();
    });

    it('should show Clear All button when filters are active', () => {
      const filtersWithValues: AdvancedFilters = {
        ...defaultFilters,
        status: 'completed'
      };

      render(
        <VideoFilters
          filters={filtersWithValues}
          onFilterChange={mockFilterChange}
          onClearAll={mockClearAll}
        />
      );

      expect(screen.getByText('Clear All Filters')).toBeInTheDocument();
    });

    it('should call onClearAll when Clear All button clicked', () => {
      const filtersWithValues: AdvancedFilters = {
        ...defaultFilters,
        search: 'test'
      };

      render(
        <VideoFilters
          filters={filtersWithValues}
          onFilterChange={mockFilterChange}
          onClearAll={mockClearAll}
        />
      );

      const clearButton = screen.getByText('Clear All Filters');
      fireEvent.click(clearButton);

      expect(mockClearAll).toHaveBeenCalled();
    });
  });

  describe('Filter Chips', () => {
    it('should show filter chip for status', () => {
      const filtersWithValues: AdvancedFilters = {
        ...defaultFilters,
        status: 'completed'
      };

      render(
        <VideoFilters
          filters={filtersWithValues}
          onFilterChange={mockFilterChange}
          onClearAll={mockClearAll}
        />
      );

      expect(screen.getByText('Status: completed')).toBeInTheDocument();
    });

    it('should show filter chip for sensitivity', () => {
      const filtersWithValues: AdvancedFilters = {
        ...defaultFilters,
        sensitivityStatus: 'safe'
      };

      render(
        <VideoFilters
          filters={filtersWithValues}
          onFilterChange={mockFilterChange}
          onClearAll={mockClearAll}
        />
      );

      expect(screen.getByText('Sensitivity: safe')).toBeInTheDocument();
    });

    it('should show filter chip for search', () => {
      const filtersWithValues: AdvancedFilters = {
        ...defaultFilters,
        search: 'test video'
      };

      render(
        <VideoFilters
          filters={filtersWithValues}
          onFilterChange={mockFilterChange}
          onClearAll={mockClearAll}
        />
      );

      expect(screen.getByText('Search: "test video"')).toBeInTheDocument();
    });

    it('should show filter chip for date range', () => {
      const filtersWithValues: AdvancedFilters = {
        ...defaultFilters,
        dateFrom: '2025-01-01',
        dateTo: '2025-12-31'
      };

      render(
        <VideoFilters
          filters={filtersWithValues}
          onFilterChange={mockFilterChange}
          onClearAll={mockClearAll}
        />
      );

      expect(screen.getByText(/Date: 2025-01-01 to 2025-12-31/)).toBeInTheDocument();
    });

    it('should allow removing individual filters via chip', () => {
      const filtersWithValues: AdvancedFilters = {
        ...defaultFilters,
        status: 'completed'
      };

      render(
        <VideoFilters
          filters={filtersWithValues}
          onFilterChange={mockFilterChange}
          onClearAll={mockClearAll}
        />
      );

      const chipCloseButton = screen.getByText('Status: completed').nextSibling;
      if (chipCloseButton) {
        fireEvent.click(chipCloseButton as Element);
        expect(mockFilterChange).toHaveBeenCalledWith('status', '');
      }
    });
  });

  describe('Advanced Filter Badge', () => {
    it('should show badge count when advanced filters are active but panel is closed', () => {
      const filtersWithValues: AdvancedFilters = {
        ...defaultFilters,
        status: 'completed',
        sensitivityStatus: 'safe',
        filesizeMin: 10 * 1024 * 1024, // 10MB
        durationMin: 300 // 5 minutes
      };

      render(
        <VideoFilters
          filters={filtersWithValues}
          onFilterChange={mockFilterChange}
          onClearAll={mockClearAll}
        />
      );

      // Should show count 2 (filesize + duration, excluding status and sensitivity which are already shown)
      const advancedButton = screen.getByText('Advanced Filters');
      const badge = advancedButton.parentElement?.querySelector('.bg-blue-100');
      expect(badge?.textContent).toBe('2');
    });
  });

  describe('Integration with Range Filters', () => {
    it('should render range filters when advanced panel is open', () => {
      render(
        <VideoFilters
          filters={defaultFilters}
          onFilterChange={mockFilterChange}
          onClearAll={mockClearAll}
        />
      );

      // Open advanced filters
      fireEvent.click(screen.getByText('Advanced Filters'));

      // Verify all range filters are present
      expect(screen.getByText('Upload Date Range')).toBeInTheDocument();
      expect(screen.getByText('File Size (MB)')).toBeInTheDocument();
      expect(screen.getByText('Duration (minutes)')).toBeInTheDocument();
    });

it('should call onFilterChange when filesize range changes', () => {
      render(
        <VideoFilters
          filters={defaultFilters}
          onFilterChange={mockFilterChange}
          onClearAll={mockClearAll}
        />
      );

      // Open advanced filters
      fireEvent.click(screen.getByText('Advanced Filters'));

      // Find filesize inputs (they're the first pair after expanding)
      const inputs = screen.getAllByRole('spinbutton');
      
      // Change min filesize (first input)
      fireEvent.change(inputs[0], { target: { value: '10' } });

      // Should be called with bytes (10 MB = 10 * 1024 * 1024)
      expect(mockFilterChange).toHaveBeenCalledWith('filesizeMin', 10485760);
    });
  });
});
