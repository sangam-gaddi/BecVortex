"use client";
import { useNetworkContext } from '@/components/os/components/NetworkContext';
import type { Network } from '@/components/os/components/NetworkContext';

export type { Network };

export function useNetworkSimulation() {
  return useNetworkContext();
}
