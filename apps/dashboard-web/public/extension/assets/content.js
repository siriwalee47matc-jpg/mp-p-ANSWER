const x=["ลด 10 กิโลใน 3 วัน","ลด 10 กิโล ภายใน 3 วัน","คุมหิว ลดน้ำหนักสูตรเร่งด่วน","รักษาโรคมะเร็งหายขาด","มะเร็งหายขาดใน 1 เดือน","รักษามะเร็งหายขาด","สูตรรักษาโรคมะเร็ง","ขาวใสภายใน 2 วัน","ขาวใสเร่งด่วนใน 2 วัน","ยาเทวดารักษาได้ทุกโรค","cure cancer","weight loss fast","100% safe","doctor recommended"],f=[{productType:"DRUG",keywords:["drug","medicine","capsule","tablet","antibiotic","ยา"]},{productType:"COSMETIC",keywords:["cosmetic","serum","cream","whitening","beauty","skincare","ครีม"]},{productType:"MEDICAL_DEVICE",keywords:["medical device","test kit","monitor","mask","เครื่องมือแพทย์"]},{productType:"CLINIC",keywords:["clinic","hospital","doctor","treatment center","คลินิก","แพทย์"]},{productType:"HERBAL",keywords:["herbal","botanical","traditional herb","สมุนไพร"]},{productType:"FOOD",keywords:["food","supplement","dietary","beverage","coffee","tea","อาหาร"]}];let b=!1,a=!1,c=!1;function g(){chrome.storage.local.get(["extensionMode","autoScan","riskLevel"],o=>{if(!(o.autoScan!==!1&&o.riskLevel!=="MANUAL"))return;const t=document.body.innerText||"",i=x.filter(n=>t.toLowerCase().includes(n.toLowerCase()));i.length>0&&!c&&(b||k(i),a||h(i))})}function y(){const o=window.location.hostname.replace("www.","").toLowerCase();chrome.runtime.sendMessage({action:"CHECK_DOMAIN",domain:o},e=>{e&&e.isBlocked?u("โดเมนนี้ถูกขึ้นบัญชีเฝ้าระวังและบล็อกการเข้าถึงจากศูนย์ควบคุมโฆษณาผิดกฎหมาย"):setTimeout(g,1e3)})}function h(o){if(a)return;a=!0;const e=document.createElement("div");if(e.id="kp-ad-shield-warning-overlay",e.style.cssText=`
    position: fixed;
    inset: 0;
    background: rgba(5, 46, 43, 0.25);
    backdrop-filter: blur(8px);
    -webkit-backdrop-filter: blur(8px);
    z-index: 2147483646;
    display: flex;
    justify-content: center;
    align-items: center;
    font-family: "IBM Plex Sans Thai", "Segoe UI", Tahoma, sans-serif;
  `,!document.getElementById("kp-ad-shield-animations")){const r=document.createElement("style");r.id="kp-ad-shield-animations",r.innerHTML=`
      @keyframes kpFadeIn {
        from { opacity: 0; }
        to { opacity: 1; }
      }
      @keyframes kpScaleUp {
        from { transform: scale(0.9) translateY(20px); opacity: 0; }
        to { transform: scale(1) translateY(0); opacity: 1; }
      }
    `,document.head.appendChild(r)}e.style.animation="kpFadeIn 0.3s ease-out";const t=document.createElement("div");t.style.cssText=`
    position: relative;
    width: 90%;
    max-width: 480px;
    background: linear-gradient(135deg, rgba(255, 255, 255, 0.95) 0%, rgba(244, 251, 248, 0.98) 100%);
    border: 1px solid rgba(15, 118, 110, 0.22);
    border-radius: 24px;
    padding: 32px;
    box-shadow: 0 24px 80px rgba(5, 46, 43, 0.1), inset 0 1px 1px rgba(255, 255, 255, 0.8);
    color: #052e2b;
    text-align: center;
    animation: kpScaleUp 0.4s cubic-bezier(0.16, 1, 0.3, 1);
    box-sizing: border-box;
  `,t.innerHTML=`
    <button id="warning-close-btn" style="position: absolute; top: 20px; right: 24px; background: transparent; border: none; color: #6f8a87; font-size: 24px; cursor: pointer; transition: color 0.2s; font-weight: 300; line-height: 1;">&times;</button>
    <div style="font-size: 48px; margin-bottom: 16px; display: inline-block;">⚠️</div>
    <h2 style="color: #d97706; margin-top: 0; margin-bottom: 12px; font-size: 20px; font-weight: 700; font-family: inherit;">
      ตรวจพบข้อความโฆษณาต้องสงสัย
    </h2>
    <p style="color: #4b6a67; font-size: 14px; line-height: 1.5; margin-bottom: 20px; font-family: inherit;">
      Sentinel ADS ตรวจพบคำอวดอ้างสรรพคุณสุขภาพที่เข้าข่ายเกินจริงหรืออาจผิดกฎหมายบนหน้าเว็บนี้
    </p>
    
    <div style="background: rgba(230, 255, 248, 0.65); border: 1px solid rgba(13, 148, 136, 0.18); padding: 16px 20px; border-radius: 16px; font-size: 13.5px; color: #0f766e; text-align: left; margin-bottom: 24px; max-height: 100px; overflow-y: auto; font-family: inherit; line-height: 1.6;">
      <strong style="color: #052e2b;">สัญญาณที่ตรวจพบ:</strong><br/>
      ${o.map(r=>`• ${r}`).join("<br/>")}
    </div>
    
    <div style="display: flex; gap: 12px; justify-content: center;">
      <button id="warning-bypass-btn" style="background: #047857; border: none; color: #ffffff; padding: 12px 32px; border-radius: 999px; cursor: pointer; font-weight: 700; font-size: 14px; transition: all 0.2s; font-family: inherit; box-shadow: 0 4px 14px rgba(4, 120, 87, 0.25);">
        ยอมรับความเสี่ยงและดูต่อ
      </button>
    </div>
  `,e.appendChild(t),document.body.appendChild(e);const i=t.querySelector("#warning-bypass-btn"),n=t.querySelector("#warning-close-btn");i.onclick=()=>{document.body.removeChild(e),a=!1,chrome.runtime.sendMessage({action:"OPEN_EXTENSION_POPUP"})},n.onclick=()=>{document.body.removeChild(e),a=!1}}function k(o){b=!0;const e=document.createElement("div");e.id="kp-ad-shield-banner",e.style.cssText=`
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
  `,n.onclick=async()=>{n.disabled=!0,n.innerText="กำลังส่ง...";try{const d=document.title||"Suspicious ad page",s=window.location.href,l=`${o.join("; ")} | ${document.body.innerText.substring(0,400)}`,p=T(),m=v(`${d}
${s}
${l}
${p}`);if(!(await fetch("http://localhost:3001/cases",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({title:d,url:s,productType:m,evidenceText:l,imageSignalsText:p,productLicenseNumber:w(document.body.innerText),reporterRole:"SYSTEM"})})).ok)throw new Error("Failed to create case");n.innerText="ส่งสำเร็จ",n.style.background="#d1fae5",n.style.color="#065f46"}catch{n.innerText="ส่งไม่สำเร็จ",n.disabled=!1,setTimeout(()=>{n.innerText="ส่งเบาะแส"},2e3)}},i.appendChild(n);const r=document.createElement("button");r.innerText="×",r.style.cssText=`
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
  `,document.body.appendChild(t),document.body.style.overflow="hidden",document.getElementById("kp-back-btn").onclick=()=>{window.history.back(),setTimeout(()=>window.close(),500)},document.getElementById("kp-bypass-btn").onclick=()=>{document.body.removeChild(t),document.body.style.overflow="auto",c=!1}}function w(o){const e=o.match(/\d{2}-\d-\d{5}-\d-\d{4}/);return e?e[0]:""}function T(){const o=Array.from(document.images).slice(0,12).map(t=>[t.alt||"",t.title||"",t.getAttribute("aria-label")||"",t.src.split("/").pop()||""].join(" ")).join(" | "),e=Array.from(document.querySelectorAll('figcaption, [data-testid*="caption"], .caption')).slice(0,12).map(t=>(t.textContent||"").trim()).filter(Boolean).join(" | ");return[o,e].filter(Boolean).join(" | ")}function v(o){const e=o.toLowerCase();let t="FOOD",i=-1;for(const n of f){const r=n.keywords.reduce((d,s)=>d+(e.includes(s.toLowerCase())?1:0),0);r>i&&(t=n.productType,i=r)}return t}chrome.runtime.onMessage.addListener(o=>{o.action==="BLOCK_SCREEN"&&!c&&u(o.reason)});y();
