/* ============================================================
   BANNER VIDEO
   ============================================================ */
(function(){
  const v = document.getElementById("bannerVideo");
  const wrap = document.getElementById("bannerWrapper");
  if(!v || !wrap) return;
  v.muted = true;
  v.play().catch(()=>{});
  function playWithSound(){
    v.muted = false;
    v.play().then(()=>wrap.classList.add("playing")).catch(()=>{});
  }
  document.addEventListener("click", function firstClick(){
    playWithSound();
    document.removeEventListener("click", firstClick);
  });
  wrap.addEventListener("click", playWithSound);
  v.addEventListener("ended", ()=>{ v.currentTime = 0; v.play().catch(()=>{}); });
})();

/* ============================================================
   LIVE CLOCK
   ============================================================ */
(function(){
  const elTime = document.getElementById("clockTime");
  const elDay  = document.getElementById("clockDay");
  const elDate = document.getElementById("clockDate");
  const elYear = document.getElementById("clockYear");
  if(!elTime || !elDay || !elDate || !elYear) return;
  const HARI  = ["Minggu","Senin","Selasa","Rabu","Kamis","Jumat","Sabtu"];
  const BULAN = ["Januari","Februari","Maret","April","Mei","Juni",
                 "Juli","Agustus","September","Oktober","November","Desember"];
  const pad = n => String(n).padStart(2,"0");
  function tick(){
    const d = new Date();
    elTime.textContent = pad(d.getHours())+":"+pad(d.getMinutes())+":"+pad(d.getSeconds());
    elDay.textContent  = HARI[d.getDay()];
    elDate.textContent = d.getDate()+" "+BULAN[d.getMonth()];
    elYear.textContent = d.getFullYear();
  }
  tick(); setInterval(tick, 1000);
})();

/* ============================================================
   API & CONFIG
   ============================================================ */
const BASE = "https://api.nexray.eu.cc";
const AMPREM_API = "https://anita-studio.netlify.app/.netlify/functions/amprem";

const OWNER_NAME = "FebzTzy";
const OWNER_WA   = "6289679137206";
const WA_MSG_BUG = "Halo owner, saya mau lapor BUG di ToolHub:";
const WA_MSG_BUY = "Halo owner, saya mau BELI COIN ToolHub.";

const AMPREM_OWNER_CODE = "ALIGHT-VIP-5509";
const AMPREM_WA_NUMBER  = OWNER_WA;
const AMPREM_WA_MSG     = "Halo kak, saya ingin beli kode Unlimited Access untuk Alight Motion Premium (ToolHub by "+OWNER_NAME+"). Mohon info harga & cara pembayarannya 🙏";
const AMPREM_TRIAL_LIMIT = 3;
const AMPREM_STORAGE_KEY = "am_trial_state_v1";

const COST_TOOLS   = 1;
const COST_CRACKER = 3;
const COST_WEBTOOL = 1;

/* ============================================================
   COIN SYSTEM — serverless
   ============================================================ */
const API_COIN = "/api/coins";
const USER_KEY = "toolhub_userid_v1";

function getUserId(){
  let id = localStorage.getItem(USER_KEY);
  if(!id){
    id = "u_" + Math.random().toString(36).slice(2,10) + Date.now().toString(36);
    localStorage.setItem(USER_KEY, id);
  }
  return id;
}
const USER_ID = getUserId();

let coinCache = 0;
let checkinReadyCache = false;
let lastCheckinCache = 0;

async function coinAPI(action, extra){
  const res = await fetch(API_COIN, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(Object.assign({ userId: USER_ID, action }, extra||{}))
  });
  const data = await res.json().catch(()=>({}));
  if(!res.ok) throw new Error(data.error || ("HTTP "+res.status));
  return data;
}

async function refreshCoins(){
  try{
    const d = await coinAPI("get");
    coinCache = d.coins|0;
    checkinReadyCache = !!d.checkinReady;
    lastCheckinCache = d.lastCheckin|0;
    renderCoins();
    renderCheckin();
  }catch(e){
    console.warn("coin refresh gagal:", e.message);
  }
}
function getCoins(){ return coinCache; }
function renderCoins(){
  const el = document.getElementById("coinVal");
  if(el) el.textContent = coinCache;
}

/* ============================================================
   CHECK-IN
   ============================================================ */
const CHECKIN_INTERVAL = 3 * 60 * 60 * 1000;

function fmtLeft(){
  const left = CHECKIN_INTERVAL - (Date.now() - lastCheckinCache);
  if(left <= 0) return "";
  const total = Math.ceil(left/1000);
  const h = Math.floor(total/3600);
  const m = Math.floor((total%3600)/60);
  const s = total%60;
  return (h>0?h+"j ":"")+m+"m "+s+"d";
}
function renderCheckin(){
  const btn = document.getElementById("checkinBtn");
  const txt = document.getElementById("checkinTxt");
  if(!btn || !txt) return;
  if(checkinReadyCache){
    btn.disabled = false; btn.classList.add("ready");
    txt.textContent = "CHECK IN";
  } else {
    btn.disabled = true; btn.classList.remove("ready");
    txt.textContent = fmtLeft() || "3 JAM";
  }
}
setInterval(() => { if(!checkinReadyCache) renderCheckin(); }, 1000);

