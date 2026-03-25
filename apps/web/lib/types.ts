export type QuestionType =
  | 'single_choice'
  | 'multi_choice'
  | 'text'
  | 'scale'
  | 'date';

export interface SurveyQuestion {
  id: string;
  type: QuestionType;
  label: string;
  options: string[] | null;
  order: number;
  required: boolean;
}

export interface SurveySection {
  id: string;
  title: string;
  description?: string;
  questionIds: string[];
}

export interface SurveySchema {
  sections: SurveySection[];
}

export interface SurveyData {
  id: string;
  title: string;
  sections: SurveySection[];
  questions: SurveyQuestion[];
}

export interface AnswerEntry {
  questionId: string;
  value: string;
}
