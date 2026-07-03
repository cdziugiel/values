import "server-only";

import { createHash, timingSafeEqual } from "node:crypto";

function sha384(value: string): string {
  return createHash("sha384").update(value, "utf8").digest("hex");
}

export function createPrzelewy24RegisterSign({
  sessionId,
  merchantId,
  amount,
  currency,
  crc,
}: {
  sessionId: string;
  merchantId: number;
  amount: number;
  currency: string;
  crc: string;
}): string {
  return sha384(
    JSON.stringify({
      sessionId,
      merchantId,
      amount,
      currency,
      crc,
    }),
  );
}

export function createPrzelewy24VerifySign({
  sessionId,
  orderId,
  amount,
  currency,
  crc,
}: {
  sessionId: string;
  orderId: number;
  amount: number;
  currency: string;
  crc: string;
}): string {
  return sha384(
    JSON.stringify({
      sessionId,
      orderId,
      amount,
      currency,
      crc,
    }),
  );
}

export function createPrzelewy24NotificationSign({
  merchantId,
  posId,
  sessionId,
  amount,
  originAmount,
  currency,
  orderId,
  methodId,
  statement,
  crc,
}: {
  merchantId: number;
  posId: number;
  sessionId: string;
  amount: number;
  originAmount: number;
  currency: string;
  orderId: number;
  methodId: number;
  statement: string;
  crc: string;
}): string {
  return sha384(
    JSON.stringify({
      merchantId,
      posId,
      sessionId,
      amount,
      originAmount,
      currency,
      orderId,
      methodId,
      statement,
      crc,
    }),
  );
}

export function safeCompareSign(
  receivedSign: string,
  expectedSign: string,
): boolean {
  const receivedBuffer = Buffer.from(receivedSign, "utf8");
  const expectedBuffer = Buffer.from(expectedSign, "utf8");

  if (receivedBuffer.length !== expectedBuffer.length) {
    return false;
  }

  return timingSafeEqual(receivedBuffer, expectedBuffer);
}