function openCheckin(){
  const ov = document.getElementById("checkinOverlay");
  const big = document.getElementById("ciBig");
  const msg = document.getElementById("ciMsg");
  const btn = document.getElementById("ciClaim");
  if(!ov) return;
  if(checkinReadyCache){
    big.textContent = "🎁";
    msg.textContent = "Reward siap diklaim: 5 coin!";
    btn.disabled = false; btn.textContent = "Klaim 5 Coin"; btn.onclick = doClaimCheckin;
  } else {
    big.textContent = "⏳";
    msg.textContent = "Sudah check-in. Coba lagi dalam " + (fmtLeft()||"sebentar") + ".";
    btn.disabled = true; btn.textContent = "Belum waktunya";
  }
  ov.classList.add("open");
}
function closeCheckin(){
  document.getElementById("checkinOverlay").classList.remove("open");
}
async function doClaimCheckin(){
  if(!checkinReadyCache) return;
  const big = document.getElementById("ciBig");
  const msg = document.getElementById("ciMsg");
  const btn = document.getElementById("ciClaim");
  btn.disabled = true; btn.textContent = "Mengklaim...";
  try{
    const d = await coinAPI("checkin");
    coinCache = d.coins|0;
    checkinReadyCache = false;
    lastCheckinCache = Date.now();
    renderCoins(); renderCheckin();
    big.textContent = "✅";
    msg.textContent = "+"+(d.reward||5)+" coin masuk! Saldo: "+coinCache;
    btn.textContent = "Berhasil";
  }catch(e){
    big.textContent = "❌"; msg.textContent = e.message; btn.textContent = "Gagal";
  }
}

/* ============================================================
   REDEEM
   ============================================================ */
function openRedeem(){
  document.getElementById("redeemOverlay").classList.add("open");
  const input = document.getElementById("redeemInput");
  const res = document.getElementById("redeemResult");
  if(input) input.value = "";
  if(res){ res.className = "result"; res.innerHTML = ""; }
}
function closeRedeem(){
  document.getElementById("redeemOverlay").classList.remove("open");
}
async function submitRedeem(){
  const input = document.getElementById("redeemInput");
  const res = document.getElementById("redeemResult");
  const code = (input.value || "").trim().toUpperCase();
  if(!code){
    res.className = "result show err"; res.innerHTML = "<pre>Masukkan kode dulu.</pre>"; return;
  }
  res.className = "result show"; res.innerHTML = "<pre>Memproses...</pre>";
  try{
    const d = await coinAPI("redeem", { code });
    coinCache = d.coins|0; renderCoins();
    res.className = "result show ok";
    res.innerHTML = "<pre>🎉 Berhasil! +"+(d.reward||0)+" coin masuk.\nSaldo sekarang: "+coinCache+"</pre>";
  }catch(e){
    res.className = "result show err";
    res.innerHTML = "<pre>❌ "+escapeHTML(e.message)+"</pre>";
  }
}

/* ============================================================
   TOOLS DATA
   ============================================================ */
let activeTool = null;
let lastResult = null;
let ampremState = null;

