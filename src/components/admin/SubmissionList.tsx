import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { CheckCircle, XCircle, ExternalLink, Code, Wrench, Loader2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { CategoryPicker } from '../submit/CategoryPicker';
import type { CategoryOption } from '../submit/form';

interface Submission {
  _id: string;
  type: 'mcp' | 'tool' | 'client';
  data: {
    name: string;
    description: string;
    url: string;
    category?: string;
    categories?: string[];
  };
  user: {
    name: string;
    email: string;
  };
  status: string;
  createdAt: string;
}

export default function SubmissionList() {
  const [submissions, setSubmissions] = useState<Submission[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [selectedCategories, setSelectedCategories] = useState<Record<string, string[]>>({});
  const [categoryError, setCategoryError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchSubmissions() {
      try {
        const res = await fetch('/api/admin/submissions');
        if (res.ok) {
          const data = await res.json();
          setSubmissions(data);
          setSelectedCategories(Object.fromEntries(data.map((submission: Submission) => [
            submission._id,
            submission.data.categories?.length ? submission.data.categories : submission.data.category ? [submission.data.category] : [],
          ])));
        }
      } catch (error) {
        console.error('Failed to fetch submissions', error);
      } finally {
        setLoading(false);
      }
    }

    fetchSubmissions();
    fetch('/api/filters')
      .then(async res => {
        if (!res.ok) throw new Error('Failed to load categories. Reload to try again.');
        const data = await res.json();
        setCategories(data.categories || []);
      })
      .catch(() => setCategoryError('Failed to load categories. Reload to try again.'));
  }, []);

  async function handleAction(id: string, action: 'approve' | 'reject') {
    setProcessingId(id);
    setError(null);
    try {
        const res = await fetch(`/api/admin/submissions/${id}/${action}`, {
            method: 'POST',
            ...(action === 'approve' ? {
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ categories: selectedCategories[id] || [] }),
            } : {})
        });
        if (res.ok) {
            setSubmissions(prev => prev.filter(s => s._id !== id));
        } else {
            const data = await res.json().catch(() => ({}));
            setError(data.error || data.details || `Failed to ${action} submission (${res.status})`);
        }
    } catch (err) {
        setError(`Network error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
        setProcessingId(null);
    }
  }

  if (loading) return <div>Loading submissions...</div>;

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-900 dark:text-white">Pending Submissions</h1>

      {categoryError && <p role="alert" className="text-red-600">{categoryError}</p>}
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg">
          {error}
        </div>
      )}

      {submissions.length === 0 ? (
        <Card>
            <CardContent className="p-12 text-center text-gray-500">
                No pending submissions found. Good job!
            </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
            {submissions.map((submission) => (
                <Card key={submission._id}>
                    <CardContent className="p-6">
                        <div className="flex flex-col lg:flex-row gap-6 justify-between items-start">
                             <div className="flex-1 space-y-2">
                                <div className="flex items-center gap-3">
                                    <Badge variant={submission.type === 'mcp' ? 'default' : 'secondary'} className="flex items-center gap-1">
                                        {submission.type === 'mcp' ? <Code className="h-3 w-3" /> : <Wrench className="h-3 w-3" />}
                                        {submission.type === 'mcp' ? 'MCP Server' : submission.type === 'client' ? 'MCP Client' : 'AI Tool'}
                                    </Badge>
                                    <span className="text-sm text-gray-500">
                                        by {submission.user?.name} ({submission.user?.email})
                                    </span>
                                    <span className="text-sm text-gray-400">
                                        {new Date(submission.createdAt).toLocaleDateString()}
                                    </span>
                                </div>
                                <h3 className="text-xl font-bold">{submission.data.name}</h3>
                                <p className="text-gray-600 dark:text-gray-300">{submission.data.description}</p>
                                <div className="flex items-center gap-4 text-sm mt-2">
                                     <a href={submission.data.url} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 text-blue-600 hover:underline">
                                        <ExternalLink className="h-4 w-4" />
                                        View Resource
                                     </a>

                                </div>
                                <fieldset disabled={!!processingId}>
                                  <CategoryPicker
                                    available={categories}
                                    selectedIds={selectedCategories[submission._id] || []}
                                    onChange={ids => setSelectedCategories(prev => ({ ...prev, [submission._id]: ids }))}
                                  />
                                </fieldset>
                                {submission.type === 'tool' && !selectedCategories[submission._id]?.length && (
                                  <p className="text-sm text-amber-700">Select at least one category before approving.</p>
                                )}
                             </div>

                             <div className="flex items-center gap-3">
                                <Button 
                                    size="sm" 
                                    variant="outline"
                                    className="text-red-600 hover:bg-red-50 hover:text-red-700 hover:border-red-200"
                                    onClick={() => handleAction(submission._id, 'reject')}
                                    disabled={!!processingId}
                                >
                                    {processingId === submission._id ? <Loader2 className="h-4 w-4 animate-spin" /> : <XCircle className="h-4 w-4 mr-1" />}
                                    Reject
                                </Button>
                                <Button 
                                    size="sm"
                                    className="bg-green-600 hover:bg-green-700 text-white"
                                    onClick={() => handleAction(submission._id, 'approve')}
                                    disabled={!!processingId || (submission.type === 'tool' && !selectedCategories[submission._id]?.length)}
                                >
                                    {processingId === submission._id ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle className="h-4 w-4 mr-1" />}
                                    Approve
                                </Button>
                             </div>
                        </div>
                    </CardContent>
                </Card>
            ))}
        </div>
      )}
    </div>
  );
}
