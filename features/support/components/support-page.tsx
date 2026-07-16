import {
  Bug,
  LifeBuoy,
  Mail,
  ShieldCheck,
} from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { PageHeader } from "@/shared/ui";

import { SupportForm } from "./support-form";

export function SupportPage() {
  return (
    <div className="space-y-8">
      <PageHeader
        title="Zgłoś problem"
        description="Opisz trudność, którą napotkałeś podczas korzystania z HUMANET. Dołączymy podstawowy kontekst techniczny, aby sprawniej znaleźć przyczynę."
      />

      <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <Card>
          <CardContent className="p-6 md:p-8">
            <SupportForm />
          </CardContent>
        </Card>

        <aside className="space-y-4">
          <SupportInfoCard
            icon={<Bug size={18} />}
            title="Opisz kroki"
            description="Napisz, co zrobiłeś bezpośrednio przed pojawieniem się problemu."
          />

          <SupportInfoCard
            icon={<LifeBuoy size={18} />}
            title="Podaj oczekiwany efekt"
            description="Wyjaśnij, co według Ciebie powinno się wydarzyć."
          />

          <SupportInfoCard
            icon={<ShieldCheck size={18} />}
            title="Chroń poufne dane"
            description="Nie przesyłaj haseł, danych kart, tokenów ani pełnych wyników badań."
          />

          <SupportInfoCard
            icon={<Mail size={18} />}
            title="Odpowiedź e-mail"
            description="Odpowiemy na adres przypisany do Twojego konta HUMANET."
          />
        </aside>
      </div>
    </div>
  );
}

function SupportInfoCard({
  icon,
  title,
  description,
}: {
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-2xl border bg-card p-5 shadow-sm">
      <div className="flex gap-3">
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-muted text-foreground">
          {icon}
        </div>

        <div>
          <h2 className="text-sm font-semibold">
            {title}
          </h2>

          <p className="mt-1 text-sm leading-6 text-muted-foreground">
            {description}
          </p>
        </div>
      </div>
    </div>
  );
}