/**
 * Frontend validation utilities
 */

/**
 * Validation error type
 */
export interface ValidationError {
  field: string;
  message: string;
}

/**
 * Validation result type
 */
export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

/**
 * Validators object containing all validation functions
 */
export const validators = {
  /**
   * Validate date range
   */
  isValidDateRange: (startDate: string | null, endDate: string | null): ValidationResult => {
    const errors: ValidationError[] = [];

    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);

      if (isNaN(start.getTime())) {
        errors.push({ field: 'dateFrom', message: 'Invalid start date format' });
      }
      if (isNaN(end.getTime())) {
        errors.push({ field: 'dateTo', message: 'Invalid end date format' });
      }

      if (errors.length === 0 && start > end) {
        errors.push({ field: 'dateTo', message: 'End date must be after start date' });
      }
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  },

  /**
   * Validate number range
   */
  isValidNumberRange: (
    min: number | null,
    max: number | null,
    fieldName: string = 'value'
  ): ValidationResult => {
    const errors: ValidationError[] = [];

    if (min !== null && min < 0) {
      errors.push({ field: `${fieldName}Min`, message: `Minimum ${fieldName} must be positive` });
    }

    if (max !== null && max < 0) {
      errors.push({ field: `${fieldName}Max`, message: `Maximum ${fieldName} must be positive` });
    }

    if (min !== null && max !== null && min > max) {
      errors.push({ 
        field: `${fieldName}Max`, 
        message: `Maximum ${fieldName} must be greater than or equal to minimum` 
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  },

  /**
   * Validate file size (in bytes)
   */
  isValidFileSize: (size: number, maxSize: number = 10 * 1024 * 1024 * 1024): ValidationResult => {
    const errors: ValidationError[] = [];

    if (size <= 0) {
      errors.push({ field: 'filesize', message: 'File size must be greater than 0' });
    }

    if (size > maxSize) {
      const maxSizeGB = (maxSize / (1024 * 1024 * 1024)).toFixed(2);
      errors.push({ field: 'filesize', message: `File size must not exceed ${maxSizeGB}GB` });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  },

  /**
   * Validate video file type
   */
  isValidVideoFile: (file: File): ValidationResult => {
    const errors: ValidationError[] = [];
    const validTypes = [
      'video/mp4',
      'video/webm',
      'video/ogg',
      'video/quicktime',
      'video/x-msvideo', // AVI
      'video/mpeg'
    ];

    if (!validTypes.includes(file.type)) {
      errors.push({
        field: 'video',
        message: 'Invalid file type. Supported formats: MP4, WebM, OGG, QuickTime, AVI, MPEG'
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  },

  /**
   * Validate email format
   */
  isValidEmail: (email: string): ValidationResult => {
    const errors: ValidationError[] = [];
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!emailRegex.test(email)) {
      errors.push({ field: 'email', message: 'Invalid email format' });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  },

  /**
   * Validate password strength
   */
  isValidPassword: (password: string): ValidationResult => {
    const errors: ValidationError[] = [];

    if (password.length < 6) {
      errors.push({ field: 'password', message: 'Password must be at least 6 characters long' });
    }

    if (password.length > 72) {
      errors.push({ field: 'password', message: 'Password must not exceed 72 characters' });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  },

  /**
   * Validate string length
   */
  isValidStringLength: (
    value: string,
    fieldName: string,
    minLength: number = 1,
    maxLength: number = 255
  ): ValidationResult => {
    const errors: ValidationError[] = [];
    const trimmed = value.trim();

    if (trimmed.length < minLength) {
      errors.push({ 
        field: fieldName, 
        message: `${fieldName} must be at least ${minLength} character${minLength > 1 ? 's' : ''} long` 
      });
    }

    if (trimmed.length > maxLength) {
      errors.push({ 
        field: fieldName, 
        message: `${fieldName} must not exceed ${maxLength} characters` 
      });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  },

  /**
   * Validate required field
   */
  isRequired: (value: any, fieldName: string): ValidationResult => {
    const errors: ValidationError[] = [];

    if (value === null || value === undefined || value === '') {
      errors.push({ field: fieldName, message: `${fieldName} is required` });
    }

    return {
      isValid: errors.length === 0,
      errors
    };
  }
};

/**
 * Combine multiple validation results
 */
export const combineValidationResults = (...results: ValidationResult[]): ValidationResult => {
  const allErrors = results.flatMap(r => r.errors);
  
  return {
    isValid: allErrors.length === 0,
    errors: allErrors
  };
};

/**
 * Format validation errors for display
 */
export const formatValidationErrors = (errors: ValidationError[]): Record<string, string> => {
  return errors.reduce((acc, error) => {
    acc[error.field] = error.message;
    return acc;
  }, {} as Record<string, string>);
};

/**
 * Sanitize HTML to prevent XSS
 */
export const sanitizeHTML = (input: string): string => {
  return input
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    .replace(/\//g, '&#x2F;');
};

/**
 * Format filesize for display
 */
export const formatFileSize = (bytes: number): string => {
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
};

/**
 * Format duration for display
 */
export const formatDuration = (seconds: number): string => {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  const parts: string[] = [];
  if (hours > 0) parts.push(`${hours}h`);
  if (minutes > 0) parts.push(`${minutes}m`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

  return parts.join(' ');
};
