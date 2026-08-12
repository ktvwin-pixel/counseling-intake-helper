const form = document.querySelector("#intakeForm");
const summaryField = document.querySelector("#summaryField");
const mailClientButton = document.querySelector("#mailClientButton");
const recipient = "osm0707@naver.com";

function collectFormData() {
  const data = new FormData(form);
  const grouped = {};

  for (const [key, value] of data.entries()) {
    if (key.startsWith("_") || key === "상담_신청_요약") continue;
    const cleaned = String(value).trim();
    if (!cleaned) continue;

    if (grouped[key]) {
      grouped[key] = `${grouped[key]}, ${cleaned}`;
    } else {
      grouped[key] = cleaned;
    }
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

function buildSummary() {
  const data = collectFormData();
  const sectionOrder = [
    "작성 일시",
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
  ];

  return sectionOrder
    .filter((key) => data[key])
    .map((key) => `${key}: ${data[key]}`)
    .join("\n");
}

function updateSummaryField() {
  summaryField.value = buildSummary();
}

form.addEventListener("submit", updateSummaryField);

mailClientButton.addEventListener("click", () => {
  if (!form.reportValidity()) return;

  const subject = encodeURIComponent("초기 내담자 상담 신청서 접수");
  const body = encodeURIComponent(buildSummary());
  window.location.href = `mailto:${recipient}?subject=${subject}&body=${body}`;
});
