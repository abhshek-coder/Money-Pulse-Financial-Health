const http = require("http");
const fs = require("fs");
const path = require("path");
const crypto = require("crypto");
const tls = require("tls");
const { DatabaseSync } = require("node:sqlite");

function loadDotEnv(file=path.join(__dirname,".env")){
  try{
    const raw=fs.readFileSync(file,"utf8");
    for(const line of raw.split(/\r?\n/)){
      const m=line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if(!m||m[1] in process.env) continue;
      let value=m[2].trim();
      if((value.startsWith('"')&&value.endsWith('"'))||(value.startsWith("'")&&value.endsWith("'"))) value=value.slice(1,-1);
      process.env[m[1]]=value;
    }
  }catch{}
}
loadDotEnv();

const PORT = Number(process.env.PORT || 3000);
const SESSION_SECRET = process.env.SESSION_SECRET || "dev-change-this-session-secret";
const COOKIE_SECURE = process.env.NODE_ENV === "production";
const ROOT = __dirname;
const PUBLIC = path.join(ROOT, "public");
const DATA = path.join(ROOT, "data");
fs.mkdirSync(DATA, { recursive: true });

const db = new DatabaseSync(path.join(DATA, "moneypulse.sqlite"));
db.exec(`
PRAGMA journal_mode = WAL;
CREATE TABLE IF NOT EXISTS users (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  email TEXT NOT NULL UNIQUE,
  display_name TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  verified INTEGER NOT NULL DEFAULT 0,
  verification_token TEXT,
  verification_expires_at INTEGER,
  welcome_sent_at TEXT,
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE IF NOT EXISTS financial_profiles (
  user_id INTEGER PRIMARY KEY,
  income REAL NOT NULL DEFAULT 0,
  electricity REAL NOT NULL DEFAULT 0,
  rent REAL NOT NULL DEFAULT 0,
  food_groceries REAL NOT NULL DEFAULT 0,
  medical REAL NOT NULL DEFAULT 0,
  maid_helper REAL NOT NULL DEFAULT 0,
  loan_emi REAL NOT NULL DEFAULT 0,
  travel_expenses REAL NOT NULL DEFAULT 0,
  wifi_dth REAL NOT NULL DEFAULT 0,
  phone_bills REAL NOT NULL DEFAULT 0,
  education_expenses REAL NOT NULL DEFAULT 0,
  entertainment REAL NOT NULL DEFAULT 0,
  shopping REAL NOT NULL DEFAULT 0,
  miscellaneous REAL NOT NULL DEFAULT 0,
  health_insurance REAL NOT NULL DEFAULT 0,
  life_insurance REAL NOT NULL DEFAULT 0,
  emergency_fund REAL NOT NULL DEFAULT 0,
  investments REAL NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS monthly_profiles (
  user_id INTEGER NOT NULL,
  month TEXT NOT NULL,
  income REAL NOT NULL DEFAULT 0,
  spouse_income REAL NOT NULL DEFAULT 0,
  electricity REAL NOT NULL DEFAULT 0,
  rent REAL NOT NULL DEFAULT 0,
  food_groceries REAL NOT NULL DEFAULT 0,
  medical REAL NOT NULL DEFAULT 0,
  maid_helper REAL NOT NULL DEFAULT 0,
  loan_emi REAL NOT NULL DEFAULT 0,
  travel_expenses REAL NOT NULL DEFAULT 0,
  wifi_dth REAL NOT NULL DEFAULT 0,
  phone_bills REAL NOT NULL DEFAULT 0,
  education_expenses REAL NOT NULL DEFAULT 0,
  entertainment REAL NOT NULL DEFAULT 0,
  shopping REAL NOT NULL DEFAULT 0,
  miscellaneous REAL NOT NULL DEFAULT 0,
  health_insurance REAL NOT NULL DEFAULT 0,
  life_insurance REAL NOT NULL DEFAULT 0,
  emergency_fund REAL NOT NULL DEFAULT 0,
  investments REAL NOT NULL DEFAULT 0,
  updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY(user_id, month),
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS sessions (
  token_hash TEXT PRIMARY KEY,
  user_id INTEGER NOT NULL,
  expires_at INTEGER NOT NULL,
  created_at INTEGER NOT NULL,
  FOREIGN KEY(user_id) REFERENCES users(id) ON DELETE CASCADE
);
`);

