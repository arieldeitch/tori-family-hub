// React binding for the backend capability probe.
//
// The probe itself is in schemaCapability.ts, deliberately framework-free and
// memoised there, so mounting this hook in several places still produces exactly
// one request per session.
import { useCallback, useEffect, useState } from "react";
import {
  detectSchemaCapability,
  resetSchemaCapability,
  type SchemaCapability,
} from "./schemaCapability";

export interface SchemaCapabilityState extends SchemaCapability {
  /** Forget the cached answer and probe again. */
  checkAgain: () => void;
  checking: boolean;
}

export function useSchemaCapability(enabled: boolean): SchemaCapabilityState {
  const [capability, setCapability] = useState<SchemaCapability>({
    status: "checking",
    failure: null,
  });
  const [token, setToken] = useState(0);

  const checkAgain = useCallback(() => {
    resetSchemaCapability();
    setCapability({ status: "checking", failure: null });
    setToken((n) => n + 1);
  }, []);

  useEffect(() => {
    if (!enabled) return;
    let active = true;
    void detectSchemaCapability().then((result) => {
      if (active) setCapability(result);
    });
    return () => {
      active = false;
    };
  }, [enabled, token]);

  return { ...capability, checkAgain, checking: capability.status === "checking" };
}
