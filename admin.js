/* Admin panel — pakai action admin-* di /api/coins */

const ADMIN_TOKEN = "FEBZ-OWNER-8505";
const API = "/api/coins";

async function adminReq(action, extra){
  const res = await fetch(API, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "X-Admin-Token": ADMIN_TOKEN
    },
    body: JSON.stringify(Object.assign({ action }, extra||{}))
  });
  const data = await res.json().catch(()=>({}));
  if(!res.ok) throw new Error(data.error || ("HTTP "+res.status));
  return data;
}

async function renderList(){
  const list = document.getElementById("codeList");
  if(!list) return;
  list.innerHTML = '<div style="color:var(--dim);text-align:center;padding:16px">Memuat...</div>';
  try{
    const d = await adminReq("admin-list");
    const codes = (d.codes || []).sort((a,b)=>(b.createdAt||0)-(a.createdAt||0));
    if(codes.length === 0){
      list.innerHTML = '<div style="color:var(--dim);font-size:.82rem;text-align:center;padding:20px">Belum ada kode.</div>';
      return;
    }
    list.innerHTML = "";
    codes.forEach(c => {
      const div = document.createElement("div");
      div.className = "code-item";
      div.innerHTML =
        '<span class="cd">'+c.code+'</span>' +
        '<span class="amt">🪙 '+c.coins+'</span>' +
        (c.used ? '<span class="used-badge">TERPAKAI</span>' : '') +
        '<span class="act">' +
          '<button data-copy="'+c.code+'">📋 Copy</button>' +
          '<button data-del="'+c.code+'">✕</button>' +
        '</span>';
      list.appendChild(div);
    });
    list.querySelectorAll("[data-copy]").forEach(b => {
      b.onclick = () => {
        navigator.clipboard.writeText(b.dataset.copy).then(()=>{
          b.textContent = "✅ Tersalin";
          setTimeout(()=>b.textContent="📋 Copy", 1200);
        }).catch(()=>prompt("Copy manual:", b.dataset.copy));
      };
    });
    list.querySelectorAll("[data-del]").forEach(b => {
      b.onclick = async () => {
        if(!confirm("Hapus kode "+b.dataset.del+"?")) return;
        try{
          await adminReq("admin-delete", { code: b.dataset.del });
          renderList();
        }catch(e){ alert("Gagal hapus: "+e.message); }
      };
    });
  }catch(e){
    list.innerHTML = '<div style="color:var(--warn);text-align:center;padding:20px">Gagal load: '+e.message+'</div>';
  }
}

document.getElementById("genBtn").onclick = async () => {
  const coins  = Math.max(1, parseInt(document.getElementById("genCoins").value)||0);
  const qty    = Math.max(1, Math.min(50, parseInt(document.getElementById("genQty").value)||1));
  const prefix = (document.getElementById("genPrefix").value||"FEBZ").toUpperCase();
  const res = document.getElementById("genResult");
  res.className = "result show";
  res.innerHTML = "<pre>Membuat "+qty+" kode...</pre>";
  try{
    const d = await adminReq("admin-create", { coins, qty, prefix });
    res.className = "result show ok";
    res.innerHTML = "<pre>✅ "+d.created.length+" kode dibuat · "+coins+" coin per kode\n\n" + d.created.join("\n") + "</pre>";
    renderList();
  }catch(e){
    res.className = "result show err";
    res.innerHTML = "<pre>❌ "+e.message+"</pre>";
  }
};

document.getElementById("clearBtn").onclick = async () => {
  if(!confirm("Hapus SEMUA kode redeem?")) return;
  try{
    await adminReq("admin-clear");
    renderList();
  }catch(e){ alert("Gagal: "+e.message); }
};

renderList();