try { db.exec("ALTER TABLE users ADD COLUMN welcome_sent_at TEXT"); } catch {}
try { db.exec("ALTER TABLE users ADD COLUMN verification_expires_at INTEGER"); } catch {}
try { db.exec("ALTER TABLE monthly_profiles ADD COLUMN travel_expenses REAL NOT NULL DEFAULT 0"); } catch {}
try { db.exec("ALTER TABLE monthly_profiles ADD COLUMN wifi_dth REAL NOT NULL DEFAULT 0"); } catch {}
try { db.exec("ALTER TABLE monthly_profiles ADD COLUMN phone_bills REAL NOT NULL DEFAULT 0"); } catch {}
try { db.exec("ALTER TABLE monthly_profiles ADD COLUMN education_expenses REAL NOT NULL DEFAULT 0"); } catch {}
try { db.exec("ALTER TABLE financial_profiles ADD COLUMN travel_expenses REAL NOT NULL DEFAULT 0"); } catch {}
try { db.exec("ALTER TABLE financial_profiles ADD COLUMN wifi_dth REAL NOT NULL DEFAULT 0"); } catch {}
try { db.exec("ALTER TABLE financial_profiles ADD COLUMN phone_bills REAL NOT NULL DEFAULT 0"); } catch {}
try { db.exec("ALTER TABLE financial_profiles ADD COLUMN education_expenses REAL NOT NULL DEFAULT 0"); } catch {}
try { db.exec("UPDATE monthly_profiles SET travel_expenses=fuel WHERE travel_expenses=0 AND fuel>0"); } catch {}
try { db.exec("UPDATE monthly_profiles SET wifi_dth=wifi_ott WHERE wifi_dth=0 AND wifi_ott>0"); } catch {}
try { db.exec("UPDATE financial_profiles SET travel_expenses=fuel WHERE travel_expenses=0 AND fuel>0"); } catch {}
try { db.exec("UPDATE financial_profiles SET wifi_dth=wifi_ott WHERE wifi_dth=0 AND wifi_ott>0"); } catch {}
try { db.exec("UPDATE monthly_profiles SET wifi_dth=wifi_dth+phone_bills WHERE phone_bills>0"); db.exec("UPDATE monthly_profiles SET phone_bills=0 WHERE phone_bills>0"); } catch {}
try { db.exec("UPDATE financial_profiles SET wifi_dth=wifi_dth+phone_bills WHERE phone_bills>0"); db.exec("UPDATE financial_profiles SET phone_bills=0 WHERE phone_bills>0"); } catch {}
db.exec(`CREATE TABLE IF NOT EXISTS app_feedback (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id INTEGER NOT NULL,
  month TEXT NOT NULL,
  rating INTEGER NOT NULL CHECK(rating BETWEEN 1 AND 5),
  feedback TEXT NOT NULL DEFAULT '',
  created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY(user_id) REFERENCES users(id)
)`);
const fields = [
  "income","spouse_income","electricity","rent","food_groceries","medical","maid_helper",
  "loan_emi","travel_expenses","wifi_dth","phone_bills","education_expenses","entertainment","shopping","miscellaneous",
  "health_insurance","life_insurance","emergency_fund","investments"
];
const oldFields = fields.filter(x => x !== "spouse_income");
const json = (res,status,body)=>send(res,status,body);
function send(res,status,body,type="application/json; charset=utf-8"){
  res.writeHead(status,{
    "Content-Type":type,"Cache-Control":"no-store","X-Content-Type-Options":"nosniff",
    "X-Frame-Options":"SAMEORIGIN","Referrer-Policy":"strict-origin-when-cross-origin"
  });
  res.end(type.startsWith("application/json")?JSON.stringify(body):body);
}
const parseCookies=req=>Object.fromEntries((req.headers.cookie||"").split(";").filter(Boolean).map(x=>{const i=x.indexOf("=");return[x.slice(0,i).trim(),decodeURIComponent(x.slice(i+1))]}));
const sha256=s=>crypto.createHash("sha256").update(s).digest("hex");
const randomToken=()=>crypto.randomBytes(32).toString("hex");
const cookie=(name,value,maxAge=604800)=>`${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${maxAge}; HttpOnly; SameSite=Lax${COOKIE_SECURE?"; Secure":""}`;
const clearCookie=name=>`${name}=; Path=/; Max-Age=0; HttpOnly; SameSite=Lax${COOKIE_SECURE?"; Secure":""}`;
const safeNumber=x=>{const n=Number(x);return Number.isFinite(n)&&n>=0&&n<=1e12?Math.round(n*100)/100:0};
const emailOk=e=>/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e);
const monthOk=m=>/^\d{4}-(0[1-9]|1[0-2])$/.test(m);
const currentMonth=()=>{const d=new Date();return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`};
const publicBaseUrl=()=>String(process.env.PUBLIC_BASE_URL||"").replace(/\/$/,"");
const appUrl=(req,pathPart)=>`${publicBaseUrl()||`http://${req.headers.host||"localhost:3000"}`}${pathPart}`;

function scryptHash(password){const salt=crypto.randomBytes(16).toString("hex");const hash=crypto.scryptSync(password,salt,64).toString("hex");return `scrypt:${salt}:${hash}`}
function scryptVerify(password,encoded){try{const [kind,salt,stored]=String(encoded).split(":");if(kind!=="scrypt"||!salt||!stored)return false;const actual=crypto.scryptSync(password,salt,64);const expected=Buffer.from(stored,"hex");return expected.length===actual.length&&crypto.timingSafeEqual(actual,expected)}catch{return false}}
function currentUser(req){
  const c=parseCookies(req); if(!c.mp_session)return null;
  return db.prepare(`SELECT u.id,u.email,u.display_name,u.verified,u.welcome_sent_at FROM sessions s JOIN users u ON u.id=s.user_id WHERE s.token_hash=? AND s.expires_at>?`).get(sha256(c.mp_session),Date.now())||null;
}
function requireUser(req,res){const u=currentUser(req);if(!u){json(res,401,{error:"Please sign in first."});return null}return u}
async function body(req){return await new Promise((resolve,reject)=>{let data="";req.on("data",c=>{data+=c;if(data.length>300000){req.destroy();reject(new Error("Request too large"))}});req.on("end",()=>{try{resolve(data?JSON.parse(data):{})}catch(e){reject(e)}});req.on("error",reject)})}
function makeSession(res,userId){const token=randomToken(),now=Date.now(),expiry=now+7*86400000;db.prepare("INSERT INTO sessions(token_hash,user_id,expires_at,created_at) VALUES(?,?,?,?)").run(sha256(token),userId,expiry,now);res.setHeader("Set-Cookie",cookie("mp_session",token))}
function redirect(res,location){res.writeHead(302,{Location:location});res.end()}
function profileFor(userId,month){
  return db.prepare(`SELECT ${fields.join(",")} FROM monthly_profiles WHERE user_id=? AND month=?`).get(userId,month)||Object.fromEntries(fields.map(k=>[k,0]));
}
function ensureCurrentProfile(userId){
  const m=currentMonth();
  const exists=db.prepare("SELECT 1 FROM monthly_profiles WHERE user_id=? AND month=?").get(userId,m);
  if(!exists){
    const old=db.prepare(`SELECT ${oldFields.join(",")} FROM financial_profiles WHERE user_id=?`).get(userId);
    if(old){
      const cols=fields.join(","), qs=fields.map(()=>"?").join(",");
      db.prepare(`INSERT OR IGNORE INTO monthly_profiles(user_id,month,${cols}) VALUES(?,?,${qs})`).run(userId,m,...fields.map(k=>old[k]||0));
    } else db.prepare("INSERT OR IGNORE INTO monthly_profiles(user_id,month) VALUES(?,?)").run(userId,m);
  }
}
function monthsFor(userId){
  return db.prepare("SELECT month,updated_at FROM monthly_profiles WHERE user_id=? ORDER BY month DESC").all(userId);
}
function gmailConfigured(){return !!(process.env.GMAIL_USER&&process.env.GMAIL_APP_PASSWORD)}
class SMTPReplyReader {
  constructor(socket) {
    this.socket = socket;
    this.buffer = "";
    this.lines = [];
    this.waiters = [];
    this.closedError = null;
    socket.on("data", chunk => {
      this.buffer += chunk.toString("utf8");
      let idx;
      while ((idx = this.buffer.indexOf("\n")) !== -1) {
        const line = this.buffer.slice(0, idx).replace(/\r$/, "");
        this.buffer = this.buffer.slice(idx + 1);
        this.lines.push(line);
        // SMTP multi-line replies end with "250 " (space); intermediate
        // lines use "250-" (hyphen). Keep the entire response together.
        if (/^\d{3} /.test(line)) this.flushReply();
      }
    });
    socket.on("error", err => this.fail(err));
    socket.on("close", () => this.fail(new Error("Gmail SMTP connection closed unexpectedly")));
  }
  flushReply() {
    if (!this.lines.length) return;
    const reply = this.lines.join("\n");
    this.lines = [];
    const waiter = this.waiters.shift();
    if (waiter) waiter.resolve(reply);
    else this.pending = [...(this.pending || []), reply];
  }
  fail(err) {
    this.closedError = err;
    while (this.waiters.length) this.waiters.shift().reject(err);
  }
  reply(timeoutMs = 12000) {
    if (this.pending?.length) return Promise.resolve(this.pending.shift());
    if (this.closedError) return Promise.reject(this.closedError);
    return new Promise((resolve, reject) => {
      const waiter = {
        resolve: value => { clearTimeout(timer); resolve(value); },
        reject: err => { clearTimeout(timer); reject(err); }
      };
      const timer = setTimeout(() => {
        const i = this.waiters.indexOf(waiter);
        if (i >= 0) this.waiters.splice(i, 1);
        reject(new Error("Timed out waiting for Gmail SMTP response"));
      }, timeoutMs);
      this.waiters.push(waiter);
    });
  }
  async command(command, expected) {
    if (command !== null && command !== undefined) this.socket.write(command + "\r\n");
    const reply = await this.reply();
    const match = reply.match(/^(\d{3}) /m);
    const code = match ? Number(match[1]) : 0;
    if (code < 200 || code >= 400 || (expected && code !== expected)) {
      throw new Error(`SMTP ${code || "unknown"}: ${reply.split("\n").slice(-1)[0]}`);
    }
    return code;
  }
}
async function sendGmailMail(to,subject,textBody){
  if(!gmailConfigured()) return {sent:false,reason:"gmail_not_configured"};
  const user=process.env.GMAIL_USER, pass=process.env.GMAIL_APP_PASSWORD.replace(/\s/g,"");
  return await new Promise((resolve,reject)=>{
    let settled = false;
    const finishError = err => {
      if (settled) return;
      settled = true;
      reject(err);
    };
    const socket=tls.connect(465,"smtp.gmail.com",{servername:"smtp.gmail.com"});
    const reader = new SMTPReplyReader(socket);
    socket.setTimeout(15000,()=>socket.destroy(new Error("Gmail SMTP timeout")));
    socket.once("secureConnect", async()=>{
      try{
        // Attach a persistent parser before reading the greeting so a fast
        // Gmail 220 banner cannot be lost between TLS connect and EHLO.
        await reader.command(null,220);
        await reader.command("EHLO localhost",250);
        await reader.command("AUTH LOGIN",334);
        await reader.command(Buffer.from(user).toString("base64"),334);
        await reader.command(Buffer.from(pass).toString("base64"),235);
        await reader.command(`MAIL FROM:<${user}>`,250);
        await reader.command(`RCPT TO:<${to}>`,250);
        await reader.command("DATA",354);
        const safeSubject=String(subject).replace(/[\r\n]/g," ");
        const body=String(textBody).replace(/\r?\n/g,"\r\n").replace(/^\./gm,"..");
        socket.write(`From: MoneyPulse <${user}>\r\nTo: <${to}>\r\nSubject: ${safeSubject}\r\nMIME-Version: 1.0\r\nContent-Type: text/plain; charset=UTF-8\r\n\r\n${body}\r\n.\r\n`);
        await reader.command(null,250);
        await reader.command("QUIT",221).catch(()=>{});
        settled = true;
        socket.end();
        resolve({sent:true});
      }catch(e){socket.destroy();finishError(e)}
    });
    socket.once("error",finishError);
  });
}
async function sendVerificationEmail(to,name,url){
  return sendGmailMail(to,"Verify your MoneyPulse account",`Hi ${name},\n\nWelcome to MoneyPulse. Please verify your email address to activate your account:\n\n${url}\n\nIf you did not create this account, you can ignore this email.\n\n— MoneyPulse`);
}
async function sendWelcomeEmail(to,name){
  return sendGmailMail(to,"Welcome to MoneyPulse",`Hi ${name},\n\nWelcome to MoneyPulse — your personal financial health workspace is ready.\n\nStart by entering your monthly income, expenses, protection and investment details. You can save each month and compare progress over time.\n\nThis is an educational planning tool, not individualized financial advice.\n\n— MoneyPulse`);
}
async function sendSaveThankYouEmail(to,name,month){
  return sendGmailMail(to,`MoneyPulse — ${month} data saved successfully`,`Hi ${name},\n\nThank you for keeping your MoneyPulse financial check-in up to date.\n\nYour ${month} financial data was saved successfully to your private account. You can return anytime to review your score, see strengths and actions, and compare this month with previous months.\n\nKeep going — small, consistent check-ins can make your financial progress easier to understand.\n\n— MoneyPulse`);
}
async function maybeWelcome(u){
  if(!u?.verified||u.welcome_sent_at||!gmailConfigured()) return;
  try{const result=await sendWelcomeEmail(u.email,u.display_name);if(result.sent)db.prepare("UPDATE users SET welcome_sent_at=CURRENT_TIMESTAMP WHERE id=?").run(u.id)}catch(e){console.error("Welcome email failed:",e.message)}
}
async function callGemini(message,context,history=[]){
  const key=process.env.GEMINI_API_KEY;
  if(!key) return {configured:false,code:"missing_api_key",text:"AI Coach is not connected yet. Add GEMINI_API_KEY to the server .env file, restart MoneyPulse, then try again."};
  const configuredModel=process.env.GEMINI_MODEL||"gemini-3.8-flash";
  const instructions=`You are MoneyPulse AI Coach, a real AI financial-health explainer for Indian users. Give useful, concrete, plain-language answers instead of canned messages. Use the supplied monthly snapshot for personalization and never invent numbers. Use ₹ and Indian number formatting when useful. You are not a licensed financial adviser; for material investment, insurance, tax or debt decisions, explain trade-offs and suggest checking with a qualified professional. Never ask for passwords, OTPs, bank login credentials, card numbers or other secrets. If the user asks for current facts and web search is enabled, use it; otherwise say when information may need current verification. Keep answers focused and actionable.`;
  const safeHistory=Array.isArray(history)?history.slice(-6).map(x=>({role:x?.role==="assistant"?"model":"user",parts:[{text:String(x?.content||"").slice(0,3000)}]})).filter(x=>x.parts[0].text):[];
  const contents=[...safeHistory,{role:"user",parts:[{text:`Current selected month financial snapshot:\\n${JSON.stringify(context,null,2)}\\n\\nUser question: ${message}`}]}];
  // Keep the prompt compact and ask for low thinking effort for a conversational coach.
  // A 3.5s timeout was too aggressive and caused normal Gemini responses to fall back.
  const payload={systemInstruction:{parts:[{text:instructions}]},contents,generationConfig:{maxOutputTokens:420,temperature:0.35,thinkingConfig:{thinkingLevel:"low"}}};
  if(String(process.env.GEMINI_ENABLE_WEB_SEARCH).toLowerCase()==="true") payload.tools=[{google_search:{}}];
  // Try the configured model first; use a known current Flash fallback only if the
  // configured model ID is unavailable. Don't retry overloads: it adds latency.
  const modelsToTry=[...new Set([configuredModel,"gemini-3.8-flash"].filter(Boolean))];
  let r, data;
  for(const model of modelsToTry){
    const endpoint=`https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(model)}:generateContent`;
    r=await fetch(endpoint,{method:"POST",headers:{"x-goog-api-key":key,"Content-Type":"application/json"},body:JSON.stringify(payload),signal:AbortSignal.timeout(9000)});
    data=await r.json().catch(()=>({}));
    if(r.ok || r.status!==404) break;
  }
  if(!r.ok){
    const detail=data?.error?.message||`Gemini returned HTTP ${r.status}`;
    const err=new Error(detail);err.status=r.status;throw err;
  }
  const text=(data.candidates||[]).flatMap(c=>c.content?.parts||[]).map(p=>p.text||"").filter(Boolean).join("\n");
  return {configured:true,text:text||"I received the request but could not generate a text response. Please try again."};
}

setInterval(()=>db.prepare("DELETE FROM sessions WHERE expires_at<=?").run(Date.now()),3600000).unref();
const rate=new Map();
function limited(ip,key,limit=12,windowMs=60000){const k=`${ip}:${key}`,now=Date.now(),fresh=(rate.get(k)||[]).filter(t=>now-t<windowMs);if(fresh.length>=limit){rate.set(k,fresh);return true}fresh.push(now);rate.set(k,fresh);return false}

function monthLabelForEmail(m){
  const [y,mo]=String(m).split("-");
  return new Date(Number(y),Number(mo)-1,1).toLocaleDateString("en-IN",{month:"long",year:"numeric"});
}
const server=http.createServer(async(req,res)=>{
  try{
    const url=new URL(req.url,`http://${req.headers.host||"localhost"}`);
    if(req.method==="GET"&&url.pathname==="/api/health")return json(res,200,{ok:true,gmailConfigured:gmailConfigured(),gmailUser:gmailConfigured()?process.env.GMAIL_USER:null,aiConfigured:!!process.env.GEMINI_API_KEY});
    if(req.method==="POST"&&url.pathname==="/api/auth/test-email"){const u=requireUser(req,res);if(!u)return;if(!gmailConfigured())return json(res,400,{error:"Gmail is not configured. Set GMAIL_USER and GMAIL_APP_PASSWORD in .env and restart the server."});try{const r=await sendGmailMail(u.email,"MoneyPulse email test","This is a test email from MoneyPulse. Gmail SMTP is working correctly.");return json(res,200,{sent:!!r.sent,message:"Test email sent."})}catch(e){console.error("SMTP test failed:",e.stack||e.message);return json(res,502,{error:`Gmail SMTP failed: ${e.message}`})}}
    if(req.method==="GET"&&url.pathname==="/api/auth/me"){const u=currentUser(req);return json(res,200,{user:u?{email:u.email,displayName:u.display_name,verified:!!u.verified}:null})}
    if(req.method==="POST"&&url.pathname==="/api/auth/register"){
      if(limited(req.socket.remoteAddress||"unknown","register"))return json(res,429,{error:"Too many attempts. Please wait a minute."});
      const b=await body(req),email=String(b.email||"").trim().toLowerCase(),name=String(b.displayName||"").trim().slice(0,60),password=String(b.password||"");
      if(!name)return json(res,400,{error:"Enter your name."});if(!emailOk(email))return json(res,400,{error:"Enter a valid email."});if(password.length<8)return json(res,400,{error:"Password must be at least 8 characters."});
      if(db.prepare("SELECT id FROM users WHERE email=?").get(email))return json(res,409,{error:"An account with this email already exists."});
      const token=randomToken(),verificationExpires=Date.now()+30*60*1000,info=db.prepare("INSERT INTO users(email,display_name,password_hash,verification_token,verification_expires_at) VALUES(?,?,?,?,?)").run(email,name,scryptHash(password),token,verificationExpires);
      db.prepare("INSERT INTO financial_profiles(user_id) VALUES(?)").run(info.lastInsertRowid);
      makeSession(res,info.lastInsertRowid);
      const verificationUrl=appUrl(req,`/api/auth/verify?token=${encodeURIComponent(token)}`);
      let mail={sent:false,reason:"gmail_not_configured"};
      if(gmailConfigured()){try{mail=await sendVerificationEmail(email,name,verificationUrl)}catch(e){console.error("Verification email failed:",e.stack||e.message);mail={sent:false,reason:"send_failed"}}}
      return json(res,201,{message:mail.sent?"Account created. Check your Gmail inbox to verify your email.":"Account created. Gmail is not configured, so use the verification link below for local testing.",verificationUrl,emailSent:mail.sent});
    }
    if(req.method==="GET"&&url.pathname==="/api/auth/verify"){
      const token=url.searchParams.get("token")||"",u=db.prepare("SELECT id FROM users WHERE verification_token=? AND (verification_expires_at IS NULL OR verification_expires_at>?)").get(token,Date.now());
      if(!u)return send(res,400,"This verification link is invalid or has expired. Please request a new one.","text/html; charset=utf-8");
      db.prepare("UPDATE users SET verified=1,verification_token=NULL,verification_expires_at=NULL WHERE id=?").run(u.id);makeSession(res,u.id);return redirect(res,"/?verified=1");
    }
    if(req.method==="POST"&&url.pathname==="/api/auth/resend"){
      const u=requireUser(req,res);if(!u)return;if(u.verified)return json(res,400,{error:"This account is already verified."});
      const token=randomToken();db.prepare("UPDATE users SET verification_token=? WHERE id=?").run(token,u.id);
      const verificationUrl=appUrl(req,`/api/auth/verify?token=${encodeURIComponent(token)}`);
      if(!gmailConfigured())return json(res,200,{emailSent:false,verificationUrl,message:"Gmail is not configured. Use the verification link for local testing."});
      try{await sendVerificationEmail(u.email,u.display_name,verificationUrl);return json(res,200,{emailSent:true,message:"A new verification email was sent."})}
      catch(e){console.error("Resend verification email failed:",e.stack||e.message);return json(res,502,{error:"Could not send the verification email. Check the server terminal for the SMTP error and verify your Gmail app password."})}
    }
    if(req.method==="POST"&&url.pathname==="/api/auth/login"){
      if(limited(req.socket.remoteAddress||"unknown","login",15))return json(res,429,{error:"Too many login attempts. Please wait a minute."});
      const b=await body(req),email=String(b.email||"").trim().toLowerCase(),password=String(b.password||""),u=db.prepare("SELECT * FROM users WHERE email=?").get(email);
      if(!u||!scryptVerify(password,u.password_hash))return json(res,401,{error:"Invalid email or password."});
      makeSession(res,u.id);await maybeWelcome(u);return json(res,200,{user:{email:u.email,displayName:u.display_name,verified:!!u.verified}});
    }
    if(req.method==="POST"&&url.pathname==="/api/auth/logout"){const c=parseCookies(req);if(c.mp_session)db.prepare("DELETE FROM sessions WHERE token_hash=?").run(sha256(c.mp_session));res.setHeader("Set-Cookie",clearCookie("mp_session"));return json(res,200,{ok:true})}

    if(req.method==="GET"&&url.pathname==="/api/months"){const u=requireUser(req,res);if(!u)return;ensureCurrentProfile(u.id);return json(res,200,{months:monthsFor(u.id),current:currentMonth()})}
    if(req.method==="GET"&&url.pathname==="/api/profile"){
      const u=requireUser(req,res);if(!u)return;if(!u.verified)return json(res,403,{error:"Please verify your account first."});
      const month=monthOk(url.searchParams.get("month")||"")?url.searchParams.get("month"):currentMonth();ensureCurrentProfile(u.id);return json(res,200,{month,profile:profileFor(u.id,month)});
    }
    if(req.method==="PUT"&&url.pathname==="/api/profile"){
      const u=requireUser(req,res);if(!u)return;if(!u.verified)return json(res,403,{error:"Please verify your account first."});
      const b=await body(req),month=monthOk(String(b.month||""))?String(b.month):currentMonth(),v=Object.fromEntries(fields.map(k=>[k,safeNumber(b[k])]));if(v.income<=0)return json(res,400,{error:"Monthly income must be greater than zero."});
      const cols=fields.join(","),updates=fields.map(k=>`${k}=excluded.${k}`).join(","),qs=fields.map(()=>"?").join(",");
      db.prepare(`INSERT INTO monthly_profiles(user_id,month,${cols}) VALUES(?,?,${qs}) ON CONFLICT(user_id,month) DO UPDATE SET ${updates},updated_at=CURRENT_TIMESTAMP`).run(u.id,month,...fields.map(k=>v[k]));
      // Read back the row immediately so the client only receives success after
      // SQLite confirms the account/month record exists and matches the write.
      const saved=profileFor(u.id,month);
      if(Number(saved.income)!==Number(v.income))throw new Error("Database verification failed after saving the monthly profile.");
      let thankYouEmailSent=false;
      if(gmailConfigured()){try{const mail=await sendSaveThankYouEmail(u.email,u.display_name,monthLabelForEmail(month));thankYouEmailSent=!!mail.sent}catch(e){console.error("Save thank-you email failed:",e.message)}}
      return json(res,200,{ok:true,month,profile:saved,thankYouEmailSent});
    }
    if(req.method==="GET"&&url.pathname==="/api/compare"){
      const u=requireUser(req,res);if(!u)return;const rows=db.prepare(`SELECT month,${fields.join(",")},updated_at FROM monthly_profiles WHERE user_id=? ORDER BY month ASC`).all(u.id);
      return json(res,200,{months:rows});
    }
    if(req.method==="POST"&&url.pathname==="/api/feedback"){
      const u=requireUser(req,res);if(!u)return;
      if(!u.verified)return json(res,403,{error:"Please verify your account first."});
      if(limited(req.socket.remoteAddress||"unknown","feedback",10,60000))return json(res,429,{error:"Too many feedback submissions. Please wait a moment."});
      const b=await body(req),rating=Number(b.rating),feedback=String(b.feedback||"").trim().slice(0,2000);
      const month=monthOk(String(b.month||""))?String(b.month):currentMonth();
      if(!Number.isInteger(rating)||rating<1||rating>5)return json(res,400,{error:"Please select a star rating from 1 to 5."});
      db.prepare("INSERT INTO app_feedback(user_id,month,rating,feedback) VALUES(?,?,?,?)").run(u.id,month,rating,feedback);
      return json(res,201,{ok:true,message:"Thank you for your feedback."});
    }
    if(req.method==="POST"&&url.pathname==="/api/ai/chat"){
      const u=requireUser(req,res);if(!u)return;if(!u.verified)return json(res,403,{error:"Please verify your account first."});if(limited(req.socket.remoteAddress||"unknown","ai",30,60000))return json(res,429,{error:"AI limit reached. Please wait a minute."});
      const b=await body(req),message=String(b.message||"").trim().slice(0,2500),context=b.context||{};
      if(!message)return json(res,400,{error:"Ask a question first."});
      try{return json(res,200,await callGemini(message,context,b.history))}catch(e){console.error("AI error:",e.stack||e.message);const detail=String(e.message||"");let friendly="Gemini is temporarily busy. I can still give you an instant MoneyPulse-based suggestion.";if(e.name==="TimeoutError"||e.name==="AbortError")friendly="Gemini took too long to respond. Try again in a moment; an instant MoneyPulse-based suggestion is available.";else if(e.status===429)friendly="Gemini usage limit reached. Please check your AI Studio quota and try again later.";else if(e.status===503||/high demand|overload|unavailable/i.test(detail))friendly="Gemini is experiencing high demand. Try again shortly; here is an instant MoneyPulse-based suggestion.";else if(e.status===401||e.status===403)friendly="Gemini rejected the API key or access. Check GEMINI_API_KEY and the model access in AI Studio.";return json(res,502,{error:friendly,code:e.status===429?"rate_limit":e.status===503?"overloaded":e.name==="TimeoutError"?"timeout":"ai_error"})}
    }

    if(req.method==="GET"){
      const pageRoutes={"/":"index.html","/input":"index.html","/income":"index.html","/expenses":"index.html","/protection":"index.html","/score":"index.html","/actions":"index.html","/compare":"index.html"};
      const file=pageRoutes[url.pathname] || url.pathname.replace(/^\/+/,""),safe=path.normalize(file),full=path.join(PUBLIC,safe);
      if(!full.startsWith(PUBLIC))return json(res,403,{error:"Forbidden"});
      if(fs.existsSync(full)&&fs.statSync(full).isFile()){
        const ext=path.extname(full).toLowerCase(),types={".html":"text/html; charset=utf-8",".js":"text/javascript; charset=utf-8",".css":"text/css; charset=utf-8",".svg":"image/svg+xml",".webmanifest":"application/manifest+json",".png":"image/png"};
        res.writeHead(200,{"Content-Type":types[ext]||"application/octet-stream","Cache-Control":ext===".html"?"no-cache":"public, max-age=3600"});return fs.createReadStream(full).pipe(res);
      }
    }
    json(res,404,{error:"Not found"});
  }catch(err){
    console.error("Request failed:",req.method,req.url,err.stack||err.message);
    if(!res.headersSent){
      const message=(req.method==="PUT"&&req.url.startsWith("/api/profile"))?`Could not save your monthly data: ${err.message}`:"Server error. Check the terminal for details.";
      json(res,500,{error:message});
    }
  }
});
server.on("error", (err) => {
  console.error("MoneyPulse could not start listening:", err.code || err.message);
  if (err.code === "EADDRINUSE") {
    console.error(`Port ${PORT} is already in use. Stop the other server or set PORT=3001 in .env.`);
  }
  process.exitCode = 1;
});
server.listen(PORT, "0.0.0.0", () => {
  console.log(`MoneyPulse running locally at http://localhost:${PORT}`);
  console.log(`For phones/tablets on the same Wi-Fi or hotspot, use this PC's IPv4 address: http://<PC-IPv4-address>:${PORT}`);
  console.log("Only share access on a trusted private network. Press Ctrl+C to stop the server.");
  console.log(`Project folder: ${ROOT}`);
});
process.on("uncaughtException", (err) => {
  console.error("MoneyPulse fatal error:", err && (err.stack || err.message) || err);
  process.exit(1);
});
process.on("unhandledRejection", (reason) => {
  console.error("MoneyPulse unhandled rejection:", reason && (reason.stack || reason.message) || reason);
});
