import Joi from 'joi';

/**
 * Validation schemas
 */

export const authSchemas = {
  register: Joi.object({
    name: Joi.string().min(2).max(50).required(),
    email: Joi.string().email().required(),
    password: Joi.string().min(6).max(100).required(),
    confirmPassword: Joi.string().valid(Joi.ref('password')).required(),
  }),

  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
  }),

  updateProfile: Joi.object({
    name: Joi.string().min(2).max(50),
    bio: Joi.string().max(500),
    avatar: Joi.string().uri(),
  }),
};

export const pollSchemas = {
  createPoll: Joi.object({
    roomId: Joi.string().required(),
    question: Joi.string().min(5).max(500).required(),
    options: Joi.array()
      .items(Joi.string().min(1).max(200))
      .min(2)
      .max(10)
      .required(),
    expiresInMinutes: Joi.number().min(1).max(1440),
  }),

  vote: Joi.object({
    selectedOptionId: Joi.string().required(),
  }),
};

export const roomSchemas = {
  createRoom: Joi.object({
    repoUrl: Joi.string().uri().required(),
  }),
};

export const messageSchemas = {
  createMessage: Joi.object({
    roomId: Joi.string().required(),
    content: Joi.string().min(1).max(2000).required(),
  }),

  updateMessage: Joi.object({
    content: Joi.string().min(1).max(2000).required(),
  }),
};

/**
 * Validate input using schema
 */
export const validateInput = (data, schema) => {
  const { error, value } = schema.validate(data, {
    abortEarly: false,
    stripUnknown: true,
  });

  if (error) {
    const messages = error.details.map((detail) => detail.message).join(', ');
    throw new Error(`Validation error: ${messages}`);
  }

  return value;
};
