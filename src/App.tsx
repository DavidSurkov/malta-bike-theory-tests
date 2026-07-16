import { useReducer } from "react";

import { QUESTIONS } from "./questions";
import { isAnswerCorrect, shuffleQuestions, type QuizQuestion } from "./quiz";

type Result = boolean | null;

type QuizState = {
  questions: QuizQuestion[];
  answers: number[][];
  results: Result[];
  questionIndex: number;
  isHintVisible: boolean;
  isFinished: boolean;
  error: string;
};

type QuizAction =
  | { type: "reset" }
  | { type: "select"; optionIndex: number; allowsMultiple: boolean }
  | { type: "navigate"; questionIndex: number }
  | { type: "next" }
  | { type: "toggleHint" };

const createAnswers = (count: number): number[][] =>
  Array.from({ length: count }, () => []);

const createResults = (count: number): Result[] =>
  Array.from({ length: count }, () => null);

const createQuizState = (): QuizState => ({
  questions: shuffleQuestions(QUESTIONS),
  answers: createAnswers(QUESTIONS.length),
  results: createResults(QUESTIONS.length),
  questionIndex: 0,
  isHintVisible: false,
  isFinished: false,
  error: "",
});

const gradeCurrentQuestion = (state: QuizState): Result[] => {
  const question = state.questions[state.questionIndex];
  const selectedOptions = state.answers[state.questionIndex] ?? [];

  if (question === undefined || selectedOptions.length === 0) {
    return state.results;
  }

  return state.results.map((currentResult, index) =>
    index === state.questionIndex
      ? isAnswerCorrect(question, selectedOptions)
      : currentResult,
  );
};

const quizReducer = (state: QuizState, action: QuizAction): QuizState => {
  switch (action.type) {
    case "reset":
      return createQuizState();

    case "toggleHint":
      return { ...state, isHintVisible: !state.isHintVisible };

    case "select":
      const selectedOptions = state.answers[state.questionIndex] ?? [];
      const selectedOptionSet = new Set(selectedOptions);
      const nextSelection = action.allowsMultiple
        ? selectedOptionSet.has(action.optionIndex)
          ? selectedOptions.filter((index) => index !== action.optionIndex)
          : [...selectedOptions, action.optionIndex]
        : [action.optionIndex];

      return {
        ...state,
        answers: state.answers.map((answer, index) =>
          index === state.questionIndex ? nextSelection : answer,
        ),
        results: state.results.map((result, index) =>
          index === state.questionIndex ? null : result,
        ),
        error: "",
      };

    case "navigate":
      return {
        ...state,
        results: gradeCurrentQuestion(state),
        questionIndex: action.questionIndex,
        isHintVisible: false,
        error: "",
      };

    case "next":
      if (state.answers[state.questionIndex]?.length === 0) {
        return {
          ...state,
          error: "Choose at least one answer before continuing.",
        };
      }

      const isLastQuestion = state.questionIndex === state.questions.length - 1;
      return {
        ...state,
        results: gradeCurrentQuestion(state),
        questionIndex: isLastQuestion
          ? state.questionIndex
          : state.questionIndex + 1,
        isHintVisible: false,
        isFinished: isLastQuestion,
        error: "",
      };

    default:
      throw new Error("Default case shoul never happen");
  }
};

const getResultClass = (result: Result): string => {
  if (result === true) return "correct";
  if (result === false) return "incorrect";
  return "";
};

