const b=["ลด 10 กิโลใน 3 วัน","ลด 10 กิโล ภายใน 3 วัน","คุมหิว ลดน้ำหนักสูตรเร่งด่วน","รักษาโรคมะเร็งหายขาด","มะเร็งหายขาดใน 1 เดือน","รักษามะเร็งหายขาด","สูตรรักษาโรคมะเร็ง","ขาวใสภายใน 2 วัน","ขาวใสเร่งด่วนใน 2 วัน","ยาเทวดารักษาได้ทุกโรค"];let a=!1,r=!1;function x(){chrome.storage.local.get(["extensionMode","autoScan"],t=>{if(t.extensionMode!=="CONSUMER"||t.autoScan===!1)return;const e=document.body.innerText||"",o=b.filter(i=>e.includes(i));o.length>0&&!a&&!r&&m(o)})}function u(){const t=window.location.hostname.replace("www.","").toLowerCase();chrome.runtime.sendMessage({action:"CHECK_DOMAIN",domain:t},e=>{e&&e.isBlocked?s("โดเมนนี้ได้รับการยืนยันว่าเป็นแหล่งเผยแพร่โฆษณาหลอกลวงอันตรายและถูกขึ้นบัญชีดำปิดกั้น"):setTimeout(x,1e3)})}function m(t){a=!0;const e=document.createElement("div");e.id="kp-ad-shield-banner",e.style.cssText=`
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    background: linear-gradient(90deg, #ef4444 0%, #b91c1c 100%);
    color: white;
    z-index: 999999;
    padding: 12px 24px;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    font-size: 14px;
    font-weight: 600;
    box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    display: flex;
    justify-content: space-between;
    align-items: center;
    box-sizing: border-box;
    gap: 16px;
  `;const o=document.createElement("div");o.innerHTML=`⚠️ <strong>Ad Shield คำเตือน:</strong> ตรวจพบข้อความโฆษณาอวดอ้างสรรพคุณเกินจริงและไม่ปลอดภัยต่อผู้บริโภค <span style="background:rgba(255,255,255,0.2); padding:2px 8px; border-radius:4px; font-size:12px; margin-left:8px;">${t.join(", ")}</span>`,e.appendChild(o);const i=document.createElement("div");i.style.cssText=`
    display: flex;
    gap: 10px;
    align-items: center;
  `;const n=document.createElement("button");n.innerText="🚨 ส่งเบาะแส อย.",n.style.cssText=`
    background: white;
    color: #b91c1c;
    border: none;
    padding: 6px 14px;
    border-radius: 4px;
    font-weight: bold;
    cursor: pointer;
    font-size: 13px;
    transition: all 0.2s;
  `,n.onclick=async()=>{n.disabled=!0,n.innerText="กำลังส่งเบาะแส...";try{const c=document.title||"โฆษณาเกินจริงในหน้าเว็บ",l=window.location.href,p=t.join("; ")+" | เนื้อหาบางส่วน: "+document.body.innerText.substring(0,200);if(!(await fetch("http://localhost:3001/cases",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({title:c,url:l,productType:"FOOD",evidenceText:p,productLicenseNumber:g(document.body.innerText)})})).ok)throw new Error;n.innerText="ส่งเบาะแสสำเร็จแล้ว ✓",n.style.background="#d1fae5",n.style.color="#065f46"}catch{n.innerText="การส่งล้มเหลว ❌",n.disabled=!1,setTimeout(()=>{n.innerText="🚨 ส่งเบาะแส อย."},2e3)}},i.appendChild(n);const d=document.createElement("button");d.innerText="✕",d.style.cssText=`
    background: transparent;
    border: none;
    color: white;
    font-size: 18px;
    cursor: pointer;
    padding: 0 4px;
  `,d.onclick=()=>{document.body.removeChild(e),document.body.style.marginTop="0px"},i.appendChild(d),e.appendChild(i),document.body.appendChild(e),document.body.style.marginTop="45px"}function s(t){r=!0;const e=document.getElementById("kp-ad-shield-banner");e&&(document.body.removeChild(e),document.body.style.marginTop="0px");const o=document.createElement("div");o.id="kp-ad-shield-block-screen",o.style.cssText=`
    position: fixed;
    top: 0;
    left: 0;
    width: 100vw;
    height: 100vh;
    background: #080a10;
    z-index: 2147483647;
    font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
    color: #f3f4f6;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    padding: 40px;
    text-align: center;
    box-sizing: border-box;
  `,o.innerHTML=`
    <div style="max-width: 600px; padding: 40px; border: 1px solid rgba(239, 68, 68, 0.2); border-radius: 16px; background: rgba(17, 24, 39, 0.85); box-shadow: 0 10px 40px rgba(0,0,0,0.5);">
      <div style="font-size: 4.5rem; margin-bottom: 20px; text-shadow: 0 0 20px rgba(239, 68, 68, 0.4);">🚫</div>
      <h1 style="color: #ef4444; font-size: 1.85rem; margin-bottom: 12px; font-weight: bold;">การเข้าถึงถูกปิดกั้น (Blocked by Ad Shield)</h1>
      <p style="color: #f3f4f6; font-size: 15px; line-height: 1.6; margin-bottom: 20px;">
        เว็บไซต์โดเมนนี้ถูกระงับการเข้าถึงชั่วคราวและเพิ่มลงในบัญชีดำ (Blacklist) เครือข่ายคุ้มครองผู้บริโภค 
        เนื่องจากเจ้าหน้าที่นิติกรและหัวหน้าผู้รีวิว อย. ได้ตัดสินอนุมัติคดีโฆษณาอวดอ้างสรรพคุณเกินจริงระดับอันตรายร้ายแรง
      </p>
      
      <div style="background: rgba(239, 68, 68, 0.08); border: 1px solid rgba(239, 68, 68, 0.2); padding: 15px; border-radius: 8px; font-size: 13.5px; font-family: monospace; color: #f87171; text-align: left; margin-bottom: 24px; line-height: 1.5;">
        <strong>เหตุผลความผิดคดี:</strong> ${t}
      </div>
      
      <div style="display: flex; justify-content: center; gap: 15px;">
        <button id="kp-bypass-btn" style="background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.1); color: #9ca3af; padding: 10px 20px; border-radius: 6px; cursor: pointer; transition: all 0.2s; font-size: 13px;">
          ข้ามการปิดกั้น (เสี่ยงภัยด้วยตนเอง)
        </button>
        <button id="kp-back-btn" style="background: #ef4444; border: none; color: white; padding: 10px 24px; border-radius: 6px; cursor: pointer; font-weight: bold; font-size: 13.5px;">
          ย้อนกลับไปที่ปลอดภัย 🛡️
        </button>
      </div>
    </div>
  `,document.body.appendChild(o),document.body.style.overflow="hidden",document.getElementById("kp-back-btn").onclick=()=>{window.history.back(),setTimeout(()=>{window.close()},500)},document.getElementById("kp-bypass-btn").onclick=()=>{document.body.removeChild(o),document.body.style.overflow="auto",r=!1}}function g(t){const e=t.match(/\d{2}-\d-\d{5}-\d-\d{4}/);return e?e[0]:""}chrome.runtime.onMessage.addListener(t=>{t.action==="BLOCK_SCREEN"&&!r&&s(t.reason)});u();
