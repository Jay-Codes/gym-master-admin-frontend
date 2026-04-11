import React, { useState, useEffect, useCallback } from 'react';
import { HashRouter, Routes, Route, Navigate, useNavigate, useLocation } from 'react-router-dom';
import { Layout } from './components/Layout';
import { Modal } from './components/Modal';
import { BillingModal } from './components/BillingModal';
import { api } from './services/api';
import {
    User, SuperAdmin, Company, PageableResponse,
    CreateCompanyRequest, CreateSuperAdminRequest, CreateUserRequest,
    SmsBalanceData, BillingPlan, CreatePlanRequest, KazafitInvoice,
    PartnerAnalytics, Partner, CommissionOverrideRequest,
    PartnerConfig, PartnerHistoryEntry, PartnerPaymentMethod, OnboardingStep,
    PartnerPayout, PayoutStatus, CreatePayoutRequest, UpdatePayoutStatusRequest
} from './types';
import { OnboardingFlow } from './components/OnboardingFlow';
import {
    Plus, Edit2, Trash2, Power, Search,
    ChevronLeft, ChevronRight, Loader2, CheckCircle2, XCircle,
    Building2, Users, ShieldCheck, AlertTriangle, RefreshCw,
    Eye, Copy, Check, Filter, MessageSquare, CreditCard, Download, FileText,
    Handshake, DollarSign, TrendingUp, Calendar, Settings, History, Clock,
    ArrowRight, ArrowUpRight
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
                
                const onboardingStep = (data.data as any).onboarding_step as OnboardingStep;
                if (onboardingStep) {
                    localStorage.setItem('onboarding_step', onboardingStep);
                }
                
                if (onboardingStep && onboardingStep !== 'COMPLETED') {
                    navigate(`/register?step=${onboardingStep}`);
                } else {
                    navigate('/dashboard');
                }
            }
        } catch (err: any) {
            setError(err.message || 'Login failed');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-[#F8FAFC] px-4 font-sans antialiased">
            <div className="max-w-md w-full bg-white rounded-[32px] shadow-2xl shadow-blue-100/50 p-10 space-y-8 border border-gray-100 animate-in fade-in zoom-in duration-500">
                <div className="text-center">
                    <div className="w-20 h-20 bg-blue-600 rounded-[24px] mx-auto flex items-center justify-center mb-6 shadow-xl shadow-blue-200 transition-transform hover:scale-110 duration-300">
                        <ShieldCheck className="text-white" size={40} />
                    </div>
                    <h1 className="text-4xl font-black text-gray-900 tracking-tight">KazaFit</h1>
                    <p className="text-gray-500 mt-2 font-medium">Elevating Gym Management</p>
                </div>
                {error && (
                    <div className="p-4 bg-red-50 text-red-700 text-sm rounded-2xl flex items-center gap-3 border border-red-100 animate-shake">
                        <XCircle size={18} /> {error}
                    </div>
                )}
                <form onSubmit={handleLogin} className="space-y-5">
                    <div className="space-y-1.5">
                        <label className="text-sm font-bold text-gray-700 ml-1">Gym Admin Email</label>
                        <input
                            type="email"
                            required
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-4 focus:ring-blue-100 transition-all font-medium text-gray-900 placeholder:text-gray-400"
                            placeholder="admin@kaza-fit.com"
                        />
                    </div>
                    <div className="space-y-1.5">
                        <label className="text-sm font-bold text-gray-700 ml-1">Secure Password</label>
                        <input
                            type="password"
                            required
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full px-5 py-4 bg-gray-50 border-none rounded-2xl focus:ring-4 focus:ring-blue-100 transition-all font-medium text-gray-900 placeholder:text-gray-400"
                            placeholder="••••••••"
                        />
                    </div>
                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-gray-900 hover:bg-black text-white font-black py-4 rounded-2xl transition-all shadow-xl shadow-gray-200 flex items-center justify-center gap-2 group mt-2"
                    >
                        {loading ? <Loader2 className="animate-spin" size={20} /> : (
                            <>
                                Sign In to Console 
                                <ArrowRight size={20} className="group-hover:translate-x-1 transition-transform" />
                            </>
                        )}
                    </button>
                </form>
                <div className="text-center pt-6 border-t border-gray-100">
                    <p className="text-gray-500 font-medium">
                        New Gym Owner?{' '}
                        <button 
                            onClick={() => navigate('/register')}
                            className="text-blue-600 font-black hover:underline underline-offset-4"
                        >
                            Create an account
                        </button>
                    </p>
                </div>
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

    // Billing state
    const [billingModalOpen, setBillingModalOpen] = useState(false);
    const [billingCompany, setBillingCompany] = useState<Company | null>(null);

    // SMS Balance state
    const [smsBalanceModalOpen, setSmsBalanceModalOpen] = useState(false);
    const [smsCompany, setSmsCompany] = useState<Company | null>(null);
    const [smsBalanceData, setSmsBalanceData] = useState<SmsBalanceData | null>(null);
    const [smsAmount, setSmsAmount] = useState<number | ''>('');
    const [smsOperation, setSmsOperation] = useState<'ADD' | 'SUBTRACT' | 'SET'>('ADD');
    const [isUpdatingSms, setIsUpdatingSms] = useState(false);
    
    // Onboarding Override state
    const [onboardingModalOpen, setOnboardingModalOpen] = useState(false);
    const [onboardingCompany, setOnboardingCompany] = useState<Company | null>(null);
    const [selectedOnboardingStep, setSelectedOnboardingStep] = useState<OnboardingStep>('COMPLETED');
    const [isUpdatingOnboarding, setIsUpdatingOnboarding] = useState(false);

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

    const handleOnboardingUpdate = async () => {
        if (!onboardingCompany) return;
        setIsUpdatingOnboarding(true);
        try {
            await api.companies.updateOnboardingStatus(onboardingCompany.id, selectedOnboardingStep);
            setOnboardingModalOpen(false);
            fetchCompanies();
        } catch (e: any) {
            alert(e.message || "Failed to update onboarding status");
        } finally {
            setIsUpdatingOnboarding(false);
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
                            onClick={() => {
                                setBillingCompany(c);
                                setBillingModalOpen(true);
                            }}
                            className="text-amber-600 hover:bg-amber-50 p-1.5 rounded-md transition-colors"
                            title="Billing & Subscription"
                        >
                            <CreditCard size={16} />
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
                            onClick={() => {
                                setOnboardingCompany(c);
                                setOnboardingModalOpen(true);
                            }}
                            className="text-gray-600 hover:bg-gray-100 p-1.5 rounded-md transition-colors"
                            title="Override Onboarding Status"
                        >
                            <History size={16} />
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
                        <textarea placeholder="Description" className={`${inputClasses} mt-4`} rows={2} value={formData.description || ''} onChange={e => setFormData({ ...formData, description: e.target.value })} />
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
                            value={toggleReason || ''}
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
                                    {(smsBalanceData.newBalance || 0).toLocaleString()} <span className="text-lg text-gray-500 font-medium">credits</span>
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

            {/* Billing Modal */}
            {billingCompany && (
                <BillingModal
                    isOpen={billingModalOpen}
                    onClose={() => {
                        setBillingModalOpen(false);
                        setBillingCompany(null);
                        fetchCompanies(); // Refresh to see updated subscription dates if any
                    }}
                    company={billingCompany}
                />
            )}

            {/* Onboarding Override Modal */}
            <Modal isOpen={onboardingModalOpen} onClose={() => setOnboardingModalOpen(false)} title="Override Onboarding Status">
                {onboardingCompany && (
                    <div className="space-y-6">
                        <div className="p-4 bg-gray-50 rounded-xl border border-gray-100 flex items-center gap-3">
                            <div className="p-2 bg-gray-900 rounded-lg text-white">
                                <History size={20} />
                            </div>
                            <div>
                                <h4 className="font-bold text-gray-900">{onboardingCompany.companyName}</h4>
                                <p className="text-xs text-gray-500">Force onboarding step for all company admins</p>
                            </div>
                        </div>

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">Select Target Onboarding Step</label>
                            <select
                                className={inputClasses}
                                value={selectedOnboardingStep}
                                onChange={(e) => setSelectedOnboardingStep(e.target.value as OnboardingStep)}
                            >
                                <option value="EMAIL_VERIFICATION">Email Verification</option>
                                <option value="PASSWORD_CREATION">Password Creation</option>
                                <option value="COMPANY_STEP_1">Company Step 1 (Basic Info)</option>
                                <option value="COMPANY_DETAILS">Company Details (Logo/Address)</option>
                                <option value="PHONE_VERIFICATION">Phone Verification</option>
                                <option value="COMPLETED">Completed (Full Access)</option>
                            </select>
                            <p className="text-xs text-amber-600 mt-2 font-medium bg-amber-50 p-3 rounded-lg flex items-start gap-2 border border-amber-100">
                                <AlertTriangle size={14} className="mt-0.5 shrink-0" />
                                Warning: Manually changing the onboarding status will affect all administrative users of this company. Use this only to bypass verification blocks.
                            </p>
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                            <button
                                onClick={() => setOnboardingModalOpen(false)}
                                className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 bg-white text-gray-700"
                            >
                                Cancel
                            </button>
                            <button
                                onClick={handleOnboardingUpdate}
                                disabled={isUpdatingOnboarding}
                                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2 shadow-sm"
                            >
                                {isUpdatingOnboarding ? <Loader2 className="animate-spin" size={16} /> : <Check size={16} />}
                                Apply Override
                            </button>
                        </div>
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

// --- Plans Management ---

const PlansPage = () => {
    const [plans, setPlans] = useState<BillingPlan[]>([]);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingPlan, setEditingPlan] = useState<BillingPlan | null>(null);
    const [formData, setFormData] = useState<CreatePlanRequest>({
        name: '', code: '', description: '', monthlyPriceTzs: 0, annualPriceTzs: 0, trialDays: 0, active: true
    });

    const fetchPlans = useCallback(async () => {
        try {
            const res = await api.superAdmin.plans.list();
            setPlans(res.data || []);
        } catch (error) {
            console.error(error);
        }
    }, []);

    useEffect(() => { fetchPlans(); }, [fetchPlans]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (editingPlan) {
                await api.superAdmin.plans.update(editingPlan.id, formData);
            } else {
                await api.superAdmin.plans.create(formData);
            }
            setIsModalOpen(false);
            setEditingPlan(null);
            setFormData({ name: '', code: '', description: '', monthlyPriceTzs: 0, annualPriceTzs: 0, trialDays: 0, active: true });
            fetchPlans();
        } catch (error) {
            alert('Operation failed');
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm("Are you sure you want to delete this plan?")) return;
        try {
            await api.superAdmin.plans.delete(id);
            fetchPlans();
        } catch (error) {
            alert("Delete failed");
        }
    };

    const openEdit = (plan: BillingPlan) => {
        setEditingPlan(plan);
        setFormData({
            name: plan.name,
            code: plan.code,
            description: plan.description,
            monthlyPriceTzs: plan.monthlyPriceTzs,
            annualPriceTzs: plan.annualPriceTzs,
            trialDays: plan.trialDays,
            active: plan.active ?? (plan as any).isActive
        });
        setIsModalOpen(true);
    };

    const inputClasses = "w-full border border-gray-300 p-2 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none";

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Billing Plans</h1>
                <button
                    onClick={() => { setEditingPlan(null); setFormData({ name: '', code: '', description: '', monthlyPriceTzs: 0, annualPriceTzs: 0, trialDays: 0, active: true }); setIsModalOpen(true); }}
                    className="bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 flex items-center gap-2 shadow-sm"
                >
                    <Plus size={18} /> Create Plan
                </button>
            </div>

            <DataTable<BillingPlan>
                data={plans}
                columns={[
                    { header: 'Name', accessor: (p) => <div className="font-medium text-gray-900">{p.name}</div> },
                    { header: 'Code', accessor: (p) => <code className="bg-gray-100 px-1 rounded text-xs">{p.code}</code> },
                    { header: 'Monthly (TZS)', accessor: (p) => (p.monthlyPriceTzs || 0).toLocaleString() },
                    { header: 'Annual (TZS)', accessor: (p) => (p.annualPriceTzs || 0).toLocaleString() },
                    { header: 'Trial', accessor: (p) => `${p.trialDays} days` },
                    {
                        header: 'Status', accessor: (p) => (
                            <span className={`px-2 py-1 text-xs font-semibold rounded-full ${p.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                {p.active ? 'Active' : 'Inactive'}
                            </span>
                        )
                    }
                ]}
                actions={(p: BillingPlan) => (
                    <div className="flex items-center justify-end gap-2">
                        <button onClick={() => openEdit(p)} className="text-blue-600 hover:bg-blue-50 p-1.5 rounded-md transition-colors"><Edit2 size={16} /></button>
                        <button onClick={() => handleDelete(p.id)} className="text-red-600 hover:bg-red-50 p-1.5 rounded-md transition-colors"><Trash2 size={16} /></button>
                    </div>
                )}
            />

            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={editingPlan ? "Edit Plan" : "Create New Plan"}>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Plan Name</label>
                            <input type="text" required className={inputClasses} value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Plan Code</label>
                            <input type="text" required className={inputClasses} value={formData.code} onChange={e => setFormData({ ...formData, code: e.target.value })} />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Description</label>
                        <textarea className={inputClasses} rows={2} value={formData.description || ''} onChange={e => setFormData({ ...formData, description: e.target.value })} />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Monthly Price (TZS)</label>
                            <input type="number" required className={inputClasses} value={formData.monthlyPriceTzs} onChange={e => setFormData({ ...formData, monthlyPriceTzs: Number(e.target.value) })} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Annual Price (TZS)</label>
                            <input type="number" required className={inputClasses} value={formData.annualPriceTzs} onChange={e => setFormData({ ...formData, annualPriceTzs: Number(e.target.value) })} />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Trial Days</label>
                            <input type="number" required className={inputClasses} value={formData.trialDays} onChange={e => setFormData({ ...formData, trialDays: Number(e.target.value) })} />
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <input type="checkbox" id="active" checked={formData.active} onChange={e => setFormData({ ...formData, active: e.target.checked })} />
                        <label htmlFor="active" className="text-sm font-medium text-gray-700 cursor-pointer">Plan is Active</label>
                    </div>
                    <div className="flex justify-end gap-3 mt-6 pt-4 border-t border-gray-100">
                        <button type="button" onClick={() => setIsModalOpen(false)} className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 text-gray-700 font-medium bg-white">Cancel</button>
                        <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium">Save Plan</button>
                    </div>
                </form>
            </Modal>
        </div>
    );
};

// --- Invoices Management ---

const InvoicesPage = () => {
    const [invoices, setInvoices] = useState<KazafitInvoice[]>([]);
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [loading, setLoading] = useState(false);

    const fetchInvoices = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.superAdmin.invoices.list(page, 10);
            if (res.data && 'content' in res.data) {
                const pageData = res.data as unknown as PageableResponse<KazafitInvoice>;
                setInvoices(pageData.content);
                setTotalPages(pageData.totalPages);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    }, [page]);

    useEffect(() => { fetchInvoices(); }, [fetchInvoices]);

    const handleExport = () => {
        if (invoices.length === 0) {
            alert("No data to export");
            return;
        }

        const headers = ["ID", "Company Name", "Plan", "Period", "Amount (TZS)", "Status", "Issued At", "Due At", "Paid At"];
        const csvContent = [
            headers.join(","),
            ...invoices.map(inv => [
                inv.id,
                `"${inv.companyName.replace(/"/g, '""')}"`,
                `"${inv.planName.replace(/"/g, '""')}"`,
                inv.period,
                inv.amountTzs,
                inv.status,
                inv.issuedAt,
                inv.dueAt,
                inv.paidAt || "N/A"
            ].join(","))
        ].join("\n");

        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement("a");
        const url = URL.createObjectURL(blob);
        link.setAttribute("href", url);
        link.setAttribute("download", `kazafit_invoices_${new Date().toISOString().split('T')[0]}.csv`);
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Invoices</h1>
                    <p className="text-gray-500 text-sm mt-1">View and export platform-wide invoices</p>
                </div>
                <button
                    onClick={handleExport}
                    disabled={invoices.length === 0 || loading}
                    className="bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 flex items-center gap-2 shadow-sm transition-colors disabled:opacity-50"
                >
                    <Download size={18} /> Export CSV
                </button>
            </div>

            <DataTable<KazafitInvoice>
                data={invoices}
                pagination={{ page, totalPages, onPageChange: setPage }}
                columns={[
                    { 
                        header: 'Invoice ID', 
                        accessor: (inv) => <span className="font-mono text-xs text-gray-500">{inv.id.slice(0, 8)}...</span> 
                    },
                    { 
                        header: 'Company', 
                        accessor: (inv) => <div className="font-medium text-gray-900">{inv.companyName}</div> 
                    },
                    { 
                        header: 'Plan', 
                        accessor: (inv) => (
                            <div>
                                <div className="text-sm">{inv.planName}</div>
                                <div className="text-xs text-gray-400 capitalize">{inv.period}</div>
                            </div>
                        )
                    },
                    { 
                        header: 'Amount', 
                        accessor: (inv) => (
                            <div className="font-semibold text-gray-900">
                                {inv.amountTzs.toLocaleString()} <span className="text-[10px] text-gray-400">TZS</span>
                            </div>
                        )
                    },
                    {
                        header: 'Status', 
                        accessor: (inv) => {
                            const statusStyles: Record<string, string> = {
                                'paid': 'bg-green-100 text-green-800',
                                'pending': 'bg-yellow-100 text-yellow-800',
                                'overdue': 'bg-red-100 text-red-800',
                                'cancelled': 'bg-gray-100 text-gray-800',
                            };
                            return (
                                <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-full ${statusStyles[inv.status.toLowerCase()] || 'bg-blue-100 text-blue-800'}`}>
                                    {inv.status}
                                </span>
                            );
                        }
                    },
                    { 
                        header: 'Due Date', 
                        accessor: (inv) => <div className="text-gray-500">{new Date(inv.dueAt).toLocaleDateString()}</div> 
                    },
                ]}
                actions={(inv: KazafitInvoice) => (
                    <div className="flex items-center justify-end gap-2">
                        <button 
                            onClick={() => {
                                alert(`Invoice Details: ${inv.id}\nPlan: ${inv.planName}\nAmount: ${inv.amountTzs} TZS`);
                            }} 
                            className="text-gray-600 hover:bg-gray-100 p-1.5 rounded-md transition-colors"
                            title="View Details"
                        >
                            <Eye size={16} />
                        </button>
                    </div>
                )}
            />
        </div>
    );
};

// --- Partners Management ---

const PartnersPage = () => {
    const [partners, setPartners] = useState<Partner[]>([]);
    const [analytics, setAnalytics] = useState<PartnerAnalytics | null>(null);
    const [page, setPage] = useState(0);
    const [totalPages, setTotalPages] = useState(0);
    const [loading, setLoading] = useState(false);
    
    // Period / Date Range State
    const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month' | 'custom'>('month');
    const [customRange, setCustomRange] = useState({ start: '', end: '' });
    
    // Modal States
    const [isOverrideModalOpen, setIsOverrideModalOpen] = useState(false);
    const [isConfigModalOpen, setIsConfigModalOpen] = useState(false);
    const [isHistoryModalOpen, setIsHistoryModalOpen] = useState(false);
    
    const [selectedPartner, setSelectedPartner] = useState<Partner | null>(null);
    const [partnerHistory, setPartnerHistory] = useState<PartnerHistoryEntry[]>([]);
    const [isHistoryLoading, setIsHistoryLoading] = useState(false);

    const [paymentMethods, setPaymentMethods] = useState<PartnerPaymentMethod[]>([]);
    const [isPaymentMethodsLoading, setIsPaymentMethodsLoading] = useState(false);
    const [isPaymentMethodsModalOpen, setIsPaymentMethodsModalOpen] = useState(false);

    const [formData, setFormData] = useState<CommissionOverrideRequest>({
        rate: 10.0,
        type: 'percent',
        schedule: 'Monthly'
    });

    const [configFormData, setConfigFormData] = useState<PartnerConfig>({
        defaultCommissionRate: 10.0,
        defaultCommissionType: 'percent',
        defaultPayoutSchedule: 'Monthly'
    });

    const getDateRange = useCallback(() => {
        const now = new Date();
        let start = new Date();
        let end = new Date();

        switch (selectedPeriod) {
            case 'today':
                start.setHours(0, 0, 0, 0);
                end.setHours(23, 59, 59, 999);
                break;
            case 'week':
                const day = now.getDay();
                const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday
                start.setDate(diff);
                start.setHours(0, 0, 0, 0);
                break;
            case 'month':
                start = new Date(now.getFullYear(), now.getMonth(), 1);
                break;
            case 'custom':
                if (customRange.start && customRange.end) {
                    return { start: new Date(customRange.start).toISOString(), end: new Date(customRange.end).toISOString() };
                }
                return { start: undefined, end: undefined };
        }
        return { start: start.toISOString(), end: end.toISOString() };
    }, [selectedPeriod, customRange]);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const range = getDateRange();
            const [analyticsRes, partnersRes] = await Promise.all([
                api.superAdmin.partners.getAnalytics(range.start, range.end),
                api.superAdmin.partners.list(page, 10)
            ]);
            
            if (analyticsRes.success) setAnalytics(analyticsRes.data);
            
            if (partnersRes.data && 'content' in partnersRes.data) {
                const pageData = partnersRes.data as unknown as PageableResponse<Partner>;
                setPartners(pageData.content);
                setTotalPages(pageData.totalPages);
            } else {
                setPartners(Array.isArray(partnersRes.data) ? partnersRes.data : []);
                setTotalPages(1);
            }
        } catch (error) {
            console.error("Failed to fetch partner data:", error);
        } finally {
            setLoading(false);
        }
    }, [page, getDateRange]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const fetchHistory = async (partner: Partner) => {
        setSelectedPartner(partner);
        setIsHistoryModalOpen(true);
        setIsHistoryLoading(true);
        try {
            const range = getDateRange();
            const res = await api.superAdmin.partners.getHistory(partner.id, range.start, range.end);
            if (res.success) {
                setPartnerHistory(res.data);
            }
        } catch (error) {
            console.error("Failed to fetch partner history:", error);
        } finally {
            setIsHistoryLoading(false);
        }
    };

    const fetchPaymentMethods = async (partner: Partner) => {
        setSelectedPartner(partner);
        setIsPaymentMethodsModalOpen(true);
        setIsPaymentMethodsLoading(true);
        try {
            const res = await api.superAdmin.partners.getPaymentMethods(partner.id);
            if (res.success) {
                setPaymentMethods(res.data);
            }
        } catch (error) {
            console.error("Failed to fetch partner payment methods:", error);
        } finally {
            setIsPaymentMethodsLoading(false);
        }
    };

    const openConfigModal = async () => {
        try {
            const res = await api.superAdmin.partners.getConfig();
            if (res.success && res.data) {
                setConfigFormData(res.data);
                setIsConfigModalOpen(true);
            } else {
                alert("Failed to retrieve system defaults. Please try again.");
            }
        } catch (error: any) {
            console.error("Failed to fetch partner config:", error);
            alert(error.message || "Failed to fetch configuration defaults.");
        }
    };

    const handleConfigSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const res = await api.superAdmin.partners.updateConfig(configFormData);
            if (res.success) {
                setIsConfigModalOpen(false);
                alert("Global configuration updated successfully.");
            } else {
                alert(res.message || "Failed to update configuration defaults.");
            }
        } catch (error: any) {
            alert(error.message || "Failed to update configuration");
        } finally {
            setLoading(false);
        }
    };

    const handleOverrideSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedPartner) return;
        try {
            await api.superAdmin.partners.updateCommission(selectedPartner.id, formData);
            setIsOverrideModalOpen(false);
            fetchData();
            alert("Commission override updated successfully. Partner has been notified via email.");
        } catch (error: any) {
            alert(error.message || "Failed to update commission override");
        }
    };

    const openOverrideModal = (partner: Partner) => {
        setSelectedPartner(partner);
        setFormData({
            rate: partner.commissionRate,
            type: partner.commissionType,
            schedule: partner.payoutSchedule || 'Monthly'
        });
        setIsOverrideModalOpen(true);
    };

    const inputClasses = "w-full border border-gray-300 p-2 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none";

    return (
        <div>
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center mb-6 gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Partner Management</h1>
                    <p className="text-gray-500 text-sm mt-1">Oversight for platform partners and commission configurations</p>
                </div>
                <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                    <div className="flex bg-gray-100 p-1 rounded-xl border border-gray-200">
                        {(['today', 'week', 'month', 'custom'] as const).map((period) => (
                            <button
                                key={period}
                                onClick={() => setSelectedPeriod(period)}
                                className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all capitalize ${
                                    selectedPeriod === period 
                                    ? 'bg-white text-blue-600 shadow-sm' 
                                    : 'text-gray-500 hover:text-gray-700'
                                }`}
                            >
                                {period}
                            </button>
                        ))}
                    </div>

                    <button
                        onClick={openConfigModal}
                        className="flex items-center gap-2 px-4 py-2 bg-white border border-gray-200 rounded-xl text-sm font-bold text-gray-700 hover:bg-gray-50 transition-all shadow-sm"
                    >
                        <Settings size={18} className="text-blue-600" />
                        System Defaults
                    </button>
                    
                    <button
                        onClick={() => fetchData()}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all border border-gray-200 bg-white"
                        title="Refresh Data"
                    >
                        <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
                    </button>
                </div>
            </div>

            {selectedPeriod === 'custom' && (
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 mb-6 flex flex-wrap items-center gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="flex items-center gap-2">
                        <label className="text-xs font-bold text-gray-400 uppercase">Start Date</label>
                        <input 
                            type="date" 
                            className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            value={customRange.start}
                            onChange={e => setCustomRange({...customRange, start: e.target.value})}
                        />
                    </div>
                    <div className="flex items-center gap-2">
                        <label className="text-xs font-bold text-gray-400 uppercase">End Date</label>
                        <input 
                            type="date" 
                            className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                            value={customRange.end}
                            onChange={e => setCustomRange({...customRange, end: e.target.value})}
                        />
                    </div>
                    <button 
                        onClick={() => fetchData()}
                        className="px-4 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700 transition-all shadow-md shadow-blue-100"
                    >
                        Apply Range
                    </button>
                </div>
            )}

            {/* Analytics Section */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
                    <div>
                        <h3 className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-1">Total Partners</h3>
                        <p className="text-3xl font-black text-gray-900">{analytics?.totalPartners || 0}</p>
                    </div>
                    <div className="p-3 bg-blue-50 rounded-xl text-blue-600">
                        <Handshake size={32} />
                    </div>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
                    <div>
                        <h3 className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-1">Total Referrals</h3>
                        <p className="text-3xl font-black text-blue-600">{analytics?.totalReferralsInPeriod || 0}</p>
                    </div>
                    <div className="p-3 bg-blue-50 rounded-xl text-blue-600">
                        <TrendingUp size={32} />
                    </div>
                </div>
                <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex items-center justify-between">
                    <div>
                        <h3 className="text-gray-500 text-xs font-bold uppercase tracking-wider mb-1">Total Income</h3>
                        <p className="text-3xl font-black text-green-600">
                            {(analytics?.totalIncomeInPeriod || 0).toLocaleString()} <span className="text-sm font-medium text-gray-400">TZS</span>
                        </p>
                    </div>
                    <div className="p-3 bg-green-50 rounded-xl text-green-600">
                        <DollarSign size={32} />
                    </div>
                </div>
            </div>

            <DataTable<Partner>
                data={partners}
                pagination={{ page, totalPages, onPageChange: setPage }}
                columns={[
                    {
                        header: 'Partner Name',
                        accessor: (p) => (
                            <div>
                                <div className="font-bold text-gray-900">{p.referrerName}</div>
                                <div className="text-xs text-gray-500">{p.referrerEmail}</div>
                            </div>
                        )
                    },
                    {
                        header: 'Business',
                        accessor: (p) => <span className="text-gray-700 font-medium">{p.businessName || 'N/A'}</span>
                    },
                    {
                        header: 'Commission',
                        accessor: (p) => (
                            <div className="flex items-center gap-2">
                                <span className="font-semibold text-gray-900">{p.commissionRate}{p.commissionType === 'percent' ? '%' : ' TZS'}</span>
                                <span className="text-[10px] px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded uppercase font-bold">{p.commissionType}</span>
                            </div>
                        )
                    },
                    {
                        header: 'Schedule',
                        accessor: (p) => <span className="text-gray-600 text-sm">{p.payoutSchedule || 'Monthly'}</span>
                    },
                    {
                        header: 'Referrals',
                        accessor: (p) => (
                            <div className="flex flex-col">
                                <span className="font-medium text-gray-900">{p.totalReferrals || 0}</span>
                                <span className="text-[10px] text-gray-400">{(p.totalCommissionTzs || 0).toLocaleString()} TZS</span>
                            </div>
                        )
                    },
                    {
                        header: 'Status',
                        accessor: (p) => (
                            <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-full ${p.active ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                {p.active ? 'ACTIVE' : 'INACTIVE'}
                            </span>
                        )
                    }
                ]}
                actions={(p: Partner) => (
                    <div className="flex items-center justify-end gap-2">
                        <button
                            onClick={() => fetchHistory(p)}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-gray-600 hover:bg-gray-100 rounded-lg transition-all"
                            title="View History"
                        >
                            <History size={14} /> History
                        </button>
                        <button
                            onClick={() => fetchPaymentMethods(p)}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-green-600 hover:bg-green-50 rounded-lg transition-all"
                            title="Payment Methods"
                        >
                            <CreditCard size={14} /> Payments
                        </button>
                        <button
                            onClick={() => openOverrideModal(p)}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                            title="Override Commission"
                        >
                            <Edit2 size={14} /> Override
                        </button>
                    </div>
                )}
            />

            {/* Commission Override Modal */}
            <Modal
                isOpen={isOverrideModalOpen}
                onClose={() => setIsOverrideModalOpen(false)}
                title="Commission Override"
            >
                {selectedPartner && (
                    <form onSubmit={handleOverrideSubmit} className="space-y-6">
                        <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                            <h4 className="font-bold text-blue-900">{selectedPartner.referrerName}</h4>
                            <p className="text-xs text-blue-700">Updating commission for this partner will trigger an automated SendPulse notification.</p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Commission Rate</label>
                                <div className="relative">
                                    <input
                                        type="number"
                                        step="0.1"
                                        required
                                        className={inputClasses}
                                        value={formData.rate}
                                        onChange={e => setFormData({ ...formData, rate: parseFloat(e.target.value) })}
                                    />
                                    <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold">
                                        {formData.type === 'percent' ? '%' : 'TZS'}
                                    </div>
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-semibold text-gray-700 mb-1.5">Rate Type</label>
                                <select
                                    className={inputClasses}
                                    value={formData.type}
                                    onChange={e => setFormData({ ...formData, type: e.target.value as 'flat' | 'percent' })}
                                >
                                    <option value="flat">Flat</option>
                                    <option value="percent">Percent</option>
                                </select>
                            </div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Payment Schedule</label>
                            <input
                                type="text"
                                required
                                placeholder="e.g. Monthly, Quarterly, Weekly"
                                className={inputClasses}
                                value={formData.schedule}
                                onChange={e => setFormData({ ...formData, schedule: e.target.value })}
                            />
                        </div>

                        <div className="flex justify-end gap-3 pt-6 border-t border-gray-100">
                            <button
                                type="button"
                                onClick={() => setIsOverrideModalOpen(false)}
                                className="px-6 py-2 border border-gray-300 rounded-xl hover:bg-gray-50 text-gray-700 font-bold transition-all"
                            >
                                Cancel
                            </button>
                            <button
                                type="submit"
                                className="px-6 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-bold shadow-lg shadow-blue-200 transition-all"
                            >
                                Update Commission
                            </button>
                        </div>
                    </form>
                )}
            </Modal>

            {/* Global Configuration Modal */}
            <Modal
                isOpen={isConfigModalOpen}
                onClose={() => setIsConfigModalOpen(false)}
                title="Global Partner Configuration"
            >
                <form onSubmit={handleConfigSubmit} className="space-y-6">
                    <div className="p-4 bg-amber-50 rounded-xl border border-amber-100 flex items-start gap-3">
                        <AlertTriangle className="text-amber-600 shrink-0 mt-0.5" size={18} />
                        <div>
                            <h4 className="font-bold text-amber-900 text-sm">System Defaults</h4>
                            <p className="text-xs text-amber-700">These settings apply to all new partners upon registration unless overridden individually.</p>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Default Rate</label>
                            <div className="relative">
                                <input
                                    type="number"
                                    step="0.1"
                                    required
                                    className={inputClasses}
                                    value={configFormData.defaultCommissionRate}
                                    onChange={e => setConfigFormData({ ...configFormData, defaultCommissionRate: parseFloat(e.target.value) })}
                                />
                                <div className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 font-bold text-xs uppercase">
                                    {configFormData.defaultCommissionType === 'percent' ? '%' : 'TZS'}
                                </div>
                            </div>
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Commission Type</label>
                            <select
                                className={inputClasses}
                                value={configFormData.defaultCommissionType}
                                onChange={e => setConfigFormData({ ...configFormData, defaultCommissionType: e.target.value as 'flat' | 'percent' })}
                            >
                                <option value="flat">Flat</option>
                                <option value="percent">Percent</option>
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Default Payout Schedule</label>
                        <select
                            className={inputClasses}
                            value={configFormData.defaultPayoutSchedule}
                            onChange={e => setConfigFormData({ ...configFormData, defaultPayoutSchedule: e.target.value })}
                        >
                            <option value="Weekly">Weekly</option>
                            <option value="Monthly">Monthly</option>
                            <option value="Quarterly">Quarterly</option>
                            <option value="On Demand">On Demand</option>
                        </select>
                    </div>

                    <div className="flex justify-end gap-3 pt-6 border-t border-gray-100">
                        <button
                            type="button"
                            onClick={() => setIsConfigModalOpen(false)}
                            className="px-6 py-2 border border-gray-300 rounded-xl hover:bg-gray-50 text-gray-700 font-bold transition-all"
                        >
                            Cancel
                        </button>
                        <button
                            type="submit"
                            className="px-6 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-bold shadow-lg shadow-blue-200 transition-all"
                        >
                            Save Defaults
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Partner History Modal */}
            <Modal
                isOpen={isHistoryModalOpen}
                onClose={() => setIsHistoryModalOpen(false)}
                title="Partner Performance History"
            >
                {selectedPartner && (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                            <div>
                                <h4 className="font-bold text-gray-900">{selectedPartner.referrerName}</h4>
                                <p className="text-xs text-gray-500">{selectedPartner.referrerEmail}</p>
                            </div>
                            <div className="text-right">
                                <span className="text-[10px] font-black uppercase text-blue-600 bg-blue-50 px-2 py-1 rounded-md border border-blue-100">
                                    {selectedPeriod} View
                                </span>
                            </div>
                        </div>

                        {isHistoryLoading ? (
                            <div className="flex flex-col items-center justify-center py-12 gap-4">
                                <div className="relative">
                                    <div className="w-12 h-12 border-4 border-blue-100 border-t-blue-600 rounded-full animate-spin"></div>
                                    <History className="absolute inset-0 m-auto text-blue-600" size={20} />
                                </div>
                                <p className="text-sm font-medium text-gray-500">Retrieving historical data...</p>
                            </div>
                        ) : partnerHistory.length === 0 ? (
                            <div className="text-center py-12 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                                <Clock className="mx-auto text-gray-300 mb-2" size={40} />
                                <p className="text-gray-500 font-medium">No history recorded for this period.</p>
                            </div>
                        ) : (
                            <div className="space-y-3">
                                {partnerHistory.map((entry, idx) => (
                                        <div className="flex items-center justify-between p-4 bg-white border border-gray-100 rounded-xl hover:shadow-md hover:border-blue-100 transition-all group">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-gray-50 rounded-lg group-hover:bg-blue-50 transition-colors">
                                                    <Calendar size={16} className="text-gray-400 group-hover:text-blue-600" />
                                                </div>
                                                <div>
                                                    <div className="text-sm font-bold text-gray-900">{new Date(entry.recordedAt).toLocaleDateString()}</div>
                                                    <div className="text-[10px] text-gray-400 font-semibold uppercase">Success</div>
                                                </div>
                                            </div>
                                            <div className="flex gap-6">
                                                <div className="text-right">
                                                    <div className="text-[10px] text-gray-400 font-bold uppercase">Referrals</div>
                                                    <div className="text-sm font-black text-blue-600 flex items-center justify-end gap-1">
                                                        <Users size={12} /> {entry.referralsCount}
                                                    </div>
                                                </div>
                                                <div className="text-right min-w-[80px]">
                                                    <div className="text-[10px] text-gray-400 font-bold uppercase">Income</div>
                                                    <div className="text-sm font-black text-green-600">
                                                        {entry.incomeGeneratedTzs.toLocaleString()}
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                ))}
                            </div>
                        )}

                        <div className="flex justify-end pt-4">
                            <button
                                onClick={() => setIsHistoryModalOpen(false)}
                                className="px-6 py-2 bg-gray-900 text-white rounded-xl hover:bg-gray-800 font-bold transition-all shadow-lg"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                )}
            </Modal>
            {/* Partner Payment Methods Modal */}
            <Modal
                isOpen={isPaymentMethodsModalOpen}
                onClose={() => setIsPaymentMethodsModalOpen(false)}
                title="Partner Payout Accounts"
            >
                {selectedPartner && (
                    <div className="space-y-6">
                        <div className="flex items-center justify-between p-4 bg-gray-50 rounded-2xl border border-gray-100">
                            <div>
                                <h4 className="font-bold text-gray-900">{selectedPartner.referrerName}</h4>
                                <p className="text-xs text-gray-500">{selectedPartner.referrerEmail}</p>
                            </div>
                            <CreditCard className="text-blue-600" size={24} />
                        </div>

                        {isPaymentMethodsLoading ? (
                            <div className="flex flex-col items-center justify-center py-12 gap-4">
                                <Loader2 className="w-10 h-10 text-blue-600 animate-spin" />
                                <p className="text-sm font-medium text-gray-500">Retrieving payment methods...</p>
                            </div>
                        ) : paymentMethods.length === 0 ? (
                            <div className="text-center py-12 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
                                <CreditCard className="mx-auto text-gray-300 mb-2" size={40} />
                                <p className="text-gray-500 font-medium">No payout accounts registered.</p>
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {paymentMethods.map((method) => (
                                    <div key={method.id} className="relative overflow-hidden p-5 bg-white border border-gray-100 rounded-2xl hover:shadow-xl hover:border-blue-100 transition-all group">
                                        {method.isDefault && (
                                            <div className="absolute top-0 right-0 bg-blue-600 text-white text-[10px] font-black px-3 py-1 rounded-bl-xl uppercase tracking-tighter">
                                                Default
                                            </div>
                                        )}
                                        <div className="flex items-start justify-between mb-4">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 bg-gray-50 rounded-xl flex items-center justify-center group-hover:bg-blue-50 transition-colors">
                                                    <Building2 size={20} className="text-gray-400 group-hover:text-blue-600" />
                                                </div>
                                                <div>
                                                    <div className="text-[10px] text-gray-400 font-bold uppercase tracking-widest leading-none mb-1">{method.provider}</div>
                                                    <div className="text-sm font-black text-gray-900">{method.type} ACCOUNT</div>
                                                </div>
                                            </div>
                                        </div>
                                        <div className="space-y-2">
                                            <div className="flex justify-between items-center">
                                                <span className="text-xs font-medium text-gray-400 uppercase">Account Name</span>
                                                <span className="text-sm font-bold text-gray-800">{method.accountName}</span>
                                            </div>
                                            <div className="flex justify-between items-center">
                                                <span className="text-xs font-medium text-gray-400 uppercase">Account Number</span>
                                                <span className="text-sm font-mono font-bold text-blue-600 tracking-wider bg-blue-50 px-2 py-0.5 rounded-md">{method.accountNumber}</span>
                                            </div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        )}

                        <div className="flex justify-end pt-4 border-t border-gray-50">
                            <button
                                onClick={() => setIsPaymentMethodsModalOpen(false)}
                                className="px-8 py-2.5 bg-gray-900 text-white rounded-xl hover:bg-gray-800 font-bold transition-all shadow-lg active:scale-95 translate-y-0"
                            >
                                Close
                            </button>
                        </div>
                    </div>
                )}
            </Modal>
        </div>
    );
};

const PayoutsPage = () => {
    const [payouts, setPayouts] = useState<PartnerPayout[]>([]);
    const [partners, setPartners] = useState<Partner[]>([]);
    const [loading, setLoading] = useState(false);
    
    // Period / Date Range State
    const [selectedPeriod, setSelectedPeriod] = useState<'today' | 'week' | 'month' | 'custom'>('month');
    const [customRange, setCustomRange] = useState({ start: '', end: '' });

    // Modal States
    const [isInitiateModalOpen, setIsInitiateModalOpen] = useState(false);
    const [isBulkModalOpen, setIsBulkModalOpen] = useState(false);
    const [isStatusModalOpen, setIsStatusModalOpen] = useState(false);
    
    // Form States
    const [selectedPayout, setSelectedPayout] = useState<PartnerPayout | null>(null);
    const [statusFormData, setStatusFormData] = useState<UpdatePayoutStatusRequest>({ status: 'PENDING', reference: '' });
    
    const [payoutFormData, setPayoutFormData] = useState<CreatePayoutRequest>({
        partnerId: '',
        amount: 0,
        paymentMethodId: '',
        notes: ''
    });
    const [partnerMethods, setPartnerMethods] = useState<PartnerPaymentMethod[]>([]);
    const [isMethodsLoading, setIsMethodsLoading] = useState(false);

    // Bulk Payout State
    const [selectedPartnerIds, setSelectedPartnerIds] = useState<string[]>([]);
    const [isProcessingBulk, setIsProcessingBulk] = useState(false);
    const [bulkProgress, setBulkProgress] = useState({ current: 0, total: 0 });

    const getDateRange = useCallback(() => {
        const now = new Date();
        let start = new Date();
        let end = new Date();

        switch (selectedPeriod) {
            case 'today':
                start.setHours(0, 0, 0, 0);
                end.setHours(23, 59, 59, 999);
                break;
            case 'week':
                const day = now.getDay();
                const diff = now.getDate() - day + (day === 0 ? -6 : 1);
                start.setDate(diff);
                start.setHours(0, 0, 0, 0);
                break;
            case 'month':
                start = new Date(now.getFullYear(), now.getMonth(), 1);
                break;
            case 'custom':
                if (customRange.start && customRange.end) {
                    return { start: new Date(customRange.start).toISOString(), end: new Date(customRange.end).toISOString() };
                }
                return { start: undefined, end: undefined };
        }
        return { start: start.toISOString(), end: end.toISOString() };
    }, [selectedPeriod, customRange]);

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            const range = getDateRange();
            const [payoutsRes, partnersRes] = await Promise.all([
                api.superAdmin.partners.payouts.list(range.start, range.end),
                api.superAdmin.partners.list(0, 1000) // Fetch all partners for selection
            ]);
            
            if (payoutsRes.success) setPayouts(payoutsRes.data);
            
            if (partnersRes.data && 'content' in partnersRes.data) {
                setPartners((partnersRes.data as any).content);
            } else {
                setPartners(Array.isArray(partnersRes.data) ? partnersRes.data : []);
            }
        } catch (error) {
            console.error("Failed to fetch payout data:", error);
        } finally {
            setLoading(false);
        }
    }, [getDateRange]);

    useEffect(() => { fetchData(); }, [fetchData]);

    const handlePartnerChange = async (partnerId: string) => {
        setPayoutFormData({ ...payoutFormData, partnerId, paymentMethodId: '' });
        setPartnerMethods([]);
        if (!partnerId) return;

        setIsMethodsLoading(true);
        try {
            const res = await api.superAdmin.partners.getPaymentMethods(partnerId);
            if (res.success) {
                setPartnerMethods(res.data);
                // Auto-select default or first method
                const defaultMethod = res.data.find(m => m.isDefault) || res.data[0];
                if (defaultMethod) {
                    setPayoutFormData(prev => ({ ...prev, paymentMethodId: defaultMethod.id }));
                }
            }
        } catch (error) {
            console.error("Failed to fetch methods:", error);
        } finally {
            setIsMethodsLoading(false);
        }
    };

    const handleInitiateSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.superAdmin.partners.payouts.create(payoutFormData);
            setIsInitiateModalOpen(false);
            setPayoutFormData({ partnerId: '', amount: 0, paymentMethodId: '', notes: '' });
            fetchData();
            alert("Payout initiated successfully. Status is PENDING.");
        } catch (error: any) {
            alert(error.message || "Failed to initiate payout");
        }
    };

    const openStatusModal = (payout: PartnerPayout) => {
        setSelectedPayout(payout);
        setStatusFormData({ status: payout.status, reference: payout.reference || '' });
        setIsStatusModalOpen(true);
    };

    const handleStatusSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!selectedPayout) return;
        try {
            await api.superAdmin.partners.payouts.updateStatus(selectedPayout.id, statusFormData);
            setIsStatusModalOpen(false);
            fetchData();
            alert("Payout status updated successfully.");
        } catch (error: any) {
            alert(error.message || "Failed to update status");
        }
    };

    const handleBulkPayout = async () => {
        if (selectedPartnerIds.length === 0) return;
        if (!window.confirm(`Are you sure you want to process payouts for ${selectedPartnerIds.length} partners?`)) return;

        setIsProcessingBulk(true);
        setBulkProgress({ current: 0, total: selectedPartnerIds.length });

        for (const partnerId of selectedPartnerIds) {
            const partner = partners.find(p => p.id === partnerId);
            if (!partner) continue;

            const availableBalance = partner.totalCommissionTzs - (partner.paidCommissionTzs || 0);
            if (availableBalance <= 0) {
                setBulkProgress(prev => ({ ...prev, current: prev.current + 1 }));
                continue;
            }

            try {
                // Fetch payment methods to get default
                const methodsRes = await api.superAdmin.partners.getPaymentMethods(partnerId);
                const methodId = methodsRes.data?.find(m => m.isDefault)?.id || methodsRes.data?.[0]?.id;

                if (methodId) {
                    await api.superAdmin.partners.payouts.create({
                        partnerId,
                        amount: availableBalance,
                        paymentMethodId: methodId,
                        notes: `Bulk payout generated on ${new Date().toLocaleDateString()}`
                    });
                }
            } catch (error) {
                console.error(`Failed bulk payout for partner ${partnerId}:`, error);
            }
            setBulkProgress(prev => ({ ...prev, current: prev.current + 1 }));
        }

        setIsProcessingBulk(false);
        setIsBulkModalOpen(false);
        setSelectedPartnerIds([]);
        fetchData();
        alert("Bulk payout processing completed.");
    };

    const statusStyles: Record<string, string> = {
        'PENDING': 'bg-yellow-100 text-yellow-800',
        'PROCESSING': 'bg-blue-100 text-blue-800',
        'COMPLETED': 'bg-green-100 text-green-800',
        'FAILED': 'bg-red-100 text-red-800',
    };

    const inputClasses = "w-full border border-gray-300 p-2 rounded-lg bg-white text-gray-900 focus:ring-2 focus:ring-blue-500 outline-none transition-all";

    return (
        <div className="space-y-6">
            <div className="flex flex-col lg:flex-row justify-between items-start lg:items-center gap-4">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">Partner Payouts</h1>
                    <p className="text-gray-500 text-sm mt-1">Manage financial settlements and payout history</p>
                </div>
                <div className="flex flex-wrap items-center gap-3">
                    <div className="flex bg-gray-100 p-1 rounded-xl border border-gray-200">
                        {(['today', 'week', 'month', 'custom'] as const).map((period) => (
                            <button
                                key={period}
                                onClick={() => setSelectedPeriod(period)}
                                className={`px-4 py-1.5 text-xs font-bold rounded-lg transition-all capitalize ${
                                    selectedPeriod === period 
                                    ? 'bg-white text-blue-600 shadow-sm' 
                                    : 'text-gray-500 hover:text-gray-700'
                                }`}
                            >
                                {period}
                            </button>
                        ))}
                    </div>
                    
                    <button
                        onClick={() => setIsBulkModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-sm font-bold hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100"
                    >
                        <RefreshCw size={18} />
                        Bulk Payout
                    </button>

                    <button
                        onClick={() => setIsInitiateModalOpen(true)}
                        className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-bold hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
                    >
                        <Plus size={18} />
                        Initiate Payout
                    </button>
                    
                    <button
                        onClick={() => fetchData()}
                        className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-xl transition-all border border-gray-200 bg-white"
                        title="Refresh Data"
                    >
                        <RefreshCw size={20} className={loading ? "animate-spin" : ""} />
                    </button>
                </div>
            </div>

            {selectedPeriod === 'custom' && (
                <div className="bg-white p-4 rounded-2xl shadow-sm border border-gray-100 flex flex-wrap items-center gap-4 animate-in fade-in slide-in-from-top-2 duration-300">
                    <div className="flex items-center gap-2">
                        <label className="text-xs font-bold text-gray-400 uppercase">Start</label>
                        <input type="date" className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm" value={customRange.start} onChange={e => setCustomRange({...customRange, start: e.target.value})} />
                    </div>
                    <div className="flex items-center gap-2">
                        <label className="text-xs font-bold text-gray-400 uppercase">End</label>
                        <input type="date" className="px-3 py-1.5 border border-gray-200 rounded-lg text-sm" value={customRange.end} onChange={e => setCustomRange({...customRange, end: e.target.value})} />
                    </div>
                    <button onClick={() => fetchData()} className="px-4 py-1.5 bg-blue-600 text-white text-xs font-bold rounded-lg hover:bg-blue-700">Apply</button>
                </div>
            )}

            <DataTable<PartnerPayout>
                data={payouts}
                columns={[
                    {
                        header: 'Partner',
                        accessor: (p) => (
                            <div>
                                <div className="font-bold text-gray-900">{partners.find(pt => pt.id === p.partnerId)?.referrerName || 'Unknown Partner'}</div>
                                <div className="text-[10px] text-gray-400 font-mono">{p.partnerId}</div>
                            </div>
                        )
                    },
                    {
                        header: 'Amount',
                        accessor: (p) => (
                            <div className="font-black text-gray-900">
                                {p.amount.toLocaleString()} <span className="text-[10px] text-gray-400">TZS</span>
                            </div>
                        )
                    },
                    {
                        header: 'Status',
                        accessor: (p) => (
                            <span className={`px-2 py-0.5 text-[10px] font-bold uppercase rounded-full ${statusStyles[p.status]}`}>
                                {p.status}
                            </span>
                        )
                    },
                    {
                        header: 'Reference',
                        accessor: (p) => <span className="text-xs font-mono text-gray-500">{p.reference || 'N/A'}</span>
                    },
                    {
                        header: 'Date',
                        accessor: (p) => (
                            <div className="text-xs text-gray-500">
                                <div>{new Date(p.createdAt).toLocaleDateString()}</div>
                                <div className="text-[10px] text-gray-400">{new Date(p.createdAt).toLocaleTimeString()}</div>
                            </div>
                        )
                    }
                ]}
                actions={(p) => (
                    <button
                        onClick={() => openStatusModal(p)}
                        className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-blue-600 hover:bg-blue-50 rounded-lg transition-all"
                    >
                        <Settings size={14} /> Manage
                    </button>
                )}
            />

            {/* Initiate Payout Modal */}
            <Modal isOpen={isInitiateModalOpen} onClose={() => setIsInitiateModalOpen(false)} title="Initiate New Payout">
                <form onSubmit={handleInitiateSubmit} className="space-y-5">
                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Select Partner</label>
                        <select
                            required
                            className={inputClasses}
                            value={payoutFormData.partnerId}
                            onChange={(e) => handlePartnerChange(e.target.value)}
                        >
                            <option value="">Choose a partner...</option>
                            {partners.map(p => (
                                <option key={p.id} value={p.id}>
                                    {p.referrerName} (Bal: {(p.totalCommissionTzs - (p.paidCommissionTzs || 0)).toLocaleString()} TZS)
                                </option>
                            ))}
                        </select>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Amount (TZS)</label>
                            <input
                                type="number"
                                required
                                className={inputClasses}
                                value={payoutFormData.amount}
                                onChange={e => setPayoutFormData({...payoutFormData, amount: parseFloat(e.target.value)})}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Payment Method</label>
                            <select
                                required
                                disabled={isMethodsLoading || !payoutFormData.partnerId}
                                className={inputClasses}
                                value={payoutFormData.paymentMethodId}
                                onChange={e => setPayoutFormData({...payoutFormData, paymentMethodId: e.target.value})}
                            >
                                <option value="">Select account...</option>
                                {partnerMethods.map(m => (
                                    <option key={m.id} value={m.id}>{m.provider} - {m.accountNumber} ({m.type})</option>
                                ))}
                            </select>
                            {isMethodsLoading && <p className="text-[10px] text-blue-500 mt-1 animate-pulse">Loading methods...</p>}
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-semibold text-gray-700 mb-1.5">Notes (Optional)</label>
                        <textarea
                            className={inputClasses}
                            rows={2}
                            placeholder="e.g. Monthly commission for March 2026"
                            value={payoutFormData.notes}
                            onChange={e => setPayoutFormData({...payoutFormData, notes: e.target.value})}
                        />
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                        <button type="button" onClick={() => setIsInitiateModalOpen(false)} className="px-6 py-2 border border-gray-300 rounded-xl hover:bg-gray-50 text-gray-700 font-bold">Cancel</button>
                        <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-bold shadow-lg shadow-blue-200">
                            Create Payout Record
                        </button>
                    </div>
                </form>
            </Modal>

            {/* Status Update Modal */}
            <Modal isOpen={isStatusModalOpen} onClose={() => setIsStatusModalOpen(false)} title="Update Payout Status">
                {selectedPayout && (
                    <form onSubmit={handleStatusSubmit} className="space-y-5">
                        <div className="p-4 bg-blue-50 rounded-xl border border-blue-100">
                            <div className="text-xs font-bold text-blue-600 uppercase mb-1">Current Payout</div>
                            <div className="text-sm font-black text-blue-900">{selectedPayout.amount.toLocaleString()} TZS</div>
                            <div className="text-xs text-blue-700 mt-1">Status: {selectedPayout.status}</div>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">New Status</label>
                            <select
                                required
                                className={inputClasses}
                                value={statusFormData.status}
                                onChange={e => setStatusFormData({...statusFormData, status: e.target.value as PayoutStatus})}
                            >
                                <option value="PENDING">Pending</option>
                                <option value="PROCESSING">Processing</option>
                                <option value="COMPLETED">Completed</option>
                                <option value="FAILED">Failed</option>
                            </select>
                        </div>

                        <div>
                            <label className="block text-sm font-semibold text-gray-700 mb-1.5">Transaction Reference</label>
                            <input
                                type="text"
                                placeholder="Bank/M-Pesa Reference ID"
                                className={inputClasses}
                                value={statusFormData.reference}
                                onChange={e => setStatusFormData({...statusFormData, reference: e.target.value})}
                            />
                            <p className="text-[10px] text-gray-400 mt-1">Required for COMPLETED status tracking</p>
                        </div>

                        <div className="flex justify-end gap-3 pt-4 border-t border-gray-100">
                            <button type="button" onClick={() => setIsStatusModalOpen(false)} className="px-6 py-2 border border-gray-300 rounded-xl hover:bg-gray-50 text-gray-700 font-bold">Cancel</button>
                            <button type="submit" className="px-6 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 font-bold shadow-lg shadow-blue-200">
                                Save Status
                            </button>
                        </div>
                    </form>
                )}
            </Modal>

            {/* Bulk Payout Modal */}
            <Modal isOpen={isBulkModalOpen} onClose={() => setIsBulkModalOpen(false)} title="Bulk Payout Processing">
                <div className="space-y-5">
                    <div className="p-4 bg-indigo-50 rounded-xl border border-indigo-100 flex items-start gap-3">
                        <AlertTriangle className="text-indigo-600 shrink-0 mt-0.5" size={18} />
                        <div>
                            <h4 className="font-bold text-indigo-900 text-sm">Automated Settlement</h4>
                            <p className="text-xs text-indigo-700">Select partners to generate payout records for their full available balance. This uses their default payment method.</p>
                        </div>
                    </div>

                    <div className="max-h-[300px] overflow-y-auto space-y-2 border border-gray-100 rounded-xl p-2">
                        {partners.filter(p => (p.totalCommissionTzs - (p.paidCommissionTzs || 0)) > 0).map(p => (
                            <label key={p.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-xl cursor-pointer hover:bg-gray-100 transition-colors">
                                <div className="flex items-center gap-3">
                                    <input
                                        type="checkbox"
                                        checked={selectedPartnerIds.includes(p.id)}
                                        onChange={() => {
                                            setSelectedPartnerIds(prev => 
                                                prev.includes(p.id) ? prev.filter(id => id !== p.id) : [...prev, p.id]
                                            );
                                        }}
                                        className="w-4 h-4 text-indigo-600 rounded focus:ring-indigo-500"
                                    />
                                    <div>
                                        <div className="text-sm font-bold text-gray-900">{p.referrerName}</div>
                                        <div className="text-[10px] text-gray-500">{p.businessName}</div>
                                    </div>
                                </div>
                                <div className="text-right">
                                    <div className="text-sm font-black text-indigo-600">{(p.totalCommissionTzs - (p.paidCommissionTzs || 0)).toLocaleString()}</div>
                                    <div className="text-[10px] text-gray-400 font-bold uppercase">Available</div>
                                </div>
                            </label>
                        ))}
                    </div>

                    {isProcessingBulk && (
                        <div className="space-y-2">
                            <div className="flex justify-between text-xs font-bold text-gray-500">
                                <span>Processing...</span>
                                <span>{bulkProgress.current} / {bulkProgress.total}</span>
                            </div>
                            <div className="w-full bg-gray-100 rounded-full h-2 overflow-hidden border border-gray-200">
                                <div 
                                    className="bg-indigo-600 h-full transition-all duration-300"
                                    style={{ width: `${(bulkProgress.current / bulkProgress.total) * 100}%` }}
                                />
                            </div>
                        </div>
                    )}

                    <div className="flex justify-between items-center bg-gray-900 p-4 rounded-xl text-white">
                        <div>
                            <div className="text-[10px] font-bold text-gray-400 uppercase">Selected Total</div>
                            <div className="text-lg font-black">
                                {partners
                                    .filter(p => selectedPartnerIds.includes(p.id))
                                    .reduce((sum, p) => sum + (p.totalCommissionTzs - (p.paidCommissionTzs || 0)), 0)
                                    .toLocaleString()
                                } <span className="text-xs text-gray-400">TZS</span>
                            </div>
                        </div>
                        <button
                            disabled={selectedPartnerIds.length === 0 || isProcessingBulk}
                            onClick={handleBulkPayout}
                            className={`px-6 py-2.5 rounded-xl font-bold transition-all flex items-center gap-2 ${
                                selectedPartnerIds.length === 0 || isProcessingBulk
                                ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                                : 'bg-indigo-500 hover:bg-indigo-400 text-white shadow-lg'
                            }`}
                        >
                            {isProcessingBulk ? <Loader2 className="animate-spin" size={18} /> : <TrendingUp size={18} />}
                            Process Bulk
                        </button>
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
                <Route path="/plans" element={<PlansPage />} />
                <Route path="/invoices" element={<InvoicesPage />} />
                <Route path="/partners" element={<PartnersPage />} />
                <Route path="/payouts" element={<PayoutsPage />} />
            </Routes>
        </Layout>
    );
};

const App: React.FC = () => {
    return (
        <HashRouter>
            <Routes>
                <Route path="/login" element={<Login />} />
                <Route path="/register" element={<OnboardingFlow />} />
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