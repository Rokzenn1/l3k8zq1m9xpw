"use client";

import { useCallback, useEffect, useState } from "react";
import { createClient } from "@/lib/supabase/client";
import type { CounterRow, ObjectiveRow } from "@/types";

export function useEventData() {
  const [counter, setCounter] = useState<CounterRow | null>(null);
  const [objectives, setObjectives] = useState<ObjectiveRow[]>([]);
  const [evgFirstName, setEvgFirstName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    const supabase = createClient();
    const [cRes, oRes, sRes] = await Promise.all([
      supabase.from("counter").select("*").limit(1).maybeSingle(),
      supabase.from("objectives").select("*").order("threshold", { ascending: true }),
      supabase.from("site_settings").select("evg_first_name").eq("id", 1).maybeSingle(),
    ]);

    if (cRes.error) setError(cRes.error.message);
    else if (cRes.data) setCounter(cRes.data as CounterRow);

    if (oRes.error) setError(oRes.error.message);
    else setObjectives((oRes.data as ObjectiveRow[]) ?? []);

    if (sRes.error) setError(sRes.error.message);
    else
      setEvgFirstName(
        typeof sRes.data?.evg_first_name === "string"
          ? sRes.data.evg_first_name
          : null,
      );

    setLoading(false);
  }, []);

  useEffect(() => {
    queueMicrotask(() => {
      void load();
    });
  }, [load]);

  useEffect(() => {
    const supabase = createClient();
    const ch = supabase
      .channel("event-realtime")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "counter" },
        () => {
          load();
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "objectives" },
        () => {
          load();
        },
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "site_settings" },
        () => {
          load();
        },
      )
      .subscribe();

    return () => {
      supabase.removeChannel(ch);
    };
  }, [load]);

  return { counter, objectives, evgFirstName, loading, error, refresh: load };
}
