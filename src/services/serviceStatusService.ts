import { backends, backendById } from './backends/registry';
import { ServiceStatus } from '../types';

const statuses = new Map<string, ServiceStatus>();
const observations = new Map<string, number>();
let pending: Promise<ServiceStatus[]> | undefined;

export function recordServiceResult(id: string, error?: unknown): ServiceStatus {
  const message = error instanceof Error ? error.message : String(error);
  const status: ServiceStatus = {
    id,
    name: backendById[id]?.name || id,
    ...(error === undefined ? { state: 'available' as const, detail: 'Last image operation succeeded' } :
      backendById[id]?.classifyFailure(error) || { state: 'unavailable' as const, detail: message }),
    checkedAt: new Date().toISOString()
  };
  observations.set(id, Date.now());
  statuses.set(id, status);
  return status;
}

async function probe(id: string): Promise<ServiceStatus> {
  const previous = statuses.get(id);
  if (previous && Date.now() - (observations.get(id) || 0) < 5 * 60_000) return previous;
  const startedAt = Date.now();
  let result: ServiceStatus;
  try {
    result = { id, name: backendById[id].name, ...await backendById[id].checkHealth(), checkedAt: new Date().toISOString() };
  } catch (error) {
    result = { id, name: backendById[id].name, ...backendById[id].classifyFailure(error), checkedAt: new Date().toISOString() };
  }
  if ((observations.get(id) || 0) >= startedAt) return statuses.get(id)!;
  statuses.set(id, result);
  return result;
}

export function getServiceStatuses(): Promise<ServiceStatus[]> {
  if (!pending) {
    pending = Promise.all(backends.map(backend => probe(backend.id))).finally(() => { pending = undefined; });
  }
  return pending;
}
