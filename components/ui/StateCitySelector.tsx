"use client";

import { useEffect, useState } from "react";

type State = {
  code: string;
  name: string;
};

type Props = {
  onLocationChange: (stateCode: string, city: string) => void;
};

export function StateCitySelector({ onLocationChange }: Props) {
  const [states, setStates] = useState<State[]>([]);
  const [cities, setCities] = useState<string[]>([]);
  const [selectedState, setSelectedState] = useState("");
  const [selectedCity, setSelectedCity] = useState("");
  const [loadingStates, setLoadingStates] = useState(false);
  const [loadingCities, setLoadingCities] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Fetch states on mount
  useEffect(() => {
    let canceled = false;

    async function loadStates() {
      try {
        setLoadingStates(true);
        setError(null);
        const res = await fetch("/api/states");
        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.error ?? "Unable to load states");
        }
        if (!canceled) {
          setStates(json.states ?? []);
        }
      } catch (e: any) {
        if (!canceled) setError(e?.message ?? "Unable to load states");
      } finally {
        if (!canceled) setLoadingStates(false);
      }
    }

    loadStates();
    return () => {
      canceled = true;
    };
  }, []);

  // When state changes, fetch cities
  useEffect(() => {
    if (!selectedState) {
      setCities([]);
      setSelectedCity("");
      return;
    }

    let canceled = false;

    async function loadCities() {
      try {
        setLoadingCities(true);
        setError(null);
        const res = await fetch(
          `/api/cities?stateCode=${encodeURIComponent(selectedState)}`
        );
        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.error ?? "Unable to load cities");
        }
        if (!canceled) {
          setCities(json.cities ?? []);
          setSelectedCity("");
        }
      } catch (e: any) {
        if (!canceled) setError(e?.message ?? "Unable to load cities");
      } finally {
        if (!canceled) setLoadingCities(false);
      }
    }

    loadCities();
    return () => {
      canceled = true;
    };
  }, [selectedState]);

  // Notify parent once both state and city are chosen
  useEffect(() => {
    if (!selectedState || !selectedCity) return;
    onLocationChange(selectedState, selectedCity);
  }, [selectedState, selectedCity, onLocationChange]);

  const selectedStateName =
    states.find((s) => s.code === selectedState)?.name ?? selectedState;

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div>
        <label className="block text-xs font-medium text-muted">
          State
        </label>
        <select
          className="mt-1 w-full rounded-lg border border-border/15 bg-card px-3 py-2 text-sm text-text shadow-sm shadow-black/20 transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-50"
          value={selectedState}
          onChange={(e) => setSelectedState(e.target.value)}
          disabled={loadingStates}
        >
          <option value="">Select state</option>
          {states.map((s) => (
            <option key={s.code} value={s.code}>
              {s.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="block text-xs font-medium text-muted">
          City
        </label>
        <select
          className="mt-1 w-full rounded-lg border border-border/15 bg-card px-3 py-2 text-sm text-text shadow-sm shadow-black/20 transition-colors focus:border-primary focus:outline-none focus:ring-2 focus:ring-primary/40 disabled:cursor-not-allowed disabled:opacity-50"
          value={selectedCity}
          onChange={(e) => setSelectedCity(e.target.value)}
          disabled={!selectedState || loadingCities}
        >
          <option value="">Select city</option>
          {cities.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>
      {selectedState && selectedCity && !error && (
        <p className="col-span-2 text-xs text-white/80">
          Prices shown for <span className="font-semibold text-text">{selectedCity}</span>, {selectedStateName}
        </p>
      )}
      {error && (
        <p className="col-span-2 text-xs text-white/70">
          {error}
        </p>
      )}
    </div>
  );
}