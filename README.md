# 리와인드 (Rewind) — 숏폼 제한 코치

숏폼(쇼츠·릴스·틱톡 등) 사용에 대한 고민을 입력하면, Gemini API가 선택한 제한 강도에 맞춰
**일일 사용 제한 시간 / 화면 흑백 전환 여부 / 제한 도달 시 메시지**를 설계하고,
그에 따른 **예상 절약 시간**과 **실천 팁**을 보여주는 웹앱입니다.

깔끔한 알람 앱 스타일의 UI로, 원형 다이얼에 예상 절약 시간을 표시합니다.

## 폴더 구조

```
shortform-limit-coach/
├── index.html          # 프론트엔드 (정적 파일, 별도 빌드 과정 없음)
├── api/
│   └── generate.js     # Gemini API 호출을 담당하는 Vercel 서버리스 함수
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

## 사용 기술

- 프론트엔드: 순수 HTML / CSS / JavaScript (별도 프레임워크·빌드 도구 없음)
- 백엔드: Vercel Serverless Function (Node.js, `api/generate.js`)
- AI: Google Gemini API (`gemini-2.0-flash`, 구조화된 JSON 응답 스키마 사용)

## 주의 사항

- 표시되는 "절약 시간"은 사용자가 입력한 내용을 바탕으로 한 AI의 추정치이며, 실제 결과와 다를 수 있습니다.
- 이 앱 자체는 실제로 화면을 흑백으로 바꾸거나 앱을 차단하는 기능은 수행하지 않으며, 어떤 설정을 적용하면 좋을지 "설계 및 추천"해주는 코치 역할을 합니다.

## 라이선스

MIT License. 자세한 내용은 [LICENSE](./LICENSE) 파일을 참고하세요.
