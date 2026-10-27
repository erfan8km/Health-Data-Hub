import { validateRegistryPayload } from "./validate.mjs";
import { checkRateLimit, handleAuthRequest, readAdminSession } from "./auth.mjs";
export { OAuthStateStore } from "./oauth-state-store.mjs";

const ADMIN_HTML = "<!doctype html>\n<html lang=\"fa\" dir=\"rtl\">\n<head>\n<meta charset=\"utf-8\">\n<meta name=\"viewport\" content=\"width=device-width,initial-scale=1\">\n<meta name=\"color-scheme\" content=\"light\">\n<title>RegistryHub · پنل مدیریت</title>\n<style>\n:root{font-family:Tahoma,\"Segoe UI\",Arial,sans-serif;color:#18243a;background:#f3f6fb;font-synthesis:none;text-rendering:optimizeLegibility;--ink:#18243a;--muted:#66758e;--line:#dfe6f0;--blue:#244a80;--navy:#111c32;--panel:#fff;--green:#21734d;--red:#a33242}\n*{box-sizing:border-box}\nbody{margin:0;background:radial-gradient(circle at top right,#eaf1fb 0,transparent 30rem),#f3f6fb;min-height:100vh}\nbutton,input,select,textarea{font:inherit}\nheader{background:linear-gradient(115deg,#10192d,#203e6a);color:#fff;padding:20px max(20px,calc((100% - 1220px)/2));display:flex;justify-content:space-between;align-items:center;gap:20px;border-bottom:3px solid #6ea7ef}\n.brand{display:flex;align-items:center;gap:12px}.brand-mark{display:grid;place-items:center;width:42px;height:42px;border-radius:13px;background:#dceafe;color:#16345c;font-size:20px;font-weight:900;box-shadow:inset 0 0 0 1px #fff8}.brand strong{font-size:20px;letter-spacing:.2px}.brand small{display:block;color:#bdcce0;margin-top:4px}\n.header-meta{display:flex;align-items:center;gap:12px;flex-wrap:wrap}.header-meta small{color:#c3d1e6}.header-pill{border:1px solid #ffffff38;background:#ffffff12;color:#fff;border-radius:999px;padding:6px 12px;font-size:12px;font-weight:700}\n.wrap{max-width:1220px;margin:30px auto;padding:0 22px}\n.page-heading{display:flex;justify-content:space-between;align-items:flex-end;gap:20px;margin:0 0 20px}.eyebrow{font-size:11px;letter-spacing:1.5px;color:#5c76a2;font-weight:800;margin:0 0 8px}.page-heading h1{font-size:clamp(25px,3vw,34px);letter-spacing:-.7px;margin:0 0 8px}.page-heading p{margin:0;line-height:1.8}.workflow-state{display:inline-flex;align-items:center;gap:8px;white-space:nowrap;background:#fff;border:1px solid var(--line);color:#475a76;border-radius:999px;padding:9px 13px;font-size:12px;font-weight:700}.pulse{width:8px;height:8px;border-radius:50%;background:#d7a33a;box-shadow:0 0 0 4px #d7a33a22}\n.notice{display:flex;gap:13px;align-items:flex-start;background:#fff;border:1px solid var(--line);border-inline-start:4px solid #d8a13a;border-radius:15px;padding:15px 17px;margin:0 0 18px;box-shadow:0 8px 24px #1a31520a}.notice-icon{flex:0 0 28px;height:28px;display:grid;place-items:center;border-radius:50%;background:#fff1d4;color:#80550b;font-weight:900}.notice strong{display:block;margin:1px 0 4px}.notice p{margin:0;color:#586983;font-size:13px;line-height:1.8}\n.auth-panel{display:flex;align-items:center;gap:10px;flex-wrap:wrap;background:#fff;border:1px solid var(--line);border-radius:14px;padding:13px 16px;margin-bottom:18px;box-shadow:0 8px 24px #1a31520a}.auth-panel form{margin-inline-start:auto}.auth-dot{width:9px;height:9px;border-radius:50%;background:#93a3b9;box-shadow:0 0 0 4px #93a3b91c}.auth-panel #auth-status{font-size:13px;color:#4b5d78}\n.toolbar,.panel{background:var(--panel);border:1px solid var(--line);border-radius:17px;padding:19px;margin-bottom:18px;box-shadow:0 8px 24px #1a31520a}.toolbar{display:flex;flex-wrap:wrap;align-items:center;gap:14px}.toolbar-title{min-width:170px}.toolbar-title h2,.section-title h2{font-size:17px;margin:0 0 5px}.toolbar-title p,.section-title p{font-size:12px;color:var(--muted);margin:0;line-height:1.7}.toolbar-actions{display:flex;align-items:center;flex:1;flex-wrap:wrap;gap:9px;min-width:0}.toolbar input[type=search]{flex:1 1 210px;min-width:180px}\ninput,select,textarea{border:1px solid #cdd7e5;border-radius:10px;padding:11px 12px;width:100%;background:#fff;color:var(--ink);outline:none;transition:border-color .15s,box-shadow .15s}input:focus,select:focus,textarea:focus{border-color:#6f96d2;box-shadow:0 0 0 3px #6f96d225}\nbutton,.filebtn{font:inherit;font-size:13px;font-weight:750;border:1px solid transparent;border-radius:10px;padding:10px 13px;background:var(--blue);color:#fff;cursor:pointer;display:inline-flex;align-items:center;justify-content:center;gap:7px;text-decoration:none;white-space:nowrap;transition:transform .15s,background .15s;min-height:40px}\nbutton:hover,.filebtn:hover{transform:translateY(-1px);background:#1c3b69}button:disabled{opacity:.55;cursor:wait;transform:none}\nbutton.secondary,.filebtn.secondary{background:#f0f4fa;color:#2d4569;border-color:#dfe6f0}button.secondary:hover,.filebtn.secondary:hover{background:#e5edf8}\nbutton.danger{background:#fff1f2;color:#a33242;border-color:#f2d5d9}button.danger:hover{background:#ffe5e8}\n.filebtn{position:relative;overflow:hidden}.filebtn input{position:absolute;inset:0;width:100%;height:100%;opacity:0;cursor:pointer}\n.data-source{display:flex;align-items:center;gap:8px;flex-basis:100%;font-size:12px;color:var(--muted);border-top:1px solid #edf1f6;padding-top:12px}.source-dot{width:7px;height:7px;flex:0 0 7px;border-radius:50%;background:#9ca9bb}\n.stats{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:14px;margin:0 0 18px}.stat{position:relative;overflow:hidden;background:#fff;border:1px solid var(--line);padding:18px;border-radius:15px;box-shadow:0 8px 24px #1a31520a}.stat:after{content:\"\";position:absolute;inset-inline-end:0;top:0;bottom:0;width:3px;background:#8caddd}.stat-label{font-size:12px;color:var(--muted);margin-bottom:9px}.stat strong{display:block;font-size:27px;line-height:1.2;font-weight:800;color:#203d68}.stat .muted{display:block;margin-top:5px}\n.grid{display:grid;grid-template-columns:1fr 1fr;gap:14px}.field label{display:block;font-size:12px;font-weight:800;margin-bottom:7px;color:#435570}.field.wide{grid-column:1/-1}.field textarea{min-height:100px;resize:vertical}.field-hint{font-size:11px;color:#7b879a;margin-top:6px;line-height:1.7}\n.panel-head{display:flex;justify-content:space-between;align-items:center;gap:12px;margin-bottom:15px}.section-title{min-width:0}.panel-note{font-size:11px;color:var(--muted);line-height:1.7}\n.list{display:grid;gap:10px}.item{display:flex;align-items:center;justify-content:space-between;gap:14px;border:1px solid #e2e8f1;border-radius:12px;padding:14px 15px;background:linear-gradient(115deg,#fff,#fbfcfe)}.item strong{display:block;font-size:14px;line-height:1.7}.item p{margin:4px 0 0;color:#6c7a90;font-size:12px;direction:ltr;text-align:right;overflow-wrap:anywhere}.item>div:last-child{display:flex;gap:7px;flex-shrink:0}\n.muted{color:var(--muted);font-size:12px;line-height:1.8}.status{margin:12px 0 0;padding:10px 12px;border-radius:9px;color:#245d41;background:#edf8f0;border:1px solid #d6eddd;white-space:pre-wrap;overflow-wrap:anywhere;font-size:12px;line-height:1.8;direction:auto;text-align:start}.status:empty{display:none}.status.error{color:#982a39;background:#fff1f2;border-color:#f2d5da}\n#editor h2{font-size:18px;margin:0 0 16px}.form-actions{display:flex;gap:9px;flex-wrap:wrap;margin-top:17px}.hidden{display:none!important}\n@media(max-width:760px){header{align-items:flex-start;flex-direction:column}.header-meta{width:100%;justify-content:space-between}.wrap{padding:0 13px;margin:18px auto}.page-heading{align-items:flex-start;flex-direction:column}.workflow-state{white-space:normal}.toolbar{padding:14px}.toolbar-actions{width:100%}.toolbar-actions>*{flex:1}.toolbar input[type=search]{flex-basis:100%}.stats{grid-template-columns:1fr 1fr}.grid{grid-template-columns:1fr}.field.wide{grid-column:auto}.item{align-items:flex-start;flex-direction:column}.item>div:last-child{width:100%}.item button{flex:1}.panel{padding:15px}.panel-head{align-items:flex-start;flex-direction:column}.auth-panel form{margin-inline-start:0}}\n@media(max-width:420px){.stats{grid-template-columns:1fr}.header-meta small{font-size:10px}}\n</style>\n</head>\n<body>\n<header>\n <div class=\"brand\"><span class=\"brand-mark\">R</span><div><strong>RegistryHub</strong><small>سامانه مدیریت کاتالوگ رجیستری‌ها</small></div></div>\n <div class=\"header-meta\"><span class=\"header-pill\">پنل مدیریت</span><small>Cloudflare Worker · GitHub review workflow</small></div>\n</header>\n<main class=\"wrap\">\n <section class=\"page-heading\">\n  <div><p class=\"eyebrow\">REGISTRY CATALOGUE</p><h1>مدیریت رجیستری‌ها</h1><p class=\"muted\">مشاهده، افزودن و ویرایش رکوردها؛ تغییرات نهایی پس از بررسی انسانی ثبت می‌شوند.</p></div>\n  <span class=\"workflow-state\"><span class=\"pulse\"></span> انتشار مستقیم غیرفعال است</span>\n </section>\n <div class=\"notice\"><span class=\"notice-icon\">i</span><div><strong>گردش کار امن</strong><p>ارسال تغییرات فقط یک Pull Request ایجاد می‌کند؛ این پنل چیزی را ادغام یا منتشر نمی‌کند. هرگز توکن GitHub را در این صفحه وارد نکن.</p></div></div>\n <section id=\"auth-bar\" class=\"auth-panel\" aria-live=\"polite\"><span class=\"auth-dot\"></span><span id=\"auth-status\">در حال بررسی نشست مدیر…</span><a id=\"login-link\" class=\"filebtn hidden\" href=\"/auth/login\">ورود با GitHub</a><form id=\"logout-form\" class=\"hidden\" action=\"/auth/logout\" method=\"post\"><button type=\"submit\" class=\"secondary\">خروج</button></form></section>\n <div id=\"admin-area\" class=\"hidden\">\n  <section class=\"toolbar\">\n   <div class=\"toolbar-title\"><h2>داده‌های کاتالوگ</h2><p>بارگذاری خودکار از شاخهٔ main؛ در صورت نیاز می‌توان فایل محلی هم وارد کرد.</p></div>\n   <div class=\"toolbar-actions\">\n    <button id=\"reload-catalogue\" class=\"secondary\" type=\"button\">↻ بارگذاری از GitHub</button>\n    <label class=\"filebtn\">واردکردن registries.json<input id=\"file\" type=\"file\" accept=\".json,application/json\"></label>\n    <label class=\"filebtn secondary\">دسته‌بندی‌ها<input id=\"categories-file\" type=\"file\" accept=\".json,application/json\"></label>\n    <label class=\"filebtn secondary\">کشورها<input id=\"countries-file\" type=\"file\" accept=\".json,application/json\"></label><label class=\"filebtn secondary\">استان‌ها<input id=\"provinces-file\" type=\"file\" accept=\".json,application/json\"></label>\n    <input id=\"search\" type=\"search\" placeholder=\"جست‌وجو بر اساس نام، شهر یا slug…\" aria-label=\"جست‌وجوی رجیستری‌ها\">\n   </div>\n   <div class=\"data-source\"><span class=\"source-dot\"></span><span id=\"source-status\">داده‌ها هنوز بارگذاری نشده‌اند.</span></div>\n  </section>\n  <div class=\"stats\">\n   <div class=\"stat\"><div class=\"stat-label\">تعداد رکوردها</div><strong id=\"count\">0</strong><span class=\"muted\">رکوردهای کاتالوگ</span></div>\n   <div class=\"stat\"><div class=\"stat-label\">وضعیت اعتبارسنجی</div><strong id=\"valid\">—</strong><span class=\"muted\">بررسی ساختار و شناسه‌ها</span></div>\n  </div>\n  <section class=\"panel hidden\" id=\"editor\">\n   <h2 id=\"editor-title\">رکورد رجیستری</h2>\n   <form id=\"form\">\n    <div class=\"grid\">\n     <div class=\"field\"><label for=\"slug\">شناسهٔ یکتا (Slug)</label><input id=\"slug\" required pattern=\"[a-z0-9]+(?:-[a-z0-9]+)*\"><div class=\"field-hint\">حروف انگلیسی کوچک، عدد و خط تیره.</div></div>\n     <div class=\"field\"><label for=\"country\">شناسهٔ کشور</label><select id=\"country\" required></select></div>\n     <div class=\"field\"><label for=\"en\">نام انگلیسی</label><input id=\"en\" required dir=\"ltr\"></div>\n     <div class=\"field\"><label for=\"fa\">نام فارسی</label><input id=\"fa\" required dir=\"rtl\"></div>\n     <div class=\"field\"><label for=\"city\">شناسهٔ شهر</label><select id=\"city\" required></select><input id=\"new-city\" class=\"hidden\" placeholder=\"شناسهٔ شهر جدید، مثل tehran\" pattern=\"[a-z0-9]+(?:-[a-z0-9]+)*\" style=\"margin-top:8px\" dir=\"ltr\"></div><div class=\"field\"><label for=\"province\">شناسهٔ استان</label><select id=\"province\" required></select><div class=\"field-hint\">استان‌های غیرفعال نیز برای آماده‌سازی اطلاعات پذیرفته می‌شوند؛ فعال‌سازی روی نقشه جداگانه مدیریت می‌شود.</div></div>\n     <div class=\"field wide\"><label>دسته‌بندی‌ها (انتخاب دقیقاً یک مورد)</label><div id=\"category-options\" class=\"grid\"></div></div>\n     <div class=\"field wide\"><label for=\"description\">توضیح کوتاه</label><textarea id=\"description\"></textarea></div>\n     <div class=\"field wide\"><label for=\"targetPopulation\">جمعیت هدف</label><textarea id=\"targetPopulation\"></textarea></div>\n     <div class=\"field\"><label for=\"center\">مرکز</label><input id=\"center\"></div>\n     <div class=\"field\"><label for=\"status\">وضعیت</label><input id=\"status\"></div>\n     <div class=\"field\"><label for=\"lastReviewedAt\">تاریخ آخرین بررسی اطلاعات</label><input id=\"lastReviewedAt\" type=\"date\"></div>\n     <div class=\"field\"><label for=\"startYear\">سال شروع</label><input id=\"startYear\" inputmode=\"numeric\" pattern=\"[0-9]{4}\" maxlength=\"4\"></div>\n     <div class=\"field\"><label for=\"registryType\">نوع ریجستری</label><input id=\"registryType\"></div>\n     <div class=\"field wide\"><label for=\"dataSummary\">خلاصه‌ی نوع داده‌هایی که جمع‌آوری می‌شود</label><textarea id=\"dataSummary\"></textarea></div>\n     <div class=\"field wide\"><label for=\"researchContact\">راه ارتباط یا همکاری پژوهشی</label><textarea id=\"researchContact\"></textarea></div>\n     <div class=\"field wide\"><label for=\"keyPublicationsText\">مقالات اصلی با لینک</label><textarea id=\"keyPublicationsText\" dir=\"auto\" placeholder=\"هر مقاله در یک خط: عنوان مقاله | https://...\"></textarea><div class=\"field-hint\">هر خط باید شامل عنوان مقاله، یک جداکنندهٔ | و لینک HTTPS باشد.</div></div>\n     <div class=\"field wide\"><label for=\"url\">نشانی رسمی HTTPS (اختیاری)</label><input id=\"url\" type=\"url\" placeholder=\"https://…\" dir=\"ltr\"></div>\n    </div>\n    <p class=\"muted\">در ویرایش رکورد موجود، slug قفل است چون بخشی از نشانی عمومی رجیستری محسوب می‌شود. برای دسته‌بندی و کشور از شناسه‌های موجود استفاده کن.</p>\n    <div class=\"form-actions\"><button type=\"submit\">ذخیره در پیش‌نویس</button><button type=\"button\" id=\"cancel\" class=\"secondary\">انصراف</button></div>\n   </form>\n  </section>\n  <section class=\"panel\">\n   <div class=\"panel-head\"><div class=\"section-title\"><h2>رکوردهای رجیستری</h2><p>ویرایش‌ها تا زمان ارسال، فقط در پیش‌نویس این مرورگر ذخیره می‌شوند.</p></div>\n    <div class=\"toolbar-actions\"><button id=\"new\" type=\"button\">+ رجیستری جدید</button><button id=\"export\" type=\"button\" class=\"secondary\">خروجی JSON</button><button id=\"download-template\" type=\"button\" class=\"secondary\">دانلود قالب نمونه</button><button id=\"submit-proposal\" type=\"button\">ارسال برای بازبینی</button></div>\n   </div>\n   <div id=\"list\" class=\"list\"><p class=\"muted\">هنوز داده‌ای بارگذاری نشده است.</p></div>\n   <p id=\"message\" class=\"status\" role=\"status\" aria-live=\"polite\"></p>\n  </section>\n </div>\n</main>\n<script>const $=id=>document.getElementById(id);\nlet records=[],editIndex=-1,categoriesData=[],countriesData=[],provincesData=[],dirty=false;\nconst STORAGE_KEY='registryhub-admin-draft-v2';\nconst fields=['slug','fa','en','country','province','city','center','description','targetPopulation','status','lastReviewedAt','startYear','registryType','dataSummary','researchContact','url'];\nfunction emptyMetadata(){return {targetPopulation:'',center:'',status:'',lastReviewedAt:'',startYear:'',registryType:'',dataSummary:'',researchContact:'',keyPublications:[]};}\nfunction normalizeRegistry(row){return {...emptyMetadata(),...row,keyPublications:Array.isArray(row.keyPublications)?row.keyPublications.map(p=>({title:String(p?.title||''),url:String(p?.url||'')})):[]};}\nfunction parsePublicationsText(value){return String(value||'').split(String.fromCharCode(10)).map(line=>line.trim()).filter(Boolean).map(line=>{const split=line.indexOf('|');return {title:(split<0?line:line.slice(0,split)).trim(),url:split<0?'':line.slice(split+1).trim()};});}\nfunction formatPublicationsText(items){return (Array.isArray(items)?items:[]).map(item=>item.title+(item.url?' | '+item.url:'')).join(String.fromCharCode(10));}\nfunction esc(s){return String(s??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',\"'\":'&#39;'}[c]));}\nfunction canonicalCity(s){return String(s||'').trim().toLowerCase().normalize('NFKD').replace(/[\\u0300-\\u036f]/g,'').replace(/[^a-z0-9]+/g,'-').replace(/^-|-$/g,'');}\nfunction persistDraft(){try{localStorage.setItem(STORAGE_KEY,JSON.stringify({records,categoriesData,countriesData,provincesData,dirty}));}catch(e){$('message').textContent='ذخیرهٔ پیش‌نویس محلی ناموفق بود: '+e.message;$('message').className='status error';}}\nfunction markDirty(){dirty=true;persistDraft();}\nwindow.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue='';}});\nfunction loadSelect(id,rows,selected){const el=$(id),previous=selected??el.value;el.innerHTML=rows.map(x=>'<option value=\"'+esc(x.id)+'\">'+esc(x.id)+' — '+esc(x.en||x.fa||x.id)+'</option>').join('');if(previous&&!rows.some(x=>x.id===previous)){const opt=document.createElement('option');opt.value=previous;opt.textContent=previous+' (not in loaded list)';el.append(opt);}if(previous)el.value=previous;if(!el.value&&rows.length)el.value=rows[0].id;}\nfunction renderCategories(selected=[]){$('category-options').innerHTML=categoriesData.map(c=>'<label style=\"display:flex;gap:8px;align-items:center;border:1px solid #e1e7f0;padding:8px;border-radius:8px\"><input type=\"radio\" name=\"category\" value=\"'+esc(c.id)+'\" '+(selected.includes(c.id)?'checked':'')+' style=\"width:auto\">'+esc(c.id)+' — '+esc(c.en||c.fa||c.id)+'</label>').join('')||'<p class=\"muted\">Load categories.json to choose categories.</p>';}\nfunction renderCities(selected='mashhad'){const vals=[...new Set(['mashhad',...records.map(r=>r.city).filter(Boolean)].map(canonicalCity))].filter(Boolean).sort();$('city').innerHTML=vals.map(v=>'<option value=\"'+esc(v)+'\">'+esc(v)+'</option>').join('')+'<option value=\"__new\">+ Add new city ID…</option>';if(vals.includes(selected)){$('city').value=selected;$('new-city').classList.add('hidden');}else if(selected){$('city').value='__new';$('new-city').value=selected;$('new-city').classList.remove('hidden');}else{$('city').value=vals[0]||'__new';$('new-city').classList.toggle('hidden',$('city').value!=='__new');}}\n$('city').addEventListener('change',()=>{$('new-city').classList.toggle('hidden',$('city').value!=='__new');if($('city').value==='__new')$('new-city').focus();});\nfunction validate(){const errors=[],slugs=new Set(),countryIds=new Set(countriesData.map(x=>x.id)),provinceIds=new Set(provincesData.map(x=>x.id)),categoryIds=new Set(categoriesData.map(x=>x.id)),textFields=['description','targetPopulation','center','status','lastReviewedAt','startYear','registryType','dataSummary','researchContact','officialUrl'];records.forEach((r,i)=>{if(typeof r.slug!=='string'||!r.slug.trim()||!r.fa?.trim()||!r.en?.trim())errors.push('Record '+(i+1)+': slug and bilingual names are required');if(r.slug){if(slugs.has(r.slug))errors.push('Duplicate slug: '+r.slug);slugs.add(r.slug);}if(!r.country||(countriesData.length&&!countryIds.has(r.country)))errors.push('Record '+(i+1)+': unknown country ID: '+r.country);if(!r.province||(provincesData.length&&!provinceIds.has(r.province)))errors.push('Record '+(i+1)+': unknown province ID: '+r.province);if(typeof r.city!=='string'||!r.city.trim())errors.push('Record '+(i+1)+': city is required');if(!Array.isArray(r.categories)||r.categories.length!==1)errors.push('Record '+(i+1)+': exactly one category is required');else if(categoriesData.length)r.categories.forEach(id=>{if(!categoryIds.has(id))errors.push('Record '+(i+1)+': unknown category ID: '+id);});textFields.forEach(k=>{if(typeof r[k]!=='string')errors.push('Record '+(i+1)+': '+k+' must be a string');});if(r.lastReviewedAt&&!/^\\d{4}-\\d{2}-\\d{2}$/.test(r.lastReviewedAt))errors.push('Record '+(i+1)+': date must use YYYY-MM-DD');if(r.startYear&&!/^\\d{4}$/.test(r.startYear))errors.push('Record '+(i+1)+': start year must use four digits');if(r.officialUrl){try{if(new URL(r.officialUrl).protocol!=='https:')throw Error();}catch{errors.push('Record '+(i+1)+': officialUrl must be a valid HTTPS URL');}}if(!Array.isArray(r.keyPublications))errors.push('Record '+(i+1)+': keyPublications must be an array');else r.keyPublications.forEach((p,j)=>{if(!p||typeof p.title!=='string'||!p.title.trim()||typeof p.url!=='string'||!p.url.trim())errors.push('Record '+(i+1)+': publication '+(j+1)+' needs a title and URL');else{try{if(new URL(p.url).protocol!=='https:')throw Error();}catch{errors.push('Record '+(i+1)+': publication '+(j+1)+' URL must use HTTPS');}}});});return errors;}\nfunction render(){const q=$('search').value.trim().toLowerCase(),filtered=records.map((r,i)=>({...r,__i:i})).filter(r=>[r.slug,r.fa,r.en,r.province,r.city,r.country].some(v=>String(v||'').toLowerCase().includes(q)));$('count').textContent=records.length;const errs=validate();$('valid').textContent=records.length?(errs.length?'خطا: '+errs.length:'معتبر'):'—';$('valid').style.color=errs.length?'#a12c38':'#244f38';$('list').innerHTML=filtered.length?filtered.map(r=>'<div class=\"item\"><div><strong>'+esc(r.en)+' / '+esc(r.fa)+'</strong><p>'+esc(r.slug)+' · '+esc(r.province)+' · '+esc(r.city)+' · '+esc(r.country)+'</p></div><div><button class=\"secondary\" data-edit=\"'+r.__i+'\">Edit</button> <button class=\"danger\" data-delete=\"'+r.__i+'\">Delete</button></div></div>').join(''):'<p class=\"muted\">No matching records.</p>';$('message').textContent=errs.slice(0,8).join('\\n');$('message').className='status'+(errs.length?' error':'');}\nfunction showEditor(index=-1){editIndex=index;$('editor').classList.remove('hidden');$('editor-title').textContent=index<0?'New registry':'Edit registry';const r=index<0?{slug:'',fa:'',en:'',country:countriesData[0]?.id||'IR',province:provincesData.find(x=>x.active)?.id||provincesData[0]?.id||'',city:'mashhad',categories:[],description:'',officialUrl:'',...emptyMetadata()}:normalizeRegistry(records[index]||{});for(const f of fields){const key=f==='url'?'officialUrl':f;$(f).value=r[key]??'';}$('keyPublicationsText').value=formatPublicationsText(r.keyPublications);$('slug').disabled=index>=0;loadSelect('country',countriesData,r.country);loadSelect('province',provincesData,r.province);renderCities(r.city||'mashhad');renderCategories(r.categories||[]);window.scrollTo({top:$('editor').offsetTop-10,behavior:'smooth'});}\nasync function loadJsonFile(file,kind){try{const rows=JSON.parse(await file.text());if(!Array.isArray(rows))throw Error('Expected a JSON array.');if(kind==='registries'){if(dirty&&!confirm('Replace the current draft with this file?'))return;records=rows.map(normalizeRegistry);}else if(kind==='categories'){if(rows.some(x=>typeof x.id!=='string'||!x.id))throw Error('Every category needs an id.');categoriesData=rows;renderCategories([...document.querySelectorAll('input[name="category"]:checked')].map(x=>x.value));}else if(kind==='countries'){if(rows.some(x=>typeof x.id!=='string'||!x.id))throw Error('Every country needs an id.');countriesData=rows;loadSelect('country',countriesData,$('country').value);}else if(kind==='provinces'){if(rows.some(x=>typeof x.id!=='string'||!x.id))throw Error('Every province needs an id.');provincesData=rows;loadSelect('province',provincesData,$('province').value||provincesData.find(x=>x.active)?.id||'');}else throw Error('Unknown data type.');markDirty();render();$('message').textContent='Loaded '+rows.length+' '+kind+' entries; local draft autosaved.';}catch(e){$('message').textContent='Could not load '+kind+': '+e.message;$('message').className='status error';}}\nasync function loadCurrentCatalogue({force=false}={}){\n if(location.protocol==='file:'){\n  $('source-status').textContent='پیش‌نمایش محلی؛ API در دسترس نیست.';\n  return;\n }\n if(force&&dirty&&records.length&&!confirm('بارگذاری از GitHub پیش‌نویس محلی فعلی را جایگزین می‌کند. ادامه می‌دهی؟'))return;\n const button=$('reload-catalogue');button.disabled=true;\n $('source-status').textContent='در حال دریافت اطلاعات از GitHub main…';\n $('message').textContent='در حال بارگذاری کاتالوگ…';$('message').className='status';\n try{\n  const response=await fetch('/api/catalogue',{credentials:'same-origin',cache:'no-store',headers:{accept:'application/json'}});\n  const data=await response.json().catch(()=>({}));\n  if(!response.ok)throw new Error(data.error||('درخواست ناموفق بود ('+response.status+')'));\n  if(!Array.isArray(data.registries)||!Array.isArray(data.categories)||!Array.isArray(data.countries)||!Array.isArray(data.provinces))throw new Error('ساختار دادهٔ دریافتی معتبر نیست.');\n  records=data.registries.map(normalizeRegistry);categoriesData=data.categories;countriesData=data.countries;provincesData=data.provinces;dirty=false;\n  loadSelect('country',countriesData,'IR');loadSelect('province',provincesData,provincesData.find(x=>x.active)?.id||records[0]?.province||'');renderCategories();renderCities('mashhad');persistDraft();render();\n  $('source-status').textContent='منبع: GitHub · شاخهٔ main · '+new Date(data.loadedAt||Date.now()).toLocaleString('fa-IR');\n  $('message').textContent='کاتالوگ جاری با '+records.length+' رکورد بارگذاری شد. تغییرات بعدی تا زمان ارسال، فقط پیش‌نویس محلی هستند.';$('message').className='status';\n }catch(error){\n  $('source-status').textContent=records.length?'اطلاعات محلی/پیش‌نویس در حال نمایش است.':'بارگذاری کاتالوگ ناموفق بود.';\n  $('message').textContent='بارگذاری از GitHub انجام نشد: '+error.message+'\\nورود مدیر و پیکربندی API را بررسی کن.';$('message').className='status error';\n }finally{button.disabled=false;}\n}\n$('reload-catalogue').addEventListener('click',()=>loadCurrentCatalogue({force:true}));\n$('file').addEventListener('change',e=>{if(e.target.files[0])loadJsonFile(e.target.files[0],'registries');});\n$('categories-file').addEventListener('change',e=>{if(e.target.files[0])loadJsonFile(e.target.files[0],'categories');});\n$('countries-file').addEventListener('change',e=>{if(e.target.files[0])loadJsonFile(e.target.files[0],'countries');});$('provinces-file').addEventListener('change',e=>{if(e.target.files[0])loadJsonFile(e.target.files[0],'provinces');});\n$('search').addEventListener('input',render);$('new').onclick=()=>showEditor();$('cancel').onclick=()=>{$('editor').classList.add('hidden');$('slug').disabled=false;};\n$('form').addEventListener('submit',e=>{e.preventDefault();const city=$('city').value==='__new'?canonicalCity($('new-city').value):canonicalCity($('city').value),selected=[...document.querySelectorAll('input[name="category"]:checked')].map(x=>x.value),r={slug:$('slug').value.trim(),fa:$('fa').value.trim(),en:$('en').value.trim(),country:$('country').value.trim(),province:$('province').value.trim(),city,categories:selected,description:$('description').value,officialUrl:$('url').value.trim(),center:$('center').value.trim(),targetPopulation:$('targetPopulation').value,status:$('status').value.trim(),lastReviewedAt:$('lastReviewedAt').value,startYear:$('startYear').value.trim(),registryType:$('registryType').value.trim(),dataSummary:$('dataSummary').value,researchContact:$('researchContact').value,keyPublications:parsePublicationsText($('keyPublicationsText').value)};if(!/^[a-z0-9]+(?:-[a-z0-9]+)*$/.test(city)){alert('City ID must use lowercase English letters, numbers and hyphens, e.g. mashhad.');return;}if(!r.country){alert('Load countries.json and select a country.');return;}if(!r.province||(provincesData.length&&!provincesData.some(p=>p.id===r.province))){alert('Select a province from the trusted province list.');return;}if(r.categories.length!==1){alert('Select exactly one category.');return;}if(r.officialUrl){try{if(new URL(r.officialUrl).protocol!=='https:')throw Error();}catch{alert('Official URL must be a valid HTTPS URL, or left empty.');return;}}if(records.some((x,i)=>x.slug===r.slug&&i!==editIndex)){alert('Slug must be unique.');return;}if(editIndex<0)records.push(r);else records[editIndex]={...records[editIndex],...r};$('editor').classList.add('hidden');$('slug').disabled=false;markDirty();render();$('message').textContent='تغییرات در پیش‌نویس محلی ذخیره شد. برای دریافت فایل، خروجی JSON بگیر.';});\n$('list').addEventListener('click',e=>{const ed=e.target.closest('[data-edit]'),del=e.target.closest('[data-delete]');if(ed)showEditor(Number(ed.dataset.edit));if(del){const i=Number(del.dataset.delete);if(confirm('Delete '+(records[i]?.en||records[i]?.slug)+' from this local draft?')){records.splice(i,1);markDirty();render();}}});\n$('export').onclick=()=>{const errs=validate();if(errs.length&&!confirm('Validation found issues. Export anyway?\\n'+errs.slice(0,8).join('\\n')))return;const blob=new Blob([JSON.stringify(records,null,2)+'\\n'],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='registries.json';a.click();URL.revokeObjectURL(a.href);dirty=false;persistDraft();$('message').textContent='Exported registries.json.';};\n$('download-template').onclick=()=>{const sample=[{slug:'example-registry',fa:'نام نمونه',en:'Example Registry',country:'IR',province:'razavi-khorasan',city:'mashhad',categories:['gyn'],description:'',officialUrl:'',...emptyMetadata()}],blob=new Blob([JSON.stringify(sample,null,2)+'\\n'],{type:'application/json'}),a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='registries-template.json';a.click();URL.revokeObjectURL(a.href);};\n$('submit-proposal').onclick=async()=>{\n const errors=validate();\n if(errors.length){$('message').textContent='Fix validation issues before submitting:\\\\n'+errors.slice(0,10).join('\\\\n');$('message').className='status error';return;}\n if(!records.length){$('message').textContent='Load or add at least one registry first.';return;}\n if(location.protocol==='file:'){ $('message').textContent='Submission is unavailable in a local file preview. Sign in and serve the admin UI and API from the same HTTPS Worker origin first.'; $('message').className='status error';return; }\n if(!confirm('Submit this catalogue draft to GitHub as a Pull Request? It will not publish until a human reviews and merges it.'))return;\n const button=$('submit-proposal');button.disabled=true;$('message').textContent='Submitting proposal…';$('message').className='status';\n try{\n  const response=await fetch('/api/proposals',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({registries:records})});\n  const data=await response.json().catch(()=>({}));\n  if(!response.ok){const detail=Array.isArray(data.details)?'\\\\n'+data.details.join('\\\\n'):'';throw new Error((data.error||('Request failed ('+response.status+')'))+detail);}\n  dirty=false;persistDraft();\n  const pr=data.pullRequest||{};$('message').textContent='Pull Request created'+(pr.number?' #'+pr.number:'')+(pr.url?'\\\\n'+pr.url:'')+'\\\\nNo public deployment has occurred.';\n  $('message').className='status';\n }catch(error){$('message').textContent='Submission failed: '+error.message+'\\\\nConfirm GitHub sign-in is active and the admin Worker is configured.';$('message').className='status error';}\n finally{button.disabled=false;}\n};\ntry{const d=JSON.parse(localStorage.getItem(STORAGE_KEY)||'null');if(d&&Array.isArray(d.records)){records=d.records.map(normalizeRegistry);categoriesData=Array.isArray(d.categoriesData)?d.categoriesData:[];countriesData=Array.isArray(d.countriesData)?d.countriesData:[];provincesData=Array.isArray(d.provincesData)?d.provincesData:[];dirty=!!d.dirty;}}catch{}\nloadSelect('country',countriesData,'IR');loadSelect('province',provincesData,provincesData.find(x=>x.active)?.id||records[0]?.province||'');renderCategories();renderCities();render();\nasync function initializeAdminAuth(){\n if(location.protocol==='file:'){\n  $('auth-bar').classList.add('hidden');\n  $('admin-area').classList.remove('hidden');\n  return;\n }\n try{\n  const response=await fetch('/api/session',{credentials:'same-origin',cache:'no-store',headers:{accept:'application/json'}});\n  const session=response.ok?await response.json():{authenticated:false};\n  if(session.authenticated){\n   $('auth-status').textContent='ورود انجام شد: '+session.user.login;\n   $('login-link').classList.add('hidden');\n   $('logout-form').classList.remove('hidden');\n   $('admin-area').classList.remove('hidden');\n   if(dirty && records.length){\n    $('source-status').textContent='پیش‌نویس محلی بازیابی شد؛ برای دریافت نسخهٔ فعلی main از دکمهٔ بارگذاری دوباره استفاده کن.';\n    $('message').textContent='پیش‌نویس محلی حفظ شد و به‌صورت خودکار جایگزین نشد.';\n   }else{\n    await loadCurrentCatalogue();\n   }\n  }else{\n   $('auth-status').textContent='برای دسترسی به پنل، با حساب مجاز GitHub وارد شو.';\n   $('login-link').classList.remove('hidden');\n   $('logout-form').classList.add('hidden');\n   $('admin-area').classList.add('hidden');\n  }\n }catch{\n  $('auth-status').textContent='وضعیت ورود تأیید نشد؛ پنل قفل باقی می‌ماند.';\n  $('login-link').classList.remove('hidden');\n  $('admin-area').classList.add('hidden');\n }\n}\ninitializeAdminAuth();\n</script></body></html>";

