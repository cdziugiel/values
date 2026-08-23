"use client";

// @humanet-normative-exclusion-v1
import { useState, useTransition, type FormEvent } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";

import { setNormativeProfileExclusionAction } from "../api/normative-admin.actions";

export function NormativeProfileExclusionControl({
  profileId,
  excludedFromNorms,
}: {
  profileId: string;
  excludedFromNorms: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [message, setMessage] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const isRestore = excludedFromNorms;
  const validReason = isRestore || reason.trim().length >= 5;

  function handleOpenChange(nextOpen: boolean) {
    setOpen(nextOpen);
    if (nextOpen) {
      setReason("");
      setMessage(null);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!validReason || pending) return;

    setMessage(null);

    startTransition(async () => {
      const result = await setNormativeProfileExclusionAction({
        profileId,
        intent: isRestore ? "restore" : "exclude",
        reason: isRestore ? undefined : reason,
      });

      if (result.status === "error") {
        setMessage(result.message);
        return;
      }

      setOpen(false);
      setReason("");
      router.refresh();
    });
  }

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogTrigger asChild>
        <Button variant={isRestore ? "outline" : "destructive"}>
          {isRestore ? "Przywróć do analiz" : "Wyłącz z analiz"}
        </Button>
      </DialogTrigger>

      <DialogContent className="sm:max-w-lg">
        <form onSubmit={handleSubmit} className="space-y-4">
          <DialogHeader>
            <DialogTitle>
              {isRestore
                ? "Przywrócić rekord do analiz normatywnych?"
                : "Wyłączyć rekord z analiz normatywnych?"}
            </DialogTitle>
            <DialogDescription>
              {isRestore
                ? "Rekord ponownie będzie traktowany jako poprawna obserwacja w eksportach i dalszych analizach normatywnych."
                : "Rekord pozostanie w rejestrze i audycie, ale nie będzie traktowany jako poprawna obserwacja w eksportach i dalszych analizach normatywnych."}
            </DialogDescription>
          </DialogHeader>

          {!isRestore ? (
            <div className="space-y-2">
              <label htmlFor="normative-exclusion-reason" className="text-sm font-medium">
                Powód wyłączenia
              </label>
              <Textarea
                id="normative-exclusion-reason"
                value={reason}
                onChange={(event) => setReason(event.target.value)}
                placeholder="Np. niewiarygodna data urodzenia / ewidentnie nierzetelne dane"
                minLength={5}
                maxLength={500}
                required
                disabled={pending}
                autoFocus
              />
              <p className="text-xs text-muted-foreground">
                Powód zostanie zapisany przy rekordzie oraz w audycie systemowym.
              </p>
            </div>
          ) : null}

          {message ? (
            <p className="text-sm text-destructive" role="alert">
              {message}
            </p>
          ) : null}

          <DialogFooter>
            <DialogClose asChild>
              <Button type="button" variant="outline" disabled={pending}>
                Anuluj
              </Button>
            </DialogClose>
            <Button
              type="submit"
              variant={isRestore ? "default" : "destructive"}
              disabled={!validReason || pending}
            >
              {pending
                ? "Zapisywanie…"
                : isRestore
                  ? "Przywróć do analiz"
                  : "Wyłącz z analiz"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
