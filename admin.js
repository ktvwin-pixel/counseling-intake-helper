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
const followupForm = document.querySelector("#followupForm");
const followupMessage = document.querySelector("#followupMessage");
const buildFollowupButton = document.querySelector("#buildFollowupButton");
const copyFollowupButton = document.querySelector("#copyFollowupButton");
const printFollowupButton = document.querySelector("#printFollowupButton");
const mailFollowupButton = document.querySelector("#mailFollowupButton");
const testTypeSelect = document.querySelector("#testTypeSelect");
const logoSrc = "assets/institute-logo.png";

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

function setRecordsMessage(message) {
  recordsBody.innerHTML = `<tr><td colspan="10" class="empty-cell">${escapeHtml(message)}</td></tr>`;
}

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
    let timeoutId;

    const cleanup = () => {
      clearTimeout(timeoutId);
      delete window[callbackName];
      script.remove();
    };

    Object.entries(params).forEach(([key, value]) => {
      url.searchParams.set(key, typeof value === "string" ? value : JSON.stringify(value));
    });
    url.searchParams.set("callback", callbackName);

    window[callbackName] = (payload) => {
      cleanup();
      payload?.ok ? resolve(payload) : reject(new Error(payload?.message || "요청을 처리하지 못했습니다."));
    };

    script.onerror = () => {
      cleanup();
      reject(new Error("서버 연결에 실패했습니다. Apps Script 웹 앱 액세스 권한을 '모든 사용자'로 설정해 주세요."));
    };

    timeoutId = window.setTimeout(() => {
      cleanup();
      reject(new Error("서버 응답이 지연되고 있습니다. 새로고침 후 다시 로그인해 주세요."));
    }, 20000);

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
  setRecordsMessage("신청자 정보를 불러오는 중입니다.");
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
  detailPanel.hidden = true;
  setStatus("", "info");
  loadRecords().catch((error) => {
    sessionStorage.removeItem("hanAdminToken");
    loginPanel.hidden = false;
    recordsPanel.hidden = true;
    detailPanel.hidden = true;
    setStatus(error.message, "error");
  });
}

