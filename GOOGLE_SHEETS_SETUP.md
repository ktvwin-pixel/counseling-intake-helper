# Google Sheets 운영 설정

## 생성된 Google Sheet

- 제목: 상담 신청자 접수 관리
- 주소: https://docs.google.com/spreadsheets/d/11n0Sg0zLL-qcBTioCw_l1GWKSB3w_wbR8OqP6DH_p3Q
- 탭 이름: 신청자, 치료일지, 검사결과, 보존이관기록

## Google Drive 자동 저장

Apps Script가 처음 실행되면 Google Drive의 `한예술 상담신청` 폴더에 자동 저장합니다.

- 폴더 주소: https://drive.google.com/drive/folders/1JXlSU3IFyC33XviNAN2GOOk2wka7ZfwK

- 신청자가 상담 신청서를 제출하면 `한예술 상담신청/HAN-YYYYMMDD-0001_성명` 형식의 개인 폴더가 생성됩니다.
- 개인 폴더 안에 `신청자_기본정보.txt`, `신청자_기본정보.json` 파일이 자동 저장됩니다.
- 관리자가 치료일지 또는 검사결과를 저장하면 같은 개인 폴더에 날짜별 기록 파일이 누적 저장됩니다.
- 최종 상담 종료 시 `보존` 또는 `이관`은 종결처리 기록 파일을 남기고, `삭제`는 개인 폴더를 휴지통으로 이동합니다.

## Apps Script 배포

1. Google Sheet를 엽니다.
2. 메뉴에서 `확장 프로그램` > `Apps Script`를 엽니다.
3. 기본 `Code.gs` 내용을 이 프로젝트의 `apps-script/Code.gs` 내용으로 교체합니다.
4. `setup` 함수를 한 번 실행하고 권한을 승인합니다.
5. `setAdminPassword` 함수 안의 `CHANGE_THIS_PASSWORD_BEFORE_RUNNING` 값을 원하는 관리자 비밀번호로 잠시 바꿉니다.
6. `setAdminPassword` 함수를 한 번 실행합니다.
7. 실행 후 비밀번호 문자열을 다시 지우거나 다른 임시 문자열로 바꿉니다.
8. `배포` > `새 배포` > 유형 `웹 앱`을 선택합니다.
9. 실행 사용자: `나`
10. 액세스 권한: `모든 사용자`
11. 배포 후 발급되는 웹 앱 URL을 복사합니다.
12. `config.js`의 `apiUrl` 값에 웹 앱 URL을 붙여 넣습니다.
13. 변경한 `config.js`를 커밋하고 GitHub Pages에 다시 배포합니다.

## 관리자 로그인

- 관리자 아이디 기본값: `admin`
- 관리자 비밀번호: `setAdminPassword`에서 설정한 값

## 관리자 기능

- 신청자 목록 조회
- 신청자 상세 정보 보기
- 고유번호별 치료일지 작성 및 저장
- 풀배터리 검사지 종류별 사용 여부 및 결과 입력
- 검사 결과를 숫자 또는 이미지/파일 URL로 기록
- 저장된 치료일지와 검사결과를 상세 화면에서 조회
- 상세 기록 및 치료일지 프린트
- 상세 기록 및 치료일지 복사
- 최종 상담 종료 처리
- 최종 상담 이후 파일 보존, 삭제, 이관 선택
- 선택 삭제
- 선택 항목 또는 전체 항목을 엑셀 파일로 만들어 `hanart73@gmail.com`에 메일 전송

## 보안 메모

관리자 비밀번호는 GitHub Pages 소스에 저장하지 않습니다. 실제 비밀번호 해시는 Apps Script의 Script Properties에 저장됩니다.
관리자 데이터 조회, 치료일지 저장, 검사결과 저장, 종결 처리는 Apps Script 관리자 토큰이 있어야 실행됩니다.
