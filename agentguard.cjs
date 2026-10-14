// AgentGuard とつなぐファイル（Express）
// 1) このファイル（agentguard.cjs）と .agentguard フォルダを、server.js（または app.js）と同じフォルダに置く
// 2) server.js の app.use(express.json()) のすぐ下に、次の1行を足す
//      require("./agentguard.cjs")(app);
//    （import を使うプロジェクトなら： import agentguard from "./agentguard.cjs"; agentguard(app); ）
// 3) 接続キーは .agentguard フォルダに保存してあります（このフォルダは GitHub には送られません）。
//    GitHub から公開するときだけ、秘密の設定（環境変数）AGENTGUARD_KEY にもキーを入れます。
// これだけで、あなたのサイトかどうかの確認と、守ることの両方が動きます。起動のしかたも、いつもどおりで大丈夫です。
// 検査はサイトの処理（app.get など）より先に行われ、攻撃と判断したアクセスはサイトのコードまで届きません。
// （使わなくても大丈夫）AGENTGUARD_FAIL_CLOSED=true も設定すると、AgentGuard に確認できないときもアクセスを止めます。
const { createHmac } = require("node:crypto");
const fs = require("node:fs");
const path = require("node:path");

const AGENTGUARD_INGEST = "https://target-1032914465512.asia-northeast1.run.app/ingest";
const AGENTGUARD_VERIFY_PATH = "/.well-known/agentguard-verify.txt";
// パスワードなどの欄は伏せて送ります（攻撃の形をした値だけは、検査のためそのまま送ります）
const SECRET = /pass|pwd|token|secret|card|cvc|otp|api[-_]?key/i;
const ATTACK = /['"\x60]\s*(or|and)\s|['"\x60]\s*(--|#)|<\s*script|\bunion\s+select\b|;\s*(drop|delete|insert|update)\s/i;
const mask = (v, k = "") =>
  Array.isArray(v) ? v.map((x) => mask(x, k))
  : v && typeof v === "object" ? Object.fromEntries(Object.entries(v).map(([kk, vv]) => [kk, mask(vv, kk)]))
  : SECRET.test(k) && !(typeof v === "string" && ATTACK.test(v)) ? "[伏せ字]" : v;
// 本当の接続元は X-Forwarded-For の最後（前の部分は偽装できます）
const clientIp = (req) => (req.get("x-forwarded-for") || "").split(",").pop().trim() || req.socket.remoteAddress;

// 接続キー：秘密の設定 AGENTGUARD_KEY があればそれを、なければ .agentguard フォルダに保存したものを使います
// （保存したキーは、見ただけでは分からない形にしてあります）
function savedKey() {
  const pad = "agentguard";
  for (const dir of [__dirname, process.cwd()]) {
    try {
      const line = fs.readFileSync(path.join(dir, ".agentguard", ".settings"), "utf8").split("\n").find((l) => l.startsWith("v1:"));
      if (line) return Buffer.from(Buffer.from(line.slice(3).trim(), "base64").map((b, i) => b ^ pad.charCodeAt(i % pad.length))).toString();
    } catch {
      // まだ置いていないときは、秘密の設定だけを使います
    }
  }
}
const SAVED_KEY = savedKey();

module.exports = function agentguard(app) {
  app.use(async (req, res, next) => {
    // キーを保存したフォルダと、設定セットのフォルダは、サイトを見る人には絶対に見せません
    if (req.path.includes("/.agentguard") || req.path.includes("/agentguard-setup")) return res.status(404).type("text/plain").send("Not Found");
    const key = process.env.AGENTGUARD_KEY || SAVED_KEY;
    if (!key) return next();
    if (req.path === AGENTGUARD_VERIFY_PATH) {
      // あなたのサイトかどうかの確認：キーそのものは見せずに、毎回ちがう問題への答えだけを返す
      const secret = createHmac("sha256", key).update("agentguard-verify").digest();
      const answer = createHmac("sha256", secret).update(String(req.query.challenge || "")).digest("hex");
      return res.type("text/plain").send(answer);
    }
    try {
      const r = await fetch(AGENTGUARD_INGEST, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: "Bearer " + key },
        body: JSON.stringify({
          method: req.method, path: req.path, query: mask(req.query),
          headers: { "user-agent": req.get("user-agent") || "", referer: req.get("referer") || "", "content-type": "application/json" },
          // フォームと JSON の中身も検査します
          body: req.body && typeof req.body === "object" && Object.keys(req.body).length ? JSON.stringify(mask(req.body)).slice(0, 60000) : "",
          ip: clientIp(req),
        }),
        signal: AbortSignal.timeout(2000),
      });
      if (!r.ok) throw new Error("AgentGuard " + r.status);
      const d = await r.json();
      if (d.block) return res.status(403).type("text/plain; charset=utf-8").send("AgentGuard がこのアクセスを止めました（" + (d.reasonJa ?? "攻撃の疑い") + "）");
    } catch {
      // AgentGuard に確認できないとき：ふだんは通す（サイトを止めない）。FAIL_CLOSED なら安全のため止める
      if (process.env.AGENTGUARD_FAIL_CLOSED === "true") {
        return res.status(503).set("retry-after", "30").type("text/plain; charset=utf-8")
          .send("安全のため、一時的にアクセスを止めています。しばらくしてからもう一度お試しください。");
      }
    }
    next();
  });
};