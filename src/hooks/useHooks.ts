import { useState, useEffect } from "react";

export const useHooks = () => {
  const [hooks, setHooks] = useState<any[]>([]);

  useEffect(() => {
    fetch("/api/hooks").then((r) => r.json()).then((data) => setHooks(data.hooks));
  }, []);

  return { hooks };
};
