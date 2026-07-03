import "server-only";

import { env } from "@/shared/config/env";

import type {
  Przelewy24RegisterTransactionInput,
  Przelewy24RegisterTransactionResponse,
  Przelewy24TestAccessResponse,
  Przelewy24VerifyTransactionInput,
  Przelewy24VerifyTransactionResponse,
} from "../types/przelewy24.types";

import {
  createPrzelewy24RegisterSign,
  createPrzelewy24VerifySign,
} from "./przelewy24-sign";

const P24_REQUEST_TIMEOUT_MS = 15_000;

export function buildPrzelewy24PaymentUrl(token: string): string {
  const paymentBaseUrl = env.P24_BASE_URL.replace(/\/api\/v1\/?$/, "");

  return `${paymentBaseUrl}/trnRequest/${encodeURIComponent(token)}`;
}


export class Przelewy24ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly responseBody?: unknown,
  ) {
    super(message);
    this.name = "Przelewy24ApiError";
  }
}

function getBasicAuthorization(): string {
  const credentials = `${env.P24_POS_ID}:${env.P24_API_KEY}`;

  return `Basic ${Buffer.from(credentials, "utf8").toString("base64")}`;
}

async function p24Request<T>({
  path,
  method,
  body,
}: {
  path: string;
  method: "GET" | "POST" | "PUT";
  body?: unknown;
}): Promise<T> {
  const controller = new AbortController();

  const timeout = setTimeout(() => {
    controller.abort();
  }, P24_REQUEST_TIMEOUT_MS);

  try {
    const response = await fetch(
      `${env.P24_BASE_URL}${path}`,
      {
        method,

        headers: {
          Authorization: getBasicAuthorization(),
          Accept: "application/json",

          ...(body
            ? {
                "Content-Type": "application/json",
              }
            : {}),
        },

        body: body
          ? JSON.stringify(body)
          : undefined,

        cache: "no-store",
        signal: controller.signal,
      },
    );

    let responseBody: unknown = null;

    try {
      responseBody = await response.json();
    } catch {
      responseBody = null;
    }

    if (!response.ok) {
      throw new Przelewy24ApiError(
        `Przelewy24 zwróciło status HTTP ${response.status}.`,
        response.status,
        responseBody,
      );
    }

    return responseBody as T;
  } catch (error) {
    if (
      error instanceof Error &&
      error.name === "AbortError"
    ) {
      throw new Przelewy24ApiError(
        "Przekroczono czas oczekiwania na odpowiedź Przelewy24.",
        504,
      );
    }

    throw error;
  } finally {
    clearTimeout(timeout);
  }
}

export async function testPrzelewy24Access(): Promise<boolean> {
  const response = await p24Request<Przelewy24TestAccessResponse>({
    path: "/testAccess",
    method: "GET",
  });

  if (response.data !== true) {
    throw new Przelewy24ApiError(
      response.error || "Przelewy24 nie potwierdziło dostępu do API.",
      502,
      response,
    );
  }

  return true;
}

export async function registerPrzelewy24Transaction(
  input: Przelewy24RegisterTransactionInput,
): Promise<{ token: string }> {
  const sign = createPrzelewy24RegisterSign({
    sessionId: input.sessionId,
    merchantId: env.P24_MERCHANT_ID,
    amount: input.amount,
    currency: input.currency,
    crc: env.P24_CRC,
  });

  const response =
    await p24Request<Przelewy24RegisterTransactionResponse>({
      path: "/transaction/register",
      method: "POST",
      body: {
        merchantId: env.P24_MERCHANT_ID,
        posId: env.P24_POS_ID,

        sessionId: input.sessionId,
        amount: input.amount,
        currency: input.currency,

        description: input.description,
        email: input.email,
        client: input.client,

        country: input.country ?? "PL",
        language: input.language ?? "pl",

        urlReturn: input.urlReturn,
        urlStatus: input.urlStatus,

        sign,
      },
    });

  const token = response.data?.token;

  if (!token) {
    throw new Przelewy24ApiError(
      response.error || "Przelewy24 nie zwróciło tokenu transakcji.",
      502,
      response,
    );
  }

  return {
    token,
  };
}

export async function verifyPrzelewy24Transaction(
  input: Przelewy24VerifyTransactionInput,
): Promise<void> {
  const sign = createPrzelewy24VerifySign({
    sessionId: input.sessionId,
    orderId: input.orderId,
    amount: input.amount,
    currency: input.currency,
    crc: env.P24_CRC,
  });

  const response =
    await p24Request<Przelewy24VerifyTransactionResponse>({
      path: "/transaction/verify",
      method: "PUT",
      body: {
        merchantId: env.P24_MERCHANT_ID,
        posId: env.P24_POS_ID,

        sessionId: input.sessionId,
        amount: input.amount,
        currency: input.currency,
        orderId: input.orderId,

        sign,
      },
    });

  if (response.data?.status !== "success") {
    throw new Przelewy24ApiError(
      response.error || "Przelewy24 nie potwierdziło transakcji.",
      502,
      response,
    );
  }
}