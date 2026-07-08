export type V2Edition = "full" | "private-lite" | string;

declare const __CLICKVISUAL_V2_EDITION__: string;

declare global {
  interface Window {
    __CLICKVISUAL_V2_CONFIG__?: {
      edition?: V2Edition;
    };
  }
}

export function getV2Edition(): V2Edition {
  const buildEdition = typeof __CLICKVISUAL_V2_EDITION__ === "undefined" ? "" : __CLICKVISUAL_V2_EDITION__;
  return window.__CLICKVISUAL_V2_CONFIG__?.edition || buildEdition || "full";
}

export function isPrivateLiteEdition() {
  return getV2Edition() === "private-lite";
}
