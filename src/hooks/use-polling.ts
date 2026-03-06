"use client";

import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then((r) => r.json());

export function usePolling<T>(url: string, interval: number) {
  return useSWR<T>(url, fetcher, {
    refreshInterval: interval,
    revalidateOnFocus: true,
    dedupingInterval: interval / 2,
  });
}
