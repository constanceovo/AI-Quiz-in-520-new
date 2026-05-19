const questions = window.REVIEW_QUESTIONS || [];
const storageKey = "review-site-134-177-progress-v1";

const els = {
  scoreRing: document.getElementById("scoreRing"),
  scorePercent: document.getElementById("scorePercent"),
  scoreText: document.getElementById("scoreText"),
  answeredCount: document.getElementById("answeredCount"),
  correctCount: document.getElementById("correctCount"),
  wrongCount: document.getElementById("wrongCount"),
  questionMap: document.getElementById("questionMap"),
  progressBar: document.getElementById("progressBar"),
  questionNumber: document.getElementById("questionNumber"),
  sourcePage: document.getElementById("sourcePage"),
  categoryTag: document.getElementById("categoryTag"),
  questionText: document.getElementById("questionText"),
  options: document.getElementById("options"),
  feedback: document.getElementById("feedback"),
  prevButton: document.getElementById("prevButton"),
  nextButton: document.getElementById("nextButton"),
  resetButton: document.getElementById("resetButton"),
  filters: [...document.querySelectorAll(".filter")]
};

const letters = ["A", "B", "C", "D"];

let state = loadState();

function loadState() {
  try {
    const saved = JSON.parse(localStorage.getItem(storageKey));
    if (saved && typeof saved === "object") {
      return {
        currentId: saved.currentId || questions[0]?.id,
        filter: saved.filter || "all",
        answers: saved.answers || {}
      };
    }
  } catch (error) {
    localStorage.removeItem(storageKey);
  }

  return {
    currentId: questions[0]?.id,
    filter: "all",
    answers: {}
  };
}

function saveState() {
  localStorage.setItem(storageKey, JSON.stringify(state));
}

function filteredQuestions() {
  if (state.filter === "all") return questions;
  if (state.filter === "wrong") {
    return questions.filter((question) => {
      const selected = state.answers[question.id];
      return selected !== undefined && selected !== question.answer;
    });
  }
  return questions.filter((question) => question.category === state.filter);
}

function currentQuestion() {
  const visible = filteredQuestions();
  let current = visible.find((question) => question.id === state.currentId);
  if (!current) {
    current = visible[0] || questions[0];
    state.currentId = current?.id;
    saveState();
  }
  return current;
}

function stats() {
  const answered = questions.filter((question) => state.answers[question.id] !== undefined);
  const correct = answered.filter((question) => state.answers[question.id] === question.answer);
  const wrong = answered.length - correct.length;
  return { answered: answered.length, correct: correct.length, wrong };
}

function render() {
  const visible = filteredQuestions();
  const question = currentQuestion();

  renderStats();
  renderFilters();
  renderMap(visible);

  if (!question || visible.length === 0) {
    renderEmpty();
    return;
  }

  const visibleIndex = visible.findIndex((item) => item.id === question.id);
  const selected = state.answers[question.id];
  const answered = selected !== undefined;

  els.progressBar.style.width = `${((visibleIndex + 1) / visible.length) * 100}%`;
  els.questionNumber.textContent = `Question ${visibleIndex + 1} / ${visible.length}`;
  els.sourcePage.textContent = `Page ${question.page}`;
  els.categoryTag.textContent = question.category;
  els.questionText.textContent = question.question;

  els.options.innerHTML = "";
  question.options.forEach((option, index) => {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "option-button";
    button.innerHTML = `
      <span class="option-letter">${letters[index]}</span>
      <span class="option-text">${escapeHtml(option)}</span>
    `;

    if (answered) {
      if (index === question.answer) button.classList.add("is-correct");
      if (index === selected && selected !== question.answer) button.classList.add("is-wrong");
      if (index === selected) button.classList.add("is-selected");
    }

    button.addEventListener("click", () => answerQuestion(question.id, index));
    els.options.appendChild(button);
  });

  renderFeedback(question, selected);

  els.prevButton.disabled = visibleIndex <= 0;
  els.nextButton.disabled = visibleIndex >= visible.length - 1;
}