const API_VERSION = "2022-11-28";
const DATA_PATH = "artifacts/iedr/public/data";
const MAX_BODY_BYTES = 2_000_000;

export async function readBodyLimited(request, limit) {
  const reader = request.body?.getReader();
  if (!reader) return "";
  const chunks = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    total += value.byteLength;
    if (total > limit) {
      await reader.cancel();
      const error = new Error("request too large");
      error.status = 413;
      throw error;
    }
    chunks.push(value);
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}

function json(data, status = 200, origin = "") {
  const headers = { "content-type": "application/json; charset=utf-8", "cache-control": "no-store", "x-content-type-options": "nosniff" };
  if (origin) {
    headers["access-control-allow-origin"] = origin;
    headers["vary"] = "Origin";
  }
  return new Response(JSON.stringify(data), { status, headers });
}

async function serveAdminAssets(request, env) {
  const url = new URL(request.url);
  let asset;
  if (env.ASSETS && typeof env.ASSETS.fetch === "function") {
    asset = await env.ASSETS.fetch(request);
  } else if (typeof ADMIN_HTML === "string" && (url.pathname === "/" || url.pathname === "/index.html")) {
    asset = new Response(ADMIN_HTML, {
      status: 200,
      headers: { "content-type": "text/html; charset=utf-8" },
    });
  } else {
    return json({ error: "not found" }, 404);
  }
  const headers = new Headers(asset.headers);
  headers.set("x-content-type-options", "nosniff");
  headers.set("x-frame-options", "DENY");
  headers.set("referrer-policy", "no-referrer");
  headers.set("permissions-policy", "camera=(), microphone=(), geolocation=()");
  headers.set("content-security-policy", "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'; object-src 'none'");
  return new Response(asset.body, { status: asset.status, statusText: asset.statusText, headers });
}

