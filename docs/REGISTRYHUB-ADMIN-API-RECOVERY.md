# بازیابی مستقل Worker مدیریتی RegistryHub

این راهنما مخصوص Worker با نام **registryhub-admin-api** است و از سایت عمومی **registryhub** جداست.

## فایل‌های نسخه‌بندی‌شده

کد قابل‌بازیابی در پوشه **workers/registryhub-admin-api/src/** قرار دارد:

- **index.mjs**: نقطهٔ ورود Worker و رابط پنل مدیریت
- **auth.mjs**: ورود GitHub، نشست مدیر و محدودسازی درخواست‌ها
- **oauth-state-store.mjs**: Durable Object برای وضعیت موقت OAuth
- **validate.mjs**: اعتبارسنجی داده‌های پیشنهادی رجیستری

این نسخهٔ کد از Worker مستقر در Cloudflare استخراج شده است. مقادیر Secret عمداً در Git قرار نگرفته‌اند.

## قبل از بازیابی: منابع را حذف نکن

در Cloudflare Dashboard، Worker و bindingهای آن را بررسی کن. **Worker یا Durable Object با نام OAuthStateStore را برای رفع خطا حذف نکن.** در حال حاضر binding با نام OAUTH_STATE_STORE به namespace موجود متصل است؛ حذف و ساخت دوباره می‌تواند فضای ذخیره‌سازی آن را از بین ببرد. این فضا وضعیت موقت ورود OAuth را نگه می‌دارد؛ بازسازی آن ورودهای OAuth نیمه‌تمام را بی‌اعتبار می‌کند.

## متغیرهای عادی و bindingهای لازم

فایل **workers/registryhub-admin-api/wrangler.jsonc** وضعیت فعلی را ثبت می‌کند. این موارد Secret نیستند، ولی در حساب Cloudflare دیگری باید بازبینی شوند:

- **ADMIN_GITHUB_USER_ID**: شناسهٔ عددی حساب GitHub مجاز برای مدیریت
- **ADMIN_ORIGIN**: نشانی اصلی Worker مدیریتی
- **GITHUB_OAUTH_CLIENT_ID**: شناسهٔ OAuth App
- **GITHUB_REPOSITORY**: مخزن **erfan8km/Health-Data-Hub**
- **OAUTH_STATE_STORE**: binding به کلاس **OAuthStateStore**؛ migration tag فعلی **v1**
- **AUTH_RATE_LIMITER**: سقف ۲۰ درخواست در ۶۰ ثانیه
- **PROPOSAL_RATE_LIMITER**: سقف ۵ درخواست در ۶۰ ثانیه

شناسه‌های namespace در پیکربندی مربوط به حساب فعلی هستند. اگر Worker را در حساب دیگری بازیابی می‌کنی، این شناسه‌ها باید با منابع تازهٔ همان حساب جایگزین شوند.

## Secrets موردنیاز

این سه مورد را فقط در Cloudflare Worker Secrets تنظیم کن، نه در GitHub، فایل پیکربندی یا کد:

- **GITHUB_OAUTH_CLIENT_SECRET**: Secret مربوط به GitHub OAuth App
- **GITHUB_TOKEN**: توکن fine-grained برای مخزن **erfan8km/Health-Data-Hub**
- **SESSION_SIGNING_SECRET**: کلید تصادفی امضای نشست

برای GITHUB_TOKEN فقط همان مخزن را انتخاب کن و دسترسی‌های حداقلی لازم را بده: **Contents: Read and write**، **Pull requests: Read and write** و **Metadata: Read-only**. ثبت نام Secret در تنظیمات Cloudflare ثابت نمی‌کند مقدار داخل آن هنوز معتبر است؛ آن را با آزمون واقعی پنل بررسی کن.

برای تولید کلید نشست تصادفی، در ترمینال Node.js اجرا کن:

~~~sh
node -e "console.log(require('node:crypto').randomBytes(48).toString('base64url'))"
~~~

خروجی را در جای امن نگه دار. مقدار Secret را فقط در prompt تعاملی وارد کن و آن را داخل command line، فایل یا چت قرار نده.

## بازیابی در همان حساب Cloudflare

۱. ابتدا از سالم بودن Worker موجود و bindingهای آن مطمئن شو. Worker را حذف نکن.

۲. مخزن را کلون کن و وارد پوشهٔ Worker شو:

~~~sh
git clone https://github.com/erfan8km/Health-Data-Hub.git
cd Health-Data-Hub/workers/registryhub-admin-api
npx --yes wrangler@4 login
npx --yes wrangler@4 whoami
~~~

۳. اگر هر یک از Secretها وجود ندارد یا منقضی شده، آن را به‌صورت تعاملی تعریف کن:

~~~sh
npx --yes wrangler@4 secret put GITHUB_OAUTH_CLIENT_SECRET
npx --yes wrangler@4 secret put GITHUB_TOKEN
npx --yes wrangler@4 secret put SESSION_SIGNING_SECRET
~~~

برای هر فرمان، مقدار Secret را در prompt وارد کن. اگر Worker کاملاً حذف شده باشد، بازیابی آن به ساخت دوبارهٔ Worker و منابع نیاز دارد؛ اجرای همین سه دستور به‌تنهایی کافی نیست.

۴. قبل از انتشار، فایل wrangler.jsonc را با Settings فعلی Worker مقایسه کن. این فایل شامل migration tag **v1** و شناسه‌های namespace حساب فعلی است؛ آن را روی حساب یا Worker دیگری بدون بررسی اجرا نکن.

۵. پس از تأیید bindingها و Secrets، از همین پوشه اجرا کن:

~~~sh
npx --yes wrangler@4 deploy
~~~

## تنظیم GitHub OAuth App

Callback URL برنامهٔ OAuth باید دقیقاً این باشد:

**https://registryhub-admin-api.erfan8km.workers.dev/auth/callback**

پس از تغییر دامنهٔ Worker، مقدار ADMIN_ORIGIN و callback در GitHub OAuth App را هم‌زمان به‌روزرسانی کن. هر دو باید با هم سازگار باشند.

## بازیابی در حساب Cloudflare تازه

۱. Worker را با نام **registryhub-admin-api** ایجاد و سورس همین پوشه را مستقر کن.

۲. یک Durable Object کلاس **OAuthStateStore** بساز و binding با نام **OAUTH_STATE_STORE** را ثبت کن. migration **v1** برای ایجاد کلاس جدید در نظر گرفته شده است؛ اگر namespace قبلی هنوز وجود دارد، آن را دوباره ایجاد یا حذف نکن.

۳. دو Rate Limiter جدید با همان حدود ۲۰/۶۰ و ۵/۶۰ بساز و شناسه‌های جدید را در **ratelimits** جایگزین کن.

۴. متغیرهای غیرمحرمانه را با حساب و دامنهٔ جدید تنظیم و سه Secret بالا را جداگانه وارد کن.

۵. Callback URL GitHub OAuth App را مطابق دامنهٔ تازه تنظیم کن و Worker را منتشر کن.

در حساب تازه، توکن‌ها، namespaceها و URLهای حساب قبلی را فرض نکن. storage مربوط به OAuth state قابل انتقال نیست؛ در صورت بازسازی namespace، هر ورود OAuth نیمه‌تمام باید از ابتدا آغاز شود.

## آزمون پس از بازیابی

- صفحهٔ **https://registryhub-admin-api.erfan8km.workers.dev/** باز شود.
- ورود با GitHub به همان حساب مجاز انجام شود و پس از callback به پنل برگردد.
- فهرست رجیستری‌ها، دسته‌بندی‌ها و کشورها از مخزن بارگذاری شود.
- پیام پنل همچنان بگوید انتشار مستقیم غیرفعال است. ارسال داده باید فقط Pull Request بسازد و نباید خودش آن را merge کند.
- در صورت خطا، Cloudflare Worker Logs را بررسی کن.

## Backup دوره‌ای

پس از هر تغییر در کد یا bindingها، سورس را در GitHub نگه دار و فهرست نام Secretها، متغیرها، bindingها، callback URL و تاریخ انقضای توکن را در یک محل امن ثبت کن؛ **مقدار Secretها را در سند بازیابی ذخیره نکن.**
