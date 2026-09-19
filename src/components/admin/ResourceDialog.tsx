import React, { useEffect, useRef } from 'react';
import { X, Trash2, Save, Plus, Loader2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export type FieldType = 'text' | 'textarea' | 'url' | 'date' | 'multi-select';

export interface FieldDef {
  key: string;
  label: string;
  type?: FieldType; // defaults to 'text'
  required?: boolean;
  placeholder?: string;
  /** For multi-select: the available options list */
  options?: Array<{ _id: string; name: string; slug: string }>;
}

export type DialogMode = 'create' | 'edit' | 'delete';

export interface ResourceDialogProps {
  mode: DialogMode;
  title: string;
  fields: FieldDef[];
  /** Current form values (key → value). For multi-select, value is string[] of _ids. */
  values: Record<string, any>;
  onChange: (key: string, value: any) => void;
  onConfirm: () => Promise<void>;
  onClose: () => void;
  loading?: boolean;
  /** Name of the record being deleted (shown in confirmation text) */
  recordName?: string;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function ResourceDialog({
  mode,
  title,
  fields,
  values,
  onChange,
  onConfirm,
  onClose,
  loading = false,
  recordName,
}: ResourceDialogProps) {
  const backdropRef = useRef<HTMLDivElement>(null);

  // Close on Escape
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const handleBackdrop = (e: React.MouseEvent) => {
    if (e.target === backdropRef.current) onClose();
  };

  const toggleMultiSelect = (key: string, id: string) => {
    const current: string[] = Array.isArray(values[key]) ? values[key] : [];
    const next = current.includes(id) ? current.filter(v => v !== id) : [...current, id];
    onChange(key, next);
  };

  const isDelete = mode === 'delete';

  return (
    <div
      ref={backdropRef}
      onClick={handleBackdrop}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4"
    >
      <div className="bg-white dark:bg-gray-900 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] flex flex-col border border-gray-200 dark:border-gray-700 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-gray-800">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-white">{title}</h2>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
          {isDelete ? (
            <p className="text-sm text-gray-600 dark:text-gray-400">
              Are you sure you want to delete{' '}
              <span className="font-semibold text-gray-900 dark:text-white">
                {recordName ?? 'this record'}
              </span>
              ? This action cannot be undone.
            </p>
          ) : (
            fields.map(field => {
              const fieldType = field.type ?? 'text';
              const value = values[field.key] ?? '';

              return (
                <div key={field.key}>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
                    {field.label}
                    {field.required && <span className="text-red-500 ml-0.5">*</span>}
                  </label>

                  {fieldType === 'textarea' ? (
                    <Textarea
                      value={value}
                      onChange={e => onChange(field.key, e.target.value)}
                      placeholder={field.placeholder}
                      rows={3}
                      className="resize-none"
                    />
                  ) : fieldType === 'multi-select' ? (
                    <div className="flex flex-wrap gap-2 p-3 rounded-lg border border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 min-h-[2.5rem]">
                      {(field.options ?? []).length === 0 ? (
                        <span className="text-sm text-gray-400 italic">No options available</span>
                      ) : (
                        (field.options ?? []).map(opt => {
                          const selected = Array.isArray(value) && value.includes(opt._id);
                          return (
                            <button
                              key={opt._id}
                              type="button"
                              onClick={() => toggleMultiSelect(field.key, opt._id)}
                              className={`px-3 py-1 rounded-full text-xs font-medium transition-all border ${
                                selected
                                  ? 'bg-blue-600 text-white border-blue-600 shadow-sm'
                                  : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600 hover:border-blue-400'
                              }`}
                            >
                              {opt.name}
                            </button>
                          );
                        })
                      )}
                    </div>
                  ) : (
                    <Input
                      type={fieldType === 'url' || fieldType === 'date' ? fieldType : 'text'}
                      value={value}
                      onChange={e => onChange(field.key, e.target.value)}
                      placeholder={field.placeholder}
                    />
                  )}
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-3 px-6 py-4 border-t border-gray-100 dark:border-gray-800">
          <Button variant="outline" onClick={onClose} disabled={loading}>
            Cancel
          </Button>
          <Button
            onClick={onConfirm}
            disabled={loading}
            className={
              isDelete
                ? 'bg-red-600 hover:bg-red-700 text-white'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : isDelete ? (
              <Trash2 className="w-4 h-4 mr-2" />
            ) : mode === 'create' ? (
              <Plus className="w-4 h-4 mr-2" />
            ) : (
              <Save className="w-4 h-4 mr-2" />
            )}
            {isDelete ? 'Delete' : mode === 'create' ? 'Create' : 'Save Changes'}
          </Button>
        </div>
      </div>
    </div>
  );
}
