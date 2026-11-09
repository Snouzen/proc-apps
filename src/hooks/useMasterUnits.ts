import { useState, useCallback, useEffect } from "react";
import { getUnits } from "@/lib/units";

export function useMasterUnits() {
  const [unitData, setUnitData] = useState<any[]>([]);

  const fetchUnits = useCallback(async () => {
    try {
      const list = await getUnits();
      setUnitData(Array.isArray(list) ? list : []);
    } catch {
      setUnitData([]);
    }
  }, []);

  useEffect(() => {
    let mounted = true;
    const run = () => {
      if (!mounted) return;
      fetchUnits();
    };
    
    run();
    return () => {
      mounted = false;
    };
  }, [fetchUnits]);

  return { unitData, fetchUnits };
}
