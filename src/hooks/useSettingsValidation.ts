import { useState, useCallback } from "react";
import type { ChatConfig } from "../types/settings";
import type { KeyValidationResult } from "../components/settings/ModelConfig";

interface UseSettingsValidationProps {
  config: ChatConfig;
  onSave: (config: ChatConfig) => void;
  onClose: () => void;
}

export const useSettingsValidation = ({ config, onSave, onClose }: UseSettingsValidationProps) => {
  const [keyValidations, setKeyValidations] = useState<KeyValidationResult[]>([]);
  const [isValidating, setIsValidating] = useState(false);

  const handleSave = useCallback(async () => {
    const provider = config.aiProvider;
    const results: KeyValidationResult[] = [];
    setIsValidating(true);

    if (provider && provider !== "local" && provider !== "custom") {
      const key = (config.providerKeys?.[provider] || config.apiKey || "").trim();
      if (key) {
        try {
          const r = await fetch("/api/validate-key", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ provider, apiKey: key }),
          });
          const data = await r.json();
          results.push({ provider, valid: data.valid, error: data.error || data.warning });
        } catch {
          results.push({ provider, valid: false, error: "Validation failed" });
        }
      }
    }

    setIsValidating(false);
    setKeyValidations(results);

    if (results.some((r) => !r.valid)) return;

    onSave(config);
    onClose();
  }, [config, onSave, onClose]);

  const handleVerifyKey = useCallback(async () => {
    const provider = config.aiProvider;
    const key = (config.providerKeys?.[provider] || config.apiKey || "").trim();
    if (!key || !provider || provider === "local" || provider === "custom") return;

    setIsValidating(true);
    try {
      const r = await fetch("/api/validate-key", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ provider, apiKey: key }),
      });
      const data = await r.json();
      setKeyValidations([{ provider, valid: data.valid, error: data.error || data.warning }]);
    } catch {
      setKeyValidations([{ provider, valid: false, error: "Validation failed" }]);
    }
    setIsValidating(false);
  }, [config]);

  return {
    keyValidations,
    isValidating,
    handleSave,
    handleVerifyKey,
    setKeyValidations,
  };
};