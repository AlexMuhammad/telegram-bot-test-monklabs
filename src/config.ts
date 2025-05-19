import dotenv from "dotenv";
import Joi from "joi";

dotenv.config();

const envSchema = Joi.object({
  TELEGRAM_BOT_TOKEN: Joi.string().required().messages({
    "any.required": "Telegram bot token is required",
    "string.empty": "Telegram bot token is required",
  }),
  GEMINI_API_KEY: Joi.string().required().messages({
    "any.required": "Gemini API key is required",
    "string.empty": "Gemini API key is required",
  }),
  DATABASE_URL: Joi.string().required().messages({
    "any.required": "Database URL is required",
    "string.empty": "Database URL is required",
  }),
  PORT: Joi.number().default(3000),
}).unknown(true); // Allow unknown keys

const { error, value: env } = envSchema.validate(process.env, {
  abortEarly: false,
});

if (error) {
  console.warn(`Environment validation warning: ${error.message}`);
  // Continue execution instead of throwing an error
}

export const config = {
  telegramBotToken: env?.TELEGRAM_BOT_TOKEN,
  geminiApiKey: env?.GEMINI_API_KEY,
  databaseUrl: env?.DATABASE_URL,
  port: env?.PORT || 3000,
};
