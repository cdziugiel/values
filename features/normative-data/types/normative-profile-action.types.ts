import type {
  NormativeProfileRewardDto,
  NormativeProfileValuesDto,
} from "./normative-profile.types";

export type NormativeProfileFormValues =
  NormativeProfileValuesDto & {
    consentAccepted: boolean;
  };

export type CompleteNormativeProfileActionState = {
  status: "idle" | "success" | "error";
  message: string;
  fieldErrors?: Record<string, string[]>;
  values?: NormativeProfileFormValues;
  formVersion: number;
  profile?: NormativeProfileValuesDto;
  reward?: NormativeProfileRewardDto | null;
};

export type ClaimNormativeRewardActionState = {
  status: "idle" | "success" | "error";
  message: string;
  reward?: NormativeProfileRewardDto | null;
};

export const initialCompleteNormativeProfileActionState: CompleteNormativeProfileActionState =
  {
    status: "idle",
    message: "",
    formVersion: 0,
  };

export const initialClaimNormativeRewardActionState: ClaimNormativeRewardActionState =
  {
    status: "idle",
    message: "",
  };
