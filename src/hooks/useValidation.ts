import { useState, useCallback } from "react";
import { validationService } from "../services/validationService";
import type { ValidationResult, FieldValidation } from "../types/settings";

export const useValidation = () => {
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [warnings, setWarnings] = useState<Record<string, string>>({});
  const [isValidating, setIsValidating] = useState(false);

  const validateField = useCallback((field: string, value: any): FieldValidation => {
    const result = validationService.validateField(field, value);

    if (!result.isValid && result.error) {
      setErrors((prev) => ({ ...prev, [field]: result.error! }));
    } else {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[field];
        return newErrors;
      });
    }

    return result;
  }, []);

  const validateConfig = useCallback((config: any): ValidationResult => {
    setIsValidating(true);
    const result = validationService.validateConfig(config);
    setErrors(result.errors);
    setWarnings(result.warnings);
    setIsValidating(false);
    return result;
  }, []);

  const clearErrors = useCallback(() => {
    setErrors({});
    setWarnings({});
  }, []);

  const clearFieldError = useCallback((field: string) => {
    setErrors((prev) => {
      const newErrors = { ...prev };
      delete newErrors[field];
      return newErrors;
    });
  }, []);

  const hasErrors = Object.keys(errors).length > 0;
  const hasWarnings = Object.keys(warnings).length > 0;

  return {
    errors,
    warnings,
    isValidating,
    hasErrors,
    hasWarnings,
    validateField,
    validateConfig,
    clearErrors,
    clearFieldError,
  };
};
