import React, { useState, useCallback, useEffect } from 'react';
import { Link, useLocation } from 'wouter';
import { useListDatasets, useListCategories } from '@workspace/api-client-react';
import { useLanguage } from '@/lib/language';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { Search, Database, ChevronLeft, ChevronRight } from 'lucide-react';

export default function Datasets() {
  const { t, language } = useLanguage();
  const [location] = useLocation();
  const getQueryState = () => {
    const query = new URLSearchParams(location.split('?')[1] ?? '');
    const categoryValue = query.get('categoryId');
    const categoryId = categoryValue ? Number(categoryValue) : undefined;
    return {
      search: query.get('search') ?? '',
      categoryId: Number.isInteger(categoryId) ? categoryId : undefined,
    };
  };
  const initialQueryState = getQueryState();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState(initialQueryState.search);
  const [selectedCategory, setSelectedCategory] = useState<number | undefined>(initialQueryState.categoryId);
  const [page, setPage] = useState(1);
  const limit = 12;

  useEffect(() => {
    const nextQueryState = getQueryState();
    setSearch(nextQueryState.search);
    setDebouncedSearch(nextQueryState.search);
    setSelectedCategory(nextQueryState.categoryId);
    setPage(1);
  }, [location]);

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    const timer = setTimeout(() => {
      setDebouncedSearch(value);
      setPage(1);
    }, 400);
    return () => clearTimeout(timer);
  }, []);

  const { data: datasetsResponse, isLoading } = useListDatasets({
    search: debouncedSearch || undefined,
    categoryId: selectedCategory,
    page,
    limit,
  });

  const { data: categories } = useListCategories();

  const datasets = datasetsResponse?.data ?? [];
  const total = datasetsResponse?.total ?? 0;
  const totalPages = Math.ceil(total / limit);

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{t('Dataset Catalog', 'فهرست مجموعه داده‌ها')}</h1>
        <p className="text-muted-foreground">{t(`${total} datasets available`, `${total} مجموعه داده موجود`)}</p>
      </div>

      <div className="flex flex-col md:flex-row gap-6">
        {/* Sidebar filters */}
        <aside className="md:w-64 shrink-0 space-y-6">
          <div className="relative">
            <Search className="absolute top-2.5 right-3 h-4 w-4 text-muted-foreground ltr:left-3 ltr:right-auto rtl:right-3" style={{ [language === 'fa' ? 'right' : 'left']: '0.75rem', [language === 'fa' ? 'left' : 'right']: 'auto' }} />
            <Input
              type="search"
              placeholder={t('Search datasets...', 'جستجو...')}
              value={search}
              onChange={(e) => handleSearchChange(e.target.value)}
              className="pl-9 rtl:pr-9 rtl:pl-3"
            />
          </div>

          <div>
            <h3 className="font-semibold mb-3 text-sm uppercase tracking-wider text-muted-foreground">
              {t('Categories', 'دسته‌بندی‌ها')}
            </h3>
            <div className="space-y-1">
              <button
                onClick={() => { setSelectedCategory(undefined); setPage(1); }}
                className={`w-full text-start px-3 py-2 rounded-md text-sm transition-colors ${!selectedCategory ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
              >
                {t('All Categories', 'همه دسته‌بندی‌ها')}
              </button>
              {categories?.map((cat) => (
                <button
                  key={cat.id}
                  onClick={() => { setSelectedCategory(cat.id); setPage(1); }}
                  className={`w-full text-start px-3 py-2 rounded-md text-sm transition-colors flex justify-between items-center ${selectedCategory === cat.id ? 'bg-primary text-primary-foreground' : 'hover:bg-muted'}`}
                >
                  <span>{t(cat.name, cat.nameFa)}</span>
                  <span className={`text-xs ${selectedCategory === cat.id ? 'opacity-75' : 'text-muted-foreground'}`}>{cat.datasetCount}</span>
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Dataset grid */}
        <div className="flex-1">
          {isLoading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {Array.from({ length: 6 }).map((_, i) => (
                <Card key={i} className="h-48"><CardContent className="p-4 space-y-3 pt-4"><Skeleton className="h-4 w-3/4" /><Skeleton className="h-4 w-full" /><Skeleton className="h-4 w-1/2" /></CardContent></Card>
              ))}
            </div>
          ) : datasets.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-20 text-muted-foreground">
              <Database className="h-12 w-12 mb-4 opacity-40" />
              <p className="text-lg">{t('No datasets found', 'مجموعه داده‌ای یافت نشد')}</p>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
                {datasets.map((ds) => (
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

              {totalPages > 1 && (
                <div className="flex items-center justify-center gap-2 mt-8">
                  <Button variant="outline" size="sm" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
                    <ChevronLeft className="h-4 w-4" />
                  </Button>
                  <span className="text-sm text-muted-foreground">
                    {t(`Page ${page} of ${totalPages}`, `صفحه ${page} از ${totalPages}`)}
                  </span>
                  <Button variant="outline" size="sm" onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={page === totalPages}>
                    <ChevronRight className="h-4 w-4" />
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
