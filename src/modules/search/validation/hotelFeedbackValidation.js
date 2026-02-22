import Joi from 'joi';

export const createHotelFeedbackSchema = Joi.object({
    rating: Joi.number().min(1).max(5).required(),
    feedback: Joi.string().trim().min(3).max(1000).required(),
});

export const updateHotelFeedbackSchema = Joi.object({
    rating: Joi.number().min(1).max(5),
    feedback: Joi.string().trim().min(3).max(1000),
}).min(1);
