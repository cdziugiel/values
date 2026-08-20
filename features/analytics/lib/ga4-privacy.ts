// @humanet-ga4-mp-v1
const FORBIDDEN_ANALYTICS_KEYS = new Set([
  "email",
  "phone",
  "first_name",
  "last_name",
  "full_name",
  "date_of_birth",
  "sex",
  "voivodeship",
  "job_title",
  "assessment_session_id",
  "questionnaire_response_id",
  "user_uuid",
  "respondent_id",
  "answers",
  "raw_answers",
  "scores",
  "dimension_scores",
  "value_system_scores",
  "dominant_value_system",
  "free_text",
  "report_html",
  "report_text",
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

export function findForbiddenAnalyticsParam(
  value: unknown,
  path = "",
): string | null {
  if (Array.isArray(value)) {
    for (let index = 0; index < value.length; index += 1) {
      const found = findForbiddenAnalyticsParam(
        value[index],
        `${path}[${index}]`,
      );
      if (found) return found;
    }
    return null;
  }

  if (!isRecord(value)) return null;

  for (const [key, nested] of Object.entries(value)) {
    const normalized = key.trim().toLowerCase();
    const nextPath = path ? `${path}.${key}` : key;

    if (FORBIDDEN_ANALYTICS_KEYS.has(normalized)) {
      return nextPath;
    }

    const found = findForbiddenAnalyticsParam(nested, nextPath);
    if (found) return found;
  }

  return null;
}