export const App = () => {
  const [state, dispatch] = useReducer(quizReducer, undefined, createQuizState);
  const {
    questions,
    answers,
    results,
    questionIndex,
    isHintVisible,
    isFinished,
    error,
  } = state;
  const question = questions[questionIndex];
  const selectedOptions = answers[questionIndex] ?? [];
  const selectedOptionSet = new Set(selectedOptions);
  const result = results[questionIndex] ?? null;

  if (question === undefined) {
    throw new Error("Question index is out of range");
  }

  const handleShuffle = () => {
    const hasProgress = answers.some((answer) => answer.length > 0);
    if (!hasProgress || window.confirm("Shuffle and restart the test?")) {
      dispatch({ type: "reset" });
    }
  };

  const score = results.filter((answerResult) => answerResult === true).length;
  const progress = isFinished ? 100 : (questionIndex / questions.length) * 100;
  const correctOptions = question.options.filter((option) => option.correct);
  const allowsMultiple = correctOptions.length > 1;

  return (
    <main className="app">
      <header className="top">
        <div className="top-row">
          <h1>Malta Motorcycle Theory Test</h1>
          <button className="shuffle" type="button" onClick={handleShuffle}>
            Shuffle questions
          </button>
        </div>
      </header>

      <section className="content">
        {isFinished ? (
          <div className="result">
            <p>Test complete</p>
            <strong>
              {score} / {questions.length}
            </strong>
            <p>{Math.round((score / questions.length) * 100)}% correct</p>
            <button type="button" onClick={() => dispatch({ type: "reset" })}>
              Shuffle and try again
            </button>
          </div>
        ) : (
          <>
            <div className="meta">
              <span className="tag">{question.code}</span>
              <span className="tag">{question.category}</span>
            </div>

            <article className={`question-card ${getResultClass(result)}`}>
              <h2>{question.prompt}</h2>
              {question.visual && (
                <img
                  className="visual"
                  src={question.visual}
                  alt="Question diagram"
                />
              )}

              <div className="options">
                {question.options.map((option, optionIndex) => (
                  <label
                    className="option"
                    key={`${question.id}-${option.text}`}
                  >
                    <input
                      type={allowsMultiple ? "checkbox" : "radio"}
                      name="answer"
                      value={optionIndex}
                      checked={selectedOptionSet.has(optionIndex)}
                      onChange={() =>
                        dispatch({
                          type: "select",
                          optionIndex,
                          allowsMultiple,
                        })
                      }
                    />
                    <span>
                      {option.image ? (
                        <>
                          <img src={option.image} alt="" />
                          <span className="caption">{option.text}</span>
                        </>
                      ) : (
                        option.text
                      )}
                    </span>
                  </label>
                ))}
              </div>

              {error && (
                <p className="error" role="alert">
                  {error}
                </p>
              )}

              {isHintVisible && (
                <div className="hint">
                  <strong>
                    Correct answer{correctOptions.length > 1 ? "s" : ""}:
                  </strong>{" "}
                  {correctOptions.map((option) => option.text).join(", ")}
                </div>
              )}
            </article>

            <div className="actions">
              <button
                className="secondary"
                type="button"
                disabled={questionIndex === 0}
                onClick={() =>
                  dispatch({
                    type: "navigate",
                    questionIndex: questionIndex - 1,
                  })
                }
              >
                Previous
              </button>
              <button
                className="secondary"
                type="button"
                onClick={() => dispatch({ type: "toggleHint" })}
              >
                {isHintVisible ? "Hide hint" : "Show hint"}
              </button>
              <button
                className="primary"
                type="button"
                onClick={() => dispatch({ type: "next" })}
              >
                {questionIndex === questions.length - 1
                  ? "Finish test"
                  : "Next question"}
              </button>
            </div>

            <details className="status">
              <summary>Question status</summary>
              <nav className="question-nav" aria-label="Questions">
                {questions.map((navQuestion, navIndex) => (
                  <button
                    type="button"
                    key={navQuestion.id}
                    className={`${
                      navIndex === questionIndex ? "current " : ""
                    }${getResultClass(results[navIndex] ?? null)}`}
                    aria-label={`Question ${navIndex + 1}`}
                    aria-current={
                      navIndex === questionIndex ? "step" : undefined
                    }
                    onClick={() =>
                      dispatch({
                        type: "navigate",
                        questionIndex: navIndex,
                      })
                    }
                  >
                    {navIndex + 1}
                  </button>
                ))}
              </nav>
            </details>
          </>
        )}
      </section>
    </main>
  );
};
