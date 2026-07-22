import { useEffect, useReducer } from "react";

import { QUESTIONS } from "./questions";
import { isAnswerCorrect, shuffleQuestions, type QuizQuestion } from "./quiz";

type QuizMode = "random" | "consecutive" | "test";
type Result = boolean | null;

type QuizState = {
  mode: QuizMode;
  questions: QuizQuestion[];
  answers: number[][];
  results: Result[];
  questionIndex: number;
  remainingSeconds: number;
  isHintVisible: boolean;
  isFinished: boolean;
  error: string;
};

type QuizAction =
  | { type: "reset" }
  | { type: "changeMode"; mode: QuizMode }
  | { type: "select"; optionIndex: number; allowsMultiple: boolean }
  | { type: "navigate"; questionIndex: number }
  | { type: "next" }
  | { type: "tick" }
  | { type: "toggleHint" };

const TEST_QUESTION_COUNT = 35;
const TEST_DURATION_SECONDS = 45 * 60;
const MAX_WRONG_ANSWERS = 5;

const createAnswers = (count: number): number[][] =>
  Array.from({ length: count }, () => []);

const createResults = (count: number): Result[] =>
  Array.from({ length: count }, () => null);

const getQuestions = (mode: QuizMode): QuizQuestion[] => {
  if (mode === "consecutive") return [...QUESTIONS];

  const questions = shuffleQuestions(QUESTIONS);
  return mode === "test" ? questions.slice(0, TEST_QUESTION_COUNT) : questions;
};

const createQuizState = (mode: QuizMode = "random"): QuizState => {
  const questions = getQuestions(mode);

  return {
    mode,
    questions,
    answers: createAnswers(questions.length),
    results: createResults(questions.length),
    questionIndex: 0,
    remainingSeconds: mode === "test" ? TEST_DURATION_SECONDS : 0,
    isHintVisible: false,
    isFinished: false,
    error: "",
  };
};

const gradeQuestion = (
  state: QuizState,
  questionIndex: number,
): boolean => {
  const question = state.questions[questionIndex];
  if (question === undefined) return false;

  return isAnswerCorrect(question, state.answers[questionIndex] ?? []);
};

const gradeCurrentQuestion = (state: QuizState): Result[] =>
  state.results.map((result, index) =>
    index === state.questionIndex ? gradeQuestion(state, index) : result,
  );

const gradeAllQuestions = (state: QuizState): Result[] =>
  state.questions.map((_, index) => gradeQuestion(state, index));

const quizReducer = (state: QuizState, action: QuizAction): QuizState => {
  switch (action.type) {
    case "reset":
      return createQuizState(state.mode);

    case "changeMode":
      return createQuizState(action.mode);

    case "toggleHint":
      return { ...state, isHintVisible: !state.isHintVisible };

    case "select": {
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
    }

    case "navigate":
      return {
        ...state,
        results: gradeCurrentQuestion(state),
        questionIndex: action.questionIndex,
        isHintVisible: false,
        error: "",
      };

    case "next": {
      if (state.answers[state.questionIndex]?.length === 0) {
        return {
          ...state,
          error: "Choose at least one answer before continuing.",
        };
      }

      const isLastQuestion = state.questionIndex === state.questions.length - 1;
      return {
        ...state,
        results: isLastQuestion
          ? gradeAllQuestions(state)
          : gradeCurrentQuestion(state),
        questionIndex: isLastQuestion
          ? state.questionIndex
          : state.questionIndex + 1,
        isHintVisible: false,
        isFinished: isLastQuestion,
        error: "",
      };
    }

    case "tick":
      if (state.mode !== "test" || state.isFinished) return state;
      if (state.remainingSeconds <= 1) {
        return {
          ...state,
          results: gradeAllQuestions(state),
          remainingSeconds: 0,
          isFinished: true,
        };
      }
      return { ...state, remainingSeconds: state.remainingSeconds - 1 };

    default:
      throw new Error("Unhandled quiz action");
  }
};

const getResultClass = (result: Result): string => {
  if (result === true) return "correct";
  if (result === false) return "incorrect";
  return "";
};

const formatTime = (seconds: number): string => {
  const minutes = Math.floor(seconds / 60);
  return `${minutes}:${String(seconds % 60).padStart(2, "0")}`;
};

