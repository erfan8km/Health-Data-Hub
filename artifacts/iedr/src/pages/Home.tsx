import React, { useState } from 'react';
import { Link, useLocation } from 'wouter';
import { useGetStats, useGetFeaturedDatasets, useListCategories } from '@workspace/api-client-react';
import { useLanguage } from '@/lib/language';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Database, BarChart3, FileText, BookOpen } from 'lucide-react';

export default function Home() {
  const { t } = useLanguage();
  const [, navigate] = useLocation();
  const [searchValue, setSearchValue] = useState('');

  const { data: stats, isLoading: statsLoading } = useGetStats();
  const { data: featured, isLoading: featuredLoading } = useGetFeaturedDatasets();
  const { data: categories } = useListCategories();

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchValue.trim()) {
      navigate(`/datasets?search=${encodeURIComponent(searchValue.trim())}`);
    } else {
      navigate('/datasets');
    }
  };

  const statCards = [
    {
      icon: <Database className="h-6 w-6" />,
      label: t('Datasets', 'مجموعه داده'),
      value: stats?.totalDatasets ?? 0,
    },
    {
      icon: <BarChart3 className="h-6 w-6" />,
      label: t('Variables', 'متغیر'),
      value: stats?.totalVariables ? stats.totalVariables : t('N/A', 'نامشخص'),
    },
    {
      icon: <FileText className="h-6 w-6" />,
      label: t('Total Records', 'کل رکوردها'),
      value: stats?.totalRecords ? stats.totalRecords.toLocaleString() : t('N/A', 'نامشخص'),
    },
    {
      icon: <BookOpen className="h-6 w-6" />,
      label: t('Categories', 'دسته‌بندی‌ها'),
      value: stats?.categoriesCount ?? 0,
    },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero */}
      <section className="bg-primary text-primary-foreground py-20 px-4">
        <div className="container mx-auto max-w-3xl text-center">
          <div className="inline-block bg-primary-foreground/10 border border-primary-foreground/20 rounded-full px-4 py-1 text-sm font-medium mb-6">
            {t('Open Access · Peer-Reviewed', 'دسترسی آزاد · داوری‌شده')}
          </div>
          <h1 className="text-4xl md:text-5xl font-bold mb-4 leading-tight">
            {t('Iran Epidemiology Data Repository', 'مخزن داده‌های اپیدمیولوژی ایران')}
          </h1>
          <p className="text-lg md:text-xl opacity-85 max-w-2xl mx-auto mb-10 leading-relaxed">
            {t(
              'A centralized repository of epidemiological and health registry datasets from Iran, curated for researchers, students, and policymakers.',
              'مخزن متمرکز مجموعه داده‌های اپیدمیولوژیکی و ثبت بهداشتی ایران، برگزیده برای محققان، دانشجویان و سیاست‌گذاران.'
            )}
          </p>
          <form onSubmit={handleSearch} className="flex gap-2 max-w-xl mx-auto">
            <div className="relative flex-1">
              <Search className="absolute top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground ltr:left-3 rtl:right-3" style={{ left: undefined }} />
              <Input
                type="search"
                placeholder={t('Search by title, description, or category...', 'جستجو بر اساس عنوان، توضیح یا دسته‌بندی...')}
                value={searchValue}
                onChange={(e) => setSearchValue(e.target.value)}
                className="pl-10 rtl:pr-10 rtl:pl-3 bg-primary-foreground/10 border-primary-foreground/30 text-primary-foreground placeholder:text-primary-foreground/60 focus-visible:bg-primary-foreground/20"
              />
            </div>
            <Button type="submit" variant="secondary" className="shrink-0 font-semibold">
              {t('Search', 'جستجو')}
            </Button>
          </form>
        </div>
      </section>

      {/* Stats */}
      <section className="py-10 border-b bg-muted/30">
        <div className="container mx-auto px-4">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {statsLoading
              ? Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-20 rounded-lg" />)
              : statCards.map((s) => (
                  <div key={s.label} className="flex items-center gap-4 bg-background rounded-lg border px-5 py-4">
                    <div className="text-primary opacity-70">{s.icon}</div>
                    <div>
                      <div className="text-2xl font-bold">{s.value}</div>
                      <div className="text-xs text-muted-foreground uppercase tracking-wider">{s.label}</div>
                    </div>
                  </div>
                ))}
          </div>
        </div>
      </section>

      {/* Featured Datasets */}
      <section className="py-12 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-2xl font-bold">{t('Featured Datasets', 'مجموعه داده‌های ویژه')}</h2>
            <Link href="/datasets">
              <Button variant="outline" size="sm">{t('View All', 'مشاهده همه')}</Button>
            </Link>
          </div>

          {featuredLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {Array.from({ length: 3 }).map((_, i) => (
                <Card key={i}><CardContent className="p-5 space-y-3 pt-5"><Skeleton className="h-4 w-3/4" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-1/2" /></CardContent></Card>
              ))}
            </div>
          ) : !featured?.length ? (
            <div className="text-center py-12 text-muted-foreground">
              <Database className="h-10 w-10 mx-auto mb-3 opacity-40" />
              <p>{t('No featured datasets yet.', 'هنوز مجموعه داده ویژه‌ای وجود ندارد.')}</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
              {featured.map((ds) => (
                <Link key={ds.id} href={`/datasets/${ds.id}`}>
                  <Card className="h-full hover:shadow-md hover:border-primary/50 transition-all cursor-pointer group">
                    <CardHeader className="pb-2">
                      <div className="flex items-start justify-between gap-2">
                        <CardTitle className="text-base font-semibold leading-snug group-hover:text-primary transition-colors line-clamp-2">
                          {t(ds.title, ds.titleFa)}
                        </CardTitle>
                        {ds.categoryName && (
                          <Badge variant="secondary" className="shrink-0 text-xs">
                            {t(ds.categoryName, ds.categoryNameFa ?? ds.categoryName)}
                          </Badge>
                        )}
                      </div>
                    </CardHeader>
                    <CardContent className="pt-0">
                      <p className="text-sm text-muted-foreground line-clamp-2 mb-3">
                        {t(ds.description, ds.descriptionFa)}
                      </p>
                      <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-xs text-muted-foreground border-t pt-3">
                         <span><span className="font-medium text-foreground">{ds.recordsCount > 0 ? ds.recordsCount.toLocaleString() : t('N/A', 'نامشخص')}</span> {t('records', 'رکورد')}</span>
                         <span><span className="font-medium text-foreground">{ds.variablesCount > 0 ? ds.variablesCount : t('N/A', 'نامشخص')}</span> {t('variables', 'متغیر')}</span>
                         <span>{ds.yearStart > 0 && ds.yearEnd > 0 ? `${ds.yearStart}–${ds.yearEnd}` : t('Study period unavailable', 'دوره مطالعه موجود نیست')}</span>
                        <span className="truncate">{t(ds.geographicCoverage, ds.geographicCoverageFa)}</span>
                      </div>
                    </CardContent>
                  </Card>
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>

      {/* Categories */}
      {categories && categories.length > 0 && (
        <section className="py-10 px-4 bg-muted/30 border-t">
          <div className="container mx-auto max-w-6xl">
            <h2 className="text-2xl font-bold mb-6">{t('Browse by Category', 'مرور بر اساس دسته‌بندی')}</h2>
            <div className="flex flex-wrap gap-3">
              {categories.map((cat) => (
                <Link key={cat.id} href={`/datasets?categoryId=${cat.id}`}>
                  <button className="flex items-center gap-2 bg-background border rounded-full px-4 py-2 text-sm font-medium hover:border-primary hover:text-primary transition-colors">
                    {t(cat.name, cat.nameFa)}
                    <span className="bg-muted text-muted-foreground text-xs rounded-full px-2 py-0.5">{cat.datasetCount}</span>
                  </button>
                </Link>
              ))}
            </div>
          </div>
        </section>
      )}
    </div>
  );
}