async function showDetail(id) {
  activeId = id;
  detailPanel.hidden = false;
  detailList.innerHTML = "<div><dt>상태</dt><dd>선택한 신청 내용을 불러오는 중입니다.</dd></div>";
  relatedRecords.innerHTML = "";
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
  const encoded = encodeURIComponent(JSON.stringify(row));
  return `
    <article class="mini-record" data-journal="${escapeHtml(encoded)}">
      <strong>${escapeHtml(row["상담일자"])} ${escapeHtml(row["회기"])}회기</strong>
      <p>${escapeHtml(row["주호소/주제"])}</p>
      <p>${escapeHtml(row["검사 결과 반영"])}</p>
      <button class="text-button edit-journal-button" type="button">이 일지 수정/보완</button>
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

function buildFollowupText() {
  const applicant = activeBundle?.applicant || {};
  const data = formObject(followupForm);
  const name = applicant["성명"] || "내담자";
  const nextParts = [data.nextDate, data.nextTime, data.method].filter(Boolean).join(" / ") || "추후 안내";
  const counselor = data.counselor || "상담자";

  return [
    `${name}님께`,
    "",
    "오늘 상담에 참여해 주셔서 감사합니다.",
    `다음 상담 일정: ${nextParts}`,
    `담당: ${counselor}`,
    "",
    "[오늘 상담 요약]",
    data.summary || "오늘 상담에서 나눈 주요 내용을 바탕으로 다음 회기를 준비하겠습니다.",
    "",
    "[다음 상담 전 참고하실 내용]",
    data.solution || "무리하지 않는 범위에서 오늘 정리한 내용을 일상에서 천천히 살펴봐 주세요.",
    "",
    "변경이 필요하시면 기관으로 연락 부탁드립니다.",
    "한 예술치료교육연구소",
  ].join("\n");
}

function updateFollowupMessage() {
  followupMessage.value = buildFollowupText();
  return followupMessage.value;
}

function formatRows(row, columns = Object.keys(row || {}), emphasis = []) {
  const visibleColumns = columns.filter((key) => row?.[key]);

  if (!visibleColumns.length) {
    return '<tr><td colspan="2" class="empty-print-cell">기록된 내용이 없습니다.</td></tr>';
  }

  return visibleColumns.map((key) => `
    <tr class="${emphasis.includes(key) ? "emphasis-row" : ""}">
      <th>${escapeHtml(key)}</th>
      <td>${escapeHtml(row[key])}</td>
    </tr>
  `).join("");
}

function formatRecordTable(title, rows, columns, emphasis = []) {
  const records = rows?.length ? rows : [{}];

  return `
    <section class="print-section">
      <h2>${escapeHtml(title)}</h2>
      ${records.map((row, index) => `
        <table class="print-table">
          ${rows?.length > 1 ? `<caption>${escapeHtml(title)} ${index + 1}</caption>` : ""}
          <tbody>${formatRows(row, columns, emphasis)}</tbody>
        </table>
      `).join("")}
    </section>
  `;
}

function formatJournalCell(label, value, options = {}) {
  const classes = ["journal-print-cell"];
  if (options.wide) classes.push("wide");
  if (options.emphasis) classes.push("emphasis");

  return `
    <div class="${classes.join(" ")}">
      <div class="journal-print-label">${escapeHtml(label)}</div>
      <div class="journal-print-value">${escapeHtml(value || " ")}</div>
    </div>
  `;
}

function formatJournalSheet(row, title = "치료일지") {
  const metaItems = ["고유번호", "회기", "상담일자", "상담시간", "상담형태", "상담자", "정서상태"];
  const contentItems = [
    ["주호소/주제", true],
    ["상담 목표", false],
    ["개입 내용", true],
    ["내담자 반응", false],
    ["진전 및 변화", false],
    ["위험도/특이사항", false],
    ["과제/권고", false],
    ["다음 계획", true],
    ["검사 결과 반영", true],
  ];

  return `
    <section class="print-section journal-print-sheet">
      <h2>${escapeHtml(title)}</h2>
      <div class="journal-print-grid meta-grid">
        ${metaItems.map((key) => formatJournalCell(key, row?.[key])).join("")}
      </div>
      <div class="journal-print-grid content-grid">
        ${contentItems.map(([key, emphasis]) => formatJournalCell(key, row?.[key], { wide: true, emphasis })).join("")}
      </div>
    </section>
  `;
}

function printDocument(title, bodyHtml) {
  const popup = window.open("", "_blank", "width=900,height=700");
  popup.document.write(`
    <!doctype html>
    <html lang="ko">
      <head>
        <meta charset="UTF-8" />
        <title>${escapeHtml(title)}</title>
        <style>
          * { box-sizing: border-box; }
          body {
            margin: 0;
            padding: 26px;
            color: #172033;
            font-family: "Malgun Gothic", "Apple SD Gothic Neo", sans-serif;
            line-height: 1.55;
            background: #ffffff;
          }
          .print-header {
            display: flex;
            align-items: center;
            justify-content: space-between;
            gap: 18px;
            padding-bottom: 14px;
            margin-bottom: 18px;
            border-bottom: 3px solid #0d1f3a;
          }
          .print-logo { width: 220px; max-width: 42%; height: auto; object-fit: contain; }
          h1 { margin: 0; color: #0d1f3a; font-size: 24px; text-align: right; }
          h2 {
            margin: 24px 0 8px;
            padding: 7px 10px;
            color: #ffffff;
            background: #0d1f3a;
            font-size: 15px;
          }
          .print-table {
            width: 100%;
            border-collapse: collapse;
            margin: 0 0 12px;
            page-break-inside: avoid;
          }
          caption {
            caption-side: top;
            padding: 7px 0;
            color: #41506a;
            font-weight: 700;
            text-align: left;
          }
          th, td {
            border: 1px solid #aeb8c8;
            padding: 8px 10px;
            vertical-align: top;
            white-space: pre-wrap;
            word-break: keep-all;
          }
          th {
            width: 185px;
            color: #0d1f3a;
            background: #f7cf59;
            text-align: left;
          }
          .journal-table th { background: #f8bfd1; }
          .diagnostic-table th { background: #f2aa57; }
          .archive-table th { background: #d8dee9; }
          .journal-print-sheet {
            border: 1px solid #0d1f3a;
            padding: 12px;
            background: #ffffff;
          }
          .journal-print-grid {
            display: grid;
            gap: 0;
            border-top: 1px solid #aeb8c8;
            border-left: 1px solid #aeb8c8;
          }
          .meta-grid {
            grid-template-columns: repeat(4, minmax(0, 1fr));
            margin-bottom: 12px;
          }
          .content-grid {
            grid-template-columns: repeat(2, minmax(0, 1fr));
          }
          .journal-print-cell {
            min-height: 74px;
            border-right: 1px solid #aeb8c8;
            border-bottom: 1px solid #aeb8c8;
            background: #ffffff;
          }
          .journal-print-cell.wide {
            min-height: 112px;
          }
          .journal-print-cell.emphasis .journal-print-value {
            font-weight: 800;
          }
          .journal-print-label {
            padding: 7px 9px;
            color: #7d1f50;
            background: #f8bfd1;
            font-size: 12px;
            font-weight: 800;
          }
          .journal-print-value {
            min-height: 42px;
            padding: 9px;
            white-space: pre-wrap;
          }
          .emphasis-row td,
          .solution-box {
            font-weight: 800;
          }
          .solution-box {
            border: 2px solid #0d1f3a;
            padding: 14px;
            white-space: pre-wrap;
            background: #fff8fb;
          }
          .empty-print-cell { color: #67748a; text-align: center; }
          @media print {
            body { padding: 12mm; }
            .print-section { page-break-inside: avoid; }
            .journal-print-sheet { page-break-inside: avoid; }
          }
        </style>
      </head>
      <body>
        <header class="print-header">
          <img class="print-logo" src="${logoSrc}" alt="한 예술치료교육연구소" />
          <h1>${escapeHtml(title)}</h1>
        </header>
        ${bodyHtml}
      </body>
    </html>
  `);
  popup.document.close();
  popup.focus();
  popup.print();
}

function printStructuredDetail() {
  const applicant = activeBundle?.applicant || {};
  const journals = activeBundle?.journals || [];
  const tests = activeBundle?.tests || [];
  const archive = activeBundle?.archive || [];
  const journalColumns = ["일지번호", "고유번호", "회기", "상담일자", "상담시간", "상담형태", "주호소/주제", "정서상태", "상담 목표", "개입 내용", "내담자 반응", "진전 및 변화", "위험도/특이사항", "과제/권고", "다음 계획", "검사 결과 반영", "상담자", "작성일시", "수정일시", "보존상태"];
  const testColumns = ["검사번호", "고유번호", "검사지 종류", "사용 여부", "검사일", "결과 입력 방식", "숫자 결과", "이미지/파일 URL", "결과 요약", "작성일시"];
  const archiveColumns = ["처리번호", "고유번호", "처리일시", "처리유형", "보존 여부", "이관 대상", "비고", "관리자"];
  const followup = followupMessage.value || buildFollowupText();

  const body = [
    formatRecordTable("개인정보 및 초기 상담 신청 내용", [applicant], applicantColumns),
    journals.length
      ? journals.map((row, index) => formatJournalSheet(row, `상담일지 ${index + 1}`)).join("")
      : formatRecordTable("상담일지", [], journalColumns).replaceAll("print-table", "print-table journal-table"),
    formatRecordTable("진단도구 및 검사결과", tests, testColumns, ["검사지 종류", "숫자 결과", "결과 요약"]).replaceAll("print-table", "print-table diagnostic-table"),
    formatRecordTable("상담 종료/보존/이관 기록", archive, archiveColumns).replaceAll("print-table", "print-table archive-table"),
    `<section class="print-section"><h2>상담자 상담내용 및 향후 솔루션</h2><div class="solution-box">${escapeHtml(followup)}</div></section>`,
  ].join("");

  printDocument(`상담 기록 출력 - ${applicant["고유번호"] || activeId || ""}`, body);
}

function printText(title, text) {
  printDocument(title, `<section class="print-section"><div class="solution-box">${escapeHtml(text)}</div></section>`);
}

function printJournalDocument() {
  printDocument("치료일지", formatJournalSheet(formObject(journalForm)));
}

function printFollowupDocument() {
  const applicant = activeBundle?.applicant || {};
  const body = `
    ${formatRecordTable("내담자 정보", [applicant], ["고유번호", "성명", "연락처", "이메일", "상담상태"])}
    <section class="print-section">
      <h2>다음 상담 일정 및 솔루션 안내</h2>
      <div class="solution-box">${escapeHtml(updateFollowupMessage())}</div>
    </section>
  `;

  printDocument("다음 상담 일정 및 솔루션 안내", body);
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

relatedRecords.addEventListener("click", (event) => {
  const editButton = event.target.closest(".edit-journal-button");
  if (!editButton) return;

  const card = editButton.closest("[data-journal]");
  if (!card) return;

  const row = JSON.parse(decodeURIComponent(card.dataset.journal));
  Object.entries(row).forEach(([key, value]) => {
    const field = journalForm.elements[key];
    if (field) field.value = value || "";
  });
  journalForm.elements["고유번호"].value = activeId;
  journalForm.scrollIntoView({ behavior: "smooth", block: "start" });
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
printDetailButton.addEventListener("click", printStructuredDetail);
document.querySelector("#copyJournalButton").addEventListener("click", () => copyText(journalText()));
document.querySelector("#printJournalButton").addEventListener("click", printJournalDocument);

buildFollowupButton.addEventListener("click", updateFollowupMessage);
copyFollowupButton.addEventListener("click", () => copyText(updateFollowupMessage()));
printFollowupButton.addEventListener("click", printFollowupDocument);
mailFollowupButton.addEventListener("click", () => {
  const applicant = activeBundle?.applicant || {};
  const email = applicant["이메일"];
  const body = encodeURIComponent(updateFollowupMessage());
  const subject = encodeURIComponent("다음 상담 일정 및 안내");

  if (!email) {
    alert("신청자 이메일이 없어 안내문 복사를 이용해 주세요.");
    return;
  }

  window.location.href = `mailto:${email}?subject=${subject}&body=${body}`;
});

logoutButton.addEventListener("click", () => {
  sessionStorage.removeItem("hanAdminToken");
  location.reload();
});

if (getToken()) showAdmin();
