const SHEETS = {
  applicants: '신청자',
  journals: '치료일지',
  tests: '검사결과',
  archive: '보존이관기록',
};

const INTAKE_HEADERS = [
  '고유번호',
  '작성 일시',
  '상담상태',
  '성명',
  '연락처',
  '이메일',
  '나이',
  '직업',
  '현재 업무 근무 기간',
  '상담 내용 키워드',
  '상담 경험 유무',
  '상담을 결정한 이유',
  '가장 심각한 증상',
  '약물 복용 여부',
  '약물 복용 기간',
  '상담을 통해 얻고 싶은 결과',
  '방문 과정',
  '초기 전화상담 동의 여부',
  '상담진행중 전화상담 유료 안내 동의',
  '검사지 선택 사용 여부',
  '초기 선택 검사지',
  '최종상담일',
  '보존상태',
  '이관메모',
];

const JOURNAL_HEADERS = [
  '일지번호',
  '고유번호',
  '회기',
  '상담일자',
  '상담시간',
  '상담형태',
  '주호소/주제',
  '정서상태',
  '상담 목표',
  '개입 내용',
  '내담자 반응',
  '진전 및 변화',
  '위험도/특이사항',
  '과제/권고',
  '다음 계획',
  '검사 결과 반영',
  '상담자',
  '작성일시',
  '수정일시',
  '보존상태',
];

const TEST_HEADERS = [
  '검사번호',
  '고유번호',
  '검사지 종류',
  '사용 여부',
  '검사일',
  '결과 입력 방식',
  '숫자 결과',
  '이미지/파일 URL',
  '결과 요약',
  '작성일시',
];

const ARCHIVE_HEADERS = [
  '처리번호',
  '고유번호',
  '처리일시',
  '처리유형',
  '보존 여부',
  '이관 대상',
  '비고',
  '관리자',
];

const TEST_TYPES = [
  'MMPI-2 / MMPI-A',
  'TCI / JTCI',
  'SCT 문장완성검사',
  'HTP 그림검사',
  'KFD 동적가족화',
  'BGT 벤더게슈탈트검사',
  'Rorschach 로르샤흐 검사',
  'TAT / CAT 주제통각검사',
  'K-WAIS / K-WISC 지능검사',
  'BDI 우울척도',
  'BAI 불안척도',
  'K-CBCL / K-YSR',
  'PAI 성격평가질문지',
  'MBTI',
  '기타',
];

function setup() {
  const props = PropertiesService.getScriptProperties();
  props.setProperties({
    SHEET_ID: '11n0Sg0zLL-qcBTioCw_l1GWKSB3w_wbR8OqP6DH_p3Q',
    ADMIN_ID: 'admin',
    ADMIN_EMAIL: 'hanart73@gmail.com',
    DRIVE_ROOT_FOLDER_NAME: '한예술 상담신청',
    DRIVE_ROOT_FOLDER_ID: '1JXlSU3IFyC33XviNAN2GOOk2wka7ZfwK',
  });
  if (!props.getProperty('ADMIN_PASSWORD_HASH')) {
    props.setProperty('ADMIN_PASSWORD_HASH', 'CHANGE_THIS_WITH_SET_ADMIN_PASSWORD');
  }
  ensureAllSheets_();
  ensureDriveRootFolder_();
}

function setAdminPassword() {
  const password = 'CHANGE_THIS_PASSWORD_BEFORE_RUNNING';
  if (password === 'CHANGE_THIS_PASSWORD_BEFORE_RUNNING') {
    throw new Error('setAdminPassword 함수 안의 password 값을 원하는 비밀번호로 바꾼 뒤 한 번 실행하세요.');
  }
  PropertiesService.getScriptProperties().setProperty('ADMIN_PASSWORD_HASH', sha256(password));
}

