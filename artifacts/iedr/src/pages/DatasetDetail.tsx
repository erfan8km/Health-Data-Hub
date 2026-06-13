import React, { useState } from 'react';
import { Link, useRoute } from 'wouter';
import { useGetDataset } from '@workspace/api-client-react';
import { useLanguage } from '@/lib/language';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import { ArrowLeft, Download, Copy, Check, ExternalLink, Database } from 'lucide-react';

export default function DatasetDetail() {
  const [, params] = useRoute('/datasets/:id');
  const id = Number(params?.id);
  const { t } = useLanguage();
  const [citationCopied, setCitationCopied] = useState(false);

  const { data: dataset, isLoading, isError } = useGetDataset(id, {
    query: { enabled: !!id && !isNaN(id) },
  });

  const handleCopyCitation = () => {
    if (dataset?.citationText) {
      navigator.clipboard.writeText(dataset.citationText);
      setCitationCopied(true);
      setTimeout(() => setCitationCopied(false), 2000);
    }
  };

  if (isLoading) {
    return (
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        <Skeleton className="h-6 w-32 mb-6" />
        <Skeleton className="h-8 w-2/3 mb-2" />
        <Skeleton className="h-5 w-1/2 mb-8" />
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20" />)}
        </div>
        <Skeleton className="h-48 w-full" />
      </div>
    );
  }

  if (isError || !dataset) {
    return (
      <div className="container mx-auto px-4 py-20 text-center">
        <Database className="h-16 w-16 mx-auto mb-4 text-muted-foreground opacity-40" />
        <h2 className="text-2xl font-bold mb-2">{t('Dataset Not Found', 'مجموعه داده یافت نشد')}</h2>
        <p className="text-muted-foreground mb-6">{t('The requested dataset does not exist.', 'مجموعه داده درخواستی وجود ندارد.')}</p>
        <Link href="/datasets"><Button variant="outline">{t('Back to Datasets', 'بازگشت به فهرست')}</Button></Link>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8 max-w-5xl">
      <Link href="/datasets" className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors">
        <ArrowLeft className="h-4 w-4" />
        {t('Back to Datasets', 'بازگشت به فهرست')}
      </Link>

      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 mb-6">
        <div className="flex-1">
          {dataset.categoryName && (
            <Badge variant="secondary" className="mb-3">{t(dataset.categoryName, dataset.categoryNameFa ?? dataset.categoryName)}</Badge>
          )}
          <h1 className="text-3xl font-bold leading-tight mb-2">{t(dataset.title, dataset.titleFa)}</h1>
          <p className="text-muted-foreground">{t(`Source: ${dataset.dataSource}`, `منبع: ${dataset.dataSourceFa || dataset.dataSource}`)}</p>
        </div>
        <Button className="shrink-0 gap-2" disabled>
          <Download className="h-4 w-4" />
          {t('Request Download', 'درخواست دانلود')}
        </Button>
      </div>

      {/* Key metrics */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
        {[
          { label: t('Records', 'تعداد رکورد'), value: dataset.recordsCount.toLocaleString() },
          { label: t('Variables', 'تعداد متغیر'), value: dataset.variablesCount },
          { label: t('Years Covered', 'سال‌های پوشش'), value: `${dataset.yearStart}–${dataset.yearEnd}` },
          { label: t('Geographic Coverage', 'پوشش جغرافیایی'), value: t(dataset.geographicCoverage, dataset.geographicCoverageFa) },
        ].map((item) => (
          <div key={item.label} className="bg-muted/50 rounded-lg p-4 border">
            <dt className="text-xs text-muted-foreground uppercase tracking-wider mb-1">{item.label}</dt>
            <dd className="text-lg font-semibold">{item.value}</dd>
          </div>
        ))}
      </div>

      <Separator className="my-6" />

      {/* Description */}
      <section className="mb-8">
        <h2 className="text-xl font-semibold mb-3">{t('Description', 'توضیحات')}</h2>
        <p className="text-muted-foreground leading-relaxed">{t(dataset.description, dataset.descriptionFa)}</p>
      </section>

      <Separator className="my-6" />

      {/* Variable Dictionary */}
      {dataset.variables && dataset.variables.length > 0 && (
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">{t('Variable Dictionary', 'فرهنگ متغیرها')}</h2>
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted/50 text-muted-foreground text-xs uppercase tracking-wider">
                  <th className="text-start px-4 py-3 font-semibold">{t('Name', 'نام')}</th>
                  <th className="text-start px-4 py-3 font-semibold">{t('Type', 'نوع')}</th>
                  <th className="text-start px-4 py-3 font-semibold">{t('Description', 'توضیح')}</th>
                  <th className="text-start px-4 py-3 font-semibold">{t('Values / Range', 'مقادیر / دامنه')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {dataset.variables.map((v) => (
                  <tr key={v.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs font-medium">{t(v.name, v.nameFa)}</td>
                    <td className="px-4 py-3"><Badge variant="outline" className="text-xs">{v.type}</Badge></td>
                    <td className="px-4 py-3 text-muted-foreground">{t(v.description, v.descriptionFa)}</td>
                    <td className="px-4 py-3 text-muted-foreground text-xs">{t(v.valuesRange ?? '—', v.valuesRangeFa ?? v.valuesRange ?? '—')}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      )}

      <Separator className="my-6" />

      {/* Citation */}
      {dataset.citationText && (
        <section className="mb-8">
          <h2 className="text-xl font-semibold mb-4">{t('Citation', 'استناد')}</h2>
          <div className="bg-muted/50 rounded-lg border p-4 relative">
            <p className="text-sm text-muted-foreground leading-relaxed pr-10">{dataset.citationText}</p>
            <Button
              variant="ghost"
              size="icon"
              className="absolute top-3 right-3 h-7 w-7"
              onClick={handleCopyCitation}
              title={t('Copy citation', 'کپی استناد')}
            >
              {citationCopied ? <Check className="h-3.5 w-3.5 text-green-500" /> : <Copy className="h-3.5 w-3.5" />}
            </Button>
          </div>
          {dataset.citationDoi && (
            <a
              href={`https://doi.org/${dataset.citationDoi}`}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 mt-2 text-sm text-primary hover:underline"
            >
              DOI: {dataset.citationDoi} <ExternalLink className="h-3 w-3" />
            </a>
          )}
        </section>
      )}
    </div>
  );
}
