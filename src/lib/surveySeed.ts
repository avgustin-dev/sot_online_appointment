import type { SurveyQuestion } from "./types";
import { catalog, cloneCatalog } from "./catalog";

/** Дефолты опросника — из content/survey.json, для CMS-кнопки «сбросить к исходным». */
export const SEED_SURVEY_META = catalog.survey.meta;
export const SEED_SURVEY_QUESTIONS: SurveyQuestion[] = cloneCatalog(
  catalog.survey.questions
);