function doPost(e) {
  try {
    const body = JSON.parse(e.postData.contents || '{}');
    if (body.action !== 'submit') throw new Error('잘못된 요청입니다.');
    const applicantNo = appendApplicant_(body.data || {});
    return json_({ ok: true, applicantNo });
  } catch (error) {
    return json_({ ok: false, message: error.message });
  }
}

function doGet(e) {
  const params = e.parameter || {};
  const callback = params.callback || 'callback';

  try {
    let payload;
    if (params.action === 'login') payload = login_(params);
    else if (params.action === 'list') payload = list_(params);
    else if (params.action === 'bundle') payload = bundle_(params);
    else if (params.action === 'saveJournal') payload = saveJournal_(params);
    else if (params.action === 'saveTest') payload = saveTest_(params);
    else if (params.action === 'closeCase') payload = closeCase_(params);
    else if (params.action === 'delete') payload = deleteApplicants_(params);
    else if (params.action === 'emailExcel') payload = emailExcel_(params);
    else if (params.action === 'testTypes') payload = { testTypes: TEST_TYPES };
    else throw new Error('지원하지 않는 작업입니다.');

    return jsonp_(callback, { ok: true, ...payload });
  } catch (error) {
    return jsonp_(callback, { ok: false, message: error.message });
  }
}

function login_(params) {
  const props = PropertiesService.getScriptProperties();
  if (params.id !== props.getProperty('ADMIN_ID') || sha256(params.password || '') !== props.getProperty('ADMIN_PASSWORD_HASH')) {
    throw new Error('아이디 또는 비밀번호가 올바르지 않습니다.');
  }

  const token = Utilities.getUuid();
  CacheService.getScriptCache().put(`admin:${token}`, 'ok', 60 * 60 * 6);
  return { token };
}

function list_(params) {
  requireAdmin_(params.token);
  const records = readSheetObjects_(SHEETS.applicants).reverse();
  return { records, testTypes: TEST_TYPES };
}

function bundle_(params) {
  requireAdmin_(params.token);
  const id = params.id;
  if (!id) throw new Error('고유번호가 필요합니다.');

  return {
    applicant: readSheetObjects_(SHEETS.applicants).find((row) => row['고유번호'] === id) || null,
    journals: readSheetObjects_(SHEETS.journals).filter((row) => row['고유번호'] === id),
    tests: readSheetObjects_(SHEETS.tests).filter((row) => row['고유번호'] === id),
    archive: readSheetObjects_(SHEETS.archive).filter((row) => row['고유번호'] === id),
    testTypes: TEST_TYPES,
  };
}

function saveJournal_(params) {
  requireAdmin_(params.token);
  const entry = parseJsonParam_(params.entry);
  if (!entry['고유번호']) throw new Error('고유번호가 필요합니다.');

  const now = nowText_();
  const row = JOURNAL_HEADERS.map((header) => {
    if (header === '일지번호') return Utilities.getUuid();
    if (header === '작성일시' || header === '수정일시') return now;
    if (header === '보존상태') return '보존';
    return entry[header] || '';
  });
  getSheet_(SHEETS.journals).appendRow(row);
  saveCaseTextFile_(entry['고유번호'], '치료일지', rowToObject_(JOURNAL_HEADERS, row));
  return { saved: true };
}

function saveTest_(params) {
  requireAdmin_(params.token);
  const entry = parseJsonParam_(params.entry);
  if (!entry['고유번호']) throw new Error('고유번호가 필요합니다.');

  const row = TEST_HEADERS.map((header) => {
    if (header === '검사번호') return Utilities.getUuid();
    if (header === '작성일시') return nowText_();
    return entry[header] || '';
  });
  getSheet_(SHEETS.tests).appendRow(row);
  saveCaseTextFile_(entry['고유번호'], '검사결과', rowToObject_(TEST_HEADERS, row));
  return { saved: true };
}