export function isAllowedGithubWrite(repo, path, method, bodyText) {
  const verb = String(method || "GET").toUpperCase();
  if (verb === "GET" || verb === "HEAD") return true;
  let body;
  try {
    body = JSON.parse(bodyText || "");
  } catch {
    return false;
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) return false;

  const branchPattern = /^admin\/registry-update-[0-9a-f]{8}$/;
  const objectShaPattern = /^[0-9a-f]{40}$/;

  if (verb === "POST" && path === "/repos/" + repo + "/git/refs") {
    return typeof body.ref === "string" &&
      /^refs\/heads\/admin\/registry-update-[0-9a-f]{8}$/.test(body.ref) &&
      typeof body.sha === "string" && objectShaPattern.test(body.sha);
  }

  if (verb === "PUT" && path === "/repos/" + repo + "/contents/" + DATA_PATH + "/registries.json") {
    return typeof body.branch === "string" && branchPattern.test(body.branch) &&
      typeof body.sha === "string" && objectShaPattern.test(body.sha) &&
      body.message === "Propose registry catalogue update via RegistryHub admin" &&
      typeof body.content === "string" && body.content.length > 0;
  }

  if (verb === "POST" && path === "/repos/" + repo + "/pulls") {
    return typeof body.head === "string" && branchPattern.test(body.head) &&
      body.base === "main" &&
      body.title === "Registry catalogue update" &&
      typeof body.body === "string" && body.body.includes("must be reviewed and merged manually");
  }

  return false;
}

