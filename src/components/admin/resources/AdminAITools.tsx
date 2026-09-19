import { useEffect, useState, useCallback } from 'react';
import AdminDataTable from '../AdminDataTable';
import ResourceDialog from '../ResourceDialog';
import { useResourceCRUD } from '../useResourceCRUD';
import { ExternalLink } from 'lucide-react';
import type { AdminAITool, AdminListParams, AdminListResponse } from './types';
import type { FilterOption } from '@/lib/api';
import { TOOL_DETAIL_LISTS } from '@/components/submit/ToolDetailsFields';
import { parseLines } from '@/components/submit/form';

const API_PATH = '/api/admin/ai-tools';

export default function AdminAITools() {
  const [data, setData] = useState<AdminAITool[]>([]);
  const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 0 });
  const [loading, setLoading] = useState(true);
  const [params, setParams] = useState<AdminListParams>({
    page: 1,
    search: '',
    sortBy: 'createdAt',
    order: 'desc',
  });
  const [categories, setCategories] = useState<FilterOption[]>([]);
  const [pricing, setPricing] = useState<FilterOption[]>([]);
  const [saveError, setSaveError] = useState('');
  const [saving, setSaving] = useState(false);

  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const query = new URLSearchParams({
        page: params.page.toString(),
        limit: '10',
        search: params.search,
        sortBy: params.sortBy,
        order: params.order,
      });
      const res = await fetch(`${API_PATH}?${query}`);
      const result: AdminListResponse<AdminAITool> = await res.json();
      setData(result.data);
      setPagination(result.pagination);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }, [params]);

  useEffect(() => { fetchData(); }, [fetchData]);

  // Load categories for the multi-select
  useEffect(() => {
    fetch('/api/filters').then(r => r.json()).then(result => setPricing(result.pricing ?? [])).catch(console.error);
    fetch('/api/admin/categories?limit=200')
      .then(r => r.json())
      .then(result => setCategories(result.data ?? []))
      .catch(console.error);
  }, []);

  const crud = useResourceCRUD(API_PATH, fetchData);

  const fields = [
    { key: 'name', label: 'Name', required: true, placeholder: 'e.g. GitHub Copilot' },
    { key: 'description', label: 'Description', type: 'textarea' as const, required: true, placeholder: 'Brief description of the tool' },
    { key: 'url', label: 'URL', type: 'url' as const, required: true, placeholder: 'https://example.com' },
    { key: 'tags', label: 'Tags (comma-separated)', placeholder: 'coding, ai, assistant' },
    {
      key: 'categories',
      label: 'Categories',
      type: 'multi-select' as const,
      required: true,
      options: categories,
    },
    { key: 'pricing', label: 'Pricing tiers', type: 'multi-select' as const, options: pricing },
    ...TOOL_DETAIL_LISTS.map(field => ({ ...field, label: `${field.label} (one per line)`, type: 'textarea' as const })),
    { key: 'pricingDetails', label: 'Pricing details', type: 'textarea' as const },
    { key: 'pricingUrl', label: 'Pricing source URL', type: 'url' as const },
    { key: 'pricingCheckedAt', label: 'Date contributor checked pricing', type: 'date' as const },
  ];

  const handleOpenEdit = (row: AdminAITool) => {
    // Normalize categories to array of _ids for the dialog
    const categoryIds = (row as any).categories?.map((c: any) =>
      typeof c === 'string' ? c : c._id
    ) ?? [];
    const tagsStr = Array.isArray(row.tags) ? row.tags.join(', ') : row.tags ?? '';
    crud.openEdit({ ...row, categories: categoryIds, tags: tagsStr,
      pricing: row.pricing?.map(p => typeof p === 'string' ? p : p._id) ?? [],
      ...Object.fromEntries(TOOL_DETAIL_LISTS.map(({ key }) => [key, (row[key] ?? []).join('\n')])),
    });
  };

  const handleConfirm = async () => {
    if (saving) return;
    setSaving(true);
    setSaveError('');
    // Build the normalized payload directly (don't rely on state mutation timing)
    const payload = {
      ...crud.formValues,
      tags: typeof crud.formValues.tags === 'string'
        ? crud.formValues.tags.split(',').map((t: string) => t.trim()).filter(Boolean)
        : crud.formValues.tags ?? [],
      ...Object.fromEntries(TOOL_DETAIL_LISTS.map(({ key }) => [key, parseLines(crud.formValues[key] || '')])),
    };

    const isEdit = crud.dialogMode === 'edit';
    const isDelete = crud.dialogMode === 'delete';
    const url = isEdit || isDelete
      ? `${API_PATH}/${crud.selectedRecord!._id}`
      : API_PATH;
    const method = isDelete ? 'DELETE' : isEdit ? 'PUT' : 'POST';

    try {
      const res = await fetch(url, {
        method,
        headers: isDelete ? undefined : { 'Content-Type': 'application/json' },
        body: isDelete ? undefined : JSON.stringify(payload),
      });
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? `Request failed: ${res.status}`);
      }
      fetchData();
      crud.close();
    } catch (err: any) {
      // surface error via the crud hook's error state
      console.error('AdminAITools mutation failed:', err.message);
      setSaveError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const columns = [
    { key: 'name', label: 'Name', sortable: true },
    {
      key: 'categories',
      label: 'Categories',
      render: (row: AdminAITool) => {
        const cats = (row as any).categories;
        if (!cats?.length) return <span className="text-gray-400 italic text-sm">—</span>;
        return (
          <div className="flex flex-wrap gap-1">
            {cats.map((c: any) => (
              <span key={c._id ?? c} className="px-2 py-0.5 rounded-full bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 text-xs font-medium">
                {c.name ?? c}
              </span>
            ))}
          </div>
        );
      },
    },
    {
      key: 'url',
      label: 'Link',
      render: (row: AdminAITool) => (
        <a href={row.url} target="_blank" rel="noopener noreferrer" className="text-blue-600 hover:text-blue-500">
          <ExternalLink className="h-4 w-4" />
        </a>
      ),
    },
    {
      key: 'addedDate',
      label: 'Added',
      sortable: true,
      render: (row: AdminAITool) => new Date(row.addedDate).toLocaleDateString(),
    },
  ];

  const dialogTitle =
    crud.dialogMode === 'create' ? 'Add AI Tool'
    : crud.dialogMode === 'edit' ? 'Edit AI Tool'
    : 'Delete AI Tool';

  return (
    <>
      <AdminDataTable
        title="AI Tools"
        columns={columns}
        data={data}
        pagination={pagination}
        isLoading={loading}
        onPageChange={(p) => setParams(prev => ({ ...prev, page: p }))}
        onSearch={(q) => setParams(prev => ({ ...prev, search: q, page: 1 }))}
        onSort={(key) => setParams(prev => ({ ...prev, sortBy: key, order: prev.order === 'asc' ? 'desc' : 'asc' }))}
        onAdd={() => crud.openCreate({ categories: [], tags: '' })}
        onEdit={handleOpenEdit}
        onDelete={crud.openDelete}
      />

      {crud.dialogMode && (
        <ResourceDialog
          mode={crud.dialogMode}
          title={dialogTitle}
          fields={fields}
          values={crud.formValues}
          onChange={crud.handleChange}
          onConfirm={handleConfirm}
          onClose={crud.close}
          loading={saving}
          recordName={(crud.selectedRecord as any)?.name}
        />
      )}

      {(saveError || crud.error) && (
        <div className="fixed bottom-4 right-4 z-50 bg-red-50 dark:bg-red-900/30 border border-red-200 dark:border-red-800 text-red-700 dark:text-red-300 rounded-lg px-4 py-3 text-sm shadow-lg">
          {saveError || crud.error}
        </div>
      )}
    </>
  );
}