const TOOLS = [
  { id:"fake_ff", title:"Fake Lobby FF", desc:"Generate fake lobby Free Fire — masukkan nickname.",
    ico:"🎮", acc:"",
    fields:[{key:"nickname",label:"Nickname",type:"text",placeholder:"PlayerOne"}],
    buildURL: p => BASE+"/maker/fakelobyff?nickname="+encodeURIComponent(p.nickname||""),
    filename: p => "fakelobyff_"+(p.nickname||"player").replace(/\s+/g,"_")+"_"+Date.now()+".png" },

  { id:"fake_dana", title:"Fake Dana", desc:"Fake saldo Dana — masukkan nominal.",
    ico:"💳", acc:"acc-purple",
    fields:[{key:"nominal",label:"Nominal (Rp)",type:"number",placeholder:"1000000"}],
    buildURL: p => BASE+"/maker/fakedana?nominal="+encodeURIComponent(p.nominal||""),
    filename: p => "fakedana_"+(p.nominal||"0")+"_"+Date.now()+".png" },

  { id:"fake_jago", title:"Fake Bank Jago", desc:"Fake saldo Bank Jago — nama & jumlah saldo.",
    ico:"🏦", acc:"acc-green",
    fields:[
      {key:"nama",label:"Nama Pemilik",type:"text",placeholder:"Budi Santoso"},
      {key:"saldo",label:"Saldo (Rp)",type:"number",placeholder:"5000000"}
    ],
    buildURL: p => BASE+"/maker/fakebank-jago?nama="+encodeURIComponent(p.nama||"")+"&saldo="+encodeURIComponent(p.saldo||""),
    filename: p => "fakebankjago_"+(p.nama||"user").replace(/\s+/g,"_")+"_"+Date.now()+".png" },

  { id:"fake_ml", title:"Fake Mobile Legends", desc:"Fake lobby ML — URL avatar + nickname.",
    ico:"⚔️", acc:"acc-purple",
    fields:[
      {key:"avatar",label:"URL Avatar",type:"text",placeholder:"https://files.catbox.moe/xxx.jpg"},
      {key:"nickname",label:"Nickname",type:"text",placeholder:"MLPlayer"}
    ],
    buildURL: p => BASE+"/maker/fakelobyml?avatar="+encodeURIComponent(p.avatar||"")+"&nickname="+encodeURIComponent(p.nickname||""),
    filename: p => "fakelobyml_"+(p.nickname||"player").replace(/\s+/g,"_")+"_"+Date.now()+".png" },

  { id:"fake_story", title:"Fake Story", desc:"Fake story — URL avatar, username, caption.",
    ico:"📸", acc:"acc-purple",
    fields:[
      {key:"avatar",label:"URL Avatar",type:"text",placeholder:"https://files.catbox.moe/xxx.jpg"},
      {key:"username",label:"Username",type:"text",placeholder:"username_ig"},
      {key:"caption",label:"Caption",type:"textarea",placeholder:"tulis caption di sini"}
    ],
    buildURL: p => BASE+"/maker/fakestory?avatar="+encodeURIComponent(p.avatar||"")+"&username="+encodeURIComponent(p.username||"")+"&caption="+encodeURIComponent(p.caption||""),
    filename: p => "fakestory_"+(p.username||"user").replace(/[^a-z0-9]/gi,"_")+"_"+Date.now()+".png" },

  { id:"iqc_v1", title:"IQC v1", desc:"Generate IQC versi 1 — masukkan teks.",
    ico:"🧪", acc:"acc-green",
    fields:[{key:"text",label:"Teks",type:"textarea",placeholder:"tulis teks di sini"}],
    buildURL: p => BASE+"/maker/iqc?text="+encodeURIComponent(p.text||""),
    filename: () => "iqc_v1_"+Date.now()+".png" },

  { id:"iqc_v2", title:"IQC v2", desc:"IQC v2 — teks, provider, jam, baterai.",
    ico:"🧬", acc:"acc-green",
    fields:[
      {key:"text",label:"Teks",type:"textarea",placeholder:"tulis teks di sini"},
      {key:"provider",label:"Provider",type:"select",options:["Telkomsel","Indosat","XL","Tri","Smartfren","Axis"]},
      {key:"jam",label:"Jam",type:"text",placeholder:"14:30"},
      {key:"baterai",label:"Baterai (%)",type:"number",placeholder:"85"}
    ],
    buildURL: p => BASE+"/maker/v1/iqc?text="+encodeURIComponent(p.text||"")+"&provider="+encodeURIComponent(p.provider||"")+"&jam="+encodeURIComponent(p.jam||"")+"&baterai="+encodeURIComponent(p.baterai||""),
    filename: () => "iqc_v2_"+Date.now()+".png" },

  { id:"wink_hdr", title:"Wink HDR", desc:"Enhance foto / video via Wink HDR — masukkan URL.",
    ico:"🪄", acc:"acc-red",
    fields:[
      {key:"url",label:"URL Foto / Video",type:"text",placeholder:"https://files.catbox.moe/xxx.mp4"},
      {key:"type",label:"Tipe",type:"select",options:["image","video"]}
    ],
    buildURL: p => BASE+"/tools/wink?url="+encodeURIComponent(p.url||"")+"&type="+encodeURIComponent(p.type||"image"),
    filename: p => "winkhdr_"+(p.type||"image")+"_"+Date.now()+(p.type==="video"?".mp4":".png") },

  { id:"hdvideo", title:"HD Video V1", desc:"Upgrade resolusi video — hd / full-hd / 2k / 4k.",
    ico:"🎬", acc:"acc-red",
    fields:[
      {key:"url",label:"URL Video",type:"text",placeholder:"https://files.catbox.moe/xxx.mp4"},
      {key:"resolusi",label:"Resolusi",type:"select",options:["hd","full-hd","2k","4k"]}
    ],
    buildURL: p => BASE+"/tools/v1/hdvideo?url="+encodeURIComponent(p.url||"")+"&resolusi="+encodeURIComponent(p.resolusi||"hd"),
    filename: p => "hdvideo_"+(p.resolusi||"hd")+"_"+Date.now()+".mp4" },

  { id:"remini", title:"Remini", desc:"Perjelas & pertegas foto via Remini — masukkan URL.",
    ico:"🖼️", acc:"acc-red",
    fields:[{key:"url",label:"URL Foto",type:"text",placeholder:"https://files.catbox.moe/xxx.jpg"}],
    buildURL: p => BASE+"/tools/remini?url="+encodeURIComponent(p.url||""),
    filename: () => "remini_"+Date.now()+".png" },

  { id:"unblur", title:"Unblur Image", desc:"Pertajam / hilangkan blur foto.",
    ico:"🔍", acc:"acc-red",
    fields:[{key:"url",label:"URL Foto",type:"text",placeholder:"https://files.catbox.moe/xxx.jpg"}],
    buildURL: p => BASE+"/tools/unblur?url="+encodeURIComponent(p.url||""),
    filename: () => "unblur_"+Date.now()+".png" },

  { id:"nikparse", title:"NIK Parse", desc:"Parse NIK 16 digit — wilayah, tanggal lahir, gender.",
    ico:"🪪", acc:"acc-warn", category:"cracker",
    fields:[{key:"nik",label:"NIK (16 digit)",type:"text",placeholder:"contoh: 3201xxxxxxxxxxxx"}],
    buildURL: p => BASE+"/tools/nikparse?nik="+encodeURIComponent(p.nik||""),
    filename: () => "nikparse_"+Date.now()+".txt" },

  { id:"trackip", title:"Track IP", desc:"Lacak IP dari domain / URL.",
    ico:"🌐", acc:"acc-warn", category:"cracker",
    fields:[{key:"target",label:"Target (domain / URL)",type:"text",placeholder:"google.com"}],
    buildURL: p => BASE+"/tools/trackip?target="+encodeURIComponent(p.target||""),
    filename: () => "trackip_"+Date.now()+".txt" },

  { id:"spamngl", title:"Spam NGL", desc:"Kirim pesan ke link NGL.",
    ico:"💬", acc:"acc-warn", category:"cracker",
    fields:[
      {key:"url",label:"URL NGL",type:"text",placeholder:"https://ngl.link/febztzy"},
      {key:"pesan",label:"Pesan",type:"textarea",placeholder:"tulis pesan di sini"},
      {key:"jumlah",label:"Jumlah",type:"number",placeholder:"6"}
    ],
    buildURL: p => BASE+"/tools/spamngl?url="+encodeURIComponent(p.url||"")+"&pesan="+encodeURIComponent(p.pesan||"")+"&jumlah="+encodeURIComponent(p.jumlah||"1"),
    filename: () => "spamngl_"+Date.now()+".txt" },

  { id:"webtozip", title:"Web to Zip", desc:"Download seluruh halaman web jadi arsip zip.",
    ico:"📦", acc:"acc-green", category:"webtool",
    fields:[{key:"url",label:"URL Website",type:"text",placeholder:"https://febztzy.com"}],
    buildURL: p => BASE+"/tools/webtozip?url="+encodeURIComponent(p.url||""),
    filename: () => "webtozip_"+Date.now()+".zip" },

  { id:"amprem", title:"Create Alight Motion Premium",
    desc:"Aktivasi Alight Motion Premium — kirim magic link, verifikasi, apply.",
    ico:"✨", acc:"acc-red", special:"amprem" }
];

