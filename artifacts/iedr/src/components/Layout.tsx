import React from 'react';
import { Link, useRoute } from 'wouter';
import { useLanguage } from '@/lib/language';
import { Button } from '@/components/ui/button';
import { Globe, Menu } from 'lucide-react';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export default function Layout({ children }: { children: React.ReactNode }) {
  const { language, setLanguage, t, isRtl } = useLanguage();

  const navLinks = [
    { href: '/', labelEn: 'Home', labelFa: 'خانه' },
    { href: '/datasets', labelEn: 'Datasets', labelFa: 'داده‌ها' },
    { href: '/variables', labelEn: 'Variables', labelFa: 'متغیرها' },
    { href: '/about', labelEn: 'About', labelFa: 'درباره ما' },
    { href: '/admin', labelEn: 'Admin', labelFa: 'مدیریت' },
  ];

  return (
    <div className={`min-h-screen flex flex-col bg-background text-foreground font-sans ${isRtl ? 'rtl' : 'ltr'}`}>
      <header className="sticky top-0 z-50 w-full border-b bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
        <div className="container mx-auto flex h-16 items-center justify-between px-4">
          <div className="flex items-center gap-6">
            <Link href="/" className="flex items-center gap-2">
              <span className="font-bold text-xl tracking-tight text-primary">IEDR</span>
            </Link>
            <nav className="hidden md:flex gap-6">
              {navLinks.map((link) => (
                <NavLink key={link.href} href={link.href}>
                  {t(link.labelEn, link.labelFa)}
                </NavLink>
              ))}
            </nav>
          </div>
          
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => setLanguage(language === 'en' ? 'fa' : 'en')}
              className="font-medium"
              title={t('Switch Language', 'تغییر زبان')}
            >
              <Globe className="h-5 w-5 mr-2" />
              {language === 'en' ? 'فا' : 'EN'}
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild className="md:hidden">
                <Button variant="ghost" size="icon">
                  <Menu className="h-5 w-5" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                {navLinks.map((link) => (
                  <DropdownMenuItem key={link.href} asChild>
                    <Link href={link.href} className="w-full cursor-pointer">
                      {t(link.labelEn, link.labelFa)}
                    </Link>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>
      </header>
      
      <main className="flex-1">
        {children}
      </main>
      
      <footer className="border-t py-8 bg-muted/50">
        <div className="container mx-auto px-4 flex flex-col md:flex-row justify-between items-center gap-4 text-sm text-muted-foreground">
          <div>
            <p>&copy; {new Date().getFullYear()} {t('Iran Epidemiology Data Repository', 'مخزن داده‌های اپیدمیولوژی ایران')}. {t('All rights reserved.', 'تمامی حقوق محفوظ است.')}</p>
          </div>
          <div className="flex gap-4">
            <Link href="/about" className="hover:text-foreground transition-colors">{t('About', 'درباره ما')}</Link>
            <Link href="/datasets" className="hover:text-foreground transition-colors">{t('Datasets', 'داده‌ها')}</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}

function NavLink({ href, children }: { href: string; children: React.ReactNode }) {
  const [isActive] = useRoute(href);
  return (
    <Link 
      href={href} 
      className={`text-sm font-medium transition-colors hover:text-primary ${isActive ? 'text-primary' : 'text-muted-foreground'}`}
    >
      {children}
    </Link>
  );
}
