/* Coin + redeem — in-memory store (fallback karena Netlify Blobs gak aktif di plan free) */

const CHECKIN_INTERVAL = 3 * 60 * 60 * 1000;
const CHECKIN_REWARD   = 5;
const WELCOME_REWARD   = 3;
const ADMIN_TOKEN      = "FEBZ-OWNER-8505";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Admin-Token"
};

function ok(data){ return { statusCode:200, headers:{ ...CORS, "Content-Type":"application/json" }, body: JSON.stringify(data) }; }
function err(msg, extra){ return { statusCode:400, headers:{ ...CORS, "Content-Type":"application/json" }, body: JSON.stringify(Object.assign({ error: msg }, extra||{})) }; }
function randSeg(n){
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for(let i=0;i<n;i++) s += chars[Math.floor(Math.random()*chars.length)];
  return s;
}

/* in-memory store */
let USERS = {};
let CODES = {};

exports.handler = async (event) => {
  try {
    if(event.httpMethod === "OPTIONS") return { statusCode:200, headers:CORS, body:"" };
    if(event.httpMethod !== "POST") return { statusCode:405, headers:CORS, body:"Method not allowed" };

    let body = {};
    try{ body = JSON.parse(event.body || "{}"); }catch{}
    const { userId, action } = body;

    /* === ADMIN === */
    const token = event.headers["x-admin-token"] || event.headers["X-Admin-Token"];
    if(action && action.startsWith("admin-")){
      if(token !== ADMIN_TOKEN) return err("token admin salah");

      if(action === "admin-list"){
        const list = Object.entries(CODES).map(([code, meta]) => ({ code, ...meta }));
        return ok({ codes: list });
      }
      if(action === "admin-create"){
        const coins  = Math.max(1, parseInt(body.coins)||0);
        const qty    = Math.max(1, Math.min(50, parseInt(body.qty)||1));
        const prefix = String(body.prefix||"FEBZ").toUpperCase().replace(/[^A-Z0-9]/g,"") || "FEBZ";
        const made = [];
        for(let i=0;i<qty;i++){
          let code;
          do { code = prefix+"-"+randSeg(4)+"-"+randSeg(4); } while(CODES[code]);
          CODES[code] = { coins, used:false, createdAt: Date.now() };
          made.push(code);
        }
        return ok({ created: made });
      }
      if(action === "admin-delete"){
        delete CODES[String(body.code||"").toUpperCase()];
        return ok({ deleted: body.code });
      }
      if(action === "admin-clear"){
        CODES = {};
        return ok({ cleared: true });
      }
      return err("action admin tidak dikenal");
    }

    /* === USER === */
    if(!userId) return err("userId wajib");
    if(!USERS[userId]){
      USERS[userId] = { coins: WELCOME_REWARD, lastCheckin: 0, createdAt: Date.now(), isNew: true };
    }
    const u = USERS[userId];

    if(action === "get"){
      const ready = Date.now() - (u.lastCheckin||0) >= CHECKIN_INTERVAL;
      const isWelcome = !!u.isNew;
      if(u.isNew) u.isNew = false;   // welcome cuma sekali
      return ok({
        coins: u.coins|0,
        checkinReady: ready,
        lastCheckin: u.lastCheckin|0,
        welcome: isWelcome,
        welcomeReward: WELCOME_REWARD
      });
    }
    if(action === "add"){
      u.coins = (u.coins|0) + Math.max(0, parseInt(body.amount)||0);
      return ok({ coins: u.coins });
    }
    if(action === "spend"){
      const n = Math.max(0, parseInt(body.amount)||0);
      if((u.coins|0) < n) return err("coin kurang", { coins: u.coins|0 });
      u.coins = (u.coins|0) - n;
      return ok({ coins: u.coins });
    }
    if(action === "refund"){
      u.coins = (u.coins|0) + Math.max(0, parseInt(body.amount)||0);
      return ok({ coins: u.coins });
    }
    if(action === "checkin"){
      const ready = Date.now() - (u.lastCheckin||0) >= CHECKIN_INTERVAL;
      if(!ready) return err("belum waktunya", { lastCheckin: u.lastCheckin|0 });
      u.lastCheckin = Date.now();
      u.coins = (u.coins|0) + CHECKIN_REWARD;
      return ok({ coins: u.coins, reward: CHECKIN_REWARD });
    }
    if(action === "redeem"){
      const code = String(body.code||"").trim().toUpperCase();
      if(!code) return err("kode kosong");
      const item = CODES[code];
      if(!item) return err("kode invalid");
      if(item.used) return err("kode sudah dipakai");
      item.used = true;
      u.coins = (u.coins|0) + (item.coins|0);
      return ok({ coins: u.coins, reward: item.coins });
    }

    return err("action tidak dikenal");
  } catch (e) {
    return { statusCode:500, headers:{ ...CORS, "Content-Type":"application/json" }, body: JSON.stringify({ error: e.message }) };
  }
};
