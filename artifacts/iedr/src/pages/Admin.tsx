import React, { useState, useEffect, useCallback } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  useListDatasets,
  useListCategories,
  useCreateDataset,
  useUpdateDataset,
  useDeleteDataset,
  useCreateCategory,
  useUpdateCategory,
  useDeleteCategory,
  useListAllVariables,
  useCreateVariable,
  useUpdateVariable,
  useDeleteVariable,
  getListDatasetsQueryKey,
  getListCategoriesQueryKey,
  getListAllVariablesQueryKey,
} from '@workspace/api-client-react';
import type { Dataset, Category, Variable } from '@workspace/api-client-react';
import { useLanguage } from '@/lib/language';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Plus, Pencil, Trash2, ShieldAlert, Lock, Eye, EyeOff, LogOut, Search, ChevronLeft, ChevronRight, Download, FileJson, FileText, DatabaseBackup } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const SESSION_KEY = 'iedr_admin_auth';

// ─── Export tab ──────────────────────────────────────────────────────────────

function ExportTab({ t }: { t: (en: string, fa: string) => string }) {
  const download = (path: string) => {
    window.open(`/api${path}`, '_blank');
  };

  const sections = [
    {
      title: t('Full Database Backup (JSON)', 'پشتیبان کامل پایگاه داده (JSON)'),
      description: t(
        'All categories, datasets, and variables in a single JSON file.',
        'همه دسته‌بندی‌ها، مجموعه‌داده‌ها و متغیرها در یک فایل JSON.'
      ),
      icon: <DatabaseBackup className="h-5 w-5 text-primary" />,
      actions: [
        { label: t('Download JSON', 'دانلود JSON'), path: '/export/json', icon: <FileJson className="h-4 w-4" /> },
      ],
    },
    {
      title: t('Schema Definition', 'تعریف طرح داده'),
      description: t(
        'Database schema: tables, columns, types, and relationships.',
        'طرح پایگاه داده: جداول، ستون‌ها، انواع، و روابط.'
      ),
      icon: <FileText className="h-5 w-5 text-primary" />,
      actions: [
        { label: t('Download Schema JSON', 'دانلود JSON طرح'), path: '/export/schema', icon: <FileJson className="h-4 w-4" /> },
      ],
    },
    {
      title: t('Categories', 'دسته‌بندی‌ها'),
      description: t('All research categories.', 'همه دسته‌بندی‌های پژوهشی.'),
      icon: <FileText className="h-5 w-5 text-primary" />,
      actions: [
        { label: 'JSON', path: '/export/json/categories', icon: <FileJson className="h-4 w-4" /> },
        { label: 'CSV', path: '/export/csv/categories', icon: <FileText className="h-4 w-4" /> },
      ],
    },
    {
      title: t('Datasets', 'مجموعه‌داده‌ها'),
      description: t(
        'All dataset metadata. JSON version includes nested variables.',
        'فراداده همه مجموعه‌داده‌ها. نسخه JSON شامل متغیرهای تو در تو است.'
      ),
      icon: <FileJson className="h-5 w-5 text-primary" />,
      actions: [
        { label: 'JSON', path: '/export/json/datasets', icon: <FileJson className="h-4 w-4" /> },
        { label: 'CSV', path: '/export/csv/datasets', icon: <FileText className="h-4 w-4" /> },
      ],
    },
    {
      title: t('Variables', 'متغیرها'),
      description: t('All variables across all datasets (flat list).', 'همه متغیرها از همه مجموعه‌داده‌ها (فهرست تخت).'),
      icon: <FileJson className="h-5 w-5 text-primary" />,
      actions: [
        { label: 'JSON', path: '/export/json/variables', icon: <FileJson className="h-4 w-4" /> },
        { label: 'CSV', path: '/export/csv/variables', icon: <FileText className="h-4 w-4" /> },
      ],
    },
  ];

  return (
    <div className="space-y-4 max-w-2xl">
      <p className="text-sm text-muted-foreground">
        {t(
          'Download backup copies of the repository data. CSV files include a UTF-8 BOM for compatibility with Excel and Persian text.',
          'نسخه پشتیبان داده‌های مخزن را دانلود کنید. فایل‌های CSV شامل BOM برای سازگاری با Excel و متن فارسی هستند.'
        )}
      </p>
      {sections.map((section) => (
        <div key={section.title} className="rounded-lg border bg-card p-5">
          <div className="flex items-start gap-3 mb-3">
            <div className="rounded-md bg-primary/10 p-2 shrink-0">{section.icon}</div>
            <div>
              <h3 className="font-medium text-sm">{section.title}</h3>
              <p className="text-xs text-muted-foreground mt-0.5">{section.description}</p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            {section.actions.map((action) => (
              <Button
                key={action.path}
                variant="outline"
                size="sm"
                className="gap-2 h-8 text-xs"
                onClick={() => download(action.path)}
              >
                <Download className="h-3.5 w-3.5" />
                {action.icon}
                {action.label}
              </Button>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}

// ─── Login screen ────────────────────────────────────────────────────────────

function AdminLogin({ onSuccess }: { onSuccess: () => void }) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!password) return;
    setLoading(true);
    try {
      const res = await fetch('/api/auth/admin-login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'same-origin',
        body: JSON.stringify({ password }),
      });
      if (res.ok) {
        sessionStorage.setItem(SESSION_KEY, '1');
        onSuccess();
      } else {
        const data = await res.json().catch(() => ({}));
        toast({
          title: t('Access denied', 'دسترسی رد شد'),
          description: data.error ?? t('Incorrect password.', 'رمز عبور اشتباه است.'),
          variant: 'destructive',
        });
        setPassword('');
      }
    } catch {
      toast({ title: t('Network error', 'خطای شبکه'), variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4">
      <div className="w-full max-w-sm">
        <div className="flex justify-center mb-6">
          <div className="w-14 h-14 rounded-full bg-primary/10 flex items-center justify-center">
            <Lock className="h-7 w-7 text-primary" />
          </div>
        </div>
        <h1 className="text-2xl font-bold text-center mb-1">{t('Admin Access', 'دسترسی مدیریت')}</h1>
        <p className="text-sm text-muted-foreground text-center mb-8">
          {t('Enter the admin password to continue.', 'رمز عبور مدیریت را وارد کنید.')}
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="admin-password">{t('Password', 'رمز عبور')}</Label>
            <div className="relative">
              <Input
                id="admin-password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder={t('Enter admin password', 'رمز عبور را وارد کنید')}
                autoComplete="current-password"
                autoFocus
                className="pr-10"
              />
              <button
                type="button"
                tabIndex={-1}
                className="absolute top-1/2 right-3 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                onClick={() => setShowPassword((s) => !s)}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>
          <Button type="submit" className="w-full" disabled={loading || !password}>
            {loading ? t('Checking...', 'در حال بررسی...') : t('Sign in', 'ورود')}
          </Button>
        </form>
        <p className="text-xs text-muted-foreground text-center mt-6">
          {t('Admin access must be configured on the server.', 'دسترسی مدیریت باید در سمت سرور پیکربندی شود.')}
        </p>
      </div>
    </div>
  );
}

// ─── Types ────────────────────────────────────────────────────────────────────

type DatasetForm = {
  title: string; titleFa: string;
  description: string; descriptionFa: string;
  recordsCount: string; variablesCount: string;
  yearStart: string; yearEnd: string;
  geographicCoverage: string; geographicCoverageFa: string;
  dataSource: string; dataSourceFa: string;
  officialSourceUrl: string;
  citationText: string; citationDoi: string;
  isFeatured: boolean; categoryId: string;
};

const emptyDatasetForm: DatasetForm = {
  title: '', titleFa: '', description: '', descriptionFa: '',
  recordsCount: '0', variablesCount: '0',
  yearStart: '2000', yearEnd: '2023',
  geographicCoverage: '', geographicCoverageFa: '',
  dataSource: '', dataSourceFa: '',
  officialSourceUrl: '',
  citationText: '', citationDoi: '',
  isFeatured: false, categoryId: '',
};

type CategoryForm = { name: string; nameFa: string; slug: string; description: string; descriptionFa: string; };
const emptyCategoryForm: CategoryForm = { name: '', nameFa: '', slug: '', description: '', descriptionFa: '' };

type VariableForm = {
  name: string; nameFa: string;
  label: string; labelFa: string;
  type: 'numeric' | 'categorical' | 'date' | 'text';
  description: string; descriptionFa: string;
  valuesRange: string; valuesRangeFa: string;
  missingValueNotes: string; missingValueNotesFa: string;
  datasetId: string;
};

const emptyVariableForm: VariableForm = {
  name: '', nameFa: '',
  label: '', labelFa: '',
  type: 'numeric',
  description: '', descriptionFa: '',
  valuesRange: '', valuesRangeFa: '',
  missingValueNotes: '', missingValueNotesFa: '',
  datasetId: '',
};

const VARIABLE_TYPES: { value: VariableForm['type']; labelEn: string; labelFa: string }[] = [
  { value: 'numeric', labelEn: 'Numeric', labelFa: 'عددی' },
  { value: 'categorical', labelEn: 'Categorical', labelFa: 'طبقه‌ای' },
  { value: 'date', labelEn: 'Date', labelFa: 'تاریخ' },
  { value: 'text', labelEn: 'Text', labelFa: 'متنی' },
];

// ─── Variables Tab ─────────────────────────────────────────────────────────────

function VariablesTab({
  datasets,
}: {
  datasets: Dataset[];
}) {
  const { t } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [filterDataset, setFilterDataset] = useState<string>('all');
  const [filterType, setFilterType] = useState<string>('all');
  const [page, setPage] = useState(1);
  const limit = 20;

  const [varDialog, setVarDialog] = useState<{ open: boolean; mode: 'create' | 'edit'; data?: Variable }>({ open: false, mode: 'create' });
  const [varForm, setVarForm] = useState<VariableForm>(emptyVariableForm);
  const [deleteVar, setDeleteVar] = useState<Variable | null>(null);

  const handleSearchChange = useCallback((value: string) => {
    setSearch(value);
    const timer = setTimeout(() => { setDebouncedSearch(value); setPage(1); }, 400);
    return () => clearTimeout(timer);
  }, []);

  const { data: variablesResp, isLoading } = useListAllVariables({
    search: debouncedSearch || undefined,
    datasetId: filterDataset !== 'all' ? Number(filterDataset) : undefined,
    type: filterType !== 'all' ? filterType : undefined,
    page,
    limit,
  });

  const variables = variablesResp?.data ?? [];
  const total = variablesResp?.total ?? 0;
  const totalPages = Math.ceil(total / limit);

  const createVariable = useCreateVariable();
  const updateVariable = useUpdateVariable();
  const deleteVariable = useDeleteVariable();

  const invalidate = () => queryClient.invalidateQueries({ queryKey: getListAllVariablesQueryKey() });

  const openCreate = () => { setVarForm(emptyVariableForm); setVarDialog({ open: true, mode: 'create' }); };
  const openEdit = (v: Variable) => {
    setVarForm({
      name: v.name, nameFa: v.nameFa,
      label: v.label, labelFa: v.labelFa,
      type: v.type as VariableForm['type'],
      description: v.description, descriptionFa: v.descriptionFa,
      valuesRange: v.valuesRange ?? '', valuesRangeFa: v.valuesRangeFa ?? '',
      missingValueNotes: v.missingValueNotes ?? '', missingValueNotesFa: v.missingValueNotesFa ?? '',
      datasetId: String(v.datasetId),
    });
    setVarDialog({ open: true, mode: 'edit', data: v });
  };

  const handleSave = () => {
    const payload = {
      name: varForm.name, nameFa: varForm.nameFa,
      label: varForm.label, labelFa: varForm.labelFa,
      type: varForm.type,
      description: varForm.description, descriptionFa: varForm.descriptionFa,
      valuesRange: varForm.valuesRange || undefined,
      valuesRangeFa: varForm.valuesRangeFa || undefined,
      missingValueNotes: varForm.missingValueNotes || undefined,
      missingValueNotesFa: varForm.missingValueNotesFa || undefined,
    };
    const dsId = parseInt(varForm.datasetId);
    if (!dsId) {
      toast({ title: t('Please select a dataset', 'لطفاً یک مجموعه داده انتخاب کنید'), variant: 'destructive' });
      return;
    }
    if (varDialog.mode === 'create') {
      createVariable.mutate({ datasetId: dsId, data: payload }, {
        onSuccess: () => { toast({ title: t('Variable created', 'متغیر ایجاد شد') }); setVarDialog({ open: false, mode: 'create' }); invalidate(); },
        onError: () => toast({ title: t('Error creating variable', 'خطا'), variant: 'destructive' }),
      });
    } else if (varDialog.data) {
      updateVariable.mutate({ datasetId: varDialog.data.datasetId, id: varDialog.data.id, data: payload }, {
        onSuccess: () => { toast({ title: t('Variable updated', 'متغیر به‌روز شد') }); setVarDialog({ open: false, mode: 'create' }); invalidate(); },
        onError: () => toast({ title: t('Error updating variable', 'خطا'), variant: 'destructive' }),
      });
    }
  };

  const handleDelete = () => {
    if (!deleteVar) return;
    deleteVariable.mutate({ datasetId: deleteVar.datasetId, id: deleteVar.id }, {
      onSuccess: () => { toast({ title: t('Variable deleted', 'متغیر حذف شد') }); setDeleteVar(null); invalidate(); },
      onError: () => toast({ title: t('Error deleting', 'خطا'), variant: 'destructive' }),
    });
  };

  const typeColor: Record<string, string> = {
    numeric: 'bg-blue-50 text-blue-700 border-blue-200',
    categorical: 'bg-amber-50 text-amber-700 border-amber-200',
    date: 'bg-green-50 text-green-700 border-green-200',
    text: 'bg-purple-50 text-purple-700 border-purple-200',
  };

  return (
    <div>
      {/* Toolbar */}
      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search className="absolute top-1/2 left-3 -translate-y-1/2 h-4 w-4 text-muted-foreground rtl:left-auto rtl:right-3" />
          <Input
            placeholder={t('Search name, label, description…', 'جستجو نام، برچسب، توضیح…')}
            value={search}
            onChange={e => handleSearchChange(e.target.value)}
            className="pl-9 rtl:pr-9 rtl:pl-3"
          />
        </div>
        <Select value={filterDataset} onValueChange={v => { setFilterDataset(v); setPage(1); }}>
          <SelectTrigger className="w-full sm:w-52">
            <SelectValue placeholder={t('All datasets', 'همه مجموعه داده‌ها')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('All datasets', 'همه مجموعه داده‌ها')}</SelectItem>
            {datasets.map(ds => <SelectItem key={ds.id} value={String(ds.id)}>{ds.title}</SelectItem>)}
          </SelectContent>
        </Select>
        <Select value={filterType} onValueChange={v => { setFilterType(v); setPage(1); }}>
          <SelectTrigger className="w-full sm:w-40">
            <SelectValue placeholder={t('All types', 'همه انواع')} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t('All types', 'همه انواع')}</SelectItem>
            {VARIABLE_TYPES.map(vt => <SelectItem key={vt.value} value={vt.value}>{t(vt.labelEn, vt.labelFa)}</SelectItem>)}
          </SelectContent>
        </Select>
        <Button size="sm" onClick={openCreate} className="gap-2 shrink-0">
          <Plus className="h-4 w-4" />
          {t('Add Variable', 'افزودن متغیر')}
        </Button>
      </div>

      <p className="text-xs text-muted-foreground mb-3">
        {total} {t('variables', 'متغیر')}
      </p>

      {/* Table */}
      <div className="rounded-lg border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-muted/50 text-muted-foreground text-xs uppercase tracking-wider">
              <tr>
                <th className="text-start px-4 py-3 font-semibold">{t('Name', 'نام')}</th>
                <th className="text-start px-4 py-3 font-semibold">{t('Label', 'برچسب')}</th>
                <th className="text-start px-4 py-3 font-semibold">{t('Type', 'نوع')}</th>
                <th className="text-start px-4 py-3 font-semibold hidden lg:table-cell">{t('Dataset', 'مجموعه داده')}</th>
                <th className="text-start px-4 py-3 font-semibold hidden xl:table-cell">{t('Allowed Values', 'مقادیر مجاز')}</th>
                <th className="text-start px-4 py-3 font-semibold">{t('Actions', 'عملیات')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {isLoading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i}>
                    {Array.from({ length: 6 }).map((_, j) => (
                      <td key={j} className="px-4 py-3">
                        <div className="h-4 bg-muted rounded animate-pulse" />
                      </td>
                    ))}
                  </tr>
                ))
              ) : variables.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                    {t('No variables found', 'متغیری یافت نشد')}
                  </td>
                </tr>
              ) : (
                variables.map(v => (
                  <tr key={v.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-mono text-xs font-medium">{v.name}</td>
                    <td className="px-4 py-3 max-w-[180px] truncate" title={v.label}>{v.label || <span className="text-muted-foreground italic">{t('—', '—')}</span>}</td>
                    <td className="px-4 py-3">
                      <span className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border ${typeColor[v.type] ?? 'bg-muted text-muted-foreground border-border'}`}>
                        {t(VARIABLE_TYPES.find(vt => vt.value === v.type)?.labelEn ?? v.type, VARIABLE_TYPES.find(vt => vt.value === v.type)?.labelFa ?? v.type)}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden lg:table-cell">
                      <span className="text-muted-foreground text-xs truncate max-w-[140px] block" title={v.datasetTitle ?? ''}>
                        {v.datasetTitle ?? '—'}
                      </span>
                    </td>
                    <td className="px-4 py-3 hidden xl:table-cell text-muted-foreground text-xs max-w-[160px] truncate" title={v.valuesRange ?? ''}>
                      {v.valuesRange ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEdit(v)}>
                          <Pencil className="h-3.5 w-3.5" />
                        </Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteVar(v)}>
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-2 mt-4">
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

      {/* Create / Edit Dialog */}
      <Dialog open={varDialog.open} onOpenChange={open => setVarDialog(s => ({ ...s, open }))}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {varDialog.mode === 'create' ? t('Add Variable', 'افزودن متغیر') : t('Edit Variable', 'ویرایش متغیر')}
            </DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">

            {/* Dataset assignment */}
            <div className="space-y-1 md:col-span-2">
              <Label>{t('Dataset', 'مجموعه داده')}<span className="text-destructive ms-0.5">*</span></Label>
              <Select
                value={varForm.datasetId}
                onValueChange={v => setVarForm(f => ({ ...f, datasetId: v }))}
              >
                <SelectTrigger><SelectValue placeholder={t('Select dataset', 'انتخاب مجموعه داده')} /></SelectTrigger>
                <SelectContent>
                  {datasets.map(ds => <SelectItem key={ds.id} value={String(ds.id)}>{ds.title}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>

            {/* Name */}
            <div className="space-y-1">
              <Label>{t('Variable Name (EN)', 'نام متغیر (EN)')}<span className="text-destructive ms-0.5">*</span></Label>
              <Input
                placeholder="e.g. age_at_diagnosis"
                value={varForm.name}
                onChange={e => setVarForm(f => ({ ...f, name: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>{t('Variable Name (FA)', 'نام متغیر (FA)')}</Label>
              <Input
                dir="rtl"
                placeholder="مثال: سن_تشخیص"
                value={varForm.nameFa}
                onChange={e => setVarForm(f => ({ ...f, nameFa: e.target.value }))}
              />
            </div>

            {/* Label */}
            <div className="space-y-1">
              <Label>{t('Label (EN)', 'برچسب (EN)')}<span className="text-destructive ms-0.5">*</span></Label>
              <Input
                placeholder={t('e.g. Age at Diagnosis', 'مثال: سن در زمان تشخیص')}
                value={varForm.label}
                onChange={e => setVarForm(f => ({ ...f, label: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>{t('Label (FA)', 'برچسب (FA)')}</Label>
              <Input
                dir="rtl"
                placeholder="مثال: سن در زمان تشخیص"
                value={varForm.labelFa}
                onChange={e => setVarForm(f => ({ ...f, labelFa: e.target.value }))}
              />
            </div>

            {/* Type */}
            <div className="space-y-1 md:col-span-2">
              <Label>{t('Data Type', 'نوع داده')}<span className="text-destructive ms-0.5">*</span></Label>
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                {VARIABLE_TYPES.map(vt => (
                  <button
                    key={vt.value}
                    type="button"
                    onClick={() => setVarForm(f => ({ ...f, type: vt.value }))}
                    className={`px-3 py-2 rounded-md border text-sm font-medium transition-colors ${
                      varForm.type === vt.value
                        ? 'bg-primary text-primary-foreground border-primary'
                        : 'bg-background hover:bg-muted border-border'
                    }`}
                  >
                    {t(vt.labelEn, vt.labelFa)}
                  </button>
                ))}
              </div>
            </div>

            {/* Description */}
            <div className="space-y-1 md:col-span-2">
              <Label>{t('Description (EN)', 'توضیح (EN)')}<span className="text-destructive ms-0.5">*</span></Label>
              <Textarea rows={2} placeholder={t('What does this variable measure?', 'این متغیر چه چیزی را اندازه می‌گیرد؟')} value={varForm.description} onChange={e => setVarForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="space-y-1 md:col-span-2">
              <Label>{t('Description (FA)', 'توضیح (FA)')}</Label>
              <Textarea rows={2} dir="rtl" value={varForm.descriptionFa} onChange={e => setVarForm(f => ({ ...f, descriptionFa: e.target.value }))} />
            </div>

            {/* Allowed values */}
            <div className="space-y-1">
              <Label>{t('Allowed Values (EN)', 'مقادیر مجاز (EN)')}</Label>
              <Input
                placeholder={t('e.g. 1=Male, 2=Female or 0–120', 'مثال: ۱=مرد، ۲=زن')}
                value={varForm.valuesRange}
                onChange={e => setVarForm(f => ({ ...f, valuesRange: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>{t('Allowed Values (FA)', 'مقادیر مجاز (FA)')}</Label>
              <Input
                dir="rtl"
                value={varForm.valuesRangeFa}
                onChange={e => setVarForm(f => ({ ...f, valuesRangeFa: e.target.value }))}
              />
            </div>

            {/* Missing value notes */}
            <div className="space-y-1">
              <Label>{t('Missing Value Notes (EN)', 'یادداشت مقادیر گمشده (EN)')}</Label>
              <Input
                placeholder={t('e.g. -9 = Not collected, blank = Unknown', 'مثال: ۹- = جمع‌آوری نشده')}
                value={varForm.missingValueNotes}
                onChange={e => setVarForm(f => ({ ...f, missingValueNotes: e.target.value }))}
              />
            </div>
            <div className="space-y-1">
              <Label>{t('Missing Value Notes (FA)', 'یادداشت مقادیر گمشده (FA)')}</Label>
              <Input
                dir="rtl"
                value={varForm.missingValueNotesFa}
                onChange={e => setVarForm(f => ({ ...f, missingValueNotesFa: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">{t('Cancel', 'لغو')}</Button></DialogClose>
            <Button onClick={handleSave}>{t('Save', 'ذخیره')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete confirmation */}
      <AlertDialog open={deleteVar !== null} onOpenChange={open => !open && setDeleteVar(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('Delete Variable?', 'حذف متغیر؟')}</AlertDialogTitle>
            <AlertDialogDescription>
              {t(
                `"${deleteVar?.name}" will be permanently removed from dataset "${deleteVar?.datasetTitle ?? ''}"`,
                `متغیر "${deleteVar?.nameFa || deleteVar?.name}" به طور دائمی حذف می‌شود.`
              )}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('Cancel', 'لغو')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
              {t('Delete', 'حذف')}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Admin Panel ───────────────────────────────────────────────────────────────

function AdminPanel() {
  const { t } = useLanguage();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [datasetDialog, setDatasetDialog] = useState<{ open: boolean; mode: 'create' | 'edit'; data?: Dataset }>({ open: false, mode: 'create' });
  const [datasetForm, setDatasetForm] = useState<DatasetForm>(emptyDatasetForm);
  const [deleteDatasetId, setDeleteDatasetId] = useState<number | null>(null);

  const [categoryDialog, setCategoryDialog] = useState<{ open: boolean; mode: 'create' | 'edit'; data?: Category }>({ open: false, mode: 'create' });
  const [categoryForm, setCategoryForm] = useState<CategoryForm>(emptyCategoryForm);
  const [deleteCategoryId, setDeleteCategoryId] = useState<number | null>(null);

  const { data: datasetsResp } = useListDatasets({ limit: 200 });
  const { data: categories } = useListCategories();
  const datasets = datasetsResp?.data ?? [];

  const createDataset = useCreateDataset();
  const updateDataset = useUpdateDataset();
  const deleteDataset = useDeleteDataset();
  const createCategory = useCreateCategory();
  const updateCategory = useUpdateCategory();
  const deleteCategory = useDeleteCategory();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: getListDatasetsQueryKey() });
    queryClient.invalidateQueries({ queryKey: getListCategoriesQueryKey() });
  };

  const handleSignOut = async () => {
    await fetch('/api/auth/admin-logout', {
      method: 'POST',
      credentials: 'same-origin',
    }).catch(() => undefined);
    sessionStorage.removeItem(SESSION_KEY);
    window.location.reload();
  };

  const openCreateDataset = () => { setDatasetForm(emptyDatasetForm); setDatasetDialog({ open: true, mode: 'create' }); };
  const openEditDataset = (ds: Dataset) => {
    setDatasetForm({
      title: ds.title, titleFa: ds.titleFa, description: ds.description, descriptionFa: ds.descriptionFa,
      recordsCount: String(ds.recordsCount), variablesCount: String(ds.variablesCount),
      yearStart: String(ds.yearStart), yearEnd: String(ds.yearEnd),
      geographicCoverage: ds.geographicCoverage, geographicCoverageFa: ds.geographicCoverageFa || '',
      dataSource: ds.dataSource, dataSourceFa: ds.dataSourceFa || '',
      officialSourceUrl: ds.officialSourceUrl || '',
      citationText: ds.citationText || '', citationDoi: ds.citationDoi || '',
      isFeatured: ds.isFeatured, categoryId: String(ds.categoryId),
    });
    setDatasetDialog({ open: true, mode: 'edit', data: ds });
  };

  const handleSaveDataset = () => {
    const payload = {
      title: datasetForm.title, titleFa: datasetForm.titleFa,
      description: datasetForm.description, descriptionFa: datasetForm.descriptionFa,
      recordsCount: parseInt(datasetForm.recordsCount) || 0,
      variablesCount: parseInt(datasetForm.variablesCount) || 0,
      yearStart: parseInt(datasetForm.yearStart) || 2000,
      yearEnd: parseInt(datasetForm.yearEnd) || 2023,
      geographicCoverage: datasetForm.geographicCoverage,
      geographicCoverageFa: datasetForm.geographicCoverageFa,
      dataSource: datasetForm.dataSource,
      dataSourceFa: datasetForm.dataSourceFa,
      officialSourceUrl: datasetForm.officialSourceUrl.trim() || null,
      citationText: datasetForm.citationText,
      citationDoi: datasetForm.citationDoi,
      isFeatured: datasetForm.isFeatured,
      categoryId: parseInt(datasetForm.categoryId),
    };
    if (datasetDialog.mode === 'create') {
      createDataset.mutate({ data: payload }, {
        onSuccess: () => { toast({ title: t('Dataset created', 'مجموعه داده ایجاد شد') }); setDatasetDialog({ open: false, mode: 'create' }); invalidate(); },
        onError: () => toast({ title: t('Error creating dataset', 'خطا در ایجاد'), variant: 'destructive' }),
      });
    } else if (datasetDialog.data) {
      updateDataset.mutate({ id: datasetDialog.data.id, data: payload }, {
        onSuccess: () => { toast({ title: t('Dataset updated', 'مجموعه داده به‌روز شد') }); setDatasetDialog({ open: false, mode: 'create' }); invalidate(); },
        onError: () => toast({ title: t('Error updating dataset', 'خطا در به‌روزرسانی'), variant: 'destructive' }),
      });
    }
  };

  const handleDeleteDataset = () => {
    if (deleteDatasetId == null) return;
    deleteDataset.mutate({ id: deleteDatasetId }, {
      onSuccess: () => { toast({ title: t('Dataset deleted', 'مجموعه داده حذف شد') }); setDeleteDatasetId(null); invalidate(); },
      onError: () => toast({ title: t('Error deleting', 'خطا در حذف'), variant: 'destructive' }),
    });
  };

  const openCreateCategory = () => { setCategoryForm(emptyCategoryForm); setCategoryDialog({ open: true, mode: 'create' }); };
  const openEditCategory = (cat: Category) => {
    setCategoryForm({ name: cat.name, nameFa: cat.nameFa, slug: cat.slug, description: cat.description || '', descriptionFa: cat.descriptionFa || '' });
    setCategoryDialog({ open: true, mode: 'edit', data: cat });
  };

  const handleSaveCategory = () => {
    if (categoryDialog.mode === 'create') {
      createCategory.mutate({ data: categoryForm }, {
        onSuccess: () => { toast({ title: t('Category created', 'دسته‌بندی ایجاد شد') }); setCategoryDialog({ open: false, mode: 'create' }); invalidate(); },
        onError: () => toast({ title: t('Error', 'خطا'), variant: 'destructive' }),
      });
    } else if (categoryDialog.data) {
      updateCategory.mutate({ id: categoryDialog.data.id, data: categoryForm }, {
        onSuccess: () => { toast({ title: t('Category updated', 'دسته‌بندی به‌روز شد') }); setCategoryDialog({ open: false, mode: 'create' }); invalidate(); },
        onError: () => toast({ title: t('Error', 'خطا'), variant: 'destructive' }),
      });
    }
  };

  const handleDeleteCategory = () => {
    if (deleteCategoryId == null) return;
    deleteCategory.mutate({ id: deleteCategoryId }, {
      onSuccess: () => { toast({ title: t('Category deleted', 'دسته‌بندی حذف شد') }); setDeleteCategoryId(null); invalidate(); },
      onError: () => toast({ title: t('Error', 'خطا'), variant: 'destructive' }),
    });
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-6xl">
      <div className="flex items-center justify-between gap-3 mb-8">
        <div className="flex items-center gap-3">
          <ShieldAlert className="h-7 w-7 text-primary" />
          <div>
            <h1 className="text-2xl font-bold">{t('Admin Panel', 'پنل مدیریت')}</h1>
            <p className="text-sm text-muted-foreground">{t('Manage datasets, variables, and categories', 'مدیریت مجموعه داده‌ها، متغیرها و دسته‌بندی‌ها')}</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={handleSignOut} className="gap-2 text-muted-foreground hover:text-foreground">
          <LogOut className="h-4 w-4" />
          {t('Sign out', 'خروج')}
        </Button>
      </div>

      <Tabs defaultValue="variables">
        <TabsList className="mb-6">
          <TabsTrigger value="variables">{t('Variables', 'متغیرها')}</TabsTrigger>
          <TabsTrigger value="datasets">{t('Datasets', 'مجموعه داده‌ها')}</TabsTrigger>
          <TabsTrigger value="categories">{t('Categories', 'دسته‌بندی‌ها')}</TabsTrigger>
          <TabsTrigger value="export">{t('Export', 'خروجی')}</TabsTrigger>
        </TabsList>

        {/* Variables tab */}
        <TabsContent value="variables">
          <VariablesTab datasets={datasets} />
        </TabsContent>

        {/* Datasets tab */}
        <TabsContent value="datasets">
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-muted-foreground">{datasets.length} {t('datasets', 'مجموعه داده')}</p>
            <Button size="sm" onClick={openCreateDataset} className="gap-2"><Plus className="h-4 w-4" />{t('Add Dataset', 'افزودن')}</Button>
          </div>
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-muted-foreground text-xs uppercase tracking-wider">
                <tr>
                  <th className="text-start px-4 py-3">{t('Title', 'عنوان')}</th>
                  <th className="text-start px-4 py-3 hidden md:table-cell">{t('Category', 'دسته‌بندی')}</th>
                  <th className="text-start px-4 py-3 hidden md:table-cell">{t('Records', 'رکوردها')}</th>
                  <th className="text-start px-4 py-3 hidden md:table-cell">{t('Featured', 'ویژه')}</th>
                  <th className="text-start px-4 py-3">{t('Actions', 'عملیات')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {datasets.map((ds) => (
                  <tr key={ds.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium max-w-xs truncate">{ds.title}</td>
                    <td className="px-4 py-3 hidden md:table-cell"><Badge variant="secondary" className="text-xs">{ds.categoryName ?? '—'}</Badge></td>
                    <td className="px-4 py-3 hidden md:table-cell text-muted-foreground">{ds.recordsCount.toLocaleString()}</td>
                    <td className="px-4 py-3 hidden md:table-cell">{ds.isFeatured && <Badge className="text-xs">{t('Yes', 'بله')}</Badge>}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditDataset(ds)}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteDatasetId(ds.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* Categories tab */}
        <TabsContent value="categories">
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-muted-foreground">{categories?.length ?? 0} {t('categories', 'دسته‌بندی')}</p>
            <Button size="sm" onClick={openCreateCategory} className="gap-2"><Plus className="h-4 w-4" />{t('Add Category', 'افزودن دسته‌بندی')}</Button>
          </div>
          <div className="rounded-lg border overflow-hidden">
            <table className="w-full text-sm">
              <thead className="bg-muted/50 text-muted-foreground text-xs uppercase tracking-wider">
                <tr>
                  <th className="text-start px-4 py-3">{t('Name', 'نام')}</th>
                  <th className="text-start px-4 py-3">{t('Persian Name', 'نام فارسی')}</th>
                  <th className="text-start px-4 py-3 hidden md:table-cell">{t('Slug', 'اسلاگ')}</th>
                  <th className="text-start px-4 py-3">{t('Datasets', 'مجموعه داده‌ها')}</th>
                  <th className="text-start px-4 py-3">{t('Actions', 'عملیات')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {categories?.map((cat) => (
                  <tr key={cat.id} className="hover:bg-muted/30 transition-colors">
                    <td className="px-4 py-3 font-medium">{cat.name}</td>
                    <td className="px-4 py-3">{cat.nameFa}</td>
                    <td className="px-4 py-3 hidden md:table-cell text-muted-foreground font-mono text-xs">{cat.slug}</td>
                    <td className="px-4 py-3 text-muted-foreground">{cat.datasetCount}</td>
                    <td className="px-4 py-3">
                      <div className="flex gap-1">
                        <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => openEditCategory(cat)}><Pencil className="h-3.5 w-3.5" /></Button>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:text-destructive" onClick={() => setDeleteCategoryId(cat.id)}><Trash2 className="h-3.5 w-3.5" /></Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </TabsContent>

        {/* Export tab */}
        <TabsContent value="export">
          <ExportTab t={t} />
        </TabsContent>
      </Tabs>

      {/* Dataset Dialog */}
      <Dialog open={datasetDialog.open} onOpenChange={(open) => setDatasetDialog(s => ({ ...s, open }))}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{datasetDialog.mode === 'create' ? t('Add Dataset', 'افزودن مجموعه داده') : t('Edit Dataset', 'ویرایش مجموعه داده')}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
            <div className="space-y-1"><Label>{t('Title (EN)', 'عنوان (EN)')}</Label><Input value={datasetForm.title} onChange={e => setDatasetForm(f => ({ ...f, title: e.target.value }))} /></div>
            <div className="space-y-1"><Label>{t('Title (FA)', 'عنوان (FA)')}</Label><Input value={datasetForm.titleFa} dir="rtl" onChange={e => setDatasetForm(f => ({ ...f, titleFa: e.target.value }))} /></div>
            <div className="space-y-1 md:col-span-2"><Label>{t('Description (EN)', 'توضیح (EN)')}</Label><Textarea rows={2} value={datasetForm.description} onChange={e => setDatasetForm(f => ({ ...f, description: e.target.value }))} /></div>
            <div className="space-y-1 md:col-span-2"><Label>{t('Description (FA)', 'توضیح (FA)')}</Label><Textarea rows={2} dir="rtl" value={datasetForm.descriptionFa} onChange={e => setDatasetForm(f => ({ ...f, descriptionFa: e.target.value }))} /></div>
            <div className="space-y-1"><Label>{t('Records Count', 'تعداد رکورد')}</Label><Input type="number" value={datasetForm.recordsCount} onChange={e => setDatasetForm(f => ({ ...f, recordsCount: e.target.value }))} /></div>
            <div className="space-y-1"><Label>{t('Variables Count', 'تعداد متغیر')}</Label><Input type="number" value={datasetForm.variablesCount} onChange={e => setDatasetForm(f => ({ ...f, variablesCount: e.target.value }))} /></div>
            <div className="space-y-1"><Label>{t('Year Start', 'سال شروع')}</Label><Input type="number" value={datasetForm.yearStart} onChange={e => setDatasetForm(f => ({ ...f, yearStart: e.target.value }))} /></div>
            <div className="space-y-1"><Label>{t('Year End', 'سال پایان')}</Label><Input type="number" value={datasetForm.yearEnd} onChange={e => setDatasetForm(f => ({ ...f, yearEnd: e.target.value }))} /></div>
            <div className="space-y-1"><Label>{t('Geographic Coverage (EN)', 'پوشش جغرافیایی (EN)')}</Label><Input value={datasetForm.geographicCoverage} onChange={e => setDatasetForm(f => ({ ...f, geographicCoverage: e.target.value }))} /></div>
            <div className="space-y-1"><Label>{t('Geographic Coverage (FA)', 'پوشش جغرافیایی (FA)')}</Label><Input dir="rtl" value={datasetForm.geographicCoverageFa} onChange={e => setDatasetForm(f => ({ ...f, geographicCoverageFa: e.target.value }))} /></div>
            <div className="space-y-1"><Label>{t('Data Source (EN)', 'منبع داده (EN)')}</Label><Input value={datasetForm.dataSource} onChange={e => setDatasetForm(f => ({ ...f, dataSource: e.target.value }))} /></div>
            <div className="space-y-1"><Label>{t('Data Source (FA)', 'منبع داده (FA)')}</Label><Input dir="rtl" value={datasetForm.dataSourceFa} onChange={e => setDatasetForm(f => ({ ...f, dataSourceFa: e.target.value }))} /></div>
            <div className="space-y-1 md:col-span-2">
              <Label>{t('Official Source URL', 'نشانی اینترنتی منبع رسمی')}</Label>
              <Input
                type="url"
                placeholder="https://example.org/registry"
                value={datasetForm.officialSourceUrl}
                onChange={e => setDatasetForm(f => ({ ...f, officialSourceUrl: e.target.value }))}
              />
              <p className="text-xs text-muted-foreground">
                {t('Optional. Link to the official university, hospital, center, or institution source.', 'اختیاری. پیوند به منبع رسمی دانشگاه، بیمارستان، مرکز یا مؤسسه.')}
              </p>
            </div>
            <div className="space-y-1 md:col-span-2"><Label>{t('Citation Text', 'متن استناد')}</Label><Textarea rows={2} value={datasetForm.citationText} onChange={e => setDatasetForm(f => ({ ...f, citationText: e.target.value }))} /></div>
            <div className="space-y-1"><Label>DOI</Label><Input value={datasetForm.citationDoi} onChange={e => setDatasetForm(f => ({ ...f, citationDoi: e.target.value }))} /></div>
            <div className="space-y-1">
              <Label>{t('Category', 'دسته‌بندی')}</Label>
              <Select value={datasetForm.categoryId} onValueChange={v => setDatasetForm(f => ({ ...f, categoryId: v }))}>
                <SelectTrigger><SelectValue placeholder={t('Select category', 'انتخاب دسته‌بندی')} /></SelectTrigger>
                <SelectContent>{categories?.map(c => <SelectItem key={c.id} value={String(c.id)}>{c.name}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-3">
              <Switch checked={datasetForm.isFeatured} onCheckedChange={v => setDatasetForm(f => ({ ...f, isFeatured: v }))} id="featured" />
              <Label htmlFor="featured">{t('Featured', 'ویژه')}</Label>
            </div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">{t('Cancel', 'لغو')}</Button></DialogClose>
            <Button onClick={handleSaveDataset}>{t('Save', 'ذخیره')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Category Dialog */}
      <Dialog open={categoryDialog.open} onOpenChange={(open) => setCategoryDialog(s => ({ ...s, open }))}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>{categoryDialog.mode === 'create' ? t('Add Category', 'افزودن دسته‌بندی') : t('Edit Category', 'ویرایش دسته‌بندی')}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="space-y-1"><Label>{t('Name (EN)', 'نام (EN)')}</Label><Input value={categoryForm.name} onChange={e => setCategoryForm(f => ({ ...f, name: e.target.value }))} /></div>
            <div className="space-y-1"><Label>{t('Name (FA)', 'نام (FA)')}</Label><Input dir="rtl" value={categoryForm.nameFa} onChange={e => setCategoryForm(f => ({ ...f, nameFa: e.target.value }))} /></div>
            <div className="space-y-1 col-span-2"><Label>{t('Slug', 'اسلاگ')}</Label><Input value={categoryForm.slug} onChange={e => setCategoryForm(f => ({ ...f, slug: e.target.value }))} /></div>
            <div className="space-y-1 col-span-2"><Label>{t('Description (EN)', 'توضیح (EN)')}</Label><Textarea rows={2} value={categoryForm.description} onChange={e => setCategoryForm(f => ({ ...f, description: e.target.value }))} /></div>
            <div className="space-y-1 col-span-2"><Label>{t('Description (FA)', 'توضیح (FA)')}</Label><Textarea rows={2} dir="rtl" value={categoryForm.descriptionFa} onChange={e => setCategoryForm(f => ({ ...f, descriptionFa: e.target.value }))} /></div>
          </div>
          <DialogFooter>
            <DialogClose asChild><Button variant="outline">{t('Cancel', 'لغو')}</Button></DialogClose>
            <Button onClick={handleSaveCategory}>{t('Save', 'ذخیره')}</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Dataset Alert */}
      <AlertDialog open={deleteDatasetId !== null} onOpenChange={(open) => !open && setDeleteDatasetId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('Delete Dataset?', 'حذف مجموعه داده؟')}</AlertDialogTitle>
            <AlertDialogDescription>{t('This action cannot be undone. All variables in this dataset will also be deleted.', 'این عملیات قابل بازگشت نیست. تمام متغیرهای این مجموعه داده نیز حذف می‌شوند.')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('Cancel', 'لغو')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteDataset} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{t('Delete', 'حذف')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Delete Category Alert */}
      <AlertDialog open={deleteCategoryId !== null} onOpenChange={(open) => !open && setDeleteCategoryId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>{t('Delete Category?', 'حذف دسته‌بندی؟')}</AlertDialogTitle>
            <AlertDialogDescription>{t('All datasets in this category will be unlinked.', 'تمام مجموعه داده‌های این دسته‌بندی جدا می‌شوند.')}</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>{t('Cancel', 'لغو')}</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteCategory} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">{t('Delete', 'حذف')}</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

// ─── Root export ───────────────────────────────────────────────────────────────

export default function Admin() {
  const { t } = useLanguage();
  const [authenticated, setAuthenticated] = useState(() => sessionStorage.getItem(SESSION_KEY) === '1');
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    fetch('/api/auth/admin-session', { credentials: 'same-origin' })
      .then((response) => response.json())
      .then((data: { authenticated?: boolean }) => {
        const isAuthenticated = data.authenticated === true;
        setAuthenticated(isAuthenticated);
        if (!isAuthenticated) sessionStorage.removeItem(SESSION_KEY);
      })
      .catch(() => {
        setAuthenticated(false);
        sessionStorage.removeItem(SESSION_KEY);
      })
      .finally(() => setCheckingSession(false));
  }, []);

  if (checkingSession) {
    return <div className="min-h-[70vh] flex items-center justify-center text-sm text-muted-foreground">{t('Checking admin session...', 'در حال بررسی نشست مدیریت...')}</div>;
  }

  if (!authenticated) {
    return <AdminLogin onSuccess={() => setAuthenticated(true)} />;
  }

  return <AdminPanel />;
}
