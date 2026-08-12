const config = window.APP_CONFIG || {};
const loginPanel = document.querySelector("#loginPanel");
const recordsPanel = document.querySelector("#recordsPanel");
const loginForm = document.querySelector("#adminLoginForm");
const loginMessage = document.querySelector("#loginMessage");
const recordsBody = document.querySelector("#recordsBody");
const detailPanel = document.querySelector("#detailPanel");
const detailList = document.querySelector("#detailList");
const relatedRecords = document.querySelector("#relatedRecords");
const selectAll = document.querySelector("#selectAll");
const exportButton = document.querySelector("#exportButton");
const emailButton = document.querySelector("#emailButton");
const deleteSelectedButton = document.querySelector("#deleteSelectedButton");
const logoutButton = document.querySelector("#logoutButton");
const copyDetailButton = document.querySelector("#copyDetailButton");
const printDetailButton = document.querySelector("#printDetailButton");
const journalForm = document.querySelector("#journalForm");
const testForm = document.querySelector("#testForm");
const closeForm = document.querySelector("#closeForm");
const testTypeSelect = document.querySelector("#testTypeSelect");

const applicantColumns = [
  "고유번호",
  "작성 일시",
  "상담상태",
  "성명",
  "연락처",
  "이메일",
  "나이",
  "직업",
  "현재 업무 근무 기간",
  "상담 내용 키워드",
  "상담 경험 유무",
  "상담을 결정한 이유",
  "가장 심각한 증상",
  "약물 복용 여부",
  "약물 복용 기간",
  "상담을 통해 얻고 싶은 결과",
  "방문 과정",
  "초기 전화상담 동의 여부",
  "상담진행중 전화상담 유료 안내 동의",
  "검사지 선택 사용 여부",
  "초기 선택 검사지",
  "최종상담일",
  "보존상태",
  "이관메모",
];