function closeCase_(params) {
  requireAdmin_(params.token);
  const id = params.id;
  if (!id) throw new Error('고유번호가 필요합니다.');

  const preserve = params.preserve || '보존';
  const transferTarget = params.transferTarget || '';
  const memo = params.memo || '';
  const admin = params.admin || '';
  const status = preserve === '삭제' ? '종결-삭제대상' : preserve === '이관' ? '종결-이관' : '종결-보존';

  updateApplicantStatus_(id, status, preserve, memo);
  getSheet_(SHEETS.archive).appendRow([
    Utilities.getUuid(),
    id,
    nowText_(),
    '최종 상담 종료',
    preserve,
    transferTarget,
    memo,
    admin,
  ]);

  if (preserve === '삭제') {
    removeRowsByIds_(SHEETS.journals, '고유번호', [id]);
    removeRowsByIds_(SHEETS.tests, '고유번호', [id]);
    trashApplicantFolder_(id);
  } else {
    saveCaseTextFile_(id, '종결처리', {
      고유번호: id,
      처리일시: nowText_(),
      처리유형: '최종 상담 종료',
      보존여부: preserve,
      이관대상: transferTarget,
      비고: memo,
      관리자: admin,
    });
  }
  return { closed: true, status };
}

function deleteApplicants_(params) {
  requireAdmin_(params.token);
  const ids = parseIds_(params.ids);
  if (!ids.length) return { deleted: 0 };

  const deleted = removeRowsByIds_(SHEETS.applicants, '고유번호', ids);
  removeRowsByIds_(SHEETS.journals, '고유번호', ids);
  removeRowsByIds_(SHEETS.tests, '고유번호', ids);
  ids.forEach((id) => trashApplicantFolder_(id));
  return { deleted };
}

function emailExcel_(params) {
  requireAdmin_(params.token);
  const ids = parseIds_(params.ids);
  const temp = SpreadsheetApp.create(`상담기록_내보내기_${formatDate_(new Date())}`);

  writeExportSheet_(temp, SHEETS.applicants, INTAKE_HEADERS, ids);
  writeExportSheet_(temp, SHEETS.journals, JOURNAL_HEADERS, ids);
  writeExportSheet_(temp, SHEETS.tests, TEST_HEADERS, ids);
  writeExportSheet_(temp, SHEETS.archive, ARCHIVE_HEADERS, ids);
  temp.deleteSheet(temp.getSheets()[0]);

  const exportUrl = `https://docs.google.com/spreadsheets/d/${temp.getId()}/export?format=xlsx`;
  const response = UrlFetchApp.fetch(exportUrl, {
    headers: { Authorization: `Bearer ${ScriptApp.getOAuthToken()}` },
  });
  const blob = response.getBlob().setName(`${temp.getName()}.xlsx`);
  const email = PropertiesService.getScriptProperties().getProperty('ADMIN_EMAIL');
  GmailApp.sendEmail(email, '상담 기록 엑셀 자료', '상담 신청자 및 치료일지 엑셀 파일을 첨부합니다.', {
    attachments: [blob],
  });
  DriveApp.getFileById(temp.getId()).setTrashed(true);
  return { message: `선택한 기록을 ${email}로 전송했습니다.` };
}

function appendApplicant_(data) {
  ensureAllSheets_();
  const applicantNo = data['고유번호'] || nextApplicantNo_();
  const row = INTAKE_HEADERS.map((header) => {
    if (header === '고유번호') return applicantNo;
    if (header === '작성 일시') return data[header] || nowText_();
    if (header === '상담상태') return '접수';
    if (header === '보존상태') return '진행중';
    return data[header] || '';
  });
  getSheet_(SHEETS.applicants).appendRow(row);
  saveApplicantSnapshot_(applicantNo, rowToObject_(INTAKE_HEADERS, row));
  return applicantNo;
}

function nextApplicantNo_() {
  const today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd');
  const prefix = `HAN-${today}-`;
  const rows = readSheetObjects_(SHEETS.applicants);
  const next = rows
    .map((row) => String(row['고유번호'] || ''))
    .filter((value) => value.startsWith(prefix))
    .length + 1;
  return `${prefix}${String(next).padStart(4, '0')}`;
}

