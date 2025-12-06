import Joi from 'joi';

/**
 * Video filter query validation schema
 */
export const videoFiltersSchema = Joi.object({
  status: Joi.string().valid('pending', 'uploading', 'processing', 'completed', 'failed', '').optional(),
  sensitivityStatus: Joi.string().valid('safe', 'flagged', 'pending', '').optional(),
  search: Joi.string().max(200).trim().optional().empty(''),
  
  // Date range validation - empty strings converted to undefined
  dateFrom: Joi.date().iso().min('1900-01-01').max('2100-12-31').optional().empty(''),
  dateTo: Joi.date().iso().min('1900-01-01').max('2100-12-31').optional().empty('')
    .when('dateFrom', {
      is: Joi.date().required(),
      then: Joi.date().min(Joi.ref('dateFrom')).messages({
        'date.min': 'dateTo must be greater than or equal to dateFrom'
      })
    }),
  
  // Filesize range validation (in bytes) - empty strings converted to undefined
  filesizeMin: Joi.number().integer().min(0).max(10737418240).optional().empty(''), // 10GB max
  filesizeMax: Joi.number().integer().min(0).max(10737418240).optional().empty('')
    .when('filesizeMin', {
      is: Joi.number().required(),
      then: Joi.number().min(Joi.ref('filesizeMin')).messages({
        'number.min': 'filesizeMax must be greater than or equal to filesizeMin'
      })
    }),
  
  // Duration range validation (in seconds) - empty strings converted to undefined
  durationMin: Joi.number().integer().min(0).max(86400).optional().empty(''), // 24 hours max
  durationMax: Joi.number().integer().min(0).max(86400).optional().empty('')
    .when('durationMin', {
      is: Joi.number().required(),
      then: Joi.number().min(Joi.ref('durationMin')).messages({
        'number.min': 'durationMax must be greater than or equal to durationMin'
      })
    }),
  
  // Sorting and pagination - with defaults
  sortBy: Joi.string().valid('createdAt', 'title', 'filesize', 'duration', 'updatedAt').empty('').default('createdAt'),
  order: Joi.string().valid('asc', 'desc').empty('').default('desc'),
  page: Joi.number().integer().min(1).max(10000).empty('').default(1),
  limit: Joi.number().integer().min(1).max(100).empty('').default(20)
}).options({ stripUnknown: true });

/**
 * User registration validation schema
 */
export const registerSchema = Joi.object({
  name: Joi.string().min(1).max(100).trim().required(),
  email: Joi.string().email().lowercase().trim().required(),
  password: Joi.string().min(6).max(72).required(),
  // Optional fields for organization creation
  organizationName: Joi.string().min(2).max(100).trim().optional()
}).options({ stripUnknown: true });

/**
 * User login validation schema
 */
export const loginSchema = Joi.object({
  email: Joi.string().email().lowercase().trim().required(),
  password: Joi.string().required()
}).options({ stripUnknown: true });

/**
 * Video upload metadata validation schema
 */
export const videoUploadSchema = Joi.object({
  title: Joi.string().min(1).max(200).trim().required(),
  description: Joi.string().max(2000).trim().allow('').default('')
}).options({ stripUnknown: true });

/**
 * Video update validation schema
 */
export const videoUpdateSchema = Joi.object({
  title: Joi.string().min(1).max(200).trim().optional(),
  description: Joi.string().max(2000).trim().allow('').optional()
}).options({ stripUnknown: true }).min(1);

/**
 * MongoDB ObjectId validation schema
 */
export const objectIdSchema = Joi.object({
  id: Joi.string().pattern(/^[0-9a-fA-F]{24}$/).required()
    .messages({
      'string.pattern.base': 'Invalid ID format'
    })
}).options({ stripUnknown: true });

/**
 * User role update validation schema
 */
export const userRoleSchema = Joi.object({
  role: Joi.string().valid('viewer', 'editor', 'admin').required()
}).options({ stripUnknown: true });

/**
 * Organization creation validation schema
 */
export const organizationSchema = Joi.object({
  name: Joi.string().min(2).max(100).trim().required(),
  emailDomain: Joi.string().pattern(/^[a-z0-9]+([\-\.]{1}[a-z0-9]+)*\.[a-z]{2,}$/).lowercase().optional()
    .messages({
      'string.pattern.base': 'Invalid email domain format'
    }),
  plan: Joi.string().valid('free', 'premium', 'enterprise').default('free')
}).options({ stripUnknown: true });