function costOf(tool){
  if(!tool) return 0;
  if(tool.category === "cracker") return COST_CRACKER;
  if(tool.category === "webtool") return COST_WEBTOOL;
  return COST_TOOLS;
}

/* ============================================================
   RENDER MENU
   ============================================================ */
const toolsToggle = document.getElementById("toolsToggle");
const toolsMenu = document.getElementById("toolsMenu");
const toolsMenuInner = document.getElementById("toolsMenuInner");
const crackerToggle = document.getElementById("crackerToggle");
const crackerMenu = document.getElementById("crackerMenu");
const crackerMenuInner = document.getElementById("crackerMenuInner");
const webtoolToggle = document.getElementById("webtoolToggle");
const webtoolMenu = document.getElementById("webtoolMenu");
const webtoolMenuInner = document.getElementById("webtoolMenuInner");

function buildItem(t, menuEl, toggleEl){
  const item = document.createElement("div");
  item.className = "tool-item "+(t.acc||"");
  const cost = costOf(t);
  item.innerHTML = '<div class="ti-ico">'+t.ico+'</div>'+
    '<div class="ti-info"><div class="ti-title">'+t.title+'</div>'+
    '<div class="ti-sub">🪙 '+cost+' coin · by '+OWNER_NAME+'</div></div>'+
    '<div class="ti-arrow">›</div>';
  item.onclick = () => {
    menuEl.classList.remove("open"); toggleEl.classList.remove("open");
    openModal(t.id);
  };
  return item;
}
function closeAllMenus(except){
  if(except!=="tools" && toolsMenu && toolsToggle){ toolsMenu.classList.remove("open"); toolsToggle.classList.remove("open"); }
  if(except!=="cracker" && crackerMenu && crackerToggle){ crackerMenu.classList.remove("open"); crackerToggle.classList.remove("open"); }
  if(except!=="webtool" && webtoolMenu && webtoolToggle){ webtoolMenu.classList.remove("open"); webtoolToggle.classList.remove("open"); }
}
if(toolsMenuInner && toolsMenu && toolsToggle){
  TOOLS.filter(t => t.category !== "cracker" && t.category !== "webtool").forEach(t => {
    toolsMenuInner.appendChild(buildItem(t, toolsMenu, toolsToggle));
  });
  toolsToggle.addEventListener("click", (e) => {
    e.stopPropagation();
    const open = toolsMenu.classList.toggle("open");
    toolsToggle.classList.toggle("open", open);
    if(open) closeAllMenus("tools");
  });
}
if(crackerMenuInner && crackerMenu && crackerToggle){
  TOOLS.filter(t => t.category === "cracker").forEach(t => {
    crackerMenuInner.appendChild(buildItem(t, crackerMenu, crackerToggle));
  });
  crackerToggle.addEventListener("click", (e) => {
    e.stopPropagation();
    const open = crackerMenu.classList.toggle("open");
    crackerToggle.classList.toggle("open", open);
    if(open) closeAllMenus("cracker");
  });
}
if(webtoolMenuInner && webtoolMenu && webtoolToggle){
  TOOLS.filter(t => t.category === "webtool").forEach(t => {
    webtoolMenuInner.appendChild(buildItem(t, webtoolMenu, webtoolToggle));
  });
  webtoolToggle.addEventListener("click", (e) => {
    e.stopPropagation();
    const open = webtoolMenu.classList.toggle("open");
    webtoolToggle.classList.toggle("open", open);
    if(open) closeAllMenus("webtool");
  });
}
document.addEventListener("click", (e) => {
  const insideTools = toolsMenu && toolsToggle && (toolsMenu.contains(e.target) || toolsToggle.contains(e.target));
  const insideCracker = crackerMenu && crackerToggle && (crackerMenu.contains(e.target) || crackerToggle.contains(e.target));
  const insideWeb = webtoolMenu && webtoolToggle && (webtoolMenu.contains(e.target) || webtoolToggle.contains(e.target));
  if(!insideTools && !insideCracker && !insideWeb) closeAllMenus();
});

