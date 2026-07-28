// api/posts.js
// 게시판 API (Vercel 서버리스 함수)
// GET  /api/posts       -> 게시글 목록 조회 (최신순)
// POST /api/posts       -> 게시글 작성 { nickname, title, content }
//
// 데이터 저장소로 Vercel KV(Redis 호환)를 사용합니다.
// Vercel 대시보드 -> 프로젝트 -> Storage -> Create Database -> KV 를 만들어
// 이 프로젝트에 연결하면 KV_REST_API_URL / KV_REST_API_TOKEN 등의 환경변수가
// 자동으로 등록됩니다. (직접 값을 입력할 필요 없음)

const { kv } = require("@vercel/kv");

const INDEX_KEY = "posts:index"; // 게시글 id를 최신순으로 담아두는 리스트
const MAX_POSTS = 500; // 무한정 쌓이지 않도록 최근 500개만 유지

function makeId() {
  return `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}`;
}

module.exports = async function handler(req, res) {
  try {
    if (req.method === "GET") {
      const ids = await kv.lrange(INDEX_KEY, 0, MAX_POSTS - 1);
      if (!ids || ids.length === 0) {
        return res.status(200).json({ posts: [] });
      }
      const posts = await Promise.all(ids.map((id) => kv.get(`posts:${id}`)));
      return res.status(200).json({ posts: posts.filter(Boolean) });
    }

    if (req.method === "POST") {
      const body = typeof req.body === "string" ? JSON.parse(req.body || "{}") : (req.body || {});
      const nickname = (body.nickname || "").trim();
      const title = (body.title || "").trim();
      const content = (body.content || "").trim();

      if (!nickname || !title || !content) {
        return res.status(400).json({ error: "닉네임, 제목, 내용을 모두 입력해주세요." });
      }
      if (nickname.length > 20) {
        return res.status(400).json({ error: "닉네임은 20자 이내로 입력해주세요." });
      }
      if (title.length > 100) {
        return res.status(400).json({ error: "제목은 100자 이내로 입력해주세요." });
      }
      if (content.length > 2000) {
        return res.status(400).json({ error: "내용은 2000자 이내로 입력해주세요." });
      }

      const post = {
        id: makeId(),
        nickname,
        title,
        content,
        createdAt: new Date().toISOString(),
      };

      await kv.set(`posts:${post.id}`, post);
      await kv.lpush(INDEX_KEY, post.id);
      await kv.ltrim(INDEX_KEY, 0, MAX_POSTS - 1);

      return res.status(201).json({ post });
    }

    res.setHeader("Allow", "GET, POST");
    return res.status(405).json({ error: "GET, POST 요청만 지원합니다." });
  } catch (err) {
    console.error("Unhandled error in /api/posts:", err);
    const hint = /kv|KV|token|url/i.test(String(err && err.message))
      ? "Vercel KV가 이 프로젝트에 연결되어 있는지 확인해주세요."
      : undefined;
    return res.status(500).json({ error: "게시판 처리 중 오류가 발생했습니다.", hint });
  }
};
