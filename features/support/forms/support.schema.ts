import { z } from "zod";

export const supportIssueTypeSchema = z.enum([
  "technical",
  "payment",
  "report",
  "assessment",
  "account",
  "other",
]);

export const supportFormSchema = z.object({
  issueType: supportIssueTypeSchema,
  subject: z
    .string()
    .trim()
    .min(5, "Temat powinien zawierać co najmniej 5 znaków.")
    .max(160, "Temat może zawierać maksymalnie 160 znaków."),
  message: z
    .string()
    .trim()
    .min(20, "Opisz problem nieco dokładniej — minimum 20 znaków.")
    .max(5000, "Opis może zawierać maksymalnie 5000 znaków."),
  pageUrl: z
    .string()
    .trim()
    .max(2000)
    .optional()
    .or(z.literal("")),
});

export type SupportFormInput =
  z.infer<typeof supportFormSchema>;

export type SupportFormValues = {
  issueType: string;
  subject: string;
  message: string;
  pageUrl?: string;
};

export type SupportFormState =
  | {
      status: "idle";
      message?: undefined;
      fieldErrors?: undefined;
      values?: undefined;
    }
  | {
      status: "success";
      message: string;
      fieldErrors?: undefined;
      values?: undefined;
    }
  | {
      status: "error";
      message: string;
      fieldErrors?: Partial<
        Record<keyof SupportFormInput, string[]>
      >;
      values: SupportFormValues;
    };

export const initialSupportFormState: SupportFormState = {
  status: "idle",
};