const MAINTENANCE_HTML = `<!doctype html>
<html lang="fa" dir="rtl">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <meta name="robots" content="noindex,nofollow">
  <meta name="theme-color" content="#10233f">
  <title>RegistryHub | به‌روزرسانی</title>
  <style>
    *{box-sizing:border-box}
    body{margin:0;min-height:100vh;display:grid;place-items:center;padding:24px;background:radial-gradient(ellipse at 50% 0,#203f69 0,#10233f 55%,#0b1729 100%);font-family:Tahoma,"Segoe UI",sans-serif;color:#f7f9fc}
    main{width:min(100%,620px);text-align:center;padding:48px 30px;border:1px solid #ffffff24;border-radius:24px;background:#ffffff0b;box-shadow:0 24px 80px #0004}
    .mark{width:64px;height:64px;margin:0 auto 24px;display:grid;place-items:center;border-radius:19px;background:#e3edfc;color:#17365f;font-size:30px;font-weight:900}
    h1{margin:0 0 18px;font-size:clamp(25px,5vw,34px);line-height:1.6}
    p{margin:0;color:#d2deef;font-size:16px;line-height:2.1}
    .line{width:54px;height:3px;margin:28px auto 0;border-radius:9px;background:#8db7f2}
    footer{margin-top:30px;color:#9eb1cc;font-size:12px;letter-spacing:.3px}
  </style>
</head>
<body>
  <main>
    <div class="mark" aria-hidden="true">R</div>
    <h1>RegistryHub</h1>
    <p>سایت در حال به‌روزرسانی و بهبود است. به‌زودی بازمی‌گردیم.</p>
    <div class="line" aria-hidden="true"></div>
    <footer>Iran Epidemiology Data Repository</footer>
  </main>
</body>
</html>`;

export default {
  async fetch(request, env) {
    if (env.MAINTENANCE_MODE === "true") {
      return new Response(MAINTENANCE_HTML, {
        status: 503,
        headers: {
          "content-type": "text/html; charset=utf-8",
          "cache-control": "no-store, no-cache, must-revalidate",
          "retry-after": "3600",
          "x-robots-tag": "noindex, nofollow",
          "x-content-type-options": "nosniff",
          "referrer-policy": "no-referrer"
        }
      });
    }

    return env.ASSETS.fetch(request);
  }
};
