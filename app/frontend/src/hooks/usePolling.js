// src/hooks/usePolling.js

const DEFAULT_INTERVAL = 10000; // 10 seconds

export  default function usePolling() {
  const interval = import.meta.env.VITE_POLL_INTERVAL
    ? parseInt(import.meta.env.VITE_POLL_INTERVAL, 10)
    : DEFAULT_INTERVAL;

  return { pollInterval: interval };
}