import { useEffect, useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

interface AdminUser {
    _id: string;
    name: string;
    email: string;
    avatar?: string;
    role: string;
    createdAt: string;
}


export default function AdminUsers() {
    const [users, setUsers] = useState<AdminUser[]>([]);
    const [page, setPage] = useState(1);
    const [pagination, setPagination] = useState({ page: 1, limit: 10, total: 0, pages: 0 });
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [retry, setRetry] = useState(0);

    useEffect(() => {
        const controller = new AbortController();
        fetch(`/api/admin/users?page=${page}&limit=10`, { signal: controller.signal })
            .then(res => {
                if (!res.ok) throw new Error('Failed to load users. Please try again.');
                return res.json();
            })
            .then(data => {
                if (controller.signal.aborted) return;
                setUsers(data.data || []);
                setPagination(data.pagination);
            })
            .catch(() => {
                if (!controller.signal.aborted) setError('Failed to load users. Please try again.');
            })
            .finally(() => {
                if (!controller.signal.aborted) setLoading(false);
            });
        return () => controller.abort();
    }, [page, retry]);

    function changePage(nextPage: number) {
        setLoading(true);
        setError(null);
        setPage(nextPage);
    }

    if (loading) return <div>Loading users...</div>;

    if (error) return (
        <div className="space-y-4">
            <p role="alert">{error}</p>
            <Button onClick={() => {
                setLoading(true);
                setError(null);
                setRetry(value => value + 1);
            }}>Retry</Button>
        </div>
    );

    return (
        <div className="space-y-6">
            <h1 className="text-2xl font-bold text-gray-900 dark:text-white">User Management</h1>
            {users.length === 0 && <p>No users found.</p>}
            <div className="space-y-4">
                {users.map(user => (
                    <Card key={user._id}>
                        <CardContent className="p-4 flex items-center justify-between">
                            <div className="flex items-center gap-4">
                                <img src={user.avatar} className="w-10 h-10 rounded-full" alt="" />
                                <div>
                                    <h3 className="font-bold text-gray-900 dark:text-white">{user.name}</h3>
                                    <p className="text-sm text-gray-500">{user.email}</p>
                                </div>
                            </div>
                            <div className="flex items-center gap-3">
                                <Badge variant={user.role === 'admin' ? 'default' : 'secondary'}>
                                    {user.role}
                                </Badge>
                                <span className="text-sm text-gray-400">
                                    Joined: {new Date(user.createdAt).toLocaleDateString()}
                                </span>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>
            {pagination.total > 0 && (
                <nav aria-label="Users pagination" className="flex flex-wrap items-center justify-between gap-4">
                    <p className="text-sm text-gray-500">
                        Showing {(pagination.page - 1) * pagination.limit + 1} to {Math.min(pagination.page * pagination.limit, pagination.total)} of {pagination.total} users
                    </p>
                    <div className="flex items-center gap-3">
                        <Button variant="outline" onClick={() => changePage(page - 1)} disabled={page <= 1}>Previous</Button>
                        <span className="text-sm">Page {pagination.page} of {pagination.pages}</span>
                        <Button variant="outline" onClick={() => changePage(page + 1)} disabled={page >= pagination.pages}>Next</Button>
                    </div>
                </nav>
            )}
        </div>
    );
}