function ensureAllSheets_() {
  ensureSheet_(SHEETS.applicants, INTAKE_HEADERS);
  ensureSheet_(SHEETS.journals, JOURNAL_HEADERS);
  ensureSheet_(SHEETS.tests, TEST_HEADERS);
  ensureSheet_(SHEETS.archive, ARCHIVE_HEADERS);
}

function ensureSheet_(name, headers) {
  const sheet = getSheet_(name);
  const range = sheet.getRange(1, 1, 1, headers.length);
  const current = range.getValues()[0];
  if (current.join('') !== headers.join('')) range.setValues([headers]);
  sheet.setFrozenRows(1);
  sheet.getRange(1, 1, 1, headers.length).setFontWeight('bold').setBackground('#F1F3F4');
}

function getSheet_(name) {
  const sheetId = PropertiesService.getScriptProperties().getProperty('SHEET_ID');
  const spreadsheet = SpreadsheetApp.openById(sheetId);
  return spreadsheet.getSheetByName(name) || spreadsheet.insertSheet(name);
}

function readSheetObjects_(name) {
  const sheet = getSheet_(name);
  const values = sheet.getDataRange().getDisplayValues();
  const headers = values.shift() || [];
  return values.filter((row) => row.some(Boolean)).map((row) => rowToObject_(headers, row));
}

function rowToObject_(headers, row) {
  return headers.reduce((object, header, index) => {
    object[header] = row[index] || '';
    return object;
  }, {});
}

function saveApplicantSnapshot_(applicantNo, record) {
  const folder = ensureApplicantFolder_(applicantNo, record['성명']);
  upsertTextFile_(folder, '신청자_기본정보.txt', formatRecordText_('신청자 기본정보', record));
  upsertTextFile_(folder, '신청자_기본정보.json', JSON.stringify(record, null, 2));
}

function saveCaseTextFile_(applicantNo, type, record) {
  const folder = ensureApplicantFolder_(applicantNo);
  const timestamp = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyyMMdd_HHmmss');
  const safeType = sanitizeFileName_(type);
  folder.createFile(`${timestamp}_${safeType}.txt`, formatRecordText_(type, record), MimeType.PLAIN_TEXT);
}

function ensureApplicantFolder_(applicantNo, applicantName) {
  const root = ensureDriveRootFolder_();
  const existing = findApplicantFolder_(root, applicantNo);
  if (existing) return existing;

  const suffix = applicantName ? `_${sanitizeFileName_(applicantName)}` : '';
  return root.createFolder(`${sanitizeFileName_(applicantNo)}${suffix}`);
}

function findApplicantFolder_(root, applicantNo) {
  const prefix = `${sanitizeFileName_(applicantNo)}`;
  const folders = root.getFolders();
  while (folders.hasNext()) {
    const folder = folders.next();
    if (folder.getName() === prefix || folder.getName().startsWith(`${prefix}_`)) return folder;
  }
  return null;
}

function ensureDriveRootFolder_() {
  const props = PropertiesService.getScriptProperties();
  const storedId = props.getProperty('DRIVE_ROOT_FOLDER_ID');
  if (storedId) {
    try {
      return DriveApp.getFolderById(storedId);
    } catch (error) {
      props.deleteProperty('DRIVE_ROOT_FOLDER_ID');
    }
  }

  const name = props.getProperty('DRIVE_ROOT_FOLDER_NAME') || '한예술 상담신청';
  const folders = DriveApp.getFoldersByName(name);
  const folder = folders.hasNext() ? folders.next() : DriveApp.createFolder(name);
  props.setProperty('DRIVE_ROOT_FOLDER_ID', folder.getId());
  return folder;
}

function trashApplicantFolder_(applicantNo) {
  const root = ensureDriveRootFolder_();
  const folder = findApplicantFolder_(root, applicantNo);
  if (folder) folder.setTrashed(true);
}