let records = [];
let activeId = "";
let activeBundle = null;
let testTypes = [];

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function apiRequest(params) {
  return new Promise((resolve, reject) => {
    if (!config.apiUrl) {
      reject(new Error("Google Apps Script 웹앱 URL이 아직 설정되지 않았습니다."));
      return;
    }

    const callbackName = `sheetCallback_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const script = document.createElement("script");
    const url = new URL(config.apiUrl);

    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, typeof value === "string" ? value : JSON.stringify(value));
    });
    url.searchParams.set("callback", callbackName);

    window[callbackName] = (payload) => {
      delete window[callbackName];
      script.remove();
      payload?.ok ? resolve(payload) : reject(new Error(payload?.message || "요청을 처리하지 못했습니다."));
    };

    script.onerror = () => {
      delete window[callbackName];
      script.remove();
      reject(new Error("서버 연결에 실패했습니다. Apps Script 웹 앱 액세스 권한을 '모든 사용자'로 설정해 주세요."));
    };

    script.src = url.toString();
    document.body.appendChild(script);
  });
}

function formObject(form) {
  return Object.fromEntries(new FormData(form).entries());
}

function getToken() {
  return sessionStorage.getItem("hanAdminToken");
}

function setStatus(message, type = "info") {
  loginMessage.textContent = message;
  loginMessage.dataset.type = type;
}

function selectedIds() {
  return [...document.querySelectorAll(".record-check:checked")].map((checkbox) => checkbox.closest("tr").dataset.id);
}

function renderRecords() {
  selectAll.checked = false;
  emailButton.disabled = true;

  if (!records.length) {
    recordsBody.innerHTML = `<tr><td colspan="10" class="empty-cell">저장된 신청 기록이 없습니다.</td></tr>`;
    return;
  }

  recordsBody.innerHTML = records
    .map((record) => `
      <tr data-id="${escapeHtml(record["고유번호"])}">
        <td><input type="checkbox" class="record-check" aria-label="신청 기록 선택" /></td>
        <td>${escapeHtml(record["고유번호"])}</td>
        <td>${escapeHtml(record["상담상태"])}</td>
        <td>${escapeHtml(record["작성 일시"])}</td>
        <td><button class="text-button detail-button" type="button">${escapeHtml(record["성명"])}</button></td>
        <td>${escapeHtml(record["연락처"])}</td>
        <td>${escapeHtml(record["나이"])}</td>
        <td>${escapeHtml(record["직업"])}</td>
        <td>${escapeHtml(record["상담 내용 키워드"])}</td>
        <td>${escapeHtml(record["방문 과정"])}</td>
      </tr>
    `)
    .join("");
}

async function loadRecords() {
  const payload = await apiRequest({ action: "list", token: getToken() });
  records = payload.records || [];
  testTypes = payload.testTypes || testTypes;
  fillTestOptions();
  renderRecords();
}

function fillTestOptions() {
  testTypeSelect.innerHTML = testTypes.map((name) => `<option>${escapeHtml(name)}</option>`).join("");
}

function showAdmin() {
  loginPanel.hidden = true;
  recordsPanel.hidden = false;
  loadRecords().catch((error) => {
    sessionStorage.removeItem("hanAdminToken");
    loginPanel.hidden = false;
    recordsPanel.hidden = true;
    setStatus(error.message, "error");
  });
}

async function showDetail(id) {
  activeId = id;
  const payload = await apiRequest({ action: "bundle", token: getToken(), id });
  activeBundle = payload;

  journalForm.elements["고유번호"].value = id;
  testForm.elements["고유번호"].value = id;
  detailList.innerHTML = applicantColumns
    .filter((key) => payload.applicant?.[key])
    .map((key) => `<div><dt>${escapeHtml(key)}</dt><dd>${escapeHtml(payload.applicant[key])}</dd></div>`)
    .join("");

  renderRelated(payload);
  detailPanel.hidden = false;
  detailPanel.scrollIntoView({ behavior: "smooth", block: "start" });
}

function renderRelated(bundle) {
  const journals = bundle.journals || [];
  const tests = bundle.tests || [];
  const archive = bundle.archive || [];

  relatedRecords.innerHTML = `
    <div>
      <h4>치료일지 ${journals.length}건</h4>
      ${journals.length ? journals.map(renderJournalCard).join("") : "<p>저장된 치료일지가 없습니다.</p>"}
    </div>
    <div>
      <h4>검사결과 ${tests.length}건</h4>
      ${tests.length ? tests.map(renderTestCard).join("") : "<p>저장된 검사결과가 없습니다.</p>"}
    </div>
    <div>
      <h4>보존/이관 처리 ${archive.length}건</h4>
      ${archive.length ? archive.map(renderArchiveCard).join("") : "<p>처리 기록이 없습니다.</p>"}
    </div>
  `;
}

function renderJournalCard(row) {
  return `
    <article class="mini-record">
      <strong>${escapeHtml(row["상담일자"])} ${escapeHtml(row["회기"])}회기</strong>
      <p>${escapeHtml(row["주호소/주제"])}</p>
      <p>${escapeHtml(row["검사 결과 반영"])}</p>
    </article>
  `;
}

function renderTestCard(row) {
  const imageLink = row["이미지/파일 URL"] ? `<a href="${escapeHtml(row["이미지/파일 URL"])}" target="_blank" rel="noreferrer">이미지/파일 열기</a>` : "";
  return `
    <article class="mini-record">
      <strong>${escapeHtml(row["검사지 종류"])} · ${escapeHtml(row["사용 여부"])}</strong>
      <p>${escapeHtml(row["숫자 결과"])}</p>
      <p>${escapeHtml(row["결과 요약"])}</p>
      ${imageLink}
    </article>
  `;
}

function renderArchiveCard(row) {
  return `
    <article class="mini-record">
      <strong>${escapeHtml(row["처리일시"])} · ${escapeHtml(row["처리유형"])}</strong>
      <p>${escapeHtml(row["보존 여부"])} ${escapeHtml(row["이관 대상"])}</p>
      <p>${escapeHtml(row["비고"])}</p>
    </article>
  `;
}

async function copyText(text) {
  await navigator.clipboard.writeText(text);
}

function detailText() {
  const applicant = activeBundle?.applicant || {};
  const base = applicantColumns.filter((key) => applicant[key]).map((key) => `${key}: ${applicant[key]}`).join("\n");
  const journals = (activeBundle?.journals || []).map((row) => `\n[치료일지]\n${Object.entries(row).map(([key, value]) => `${key}: ${value}`).join("\n")}`).join("\n");
  const tests = (activeBundle?.tests || []).map((row) => `\n[검사결과]\n${Object.entries(row).map(([key, value]) => `${key}: ${value}`).join("\n")}`).join("\n");
  return `${base}${journals}${tests}`;
}

function journalText() {
  const data = formObject(journalForm);
  return Object.entries(data).filter(([, value]) => value).map(([key, value]) => `${key}: ${value}`).join("\n");
}

function printElement(element) {
  const popup = window.open("", "_blank", "width=900,height=700");
  popup.document.write(`
    <!doctype html>
    <html lang="ko">
      <head>
        <meta charset="UTF-8" />
        <title>상담 기록 출력</title>
        <link rel="stylesheet" href="styles.css" />
      </head>
      <body class="print-page">${element.innerHTML}</body>
    </html>
  `);
  popup.document.close();
  popup.focus();
  popup.print();
}

function printText(title, text) {
  const popup = window.open("", "_blank", "width=900,height=700");
  popup.document.write(`
    <!doctype html>
    <html lang="ko">
      <head>
        <meta charset="UTF-8" />
        <title>${escapeHtml(title)}</title>
        <style>
          body { font-family: "Malgun Gothic", sans-serif; padding: 28px; line-height: 1.6; }
          h1 { font-size: 22px; margin: 0 0 18px; }
          pre { white-space: pre-wrap; font: inherit; }
        </style>
      </head>
      <body><h1>${escapeHtml(title)}</h1><pre>${escapeHtml(text)}</pre></body>
    </html>
  `);
  popup.document.close();
  popup.focus();
  popup.print();
}

loginForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  setStatus("로그인 확인 중입니다.", "info");

  try {
    const payload = await apiRequest({
      action: "login",
      id: document.querySelector("#adminId").value.trim(),
      password: document.querySelector("#adminPassword").value,
    });
    sessionStorage.setItem("hanAdminToken", payload.token);
    showAdmin();
  } catch (error) {
    setStatus(error.message, "error");
  }
});

recordsBody.addEventListener("click", (event) => {
  const detailButton = event.target.closest(".detail-button");
  if (detailButton) showDetail(detailButton.closest("tr").dataset.id);
});

recordsBody.addEventListener("change", () => {
  emailButton.disabled = true;
});

selectAll.addEventListener("change", () => {
  document.querySelectorAll(".record-check").forEach((checkbox) => {
    checkbox.checked = selectAll.checked;
  });
  emailButton.disabled = true;
});

deleteSelectedButton.addEventListener("click", async () => {
  const ids = selectedIds();
  if (!ids.length) return;
  await apiRequest({ action: "delete", token: getToken(), ids });
  await loadRecords();
});

exportButton.addEventListener("click", async () => {
  const payload = await apiRequest({ action: "emailExcel", token: getToken(), ids: selectedIds() });
  emailButton.disabled = false;
  emailButton.dataset.message = payload.message || "엑셀 파일을 메일로 보냈습니다.";
});

emailButton.addEventListener("click", () => {
  alert(emailButton.dataset.message || "엑셀 파일을 메일로 보냈습니다.");
});

journalForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  await apiRequest({ action: "saveJournal", token: getToken(), entry: formObject(journalForm) });
  journalForm.reset();
  journalForm.elements["고유번호"].value = activeId;
  await showDetail(activeId);
});

testForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  await apiRequest({ action: "saveTest", token: getToken(), entry: formObject(testForm) });
  testForm.reset();
  testForm.elements["고유번호"].value = activeId;
  fillTestOptions();
  await showDetail(activeId);
});

closeForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  await apiRequest({ action: "closeCase", token: getToken(), id: activeId, ...formObject(closeForm) });
  closeForm.reset();
  await loadRecords();
  await showDetail(activeId);
});

copyDetailButton.addEventListener("click", () => copyText(detailText()));
printDetailButton.addEventListener("click", () => printElement(document.querySelector("#printArea")));
document.querySelector("#copyJournalButton").addEventListener("click", () => copyText(journalText()));
document.querySelector("#printJournalButton").addEventListener("click", () => printText("치료일지", journalText()));

logoutButton.addEventListener("click", () => {
  sessionStorage.removeItem("hanAdminToken");
  location.reload();
});

if (getToken()) showAdmin();