/* ============================================================
   MODAL
   ============================================================ */
function openModal(id){
  activeTool = TOOLS.find(t => t.id === id);
  if(!activeTool) return;
  lastResult = null;
  document.getElementById("mTitle").textContent = activeTool.title;
  document.getElementById("mSub").textContent = activeTool.desc;
  document.getElementById("mResult").className = "result";
  document.getElementById("mResult").innerHTML = "";
  document.getElementById("mLoader").className = "loader";
  document.getElementById("mExec").disabled = false;
  document.getElementById("mDl").style.display = "none";
  document.getElementById("mExtra").style.display = "none";
  document.getElementById("mExtra").innerHTML = "";
  document.getElementById("mExec").style.display = "block";
  const cost = costOf(activeTool);
  const costEl = document.getElementById("mCost");
  if(costEl) costEl.textContent = "🪙 "+cost+" coin / pakai";
  if(activeTool.special === "amprem") renderAmpRem();
  else renderGeneric();
  document.getElementById("overlay").classList.add("open");
}
function closeModal(){
  document.getElementById("overlay").classList.remove("open");
  activeTool = null; lastResult = null; ampremState = null;
}
function renderGeneric(){
  const wrap = document.getElementById("mFields");
  wrap.innerHTML = "";
  activeTool.fields.forEach(f => {
    const div = document.createElement("div");
    div.className = "field";
    if(f.type === "select"){
      div.innerHTML = '<label>'+f.label+'</label><select data-key="'+f.key+'">'+f.options.map(o=>'<option>'+o+'</option>').join("")+'</select>';
    } else if(f.type === "textarea"){
      div.innerHTML = '<label>'+f.label+'</label><textarea data-key="'+f.key+'" placeholder="'+(f.placeholder||"")+'"></textarea>';
    } else {
      div.innerHTML = '<label>'+f.label+'</label><input type="'+f.type+'" data-key="'+f.key+'" placeholder="'+(f.placeholder||"")+'">';
    }
    wrap.appendChild(div);
  });
}
function collectParams(){
  const params = {};
  document.querySelectorAll("#mFields [data-key]").forEach(el => {
    params[el.dataset.key] = el.value;
  });
  return params;
}
function escapeHTML(s){
  return String(s).replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c]));
}

/* ============================================================
   EXECUTE — dengan potong coin
   ============================================================ */