function upsertTextFile_(folder, name, content) {
  const files = folder.getFilesByName(name);
  if (files.hasNext()) {
    files.next().setContent(content);
    return;
  }
  folder.createFile(name, content, MimeType.PLAIN_TEXT);
}

function formatRecordText_(title, record) {
  const lines = [`${title}`, `작성일시: ${nowText_()}`, ''];
  Object.keys(record).forEach((key) => {
    lines.push(`${key}: ${record[key] || ''}`);
  });
  return lines.join('\n');
}

function sanitizeFileName_(value) {
  return String(value || '미기재')
    .replace(/[\\/:*?"<>|#%{}~&]/g, '_')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 120);
}

function updateApplicantStatus_(id, status, preserve, memo) {
  const sheet = getSheet_(SHEETS.applicants);
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const idCol = headers.indexOf('고유번호');
  const statusCol = headers.indexOf('상담상태');
  const finalDateCol = headers.indexOf('최종상담일');
  const preserveCol = headers.indexOf('보존상태');
  const memoCol = headers.indexOf('이관메모');

  values.forEach((row, index) => {
    if (index > 0 && String(row[idCol]) === id) {
      sheet.getRange(index + 1, statusCol + 1).setValue(status);
      sheet.getRange(index + 1, finalDateCol + 1).setValue(nowText_());
      sheet.getRange(index + 1, preserveCol + 1).setValue(preserve);
      sheet.getRange(index + 1, memoCol + 1).setValue(memo);
    }
  });
}

function removeRowsByIds_(sheetName, columnName, ids) {
  const sheet = getSheet_(sheetName);
  const values = sheet.getDataRange().getValues();
  const headers = values[0];
  const col = headers.indexOf(columnName);
  const deleteRows = [];
  if (col < 0) return 0;

  values.forEach((row, index) => {
    if (index > 0 && ids.includes(String(row[col]))) deleteRows.push(index + 1);
  });
  deleteRows.reverse().forEach((rowNumber) => sheet.deleteRow(rowNumber));
  return deleteRows.length;
}

function writeExportSheet_(spreadsheet, sourceName, headers, ids) {
  const sheet = spreadsheet.insertSheet(sourceName);
  const rows = readSheetObjects_(sourceName)
    .filter((row) => !ids.length || ids.includes(row['고유번호']))
    .map((row) => headers.map((header) => row[header] || ''));

  sheet.getRange(1, 1, 1, headers.length).setValues([headers]).setFontWeight('bold').setBackground('#F1F3F4');
  if (rows.length) sheet.getRange(2, 1, rows.length, headers.length).setValues(rows);
  sheet.setFrozenRows(1);
  sheet.autoResizeColumns(1, headers.length);
}

function requireAdmin_(token) {
  if (!token || CacheService.getScriptCache().get(`admin:${token}`) !== 'ok') {
    throw new Error('관리자 로그인이 필요합니다.');
  }
}

function parseIds_(value) {
  if (!value) return [];
  return parseJsonParam_(value).map(String);
}

function parseJsonParam_(value) {
  if (!value) return [];
  if (typeof value !== 'string') return value;
  try {
    return JSON.parse(value);
  } catch (error) {
    return String(value).split(',').map((item) => item.trim()).filter(Boolean);
  }
}

function sha256(value) {
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, value)
    .map((byte) => (byte + 256).toString(16).slice(-2))
    .join('');
}

function nowText_() {
  return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy-MM-dd HH:mm');
}

function formatDate_(date) {
  return Utilities.formatDate(date, Session.getScriptTimeZone(), 'yyyy-MM-dd');
}

function json_(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}

function jsonp_(callback, payload) {
  const safeCallback = String(callback).replace(/[^\w.$]/g, '');
  return ContentService
    .createTextOutput(`${safeCallback}(${JSON.stringify(payload)});`)
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}