export const App = () => {
  const [state, dispatch] = useReducer(quizReducer, undefined, () =>
    createQuizState(),
  );
  const {
    mode,
    questions,
    answers,
    results,
    questionIndex,
    remainingSeconds,
    isHintVisible,
    isFinished,
    error,
  } = state;

  useEffect(() => {
    if (mode !== "test" || isFinished) return;

    const timer = window.setInterval(() => dispatch({ type: "tick" }), 1000);
    return () => window.clearInterval(timer);
  }, [mode, isFinished]);

  const question = questions[questionIndex];
  const selectedOptions = answers[questionIndex] ?? [];
  const selectedOptionSet = new Set(selectedOptions);
  const previousResult = results[questionIndex - 1] ?? null;

  if (question === undefined) {
    throw new Error("Question index is out of range");
  }

  const hasProgress = answers.some((answer) => answer.length > 0);
  const confirmRestart = (message: string): boolean =>
    !hasProgress || isFinished || window.confirm(message);

  const handleRestart = () => {
    if (confirmRestart("Restart this quiz?")) dispatch({ type: "reset" });
  };

  const handleModeChange = (nextMode: QuizMode) => {
    if (nextMode === mode) return;
    if (confirmRestart("Change mode and restart the quiz?")) {
      dispatch({ type: "changeMode", mode: nextMode });
    }
  };

  const score = results.filter((result) => result === true).length;
  const wrongAnswers = questions.length - score;
  const passed = wrongAnswers <= MAX_WRONG_ANSWERS;
  const progress = isFinished
    ? 100
    : ((questionIndex + 1) / questions.length) * 100;
  const correctOptions = question.options.filter((option) => option.correct);
  const allowsMultiple = correctOptions.length > 1;
  const showFeedback = mode !== "test";

  return (
    <main className="app">
      <header className="top">
        <div className="top-row">
          <h1>Malta Motorcycle Theory Test</h1>
          <div className="quiz-controls">
            <label>
              <span>Mode</span>
              <select
                value={mode}
                onChange={(event) =>
                  handleModeChange(event.target.value as QuizMode)
                }
              >
                <option value="random">Random practice</option>
                <option value="consecutive">Consecutive practice</option>
                <option value="test">Timed test</option>
              </select>
            </label>
            <button className="shuffle" type="button" onClick={handleRestart}>
              Restart
            </button>
          </div>
        </div>
        <div className="progress" aria-hidden="true">
          <span style={{ width: `${progress}%` }} />
        </div>
      </header>

      <section className="content">
        {isFinished ? (
          <div className="result">
            <p>{mode === "test" ? "Test complete" : "Practice complete"}</p>
            {mode === "test" && (
              <h2 className={passed ? "pass" : "fail"}>
                {passed ? "Passed" : "Not passed"}
              </h2>
            )}
            <strong>
              {score} / {questions.length}
            </strong>
            <p>
              {wrongAnswers} wrong · {Math.round((score / questions.length) * 100)}%
              correct
            </p>
            {mode === "test" && (
              <p>You can make up to {MAX_WRONG_ANSWERS} mistakes to pass.</p>
            )}
            <button type="button" onClick={() => dispatch({ type: "reset" })}>
              Try again
            </button>
            {mode === "test" && (
              <ol className="answer-review">
                {questions.map((reviewQuestion, index) => (
                  <li
                    key={reviewQuestion.id}
                    className={getResultClass(results[index] ?? false)}
                  >
                    <span>{reviewQuestion.prompt}</span>
                    <strong>
                      {results[index] ? "Correct" : "Wrong"}
                    </strong>
                  </li>
                ))}
              </ol>
            )}
          </div>
        ) : (
          <>
            <div className="question-heading">
              <div className="meta">
                <span className="tag">{question.code}</span>
                <span className="tag">{question.category}</span>
              </div>
              <span>
                Question {questionIndex + 1} of {questions.length}
              </span>
              {mode === "test" && (
                <time className="timer" aria-label="Time remaining">
                  {formatTime(remainingSeconds)}
                </time>
              )}
            </div>

            <article
              className={`question-card previous-${
                showFeedback ? getResultClass(previousResult) : ""
              }`}
            >
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

              {showFeedback && isHintVisible && (
                <div className="hint">
                  <strong>
                    Correct answer{correctOptions.length > 1 ? "s" : ""}:
                  </strong>{" "}
                  {correctOptions.map((option) => option.text).join(", ")}
                </div>
              )}
            </article>

            <div className="actions">
              {showFeedback && (
                <>
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
                </>
              )}
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

            {showFeedback && (
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
            )}
          </>
        )}
      </section>
    </main>
  );
};
