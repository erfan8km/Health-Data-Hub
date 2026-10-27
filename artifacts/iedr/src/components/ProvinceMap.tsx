import { IRAN_MAP_VIEWBOX, IRAN_PROVINCE_SHAPES, type IranProvinceShape } from "../data/iran-province-shapes";

type Province = { id: string; fa: string; en: string; active: boolean };

function normalized(value: unknown): string {
  return String(value ?? "")
    .normalize("NFKC")
    .toLocaleLowerCase()
    .replace(/استان/g, "")
    .replace(/province/g, "")
    .replace(/[يى]/g, "ی")
    .replace(/ك/g, "ک")
    .replace(/[\s\u200c_-]+/g, "")
    .replace(/[.,()]/g, "")
    .trim();
}

const NAME_ALIASES: Record<string, string[]> = {
  chaharmahalandbakhtiyari: ["chaharmahalandbakhtiari"],
  chaharmahalandbakhtiari: ["chaharmahalandbakhtiyari"],
  kohgiluyeandbuyerahmad: ["kohgiluyehandboyerahmad", "kohgiluyeandboyerahmad"],
  kohgiluyehandboyerahmad: ["kohgiluyeandbuyerahmad", "kohgiluyeandboyerahmad"],
  kohgiluyeandboyerahmad: ["kohgiluyehandboyerahmad", "kohgiluyeandbuyerahmad"],
  guilan: ["gilan"],
  gilan: ["guilan"],
};

function matchProvince(shape: IranProvinceShape, provinces: Province[]): Province | undefined {
  const names = new Set([normalized(shape.fa), normalized(shape.en)]);
  for (const name of [...names]) {
    for (const alias of NAME_ALIASES[name] ?? []) names.add(alias);
  }
  return provinces.find((province) =>
    [normalized(province.fa), normalized(province.en)].some((name) => names.has(name))
  );
}

export default function ProvinceMap({ provinces, english, onSelectProvince }: {
  provinces: Province[];
  english: boolean;
  onSelectProvince: (provinceId: string) => void;
}) {
  return (
    <div className="province-map-content">
      <div className="province-map-frame" aria-label={english ? "Map of Iran provinces" : "نقشه استان‌های ایران"}>
        <svg
          className="province-map-svg"
          viewBox={"0 0 " + IRAN_MAP_VIEWBOX.width + " " + IRAN_MAP_VIEWBOX.height}
          role="group"
          aria-label={english ? "Select an active province" : "استان فعال را انتخاب کنید"}
        >
          <defs>
            <linearGradient id="provinceMapFill" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#17394a" />
              <stop offset="100%" stopColor="#0c202f" />
            </linearGradient>
            <filter id="provinceGlow" x="-80%" y="-80%" width="260%" height="260%">
              <feGaussianBlur stdDeviation="5" result="blur" />
              <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
            </filter>
          </defs>
          {IRAN_PROVINCE_SHAPES.map((shape) => {
            const province = matchProvince(shape, provinces);
            const active = Boolean(province?.active);
            const title = province ? (english ? province.en : province.fa) : (english ? shape.en : shape.fa);
            return (
              <path
                key={shape.id}
                d={shape.d}
                className={active ? "province-map-shape province-map-shape-active" : "province-map-shape"}
                fill={active ? "#51d9c3" : "url(#provinceMapFill)"}
                fillOpacity={active ? 0.95 : 0.76}
                stroke={active ? "#9dfff0" : "#557282"}
                strokeWidth={active ? 2.4 : 1.15}
                fillRule="evenodd"
                role={active ? "button" : undefined}
                tabIndex={active ? 0 : -1}
                aria-label={active
                  ? (english ? "Select " + title : "انتخاب " + title)
                  : (english ? title + ", not active yet" : title + "، هنوز فعال نیست")}
                aria-disabled={!active}
                onClick={active && province ? () => onSelectProvince(province.id) : undefined}
                onKeyDown={active && province ? (event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault();
                    onSelectProvince(province.id);
                  }
                } : undefined}
                style={{ cursor: active ? "pointer" : "not-allowed" }}
                filter={active ? "url(#provinceGlow)" : undefined}
              >
                <title>{title + " — " + (active
                  ? (english ? "active, select to continue" : "فعال، برای ادامه انتخاب کنید")
                  : (english ? "not active yet" : "هنوز فعال نشده"))}</title>
              </path>
            );
          })}
        </svg>
      </div>
      <div className="province-map-key">
        <span><i className="province-key-active" />{english ? "Active and selectable" : "فعال و قابل انتخاب"}</span>
        <span><i className="province-key-inactive" />{english ? "Not active yet" : "هنوز فعال نشده"}</span>
      </div>
      <div className="province-choice-grid">
        {provinces.map((province) => (
          <button
            key={province.id}
            type="button"
            className={"province-choice" + (province.active ? " province-choice-active" : "")}
            disabled={!province.active}
            onClick={() => onSelectProvince(province.id)}
            aria-label={province.active
              ? (english ? "Choose " + province.en : "انتخاب " + province.fa)
              : (english ? province.en + " is not active yet" : "استان " + province.fa + " هنوز فعال نشده")}
          >
            <span className="province-choice-dot" />
            <span>{english ? province.en : province.fa}</span>
            {province.active ? <strong>{english ? "OPEN" : "فعال"}</strong> : <small>{english ? "Soon" : "به‌زودی"}</small>}
          </button>
        ))}
      </div>
      <p className="province-map-attribution">
        {english ? "Boundary data" : "دادهٔ مرز استان‌ها"}:{" "}
        <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">© OpenStreetMap contributors</a>
        {" · "}
        <a href="https://opendatacommons.org/licenses/odbl/1-0/" target="_blank" rel="noreferrer">ODbL 1.0</a>
      </p>
    </div>
  );
}
