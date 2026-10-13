const { getStore } = require("@netlify/blobs");

const CHECKIN_INTERVAL = 3 * 60 * 60 * 1000;
const CHECKIN_REWARD   = 3;
const ADMIN_TOKEN      = "FEBZ-OWNER-8505";

const CORS = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, X-Admin-Token"
};

function ok(data){
  return { statusCode:200, headers:{ ...CORS, "Content-Type":"application/json" }, body: JSON.stringify(data) };
}
function err(msg, extra){
  return { statusCode:400, headers:{ ...CORS, "Content-Type":"application/json" }, body: JSON.stringify(Object.assign({ error: msg }, extra||{})) };
}
function randSeg(n){
  const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
  let s = "";
  for(let i=0;i<n;i++) s += chars[Math.floor(Math.random()*chars.length)];
  return s;
}

exports.handler = async (event) => {
  try {
    if(event.httpMethod === "OPTIONS") return { statusCode:200, headers:CORS, body:"" };
    if(event.httpMethod !== "POST") return { statusCode:405, headers:CORS, body:"Method not allowed" };

    let body = {};
    try{ body = JSON.parse(event.body || "{}"); }catch{}
    const { userId, action } = body;

    const store = getStore("toolhub");

    /* === ADMIN ACTIONS === */
    const token = event.headers["x-admin-token"] || event.headers["X-Admin-Token"];
    if(action && action.startsWith("admin-")){
      if(token !== ADMIN_TOKEN) return err("token admin salah");

      if(action === "admin-list"){
        const { blobs } = await store.list({ prefix: "code:" });
        const codes = [];
        for(const b of blobs){
          const data = await store.get(b.key, { type:"json" });
          if(data) codes.push(Object.assign({ code: b.key.replace(/^code:/,"") }, data));
        }
        return ok({ codes });
      }
      if(action === "admin-create"){
        const coins  = Math.max(1, parseInt(body.coins)||0);
        const qty    = Math.max(1, Math.min(50, parseInt(body.qty)||1));
        const prefix = String(body.prefix||"FEBZ").toUpperCase().replace(/[^A-Z0-9]/g,"") || "FEBZ";
        const made = [];
        for(let i=0;i<qty;i++){
          let code, exists = true;
          while(exists){
            code = prefix+"-"+randSeg(4)+"-"+randSeg(4);
            exists = !!(await store.get("code:"+code, { type:"json" }));
          }
          await store.setJSON("code:"+code, { coins, used:false, createdAt: Date.now() });
          made.push(code);
        }
        return ok({ created: made });
      }
      if(action === "admin-delete"){
        await store.delete("code:"+String(body.code||"").toUpperCase());
        return ok({ deleted: body.code });
      }
      if(action === "admin-clear"){
        const { blobs } = await store.list({ prefix: "code:" });
        for(const b of blobs) await store.delete(b.key);
        return ok({ cleared: true });
      }
      return err("action admin tidak dikenal");
    }

    /* === USER ACTIONS === */
    if(!userId) return err("userId wajib");

    const userKey = "user:" + userId;
    let u = await store.get(userKey, { type:"json" });
    if(!u){
      u = { coins:0, lastCheckin:0, createdAt: Date.now() };
      await store.setJSON(userKey, u);
    }

    if(action === "get"){
      const ready = Date.now() - (u.lastCheckin||0) >= CHECKIN_INTERVAL;
      return ok({ coins: u.coins|0, checkinReady: ready, lastCheckin: u.lastCheckin|0 });
    }
    if(action === "add"){
      u.coins = (u.coins|0) + Math.max(0, parseInt(body.amount)||0);
      await store.setJSON(userKey, u);
      return ok({ coins: u.coins });
    }
    if(action === "spend"){
      const n = Math.max(0, parseInt(body.amount)||0);
      if((u.coins|0) < n) return err("coin kurang", { coins: u.coins|0 });
      u.coins = (u.coins|0) - n;
      await store.setJSON(userKey, u);
      return ok({ coins: u.coins });
    }
    if(action === "refund"){
      u.coins = (u.coins|0) + Math.max(0, parseInt(body.amount)||0);
      await store.setJSON(userKey, u);
      return ok({ coins: u.coins });
    }
    if(action === "checkin"){
      const ready = Date.now() - (u.lastCheckin||0) >= CHECKIN_INTERVAL;
      if(!ready) return err("belum waktunya", { lastCheckin: u.lastCheckin|0 });
      u.lastCheckin = Date.now();
      u.coins = (u.coins|0) + CHECKIN_REWARD;
      await store.setJSON(userKey, u);
      return ok({ coins: u.coins, reward: CHECKIN_REWARD });
    }
    if(action === "redeem"){
      const code = String(body.code||"").trim().toUpperCase();
      if(!code) return err("kode kosong");
      const codeKey = "code:" + code;
      const item = await store.get(codeKey, { type:"json" });
      if(!item) return err("kode invalid");
      if(item.used) return err("kode sudah dipakai");
      item.used = true;
      item.usedBy = userId;
      item.usedAt = Date.now();
      await store.setJSON(codeKey, item);
      u.coins = (u.coins|0) + (item.coins|0);
      await store.setJSON(userKey, u);
      return ok({ coins: u.coins, reward: item.coins });
    }

    return err("action tidak dikenal");
  } catch (e) {
    return { statusCode:500, headers:{ ...CORS, "Content-Type":"application/json" }, body: JSON.stringify({ error: e.message, stack: e.stack }) };
  }
};
