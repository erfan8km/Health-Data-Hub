import React from 'react';
import { useLanguage } from '@/lib/language';
import { Card, CardContent } from '@/components/ui/card';
import { Mail, MapPin, Globe } from 'lucide-react';

const team = [
  {
    name: 'Dr. Arash Tehrani',
    nameFa: 'دکتر آرش تهرانی',
    role: 'Principal Investigator',
    roleFa: 'محقق اصلی',
    affiliation: 'Tehran University of Medical Sciences',
    affiliationFa: 'دانشگاه علوم پزشکی تهران',
    bio: 'Epidemiologist with 20 years of experience in chronic disease surveillance and health registry design.',
    bioFa: 'اپیدمیولوژیست با ۲۰ سال تجربه در نظارت بر بیماری‌های مزمن و طراحی ثبت بهداشتی.',
  },
  {
    name: 'Dr. Sara Mohammadi',
    nameFa: 'دکتر سارا محمدی',
    role: 'Data Architect',
    roleFa: 'معمار داده',
    affiliation: 'Iran University of Medical Sciences',
    affiliationFa: 'دانشگاه علوم پزشکی ایران',
    bio: 'Specializes in biomedical informatics and the design of interoperable health data standards.',
    bioFa: 'متخصص انفورماتیک زیست‌پزشکی و طراحی استانداردهای داده‌های بهداشتی قابل همکاری.',
  },
  {
    name: 'Reza Karimi',
    nameFa: 'رضا کریمی',
    role: 'Software Engineer',
    roleFa: 'مهندس نرم‌افزار',
    affiliation: 'IEDR Technical Team',
    affiliationFa: 'تیم فنی IEDR',
    bio: 'Leads platform development and data pipeline infrastructure for the repository.',
    bioFa: 'توسعه پلتفرم و زیرساخت خط لوله داده برای مخزن را رهبری می‌کند.',
  },
];

export default function About() {
  const { t } = useLanguage();

  return (
    <div className="container mx-auto px-4 py-12 max-w-4xl">
      {/* Mission */}
      <section className="mb-14">
        <h1 className="text-3xl font-bold mb-6">{t('About IEDR', 'درباره IEDR')}</h1>
        <div className="prose prose-gray max-w-none dark:prose-invert">
          <p className="text-muted-foreground leading-relaxed text-base mb-4">
            {t(
              'The Iran Epidemiology Data Repository (IEDR) is a centralized, open-access platform for epidemiological and health registry datasets collected from across Iran. Our mission is to make high-quality, well-documented health data freely available to researchers, policymakers, and the public.',
              'مخزن داده‌های اپیدمیولوژی ایران (IEDR) یک پلتفرم متمرکز و دسترسی آزاد برای مجموعه داده‌های اپیدمیولوژیکی و ثبت بهداشتی جمع‌آوری‌شده از سراسر ایران است. ماموریت ما در دسترس قرار دادن داده‌های بهداشتی با کیفیت و مستند به صورت رایگان برای محققان، سیاست‌گذاران و عموم مردم است.'
            )}
          </p>
          <p className="text-muted-foreground leading-relaxed text-base mb-4">
            {t(
              'Each dataset in IEDR has been reviewed for quality, completeness, and ethical compliance. We provide standardized metadata, variable dictionaries, and citation information to ensure reproducibility and proper attribution.',
              'هر مجموعه داده در IEDR از نظر کیفیت، کامل‌بودن و رعایت اخلاق بررسی شده است. ما متادیتای استاندارد، فرهنگ متغیرها و اطلاعات استناد را برای اطمینان از قابلیت تکرار و انتساب صحیح فراهم می‌کنیم.'
            )}
          </p>
          <p className="text-muted-foreground leading-relaxed text-base">
            {t(
              'IEDR is maintained by a multidisciplinary team of epidemiologists, biostatisticians, and software engineers committed to advancing public health research infrastructure in Iran.',
              'IEDR توسط یک تیم چندرشته‌ای از اپیدمیولوژیست‌ها، آماردانان زیستی و مهندسان نرم‌افزار متعهد به پیشرفت زیرساخت تحقیقات بهداشت عمومی در ایران نگهداری می‌شود.'
            )}
          </p>
        </div>
      </section>

      {/* Team */}
      <section className="mb-14">
        <h2 className="text-2xl font-bold mb-6">{t('Our Team', 'تیم ما')}</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {team.map((member) => (
            <Card key={member.name} className="hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center mb-4">
                  <span className="text-xl font-bold text-primary">{member.name.charAt(0)}</span>
                </div>
                <h3 className="font-semibold">{t(member.name, member.nameFa)}</h3>
                <p className="text-sm text-primary font-medium mt-0.5">{t(member.role, member.roleFa)}</p>
                <p className="text-xs text-muted-foreground mt-1 mb-3">{t(member.affiliation, member.affiliationFa)}</p>
                <p className="text-sm text-muted-foreground leading-relaxed">{t(member.bio, member.bioFa)}</p>
              </CardContent>
            </Card>
          ))}
        </div>
      </section>

      {/* Contact */}
      <section>
        <h2 className="text-2xl font-bold mb-6">{t('Contact', 'تماس')}</h2>
        <Card>
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="flex items-start gap-3">
                <Mail className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-sm">{t('Email', 'ایمیل')}</p>
                  <a href="mailto:contact@iedr.ir" className="text-sm text-muted-foreground hover:text-primary transition-colors">contact@iedr.ir</a>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <MapPin className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-sm">{t('Address', 'آدرس')}</p>
                  <p className="text-sm text-muted-foreground">{t('Tehran, Iran', 'تهران، ایران')}</p>
                </div>
              </div>
              <div className="flex items-start gap-3">
                <Globe className="h-5 w-5 text-primary mt-0.5 shrink-0" />
                <div>
                  <p className="font-medium text-sm">{t('Website', 'وبسایت')}</p>
                  <p className="text-sm text-muted-foreground">www.iedr.ir</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
