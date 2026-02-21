import React, { useState, useEffect, useCallback } from 'react';
import { HashRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Modal } from './components/Modal';
import { api } from './services/api';
import {
    User, SuperAdmin, Company, PageableResponse,
    CreateCompanyRequest, CreateSuperAdminRequest, CreateUserRequest,
    SmsBalanceData
} from './types';
import {
    Plus, Edit2, Trash2, Power, Search,
    ChevronLeft, ChevronRight, Loader2, CheckCircle2, XCircle,
    Building2, Users, ShieldCheck, AlertTriangle, RefreshCw,
    Eye, Copy, Check, Filter, MessageSquare, CreditCard
} from 'lucide-react';

// --- Helper Components ---

const CopyableDetail = ({ label, value }: { label: string, value: string | number | boolean }) => {
    const [copied, setCopied] = useState(false);

    const handleCopy = () => {
        if (!value) return;
        navigator.clipboard.writeText(String(value));
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
    };

    return (
        <div className="flex justify-between items-center py-2.5 border-b border-gray-100 last:border-0 group">
            <span className="text-sm font-medium text-gray-500">{label}</span>
            <div className="flex items-center gap-3 pl-4">
                <span className="text-sm text-gray-900 font-medium text-right max-w-[200px] truncate" title={String(value)}>
                    {String(value)}
                </span>
                <button
                    onClick={handleCopy}
                    className="p-1 rounded-md text-gray-400 hover:text-blue-600 hover:bg-blue-50 transition-all opacity-0 group-hover:opacity-100 focus:opacity-100"
                    title="Copy to clipboard"
                >
                    {copied ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                </button>
            </div>
        </div>
    );
};

// --- Auth Component ---

const Login: React.FC = () => {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const handleLogin = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError('');
        try {
            const data = await api.auth.login({ email, password });
            if (data.data && data.data.token) {
                localStorage.setItem('token', data.data.token);
                localStorage.setItem('role', data.data.role);
                navigate('/dashboard');
            }
        } catch (err: any) {
            setError(err.message || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gray-100 px-4">
            <div className="max-w-md w-full bg-white rounded-2xl shadow-xl p-8 space-y-6">
                <div className="text-center">
                    <div className="w-16 h-16 bg-blue-600 rounded-2xl mx-auto flex items-center justify-center mb-4">
                        <ShieldCheck className="text-white" size={32} />
                    </div>
                    <h1 className="text-3xl font-bold text-gray-900">Super Admin</h1>
                    <p className="text-gray-500 mt-2">Sign in to manage the platform</p>
                </div>
                {error && (
                    <div className="p-4 bg-red-50 text-red-700 text-sm rounded-lg flex items-center gap-2 border border-red-100">
                        <XCircle size={16} /> {error}
                    </div>
                )}
                <form onSubmit={handleLogin} className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-white text-gray-900"
                            placeholder="admin@example.com"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Password</label>
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-white text-gray-900"
                            placeholder="••••••••"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2.5 rounded-lg transition-colors flex items-center justify-center gap-2"
                    >
                        {loading ? <Loader2 className="animate-spin" size={18} /> : "Sign In"}
                    </button>
                </form>
            </div>
        </div>
    );
};

// --- Dashboard Component ---

const DashboardStats = () => {
    const [stats, setStats] = useState({ companies: 0, users: 0, admins: 0 });

    useEffect(() => {
        const loadStats = async () => {
            try {
                const [c, u, a] = await Promise.all([
                    api.companies.list(0, 1000),
                    api.users.list(0, 1000),
                    api.superAdmin.list()
                ]);

                const companyCount = (c.data as any).totalElements || (Array.isArray(c.data) ? c.data.length : (c.data as any).content?.length || 0);
                const userCount = (u.data as any).totalElements || (Array.isArray(u.data) ? u.data.length : (u.data as any).content?.length || 0);
                const adminCount = Array.isArray(a.data) ? a.data.length : 0;

                setStats({ companies: companyCount, users: userCount, admins: adminCount });
            } catch (error) {
                console.error("Failed to load stats", error);
            }
        };
        loadStats();
    }, []);

    return (
        <div>
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Dashboard Overview</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex items-center justify-between">
                    <div>
                        <h3 className="text-gray-500 text-sm font-medium uppercase tracking-wider">Total Companies</h3>
                        <p className="text-3xl font-bold text-blue-600 mt-2">{stats.companies}</p>
                    </div>
                    <div className="p-3 bg-blue-50 rounded-full">
                        <Building2 className="text-blue-600" size={32} />
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex items-center justify-between">
                    <div>
                        <h3 className="text-gray-500 text-sm font-medium uppercase tracking-wider">Total Users</h3>
                        <p className="text-3xl font-bold text-green-600 mt-2">{stats.users}</p>
                    </div>
                    <div className="p-3 bg-green-50 rounded-full">
                        <Users className="text-green-600" size={32} />
                    </div>
                </div>
                <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200 flex items-center justify-between">
                    <div>
                        <h3 className="text-gray-500 text-sm font-medium uppercase tracking-wider">Super Admins</h3>
                        <p className="text-3xl font-bold text-purple-600 mt-2">{stats.admins}</p>
                    </div>
                    <div className="p-3 bg-purple-50 rounded-full">
                        <ShieldCheck className="text-purple-600" size={32} />
                    </div>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-8 text-center">
                <h3 className="text-lg font-medium text-gray-900 mb-2">Welcome to Gym Services Admin</h3>
                <p className="text-gray-500">Select a category from the sidebar to start managing the platform.</p>
            </div>
        </div>
    );
};

// --- Shared Table Component ---

const DataTable = <T,>({
    data,
    columns,
    actions,
    pagination
}: {
    data: T[],
    columns: { header: string, accessor: (item: T) => React.ReactNode }[],
    actions?: (item: T) => React.ReactNode,
    pagination?: { page: number, totalPages: number, onPageChange: (p: number) => void }
}) => (
    <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
                <thead>
                    <tr className="bg-gray-50 border-b border-gray-200">
                        {columns.map((col, idx) => (
                            <th key={idx} className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                                {col.header}
                            </th>
                        ))}
                        {actions && <th className="px-6 py-4 text-xs font-semibold text-gray-500 uppercase tracking-wider text-right">Actions</th>}
                    </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                    {data.length === 0 ? (
                        <tr>
                            <td colSpan={columns.length + (actions ? 1 : 0)} className="px-6 py-12 text-center text-gray-500">
                                No records found.
                            </td>
                        </tr>
                    ) : (
                        data.map((item, idx) => (
                            <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                {columns.map((col, colIdx) => (
                                    <td key={colIdx} className="px-6 py-4 text-sm text-gray-700 whitespace-nowrap">
                                        {col.accessor(item)}
                                    </td>
                                ))}
                                {actions && (
                                    <td className="px-6 py-4 whitespace-nowrap text-right">
                                        {actions(item)}
                                    </td>
                                )}
                            </tr>
                        ))
                    )}
                </tbody>
            </table>
        </div>
        {pagination && pagination.totalPages > 1 && (
            <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                <div className="flex-1 flex justify-between sm:justify-end gap-2">
                    <button
                        onClick={() => pagination.onPageChange(Math.max(0, pagination.page - 1))}
                        disabled={pagination.page === 0}
                        className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        <ChevronLeft size={16} /> Previous
                    </button>
                    <span className="flex items-center text-sm text-gray-600">
                        Page {pagination.page + 1} of {pagination.totalPages}
                    </span>
                    <button
                        onClick={() => pagination.onPageChange(Math.min(pagination.totalPages - 1, pagination.page + 1))}
                        disabled={pagination.page >= pagination.totalPages - 1}
                        className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Next <ChevronRight size={16} />
                    </button>
                </div>
            </div>
        )}
    </div>
);

// --- Super Admin Management ---

const SuperAdminsPage = () => {
    const [admins, setAdmins] = useState<SuperAdmin[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingAdmin, setEditingAdmin] = useState<SuperAdmin | null>(null);
    const [formData, setFormData] = useState<CreateSuperAdminRequest>({ username: '', email: '', fullName: '', phoneNumber: '', password: '' });

    const fetchAdmins = useCallback(async () => {
        try {
            const res = await api.superAdmin.list();
            setAdmins(Array.isArray(res.data) ? res.data : []);
        } catch (error) {
            console.error(error);
        }
    }, []);

    useEffect(() => { fetchAdmins(); }, [fetchAdmins]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingAdmin) {
                await api.superAdmin.update(editingAdmin.id, formData);
            } else {
                await api.superAdmin.create(formData);
            }
            setIsModalOpen(false);
            setEditingAdmin(null);
            setFormData({ username: '', email: '', fullName: '', phoneNumber: '', password: '' });
            fetchAdmins();
        } catch (error) {
            alert('Operation failed');
        }
    };

    const handleToggleStatus = async (id: number) => {
        if (!window.confirm("Are you sure you want to toggle this admin's status?")) return;
        try {
            await api.superAdmin.toggleStatus(id);
            fetchAdmins();
        } catch (e) { alert("Failed to toggle status"); }
    };

    const openEdit = (admin: SuperAdmin) => {
        setEditingAdmin(admin);
        setFormData({
            username: admin.username,
            email: admin.email,
            fullName: admin.fullName,
            phoneNumber: admin.phoneNumber,
            password: ''
        });
        setIsModalOpen(true);
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Super Admins</h1>
                <button
                    onClick={() => { setEditingAdmin(null); setFormData({ username: '', email: '', fullName: '', phoneNumber: '', password: '' }); setIsModalOpen(true); }}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 shadow-sm"
                >
                    <Plus size={18} /> Create Admin
                </button>
            </div>

            <DataTable<SuperAdmin>
                data={admins}
                columns={[
                    { header: 'Full Name', accessor: (sa) => <div className="font-medium text-gray-900">{sa.fullName}</div> },
                    { header: 'Username', accessor: (sa) => sa.username },
                    { header: 'Email', accessor: (sa) => sa.email },
                    { header: 'Phone', accessor: (sa) => sa.phoneNumber },
                    {
                        header: 'Status', accessor: (sa) => (
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${sa.isActive ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                {sa.isActive ? 'Active' : 'Inactive'}
                            </span>
                        )
                    }
                ]}
                actions={(sa: SuperAdmin) => (
                    <div className="flex items-center justify-end gap-2">
                        <button onClick={() => openEdit(sa)} className="text-blue-600 hover:bg-blue-50 p-1.5 rounded-md transition-colors"><Edit2 size={16} /></button>
                        <button onClick={() => handleToggleStatus(sa.id)} className="text-orange-600 hover:bg-orange-50 p-1.5 rounded-md transition-colors"><Power size={16} /></button>
                    </div>
                )}
            />

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingAdmin ? "Edit Admin" : "Create New Admin"}>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Full Name</label>
                            <input type="text" required className="border border-gray-300 p-2 rounded-lg w-full bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none" value={formData.fullName} onChange={e => setFormData({ ...formData, fullName: e.target.value })} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Username</label>
                            <input type="text" required className="border border-gray-300 p-2 rounded-lg w-full bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none" value={formData.username} onChange={e => setFormData({ ...formData, username: e.target.value })} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                            <input type="email" required className="border border-gray-300 p-2 rounded-lg w-full bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none" value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Phone</label>
                            <input type="text" required className="border border-gray-300 p-2 rounded-lg w-full bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none" value={formData.phoneNumber} onChange={e => setFormData({ ...formData, phoneNumber: e.target.value })} />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{editingAdmin ? "New Password (Optional)" : "Password"}</label>
                        <input type="password" required={!editingAdmin} className="border border-gray-300 p-2 rounded-lg w-full bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none" value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} />
                    </div>
                    <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
                        <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 font-medium bg-white">Cancel</button>
                        <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">Save Changes</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

// --- Company Management ---

const CompaniesPage = () => {
    const [companies, setCompanies] = useState<Company[]>([]);
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [reasonModalOpen, setReasonModalOpen] = useState(false);
    const [selectedCompanyId, setSelectedCompanyId] = useState<number | null>(null);
    const [toggleReason, setToggleReason] = useState('');
    const [toggleAction, setToggleAction] = useState<'activate' | 'deactivate'>('deactivate');

    // Search & Filter State
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState<'ALL' | 'ACTIVE' | 'SUSPENDED'>('ALL');

    // View state
    const [viewingCompany, setViewingCompany] = useState<Company | null>(null);

    // Edit state
    const [editingCompany, setEditingCompany] = useState<Company | null>(null);

    const initialForm: CreateCompanyRequest = {
        companyName: '', subDomain: '', companyEmail: '', tin: '', description: '',
        address: '', phone: '', website: '', founder: '', manager: '',
        accountName: '', accountNumber: '', preferredLanguage: 'EN',
        messageStatus: 'enabled', isSmsEnabled: true, subscriptionMonths: 6
    };
    const [formData, setFormData] = useState<CreateCompanyRequest>(initialForm);
    const [messagingModalOpen, setMessagingModalOpen] = useState(false);
    const [messagingCompany, setMessagingCompany] = useState<Company | null>(null);
    const [isUpdatingMessaging, setIsUpdatingMessaging] = useState(false);

    // SMS Balance state
    const [smsBalanceModalOpen, setSmsBalanceModalOpen] = useState(false);
    const [smsCompany, setSmsCompany] = useState<Company | null>(null);
    const [smsBalanceData, setSmsBalanceData] = useState<SmsBalanceData | null>(null);
    const [smsAmount, setSmsAmount] = useState<number | ''>('');
    const [smsOperation, setSmsOperation] = useState<'ADD' | 'SUBTRACT' | 'SET'>('ADD');
    const [isUpdatingSms, setIsUpdatingSms] = useState(false);

    const fetchCompanies = useCallback(async () => {
        try {
            const res = await api.companies.list(page, 10, searchTerm, statusFilter);
            if (res.data && 'content' in res.data) {
                const pageData = res.data as unknown as PageableResponse<Company>;
                setCompanies(pageData.content);
                setTotalPages(pageData.totalPages);
            } else {
                const list = Array.isArray(res.data) ? res.data : [];
                setCompanies(list);
                setTotalPages(1);
            }
        } catch (error) { console.error(error); }
    }, [page, searchTerm, statusFilter]);

    // Debounce search fetch
    useEffect(() => {
        const timer = setTimeout(() => {
            fetchCompanies();
        }, 300);
        return () => clearTimeout(timer);
    }, [fetchCompanies]);

    const handleFormSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingCompany) {
                await api.companies.update(editingCompany.id, formData);
            } else {
                await api.companies.create(formData);
            }
            setIsModalOpen(false);
            setEditingCompany(null);
            setFormData(initialForm);
            fetchCompanies();
        } catch (e) { alert("Operation failed"); }
    };

    const openEdit = (company: Company) => {
        setEditingCompany(company);
        setFormData({
            companyName: company.companyName,
            subDomain: company.subDomain,
            companyEmail: company.companyEmail,
            tin: company.tin,
            description: company.description,
            address: company.address,
            phone: company.phone,
            website: company.website,
            founder: company.founder,
            manager: company.manager,
            accountName: company.accountName,
            accountNumber: company.accountNumber,
            preferredLanguage: company.preferredLanguage,
            messageStatus: company.messageStatus,
            isSmsEnabled: company.isSmsEnabled,
            subscriptionMonths: 12
        });
        setIsModalOpen(true);
    };

    const initiateToggle = (company: Company) => {
        setSelectedCompanyId(company.id);
        setToggleAction(company.isActivated ? 'deactivate' : 'activate');
        setToggleReason('');
        setReasonModalOpen(true);
    };

    const handleToggleConfirm = async () => {
        if (!selectedCompanyId) return;
        try {
            await api.companies.toggleActivation(selectedCompanyId, toggleReason);
            setReasonModalOpen(false);
            fetchCompanies();
        } catch (e) { alert("Toggle failed"); }
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm("Delete this company? This action cannot be undone.")) return;
        try {
            await api.companies.delete(id);
            fetchCompanies();
        } catch (e) { alert("Delete failed"); }
    };

    const openMessagingSettings = (company: Company) => {
        setMessagingCompany(company);
        setMessagingModalOpen(true);
    };

    const handleMessagingUpdate = async (status?: 'enabled' | 'disabled', isSms?: boolean) => {
        if (!messagingCompany) return;
        setIsUpdatingMessaging(true);
        try {
            const payload: any = {};
            if (status) payload.messageStatus = status;
            if (isSms !== undefined) payload.isSmsEnabled = isSms;

            await api.companies.updateMessaging(messagingCompany.id, payload);
            fetchCompanies();
            // Update local state if it's currently being viewed
            if (viewingCompany && viewingCompany.id === messagingCompany.id) {
                const updatedRes = await api.companies.list(page, 10, searchTerm, statusFilter);
                if (updatedRes.data && 'content' in updatedRes.data) {
                    const found = (updatedRes.data as any).content.find((c: Company) => c.id === messagingCompany.id);
                    if (found) setViewingCompany(found);
                }
            }
            // Update the messagingCompany state to reflect changes in the modal
            setMessagingCompany(prev => prev ? { ...prev, ...payload } : null);
        } catch (e: any) {
            alert(e.message || "Failed to update messaging settings");
        } finally {
            setIsUpdatingMessaging(false);
        }
    };

    const openSmsBalance = async (company: Company) => {
        setSmsCompany(company);
        setSmsBalanceData(null);
        setSmsAmount('');
        setSmsOperation('ADD');
        setSmsBalanceModalOpen(true);
        try {
            const res = await api.companies.getSmsBalance(company.id);
            if (res.success && res.data) {
                setSmsBalanceData(res.data);
            }
        } catch (e: any) {
            console.error(e);
            alert("Failed to fetch SMS balance");
        }
    };

    const handleSmsBalanceUpdate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!smsCompany || typeof smsAmount !== 'number' || smsAmount <= 0) return;
        setIsUpdatingSms(true);
        try {
            const res = await api.companies.updateSmsBalance(smsCompany.id, {
                amount: smsAmount,
                operation: smsOperation
            });
            if (res.success && res.data) {
                setSmsBalanceData(res.data);
                setSmsAmount('');
            }
        } catch (e: any) {
            alert(e.message || "Failed to update SMS balance");
        } finally {
            setIsUpdatingSms(false);
        }
    };

    // Reset page when filtering
    const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setSearchTerm(e.target.value);
        setPage(0);
    };

    const handleStatusFilterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
        setStatusFilter(e.target.value as 'ALL' | 'ACTIVE' | 'SUSPENDED');
        setPage(0);
    };

    const inputClasses = "w-full border border-gray-300 p-2 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none";

    return (
        <div>
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
                <h1 className="text-2xl font-bold text-gray-900">Companies</h1>
                <button
                    onClick={() => {
                        setEditingCompany(null);
                        setFormData(initialForm);
                        setIsModalOpen(true);
                    }}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 shadow-sm whitespace-nowrap"
                >
                    <Plus size={18} /> New Company
                </button>
            </div>

            {/* Search and Filter Bar */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-6 flex flex-col md:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder="Search by company name or subdomain..."
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none transition-all bg-white text-gray-900"
                        value={searchTerm}
                        onChange={handleSearchChange}
                    />
                </div>
                <div className="flex items-center gap-2 min-w-[200px]">
                    <div className="relative w-full">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                        <select
                            className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent outline-none bg-white text-gray-900 appearance-none cursor-pointer"
                            value={statusFilter}
                            onChange={handleStatusFilterChange}
                        >
                            <option value="ALL">All Status</option>
                            <option value="ACTIVE">Active</option>
                            <option value="SUSPENDED">Suspended</option>
                        </select>
                        {/* Custom chevron for select */}
                        <div className="absolute inset-y-0 right-0 flex items-center px-2 pointer-events-none">
                            <svg className="w-4 h-4 text-gray-500" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 9l-7 7-7-7"></path></svg>
                        </div>
                    </div>
                </div>
            </div>

            <DataTable<Company>
                data={companies}
                pagination={{ page, totalPages, onPageChange: setPage }}
                columns={[
                    {
                        header: 'Company Name', accessor: (c) => (
                            <div>
                                <div className="font-medium text-gray-900">{c.companyName}</div>
                                <div className="text-xs text-gray-500">{c.subDomain}.gym.service</div>
                            </div>
                        )
                    },
                    {
                        header: 'Contact', accessor: (c) => (
                            <div className="text-sm">
                                <div>{c.companyEmail}</div>
                                <div className="text-gray-500 text-xs">{c.phone}</div>
                            </div>
                        )
                    },
                    { header: 'Manager', accessor: (c) => c.manager },
                    {
                        header: 'Status', accessor: (c) => (
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${c.isActivated !== false ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                {c.isActivated !== false ? 'Active' : 'Suspended'}
                            </span>
                        )
                    }
                ]}
                actions={(c: Company) => (
                    <div className="flex items-center justify-end gap-2">
                        <button
                            onClick={() => setViewingCompany(c)}
                            className="text-gray-600 hover:bg-gray-100 p-1.5 rounded-md transition-colors"
                            title="View Details"
                        >
                            <Eye size={16} />
                        </button>
                        <button
                            onClick={() => openSmsBalance(c)}
                            className="text-indigo-600 hover:bg-indigo-50 p-1.5 rounded-md transition-colors"
                            title="SMS Balance"
                        >
                            <CreditCard size={16} />
                        </button>
                        <button
                            onClick={() => openMessagingSettings(c)}
                            className="text-purple-600 hover:bg-purple-50 p-1.5 rounded-md transition-colors"
                            title="Messaging Settings"
                        >
                            <MessageSquare size={16} />
                        </button>
                        <button
                            onClick={() => openEdit(c)}
                            className="text-blue-600 hover:bg-blue-50 p-1.5 rounded-md transition-colors"
                            title="Edit Company"
                        >
                            <Edit2 size={16} />
                        </button>
                        <button
                            onClick={() => initiateToggle(c)}
                            className={`${c.isActivated ? 'text-red-600 hover:bg-red-50' : 'text-green-600 hover:bg-green-50'} p-1.5 rounded-md transition-colors`}
                            title={c.isActivated ? "Suspend Company" : "Reactivate Company"}
                        >
                            {c.isActivated ? <Power size={16} /> : <CheckCircle2 size={16} />}
                        </button>
                        <button onClick={() => handleDelete(c.id)} className="text-gray-400 hover:text-red-600 hover:bg-red-50 p-1.5 rounded-md transition-colors" title="Delete"><Trash2 size={16} /></button>
                    </div>
                )}
            />

            {/* View Details Modal */}
            <Modal isOpen={!!viewingCompany} onClose={() => setViewingCompany(null)} title="Company Details">
                {viewingCompany && (
                    <div className="space-y-6">
                        <div>
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Identity</h3>
                            <div className="bg-gray-50 rounded-lg p-4">
                                <CopyableDetail label="Company Name" value={viewingCompany.companyName} />
                                <CopyableDetail label="Subdomain" value={viewingCompany.subDomain} />
                                <CopyableDetail label="Description" value={viewingCompany.description} />
                                <CopyableDetail label="Website" value={viewingCompany.website} />
                                <CopyableDetail label="TIN" value={viewingCompany.tin} />
                                <CopyableDetail label="Platform ID" value={viewingCompany.id} />
                            </div>
                        </div>

                        <div>
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Contact Information</h3>
                            <div className="bg-gray-50 rounded-lg p-4">
                                <CopyableDetail label="Email" value={viewingCompany.companyEmail} />
                                <CopyableDetail label="Phone" value={viewingCompany.phone} />
                                <CopyableDetail label="Address" value={viewingCompany.address} />
                            </div>
                        </div>

                        <div>
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Management</h3>
                            <div className="bg-gray-50 rounded-lg p-4">
                                <CopyableDetail label="Founder" value={viewingCompany.founder} />
                                <CopyableDetail label="Manager" value={viewingCompany.manager} />
                            </div>
                        </div>

                        <div>
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Billing & Subscription</h3>
                            <div className="bg-gray-50 rounded-lg p-4">
                                <CopyableDetail label="Account Name" value={viewingCompany.accountName} />
                                <CopyableDetail label="Account Number" value={viewingCompany.accountNumber} />
                                <CopyableDetail label="Subscription Start" value={viewingCompany.companySubscriptionStartDate || 'N/A'} />
                                <CopyableDetail label="Subscription End" value={viewingCompany.companySubscriptionEndDate || 'N/A'} />
                            </div>
                        </div>

                        <div>
                            <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">System Settings</h3>
                            <div className="bg-gray-50 rounded-lg p-4">
                                <CopyableDetail label="Preferred Language" value={viewingCompany.preferredLanguage} />
                                <CopyableDetail label="Message Status" value={viewingCompany.messageStatus} />
                                <CopyableDetail label="SMS Enabled" value={viewingCompany.isSmsEnabled ? 'Yes' : 'No'} />
                                <CopyableDetail label="Current Status" value={viewingCompany.isActivated ? 'Active' : 'Suspended'} />
                            </div>
                        </div>
                    </div>
                )}
            </Modal>

            {/* Create/Edit Company Modal */}
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingCompany ? "Edit Company Details" : "Register New Company"}>
                <form onSubmit={handleFormSubmit} className="space-y-6">
                    <div>
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Company Details</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <input type="text" placeholder="Company Name" required className={inputClasses} value={formData.companyName} onChange={e => setFormData({ ...formData, companyName: e.target.value })} />
                            <input type="text" placeholder="Subdomain" required className={inputClasses} value={formData.subDomain} onChange={e => setFormData({ ...formData, subDomain: e.target.value })} />
                            <input type="email" placeholder="Email" required className={inputClasses} value={formData.companyEmail} onChange={e => setFormData({ ...formData, companyEmail: e.target.value })} />
                            <input type="text" placeholder="Phone" required className={inputClasses} value={formData.phone} onChange={e => setFormData({ ...formData, phone: e.target.value })} />
                            <input type="text" placeholder="TIN" required className={inputClasses} value={formData.tin} onChange={e => setFormData({ ...formData, tin: e.target.value })} />
                            <input type="text" placeholder="Website" className={inputClasses} value={formData.website} onChange={e => setFormData({ ...formData, website: e.target.value })} />
                        </div>
                        <input type="text" placeholder="Address" required className={`${inputClasses} mt-4`} value={formData.address} onChange={e => setFormData({ ...formData, address: e.target.value })} />
                        <textarea placeholder="Description" className={`${inputClasses} mt-4`} rows={2} value={formData.description} onChange={e => setFormData({ ...formData, description: e.target.value })} />
                    </div>

                    <div>
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Management & Billing</h3>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <input type="text" placeholder="Founder Name" required className={inputClasses} value={formData.founder} onChange={e => setFormData({ ...formData, founder: e.target.value })} />
                            <input type="text" placeholder="Manager Name" required className={inputClasses} value={formData.manager} onChange={e => setFormData({ ...formData, manager: e.target.value })} />
                            <input type="text" placeholder="Account Name" required className={inputClasses} value={formData.accountName} onChange={e => setFormData({ ...formData, accountName: e.target.value })} />
                            <input type="text" placeholder="Account Number" required className={inputClasses} value={formData.accountNumber} onChange={e => setFormData({ ...formData, accountNumber: e.target.value })} />
                        </div>
                    </div>

                    <div>
                        <h3 className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-3">Settings</h3>
                        <div className="flex gap-4 items-center flex-wrap">
                            <select className={inputClasses} style={{ width: 'auto' }} value={formData.preferredLanguage} onChange={e => setFormData({ ...formData, preferredLanguage: e.target.value })}>
                                <option value="EN">English</option>
                                <option value="SW">Swahili</option>
                            </select>
                            <select className={inputClasses} style={{ width: 'auto' }} value={formData.messageStatus} onChange={e => setFormData({ ...formData, messageStatus: e.target.value })}>
                                <option value="enabled">Message: Enabled</option>
                                <option value="disabled">Message: Disabled</option>
                            </select>
                            <label className="flex items-center gap-2 text-sm text-gray-700">
                                <input type="checkbox" checked={formData.isSmsEnabled} onChange={e => setFormData({ ...formData, isSmsEnabled: e.target.checked })} />
                                SMS Enabled
                            </label>
                            <div className="flex items-center gap-2">
                                <span className="text-sm text-gray-600">Sub Months:</span>
                                <input type="number" placeholder="Sub Months" className={`${inputClasses} w-24`} value={formData.subscriptionMonths} onChange={e => setFormData({ ...formData, subscriptionMonths: parseInt(e.target.value) })} />
                            </div>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                        <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 bg-white">Cancel</button>
                        <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                            {editingCompany ? "Update Company" : "Create Company"}
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Toggle Status Modal */}
            <Modal isOpen={reasonModalOpen} onClose={() => setReasonModalOpen(false)} title={toggleAction === 'activate' ? "Reactivate Company" : "Suspend Company"}>
                <div className="space-y-4">
                    <p className="text-gray-600">
                        {toggleAction === 'activate'
                            ? "Are you sure you want to reactivate this company? They will regain access to the platform."
                            : "Are you sure you want to suspend this company? Their access will be revoked."}
                    </p>
                    <div className="space-y-2">
                        <label className="text-sm font-medium text-gray-700">Reason for {toggleAction === 'activate' ? 'reactivation' : 'suspension'}</label>
                        <textarea
                            className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-900"
                            rows={3}
                            placeholder={toggleAction === 'activate' ? "e.g., Payment received, Issue resolved..." : "e.g., Billing issue, Violation of terms..."}
                            value={toggleReason}
                            onChange={e => setToggleReason(e.target.value)}
                        />
                    </div>
                    <div className="flex justify-end gap-3">
                        <button onClick={() => setReasonModalOpen(false)} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 bg-white text-gray-700">Cancel</button>
                        <button
                            onClick={handleToggleConfirm}
                            className={`px-4 py-2 text-white rounded-lg shadow-sm ${toggleAction === 'activate' ? 'bg-green-600 hover:bg-green-700' : 'bg-red-600 hover:bg-red-700'}`}
                        >
                            {toggleAction === 'activate' ? "Reactivate" : "Suspend"}
                        </button>
                    </div>
                </div>
            </Modal>

            {/* Messaging Settings Modal */}
            <Modal isOpen={messagingModalOpen} onClose={() => setMessagingModalOpen(false)} title="Messaging Settings">
                {messagingCompany && (
                    <div className="space-y-6">
                        <div className="p-4 bg-blue-50 rounded-xl border border-blue-100 mb-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-blue-600 rounded-lg text-white">
                                    <MessageSquare size={20} />
                                </div>
                                <div>
                                    <h4 className="font-bold text-blue-900">{messagingCompany.companyName}</h4>
                                    <p className="text-xs text-blue-700">Manage communication features</p>
                                </div>
                            </div>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl shadow-sm">
                                <div>
                                    <h5 className="font-semibold text-gray-900">General Messaging</h5>
                                    <p className="text-sm text-gray-500">Master switch for all messaging</p>
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleMessagingUpdate('enabled')}
                                        disabled={isUpdatingMessaging || messagingCompany.messageStatus === 'enabled'}
                                        className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${messagingCompany.messageStatus === 'enabled'
                                            ? 'bg-green-600 text-white shadow-sm'
                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                            }`}
                                    >
                                        Enabled
                                    </button>
                                    <button
                                        onClick={() => handleMessagingUpdate('disabled')}
                                        disabled={isUpdatingMessaging || messagingCompany.messageStatus === 'disabled'}
                                        className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-all ${messagingCompany.messageStatus === 'disabled'
                                            ? 'bg-red-600 text-white shadow-sm'
                                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                            }`}
                                    >
                                        Disabled
                                    </button>
                                </div>
                            </div>

                            <div className="flex items-center justify-between p-4 bg-white border border-gray-200 rounded-xl shadow-sm">
                                <div>
                                    <h5 className="font-semibold text-gray-900">SMS Services</h5>
                                    <p className="text-sm text-gray-500">Enable or disable SMS sending</p>
                                </div>
                                <button
                                    onClick={() => handleMessagingUpdate(undefined, !messagingCompany.isSmsEnabled)}
                                    disabled={isUpdatingMessaging}
                                    className={`px-4 py-2 text-sm font-medium rounded-lg transition-all flex items-center gap-2 ${messagingCompany.isSmsEnabled
                                        ? 'bg-blue-600 text-white shadow-md'
                                        : 'bg-gray-100 text-gray-600 border border-gray-200'
                                        }`}
                                >
                                    {isUpdatingMessaging ? <Loader2 className="animate-spin" size={16} /> : (messagingCompany.isSmsEnabled ? <CheckCircle2 size={16} /> : <XCircle size={16} />)}
                                    {messagingCompany.isSmsEnabled ? 'SMS Active' : 'SMS Inactive'}
                                </button>
                            </div>
                        </div>

                        <div className="pt-6 border-t border-gray-100 flex justify-end">
                            <button
                                onClick={() => setMessagingModalOpen(false)}
                                className="px-6 py-2 bg-gray-900 text-white rounded-lg hover:bg-gray-800 font-medium transition-all shadow-lg"
                            >
                                Done
                            </button>
                        </div>
                    </div>
                )}
            </Modal>

            {/* SMS Balance Modal */}
            <Modal isOpen={smsBalanceModalOpen} onClose={() => setSmsBalanceModalOpen(false)} title="SMS Balance Management">
                {smsCompany && (
                    <div className="space-y-6">
                        <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100 mb-6">
                            <div className="flex items-center gap-3">
                                <div className="p-2 bg-indigo-600 rounded-lg text-white">
                                    <CreditCard size={20} />
                                </div>
                                <div>
                                    <h4 className="font-bold text-indigo-900">{smsCompany.companyName}</h4>
                                    <p className="text-xs text-indigo-700">Manage SMS Credits</p>
                                </div>
                            </div>
                        </div>

                        <div className="bg-white border border-gray-200 rounded-xl p-6 text-center shadow-sm">
                            <h5 className="text-sm font-semibold text-gray-500 uppercase tracking-wider mb-2">Current Balance</h5>
                            {smsBalanceData ? (
                                <div className="text-4xl font-black text-gray-900">
                                    {smsBalanceData.newBalance.toLocaleString()} <span className="text-lg text-gray-500 font-medium">credits</span>
                                </div>
                            ) : (
                                <div className="flex justify-center items-center h-12">
                                    <Loader2 className="animate-spin text-indigo-600" size={24} />
                                </div>
                            )}
                        </div>

                        {smsBalanceData && (
                            <form onSubmit={handleSmsBalanceUpdate} className="space-y-4">
                                <div>
                                    <h5 className="font-semibold text-gray-900 mb-3">Update Balance</h5>
                                    <div className="grid grid-cols-3 gap-2 mb-4">
                                        {(['ADD', 'SUBTRACT', 'SET'] as const).map(op => (
                                            <button
                                                key={op}
                                                type="button"
                                                onClick={() => setSmsOperation(op)}
                                                className={`py-2 px-3 text-sm font-medium rounded-lg transition-all ${smsOperation === op
                                                    ? 'bg-indigo-600 text-white shadow-sm'
                                                    : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                                                    }`}
                                            >
                                                {op.charAt(0) + op.slice(1).toLowerCase()}
                                            </button>
                                        ))}
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <div className="relative flex-1">
                                            <input
                                                type="number"
                                                min="1"
                                                step="1"
                                                required
                                                placeholder={`Amount to ${smsOperation.toLowerCase()}`}
                                                className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-indigo-500 hover:border-indigo-300 outline-none bg-white text-gray-900 font-medium text-lg"
                                                value={smsAmount}
                                                onChange={e => setSmsAmount(e.target.value ? Number(e.target.value) : '')}
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-4 flex justify-end">
                                    <button
                                        type="submit"
                                        disabled={isUpdatingSms || !smsAmount || smsAmount <= 0}
                                        className={`px-6 py-2.5 rounded-lg font-medium transition-all shadow-sm flex items-center gap-2 ${isUpdatingSms || !smsAmount || smsAmount <= 0
                                            ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                            : 'bg-indigo-600 text-white hover:bg-indigo-700 hover:shadow-md'
                                            }`}
                                    >
                                        {isUpdatingSms && <Loader2 className="animate-spin" size={16} />}
                                        Update Balance
                                    </button>
                                </div>
                            </form>
                        )}
                    </div>
                )}
            </Modal>
        </div>
    );
};