async function executeTool(){
  if(!activeTool || activeTool.special) return;
  const params = collectParams();
  const loader = document.getElementById("mLoader");
  const execBtn = document.getElementById("mExec");
  const resEl = document.getElementById("mResult");

  const cost = costOf(activeTool);
  if(getCoins() < cost){
    resEl.className = "result show err";
    resEl.innerHTML = "<pre>🪙 Coin tidak cukup.\nButuh "+cost+" coin, saldo kamu: "+getCoins()+".\nCheck-in / redeem / beli coin ke owner.</pre>";
    return;
  }
  loader.classList.add("show"); execBtn.disabled = true;
  resEl.className = "result"; resEl.innerHTML = "";

  // potong di server
  try{
    const d = await coinAPI("spend", { amount: cost });
    coinCache = d.coins|0;
    renderCoins();
  }catch(e){
    resEl.className = "result show err";
    resEl.innerHTML = "<pre>Gagal potong coin: "+escapeHTML(e.message)+"</pre>";
    loader.classList.remove("show"); execBtn.disabled = false;
    return;
  }

  let success = false;
  try{
    const url = activeTool.buildURL(params);
    const res = await fetch(url);

    if(!res.ok){
      const txt = await res.text().catch(()=> "");
      lastResult = { type:"text", data:"HTTP "+res.status+"\n"+(txt||"(no body)"), filename:"error.txt" };
      resEl.className = "result show err";
      resEl.innerHTML = "<pre>"+escapeHTML(lastResult.data)+"</pre>";
    } else {
      const ct = res.headers.get("content-type") || "";
      if(ct.startsWith("image/")){
        const blob = await res.blob();
        const objURL = URL.createObjectURL(blob);
        lastResult = { type:"image", data:objURL, filename: activeTool.filename(params) };
        resEl.className = "result show ok";
        resEl.innerHTML = '<img src="'+objURL+'" alt="result">';
        success = true;
      } else if(ct.startsWith("video/")){
        const blob = await res.blob();
        const objURL = URL.createObjectURL(blob);
        lastResult = { type:"image", data:objURL, filename: activeTool.filename(params) };
        resEl.className = "result show ok";
        resEl.innerHTML = '<video src="'+objURL+'" controls playsinline></video>';
        success = true;
      } else {
        const raw = await res.text();
        let parsed = null;
        try { parsed = JSON.parse(raw); } catch(e){}
        const imgURL = parsed && (parsed.result || parsed.url || parsed.data || parsed.image || parsed.link);
        if(imgURL && typeof imgURL === "string" && /^https?:\/\//.test(imgURL)){
          const isVid = /\.(mp4|webm|mov)$/i.test(imgURL);
          lastResult = { type:"image", data:imgURL, filename: activeTool.filename(params) };
          resEl.className = "result show ok";
          resEl.innerHTML = isVid ? '<video src="'+imgURL+'" controls playsinline></video>' : '<img src="'+imgURL+'" alt="result">';
          success = true;
        } else {
          const pretty = parsed ? JSON.stringify(parsed, null, 2) : raw;
          const isError = /gagal|error|invalid|not found/i.test(pretty) && !parsed?.result && !parsed?.url;
          lastResult = { type:"text", data:pretty, filename: activeTool.filename(params).replace(/\.(png|mp4|zip)$/,".txt") };
          resEl.className = "result show " + (isError ? "err" : "ok");
          resEl.innerHTML = "<pre>"+escapeHTML(pretty)+"</pre>";
          success = !isError;
        }
      }
    }
  }catch(err){
    lastResult = { type:"text", data:"Gagal:\n"+err.message, filename:"error.txt" };
    resEl.className = "result show err";
    resEl.innerHTML = "<pre>"+escapeHTML(lastResult.data)+"</pre>";
  }finally{
    loader.classList.remove("show"); execBtn.disabled = false;
    if(!success){
      try{
        const d = await coinAPI("refund", { amount: cost });
        coinCache = d.coins|0; renderCoins();
      }catch(e){ console.warn("refund gagal", e); }
      const note = document.createElement("div");
      note.style.marginTop = "10px";
      note.style.color = "#fbbf24";
      note.style.fontSize = ".78rem";
      note.textContent = "🪙 Coin dikembalikan karena gagal.";
      resEl.appendChild(note);
    }
    showDownload();
  }
}
function showDownload(){
  const dl = document.getElementById("mDl");
  if(lastResult) dl.style.display = "block";
}
async function downloadResult(){
  if(!lastResult) return;
  const a = document.createElement("a");
  a.download = lastResult.filename || "result";
  a.rel = "noopener";
  const isVideo = /\.(mp4|webm|mov)$/i.test(lastResult.filename || "");
  const isZip = /\.zip$/i.test(lastResult.filename || "");
  if(lastResult.data.startsWith("blob:")){
    a.href = lastResult.data;
    document.body.appendChild(a); a.click(); a.remove();
    return;
  }
  try{
    const r = await fetch(lastResult.data);
    const b = await r.blob();
    const fallbackType = isVideo ? "video/mp4" : (isZip ? "application/zip" : "image/png");
    const blob = b.type ? b : new Blob([b], { type: fallbackType });
    const u = URL.createObjectURL(blob);
    a.href = u; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(()=>URL.revokeObjectURL(u), 5000);
  }catch(e){ window.open(lastResult.data, "_blank"); }
}

