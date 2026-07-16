"use server";

import { headers } from "next/headers";
import nodemailer from "nodemailer";

import { requireSession } from "@/server/auth/require-session";
import { env } from "@/shared/config/env";

import {
  supportFormSchema,
  type SupportFormState,
} from "../forms/support.schema";

const ISSUE_TYPE_LABELS = {
  technical: "Problem techniczny",
  payment: "Płatność",
  report: "Raport",
  assessment: "Badanie lub kwestionariusz",
  account: "Konto lub logowanie",
  other: "Inny temat",
} as const;

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function readStringEntry(formData: FormData, name: string) {
  const value = formData.get(name);

  return typeof value === "string" ? value : "";
}

export async function submitSupportRequestAction(
  _previousState: SupportFormState,
  formData: FormData,
): Promise<SupportFormState> {
  const session = await requireSession();

  const input = {
    issueType: readStringEntry(formData, "issueType"),
    subject: readStringEntry(formData, "subject"),
    message: readStringEntry(formData, "message"),
    pageUrl: readStringEntry(formData, "pageUrl"),
  };

  const parsed = supportFormSchema.safeParse(input);

  if (!parsed.success) {
    return {
      status: "error",
      message: "Sprawdź zaznaczone pola i spróbuj ponownie.",
      fieldErrors: parsed.error.flatten().fieldErrors,
      values: input,
    };
  }

  const requestHeaders = await headers();

  const userAgent =
    requestHeaders.get("user-agent") ?? "Nieznany";

  const forwardedFor =
    requestHeaders.get("x-forwarded-for");

  const requestIp =
    forwardedFor?.split(",")[0]?.trim() ?? "Nieznany";

  const userId = session.user.id;
  const userEmail =
    session.user.email ?? "Brak adresu e-mail";
  const userName =
    session.user.name ?? "Brak nazwy użytkownika";

  const issueTypeLabel =
    ISSUE_TYPE_LABELS[parsed.data.issueType];

  const transporter = nodemailer.createTransport({
    host: env.EMAIL_SERVER_HOST,
    port: env.EMAIL_SERVER_PORT,
    secure: env.EMAIL_SERVER_PORT === 465,
    auth: {
      user: env.EMAIL_SERVER_USER,
      pass: env.EMAIL_SERVER_PASSWORD,
    },
  });

  try {
    await transporter.sendMail({
      from: env.EMAIL_FROM,
      to: env.SUPPORT_EMAIL,
      replyTo:
        session.user.email &&
        session.user.email.includes("@")
          ? session.user.email
          : undefined,
      subject: `[HUMANET] ${issueTypeLabel}: ${parsed.data.subject}`,
      text: [
        "Nowe zgłoszenie HUMANET",
        "",
        `Kategoria: ${issueTypeLabel}`,
        `Temat: ${parsed.data.subject}`,
        `Użytkownik: ${userName}`,
        `E-mail: ${userEmail}`,
        `ID użytkownika: ${userId}`,
        `Strona: ${parsed.data.pageUrl || "Nie podano"}`,
        "",
        "Opis problemu:",
        parsed.data.message,
        "",
        "Dane techniczne:",
        `IP: ${requestIp}`,
        `User-Agent: ${userAgent}`,
      ].join("\n"),
      html: `
        <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #171717;">
          <h1 style="font-size: 22px; margin-bottom: 24px;">
            Nowe zgłoszenie HUMANET
          </h1>

          <table style="border-collapse: collapse; width: 100%; max-width: 720px;">
            <tbody>
              <tr>
                <td style="padding: 8px 16px 8px 0; font-weight: 600;">
                  Kategoria
                </td>
                <td style="padding: 8px 0;">
                  ${escapeHtml(issueTypeLabel)}
                </td>
              </tr>

              <tr>
                <td style="padding: 8px 16px 8px 0; font-weight: 600;">
                  Temat
                </td>
                <td style="padding: 8px 0;">
                  ${escapeHtml(parsed.data.subject)}
                </td>
              </tr>

              <tr>
                <td style="padding: 8px 16px 8px 0; font-weight: 600;">
                  Użytkownik
                </td>
                <td style="padding: 8px 0;">
                  ${escapeHtml(userName)}
                </td>
              </tr>

              <tr>
                <td style="padding: 8px 16px 8px 0; font-weight: 600;">
                  E-mail
                </td>
                <td style="padding: 8px 0;">
                  ${escapeHtml(userEmail)}
                </td>
              </tr>

              <tr>
                <td style="padding: 8px 16px 8px 0; font-weight: 600;">
                  ID użytkownika
                </td>
                <td style="padding: 8px 0;">
                  ${escapeHtml(userId)}
                </td>
              </tr>

              <tr>
                <td style="padding: 8px 16px 8px 0; font-weight: 600;">
                  Strona
                </td>
                <td style="padding: 8px 0;">
                  ${escapeHtml(
                    parsed.data.pageUrl || "Nie podano",
                  )}
                </td>
              </tr>
            </tbody>
          </table>

          <h2 style="font-size: 17px; margin-top: 28px;">
            Opis problemu
          </h2>

          <div style="
            white-space: pre-wrap;
            padding: 16px;
            background: #f6f7f8;
            border-radius: 12px;
          ">
            ${escapeHtml(parsed.data.message)}
          </div>

          <h2 style="font-size: 17px; margin-top: 28px;">
            Dane techniczne
          </h2>

          <p>
            <strong>IP:</strong>
            ${escapeHtml(requestIp)}
            <br />

            <strong>User-Agent:</strong>
            ${escapeHtml(userAgent)}
          </p>
        </div>
      `,
    });

    return {
      status: "success",
      message:
        "Zgłoszenie zostało wysłane. Odpowiemy na adres e-mail przypisany do Twojego konta.",
    };
  } catch (error) {
    console.error("[support-request] Mail delivery failed", {
      userId,
      error:
        error instanceof Error
          ? error.message
          : "Unknown mail error",
    });

    return {
      status: "error",
      message:
        "Nie udało się wysłać zgłoszenia. Wpisane informacje pozostały w formularzu — możesz spróbować ponownie.",
      values: parsed.data,
    };
  }
}