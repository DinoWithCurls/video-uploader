import { describe, it, expect } from 'vitest';
import {
  validators,
  combineValidationResults,
  formatValidationErrors,
  sanitizeHTML,
  formatFileSize,
  formatDuration
} from '../utils/validation';

describe('Frontend Validation Utilities', () => {
  describe('Date Range Validation', () => {
    it('should validate correct date range', () => {
      const result = validators.isValidDateRange('2025-01-01', '2025-12-31');
      expect(result.isValid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should reject end date before start date', () => {
      const result = validators.isValidDateRange('2025-12-31', '2025-01-01');
      expect(result.isValid).toBe(false);
      expect(result.errors[0].message).toContain('after start date');
    });

    it('should reject invalid date format', () => {
      const result = validators.isValidDateRange('invalid-date', '2025-12-31');
      expect(result.isValid).toBe(false);
      expect(result.errors[0].field).toBe('dateFrom');
    });

    it('should allow null values', () => {
      const result = validators.isValidDateRange(null, null);
      expect(result.isValid).toBe(true);
    });
  });

  describe('Number Range Validation', () => {
    it('should validate correct number range', () => {
      const result = validators.isValidNumberRange(100, 500, 'filesize');
      expect(result.isValid).toBe(true);
    });

    it('should reject negative numbers', () => {
      const result = validators.isValidNumberRange(-10, 100, 'filesize');
      expect(result.isValid).toBe(false);
      expect(result.errors[0].message).toContain('positive');
    });

    it('should reject max less than min', () => {
      const result = validators.isValidNumberRange(500, 100, 'filesize');
      expect(result.isValid).toBe(false);
      expect(result.errors[0].message).toContain('greater than or equal');
    });

    it('should allow null values', () => {
      const result = validators.isValidNumberRange(null, null, 'duration');
      expect(result.isValid).toBe(true);
    });
  });

  describe('File Size Validation', () => {
    it('should validate correct file size', () => {
      const result = validators.isValidFileSize(10 * 1024 * 1024); // 10MB
      expect(result.isValid).toBe(true);
    });

    it('should reject zero file size', () => {
      const result = validators.isValidFileSize(0);
      expect(result.isValid).toBe(false);
      expect(result.errors[0].message).toContain('greater than 0');
    });

    it('should reject file size exceeding limit', () => {
      const result = validators.isValidFileSize(11 * 1024 * 1024 * 1024, 10 * 1024 * 1024 * 1024); // 11GB when max is 10GB
      expect(result.isValid).toBe(false);
      expect(result.errors[0].message).toContain('exceed');
    });
  });

  describe('Video File Type Validation', () => {
    it('should accept MP4 file', () => {
      const file = new File(['test'], 'test.mp4', { type: 'video/mp4' });
      const result = validators.isValidVideoFile(file);
      expect(result.isValid).toBe(true);
    });

    it('should accept WebM file', () => {
      const file = new File(['test'], 'test.webm', { type: 'video/webm' });
      const result = validators.isValidVideoFile(file);
      expect(result.isValid).toBe(true);
    });

    it('should reject non-video file', () => {
      const file = new File(['test'], 'test.pdf', { type: 'application/pdf' });
      const result = validators.isValidVideoFile(file);
      expect(result.isValid).toBe(false);
      expect(result.errors[0].message).toContain('Invalid file type');
    });
  });

  describe('Email Validation', () => {
    it('should validate correct email', () => {
      const result = validators.isValidEmail('user@example.com');
      expect(result.isValid).toBe(true);
    });

    it('should reject invalid email format', () => {
      const result = validators.isValidEmail('invalid-email');
      expect(result.isValid).toBe(false);
      expect(result.errors[0].message).toContain('Invalid email format');
    });

    it('should reject email without domain', () => {
      const result = validators.isValidEmail('user@');
      expect(result.isValid).toBe(false);
    });
  });

  describe('Password Validation', () => {
    it('should validate correct password', () => {
      const result = validators.isValidPassword('password123');
      expect(result.isValid).toBe(true);
    });

    it('should reject short password', () => {
      const result = validators.isValidPassword('12345');
      expect(result.isValid).toBe(false);
      expect(result.errors[0].message).toContain('at least 6 characters');
    });

    it('should reject extremely long password', () => {
      const longPassword = 'a'.repeat(73);
      const result = validators.isValidPassword(longPassword);
      expect(result.isValid).toBe(false);
      expect(result.errors[0].message).toContain('72 characters');
    });
  });

  describe('String Length Validation', () => {
    it('should validate correct string length', () => {
      const result = validators.isValidStringLength('Test Title', 'title', 1, 200);
      expect(result.isValid).toBe(true);
    });

    it('should reject string too short', () => {
      const result = validators.isValidStringLength('', 'title', 1, 200);
      expect(result.isValid).toBe(false);
      expect(result.errors[0].message).toContain('at least 1 character');
    });

    it('should reject string too long', () => {
      const longString = 'a'.repeat(201);
      const result = validators.isValidStringLength(longString, 'title', 1, 200);
      expect(result.isValid).toBe(false);
      expect(result.errors[0].message).toContain('200 characters');
    });

    it('should trim whitespace before checking', () => {
      const result = validators.isValidStringLength('  Test  ', 'title', 3, 200);
      expect(result.isValid).toBe(true);
    });
  });

  describe('Required Field Validation', () => {
    it('should validate non-empty value', () => {
      const result = validators.isRequired('test', 'field');
      expect(result.isValid).toBe(true);
    });

    it('should reject null value', () => {
      const result = validators.isRequired(null, 'field');
      expect(result.isValid).toBe(false);
      expect(result.errors[0].message).toContain('is required');
    });

    it('should reject empty string', () => {
      const result = validators.isRequired('', 'field');
      expect(result.isValid).toBe(false);
    });
  });

  describe('Combine Validation Results', () => {
    it('should combine multiple passing results', () => {
      const result1 = validators.isValidEmail('test@example.com');
      const result2 = validators.isValidPassword('password123');
      const combined = combineValidationResults(result1, result2);

      expect(combined.isValid).toBe(true);
      expect(combined.errors).toHaveLength(0);
    });

    it('should combine results with errors', () => {
      const result1 = validators.isValidEmail('invalid');
      const result2 = validators.isValidPassword('123');
      const combined = combineValidationResults(result1, result2);

      expect(combined.isValid).toBe(false);
      expect(combined.errors).toHaveLength(2);
    });
  });

  describe('Format Validation Errors', () => {
    it('should format errors as key-value pairs', () => {
      const errors = [
        { field: 'email', message: 'Invalid email' },
        { field: 'password', message: 'Too short' }
      ];
      const formatted = formatValidationErrors(errors);

      expect(formatted.email).toBe('Invalid email');
      expect(formatted.password).toBe('Too short');
    });
  });

  describe('Sanitize HTML', () => {
    it('should sanitize HTML tags', () => {
      const result = sanitizeHTML('<script>alert("xss")</script>');
      expect(result).not.toContain('<script>');
      expect(result).toContain('&lt;script&gt;');
    });

    it('should sanitize quotes', () => {
      const result = sanitizeHTML('He said "hello"');
      expect(result).toContain('&quot;');
    });

    it('should sanitize special characters', () => {
      const result = sanitizeHTML("<div>Test & 'quote'</div>");
      expect(result).toContain('&lt;div&gt;');
      expect(result).toContain('&amp;');
      expect(result).toContain('&#x27;');
    });
  });

  describe('Format File Size', () => {
    it('should format bytes', () => {
      expect(formatFileSize(500)).toBe('500 Bytes');
    });

    it('should format kilobytes', () => {
      expect(formatFileSize(1024)).toBe('1 KB');
    });

    it('should format megabytes', () => {
      expect(formatFileSize(1048576)).toBe('1 MB');
    });

    it('should format gigabytes', () => {
      expect(formatFileSize(1073741824)).toBe('1 GB');
    });

    it('should handle zero', () => {
      expect(formatFileSize(0)).toBe('0 Bytes');
    });
  });

  describe('Format Duration', () => {
    it('should format seconds', () => {
      expect(formatDuration(45)).toBe('45s');
    });

    it('should format minutes', () => {
      expect(formatDuration(90)).toBe('1m 30s');
    });

    it('should format hours', () => {
      expect(formatDuration(3665)).toBe('1h 1m 5s');
    });

    it('should handle zero', () => {
      expect(formatDuration(0)).toBe('0s');
    });
  });
});