/* ============================================================
   AMPREM
   ============================================================ */
function loadAmpRemState(){
  try{
    const raw = localStorage.getItem(AMPREM_STORAGE_KEY);
    if(!raw) return { count:0, unlocked:false };
    const s = JSON.parse(raw);
    return { count: Math.max(0, parseInt(s.count)||0), unlocked: !!s.unlocked };
  }catch{ return { count:0, unlocked:false }; }
}
function saveAmpRemState(s){ try{ localStorage.setItem(AMPREM_STORAGE_KEY, JSON.stringify(s)); }catch{} }
function ampremConsumeTrial(){
  const s = loadAmpRemState(); if(s.unlocked) return;
  s.count++; saveAmpRemState(s);
}
function renderAmpRem(){
  const wrap = document.getElementById("mFields");
  const extra = document.getElementById("mExtra");
  const execBtn = document.getElementById("mExec");
  const costEl = document.getElementById("mCost");
  const state = loadAmpRemState();
  ampremState = { email:"", step:1 };
  const left = Math.max(0, AMPREM_TRIAL_LIMIT - state.count);
  const badge = state.unlocked
    ? '<div class="step-badge gold">👑 UNLIMITED — '+OWNER_NAME+'</div>'
    : '<div class="step-badge">⚡ Trial tersisa: '+left+' / '+AMPREM_TRIAL_LIMIT+' — '+OWNER_NAME+'</div>';
  if(costEl) costEl.textContent = "🪙 Free (trial)";
  wrap.innerHTML = badge
    + '<div id="amStep1"><div class="field"><label>Email</label><input type="email" data-key="email" placeholder="Masukkan email Anda"></div></div>'
    + '<div id="amStep2" class="step-hidden"><div class="field"><label>Raw Magic Link</label><input type="text" data-key="rawLink" placeholder="Tempelkan magic link dari email"></div></div>';
  execBtn.style.display = "none";
  extra.style.display = "flex";
  if(!state.unlocked && left <= 0){
    wrap.innerHTML += '<div class="field" id="amCodeField"><label>Kode Akses Owner</label><input type="text" data-key="unlockCode" placeholder="Masukkan kode akses owner"></div>';
    extra.innerHTML = '<button class="btn btn-wa" id="amBtnBuy">🟢 Beli Kode via WhatsApp</button><button class="btn btn-gold" id="amBtnUnlock">🔓 Aktivasi Kode</button>';
    document.getElementById("amBtnBuy").onclick = () => {
      const mobile = /Android|iPhone|iPad|iPod|Windows Phone/i.test(navigator.userAgent);
      const url = mobile ? "https://wa.me/"+AMPREM_WA_NUMBER+"?text="+encodeURIComponent(AMPREM_WA_MSG)
                         : "https://web.whatsapp.com/send?phone="+AMPREM_WA_NUMBER+"&text="+encodeURIComponent(AMPREM_WA_MSG);
      window.open(url, "_blank");
    };
    document.getElementById("amBtnUnlock").onclick = () => {
      const code = (document.querySelector('[data-key="unlockCode"]')?.value || "").trim();
      const r = document.getElementById("mResult");
      r.className = "result show";
      if(code === AMPREM_OWNER_CODE){
        const s = loadAmpRemState(); s.unlocked = true; saveAmpRemState(s);
        r.className = "result show ok";
        r.innerHTML = "<pre>🎉 Kode valid! Unlimited access terbuka.\nOwner: "+OWNER_NAME+"\nTutup modal, lalu buka lagi untuk mulai.</pre>";
      } else {
        r.className = "result show err";
        r.innerHTML = "<pre>❌ Kode salah. Hubungi owner "+OWNER_NAME+" via WhatsApp.</pre>";
      }
    };
    return;
  }
  extra.innerHTML = '<button class="btn btn-primary" id="amBtnSend">📧 Kirim Magic Link</button>';
  document.getElementById("amBtnSend").onclick = ampremSendMagicLink;
}
async function ampremRequest(action, data){
  const res = await fetch(AMPREM_API, {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify(Object.assign({ action }, data))
  });
  if(!res.ok) throw new Error("HTTP " + res.status);
  return await res.json();
}
async function ampremSendMagicLink(){
  const email = (document.querySelector('[data-key="email"]')?.value || "").trim();
  const res = document.getElementById("mResult");
  const loader = document.getElementById("mLoader");
  const btn = document.getElementById("amBtnSend");
  if(!email){ res.className="result show err"; res.innerHTML="<pre>Masukkan email dulu.</pre>"; return; }
  btn.disabled = true; loader.classList.add("show");
  res.className = "result show"; res.innerHTML = "<pre>Mengirim magic link...</pre>";
  try{
    const data = await ampremRequest("send-magiclink", { email });
    if(data.success){
      res.className = "result show ok";
      res.innerHTML = "<pre>✅ Magic link dikirim ke "+email+".\nCek inbox/spam, lalu tempelkan raw magic link di kolom bawah.\n\n— "+OWNER_NAME+"</pre>";
      ampremState.email = email;
      document.getElementById("amStep2").classList.remove("step-hidden");
      ampremConsumeTrial();
      const extra = document.getElementById("mExtra");
      extra.innerHTML = '<button class="btn btn-primary" id="amBtnVerify">✅ Verifikasi & Aktivasi</button>';
      document.getElementById("amBtnVerify").onclick = ampremVerify;
    } else {
      res.className = "result show err";
      res.innerHTML = "<pre>❌ "+(data.message || "Gagal mengirim magic link.")+"\n— "+OWNER_NAME+"</pre>";
    }
  }catch(e){
    res.className = "result show err";
    res.innerHTML = "<pre>Error: "+escapeHTML(e.message)+"\n— "+OWNER_NAME+"</pre>";
  }finally{ btn.disabled = false; loader.classList.remove("show"); }
}
async function ampremVerify(){
  const rawLink = (document.querySelector('[data-key="rawLink"]')?.value || "").trim();
  const email = ampremState?.email || (document.querySelector('[data-key="email"]')?.value || "").trim();
  const res = document.getElementById("mResult");
  const loader = document.getElementById("mLoader");
  const btn = document.getElementById("amBtnVerify");
  if(!rawLink){ res.className="result show err"; res.innerHTML="<pre>Tempelkan magic link dulu.</pre>"; return; }
  btn.disabled = true; loader.classList.add("show");
  res.className = "result show"; res.innerHTML = "<pre>Memverifikasi akun...</pre>";
  try{
    const verify = await ampremRequest("verify-account", { email, rawLink });
    if(!verify.success){
      res.className = "result show err";
      res.innerHTML = "<pre>❌ "+(verify.message || "Verifikasi gagal.")+"\n— "+OWNER_NAME+"</pre>";
      return;
    }
        const idToken = verify.idToken || (verify.profile && verify.profile.idToken);
    if(!idToken){
      res.className = "result show err";
      res.innerHTML = "<pre>❌ idToken tidak ditemukan.\n— "+OWNER_NAME+"</pre>";
      return;
    }
    res.innerHTML = "<pre>✅ Verifikasi berhasil. Menerapkan premium...</pre>";
    const premium = await ampremRequest("apply-premium", { email, idToken });
    if(premium.success){
      res.className = "result show ok";
      res.innerHTML = "<pre>🎉 ALIGHT MOTION PREMIUM ACTIVE\n\nEmail: "+escapeHTML(email)+"\nStatus: PREMIUM SUCCESSFULLY ACTIVATED\n\n— "+OWNER_NAME+"</pre>";
    } else {
      res.className = "result show err";
      res.innerHTML = "<pre>❌ "+(premium.message || "Gagal apply premium.")+"\n— "+OWNER_NAME+"</pre>";
    }
  }catch(e){
    res.className = "result show err";
    res.innerHTML = "<pre>Error: "+escapeHTML(e.message)+"\n— "+OWNER_NAME+"</pre>";
  }finally{ btn.disabled = false; loader.classList.remove("show"); }
}

/* ============================================================
   TOPBAR EVENTS & INIT
   ============================================================ */
function bindTopbar(){
  const ci = document.getElementById("checkinBtn");
  if(ci) ci.onclick = openCheckin;
  const rd = document.getElementById("redeemBtn");
  if(rd) rd.onclick = openRedeem;
  const wa = document.getElementById("waBtn");
  if(wa) wa.onclick = () => {
    const mobile = /Android|iPhone|iPad|iPod|Windows Phone/i.test(navigator.userAgent);
    const msg = WA_MSG_BUG + "\n\n" + WA_MSG_BUY;
    const url = mobile ? "https://wa.me/"+OWNER_WA+"?text="+encodeURIComponent(msg)
                       : "https://web.whatsapp.com/send?phone="+OWNER_WA+"&text="+encodeURIComponent(msg);
    window.open(url, "_blank");
  };
  const rs = document.getElementById("redeemSubmit");
  if(rs) rs.onclick = submitRedeem;
  const ri = document.getElementById("redeemInput");
  if(ri) ri.addEventListener("keydown", e => { if(e.key === "Enter") submitRedeem(); });
}

bindTopbar();
refreshCoins();
setInterval(refreshCoins, 30000);