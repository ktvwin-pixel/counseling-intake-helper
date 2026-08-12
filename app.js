const form = document.querySelector("#intakeForm");
const summaryField = document.querySelector("#summaryField");
const applicantNoField = document.querySelector("#applicantNoField");
const mailClientButton = document.querySelector("#mailClientButton");
const submitMessage = document.querySelector("#submitMessage");
const config = window.APP_CONFIG || {};
const recipient = config.recipient || "hanart73@gmail.com";

function collectFormData() {
  const data = new FormData(form);
  const grouped = {};

  for (const [key, value] of data.entries()) {
    if (key.startsWith("_") || key === "상담_신청_요약") continue;
    const cleaned = String(value).trim();
    if (!cleaned) continue;

    grouped[key] = grouped[key] ? `${grouped[key]}, ${cleaned}` : cleaned;
  }

  grouped["작성 일시"] = new Date().toLocaleString("ko-KR", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  });

  return grouped;
}

function ensureApplicantNo() {
  if (applicantNoField.value) return applicantNoField.value;

  const now = new Date();
  const date = [
    now.getFullYear(),
    String(now.getMonth() + 1).padStart(2, "0"),
    String(now.getDate()).padStart(2, "0"),
  ].join("");
  const time = [
    String(now.getHours()).padStart(2, "0"),
    String(now.getMinutes()).padStart(2, "0"),
    String(now.getSeconds()).padStart(2, "0"),
  ].join("");
  const random = Math.random().toString(36).slice(2, 6).toUpperCase();

  applicantNoField.value = `HAN-${date}-${time}-${random}`;
  return applicantNoField.value;
}

function buildSummary() {
  const data = collectFormData();
  const sectionOrder = [
    "고유번호",
    "작성 일시",
    "성명",
    "연락처",
    "이메일",
    "나이",
    "직업",
    "현재 업무 근무 기간",
    "개별 안내 링크 확인",
    "검사지 선택 사용 여부",
    "초기 선택 검사지",
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
  ];

  return sectionOrder
    .filter((key) => data[key])
    .map((key) => `${key}: ${data[key]}`)
    .join("\n");
}

function setMessage(message, type = "info") {
  submitMessage.textContent = message;
  submitMessage.dataset.type = type;
}

function updateSummaryField() {
  summaryField.value = buildSummary();
}

function openMailFallback(applicantNo) {
  updateSummaryField();
  const subject = encodeURIComponent(`초기 내담자 상담 신청서 접수 - ${applicantNo}`);
  const body = encodeURIComponent(buildSummary());
  window.location.href = `mailto:${recipient}?subject=${subject}&body=${body}`;
}

async function submitToSheet() {
  const submitButton = form.querySelector('[type="submit"]');
  const applicantNo = ensureApplicantNo();

  if (!config.apiUrl) {
    setMessage("웹앱 저장 주소가 아직 없어 메일 회신 방식으로 전환합니다.", "info");
    openMailFallback(applicantNo);
    return;
  }

  submitButton.disabled = true;
  setMessage("신청 정보를 저장하고 있습니다.", "info");

  try {
    await fetch(config.apiUrl, {
      method: "POST",
      mode: "no-cors",
      headers: { "Content-Type": "text/plain;charset=utf-8" },
      body: JSON.stringify({
        action: "submit",
        data: collectFormData(),
      }),
    });

    form.reset();
    setMessage(`신청 정보가 접수되었습니다. 고유번호: ${applicantNo}`, "success");
  } catch (error) {
    setMessage("자동 저장에 실패해 메일 회신 방식으로 전환합니다.", "error");
    openMailFallback(applicantNo);
  } finally {
    submitButton.disabled = false;
  }
}

form.addEventListener("submit", (event) => {
  event.preventDefault();
  ensureApplicantNo();
  updateSummaryField();
  submitToSheet();
});

mailClientButton.addEventListener("click", () => {
  if (!form.reportValidity()) return;
  const applicantNo = ensureApplicantNo();
  openMailFallback(applicantNo);
});
