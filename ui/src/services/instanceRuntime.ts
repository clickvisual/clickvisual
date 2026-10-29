export interface InstanceListItem {
  id?: number;
  name: string;
  mode: number;
  clusters?: string[];
  clusterInfo?: string[];
  error?: string;
  runtimeLoading?: boolean;
  desc?: string;
}

export interface InstanceRuntime {
  clusters: string[];
  clusterInfo: string[];
  mode: number;
  error: string;
}

interface Response<T> {
  code: number;
  msg?: string;
  data: T;
}

type UpdateInstances<T> = (
  update: T[] | ((current: T[]) => T[])
) => void;

export async function loadInstanceList<T extends InstanceListItem>(
  source: {
    getInstances: () => Promise<Response<T[]>>;
    getInstanceRuntime: (id: number) => Promise<Response<InstanceRuntime>>;
  },
  setInstances: UpdateInstances<T>,
  isCurrent: () => boolean,
  fallbackError: string
) {
  const res = await source.getInstances();
  if (res.code !== 0 || !isCurrent()) return res;

  const items = res.data.map((item) => ({
    ...item,
    clusters: Array.isArray(item.clusters) ? item.clusters : [],
    clusterInfo: Array.isArray(item.clusterInfo) ? item.clusterInfo : [],
    error: "",
    runtimeLoading: true,
  }));
  setInstances(items);

  // Return metadata immediately; each check updates only its own row.
  void Promise.all(items.map(async (item) => {
    try {
      const runtimeRes = await source.getInstanceRuntime(item.id!);
      if (!isCurrent()) return;
      if (runtimeRes.code !== 0) throw new Error(runtimeRes.msg);
      const runtime = runtimeRes.data;
      setInstances((current) => current.map((entry) => entry.id === item.id
        ? {
            ...entry,
            ...runtime,
            clusters: Array.isArray(runtime.clusters) ? runtime.clusters : [],
            clusterInfo: Array.isArray(runtime.clusterInfo) ? runtime.clusterInfo : [],
            runtimeLoading: false,
          }
        : entry));
    } catch (error) {
      if (!isCurrent()) return;
      setInstances((current) => current.map((entry) => entry.id === item.id
        ? {
            ...entry,
            runtimeLoading: false,
            error: (error instanceof Error ? error.message : "") || fallbackError,
          }
        : entry));
    }
  }));
  return res;
}
