import { useEffect } from "react";

export function usePageMeta(title: string, description: string) {
  useEffect(() => {
    document.title = title;
    const update = (selector: string, content: string) => {
      const element = document.querySelector<HTMLMetaElement>(selector);
      if (element) element.content = content;
    };
    update('meta[name="description"]', description);
    update('meta[property="og:title"]', title);
    update('meta[property="og:description"]', description);
    update('meta[name="twitter:title"]', title);
    update('meta[name="twitter:description"]', description);
    let canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]');
    if (!canonical) {
      canonical = document.createElement("link");
      canonical.rel = "canonical";
      document.head.append(canonical);
    }
    canonical.href = `${window.location.origin}${window.location.pathname}`;
  }, [title, description]);
}
