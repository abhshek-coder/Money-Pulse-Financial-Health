const billDefs=[
 ["electricity","EB / Electricity",[1000,2000,3000,5000],"Electricity bill"],
 ["rent","Rent",[5000,10000,15000,20000],"Home rent"],
 ["wifi_dth","WiFi, DTH & phone",[500,1000,1500,2500],"Internet, DTH / OTT subscriptions and mobile phone bills"]
];
const expenseDefs=[
 ["food_groceries","Food & Groceries",[5000,8000,10000,15000]],
 ["education_expenses","Education expenses",[1000,3000,5000,10000]],
 ["medical","Medical",[1000,3000,5000,10000]],
 ["maid_helper","Maid / Helper",[2000,5000,8000,10000]],
 ["loan_emi","Loan & EMI",[5000,10000,20000,30000]],
 ["travel_expenses","Travel expenses",[2000,4000,6000,10000]],
 ["entertainment","Entertainment",[1000,2500,5000,10000]],
 ["shopping","Shopping",[2000,5000,10000,15000]],
 ["miscellaneous","Miscellaneous",[1000,2500,5000,10000]]
];
const allExpenseDefs=[...billDefs.map(x=>[x[0],x[1],x[2]]),...expenseDefs];
const money=new Intl.NumberFormat("en-IN",{style:"currency",currency:"INR",maximumFractionDigits:0});
const $=id=>document.getElementById(id), n=x=>Math.max(0,Number(x)||0), fmt=x=>money.format(Math.round(n(x)));
const toast=m=>{const t=$("toast");t.textContent=m;t.classList.add("show");clearTimeout(window.__toast);window.__toast=setTimeout(()=>t.classList.remove("show"),2800)};
async function api(url,opt={}){const r=await fetch(url,{headers:{"Content-Type":"application/json",...(opt.headers||{})},...opt});const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||"Request failed");return d}
function monthLabel(m){if(!m)return"";const [y,mo]=m.split("-");return new Date(Number(y),Number(mo)-1,1).toLocaleDateString("en-IN",{month:"long",year:"numeric"})}
function currentLocalMonth(){const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`}
function selectedMonth(){return $("monthSelect").value||window.__selectedMonth||sessionStorage.getItem("mp-selected-month")||currentLocalMonth()}
function setSelectedMonth(m){window.__selectedMonth=m;sessionStorage.setItem("mp-selected-month",m);if($("monthSelect"))$("monthSelect").value=m;if($("gateMonth"))$("gateMonth").value=m.slice(5);if($("gateYear"))$("gateYear").value=m.slice(0,4)}
function currentPage(){const p=location.pathname.replace(/\/+$/,'');return ({'/income':'income','/expenses':'expenses','/protection':'protection','/score':'score','/actions':'actions','/compare':'compare','/input':'overview','':'overview'})[p]||'overview'}
const pageMeta={overview:['Overview','Your monthly financial workspace.'],income:['Income','Money coming into your household each month.'],expenses:['Monthly bills & expenses','Capture regular bills and everyday spending.'],protection:['Safety & goals','Protection, emergency savings and investing.'],score:['Your score','See your score, ratios and spending picture.'],actions:['Strengths & actions','Turn the biggest gaps into practical next steps.'],compare:['Monthly comparison','Track how your money habits change month by month.']};
function showPage(page,replace=false){
  page=pageMeta[page]?page:'overview';
  document.querySelectorAll('.tab-page').forEach(x=>x.classList.toggle('hidden',x.id!==`tab-${page}`));
  document.querySelectorAll('.nav-link').forEach(a=>a.classList.toggle('active',a.dataset.page===page));
  const meta=pageMeta[page];const h=$("pageTitle"),p=$("pageDescription"),ey=$("pageEyebrow");if(h)h.textContent=meta[0];if(p)p.textContent=meta[1];if(ey)ey.textContent=page==='overview'?'MONEY PULSE':'MONEY PULSE • '+meta[0].toUpperCase();if($('pageMonthLabel'))$('pageMonthLabel').textContent=monthLabel(selectedMonth());
  if(page==='compare')loadCompare();
  window.scrollTo({top:0,behavior:'smooth'});
}
function navigatePage(page){
 if(!pageMeta[page])return;
 const path=page==='overview'?'/input':`/${page}`;
 // Keep the form mounted while changing sections. Full-page navigation discarded
 // unsaved income/expense inputs before the final Save my month action.
 if(location.pathname!==path)history.pushState({page},'',path);
 showPage(page);
}
function valObj(){return Object.fromEntries(["income","spouse_income",...allExpenseDefs.map(x=>x[0]),"health_insurance","life_insurance","emergency_fund","investments"].map(k=>[k,n($(k)?.value)]))}
function totalIncome(v){return v.income+v.spouse_income}
function totalExpenses(v){return allExpenseDefs.reduce((s,[k])=>s+v[k],0)}
function quickChips(quick){return quick.map(x=>`<button type="button" data-value="${x}">${x>=100000?`₹${x/100000}L`:x>=1000?`₹${x/1000}K`:`₹${x}`}</button>`).join("")}
function fieldMarkup(k,label,quick,desc=""){const icons={electricity:"ϟ",rent:"⌂",wifi_dth:"◉",food_groceries:"▤",education_expenses:"✎",medical:"+",maid_helper:"✦",loan_emi:"▣",travel_expenses:"↗",entertainment:"▷",shopping:"◇",miscellaneous:"•••"};const icon=icons[k]||"◆";return `<label><span class="field-icon">${icon}</span>${label}<div class="money-input"><b>₹</b><input id="${k}" type="number" min="0" step="100" placeholder="0"></div><div class="chips mini" data-target="${k}">${quickChips(quick)}</div>${desc?`<small>${desc}</small>`:''}</label>`}
if($("billGrid"))billDefs.forEach(([k,label,quick,desc])=>$("billGrid").insertAdjacentHTML("beforeend",fieldMarkup(k,label,quick,desc)));
if($("expenseGrid"))expenseDefs.forEach(([k,label,quick])=>$("expenseGrid").insertAdjacentHTML("beforeend",fieldMarkup(k,label,quick)));
document.addEventListener("click",e=>{
 const b=e.target.closest(".chips button");
 if(!b)return;
 const box=b.closest(".chips"), input=$(box?.dataset.target);
 if(!input)return;
 e.preventDefault();
 input.value=b.dataset.value;
 input.dispatchEvent(new Event("input",{bubbles:true}));
 box.querySelectorAll("button").forEach(x=>x.classList.toggle("selected",x===b));
 input.focus();
 live();
});
function applyTheme(theme){
 const next=theme==="dark"?"dark":"light";
 document.documentElement.dataset.theme=next;
 localStorage.setItem("mp-theme-v14",next);
 const btn=$("themeBtn");
 if(btn){btn.setAttribute("aria-checked",String(next==="dark"));btn.setAttribute("aria-label",next==="dark"?"Switch to light theme":"Switch to dark theme");btn.title=next==="dark"?"Switch to light theme":"Switch to dark theme";}
}
applyTheme(localStorage.getItem("mp-theme-v14") || (localStorage.getItem("mp-theme-v10")==="dark" ? "dark" : "light"));
$("themeBtn").onclick=()=>applyTheme((document.documentElement.dataset.theme||"light")==="dark"?"light":"dark");
document.querySelectorAll(".auth-tab").forEach(b=>b.onclick=()=>{document.querySelectorAll(".auth-tab").forEach(x=>x.classList.remove("active"));b.classList.add("active");$("loginForm").classList.toggle("hidden",b.dataset.auth!=="login");$("registerForm").classList.toggle("hidden",b.dataset.auth!=="register");$("verifyBox").classList.add("hidden")});
function setupMonthGate(){
 const monthEl=$("gateMonth"), yearEl=$("gateYear");
 if(!monthEl||!yearEl)return;
 const now=new Date();
 const months=["01","02","03","04","05","06","07","08","09","10","11","12"];
 const names=["January","February","March","April","May","June","July","August","September","October","November","December"];
 const currentMonth=String(now.getMonth()+1).padStart(2,"0");
 const currentYear=now.getFullYear();
 monthEl.innerHTML=months.map((m,i)=>`<option value="${m}"${m===currentMonth?" selected":""}>${names[i]}</option>`).join("");
 yearEl.innerHTML=Array.from({length:21},(_,i)=>{const y=currentYear-10+i;return `<option value="${y}"${y===currentYear?" selected":""}>${y}</option>`}).join("");
 monthEl.value=currentMonth;
 yearEl.value=String(currentYear);
}

function openMonthGate(){
 // Always require an explicit month/year choice on each authenticated entry.
 setupMonthGate();
 $("monthGate").classList.remove("hidden");
 $("workspace").classList.add("hidden");
 $("monthSelect").classList.add("hidden");
 window.__selectedMonth="";
 try{sessionStorage.removeItem("mp-selected-month")}catch{}
}
async function startSelectedMonth(){
 const m=`${$("gateYear").value}-${$("gateMonth").value}`;
 if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(m)){toast("Please choose a valid month and year.");return}
 const btn=$("startMonthBtn");btn.disabled=true;btn.textContent="Loading month…";
 try{
  setSelectedMonth(m);
  const p=await api(`/api/profile?month=${encodeURIComponent(m)}`);
  setVals(p.profile||{});
  $("monthGate").classList.add("hidden");$("workspace").classList.remove("hidden");$("monthSelect").classList.remove("hidden");
  await loadMonths();
  // loadMonths may select the newest saved month; keep the month chosen on this gate.
  setSelectedMonth(m);$("monthSelect").value=m;
  showPage("overview");live();
 }catch(e){toast(`Could not load this month: ${e.message}`)}
 finally{btn.disabled=false;btn.textContent="Continue →"}
}
$("startMonthBtn").onclick=startSelectedMonth;
function closeVerifyModal(){const m=$("verifyModal");if(m)m.classList.add("hidden");document.body.classList.remove("modal-open")}
function openVerifyModal(d){
 const m=$("verifyModal"); if(!m)return;
 const text=$("verifyModalText"),status=$("verifyModalStatus"),link=$("verifyModalLink");
 text.textContent=`${d.user?.email||$("loginEmail").value} is not verified yet. Verify it to unlock your MoneyPulse account.`;
 status.textContent=d.message||"Check your Gmail inbox for the verification email.";
 link.classList.add("hidden");link.innerHTML="";
 m.classList.remove("hidden");document.body.classList.add("modal-open");
 const resend=$("verifyResendBtn");
 resend.onclick=async()=>{
  resend.disabled=true;resend.textContent="Sending…";
  try{
   const r=await api("/api/auth/resend",{method:"POST"});
   status.textContent=r.emailSent?"✓ Verification email sent. Check your Gmail inbox.":"Gmail is not configured. Use the local verification link below.";
   if(r.verificationUrl){link.classList.remove("hidden");link.innerHTML=`<a href="${r.verificationUrl}">Open verification link for local testing →</a>`}
   toast(r.emailSent?"Verification email sent.":"Use the local verification link.");
  }catch(x){status.textContent=x.message}
  finally{resend.disabled=false;resend.textContent="Resend verification email"}
 };
}
$("loginForm").onsubmit=async e=>{e.preventDefault();try{
 const d=await api("/api/auth/login",{method:"POST",body:JSON.stringify({email:$("loginEmail").value,password:$("loginPassword").value})});
 await boot();
 if(!d.user.verified){openVerifyModal(d);return}
 toast("Welcome back.");
}catch(x){toast(x.message)}};
document.querySelectorAll("[data-close-verify]").forEach(x=>x.onclick=closeVerifyModal);
$("closeVerifyBtn")?.addEventListener("click",closeVerifyModal);
$("verifyCloseAction")?.addEventListener("click",closeVerifyModal);
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!$("verifyModal")?.classList.contains("hidden"))closeVerifyModal()});
$("registerForm").onsubmit=async e=>{e.preventDefault();try{const d=await api("/api/auth/register",{method:"POST",body:JSON.stringify({displayName:$("registerName").value,email:$("registerEmail").value,password:$("registerPassword").value})});$("verifyBox").classList.remove("hidden");$("verifyBox").innerHTML=`<b>${d.emailSent?"Check your Gmail inbox":"Verification needed"}</b><p>${d.message}</p>${d.verificationUrl?`<a href="${d.verificationUrl}">Open verification link (local testing)</a>`:""}`;$("resendBtn").classList.remove("hidden");$("mailStatus").textContent=d.emailSent?"✓ Gmail verification email sent successfully.":"Gmail was not configured or the message could not be sent. Configure Gmail SMTP in .env and use Resend.";toast(d.emailSent?"Verification email sent.":"Account created — verification still required.");}catch(x){toast(x.message)}};
$("resendBtn").onclick=async()=>{try{const d=await api("/api/auth/resend",{method:"POST"});$("mailStatus").textContent=d.emailSent?"✓ A fresh verification email was sent.":"Gmail is not configured; use the local verification link.";if(d.verificationUrl){$("verifyBox").classList.remove("hidden");$("verifyBox").innerHTML=`<b>Verification link</b><p>${d.message}</p><a href="${d.verificationUrl}">Open verification link</a>`}toast(d.message)}catch(x){toast(x.message)}};
$("logoutBtn").onclick=async()=>{await api("/api/auth/logout",{method:"POST"});location.reload()};
$("resetBtn").onclick=()=>{if(confirm("Reset this month's form?")){$("financeForm").reset();live()}};
$("editBtn")?.addEventListener("click",()=>navigatePage("income"));
$("printBtn").onclick=()=>print();

document.querySelectorAll(".nav-link").forEach(a=>a.addEventListener("click",e=>{
 e.preventDefault();
 sessionStorage.setItem("mp-selected-month",selectedMonth());
 navigatePage(a.dataset.page||currentPage());
}));
// Overview cards and any internal section links also navigate without reloading
// so the user's in-progress form remains intact until explicitly saved.
document.addEventListener('click',e=>{
 const a=e.target.closest('a[href]'); if(!a||a.target==='_blank')return;
 const url=new URL(a.href,location.href);
 const routeMap={'/':'overview','/input':'overview','/income':'income','/expenses':'expenses','/protection':'protection','/score':'score','/actions':'actions','/compare':'compare'};
 if(url.origin===location.origin&&routeMap[url.pathname]){e.preventDefault();navigatePage(routeMap[url.pathname]);}
});
function showTab(tab){navigatePage(tab)}

function openAiCoach(){
 const modal=$("aiModal");
 if(!modal)return;
 modal.classList.remove("hidden");
 document.body.classList.add("modal-open");
 const status=$("aiStatus");
 if(status){status.textContent="Checking AI connection…";status.className="ai-status";fetch("/api/health").then(r=>r.json()).then(d=>{status.textContent=d.aiConfigured?"● AI connected":"● AI setup required";status.className=`ai-status ${d.aiConfigured?"ok":"warn"}`}).catch(()=>{status.textContent="● Connection unavailable";status.className="ai-status warn"})}
 setTimeout(()=>$('chatInput')?.focus(),80);
}
function closeAiCoach(){
 $("aiModal")?.classList.add("hidden");
 document.body.classList.remove("modal-open");
}
$("aiCoachBtn").onclick=openAiCoach;
$("closeAiBtn").onclick=closeAiCoach;
document.querySelectorAll("[data-close-ai]").forEach(x=>x.onclick=closeAiCoach);
document.addEventListener("keydown",e=>{if(e.key==="Escape"&&!$("aiModal")?.classList.contains("hidden"))closeAiCoach()});

function live(){const v=valObj(),inc=totalIncome(v),total=totalExpenses(v);if($("liveSummary"))$("liveSummary").textContent=`${fmt(total)} expenses · ${fmt(inc-total)} surplus`;if($("overviewMonth"))$("overviewMonth").textContent=monthLabel(selectedMonth());if($("overviewIncome"))$("overviewIncome").textContent=fmt(inc);if($("overviewExpenses"))$("overviewExpenses").textContent=fmt(total);if($("overviewSurplus"))$("overviewSurplus").textContent=fmt(Math.max(0,inc-total));if($("saveHint"))$("saveHint").textContent=`Saving for ${monthLabel(selectedMonth())}.`;const sc=score(v);if($("expenseScoreValue"))$("expenseScoreValue").textContent=sc.total;if($("expenseScoreLabel"))$("expenseScoreLabel").textContent=sc.label;if($("expenseScoreArc"))$("expenseScoreArc").style.strokeDasharray=`${sc.total} 100`;}
document.addEventListener("input",e=>{if(e.target.matches("input"))live()});

function score(v){
 const inc=totalIncome(v),exp=totalExpenses(v),essential=v.electricity+v.rent+v.food_groceries+v.medical+v.maid_helper+v.wifi_dth+v.travel_expenses+v.education_expenses,surplus=inc-exp;
 const sr=inc?Math.max(0,surplus)/inc*100:0,es=inc?essential/inc*100:100,emi=inc?v.loan_emi/inc*100:100,months=v.emergency_fund/Math.max(exp,1),term=inc?v.life_insurance/(inc*12):0,ir=inc?v.investments/inc*100:0;
 const pts=[Math.min(20,Math.max(0,sr)),Math.min(15,Math.max(0,(40-es)*15/40)),Math.min(15,Math.max(0,15-emi)),Math.min(20,months/6*20),Math.min(10,v.health_insurance/1e6*10),Math.min(10,term),Math.min(10,ir/15*10)];
 const total=Math.round(pts.reduce((a,b)=>a+b,0));let label="Needs attention",summary="A few high-impact basics can materially improve your financial resilience.";
 if(total>=80){label="Strong";summary="A solid foundation across cash flow, protection and long-term habits."}else if(total>=65){label="Good";summary="Healthy core habits with a few meaningful gaps to close."}else if(total>=45){label="Fair";summary="Stable, but there are important protection or resilience gaps."}
 return {inc,exp,essential,surplus,sr,es,emi,months,term,ir,total,label,summary};
}
let currentValues=valObj();
function render(v){
 currentValues=v;const s=score(v);$("score").textContent=s.total;$("scoreBig").textContent=s.total;$("scoreLabel").textContent=s.label;$("scoreSummary").textContent=s.summary;
 $("rIncome").textContent=fmt(s.inc);$("rExpenses").textContent=fmt(s.exp);$("rSurplus").textContent=fmt(s.surplus);$("rInvested").textContent=fmt(v.investments);
 $("gaugeProgress").style.strokeDasharray=`${s.total} 100`;$("gaugeNeedle").style.transform=`rotate(${-90+s.total*1.8}deg)`;
 const cards=[
 ["Savings rate",`${s.sr.toFixed(1)}%`,"Target: 20% or more",Math.min(100,s.sr/20*100),s.sr>=20],
 ["Essentials share",`${s.es.toFixed(1)}%`,"Target: 40% or less",Math.min(100,s.es/40*100),s.es<=40],
 ["EMI burden",`${s.emi.toFixed(1)}%`,"Target: 15% or less",Math.min(100,s.emi/15*100),s.emi<=15],
 ["Emergency fund",`${s.months.toFixed(1)} months`,"Target: 6 months",Math.min(100,s.months/6*100),s.months>=6],
 ["Health cover",fmt(v.health_insurance),"Target: ₹10 lakh+",Math.min(100,v.health_insurance/1e6*100),v.health_insurance>=1e6],
 ["Term cover",`${s.term.toFixed(1)}×`,"Target: 10× annual income",Math.min(100,s.term/10*100),s.term>=10],
 ["Investing rate",`${s.ir.toFixed(1)}%`,"Target: 15% or more",Math.min(100,s.ir/15*100),s.ir>=15]
 ];
 $("ratioCards").innerHTML=cards.map(c=>`<div class="ratio-card ${c[4]?"good":"bad"}"><h3>${c[0]}</h3><div class="big">${c[1]}</div><p>${c[2]}</p><div class="meter"><i style="width:${Math.max(0,Math.min(100,c[3]))}%"></i></div></div>`).join("");
 const groups=[["Essentials",s.essential,"#2563eb"],["Lifestyle",v.entertainment+v.shopping+v.miscellaneous,"#8b5cf6"],["Loan & EMI",v.loan_emi,"#f97316"],["Savings",s.surplus,"#22c55e"]];
 let cursor=0,stops=[];groups.forEach(g=>{const p=s.inc?g[1]/s.inc*100:0;stops.push(`${g[2]} ${cursor}% ${cursor+p}%`);cursor+=p});$("donut").style.background=`conic-gradient(${stops.join(",")})`;$("donutPct").textContent=`${s.inc?(s.exp/s.inc*100).toFixed(1):0}%`;
 $("legend").innerHTML=groups.map(g=>`<div class="legend-row"><span><i class="legend-dot" style="background:${g[2]}"></i>${g[0]}</span><b>${fmt(g[1])} <span>(${s.inc?(g[1]/s.inc*100).toFixed(1):0}%)</span></b></div>`).join("");
 const rows=allExpenseDefs.map(([k,l])=>[l,v[k]]).filter(x=>x[1]>0).sort((a,b)=>b[1]-a[1]);$("bars").innerHTML=(rows.length?rows:[["No expenses entered",0]]).map(x=>`<div class="bar-row"><span>${x[0]}</span><div class="bar"><i style="width:${s.inc?Math.min(100,x[1]/s.inc*100):0}%"></i></div><b>${s.inc?(x[1]/s.inc*100).toFixed(1):0}%</b></div>`).join("");
 const strengths=[],gaps=[];
 if(s.sr>=20)strengths.push(["Savings rate",`${s.sr.toFixed(1)}% meets the 20% guide.`]);else gaps.push(["Savings rate",`${s.sr.toFixed(1)}% is below the 20% guide.`]);
 if(s.es<=40)strengths.push(["Essentials share",`${s.es.toFixed(1)}% is within the 40% guide.`]);else gaps.push(["Essentials share",`${s.es.toFixed(1)}% is above the 40% guide.`]);
 if(s.emi<=15)strengths.push(["EMI burden",`${s.emi.toFixed(1)}% is within the 15% guide.`]);else gaps.push(["EMI burden",`${s.emi.toFixed(1)}% is above the 15% guide.`]);
 if(s.months>=6)strengths.push(["Emergency fund",`${s.months.toFixed(1)} months are covered.`]);else gaps.push(["Emergency fund",`${s.months.toFixed(1)} months are covered against a 6-month guide.`]);
 if(v.health_insurance>=1e6)strengths.push(["Health cover",`${fmt(v.health_insurance)} meets the guide.`]);else gaps.push(["Health cover",`${fmt(v.health_insurance)} is below the ₹10 lakh guide.`]);
 if(s.term>=10)strengths.push(["Term cover",`${s.term.toFixed(1)}× annual income is covered.`]);else gaps.push(["Term cover",`${s.term.toFixed(1)}× annual income is below the 10× guide.`]);
 if(s.ir>=15)strengths.push(["Investing rate",`${s.ir.toFixed(1)}% is invested monthly.`]);else gaps.push(["Investing rate",`${s.ir.toFixed(1)}% is below the 15% guide.`]);
 $("strengths").innerHTML=(strengths.length?strengths:[["Foundation","Keep building consistency."]]).map(x=>`<div class="insight"><b>${x[0]}</b><span>${x[1]}</span></div>`).join("");
 $("weaknesses").innerHTML=(gaps.length?gaps:[["No major gaps","Tracked guideposts are all met."]]).map(x=>`<div class="insight negative"><b>${x[0]}</b><span>${x[1]}</span></div>`).join("");
 const actions=[];let need=Math.max(0,s.exp*6-v.emergency_fund);if(need>0)actions.push(["1. Build the emergency fund",`Add ${fmt(need)} toward six months of expenses.`]);
 need=Math.max(0,s.inc*120-v.life_insurance);if(need>0)actions.push(["2. Close the term-cover gap",`The guide is about ${fmt(s.inc*120)} of total term cover.`]);
 need=Math.max(0,s.inc*.15-v.investments);if(need>0)actions.push(["3. Increase monthly investing",`About ${fmt(need)} more per month reaches the 15% guide.`]);
 need=Math.max(0,1e6-v.health_insurance);if(need>0)actions.push(["4. Strengthen health cover","Consider moving toward ₹10 lakh total cover."]);
 if(s.emi>15)actions.push(["5. Reduce EMI pressure",`Your EMI burden is ${s.emi.toFixed(1)}%; prioritize expensive debt.`]);
 if(s.es>40)actions.push(["6. Review essential costs",`Essentials are ${s.es.toFixed(1)}% of income; review recurring fixed costs.`]);
 if(!actions.length)actions.push(["Keep the system healthy","Automate saving and investing, review protection annually, and revisit this check after major life changes."]);
 $("actions").innerHTML=actions.slice(0,6).map(x=>`<div class="action"><b>${x[0]}</b><p>${x[1]}</p></div>`).join("");
 $("formulaText").innerHTML=`<p>This is an educational rule-based model, not a credit score or individualized financial advice.</p><ul><li>Savings rate: 20 points for 20%+.</li><li>Essentials share: 15 points at 40% or less.</li><li>EMI burden: 15 points at 15% or less.</li><li>Emergency fund: 20 points at 6 months.</li><li>Health insurance: 10 points at ₹10 lakh+.</li><li>Term insurance: 10 points at 10× annual income.</li><li>Investing rate: 10 points at 15%+.</li></ul>`;
}

$("financeForm").onsubmit=async e=>{
 e.preventDefault();
 const v=valObj(), month=selectedMonth();
 if(!/^\d{4}-(0[1-9]|1[0-2])$/.test(month)){toast("Choose a month before saving your financial check-in.");openMonthGate();return;}
 if(v.income<=0){toast("Enter your monthly income on the Income page before saving.");navigatePage("income");$("income")?.focus();return;}
 const btn=$("saveBtn");if(btn){btn.disabled=true;btn.textContent="Saving to your account…";}
 try{
  const d=await api("/api/profile",{method:"PUT",body:JSON.stringify({month,...v})});
  if(!d.ok||!d.profile)throw Error("The server did not confirm that your data was saved. Please try again.");
  // Refresh from the database after the write, not just from the submitted form.
  const persisted=await api(`/api/profile?month=${encodeURIComponent(d.month)}`);
  if(!persisted.profile||Number(persisted.profile.income)!==Number(v.income))throw Error("Save could not be verified in the database. Your form is still here; please retry.");
  setVals(persisted.profile);
  await loadMonths();sessionStorage.setItem("mp-selected-month",d.month);setSelectedMonth(d.month);
  showSaveSuccess(!!d.thankYouEmailSent);
 }catch(x){console.error("MoneyPulse save failed:",x);toast(x.message||"Could not save this month. Check your connection and try again.");}
 finally{if(btn){btn.disabled=false;btn.textContent="Save my month ✓";}}
};
function setVals(p){
 Object.entries(p||{}).forEach(([k,v])=>{
  if($(k))$(k).value=(Number(v)===0?"":v);
 });
 document.querySelectorAll(".chips").forEach(box=>{
  const input=$(box.dataset.target);
  const value=Number(input?.value||0);
  box.querySelectorAll("button").forEach(b=>b.classList.toggle("selected",Number(b.dataset.value)===value && value!==0));
 });
 currentValues=valObj();live();render(currentValues);
}
async function loadMonths(){
 const d=await api("/api/months"),sel=$("monthSelect");sel.innerHTML="";
 const months=[...new Set([d.current,...d.months.map(x=>x.month),window.__selectedMonth].filter(Boolean))].sort().reverse();
 months.forEach(m=>sel.add(new Option(monthLabel(m),m)));const wanted=window.__selectedMonth||d.current;sel.value=months.includes(wanted)?wanted:d.current;window.__selectedMonth=sel.value;
 $("compareMonth").innerHTML=months.map(m=>`<option value="${m}">${monthLabel(m)}</option>`).join("");
 if(!window.__monthListener){sel.addEventListener("change",async()=>{try{setSelectedMonth(sel.value);const p=await api(`/api/profile?month=${encodeURIComponent(sel.value)}`);setVals(p.profile);toast(`${monthLabel(sel.value)} loaded.`)}catch(e){toast(e.message)}});window.__monthListener=true}
}
async function loadCompare(){
 try{
  const d=await api("/api/compare"),rows=d.months;
  if(!rows.length){$("compareTableWrap").innerHTML=`<div class="empty">Save at least one month to see a comparison.</div>`;return}
  const calc=v=>score(v);
  $("compareTableWrap").innerHTML=`<table class="compare-table"><thead><tr><th>Month</th><th>Income</th><th>Expenses</th><th>Surplus</th><th>Investing</th><th>Score</th><th>Status</th></tr></thead><tbody>${rows.slice().reverse().map(r=>{const s=calc(r);return`<tr><td>${monthLabel(r.month)}</td><td>${fmt(s.inc)}</td><td>${fmt(s.exp)}</td><td>${fmt(s.surplus)}</td><td>${fmt(r.investments)}</td><td><b>${s.total}</b></td><td><span class="status-dot">${s.label}</span></td></tr>`}).join("")}</tbody></table>`;
  const last=calc(rows[rows.length-1]),prev=rows.length>1?calc(rows[rows.length-2]):null;
  $("compareCards").innerHTML=[["Score change",prev?`${last.total-prev.total>=0?"+":""}${last.total-prev.total} points`:"First month"],["Surplus change",prev?`${last.surplus-prev.surplus>=0?"+":""}${fmt(last.surplus-prev.surplus)}`:"—"],["Expense change",prev?`${last.exp-prev.exp>=0?"+":""}${fmt(last.exp-prev.exp)}`:"—"],["Savings rate",`${last.sr.toFixed(1)}%`]].map(x=>`<div class="compare-card"><span>${x[0]}</span><b>${x[1]}</b></div>`).join("");
 }catch(e){toast(e.message)}
}
$("compareMonth").onchange=async()=>{const m=$("compareMonth").value;if(!m)return;try{setSelectedMonth(m);const p=await api(`/api/profile?month=${encodeURIComponent(m)}`);setVals(p.profile);location.href="/input"}catch(e){toast(e.message)}};
$("refreshCompare").onclick=loadCompare;

window.__chatHistory=window.__chatHistory||[];
function chatAdd(role,text){window.__chatHistory.push({role,content:text});$("chatMessages").insertAdjacentHTML("beforeend",`<div class="chat bubble ${role}"><b>${role==="user"?"You":"MoneyPulse AI"}</b><span>${text.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/\*\*(.*?)\*\*/g,"$1").replace(/\n/g,"<br>")}</span></div>`);$("chatMessages").scrollTop=$("chatMessages").scrollHeight}
document.querySelectorAll(".chat-suggestions button").forEach(b=>b.onclick=()=>{$("chatInput").value=b.textContent;$("chatForm").requestSubmit()});
function instantCoachAnswer(question,c){
 const q=String(question||"").toLowerCase();
 const inc=Number(c.income)||0, exp=Number(c.expenses)||0, sur=Number(c.surplus)||0;
 const score=Number(c.score)||0, sr=Number(c.savingsRate)||0, es=Number(c.essentialsShare)||0;
 const emi=Number(c.emiBurden)||0, months=Number(c.emergencyMonths)||0;
 const term=Number(c.termCoverMultiple)||0, ir=Number(c.investingRate)||0;
 const fmt=x=>"₹"+Math.round(Math.abs(Number(x)||0)).toLocaleString("en-IN");
 const pct=x=>`${(Number(x)||0).toFixed(1)}%`;
 const gaps=[];
 if(sur<0) gaps.push({rank:1,title:"Cash-flow shortfall",detail:`Your expenses exceed income by ${fmt(sur)} each month. First, pause non-essential purchases and review recurring bills until income is higher than spending.`});
 if(sr<20) gaps.push({rank:2,title:"Savings rate",detail:`Your savings rate is ${pct(sr)}; the guide is 20%. Start with a manageable target such as 5% of income, then increase it gradually.`});
 if(emi>15) gaps.push({rank:3,title:"Loan / EMI burden",detail:`EMIs use ${pct(emi)} of income; the guide is 15% or less. Avoid taking on new EMIs and compare the cost of existing debts before choosing a repayment strategy.`});
 if(es>40) gaps.push({rank:4,title:"Essential expenses",detail:`Essential expenses use ${pct(es)} of income; the guide is 40%. Review rent, groceries, utilities and travel for realistic reductions—don't cut necessary medical or safety costs.`});
 if(months<6) gaps.push({rank:5,title:"Emergency fund",detail:`Your emergency fund covers about ${months.toFixed(1)} months of expenses. Build it in stages, first toward one month, then three to six months.`});
 if(Number(c.healthInsurance)<1000000) gaps.push({rank:6,title:"Health insurance",detail:`The health-cover amount entered is ${fmt(c.healthInsurance)}. Review the coverage and exclusions for your household; MoneyPulse uses ₹10 lakh as a planning guide, not a universal requirement.`});
 if(term<10) gaps.push({rank:7,title:"Life / term cover",detail:`The entered life cover is about ${term.toFixed(1)}× annual income; MoneyPulse uses 10× as a rough guide. Consider dependants, debts and existing assets before changing cover.`});
 if(ir<15) gaps.push({rank:8,title:"Investing rate",detail:`Your entered monthly investments are ${pct(ir)} of income; the guide is 15%. First protect cash flow and near-term needs, then build a sustainable long-term contribution.`});
 gaps.sort((a,b)=>a.rank-b.rank);
 const top=gaps.slice(0,3);
 let answer=[];
 if(/increase|raise|boost|improv|next month|action|better/.test(q)){
   answer.push(`Your MoneyPulse score is ${score}/100 (${c.label||"current result"}). To improve it, work on these priorities in order:`);
   if(top.length) answer.push(top.map((g,i)=>`${i+1}. ${g.title}: ${g.detail}`).join("\n\n"));
   else answer.push("Your tracked guideposts look healthy. Keep your savings automatic, avoid expensive new debt, and review insurance and emergency savings regularly.");
   if(sur>0) answer.push(`Your estimated monthly surplus is ${fmt(sur)}. A practical first step is to automatically save a small portion of it on payday.`);
 } else if(/score|high|low|rating|why/.test(q)){
   answer.push(`Your current financial-health score is ${score}/100 — ${c.label||"based on the figures entered"}. It measures cash flow, savings, essential costs, EMI burden, emergency savings, insurance and investing—not income alone.`);
   answer.push(top.length?`The biggest opportunities to improve it are:\n${top.map((g,i)=>`${i+1}. ${g.title}: ${g.detail}`).join("\n\n")}`:"Your current figures meet the tracked guideposts. Keep reviewing them each month.");
 } else if(/biggest gap|gap|weakness|problem/.test(q)){
   answer.push(top.length?`Your highest-priority gaps are:\n${top.map((g,i)=>`${i+1}. ${g.title}: ${g.detail}`).join("\n\n")}`:"Your snapshot doesn't show a major gap in the tracked guideposts. Keep your habits consistent.");
 } else if(/expense|spend|budget|category|grocer|rent|travel|shopping|bill/.test(q)){
   const cats=Object.entries(c.expenseCategories||{}).filter(([,v])=>Number(v)>0).sort((a,b)=>b[1]-a[1]).slice(0,4);
   answer.push(`Monthly income is ${fmt(inc)}, expenses are ${fmt(exp)}, and the estimated ${sur>=0?"surplus":"shortfall"} is ${fmt(sur)}.`);
   if(cats.length) answer.push("Your largest entered expense categories are: "+cats.map(([k,v])=>`${k} (${fmt(v)})`).join(", ")+".");
   answer.push(sur<0?"Start by reviewing flexible spending and recurring subscriptions, while protecting essential healthcare and housing.":"Choose one flexible category to review and set a realistic monthly limit.");
 } else if(/save|saving|surplus/.test(q)){
   answer.push(`Monthly income is ${fmt(inc)}, expenses are ${fmt(exp)}, and your estimated ${sur>=0?"surplus":"shortfall"} is ${fmt(sur)}. Your savings rate is ${pct(sr)}.`);
   answer.push(sur<0?"First make cash flow positive by reviewing flexible costs and recurring bills.":"Automate a sustainable transfer on payday; build emergency savings before taking extra investment risk.");
 } else {
   answer.push(`Your score is ${score}/100. Monthly income is ${fmt(inc)}, expenses are ${fmt(exp)}, and the estimated ${sur>=0?"surplus":"shortfall"} is ${fmt(sur)}.`);
   answer.push(top.length?`Start with ${top[0].title.toLowerCase()}: ${top[0].detail}`:"Keep tracking your monthly figures and review them after each month is saved.");
 }
 answer.push("This is a quick, rules-based MoneyPulse explanation using the selected month's figures because Gemini did not respond in time.");
 return answer.join("\n\n");
}
$("chatForm").onsubmit=async e=>{e.preventDefault();const input=$("chatInput"),msg=input.value.trim();if(!msg)return;chatAdd("user",msg);input.value="";const send=document.querySelector("#chatForm button");send.disabled=true;send.textContent="Thinking…";try{const s=score(currentValues);const context={month:selectedMonth(),income:s.inc,spouseIncome:currentValues.spouse_income,expenses:s.exp,surplus:s.surplus,score:s.total,label:s.label,savingsRate:s.sr,essentialsShare:s.es,emiBurden:s.emi,emergencyMonths:s.months,termCoverMultiple:s.term,investingRate:s.ir,healthInsurance:currentValues.health_insurance,lifeInsurance:currentValues.life_insurance,emergencyFund:currentValues.emergency_fund,investments:currentValues.investments,expenseCategories:Object.fromEntries(allExpenseDefs.map(([k,l])=>[l,currentValues[k]]))};const d=await api("/api/ai/chat",{method:"POST",body:JSON.stringify({message:msg,context,history:window.__chatHistory.slice(0,-1).slice(-8)})});chatAdd("assistant",d.text);if(!d.configured)toast("AI is not connected. Add GEMINI_API_KEY to .env and restart the server.")}catch(x){const s=score(currentValues);const context={month:selectedMonth(),income:s.inc,spouseIncome:currentValues.spouse_income,expenses:s.exp,surplus:s.surplus,score:s.total,label:s.label,savingsRate:s.sr,essentialsShare:s.es,emiBurden:s.emi,emergencyMonths:s.months,termCoverMultiple:s.term,investingRate:s.ir,healthInsurance:currentValues.health_insurance,lifeInsurance:currentValues.life_insurance,emergencyFund:currentValues.emergency_fund,investments:currentValues.investments,expenseCategories:Object.fromEntries(allExpenseDefs.map(([k,l])=>[l,currentValues[k]]))};chatAdd("assistant",instantCoachAnswer(msg,context));toast("Gemini is temporarily unavailable; showing an instant MoneyPulse-based answer.")}finally{send.disabled=false;send.textContent="Send"}};

