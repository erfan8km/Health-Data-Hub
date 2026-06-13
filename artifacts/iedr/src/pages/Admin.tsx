import React, { useState, useEffect } from 'react';
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
  getListDatasetsQueryKey,
  getListCategoriesQueryKey,
} from '@workspace/api-client-react';
import type { Dataset, Category } from '@workspace/api-client-react';
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
import { Plus, Pencil, Trash2, ShieldAlert, Lock, Eye, EyeOff, LogOut } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const SESSION_KEY = 'iedr_admin_auth';

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
          {t('Set ADMIN_PASSWORD in your environment to configure access.', 'متغیر ADMIN_PASSWORD را در محیط خود تنظیم کنید.')}
        </p>
      </div>
    </div>
  );
}

type DatasetForm = {
  title: string; titleFa: string;
  description: string; descriptionFa: string;
  recordsCount: string; variablesCount: string;
  yearStart: string; yearEnd: string;
  geographicCoverage: string; geographicCoverageFa: string;
  dataSource: string; dataSourceFa: string;
  citationText: string; citationDoi: string;
  isFeatured: boolean; categoryId: string;
};

const emptyDatasetForm: DatasetForm = {
  title: '', titleFa: '', description: '', descriptionFa: '',
  recordsCount: '0', variablesCount: '0',
  yearStart: '2000', yearEnd: '2023',
  geographicCoverage: '', geographicCoverageFa: '',
  dataSource: '', dataSourceFa: '',
  citationText: '', citationDoi: '',
  isFeatured: false, categoryId: '',
};

type CategoryForm = { name: string; nameFa: string; slug: string; description: string; descriptionFa: string; };
const emptyCategoryForm: CategoryForm = { name: '', nameFa: '', slug: '', description: '', descriptionFa: '' };

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

  const { data: datasetsResp } = useListDatasets({ limit: 100 });
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

  const handleSignOut = () => {
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
            <p className="text-sm text-muted-foreground">{t('Manage datasets, categories, and metadata', 'مدیریت مجموعه داده‌ها، دسته‌بندی‌ها و متادیتا')}</p>
          </div>
        </div>
        <Button variant="ghost" size="sm" onClick={handleSignOut} className="gap-2 text-muted-foreground hover:text-foreground">
          <LogOut className="h-4 w-4" />
          {t('Sign out', 'خروج')}
        </Button>
      </div>

      <Tabs defaultValue="datasets">
        <TabsList className="mb-6">
          <TabsTrigger value="datasets">{t('Datasets', 'مجموعه داده‌ها')}</TabsTrigger>
          <TabsTrigger value="categories">{t('Categories', 'دسته‌بندی‌ها')}</TabsTrigger>
        </TabsList>

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
      </Tabs>

      {/* Dataset Dialog */}
      <Dialog open={datasetDialog.open} onOpenChange={(open) => setDatasetDialog(s => ({ ...s, open }))}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{datasetDialog.mode === 'create' ? t('Add Dataset', 'افزودن مجموعه داده') : t('Edit Dataset', 'ویرایش مجموعه داده')}</DialogTitle>
          </DialogHeader>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 py-2">
            <div className="space-y-1"><Label>{t('Title (EN)', 'عنوان (انگلیسی)')}</Label><Input value={datasetForm.title} onChange={e => setDatasetForm(f => ({ ...f, title: e.target.value }))} /></div>
            <div className="space-y-1"><Label>{t('Title (FA)', 'عنوان (فارسی)')}</Label><Input value={datasetForm.titleFa} dir="rtl" onChange={e => setDatasetForm(f => ({ ...f, titleFa: e.target.value }))} /></div>
            <div className="space-y-1 md:col-span-2"><Label>{t('Description (EN)', 'توضیح (انگلیسی)')}</Label><Textarea rows={2} value={datasetForm.description} onChange={e => setDatasetForm(f => ({ ...f, description: e.target.value }))} /></div>
            <div className="space-y-1 md:col-span-2"><Label>{t('Description (FA)', 'توضیح (فارسی)')}</Label><Textarea rows={2} dir="rtl" value={datasetForm.descriptionFa} onChange={e => setDatasetForm(f => ({ ...f, descriptionFa: e.target.value }))} /></div>
            <div className="space-y-1"><Label>{t('Records Count', 'تعداد رکورد')}</Label><Input type="number" value={datasetForm.recordsCount} onChange={e => setDatasetForm(f => ({ ...f, recordsCount: e.target.value }))} /></div>
            <div className="space-y-1"><Label>{t('Variables Count', 'تعداد متغیر')}</Label><Input type="number" value={datasetForm.variablesCount} onChange={e => setDatasetForm(f => ({ ...f, variablesCount: e.target.value }))} /></div>
            <div className="space-y-1"><Label>{t('Year Start', 'سال شروع')}</Label><Input type="number" value={datasetForm.yearStart} onChange={e => setDatasetForm(f => ({ ...f, yearStart: e.target.value }))} /></div>
            <div className="space-y-1"><Label>{t('Year End', 'سال پایان')}</Label><Input type="number" value={datasetForm.yearEnd} onChange={e => setDatasetForm(f => ({ ...f, yearEnd: e.target.value }))} /></div>
            <div className="space-y-1"><Label>{t('Geographic Coverage (EN)', 'پوشش جغرافیایی (EN)')}</Label><Input value={datasetForm.geographicCoverage} onChange={e => setDatasetForm(f => ({ ...f, geographicCoverage: e.target.value }))} /></div>
            <div className="space-y-1"><Label>{t('Geographic Coverage (FA)', 'پوشش جغرافیایی (FA)')}</Label><Input dir="rtl" value={datasetForm.geographicCoverageFa} onChange={e => setDatasetForm(f => ({ ...f, geographicCoverageFa: e.target.value }))} /></div>
            <div className="space-y-1"><Label>{t('Data Source (EN)', 'منبع داده (EN)')}</Label><Input value={datasetForm.dataSource} onChange={e => setDatasetForm(f => ({ ...f, dataSource: e.target.value }))} /></div>
            <div className="space-y-1"><Label>{t('Data Source (FA)', 'منبع داده (FA)')}</Label><Input dir="rtl" value={datasetForm.dataSourceFa} onChange={e => setDatasetForm(f => ({ ...f, dataSourceFa: e.target.value }))} /></div>
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
            <AlertDialogDescription>{t('This action cannot be undone.', 'این عملیات قابل بازگشت نیست.')}</AlertDialogDescription>
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

export default function Admin() {
  const [authenticated, setAuthenticated] = useState(() => sessionStorage.getItem(SESSION_KEY) === '1');

  useEffect(() => {
    setAuthenticated(sessionStorage.getItem(SESSION_KEY) === '1');
  }, []);

  if (!authenticated) {
    return <AdminLogin onSuccess={() => setAuthenticated(true)} />;
  }

  return <AdminPanel />;
}