async function githubRequest(env, path, options = {}) {
  const method = String(options.method || "GET").toUpperCase();
  const repo = String(env.GITHUB_REPOSITORY || "erfan8km/Health-Data-Hub");
  if (!isAllowedGithubWrite(repo, path, method, options.body || "")) {
    throw new Error("GitHub write blocked by RegistryHub path and branch allowlist");
  }
  const response = await fetch("https://api.github.com" + path, {
    ...options,
    headers: {
      accept: "application/vnd.github+json",
      authorization: "Bearer " + env.GITHUB_TOKEN,
      "x-github-api-version": API_VERSION,
      "user-agent": "RegistryHub-Admin-API",
      ...(options.headers || {}),
    },
  });
  if (!response.ok) {
    const error = new Error("GitHub API request failed with status " + response.status);
    error.status = response.status;
    throw error;
  }
  if (response.status === 204) return null;
  return response.json();
}

function decodeGithubFile(content) {
  const binary = atob(content.replace(/\s/g, ""));
  const bytes = Uint8Array.from(binary, (c) => c.charCodeAt(0));
  return new TextDecoder().decode(bytes);
}

function encodeGithubFile(content) {
  const bytes = new TextEncoder().encode(content);
  let binary = "";
  for (let i = 0; i < bytes.length; i += 0x8000) binary += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(binary);
}

