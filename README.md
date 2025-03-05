## Youtube Analyzer

## 프로젝트 소개
Youtube 채널 및 영상 데이터를 분석하고, 성과도를 시각화하는 서비스
유튜버 '주언규 PD'의 Viewtrap과 유사한 기능을 구현해보는 개인 프로젝트

## 주요 기능
-유튜브 영상 검색 및 조회수, 좋아요, 댓글 수 조회 (키워드 및 제목으로 검색)
-조회수 대비 구독자 수, 업로드일 기준 조회 속도, 시청 지속율, 참여율(댓글, 좋아요) 등을 분석하여 성과도 점수화
-성과도 평가
-자동완성 기능 (검색어 추천)
-검색 키워드 기반 검색 및 영상 제목 검색 지원

## 폴더 구조 
/backend # 백엔드 서버 코드 (Node.js + Express) /frontend # 프론트엔드 코드 (React) /.env # 환경변수 파일 (로컬용, Git에 업로드 X)

## 기술 스택
- 백엔드: Node.js, Express, Axios
- 프론트엔드: React, Fetch API
- 데이터: YouTube Data API v3
- 기타: Puppeteer (웹 크롤링 기능 일부 포함 예정)