function renderEmpty() {
  els.progressBar.style.width = "0%";
  els.questionNumber.textContent = "Question 0 / 0";
  els.sourcePage.textContent = "Page -";
  els.categoryTag.textContent = state.filter;
  els.questionText.textContent = "No questions in this filter";
  els.options.innerHTML = '<div class="empty-state">If you have not answered anything incorrectly yet, the Wrong filter will be empty. Switch back to All to continue reviewing.</div>';
  els.feedback.hidden = true;
  els.prevButton.disabled = true;
  els.nextButton.disabled = true;
}

function renderStats() {
  const currentStats = stats();
  const percent = currentStats.answered === 0
    ? 0
    : Math.round((currentStats.correct / currentStats.answered) * 100);
  const degrees = Math.round((percent / 100) * 360);

  els.answeredCount.textContent = currentStats.answered;
  els.correctCount.textContent = currentStats.correct;
  els.wrongCount.textContent = currentStats.wrong;
  els.scoreText.textContent = `${currentStats.correct} / ${currentStats.answered}`;
  els.scorePercent.textContent = `${percent}%`;
  els.scoreRing.style.background = `conic-gradient(var(--accent) ${degrees}deg, #e7e1d5 ${degrees}deg)`;
}

function renderFilters() {
  els.filters.forEach((button) => {
    button.classList.toggle("is-active", button.dataset.filter === state.filter);
  });
}

function renderMap(visible) {
  els.questionMap.innerHTML = "";
  visible.forEach((question, index) => {
    const selected = state.answers[question.id];
    const button = document.createElement("button");
    button.type = "button";
    button.className = "map-button";
    button.textContent = index + 1;
    button.title = `Question ${index + 1}, source Page ${question.page}`;
    button.classList.toggle("is-current", question.id === state.currentId);
    if (selected !== undefined) {
      button.classList.add(selected === question.answer ? "is-correct" : "is-wrong");
    }
    button.addEventListener("click", () => {
      state.currentId = question.id;
      saveState();
      render();
    });
    els.questionMap.appendChild(button);
  });
}

function renderFeedback(question, selected) {
  if (selected === undefined) {
    els.feedback.hidden = true;
    els.feedback.className = "feedback";
    els.feedback.innerHTML = "";
    return;
  }

  const correct = selected === question.answer;
  els.feedback.hidden = false;
  els.feedback.className = `feedback ${correct ? "correct" : "wrong"}`;
  els.feedback.innerHTML = `
    <strong>${correct ? "Correct" : `Incorrect. The correct answer is ${letters[question.answer]}`}</strong>
    <span>${escapeHtml(question.explanation)}</span>
  `;
}

function answerQuestion(questionId, selectedIndex) {
  state.answers[questionId] = selectedIndex;
  saveState();
  render();
}

function go(delta) {
  const visible = filteredQuestions();
  const index = visible.findIndex((question) => question.id === state.currentId);
  const next = visible[index + delta];
  if (!next) return;
  state.currentId = next.id;
  saveState();
  render();
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

els.prevButton.addEventListener("click", () => go(-1));
els.nextButton.addEventListener("click", () => go(1));

els.filters.forEach((button) => {
  button.addEventListener("click", () => {
    state.filter = button.dataset.filter;
    const first = filteredQuestions()[0];
    state.currentId = first?.id || questions[0]?.id;
    saveState();
    render();
  });
});

els.resetButton.addEventListener("click", () => {
  const confirmed = window.confirm("Clear all answer records?");
  if (!confirmed) return;
  state.answers = {};
  state.currentId = filteredQuestions()[0]?.id || questions[0]?.id;
  saveState();
  render();
});

document.addEventListener("keydown", (event) => {
  const question = currentQuestion();
  if (!question) return;

  if (event.key === "ArrowLeft") go(-1);
  if (event.key === "ArrowRight") go(1);

  const optionIndex = Number(event.key) - 1;
  if (optionIndex >= 0 && optionIndex < question.options.length) {
    answerQuestion(question.id, optionIndex);
  }
});

render();
