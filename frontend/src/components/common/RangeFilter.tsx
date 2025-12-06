import React from 'react';

interface RangeFilterProps {
  label: string;
  minValue: number | null;
  maxValue: number | null;
  onMinChange: (value: number | null) => void;
  onMaxChange: (value: number | null) => void;
  placeholder?: {
    min?: string;
    max?: string;
  };
  formatter?: (value: number) => string;
  parser?: (value: string) => number;
  unit?: string;
}

const RangeFilter: React.FC<RangeFilterProps> = ({
  label,
  minValue,
  maxValue,
  onMinChange,
  onMaxChange,
  placeholder = {},
  formatter,
  parser,
  unit
}) => {
  const handleMinChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '') {
      onMinChange(null);
    } else {
      onMinChange(parser ? parser(value) : parseFloat(value));
    }
  };

  const handleMaxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    if (value === '') {
      onMaxChange(null);
    } else {
      onMaxChange(parser ? parser(value) : parseFloat(value));
    }
  };

  const displayValue = (val: number | null) => {
    if (val === null) return '';
    return formatter ? formatter(val) : val.toString();
  };

  return (
    <div className="space-y-2">
      <label className="block text-sm font-medium text-gray-700">
        {label}
      </label>
      <div className="flex items-center gap-2">
        <div className="flex-1">
          <div className="relative">
            <input
              type="number"
              value={displayValue(minValue)}
              onChange={handleMinChange}
              placeholder={placeholder.min || 'Min'}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            {unit && (
              <span className="absolute right-3 top-2.5 text-sm text-gray-500">
                {unit}
              </span>
            )}
          </div>
        </div>
        <span className="text-gray-500">—</span>
        <div className="flex-1">
          <div className="relative">
            <input
              type="number"
              value={displayValue(maxValue)}
              onChange={handleMaxChange}
              placeholder={placeholder.max || 'Max'}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            {unit && (
              <span className="absolute right-3 top-2.5 text-sm text-gray-500">
                {unit}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default RangeFilter;
