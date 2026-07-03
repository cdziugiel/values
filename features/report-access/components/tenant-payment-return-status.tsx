"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
    CheckCircle2,
    LoaderCircle,
    TriangleAlert,
} from "lucide-react";

import { Button } from "@/components/ui/button";

type PaymentStatus =
    | "pending_payment"
    | "paid"
    | "failed"
    | "cancelled"
    | string;

type PaymentStatusResponse = {
    ok: boolean;
    status?: PaymentStatus;
    message?: string;
};

const POLL_INTERVAL_MS = 1200;
const MAX_POLL_ATTEMPTS = 30;

export function TenantPaymentReturnStatus({
    orderId,
    tenantSlug,
    initialStatus,
}: {
    orderId: string;
    tenantSlug: string;
    initialStatus: PaymentStatus;
}) {
    const router = useRouter();

    const [status, setStatus] =
        useState<PaymentStatus>(initialStatus);
    const [pollVersion, setPollVersion] =
        useState(0);
    const [message, setMessage] =
        useState<string>("");

    const attemptsRef = useRef(0);

    useEffect(() => {
        if (status === "paid") {
            const timeout = window.setTimeout(() => {
                router.replace(
                    `/t/${encodeURIComponent(
                        tenantSlug,
                    )}/report-access?payment=success`,
                );

                router.refresh();
            }, 700);

            return () => {
                window.clearTimeout(timeout);
            };
        }

        if (
            status === "failed" ||
            status === "cancelled"
        ) {
            return;
        }

        let cancelled = false;
        let timeoutId: number | null = null;

        async function checkStatus() {
            if (cancelled) {
                return;
            }

            attemptsRef.current += 1;

            try {
                const response = await fetch(
                    `/api/secure/report-access-orders/${encodeURIComponent(
                        orderId,
                    )}/payment-status`,
                    {
                        method: "GET",
                        cache: "no-store",
                        headers: {
                            Accept: "application/json",
                        },
                    },
                );

                const payload =
                    (await response.json()) as PaymentStatusResponse;

                if (!response.ok || !payload.ok) {
                    throw new Error(
                        payload.message ??
                        "Nie udało się sprawdzić płatności.",
                    );
                }

                const nextStatus =
                    payload.status ?? "pending_payment";

                setStatus(nextStatus);

                if (nextStatus === "paid") {
                    return;
                }

                if (
                    nextStatus === "failed" ||
                    nextStatus === "cancelled"
                ) {
                    return;
                }

                if (
                    attemptsRef.current >=
                    MAX_POLL_ATTEMPTS
                ) {
                    setMessage(
                        "Potwierdzenie płatności trwa dłużej niż zwykle. Możesz odświeżyć status lub przejść do listy dostępów.",
                    );

                    return;
                }

                timeoutId = window.setTimeout(
                    checkStatus,
                    POLL_INTERVAL_MS,
                );
            } catch {
                if (
                    attemptsRef.current >=
                    MAX_POLL_ATTEMPTS
                ) {
                    setMessage(
                        "Nie udało się automatycznie potwierdzić statusu. Płatność może nadal zostać przetworzona.",
                    );

                    return;
                }

                timeoutId = window.setTimeout(
                    checkStatus,
                    POLL_INTERVAL_MS,
                );
            }
        }

        void checkStatus();

        return () => {
            cancelled = true;

            if (timeoutId !== null) {
                window.clearTimeout(timeoutId);
            }
        };
    }, [
        orderId,
        pollVersion,
        router,
        status,
        tenantSlug,
    ]);

    const reportAccessHref =
        `/t/${encodeURIComponent(
            tenantSlug,
        )}/report-access`;

    if (status === "paid") {
        return (
            <section className="space-y-5 text-center">
                <CheckCircle2
                    className="mx-auto size-12 text-emerald-600"
                    aria-hidden="true"
                />

                <div className="space-y-2">
                    <h1 className="text-2xl font-semibold">
                        Płatność potwierdzona
                    </h1>

                    <p className="text-sm text-muted-foreground">
                        Dostępy zostały dodane do puli partnera.
                        Za chwilę nastąpi przekierowanie.
                    </p>
                </div>
            </section>
        );
    }

    if (
        status === "failed" ||
        status === "cancelled"
    ) {
        return (
            <section className="space-y-5 text-center">
                <TriangleAlert
                    className="mx-auto size-12 text-amber-600"
                    aria-hidden="true"
                />

                <div className="space-y-2">
                    <h1 className="text-2xl font-semibold">
                        Płatność nie została potwierdzona
                    </h1>

                    <p className="text-sm text-muted-foreground">
                        Możesz wrócić do zamówień i ponowić
                        płatność.
                    </p>
                </div>

                <Button
                    type="button"
                    onClick={() => {
                        router.replace(reportAccessHref);
                        router.refresh();
                    }}
                >
                    Wróć do dostępów
                </Button>
            </section>
        );
    }

    return (
        <section className="space-y-5 text-center">
            <LoaderCircle
                className="mx-auto size-12 animate-spin text-primary"
                aria-hidden="true"
            />

            <div className="space-y-2">
                <h1 className="text-2xl font-semibold">
                    Potwierdzamy płatność
                </h1>

                <p className="text-sm leading-6 text-muted-foreground">
                    Przelewy24 przekazało płatność do
                    weryfikacji. Dostępy pojawią się
                    automatycznie po otrzymaniu potwierdzenia.
                </p>

                {message ? (
                    <p
                        role="status"
                        className="text-sm text-amber-700"
                    >
                        {message}
                    </p>
                ) : null}
            </div>

            {message ? (
                <div className="flex flex-wrap justify-center gap-3">
                    <Button
                        type="button"
                        onClick={() => {
                            attemptsRef.current = 0;
                            setMessage("");
                            setPollVersion((value) => value + 1);
                        }}
                    >
                        Sprawdź ponownie
                    </Button>

                    <Button
                        type="button"
                        variant="outline"
                        onClick={() => {
                            router.replace(reportAccessHref);
                            router.refresh();
                        }}
                    >
                        Przejdź do dostępów
                    </Button>
                </div>
            ) : null}
        </section>
    );
}