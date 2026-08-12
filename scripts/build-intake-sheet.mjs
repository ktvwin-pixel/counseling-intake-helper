import fs from "node:fs/promises";
import path from "node:path";
import { SpreadsheetFile, Workbook } from "@oai/artifact-tool";

const outputDir = path.resolve("outputs");
await fs.mkdir(outputDir, { recursive: true });

const sheets = [
  {
    name: "신청자",
    headers: [
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
    ],
  },
  {
    name: "치료일지",
    headers: [
      "일지번호",
      "고유번호",
      "회기",
      "상담일자",
      "상담시간",
      "상담형태",
      "주호소/주제",
      "정서상태",
      "상담 목표",
      "개입 내용",
      "내담자 반응",
      "진전 및 변화",
      "위험도/특이사항",
      "과제/권고",
      "다음 계획",
      "검사 결과 반영",
      "상담자",
      "작성일시",
      "수정일시",
      "보존상태",
    ],
  },
  {
    name: "검사결과",
    headers: ["검사번호", "고유번호", "검사지 종류", "사용 여부", "검사일", "결과 입력 방식", "숫자 결과", "이미지/파일 URL", "결과 요약", "작성일시"],
  },
  {
    name: "보존이관기록",
    headers: ["처리번호", "고유번호", "처리일시", "처리유형", "보존 여부", "이관 대상", "비고", "관리자"],
  },
];

const workbook = Workbook.create();

for (const sheetDefinition of sheets) {
  const sheet = workbook.worksheets.add(sheetDefinition.name);
  const width = sheetDefinition.headers.length;

  sheet.getRangeByIndexes(0, 0, 1, width).values = [sheetDefinition.headers];
  sheet.getRangeByIndexes(0, 0, 1, width).format = {
    fill: "#F1F3F4",
    font: { bold: true, color: "#202124" },
    borders: { preset: "all", style: "thin", color: "#DADCE0" },
  };
  sheet.getRangeByIndexes(0, 0, 200, width).format.borders = {
    preset: "all",
    style: "thin",
    color: "#E8EAED",
  };
  sheet.freezePanes.freezeRows(1);
}

const outputPath = path.join(outputDir, "counseling-intake-records.xlsx");
const output = await SpreadsheetFile.exportXlsx(workbook);
await output.save(outputPath);

console.log(outputPath);
