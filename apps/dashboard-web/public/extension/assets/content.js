const m=["ลด 10 กิโลใน 3 วัน","ลด 10 กิโล ภายใน 3 วัน","คุมหิว ลดน้ำหนักสูตรเร่งด่วน","รักษาโรคมะเร็งหายขาด","มะเร็งหายขาดใน 1 เดือน","รักษามะเร็งหายขาด","สูตรรักษาโรคมะเร็ง","ขาวใสภายใน 2 วัน","ขาวใสเร่งด่วนใน 2 วัน","ยาเทวดารักษาได้ทุกโรค","cure cancer","weight loss fast","100% safe","doctor recommended"],x=[{productType:"DRUG",keywords:["drug","medicine","capsule","tablet","antibiotic","ยา"]},{productType:"COSMETIC",keywords:["cosmetic","serum","cream","whitening","beauty","skincare","ครีม"]},{productType:"MEDICAL_DEVICE",keywords:["medical device","test kit","monitor","mask","เครื่องมือแพทย์"]},{productType:"CLINIC",keywords:["clinic","hospital","doctor","treatment center","คลินิก","แพทย์"]},{productType:"HERBAL",keywords:["herbal","botanical","traditional herb","สมุนไพร"]},{productType:"FOOD",keywords:["food","supplement","dietary","beverage","coffee","tea","อาหาร"]}];let p=!1,c=!1;function f(){chrome.storage.local.get(["extensionMode","autoScan"],o=>{if(o.extensionMode!=="CONSUMER"||o.autoScan===!1)return;const e=document.body.innerText||"",t=m.filter(i=>e.toLowerCase().includes(i.toLowerCase()));t.length>0&&!p&&!c&&y(t)})}function g(){const o=window.location.hostname.replace("www.","").toLowerCase();chrome.runtime.sendMessage({action:"CHECK_DOMAIN",domain:o},e=>{e&&e.isBlocked?u("โดเมนนี้ถูกขึ้นบัญชีเฝ้าระวังและบล็อกการเข้าถึงจากศูนย์ควบคุมโฆษณาผิดกฎหมาย"):setTimeout(f,1e3)})}function y(o){p=!0;const e=document.createElement("div");e.id="kp-ad-shield-banner",e.style.cssText=`
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    background: linear-gradient(90deg, #ef4444 0%, #b91c1c 100%);
    color: white;
    z-index: 999999;
    padding: 12px 24px;
    font-family: "Segoe UI", Tahoma, sans-serif;
    font-size: 14px;
    font-weight: 600;
    box-shadow: 0 4px 20px rgba(0,0,0,0.3);
    display: flex;
    justify-content: space-between;
    align-items: center;
    box-sizing: border-box;
    gap: 16px;
  `;const t=document.createElement("div");t.innerHTML=`Warning: suspicious ad claims detected <span style="background:rgba(255,255,255,0.2); padding:2px 8px; border-radius:999px; font-size:12px; margin-left:8px;">${o.join(", ")}</span>`,e.appendChild(t);const i=document.createElement("div");i.style.cssText=`
    display: flex;
    gap: 10px;
    align-items: center;
  `;const n=document.createElement("button");n.innerText="ส่งเบาะแส",n.style.cssText=`
    background: white;
    color: #b91c1c;
    border: none;
    padding: 6px 14px;
    border-radius: 999px;
    font-weight: 700;
    cursor: pointer;
    font-size: 13px;
    transition: all 0.2s;
  `,n.onclick=async()=>{n.disabled=!0,n.innerText="กำลังส่ง...";try{const d=document.title||"Suspicious ad page",a=window.location.href,s=`${o.join("; ")} | ${document.body.innerText.substring(0,400)}`,l=w(),b=T(`${d}
${a}
${s}
${l}`);if(!(await fetch("http://localhost:3001/cases",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({title:d,url:a,productType:b,evidenceText:s,imageSignalsText:l,productLicenseNumber:h(document.body.innerText),reporterRole:"SYSTEM"})})).ok)throw new Error("Failed to create case");n.innerText="ส่งสำเร็จ",n.style.background="#d1fae5",n.style.color="#065f46"}catch{n.innerText="ส่งไม่สำเร็จ",n.disabled=!1,setTimeout(()=>{n.innerText="ส่งเบาะแส"},2e3)}},i.appendChild(n);const r=document.createElement("button");r.innerText="×",r.style.cssText=`
    background: transparent;
    border: none;
    color: white;
    font-size: 18px;
    cursor: pointer;
    padding: 0 4px;
  `,r.onclick=()=>{document.body.removeChild(e),document.body.style.marginTop="0px"},i.appendChild(r),e.appendChild(i),document.body.appendChild(e),document.body.style.marginTop="45px"}function u(o){c=!0;const e=document.getElementById("kp-ad-shield-banner");e&&(document.body.removeChild(e),document.body.style.marginTop="0px");const t=document.createElement("div");t.id="kp-ad-shield-block-screen",t.style.cssText=`
    position: fixed;
    inset: 0;
    background: #080a10;
    z-index: 2147483647;
    font-family: "Segoe UI", Tahoma, sans-serif;
    color: #f3f4f6;
    display: flex;
    flex-direction: column;
    justify-content: center;
    align-items: center;
    padding: 40px;
    text-align: center;
    box-sizing: border-box;
  `,t.innerHTML=`
    <div style="max-width: 600px; padding: 40px; border: 1px solid rgba(239, 68, 68, 0.2); border-radius: 24px; background: rgba(17, 24, 39, 0.88); box-shadow: 0 10px 40px rgba(0,0,0,0.5);">
      <div style="font-size: 4rem; margin-bottom: 20px;">Blocked</div>
      <h1 style="color: #ef4444; font-size: 1.85rem; margin-bottom: 12px; font-weight: 700;">เว็บไซต์นี้ถูกบล็อกโดย Sentinel ADS</h1>
      <p style="color: #f3f4f6; font-size: 15px; line-height: 1.6; margin-bottom: 20px;">
        ระบบตรวจพบสัญญาณความเสี่ยงโฆษณาสุขภาพผิดกฎหมายและระงับการเข้าถึงชั่วคราวเพื่อความปลอดภัย
      </p>
      <div style="background: rgba(239, 68, 68, 0.08); border: 1px solid rgba(239, 68, 68, 0.2); padding: 15px; border-radius: 12px; font-size: 13.5px; color: #fca5a5; text-align: left; margin-bottom: 24px; line-height: 1.5;">
        <strong>เหตุผล:</strong> ${o}
      </div>
      <div style="display: flex; justify-content: center; gap: 15px; flex-wrap: wrap;">
        <button id="kp-bypass-btn" style="background: rgba(255,255,255,0.08); border: 1px solid rgba(255,255,255,0.1); color: #d1d5db; padding: 10px 20px; border-radius: 999px; cursor: pointer; font-size: 13px;">
          เข้าต่อด้วยความเสี่ยงของผู้ใช้
        </button>
        <button id="kp-back-btn" style="background: #ef4444; border: none; color: white; padding: 10px 24px; border-radius: 999px; cursor: pointer; font-weight: 700; font-size: 13.5px;">
          กลับไปหน้าที่ปลอดภัย
        </button>
      </div>
    </div>
  `,document.body.appendChild(t),document.body.style.overflow="hidden",document.getElementById("kp-back-btn").onclick=()=>{window.history.back(),setTimeout(()=>window.close(),500)},document.getElementById("kp-bypass-btn").onclick=()=>{document.body.removeChild(t),document.body.style.overflow="auto",c=!1}}function h(o){const e=o.match(/\d{2}-\d-\d{5}-\d-\d{4}/);return e?e[0]:""}function w(){const o=Array.from(document.images).slice(0,12).map(t=>[t.alt||"",t.title||"",t.getAttribute("aria-label")||"",t.src.split("/").pop()||""].join(" ")).join(" | "),e=Array.from(document.querySelectorAll('figcaption, [data-testid*="caption"], .caption')).slice(0,12).map(t=>(t.textContent||"").trim()).filter(Boolean).join(" | ");return[o,e].filter(Boolean).join(" | ")}function T(o){const e=o.toLowerCase();let t="FOOD",i=-1;for(const n of x){const r=n.keywords.reduce((d,a)=>d+(e.includes(a.toLowerCase())?1:0),0);r>i&&(t=n.productType,i=r)}return t}chrome.runtime.onMessage.addListener(o=>{o.action==="BLOCK_SCREEN"&&!c&&u(o.reason)});g();