let saveScoreTimer=null;
function showSaveSuccess(emailSent){
 const modal=$("saveModal");if(!modal)return;
 $("saveMailNote").textContent=emailSent
  ?"Your data is saved successfully. A thank-you email has also been sent to your email address."
  :"Your data is saved successfully. Your monthly check-in is now part of your MoneyPulse history.";
 modal.classList.remove("hidden");document.body.classList.add("modal-open");
 const box=$("confetti");if(box){box.innerHTML="";for(let i=0;i<48;i++){const piece=document.createElement("i");piece.style.left=Math.random()*100+"%";piece.style.animationDelay=(Math.random()*0.45)+"s";piece.style.transform=`rotate(${Math.random()*360}deg)`;box.appendChild(piece)}}
 if(saveScoreTimer)clearTimeout(saveScoreTimer);
 // Briefly show the successful-save confirmation, then continue to the score page automatically.
 saveScoreTimer=setTimeout(()=>continueToScore(),1900);
}
function continueToScore(){
 if(saveScoreTimer){clearTimeout(saveScoreTimer);saveScoreTimer=null;}
 $("saveModal")?.classList.add("hidden");document.body.classList.remove("modal-open");navigatePage("score");
}
$("saveContinueBtn")?.addEventListener("click",continueToScore);
document.querySelectorAll("[data-go]").forEach(b=>b.addEventListener("click",()=>navigatePage(b.dataset.go)));
async function boot(){
 try{
  const d=await api("/api/auth/me");
  if(!d.user){$("authView").classList.remove("hidden");$("appView").classList.add("hidden");$("monthSelect").classList.add("hidden");return}
  $("authView").classList.add("hidden");$("appView").classList.remove("hidden");$("monthSelect").classList.add("hidden");$("userChip").classList.remove("hidden");
  $("userName").textContent=d.user.displayName;$("userAvatar").textContent=d.user.displayName.slice(0,1).toUpperCase();
  if(!d.user.verified){$("authView").classList.remove("hidden");$("appView").classList.add("hidden");$("monthSelect").classList.add("hidden");$("resendBtn").classList.remove("hidden");toast("Verify your email before starting a monthly check.");return}
  await loadMonths();
  const params=new URLSearchParams(location.search);if(params.get("verified")){history.replaceState({},"","/input");toast("Email verified successfully. Choose a month to begin.")}
  // Ask for a month/year after every successful login so the user can explicitly
  // select which monthly record to open instead of silently reusing a prior month.
  openMonthGate();
 }catch(x){toast(x.message)}
}
window.addEventListener("popstate",()=>showPage(currentPage()));

