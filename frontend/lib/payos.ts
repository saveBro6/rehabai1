import "server-only";

import { PayOS } from "@payos/node";

const PAYOS_REQUIRED_ENV = ["PAYOS_CLIENT_ID", "PAYOS_API_KEY", "PAYOS_CHECKSUM_KEY"] as const;

export function isPayosConfigured() {
  return PAYOS_REQUIRED_ENV.every((key) => Boolean(process.env[key]?.trim()));
}

export function getAppUrl() {
  return (process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000").replace(/\/+$/, "");
}

export function createPayosClient() {
  if (!isPayosConfigured()) {
    throw new Error("payOS is not configured.");
  }

  return new PayOS({
    clientId: process.env.PAYOS_CLIENT_ID,
    apiKey: process.env.PAYOS_API_KEY,
    checksumKey: process.env.PAYOS_CHECKSUM_KEY,
    logLevel: "warn"
  });
}
