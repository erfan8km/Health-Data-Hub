import React, { useState, useCallback } from 'react';
import { Link } from 'wouter';
import {
  useListAllVariables,
  useListDatasets,
  useListCategories,
  getListAllVariablesQueryOptions,
} from '@workspace/api-client-react';
import type { Variable } from '@workspace/api-client-react';
import { useLanguage } from '@/lib/language';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Separator } from '@/components/ui/separator';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from '@/components/ui/sheet';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
  BookOpen,
  Search,
  Database,
  Tag,
  Filter,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  ExternalLink,
  Hash,
  X,
} from 'lucide-react';

const PAGE_SIZE = 20;

const TYPE_LABELS: Record<string, { en: string; fa: string; color: string }> = {
  numeric:     { en: 'Numeric',     fa: 'عددی',      color: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300' },
  categorical: { en: 'Categorical', fa: 'طبقه‌ای',   color: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300' },
  date:        { en: 'Date',        fa: 'تاریخ',     color: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' },
  text:        { en: 'Text',        fa: 'متنی',      color: 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300' },
};

function TypeBadge({ type, t }: { type: string; t: (en: string, fa: string) => string }) {
  const meta = TYPE_LABELS[type] ?? { en: type, fa: type, color: 'bg-gray-100 text-gray-700' };
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${meta.color}`}>
      {t(meta.en, meta.fa)}
    </span>
  );
}

function VariableCardSkeleton() {
  return (
    <div className="rounded-lg border bg-card p-5 space-y-3">
      <div className="flex items-start justify-between gap-2">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="h-5 w-20" />
      </div>
      <Skeleton className="h-4 w-56" />
      <Skeleton className="h-12 w-full" />
      <div className="flex gap-2">
        <Skeleton className="h-4 w-24" />
        <Skeleton className="h-4 w-20" />
      </div>
    </div>
  );
}

interface VariableCardProps {
  variable: Variable;
  onClick: (v: Variable) => void;
  t: (en: string, fa: string) => string;
  isRtl: boolean;
}

function VariableCard({ variable, onClick, t, isRtl }: VariableCardProps) {
  const name = isRtl && variable.nameFa ? variable.nameFa : variable.name;
  const label = isRtl && variable.labelFa ? variable.labelFa : variable.label;
  const description = isRtl && variable.descriptionFa ? variable.descriptionFa : variable.description;
  const datasetTitle = isRtl && variable.datasetTitleFa ? variable.datasetTitleFa : (variable.datasetTitle ?? '');
  const categoryName = isRtl && variable.categoryNameFa ? variable.categoryNameFa : (variable.categoryName ?? '');
  const valuesRange = isRtl && variable.valuesRangeFa ? variable.valuesRangeFa : variable.valuesRange;
  const missingNotes = isRtl && variable.missingValueNotesFa ? variable.missingValueNotesFa : variable.missingValueNotes;

  return (
    <div
      className="rounded-lg border bg-card hover:border-primary/40 hover:shadow-sm transition-all cursor-pointer p-5 space-y-3 group"
      onClick={() => onClick(variable)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') onClick(variable); }}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="flex-1 min-w-0">
          <p className="font-mono text-sm font-semibold text-primary truncate group-hover:text-primary/80">
            {name}
          </p>
          {label && label !== name && (
            <p className="text-xs text-muted-foreground mt-0.5 truncate">{label}</p>
          )}
        </div>
        <TypeBadge type={variable.type} t={t} />
      </div>

      {description && (
        <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">
          {description}
        </p>
      )}

      <div className="space-y-1.5 pt-1">
        {datasetTitle && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Database className="h-3 w-3 shrink-0" />
            <span className="truncate">{datasetTitle}</span>
          </div>
        )}
        {categoryName && (
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
            <Tag className="h-3 w-3 shrink-0" />
            <span className="truncate">{categoryName}</span>
          </div>
        )}
      </div>

      {(valuesRange || missingNotes) && (
        <div className="pt-1 border-t space-y-1">
          {valuesRange && (
            <p className="text-xs text-muted-foreground">
              <span className="font-medium text-foreground/70">{t('Values:', 'مقادیر:')}</span>{' '}
              {valuesRange}
            </p>
          )}
          {missingNotes && (
            <div className="flex items-start gap-1">
              <AlertCircle className="h-3 w-3 shrink-0 mt-0.5 text-amber-500" />
              <p className="text-xs text-muted-foreground line-clamp-1">{missingNotes}</p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

interface DatasetOccurrencesSheetProps {
  variable: Variable | null;
  open: boolean;
  onClose: () => void;
  t: (en: string, fa: string) => string;
  isRtl: boolean;
}

function DatasetOccurrencesSheet({ variable, open, onClose, t, isRtl }: DatasetOccurrencesSheetProps) {
  const queryParams = { name: variable?.name ?? '', limit: 50, page: 1 };
  const { data, isLoading } = useListAllVariables(
    queryParams,
    { query: { ...getListAllVariablesQueryOptions(queryParams), enabled: open && !!variable?.name } }
  );

  const occurrences = data?.data ?? [];
  const name = isRtl && variable?.nameFa ? variable.nameFa : (variable?.name ?? '');
  const label = isRtl && variable?.labelFa ? variable.labelFa : (variable?.label ?? '');
  const description = isRtl && variable?.descriptionFa ? variable.descriptionFa : (variable?.description ?? '');
  const valuesRange = variable ? (isRtl && variable.valuesRangeFa ? variable.valuesRangeFa : variable.valuesRange) : null;
  const missingNotes = variable ? (isRtl && variable.missingValueNotesFa ? variable.missingValueNotesFa : variable.missingValueNotes) : null;

  return (
    <Sheet open={open} onOpenChange={(v) => { if (!v) onClose(); }}>
      <SheetContent className={`w-full sm:max-w-lg ${isRtl ? 'font-[Vazirmatn]' : ''}`} side={isRtl ? 'left' : 'right'}>
        <SheetHeader className="pb-4">
          <div className="flex items-center gap-2">
            <Hash className="h-5 w-5 text-primary shrink-0" />
            <SheetTitle className="font-mono text-primary leading-tight">{name}</SheetTitle>
          </div>
          {label && label !== name && (
            <SheetDescription className="text-start">{label}</SheetDescription>
          )}
        </SheetHeader>

        <ScrollArea className="h-[calc(100vh-140px)] pr-1">
          <div className="space-y-5 pb-8">
            {description && (
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                  {t('Description', 'توضیحات')}
                </h4>
                <p className="text-sm leading-relaxed">{description}</p>
              </div>
            )}

            <div className="grid grid-cols-1 gap-3">
              <div>
                <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                  {t('Data Type', 'نوع داده')}
                </h4>
                {variable && <TypeBadge type={variable.type} t={t} />}
              </div>

              {valuesRange && (
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                    {t('Allowed Values / Range', 'مقادیر مجاز / دامنه')}
                  </h4>
                  <p className="text-sm font-mono bg-muted px-3 py-2 rounded">{valuesRange}</p>
                </div>
              )}

              {missingNotes && (
                <div>
                  <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-1.5">
                    {t('Missing Value Information', 'اطلاعات مقادیر گمشده')}
                  </h4>
                  <div className="flex items-start gap-2 text-sm bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-800 rounded px-3 py-2">
                    <AlertCircle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                    <p className="leading-relaxed">{missingNotes}</p>
                  </div>
                </div>
              )}
            </div>

            <Separator />

            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
                {t('Datasets Containing This Variable', 'مجموعه‌داده‌های حاوی این متغیر')}
                {!isLoading && occurrences.length > 0 && (
                  <span className="ms-2 font-normal normal-case text-muted-foreground">
                    ({occurrences.length})
                  </span>
                )}
              </h4>

              {isLoading ? (
                <div className="space-y-3">
                  {[1, 2].map((i) => (
                    <div key={i} className="rounded-lg border p-4 space-y-2">
                      <Skeleton className="h-4 w-48" />
                      <Skeleton className="h-3 w-32" />
                    </div>
                  ))}
                </div>
              ) : occurrences.length === 0 ? (
                <p className="text-sm text-muted-foreground italic">
                  {t('No datasets found.', 'هیچ مجموعه‌داده‌ای یافت نشد.')}
                </p>
              ) : (
                <div className="space-y-2">
                  {occurrences.map((occ) => {
                    const dsTitle = isRtl && occ.datasetTitleFa ? occ.datasetTitleFa : (occ.datasetTitle ?? '');
                    const catName = isRtl && occ.categoryNameFa ? occ.categoryNameFa : (occ.categoryName ?? '');
                    const occValuesRange = isRtl && occ.valuesRangeFa ? occ.valuesRangeFa : occ.valuesRange;
                    const occLabel = isRtl && occ.labelFa ? occ.labelFa : occ.label;
                    return (
                      <Link
                        key={occ.id}
                        href={`/datasets/${occ.datasetId}`}
                        onClick={onClose}
                        className="block rounded-lg border bg-card hover:border-primary/40 hover:bg-accent/30 transition-all p-4 group"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium leading-snug group-hover:text-primary transition-colors truncate">
                              {dsTitle}
                            </p>
                            {catName && (
                              <p className="text-xs text-muted-foreground mt-0.5">{catName}</p>
                            )}
                          </div>
                          <ExternalLink className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                        </div>
                        {occLabel && occLabel !== occ.name && (
                          <p className="text-xs text-muted-foreground mt-1.5 italic">{occLabel}</p>
                        )}
                        {occValuesRange && (
                          <p className="text-xs font-mono text-muted-foreground mt-1.5 truncate">
                            {occValuesRange}
                          </p>
                        )}
                      </Link>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        </ScrollArea>
      </SheetContent>
    </Sheet>
  );
}

export default function VariableDictionary() {
  const { t, isRtl } = useLanguage();
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [datasetId, setDatasetId] = useState<number | null>(null);
  const [categoryId, setCategoryId] = useState<number | null>(null);
  const [varType, setVarType] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [selectedVariable, setSelectedVariable] = useState<Variable | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);

  const debounceRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);
  const handleSearch = useCallback((value: string) => {
    setSearch(value);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setDebouncedSearch(value);
      setPage(1);
    }, 350);
  }, []);

  const { data, isLoading, isError } = useListAllVariables({
    search: debouncedSearch || undefined,
    datasetId: datasetId ?? undefined,
    categoryId: categoryId ?? undefined,
    type: varType ?? undefined,
    page,
    limit: PAGE_SIZE,
  });

  const { data: datasetsData } = useListDatasets({ limit: 100, page: 1 });
  const { data: categories } = useListCategories();

  const variables = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / PAGE_SIZE);

  const datasetOptions = datasetsData?.data ?? [];

  const handleVariableClick = (variable: Variable) => {
    setSelectedVariable(variable);
    setSheetOpen(true);
  };

  const clearFilters = () => {
    setSearch('');
    setDebouncedSearch('');
    setDatasetId(null);
    setCategoryId(null);
    setVarType(null);
    setPage(1);
  };

  const hasFilters = search || datasetId || categoryId || varType;

  const typeOptions = [
    { value: 'numeric',     labelEn: 'Numeric',     labelFa: 'عددی' },
    { value: 'categorical', labelEn: 'Categorical', labelFa: 'طبقه‌ای' },
    { value: 'date',        labelEn: 'Date',        labelFa: 'تاریخ' },
    { value: 'text',        labelEn: 'Text',        labelFa: 'متنی' },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Page header */}
      <div className="bg-muted/40 border-b">
        <div className="container mx-auto px-4 py-10">
          <div className="flex items-start gap-4">
            <div className="rounded-xl bg-primary/10 p-3">
              <BookOpen className="h-7 w-7 text-primary" />
            </div>
            <div>
              <h1 className="text-3xl font-bold tracking-tight">
                {t('Variable Dictionary', 'فرهنگ متغیرها')}
              </h1>
              <p className="mt-1.5 text-muted-foreground max-w-2xl">
                {t(
                  'Browse and search all variables across datasets in the repository. Click any variable to see which datasets contain it.',
                  'تمام متغیرهای موجود در مجموعه‌داده‌های مخزن را مرور و جستجو کنید. برای مشاهده مجموعه‌داده‌های حاوی هر متغیر، روی آن کلیک نمایید.'
                )}
              </p>
              {total > 0 && !isLoading && (
                <p className="mt-2 text-sm font-medium text-primary">
                  {t(`${total} variable${total !== 1 ? 's' : ''} found`, `${total} متغیر یافت شد`)}
                </p>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col lg:flex-row gap-8">
          {/* Sidebar filters */}
          <aside className="lg:w-64 shrink-0 space-y-6">
            <div className="rounded-lg border bg-card p-5 space-y-5">
              <div className="flex items-center justify-between">
                <h2 className="text-sm font-semibold flex items-center gap-2">
                  <Filter className="h-4 w-4" />
                  {t('Filters', 'فیلترها')}
                </h2>
                {hasFilters && (
                  <Button variant="ghost" size="sm" className="h-6 px-2 text-xs" onClick={clearFilters}>
                    <X className="h-3 w-3 me-1" />
                    {t('Clear', 'پاک کردن')}
                  </Button>
                )}
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {t('Dataset', 'مجموعه‌داده')}
                </label>
                <Select
                  value={datasetId?.toString() ?? 'all'}
                  onValueChange={(v) => { setDatasetId(v === 'all' ? null : Number(v)); setPage(1); }}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder={t('All datasets', 'همه مجموعه‌داده‌ها')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('All datasets', 'همه مجموعه‌داده‌ها')}</SelectItem>
                    {datasetOptions.map((ds) => (
                      <SelectItem key={ds.id} value={ds.id.toString()}>
                        {isRtl && ds.titleFa ? ds.titleFa : ds.title}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {t('Category', 'دسته‌بندی')}
                </label>
                <Select
                  value={categoryId?.toString() ?? 'all'}
                  onValueChange={(v) => { setCategoryId(v === 'all' ? null : Number(v)); setPage(1); }}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder={t('All categories', 'همه دسته‌ها')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('All categories', 'همه دسته‌ها')}</SelectItem>
                    {(categories ?? []).map((cat) => (
                      <SelectItem key={cat.id} value={cat.id.toString()}>
                        {isRtl && cat.nameFa ? cat.nameFa : cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {t('Variable Type', 'نوع متغیر')}
                </label>
                <Select
                  value={varType ?? 'all'}
                  onValueChange={(v) => { setVarType(v === 'all' ? null : v); setPage(1); }}
                >
                  <SelectTrigger className="h-9 text-sm">
                    <SelectValue placeholder={t('All types', 'همه انواع')} />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">{t('All types', 'همه انواع')}</SelectItem>
                    {typeOptions.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {t(opt.labelEn, opt.labelFa)}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <Separator />

              <div className="space-y-1.5">
                <p className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                  {t('Type Legend', 'راهنمای انواع')}
                </p>
                <div className="space-y-1.5">
                  {typeOptions.map((opt) => (
                    <div key={opt.value} className="flex items-center gap-2">
                      <TypeBadge type={opt.value} t={t} />
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </aside>

          {/* Main content */}
          <div className="flex-1 min-w-0 space-y-5">
            {/* Search bar */}
            <div className="relative">
              <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
              <Input
                className="ps-9 h-10"
                placeholder={t(
                  'Search by variable name, label, or description…',
                  'جستجو بر اساس نام متغیر، برچسب، یا توضیحات…'
                )}
                value={search}
                onChange={(e) => handleSearch(e.target.value)}
              />
              {search && (
                <button
                  className="absolute end-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  onClick={() => handleSearch('')}
                >
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>

            {/* Results */}
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {Array.from({ length: 8 }).map((_, i) => (
                  <VariableCardSkeleton key={i} />
                ))}
              </div>
            ) : isError ? (
              <div className="text-center py-16 text-muted-foreground">
                <AlertCircle className="h-8 w-8 mx-auto mb-3 text-destructive" />
                <p>{t('Failed to load variables.', 'بارگذاری متغیرها ناموفق بود.')}</p>
              </div>
            ) : variables.length === 0 ? (
              <div className="text-center py-16 text-muted-foreground">
                <BookOpen className="h-10 w-10 mx-auto mb-3 opacity-40" />
                <p className="text-lg font-medium">
                  {t('No variables found', 'متغیری یافت نشد')}
                </p>
                <p className="text-sm mt-1">
                  {t('Try adjusting your search or filters.', 'فیلترها یا عبارت جستجو را تغییر دهید.')}
                </p>
                {hasFilters && (
                  <Button variant="outline" size="sm" className="mt-4" onClick={clearFilters}>
                    {t('Clear all filters', 'پاک کردن همه فیلترها')}
                  </Button>
                )}
              </div>
            ) : (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {variables.map((variable) => (
                    <VariableCard
                      key={variable.id}
                      variable={variable}
                      onClick={handleVariableClick}
                      t={t}
                      isRtl={isRtl}
                    />
                  ))}
                </div>

                {/* Pagination */}
                {totalPages > 1 && (
                  <div className="flex items-center justify-between pt-4">
                    <p className="text-sm text-muted-foreground">
                      {t(
                        `Page ${page} of ${totalPages} · ${total} results`,
                        `صفحه ${page} از ${totalPages} · ${total} نتیجه`
                      )}
                    </p>
                    <div className="flex items-center gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={page <= 1}
                        onClick={() => setPage((p) => p - 1)}
                      >
                        {isRtl ? <ChevronRight className="h-4 w-4" /> : <ChevronLeft className="h-4 w-4" />}
                        {t('Previous', 'قبلی')}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={page >= totalPages}
                        onClick={() => setPage((p) => p + 1)}
                      >
                        {t('Next', 'بعدی')}
                        {isRtl ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Variable detail sheet */}
      <DatasetOccurrencesSheet
        variable={selectedVariable}
        open={sheetOpen}
        onClose={() => setSheetOpen(false)}
        t={t}
        isRtl={isRtl}
      />
    </div>
  );
}
