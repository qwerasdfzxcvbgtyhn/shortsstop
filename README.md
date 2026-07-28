# 리와인드 (Rewind) — 숏폼 제한 코치

숏폼(쇼츠·릴스·틱톡 등) 사용에 대한 고민을 입력하면, Gemini API가 선택한 제한 강도에 맞춰
**일일 사용 제한 시간 / 화면 흑백 전환 여부 / 제한 도달 시 메시지**를 설계하고,
그에 따른 **예상 절약 시간**과 **실천 팁**을 보여주는 웹앱입니다.

깔끔한 알람 앱 스타일의 UI로, 원형 다이얼에 예상 절약 시간을 표시합니다.

또한 닉네임 / 제목 / 내용을 남길 수 있는 **게시판**도 포함되어 있어, 사용자들끼리 절제 경험을 공유할 수 있습니다.

## 폴더 구조

```
shortform-limit-coach/
├── index.html          # 메인 프론트엔드 (숏폼 제한 코치)
├── board.html           # 게시판 프론트엔드 (닉네임/제목/내용 작성 + 글 목록)
├── api/
│   ├── generate.js     # Gemini API 호출을 담당하는 Vercel 서버리스 함수
│   └── posts.js        # 게시판 글 조회(GET)/작성(POST) 서버리스 함수 (Vercel KV 사용)
├── package.json
├── .gitignore
├── LICENSE
└── README.md
```

## 동작 방식

1. 사용자가 숏폼 사용 문제 상황과 제한 강도(약하게 / 보통 / 강하게)를 입력합니다.
2. 프론트엔드가 `/api/generate` 로 `{ problem, intensity }`를 POST 요청합니다.
3. `api/generate.js`가 서버 환경변수의 `GEMINI_API_KEY`를 사용해 Gemini API를 호출합니다.
4. Gemini가 구조화된 JSON(제한 설정 + 예상 절약 시간 + 팁)을 반환하면, 화면에 렌더링합니다.

API 키는 클라이언트 코드에 절대 포함되지 않고, 서버리스 함수 안에서만 사용됩니다.

### 게시판 동작 방식

1. `board.html`에서 닉네임 / 제목 / 내용을 입력하고 "글 등록하기"를 누르면 `/api/posts`로 POST 요청을 보냅니다.
2. `api/posts.js`가 Vercel KV(Redis 호환 저장소)에 글을 저장합니다.
3. 페이지를 열거나 글을 등록하면 `/api/posts`로 GET 요청을 보내 전체 글 목록(최신순)을 불러와 화면에 표시합니다.
4. 닉네임 20자 / 제목 100자 / 내용 2000자 이내로 제한되며, 최근 500개의 글만 보관됩니다.

## 로컬에서 실행하기

Vercel CLI를 사용하면 정적 파일과 서버리스 함수를 함께 로컬에서 실행할 수 있습니다.

```bash
npm install -g vercel
vercel dev
```

실행 전, 프로젝트 루트에 `.env` 파일을 만들고 아래 내용을 추가하세요. (`.env`는 `.gitignore`에 포함되어 커밋되지 않습니다.)

```
GEMINI_API_KEY=여기에_발급받은_Gemini_API_키
```

게시판 기능(`api/posts.js`)을 로컬에서 테스트하려면 Vercel KV 환경변수도 필요합니다. 아래 "게시판 저장소(Vercel KV) 연결하기"에서 KV를 먼저 만든 뒤, 다음 명령으로 로컬에 환경변수를 받아올 수 있습니다.

```bash
vercel env pull .env.development.local
```

## Vercel에 배포하기

### 방법 1: Vercel 대시보드

1. 이 프로젝트를 GitHub 저장소에 push 합니다.
2. [vercel.com](https://vercel.com) 에서 **New Project** → 방금 만든 저장소를 선택합니다.
3. **Environment Variables** 항목에 아래 값을 추가합니다.
   - Key: `GEMINI_API_KEY`
   - Value: 발급받은 Gemini API 키
4. **Deploy** 를 클릭하면 배포가 완료됩니다.

### 방법 2: Vercel CLI

```bash
npm install -g vercel
vercel

# 배포 후 환경변수 등록
vercel env add GEMINI_API_KEY

# 프로덕션 배포
vercel --prod
```

## Gemini API 키 발급받기

1. [Google AI Studio](https://aistudio.google.com/app/apikey) 에 접속합니다.
2. **Create API key** 를 눌러 키를 발급받습니다.
3. 발급받은 키를 위 안내에 따라 `GEMINI_API_KEY` 환경변수로 등록합니다.

## 게시판 저장소(Vercel KV) 연결하기

게시판은 글을 저장하기 위해 **Vercel KV**(Redis 호환 저장소)가 필요합니다. `GEMINI_API_KEY`와 달리 값을 직접 입력하는 대신, KV를 만들어 프로젝트에 "연결"만 하면 필요한 환경변수(`KV_REST_API_URL`, `KV_REST_API_TOKEN` 등)가 자동으로 등록됩니다.

1. Vercel 대시보드 → 이 프로젝트 → 상단 **Storage** 탭으로 이동합니다.
2. **Create Database** → **KV** 선택 → 이름을 정하고 생성합니다.
3. 생성된 KV를 현재 프로젝트에 **Connect**(연결)합니다. (Production / Preview / Development 환경 모두 체크 권장)
4. 연결이 끝나면 프로젝트를 다시 배포합니다. (Deployments → 최신 배포 → **Redeploy**, 또는 새로 git push)

이 과정을 마치면 `board.html`에서 글 작성/조회가 정상적으로 동작합니다. 만약 "게시판 처리 중 오류가 발생했습니다"라는 메시지가 뜬다면 KV가 프로젝트에 연결되어 있는지, 재배포를 했는지 먼저 확인해주세요.

## 사용 기술

- 프론트엔드: 순수 HTML / CSS / JavaScript (별도 프레임워크·빌드 도구 없음)
- 백엔드: Vercel Serverless Function (Node.js, `api/generate.js`, `api/posts.js`)
- AI: Google Gemini API (`gemini-2.0-flash`, 구조화된 JSON 응답 스키마 사용)
- 게시판 저장소: Vercel KV (Redis 호환)

## 주의 사항

- 표시되는 "절약 시간"은 사용자가 입력한 내용을 바탕으로 한 AI의 추정치이며, 실제 결과와 다를 수 있습니다.
- 이 앱 자체는 실제로 화면을 흑백으로 바꾸거나 앱을 차단하는 기능은 수행하지 않으며, 어떤 설정을 적용하면 좋을지 "설계 및 추천"해주는 코치 역할을 합니다.

## 라이선스

MIT License. 자세한 내용은 [LICENSE](./LICENSE) 파일을 참고하세요.
