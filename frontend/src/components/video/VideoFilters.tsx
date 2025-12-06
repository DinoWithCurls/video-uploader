import React, { useState } from 'react';
import RangeFilter from '../common/RangeFilter';
import DateRangePicker from '../common/DateRangePicker';

export interface AdvancedFilters {
  status: string;
  sensitivityStatus: string;
  search: string;
  dateFrom: string | null;
  dateTo: string | null;
  filesizeMin: number | null;
  filesizeMax: number | null;
  durationMin: number | null;
  durationMax: number | null;
  sortBy: string;
  order: 'asc' | 'desc';
  page: number;
  limit: number;
}

interface VideoFiltersProps {
  filters: AdvancedFilters;
  onFilterChange: (key: keyof AdvancedFilters, value: any) => void;
  onClearAll: () => void;
}

const VideoFilters: React.FC<VideoFiltersProps> = ({
  filters,
  onFilterChange,
  onClearAll
}) => {
  const [showAdvanced, setShowAdvanced] = useState(false);

  // Format filesize (bytes to MB)
  const formatFilesize = (bytes: number) => {
    return (bytes / (1024 * 1024)).toFixed(0);
  };

  // Parse filesize (MB to bytes)
  const parseFilesize = (mb: string) => {
    return parseFloat(mb) * 1024 * 1024;
  };

  // Format duration (seconds to minutes)
  const formatDuration = (seconds: number) => {
    return (seconds / 60).toFixed(0);
  };

  // Parse duration (minutes to seconds)
  const parseDuration = (minutes: string) => {
    return parseFloat(minutes) * 60;
  };

  const hasActiveFilters = () => {
    return filters.status ||
      filters.sensitivityStatus ||
      filters.search ||
      filters.dateFrom ||
      filters.dateTo ||
      filters.filesizeMin ||
      filters.filesizeMax ||
      filters.durationMin ||
      filters.durationMax;
  };

  const getActiveFilterCount = () => {
    let count = 0;
    if (filters.status) count++;
    if (filters.sensitivityStatus) count++;
    if (filters.search) count++;
    if (filters.dateFrom || filters.dateTo) count++;
    if (filters.filesizeMin || filters.filesizeMax) count++;
    if (filters.durationMin || filters.durationMax) count++;
    return count;
  };

  return (
    <div className="bg-white p-4 rounded-lg shadow space-y-4">
      {/* Search */}
      <div>
        <input
          type="text"
          placeholder="Search videos..."
          value={filters.search}
          onChange={(e) => onFilterChange('search', e.target.value)}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
        />
      </div>

      {/* Basic Filters Row */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {/* Status Filter */}
        <div>
          <label htmlFor="status-filter" className="block text-sm font-medium mb-1">
            Status
          </label>
          <select
            id="status-filter"
            value={filters.status}
            onChange={(e) => onFilterChange('status', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All</option>
            <option value="pending">Pending</option>
            <option value="uploading">Uploading</option>
            <option value="processing">Processing</option>
            <option value="completed">Completed</option>
            <option value="failed">Failed</option>
          </select>
        </div>

        {/* Sensitivity Filter */}
        <div>
          <label htmlFor="sensitivity-filter" className="block text-sm font-medium mb-1">
            Sensitivity
          </label>
          <select
            id="sensitivity-filter"
            value={filters.sensitivityStatus}
            onChange={(e) => onFilterChange('sensitivityStatus', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">All</option>
            <option value="safe">Safe</option>
            <option value="flagged">Flagged</option>
            <option value="pending">Pending</option>
          </select>
        </div>

        {/* Sort By */}
        <div>
          <label htmlFor="sort-by-filter" className="block text-sm font-medium mb-1">
            Sort By
          </label>
          <select
            id="sort-by-filter"
            value={filters.sortBy}
            onChange={(e) => onFilterChange('sortBy', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="createdAt">Upload Date</option>
            <option value="title">Title</option>
            <option value="filesize">File Size</option>
            <option value="duration">Duration</option>
          </select>
        </div>

        {/* Order */}
        <div>
          <label htmlFor="order-filter" className="block text-sm font-medium mb-1">
            Order
          </label>
          <select
            id="order-filter"
            value={filters.order}
            onChange={(e) => onFilterChange('order', e.target.value as 'asc' | 'desc')}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="desc">Descending</option>
            <option value="asc">Ascending</option>
          </select>
        </div>
      </div>

      {/* Advanced Filters Toggle */}
      <div className="flex items-center justify-between border-t pt-3">
        <button
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="flex items-center gap-2 text-blue-600 hover:text-blue-700 font-medium"
        >
          <span>{showAdvanced ? '▼' : '▶'}</span>
          <span>Advanced Filters</span>
          {!showAdvanced && getActiveFilterCount() > 2 && (
            <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs">
              {getActiveFilterCount() - 2}
            </span>
          )}
        </button>

        {hasActiveFilters() && (
          <button
            onClick={onClearAll}
            className="text-sm text-gray-600 hover:text-gray-800 underline"
          >
            Clear All Filters
          </button>
        )}
      </div>

      {/* Advanced Filters Panel */}
      {showAdvanced && (
        <div className="bg-gray-50 p-4 rounded-lg space-y-4 border border-gray-200">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Date Range */}
            <DateRangePicker
              label="Upload Date Range"
              startDate={filters.dateFrom}
              endDate={filters.dateTo}
              onStartDateChange={(date) => onFilterChange('dateFrom', date)}
              onEndDateChange={(date) => onFilterChange('dateTo', date)}
            />

            {/* Filesize Range */}
            <RangeFilter
              label="File Size (MB)"
              minValue={filters.filesizeMin}
              maxValue={filters.filesizeMax}
              onMinChange={(value) => onFilterChange('filesizeMin', value)}
              onMaxChange={(value) => onFilterChange('filesizeMax', value)}
              placeholder={{ min: '0', max: '1000' }}
              formatter={formatFilesize}
              parser={parseFilesize}
              unit="MB"
            />
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Duration Range */}
            <RangeFilter
              label="Duration (minutes)"
              minValue={filters.durationMin}
              maxValue={filters.durationMax}
              onMinChange={(value) => onFilterChange('durationMin', value)}
              onMaxChange={(value) => onFilterChange('durationMax', value)}
              placeholder={{ min: '0', max: '180' }}
              formatter={formatDuration}
              parser={parseDuration}
              unit="min"
            />
          </div>
        </div>
      )}

      {/* Active Filters Chips */}
      {hasActiveFilters() && (
        <div className="flex flex-wrap gap-2">
          {filters.status && (
            <span className="inline-flex items-center gap-1 bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-sm">
              Status: {filters.status}
              <button
                onClick={() => onFilterChange('status', '')}
                className="hover:text-blue-900"
              >
                ✕
              </button>
            </span>
          )}
          {filters.sensitivityStatus && (
            <span className="inline-flex items-center gap-1 bg-purple-100 text-purple-700 px-3 py-1 rounded-full text-sm">
              Sensitivity: {filters.sensitivityStatus}
              <button
                onClick={() => onFilterChange('sensitivityStatus', '')}
                className="hover:text-purple-900"
              >
                ✕
              </button>
            </span>
          )}
          {filters.search && (
            <span className="inline-flex items-center gap-1 bg-green-100 text-green-700 px-3 py-1 rounded-full text-sm">
              Search: "{filters.search}"
              <button
                onClick={() => onFilterChange('search', '')}
                className="hover:text-green-900"
              >
                ✕
              </button>
            </span>
          )}
          {(filters.dateFrom || filters.dateTo) && (
            <span className="inline-flex items-center gap-1 bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-sm">
              Date: {filters.dateFrom || '...'} to {filters.dateTo || '...'}
              <button
                onClick={() => {
                  onFilterChange('dateFrom', null);
                  onFilterChange('dateTo', null);
                }}
                className="hover:text-yellow-900"
              >
                ✕
              </button>
            </span>
          )}
          {(filters.filesizeMin || filters.filesizeMax) && (
            <span className="inline-flex items-center gap-1 bg-pink-100 text-pink-700 px-3 py-1 rounded-full text-sm">
              Size: {filters.filesizeMin ? formatFilesize(filters.filesizeMin) : '0'}-
              {filters.filesizeMax ? formatFilesize(filters.filesizeMax) : '∞'} MB
              <button
                onClick={() => {
                  onFilterChange('filesizeMin', null);
                  onFilterChange('filesizeMax', null);
                }}
                className="hover:text-pink-900"
              >
                ✕
              </button>
            </span>
          )}
          {(filters.durationMin || filters.durationMax) && (
            <span className="inline-flex items-center gap-1 bg-indigo-100 text-indigo-700 px-3 py-1 rounded-full text-sm">
              Duration: {filters.durationMin ? formatDuration(filters.durationMin) : '0'}-
              {filters.durationMax ? formatDuration(filters.durationMax) : '∞'} min
              <button
                onClick={() => {
                  onFilterChange('durationMin', null);
                  onFilterChange('durationMax', null);
                }}
                className="hover:text-indigo-900"
              >
                ✕
              </button>
            </span>
          )}
        </div>
      )}
    </div>
  );
};

export default VideoFilters;