async function readDataFile(env, repo, filename) {
  const file = await githubRequest(env, "/repos/" + repo + "/contents/" + DATA_PATH + "/" + filename + "?ref=main");
  return { sha: file.sha, data: JSON.parse(decodeGithubFile(file.content)) };
}

async function createProposal(env, registries, email) {
  const repo = String(env.GITHUB_REPOSITORY || "erfan8km/Health-Data-Hub");
  if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(repo)) throw new Error("invalid configured repository");
  const [current, categories, countries, provinces, mainRef] = await Promise.all([
    readDataFile(env, repo, "registries.json"),
    readDataFile(env, repo, "categories.json"),
    readDataFile(env, repo, "countries.json"),
    readDataFile(env, repo, "provinces.json"),
    githubRequest(env, "/repos/" + repo + "/git/ref/heads/main"),
  ]);
  const validation = validateRegistryPayload(registries, categories.data, countries.data, provinces.data);
  if (!validation.ok) return { validation };
  const branch = "admin/registry-update-" + crypto.randomUUID().slice(0, 8);
  await githubRequest(env, "/repos/" + repo + "/git/refs", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ref: "refs/heads/" + branch, sha: mainRef.object.sha }),
  });
  const serialized = JSON.stringify(registries, null, 2) + "\n";
  await githubRequest(env, "/repos/" + repo + "/contents/" + DATA_PATH + "/registries.json", {
    method: "PUT",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      message: "Propose registry catalogue update via RegistryHub admin",
      content: encodeGithubFile(serialized),
      sha: current.sha,
      branch,
    }),
  });
  const pr = await githubRequest(env, "/repos/" + repo + "/pulls", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      title: "Registry catalogue update",
      head: branch,
      base: "main",
      body: "Automated proposal submitted by the RegistryHub admin API.\n\n- Submitted by: " + email + "\n- Validated against current country, province, and category IDs.\n- This PR must be reviewed and merged manually; the API never merges or deploys.",
    }),
  });
  return { pullRequest: { number: pr.number, url: pr.html_url, branch } };
}

