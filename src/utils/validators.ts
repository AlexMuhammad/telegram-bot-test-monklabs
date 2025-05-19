import Joi from "joi";

export const validators = {
  tokenAddress: Joi.string()
    .pattern(
      /^(0x[a-fA-F0-9]{40}|[1-9A-HJ-NP-Za-km-z]{32,44}|[13][a-km-zA-HJ-NP-Z1-9]{25,34})$/
    )
    .required()
    .messages({
      "string.pattern.base":
        "Invalid token address. Must be a valid Ethereum, Solana, or Bitcoin address",
      "string.empty": "Token address is required",
    }),
  tokenSymbol: Joi.string().alphanum().min(1).max(10).required().messages({
    "string.alphanum": "Token symbol must be alphanumeric",
    "string.min": "Token symbol must be at least 1 character",
    "string.max": "Token symbol must be at most 10 characters",
    "string.empty": "Token symbol is required",
  }),
};