setupMonthGate();
boot();


// Two-step feedback: select a star rating, then optionally leave a written comment.
let selectedFeedbackRating = 0;
const ratingWords = {1:"Needs improvement",2:"Fair",3:"Good",4:"Very good",5:"Excellent"};
function showFeedbackModal(id){
  ["ratingModal","textFeedbackModal","feedbackThanksModal"].forEach(mid=>$(mid)?.classList.toggle("hidden",mid!==id));
  document.body.classList.toggle("modal-open",!!id);
}
function updateRatingStars(value){
  selectedFeedbackRating=value;
  document.querySelectorAll(".rating-star").forEach(btn=>{
    const active=Number(btn.dataset.rating)<=value;
    btn.classList.toggle("active",active);
    btn.setAttribute("aria-checked",Number(btn.dataset.rating)===value?"true":"false");
  });
  $("ratingLabel").textContent=value?`${value} out of 5 — ${ratingWords[value]}`:"Select a rating";
  $("ratingContinueBtn").disabled=!value;
}
$("openFeedbackBtn")?.addEventListener("click",()=>{
  updateRatingStars(0);
  $("feedbackText").value="";
  $("feedbackCharCount").textContent="0 / 2000";
  showFeedbackModal("ratingModal");
});
document.querySelectorAll(".rating-star").forEach(btn=>{
  btn.addEventListener("click",()=>updateRatingStars(Number(btn.dataset.rating)));
  btn.addEventListener("keydown",e=>{
    if(!["ArrowLeft","ArrowRight","ArrowUp","ArrowDown","Home","End"].includes(e.key))return;
    e.preventDefault();
    let value=selectedFeedbackRating||1;
    if(e.key==="ArrowRight"||e.key==="ArrowDown")value=Math.min(5,value+1);
    if(e.key==="ArrowLeft"||e.key==="ArrowUp")value=Math.max(1,value-1);
    if(e.key==="Home")value=1;if(e.key==="End")value=5;
    updateRatingStars(value);
    document.querySelector(`.rating-star[data-rating="${value}"]`)?.focus();
  });
});
$("ratingContinueBtn")?.addEventListener("click",()=>{
  if(!selectedFeedbackRating)return;
  $("selectedRatingText").textContent=`${selectedFeedbackRating} out of 5 stars`;
  showFeedbackModal("textFeedbackModal");
  $("feedbackText").focus();
});
$("feedbackBackBtn")?.addEventListener("click",()=>showFeedbackModal("ratingModal"));
$("feedbackText")?.addEventListener("input",()=>{$("feedbackCharCount").textContent=`${$("feedbackText").value.length} / 2000`;});
document.querySelectorAll("[data-close-feedback]").forEach(el=>el.addEventListener("click",()=>showFeedbackModal(null)));
document.querySelectorAll("[data-close-text-feedback]").forEach(el=>el.addEventListener("click",()=>showFeedbackModal(null)));
document.querySelectorAll("[data-close-thanks-feedback]").forEach(el=>el.addEventListener("click",()=>showFeedbackModal(null)));
$("feedbackForm")?.addEventListener("submit",async e=>{
  e.preventDefault();
  if(!selectedFeedbackRating){showFeedbackModal("ratingModal");return;}
  const submit=$("submitFeedbackBtn"),comment=$("feedbackText").value.trim();
  submit.disabled=true;submit.textContent="Submitting…";
  try{
    await api("/api/feedback",{method:"POST",body:JSON.stringify({rating:selectedFeedbackRating,feedback:comment,month:selectedMonth()})});
    showFeedbackModal("feedbackThanksModal");
  }catch(err){toast(err.message||"Could not submit feedback. Please try again.");}
  finally{submit.disabled=false;submit.textContent="Submit feedback ✓";}
});
document.addEventListener("keydown",e=>{
  if(e.key!=="Escape")return;
  const active=["feedbackThanksModal","textFeedbackModal","ratingModal"].find(id=>!$(id)?.classList.contains("hidden"));
  if(active)showFeedbackModal(null);
});