export async function handleRequest(request, env) {
  const authResponse = await handleAuthRequest(request, env);
  if (authResponse) return authResponse;
  const url = new URL(request.url);
  if (url.pathname === "/health") {
    if (request.method === "GET") return json({ ok: true, service: "registryhub-admin-api" });
    return json({ error: "method not allowed" }, 405);
  }
  if (!url.pathname.startsWith("/api/")) {
    if ((env.ASSETS && typeof env.ASSETS.fetch === "function") || typeof ADMIN_HTML === "string") return serveAdminAssets(request, env);
    return json({ error: "not found" }, 404);
  }
  if (url.pathname === "/api/catalogue") {
    if (request.method !== "GET") return json({ error: "method not allowed" }, 405);
    const session = await readAdminSession(request, env);
    if (!session) return json({ error: "authentication required" }, 401);
    const configuredRepo = String(env.GITHUB_REPOSITORY || "erfan8km/Health-Data-Hub");
    if (!/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(configuredRepo) ||
        typeof env.GITHUB_TOKEN !== "string" || !env.GITHUB_TOKEN ||
        /^replace[_ -]?/i.test(env.GITHUB_TOKEN) || !env.ADMIN_ORIGIN) {
      return json({ error: "admin API is not configured" }, 503);
    }
    const origin = request.headers.get("origin") || "";
    const expectedOrigin = String(env.ADMIN_ORIGIN || "").replace(/\/$/, "");
    if (origin && origin !== expectedOrigin) return json({ error: "origin not allowed" }, 403);
    const limited = await checkRateLimit(env, "PROPOSAL_RATE_LIMITER", "catalogue:" + session.id);
    if (limited) return limited;
    try {
      const [registries, categories, countries, provinces] = await Promise.all([
        readDataFile(env, configuredRepo, "registries.json"),
        readDataFile(env, configuredRepo, "categories.json"),
        readDataFile(env, configuredRepo, "countries.json"),
        readDataFile(env, configuredRepo, "provinces.json"),
      ]);
      return json({
        ok: true,
        source: "main",
        loadedAt: new Date().toISOString(),
        registries: registries.data,
        categories: categories.data,
        countries: countries.data,
        provinces: provinces.data,
      });
    } catch {
      return json({ error: "could not load current catalogue; check admin API configuration and GitHub read permissions" }, 502);
    }
  }

  if (url.pathname !== "/api/proposals") return json({ error: "not found" }, 404);

  const expectedOrigin = String(env.ADMIN_ORIGIN || "").replace(/\/$/, "");
  const origin = request.headers.get("origin") || "";
  if (!expectedOrigin || origin !== expectedOrigin) return json({ error: "origin not allowed" }, 403);
  if (request.method === "OPTIONS") {
    return new Response(null, { status: 204, headers: {
      "access-control-allow-origin": expectedOrigin,
      "access-control-allow-methods": "POST, OPTIONS",
      "access-control-allow-headers": "content-type",
      "access-control-max-age": "600",
      vary: "Origin",
    } });
  }
  if (request.method !== "POST") return json({ error: "method not allowed" }, 405, expectedOrigin);
  if (!request.headers.get("content-type")?.toLowerCase().includes("application/json")) return json({ error: "application/json required" }, 415, expectedOrigin);
  const length = Number(request.headers.get("content-length") || 0);
  if (length > MAX_BODY_BYTES) return json({ error: "request too large" }, 413, expectedOrigin);

  const session = await readAdminSession(request, env);
  if (!session) return json({ error: "authentication required" }, 401, expectedOrigin);
  if (typeof env.GITHUB_TOKEN !== "string" || !env.GITHUB_TOKEN ||
      /^replace[_ -]?/i.test(env.GITHUB_TOKEN) ||
      !env.GITHUB_REPOSITORY || !env.ADMIN_ORIGIN) {
    return json({ error: "admin API is not configured" }, 503, expectedOrigin);
  }
  const limited = await checkRateLimit(env, "PROPOSAL_RATE_LIMITER", "admin:" + session.id);
  if (limited) return limited;
  let payload;
  try {
    payload = JSON.parse(await readBodyLimited(request, MAX_BODY_BYTES));
  } catch (error) {
    if (error?.status === 413) return json({ error: "request too large" }, 413, expectedOrigin);
    return json({ error: "invalid JSON body" }, 400, expectedOrigin);
  }
  if (!payload || !Array.isArray(payload.registries)) return json({ error: "body must contain a registries array" }, 400, expectedOrigin);
  try {
    const result = await createProposal(env, payload.registries, session.login);
    if (result.validation) return json({ error: "validation failed", details: result.validation.errors }, 422, expectedOrigin);
    return json({ ok: true, ...result }, 201, expectedOrigin);
  } catch {
    return json({ error: "could not create proposal; check server configuration and GitHub permissions" }, 502, expectedOrigin);
  }
}

export default { fetch: handleRequest };
