"use client";

import {
  useActionState,
  useEffect,
  useState,
} from "react";
import {
  AlertCircle,
  CheckCircle2,
  Loader2,
  Send,
} from "lucide-react";

import {
  Alert,
  AlertDescription,
} from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

import { submitSupportRequestAction } from "../api/support.actions";
import {
  initialSupportFormState,
  type SupportFormInput,
  type SupportFormState,
} from "../forms/support.schema";

type SupportFormValues = Pick<
  SupportFormInput,
  "issueType" | "subject" | "message"
>;

const INITIAL_VALUES: SupportFormValues = {
  issueType: "technical",
  subject: "",
  message: "",
};

function FieldError({
  errors,
}: {
  errors?: string[];
}) {
  if (!errors?.length) {
    return null;
  }

  return (
    <p className="text-sm text-destructive">
      {errors[0]}
    </p>
  );
}

export function SupportForm() {
  const [pageUrl, setPageUrl] = useState("");
  const [values, setValues] =
    useState<SupportFormValues>(INITIAL_VALUES);

  const [state, formAction, pending] = useActionState<
    SupportFormState,
    FormData
  >(
    submitSupportRequestAction,
    initialSupportFormState,
  );

  useEffect(() => {
    setPageUrl(window.location.href);
  }, []);

  useEffect(() => {
    if (state.status === "success") {
      setValues(INITIAL_VALUES);
      return;
    }

    if (state.status === "error" && state.values) {
      setValues({
        issueType:
          state.values.issueType === "technical" ||
          state.values.issueType === "payment" ||
          state.values.issueType === "report" ||
          state.values.issueType === "assessment" ||
          state.values.issueType === "account" ||
          state.values.issueType === "other"
            ? state.values.issueType
            : "technical",
        subject: state.values.subject,
        message: state.values.message,
      });
    }
  }, [state]);

  return (
    <form
      action={formAction}
      className="space-y-6"
    >
      <input
        type="hidden"
        name="pageUrl"
        value={pageUrl}
      />

      {state.status === "success" ? (
        <Alert className="border-emerald-200 bg-emerald-50 text-emerald-900">
          <CheckCircle2 size={18} />

          <AlertDescription>
            {state.message}
          </AlertDescription>
        </Alert>
      ) : null}

      {state.status === "error" ? (
        <Alert variant="destructive">
          <AlertCircle size={18} />

          <AlertDescription>
            {state.message}
          </AlertDescription>
        </Alert>
      ) : null}

      <div className="space-y-2">
        <Label htmlFor="issueType">
          Czego dotyczy problem?
        </Label>

        <select
          id="issueType"
          name="issueType"
          value={values.issueType}
          onChange={(event) => {
            setValues((current) => ({
              ...current,
              issueType:
                event.target
                  .value as SupportFormValues["issueType"],
            }));
          }}
          disabled={pending}
          className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-ring disabled:cursor-not-allowed disabled:opacity-50"
        >
          <option value="technical">
            Problem techniczny
          </option>

          <option value="payment">
            Płatność
          </option>

          <option value="report">
            Raport
          </option>

          <option value="assessment">
            Badanie lub kwestionariusz
          </option>

          <option value="account">
            Konto lub logowanie
          </option>

          <option value="other">
            Inny temat
          </option>
        </select>

        <FieldError
          errors={state.fieldErrors?.issueType}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="subject">
          Temat
        </Label>

        <Input
          id="subject"
          name="subject"
          value={values.subject}
          onChange={(event) => {
            setValues((current) => ({
              ...current,
              subject: event.target.value,
            }));
          }}
          placeholder="Krótko opisz problem"
          maxLength={160}
          disabled={pending}
          required
        />

        <FieldError
          errors={state.fieldErrors?.subject}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor="message">
          Opis problemu
        </Label>

        <Textarea
          id="message"
          name="message"
          value={values.message}
          onChange={(event) => {
            setValues((current) => ({
              ...current,
              message: event.target.value,
            }));
          }}
          placeholder="Napisz, co się wydarzyło, czego oczekiwałeś i co pojawiło się zamiast tego."
          rows={8}
          maxLength={5000}
          disabled={pending}
          required
        />

        <div className="flex items-start justify-between gap-4">
          <p className="text-xs leading-5 text-muted-foreground">
            Nie wpisuj haseł, danych płatniczych,
            pełnych wyników psychometrycznych ani
            innych poufnych informacji.
          </p>

          <p className="shrink-0 text-xs text-muted-foreground">
            {values.message.length}/5000
          </p>
        </div>

        <FieldError
          errors={state.fieldErrors?.message}
        />
      </div>

      <div className="flex flex-col-reverse gap-3 border-t pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs leading-5 text-muted-foreground">
          Do zgłoszenia automatycznie dołączymy adres
          bieżącej strony oraz podstawowe dane techniczne
          przeglądarki.
        </p>

        <Button
          type="submit"
          disabled={pending}
          className="min-w-40"
        >
          {pending ? (
            <>
              <Loader2
                className="animate-spin"
                size={16}
              />
              Wysyłanie…
            </>
          ) : (
            <>
              <Send size={16} />
              Wyślij zgłoszenie
            </>
          )}
        </Button>
      </div>
    </form>
  );
}