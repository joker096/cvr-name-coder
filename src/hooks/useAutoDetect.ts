import { useState, useCallback } from "react";

interface DetectedServer {
  url: string;
  name: string;
  status: "online" | "offline" | "error";
  models: string[];
  latency?: number;
}

const DEFAULT_SERVERS = [
  { url: "http://localhost:11434", name: "Ollama (Default)" },
  { url: "http://localhost:8000", name: "LocalAI (Default)" },
  { url: "http://localhost:5000", name: "vLLM (Default)" },
];

export const useAutoDetect = () => {
  const [isScanning, setIsScanning] = useState(false);
  const [detectedServers, setDetectedServers] = useState<DetectedServer[]>([]);
  const [error, setError] = useState<string | null>(null);

  const detectServer = useCallback(async (url: string, name: string): Promise<DetectedServer> => {
    const startTime = Date.now();

    try {
      const response = await fetch(`${url}/api/tags`, {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
        },
        signal: AbortSignal.timeout(3000),
      });

      const latency = Date.now() - startTime;

      if (!response.ok) {
        return {
          url,
          name,
          status: "error",
          models: [],
          latency,
        };
      }

      const data = await response.json();
      const models = (data.models || []).map((model: any) => model.name);

      return {
        url,
        name,
        status: "online",
        models,
        latency,
      };
    } catch (err) {
      return {
        url,
        name,
        status: "offline",
        models: [],
        latency: Date.now() - startTime,
      };
    }
  }, []);

  const scanServers = useCallback(async (customServers?: string[]): Promise<DetectedServer[]> => {
    setIsScanning(true);
    setError(null);

    const serversToScan = customServers || DEFAULT_SERVERS;
    const results: DetectedServer[] = [];

    try {
      const promises = serversToScan.map((server) => {
        if (typeof server === "string") {
          return detectServer(server, server);
        }
        return detectServer(server.url, server.name);
      });

      const detected = await Promise.all(promises);
      results.push(...detected);

      setDetectedServers(detected);
      return detected;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to scan servers";
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsScanning(false);
    }
  }, [detectServer]);

  const scanSingleServer = useCallback(async (url: string): Promise<DetectedServer> => {
    setIsScanning(true);
    setError(null);

    try {
      const result = await detectServer(url, url);
      setDetectedServers((prev) => {
        const existing = prev.find((s) => s.url === url);
        if (existing) {
          return prev.map((s) => (s.url === url ? result : s));
        }
        return [...prev, result];
      });
      return result;
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : "Failed to scan server";
      setError(errorMessage);
      throw new Error(errorMessage);
    } finally {
      setIsScanning(false);
    }
  }, [detectServer]);

  const getOnlineServers = useCallback((): DetectedServer[] => {
    return detectedServers.filter((s) => s.status === "online");
  }, [detectedServers]);

  const getServerByUrl = useCallback((url: string): DetectedServer | undefined => {
    return detectedServers.find((s) => s.url === url);
  }, [detectedServers]);

  const clearResults = useCallback(() => {
    setDetectedServers([]);
    setError(null);
  }, []);

  return {
    isScanning,
    detectedServers,
    error,
    scanServers,
    scanSingleServer,
    getOnlineServers,
    getServerByUrl,
    clearResults,
  };
};
