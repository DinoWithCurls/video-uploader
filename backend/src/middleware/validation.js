/**
 * Validation middleware using Joi schemas
 */

/**
 * Validate request body against a Joi schema
 */
export const validateBody = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.body, { abortEarly: false });
    
    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message.replace(/"/g, ''),
        type: detail.type
      }));
      
      return res.status(400).json({
        message: 'Validation error',
        errors
      });
    }
    
    // Replace body with validated and sanitized value
    req.body = value;
    next();
  };
};

/**
 * Validate query parameters against a Joi schema
 */
export const validateQuery = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.query, { abortEarly: false });
    
    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message.replace(/"/g, ''),
        type: detail.type
      }));
      
      return res.status(400).json({
        message: 'Invalid query parameters',
        errors
      });
    }
    
    // Merge validated values back into req.query instead of replacing
    // (req.query might be read-only in some environments)
    Object.keys(value).forEach(key => {
      req.query[key] = value[key];
    });
    
    next();
  };
};

/**
 * Validate route parameters against a Joi schema
 */
export const validateParams = (schema) => {
  return (req, res, next) => {
    const { error, value } = schema.validate(req.params, { abortEarly: false });
    
    if (error) {
      const errors = error.details.map(detail => ({
        field: detail.path.join('.'),
        message: detail.message.replace(/"/g, ''),
        type: detail.type
      }));
      
      return res.status(400).json({
        message: 'Invalid route parameters',
        errors
      });
    }
    
    req.params = value;
    next();
  };
};

/**
 * Sanitize user input to prevent XSS attacks
 */
export const sanitizeInput = (req, res, next) => {
  // Function to recursively sanitize strings in objects
  const sanitize = (obj) => {
    if (typeof obj === 'string') {
      // Replace potentially dangerous HTML characters
      return obj
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;')
        .replace(/'/g, '&#x27;')
        .replace(/\//g, '&#x2F;');
    }
    
    if (Array.isArray(obj)) {
      return obj.map(sanitize);
    }
    
    if (obj && typeof obj === 'object') {
      const sanitized = {};
      for (const [key, value] of Object.entries(obj)) {
        sanitized[key] = sanitize(value);
      }
      return sanitized;
    }
    
    return obj;
  };
  
  // Only sanitize body for safety (query and params handled by Joi)
  if (req.body &&typeof req.body === 'object') {
    req.body = sanitize(req.body);
  }
  
  next();
};