// --- Users Management ---

const UsersPage = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [reasonModalOpen, setReasonModalOpen] = useState(false);
    const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
    const [toggleReason, setToggleReason] = useState('');

    // Create User Form Data - Requires Company ID
    const [formData, setFormData] = useState<CreateUserRequest & { companyId: string }>({
        name: '', email: '', password: '', phone_number: '', role: 'ADMINISTRATOR', companyId: ''
    });

    const fetchUsers = useCallback(async () => {
        try {
            const res = await api.users.list(page, 20);
            if (res.data && 'content' in res.data) {
                const pageData = res.data as unknown as PageableResponse<User>;
                setUsers(pageData.content);
                setTotalPages(pageData.totalPages);
            } else {
                setUsers(Array.isArray(res.data) ? res.data : []);
                setTotalPages(1);
            }
        } catch (error) { console.error(error); }
    }, [page]);

    useEffect(() => { fetchUsers(); }, [fetchUsers]);

    const handleCreate = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            // Need to pass companyId as number
            await api.users.create(parseInt(formData.companyId), {
                name: formData.name, email: formData.email,
                password: formData.password, phone_number: formData.phone_number,
                role: formData.role
            });
            setIsModalOpen(false);
            setFormData({ name: '', email: '', password: '', phone_number: '', role: 'ADMINISTRATOR', companyId: '' });
            fetchUsers();
        } catch (e) { alert("Create user failed. Ensure Company ID is valid."); }
    };

    const initiateToggle = (id: number) => {
        setSelectedUserId(id);
        setToggleReason('');
        setReasonModalOpen(true);
    };

    const handleToggleConfirm = async () => {
        if (!selectedUserId) return;
        try {
            await api.users.toggleActivation(selectedUserId, toggleReason);
            setReasonModalOpen(false);
            fetchUsers();
        } catch (e) { alert("Toggle failed"); }
    };

    const handleDelete = async (id: number) => {
        if (!window.confirm("Delete this user?")) return;
        try {
            await api.users.delete(id);
            fetchUsers();
        } catch (e) { alert("Delete failed"); }
    };

    const inputClasses = "w-full border border-gray-300 p-2 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none";

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Platform Users</h1>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 shadow-sm"
                >
                    <Plus size={18} /> Add User
                </button>
            </div>

            <DataTable<User>
                data={users}
                pagination={{ page, totalPages, onPageChange: setPage }}
                columns={[
                    {
                        header: 'User', accessor: (u) => (
                            <div>
                                <div className="font-medium text-gray-900">{u.name}</div>
                                <div className="text-xs text-gray-500">{u.email}</div>
                            </div>
                        )
                    },
                    {
                        header: 'Role', accessor: (u) => (
                            <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded border border-gray-200">{u.role}</span>
                        )
                    },
                    { header: 'Company ID', accessor: (u) => u.companyProfile?.id || 'N/A' },
                    {
                        header: 'Status', accessor: (u) => (
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${u.isActivated !== false ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                {u.isActivated !== false ? 'Active' : 'Inactive'}
                            </span>
                        )
                    }
                ]}
                actions={(u: User) => (
                    <div className="flex items-center justify-end gap-2">
                        <button onClick={() => initiateToggle(u.id)} className="text-orange-600 hover:bg-orange-50 p-1.5 rounded-md" title="Toggle Status"><Power size={16} /></button>
                        <button onClick={() => handleDelete(u.id)} className="text-red-600 hover:bg-red-50 p-1.5 rounded-md" title="Delete"><Trash2 size={16} /></button>
                    </div>
                )}
            />

            {/* Create User Modal */}
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title="Create User">
                <form onSubmit={handleCreate} className="space-y-4">
                    <div className="bg-yellow-50 border border-yellow-200 p-3 rounded-lg flex gap-2 items-start">
                        <AlertTriangle className="text-yellow-600 shrink-0 mt-0.5" size={16} />
                        <p className="text-xs text-yellow-800">You are creating a user directly. You must provide a valid Company ID (e.g., from the Companies list) to associate this user.</p>
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <input type="text" placeholder="Full Name" required className={inputClasses} value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                        <input type="email" placeholder="Email" required className={inputClasses} value={formData.email} onChange={e => setFormData({ ...formData, email: e.target.value })} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <input type="text" placeholder="Phone" required className={inputClasses} value={formData.phone_number} onChange={e => setFormData({ ...formData, phone_number: e.target.value })} />
                        <input type="password" placeholder="Password" required className={inputClasses} value={formData.password} onChange={e => setFormData({ ...formData, password: e.target.value })} />
                    </div>
                    <div className="grid grid-cols-2 gap-4">
                        <select className={inputClasses} value={formData.role} onChange={e => setFormData({ ...formData, role: e.target.value as any })}>
                            <option value="admin">admin</option>
                            <option value="user">user</option>
                            <option value="USER_ROLE">USER_ROLE</option>
                            <option value="STAFF">STAFF</option>
                            <option value="MEMBER">MEMBER</option>
                            <option value="ADMINISTRATOR">ADMINISTRATOR</option>
                            <option value="MANAGER">MANAGER</option>
                        </select>
                        <input type="number" placeholder="Company ID (Required)" required className={inputClasses} value={formData.companyId} onChange={e => setFormData({ ...formData, companyId: e.target.value })} />
                    </div>
                    <div className="flex justify-end gap-3 pt-4">
                        <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 bg-white text-gray-700">Cancel</button>
                        <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700">Create User</button>
                    </div>
                </form>
            </Modal>

            {/* User Toggle Reason Modal */}
            <Modal isOpen={reasonModalOpen} onClose={() => setReasonModalOpen(false)} title="Deactivate/Activate User">
                <div className="space-y-4">
                    <p className="text-gray-600">Please provide a reason for this action.</p>
                    <textarea
                        className="w-full border border-gray-300 p-3 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-gray-900"
                        rows={3}
                        placeholder="Reason..."
                        value={toggleReason}
                        onChange={e => setToggleReason(e.target.value)}
                    />
                    <div className="flex justify-end gap-3">
                        <button onClick={() => setReasonModalOpen(false)} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 bg-white text-gray-700">Cancel</button>
                        <button onClick={handleToggleConfirm} className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700">Confirm</button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

// --- App Root & Routing ---

const ProtectedRoute = ({ children }: { children: React.ReactNode }) => {
    const token = localStorage.getItem('token');
    if (!token) {
        return <Navigate to="/login" replace />;
    }
    return <>{children}</>;
};

const DashboardLayout = () => {
    const navigate = useNavigate();
    const location = useLocation();
    const activeTab = location.pathname.split('/')[1] || 'dashboard';

    const handleLogout = () => {
        api.auth.logout();
        localStorage.removeItem('token');
        localStorage.removeItem('role');
        navigate('/login');
    };

    return (
        <Layout
            activeTab={activeTab}
            onNavigate={(tab) => navigate(`/${tab}`)}
            onLogout={handleLogout}
            userRole={localStorage.getItem('role') || 'SUPER_ADMIN'}
        >
            <Routes>
                <Route path="/" element={<Navigate to="/dashboard" replace />} />
                <Route path="/dashboard" element={<DashboardStats />} />
                <Route path="/superadmins" element={<SuperAdminsPage />} />
                <Route path="/companies" element={<CompaniesPage />} />
                <Route path="/users" element={<UsersPage />} />
            </Routes>
        </Layout>
    );
};

const App: React.FC = () => {
    return (
        <HashRouter>
            <Routes>
                <Route path="/login" element={<Login />} />
                <Route
                    path="/*"
                    element={
                        <ProtectedRoute>
                            <DashboardLayout />
                        </ProtectedRoute>
                    }
                />
            </Routes>
        </HashRouter>
    );
};

export default App;