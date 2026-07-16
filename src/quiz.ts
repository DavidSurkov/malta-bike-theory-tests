export type QuizOption = {
  text: string;
  correct: boolean;
  image: string;
};

export type QuizQuestion = {
  id: string;
  code: string;
  category: string;
  prompt: string;
  options: QuizOption[];
  visual: string;
};

export const shuffleQuestions = <Question,>(
  sourceQuestions: readonly Question[],
): Question[] => {
  const questions = [...sourceQuestions];

  for (let index = questions.length - 1; index > 0; index--) {
    const randomIndex = Math.floor(Math.random() * (index + 1));
    const currentQuestion = questions[index];
    const randomQuestion = questions[randomIndex];

    if (currentQuestion === undefined || randomQuestion === undefined) {
      continue;
    }

    questions[index] = randomQuestion;
    questions[randomIndex] = currentQuestion;
  }

  return questions;
};

export const isAnswerCorrect = (
  question: QuizQuestion,
  selectedOptions: readonly number[],
): boolean => {
  const selectedOptionSet = new Set(selectedOptions);

  return question.options.every(
    (option, optionIndex) =>
      option.correct === selectedOptionSet.has(optionIndex),
  );
};
