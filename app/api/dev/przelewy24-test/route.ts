import { NextResponse } from "next/server";

import {
  Przelewy24ApiError,
  testPrzelewy24Access,
} from "@/features/payments";

import { requireSuperAdmin } from "@/server/auth/require-super-admin";
import { env } from "@/shared/config/env";

export const dynamic = "force-dynamic";
export const revalidate = 0;
export const runtime = "nodejs";

export async function GET() {
  try {
    await requireSuperAdmin();

    if (env.NODE_ENV === "production") {
      return NextResponse.json(
        {
          ok: false,
          message: "Endpoint diagnostyczny jest wyłączony na produkcji.",
        },
        {
          status: 404,
        },
      );
    }

    await testPrzelewy24Access();

    return NextResponse.json({
      ok: true,
      message: "Połączenie z API Przelewy24 działa poprawnie.",
      baseUrl: env.P24_BASE_URL,
      merchantId: env.P24_MERCHANT_ID,
      posId: env.P24_POS_ID,
    });
  } catch (error) {
    if (error instanceof Przelewy24ApiError) {
      return NextResponse.json(
        {
          ok: false,
          message: error.message,
          p24Status: error.status,
        },
        {
          status: error.status === 401 ? 401 : 502,
        },
      );
    }

    console.error("P24_TEST_ACCESS_FAILED", {
      errorName: error instanceof Error ? error.name : "UnknownError",
      errorMessage:
        error instanceof Error
          ? error.message
          : "Unknown error",
    });

    return NextResponse.json(
      {
        ok: false,
        message: "Nie udało się przetestować połączenia z Przelewy24.",
      },
      {
        status: 500,
      },
    );
  }
}