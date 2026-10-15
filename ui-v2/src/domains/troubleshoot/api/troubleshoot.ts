import { client } from "../../../shared/http/client";

export interface TroubleshootLink {
  tid: number;
  instanceId?: number;
  database?: string;
  table?: string;
  query?: string;
  st?: number;
  et?: number;
}

export interface TroubleshootPending {
  tool: string;
  summary: string;
}

export interface TroubleshootMessage {
  id: number;
  role: string;
  kind: string;
  text?: string;
  tool?: string;
  summary?: string;
  detail?: string;
  status?: string;
  link?: TroubleshootLink;
  result?: { count: number; preview: string };
  createdAt?: number;
}

export interface TroubleshootSession {
  id: number;
  title: string;
  status: string;
  shareToken?: string;
  updatedAt?: number;
  pending?: TroubleshootPending;
  messages?: TroubleshootMessage[];
}

export function troubleshootQueryHref(link: TroubleshootLink) {
  const params = new URLSearchParams();
  if (link.instanceId) params.set("instanceId", String(link.instanceId));
  if (link.database) params.set("database", link.database);
  if (link.table) params.set("table", link.table);
  if (link.tid) params.set("tableId", String(link.tid));
  if (link.query) params.set("query", link.query);
  if (link.st) params.set("st", String(link.st));
  if (link.et) params.set("et", String(link.et));
  return `/v2/query?${params.toString()}`;
}

export function asTroubleshootSession(value: TroubleshootSession | null | undefined): TroubleshootSession {
  if (!value || Array.isArray(value) || typeof value.id !== "number" || !Number.isFinite(value.id)) {
    throw new Error("排障接口没有返回对话");
  }
  return {
    ...value,
    messages: Array.isArray(value.messages) ? value.messages : []
  };
}

export function listTroubleshootSessions() {
  return client.get<TroubleshootSession[]>("/api/v2/troubleshoot/sessions");
}

export function getTroubleshootSession(id: number) {
  return client.get<TroubleshootSession>(`/api/v2/troubleshoot/sessions/${id}`).then(asTroubleshootSession);
}

export function startTroubleshoot(text: string) {
  return client.post<TroubleshootSession>("/api/v2/troubleshoot/sessions", { text }).then(asTroubleshootSession);
}

export function replyTroubleshoot(id: number, text: string) {
  return client.post<TroubleshootSession>(`/api/v2/troubleshoot/sessions/${id}/messages`, { text }).then(asTroubleshootSession);
}

export function confirmTroubleshoot(id: number, accept: boolean) {
  return client.post<TroubleshootSession>(`/api/v2/troubleshoot/sessions/${id}/confirm`, { accept }).then(asTroubleshootSession);
}

export function shareTroubleshoot(id: number) {
  return client.post<{ token: string }>(`/api/v2/troubleshoot/sessions/${id}/share`, {});
}

export function getSharedTroubleshoot(token: string) {
  return client.get<TroubleshootSession>(`/api/v2/troubleshoot/share/${encodeURIComponent(token)}`).then(asTroubleshootSession);
}
