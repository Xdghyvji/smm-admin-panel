import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInWithEmailAndPassword, onAuthStateChanged, signOut, createUserWithEmailAndPassword, signInWithCustomToken, signInAnonymously } from 'firebase/auth';
import { getFirestore, collection, query, onSnapshot, doc, getDoc, updateDoc, orderBy, getDocs, where, addDoc, collectionGroup, writeBatch, Timestamp, deleteDoc, setDoc, limit, runTransaction } from 'firebase/firestore';
import { Users, DollarSign, LifeBuoy, LogOut, Check, X, Eye as EyeIcon, Edit, ShoppingCart, UserPlus, Slash, BarChart, Settings, PlusCircle, Trash2, Send, Crown, CreditCard, Palette, Gift, Trophy, RefreshCw, Star, Sun, Moon, Droplets, Flame, Leaf, Zap, Mountain, Wind, Server, TrendingUp, FileText, Activity, AlertTriangle, ChevronsUpDown, Repeat, Ban, ChevronLeft, ChevronRight, Info, Search } from 'lucide-react';
import { BarChart as RechartsBarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LineChart, Line } from 'recharts';

// --- Firebase Configuration ---
// IMPORTANT: In a real production app, use environment variables for this configuration.
const firebaseConfig = {
    apiKey: "AIzaSyBgjU9fzFsfx6-gv4p0WWH77_U5BPk69A0",
    authDomain: "smmp-4b3cc.firebaseapp.com",
    projectId: "smmp-4b3cc",
    storageBucket: "smmp-4b3cc.firebasestorage.app",
    messagingSenderId: "43467456148",
    appId: "1:43467456148:web:368b011abf362791edfe81",
    measurementId: "G-Y6HBHEL742"
};


// --- Firebase Initialization ---
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// --- Admin Credentials & Constants ---
const ADMIN_EMAIL = "admin@paksmm.com";
const CURRENCY_SYMBOL = 'Rs';
const COMMISSION_RATE = 0.05; // 5%

// --- SECURE API Helper Function ---
// This function now securely calls our Netlify proxy function instead of the provider's API directly.
const callProviderApi = async (provider, action, params = {}) => {
    console.log(`[callProviderApi] Calling proxy for provider: ${provider.name}, action: ${action}`);
    
    const user = auth.currentUser;
    if (!user) {
        throw new Error("Authentication error: Admin user not found.");
    }
    const idToken = await user.getIdToken();

    const proxyUrl = '/.netlify/functions/api-provider-proxy';

    try {
        const response = await fetch(proxyUrl, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${idToken}`,
            },
            body: JSON.stringify({
                apiUrl: provider.apiUrl,
                apiKey: provider.apiKey,
                action: action,
                params: params,
            }),
        });

        if (!response.ok) {
            const errorData = await response.json();
            throw new Error(errorData.error || `Proxy request failed with status ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error("[callProviderApi] Error:", error);
        throw error;
    }
};


// --- Helper: Audit Log Function ---
const logAdminAction = async (action, details) => {
    try {
        if (auth.currentUser) {
            await addDoc(collection(db, 'audit_log'), {
                adminEmail: auth.currentUser.email,
                action,
                details,
                timestamp: Timestamp.now()
            });
        }
    } catch (error) {
        console.error("Failed to write to audit log:", error);
    }
};

// --- Particle Animation Component ---
const ParticleContainer = ({ effect }) => {
    const particleCount = 50;
    const particles = useMemo(() => Array.from({ length: particleCount }).map((_, i) => {
        const style = {
            left: `${Math.random() * 100}%`,
            top: `${Math.random() * 100}%`,
            animationDelay: `${Math.random() * 5}s`,
            animationDuration: `${Math.random() * 10 + 5}s`
        };
        switch (effect) {
            case 'meteor':
                return <div key={i} className="absolute bg-white rounded-full animate-meteor" style={style}></div>;
            case 'volcano':
                return <div key={i} className="absolute bg-orange-500 rounded-full animate-ember" style={style}></div>;
            case 'rising':
                return <div key={i} className="absolute bg-yellow-300 rounded-full animate-rising-star" style={style}></div>;
            case 'ocean':
                return <div key={i} className="absolute bg-blue-200 rounded-full animate-bubble" style={style}></div>;
            case 'forest':
                return <div key={i} className="absolute bg-green-300 rounded-full animate-leaf-fall" style={style}></div>;
            case 'electric':
                return <div key={i} className="absolute bg-yellow-400 w-1 h-1 rounded-full animate-zap" style={style}></div>;
            case 'mountain':
                return <div key={i} className="absolute bg-gray-400 w-px h-px animate-snow" style={style}></div>;
            case 'windy':
                return <div key={i} className="absolute bg-gray-200 w-4 h-px animate-wind" style={style}></div>;
            default: // nightsky and default
                return <div key={i} className="absolute bg-slate-400 rounded-full animate-twinkle" style={style}></div>;
        }
    }), [effect]);

    return <div className="fixed inset-0 -z-10 opacity-50">{particles}</div>;
};


// --- Main Admin App Component ---
function App() {
    const [admin, setAdmin] = useState(null);
    const [loading, setLoading] = useState(true);
    const [page, setPage] = useState('dashboard');
    const [theme, setTheme] = useState('default');
    const [pageTemplates, setPageTemplates] = useState({ landing: 'default', login: 'default' });
    const [notificationCounts, setNotificationCounts] = useState({ funds: 0, tickets: 0, withdrawals: 0, orders: 0 });
    const [isAuthReady, setIsAuthReady] = useState(false);

    useEffect(() => {
        const unsubscribeAuth = onAuthStateChanged(auth, (user) => {
            if (user && user.email === ADMIN_EMAIL) {
                setAdmin(user);
            } else {
                setAdmin(null);
            }
            setLoading(false);
            setIsAuthReady(true);
        });

        return () => unsubscribeAuth();
    }, []);

    useEffect(() => {
        if (!isAuthReady || !admin) return;

        const settingsRef = doc(db, "settings", "theme");
        const unsubscribeSettings = onSnapshot(settingsRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setTheme(data.name || 'default');
                setPageTemplates({
                    landing: data.landingTemplate || 'default',
                    login: data.loginTemplate || 'default'
                });
            }
        }, (error) => console.error("Settings listener error:", error));
        
        const qFunds = query(collectionGroup(db, 'fund_requests'), where('status', '==', 'pending'));
        const unsubscribeFunds = onSnapshot(qFunds, (snapshot) => {
            setNotificationCounts(prev => ({ ...prev, funds: snapshot.size }));
        }, (error) => console.error("Funds listener error:", error));

        const qTickets = query(collection(db, 'tickets'), where('status', '==', 'Open'));
        const unsubscribeTickets = onSnapshot(qTickets, (snapshot) => {
            setNotificationCounts(prev => ({ ...prev, tickets: snapshot.size }));
        }, (error) => console.error("Tickets listener error:", error));

        const qWithdrawals = query(collection(db, 'withdrawal_requests'), where('status', '==', 'pending'));
        const unsubscribeWithdrawals = onSnapshot(qWithdrawals, (snapshot) => {
            setNotificationCounts(prev => ({ ...prev, withdrawals: snapshot.size }));
        }, (error) => console.error("Withdrawals listener error:", error));

        const qOrders = query(collectionGroup(db, 'orders'), where('status', '==', 'Pending'));
        const unsubscribeOrders = onSnapshot(qOrders, (snapshot) => {
            setNotificationCounts(prev => ({ ...prev, orders: snapshot.size }));
        }, (error) => console.error("Orders listener error:", error));

        return () => {
            unsubscribeSettings();
            unsubscribeFunds();
            unsubscribeTickets();
            unsubscribeWithdrawals();
            unsubscribeOrders();
        };
    }, [isAuthReady, admin]);

    const handleLogout = async () => {
        await logAdminAction("ADMIN_LOGOUT", { email: auth.currentUser.email });
        await signOut(auth);
    };

    if (loading) return <div className="h-screen flex items-center justify-center bg-gray-100">Loading Admin Panel...</div>;
    if (!admin) return <AdminLoginPage template={pageTemplates.login} />;

    const PageContent = () => {
        switch (page) {
            case 'dashboard': return <AdminDashboard />;
            case 'users': return <UserManagementPage />;
            case 'funds': return <FundRequestsPage />;
            case 'transactions': return <AutomaticTransactionsPage />;
            case 'orders': return <AllOrdersPage />;
            case 'tickets': return <SupportTicketsPage />;
            case 'services': return <ManageServicesPage />;
            case 'providers': return <ApiProviderPage />;
            case 'paymentMethods': return <PaymentMethodsPage />;
            case 'theme': return <ChangeThemePage onThemeChange={setTheme} onTemplateChange={setPageTemplates} currentTemplates={pageTemplates} />;
            case 'withdrawals': return <WithdrawalRequestsPage />;
            case 'audit': return <AuditLogPage />;
            case 'ranks': return <ManageRanksPage />;
            default: return <AdminDashboard />;
        }
    };

    return (
        <div className={`relative min-h-screen font-sans theme-${theme}`}>
            <ParticleContainer effect={theme} />
            <div className="flex h-screen bg-gray-100/80 backdrop-blur-sm">
                <AdminSidebar navigateTo={setPage} currentPage={page} onLogout={handleLogout} notificationCounts={notificationCounts} />
                <div className="flex-1 flex flex-col">
                    <header className="bg-white/80 backdrop-blur-sm shadow-sm p-4 text-gray-800">
                        <h1 className="text-xl font-semibold text-right">Admin Panel</h1>
                    </header>
                    <main className="flex-1 p-6 overflow-y-auto">
                        <PageContent />
                    </main>
                </div>
            </div>
        </div>
    );
}

// --- Admin Login Page ---
function AdminLoginPage({ template = 'default' }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');

    const handleLogin = async (e) => {
        e.preventDefault();
        setError('');
        if (email !== ADMIN_EMAIL) {
            setError("Error: Only the admin email is allowed.");
            return;
        }
        try {
            await signInWithEmailAndPassword(auth, email, password);
            await logAdminAction("ADMIN_LOGIN_SUCCESS", { email });
        } catch (err) {
            console.error("Full login error:", err);
            if (err.code === 'auth/user-not-found') {
                setError(`Admin account not found. Please create an account for ${ADMIN_EMAIL} in your Firebase Authentication console.`);
            } else if (err.code === 'auth/wrong-password' || err.code === 'auth/invalid-credential') {
                setError('Incorrect password. Please try again.');
            } else {
                setError(`An unexpected error occurred: ${err.code}. Please check your Firebase project settings (e.g., API key restrictions, enabled sign-in providers).`);
            }
            await logAdminAction("ADMIN_LOGIN_FAIL", { email, error: err.code });
        }
    };
    
    const commonForm = (
        <>
            {error && <p className="bg-red-100 text-red-700 p-3 rounded mb-4 text-sm">{error}</p>}
            <form onSubmit={handleLogin} className="space-y-4">
                <input type="email" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} className="w-full p-2 border rounded" required />
                <input type="password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} className="w-full p-2 border rounded" required />
                <button type="submit" className="w-full bg-blue-600 text-white p-2 rounded hover:bg-blue-700">Login</button>
            </form>
        </>
    );

    switch (template) {
        case 'minimal':
            return (
                <div className="h-screen bg-gray-50 flex items-center justify-center">
                    <div className="w-full max-w-xs p-4">
                        <h1 className="text-3xl font-bold text-center mb-6 text-gray-700">Admin Access</h1>
                        {commonForm}
                    </div>
                </div>
            );
        case 'corporate':
            return (
                <div className="h-screen flex">
                    <div className="w-1/2 bg-slate-800 flex flex-col justify-center items-center text-white p-12">
                        <h1 className="text-4xl font-bold mb-4">Admin Panel</h1>
                        <p className="text-slate-300 text-center">Centralized control for your SMM platform.</p>
                    </div>
                    <div className="w-1/2 flex items-center justify-center bg-slate-50">
                        <div className="w-full max-w-sm p-8">
                            <h2 className="text-2xl font-semibold text-center mb-4 text-gray-800">Secure Login</h2>
                            {commonForm}
                        </div>
                    </div>
                </div>
            );
        default: // 'default' template
            return (
                <div className="h-screen bg-slate-200 flex items-center justify-center">
                    <div className="w-full max-w-sm bg-white p-8 rounded-lg shadow-md">
                        <h1 className="text-2xl font-bold text-center mb-4 text-gray-800">Admin Login</h1>
                        {commonForm}
                    </div>
                </div>
            );
    }
}

// --- Admin Sidebar ---
function AdminSidebar({ navigateTo, currentPage, onLogout, notificationCounts }) {
    const navItems = [
        { id: 'dashboard', label: 'Dashboard', icon: BarChart, notificationCount: 0 },
        { id: 'users', label: 'Manage Users', icon: Users, notificationCount: 0 },
        { id: 'funds', label: 'Fund Requests', icon: DollarSign, notificationCount: notificationCounts.funds },
        { id: 'transactions', label: 'Auto Transactions', icon: CreditCard, notificationCount: 0 },
        { id: 'orders', label: 'All Orders', icon: ShoppingCart, notificationCount: notificationCounts.orders },
        { id: 'withdrawals', label: 'Withdrawals', icon: Gift, notificationCount: notificationCounts.withdrawals },
        { id: 'services', label: 'Manage Services', icon: Settings, notificationCount: 0 },
        { id: 'providers', label: 'API Providers', icon: Server, notificationCount: 0 },
        { id: 'ranks', label: 'Manage Ranks', icon: Trophy, notificationCount: 0 },
        { id: 'paymentMethods', label: 'Payment Methods', icon: CreditCard, notificationCount: 0 },
        { id: 'theme', label: 'Change Theme', icon: Palette, notificationCount: 0 },
        { id: 'tickets', label: 'Support Tickets', icon: LifeBuoy, notificationCount: notificationCounts.tickets },
        { id: 'audit', label: 'Audit Log', icon: FileText, notificationCount: 0 }
    ];
    return (
        <div className="w-64 bg-slate-800 text-white flex flex-col">
            <div className="p-4 border-b border-slate-700"><h2 className="text-xl font-bold">GET GROW UP Admin</h2></div>
            <nav className="flex-1 p-4 space-y-2 overflow-y-auto">
                {navItems.map(item => (
                    <button key={item.id} onClick={() => navigateTo(item.id)} className={`w-full text-left flex items-center px-4 py-2 rounded-md relative ${currentPage === item.id ? 'bg-sky-600' : 'hover:bg-slate-700'}`}>
                        <item.icon className="h-5 w-5 mr-3" />
                        {item.label}
                        {item.notificationCount > 0 && (
                            <span className="absolute right-2 top-1/2 -translate-y-1/2 w-5 h-5 bg-red-500 text-white text-xs rounded-full flex items-center justify-center">
                                {item.notificationCount}
                            </span>
                        )}
                    </button>
                ))}
            </nav>
            <div className="p-4 border-t border-slate-700">
                <button onClick={onLogout} className="w-full text-left flex items-center px-4 py-2 rounded-md hover:bg-slate-700">
                    <LogOut className="h-5 w-5 mr-3" />
                    Logout
                </button>
            </div>
        </div>
    );
}

// --- Admin Dashboard ---
function AdminDashboard() {
    const [stats, setStats] = useState({ users: 0, totalSpent: 0, totalProfit: 0, openTickets: 0 });
    const [userSignupsData, setUserSignupsData] = useState([]);
    const [dailyProfitData, setDailyProfitData] = useState([]);
    const [recentActivity, setRecentActivity] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        const fetchAllData = async () => {
            setLoading(true);
            setError(null);
            try {
                let users = [], orders = [], services = [], ticketsSnapshot;

                try {
                    const usersSnapshot = await getDocs(collection(db, "users"));
                    users = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
                } catch (e) { console.error("Failed to fetch users:", e); }

                try {
                    const ordersSnapshot = await getDocs(collectionGroup(db, 'orders'));
                    orders = ordersSnapshot.docs.map(doc => doc.data());
                } catch (e) { 
                    console.error("Failed to fetch orders (collectionGroup):", e);
                    setError("Failed to load order data. Please check Firestore rules for collectionGroup('orders').");
                }

                try {
                    const servicesSnapshot = await getDocs(collectionGroup(db, 'services'));
                    services = servicesSnapshot.docs.map(doc => doc.data());
                } catch(e) {
                    console.error("Failed to fetch services (collectionGroup):", e);
                    setError(prev => prev ? `${prev} And failed to load services.` : "Failed to load service data. Please check Firestore rules for collectionGroup('services').");
                }

                try {
                    ticketsSnapshot = await getDocs(query(collection(db, 'tickets'), where('status', '==', 'Open')));
                } catch(e) { console.error("Failed to fetch tickets:", e); }

                const servicesMap = new Map(services.map(s => [String(s.id_api), s]));
                
                const signupsByDate = users.reduce((acc, user) => {
                    if (user.createdAt && user.createdAt.toDate) {
                        const date = user.createdAt.toDate().toISOString().split('T')[0];
                        acc[date] = (acc[date] || 0) + 1;
                    }
                    return acc;
                }, {});

                const signupChartData = Object.keys(signupsByDate)
                    .sort((a, b) => new Date(a) - new Date(b))
                    .slice(-30)
                    .map(date => ({ date, count: signupsByDate[date] }));

                const profitByDate = {};
                const thirtyDaysAgo = new Date();
                thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

                orders.forEach(order => {
                    if (order.status === 'Completed' && order.createdAt && order.createdAt.toDate() > thirtyDaysAgo) {
                        const date = order.createdAt.toDate().toISOString().split('T')[0];
                        const service = servicesMap.get(String(order.serviceId));
                        const cost = service && service.cost ? ((order.quantity || 0) / 1000) * parseFloat(service.cost) : 0;
                        const profit = (order.charge || 0) - cost;
                        
                        if (!profitByDate[date]) {
                            profitByDate[date] = 0;
                        }
                        profitByDate[date] += profit;
                    }
                });
                
                const dailyProfitChartData = Object.keys(profitByDate)
                    .sort((a, b) => new Date(a) - new Date(b))
                    .map(date => ({ date, profit: parseFloat(profitByDate[date].toFixed(2)) }));

                const totalSpent = orders.reduce((sum, order) => sum + (order.status === 'Completed' ? order.charge || 0 : 0), 0);
                const totalCost = orders.reduce((sum, order) => {
                    if (order.status === 'Completed') {
                        const service = servicesMap.get(String(order.serviceId));
                        return sum + (service && service.cost ? ((order.quantity || 0) / 1000) * parseFloat(service.cost) : 0);
                    }
                    return sum;
                }, 0);

                const latestUsers = users
                    .filter(u => u.createdAt && u.createdAt.toDate)
                    .sort((a, b) => b.createdAt.toDate() - a.createdAt.toDate())
                    .slice(0, 5)
                    .map(u => ({ type: 'signup', text: `${u.name || u.email} joined`, time: u.createdAt.toDate() }));

                const latestOrders = orders
                    .filter(o => o.createdAt && o.createdAt.toDate)
                    .sort((a, b) => b.createdAt.toDate() - a.createdAt.toDate())
                    .slice(0, 5)
                    .map(o => ({ type: 'order', text: `${o.userEmail} ordered ${o.serviceName}`, time: o.createdAt.toDate() }));

                const combinedActivity = [...latestUsers, ...latestOrders]
                    .sort((a, b) => b.time - a.time)
                    .slice(0, 10);

                setStats({
                    users: users.length,
                    totalSpent,
                    totalProfit: totalSpent - totalCost,
                    openTickets: ticketsSnapshot ? ticketsSnapshot.size : 0
                });
                setUserSignupsData(signupChartData);
                setDailyProfitData(dailyProfitChartData);
                setRecentActivity(combinedActivity);

            } catch (e) {
                console.error("An unexpected error occurred in fetchAllData: ", e);
                setError("An unexpected error occurred while loading the dashboard.");
            } finally {
                setLoading(false);
            }
        };
        fetchAllData();
    }, []);

    if (loading) return <p>Loading dashboard...</p>;
    if (error) return <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4" role="alert"><p className="font-bold">Error</p><p>{error}</p></div>;

    return (
        <div className="space-y-8">
            <h2 className="text-2xl font-semibold">Dashboard Overview</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <div className="bg-white/80 backdrop-blur-sm p-6 rounded-lg shadow"><h3 className="text-lg font-semibold text-gray-600">Total Users</h3><p className="text-3xl font-bold">{stats.users}</p></div>
                <div className="bg-white/80 backdrop-blur-sm p-6 rounded-lg shadow"><h3 className="text-lg font-semibold text-gray-600">Total Revenue</h3><p className="text-3xl font-bold">{CURRENCY_SYMBOL}{stats.totalSpent.toFixed(2)}</p></div>
                <div className="bg-white/80 backdrop-blur-sm p-6 rounded-lg shadow"><h3 className="text-lg font-semibold text-gray-600">Estimated Profit</h3><p className="text-3xl font-bold text-green-600">{CURRENCY_SYMBOL}{stats.totalProfit.toFixed(2)}</p></div>
                <div className="bg-white/80 backdrop-blur-sm p-6 rounded-lg shadow"><h3 className="text-lg font-semibold text-gray-600">Open Tickets</h3><p className="text-3xl font-bold">{stats.openTickets}</p></div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                <div className="lg:col-span-2 bg-white/80 backdrop-blur-sm p-6 rounded-lg shadow">
                    <h3 className="text-lg font-semibold text-slate-800 mb-4">Daily Profit (Last 30 Days)</h3>
                    <ResponsiveContainer width="100%" height={300}>
                        <LineChart data={dailyProfitData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                            <CartesianGrid strokeDasharray="3 3" vertical={false} />
                            <XAxis dataKey="date" />
                            <YAxis />
                            <Tooltip formatter={(value) => `${CURRENCY_SYMBOL}${value}`} />
                            <Legend />
                            <Line type="monotone" dataKey="profit" name="Profit" stroke="#10b981" strokeWidth={2} />
                        </LineChart>
                    </ResponsiveContainer>
                </div>
                <div className="lg:col-span-1 bg-white/80 backdrop-blur-sm p-6 rounded-lg shadow">
                    <h3 className="text-lg font-semibold text-slate-800 mb-4">Recent Activity</h3>
                    <div className="space-y-4">
                        {recentActivity.map((activity, index) => (
                            <div key={index} className="flex items-start">
                                <div className={`w-8 h-8 rounded-full flex items-center justify-center mr-3 ${activity.type === 'signup' ? 'bg-blue-100' : 'bg-green-100'}`}>
                                    {activity.type === 'signup' ? <UserPlus className="h-4 w-4 text-blue-500" /> : <ShoppingCart className="h-4 w-4 text-green-500" />}
                                </div>
                                <div>
                                    <p className="text-sm text-gray-800">{activity.text}</p>
                                    <p className="text-xs text-gray-500">{activity.time.toLocaleString()}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            <div className="bg-white/80 backdrop-blur-sm p-6 rounded-lg shadow">
                <h3 className="text-lg font-semibold text-slate-800 mb-4">New User Sign-ups (Last 30 Days)</h3>
                <ResponsiveContainer width="100%" height={300}>
                    <RechartsBarChart data={userSignupsData} margin={{ top: 5, right: 20, left: -10, bottom: 5 }}>
                        <CartesianGrid strokeDasharray="3 3" vertical={false} />
                        <XAxis dataKey="date" />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="count" name="New Users" fill="#8884d8" />
                    </RechartsBarChart>
                </ResponsiveContainer>
            </div>
        </div>
    );
}

// --- User Management Page ---
function UserManagementPage() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [editingUser, setEditingUser] = useState(null);
    const [isAddUserModalOpen, setAddUserModalOpen] = useState(false);

    useEffect(() => {
        const q = query(collection(db, "users"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const usersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));

            const referralCounts = usersData.reduce((acc, user) => {
                if (user.referredBy) {
                    acc[user.referredBy] = (acc[user.referredBy] || 0) + 1;
                }
                return acc;
            }, {});

            const usersWithReferrals = usersData.map(user => ({
                ...user,
                referralCount: referralCounts[user.id] || 0
            }));

            setUsers(usersWithReferrals);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const filteredUsers = users.filter(u =>
        (u.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.name || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) return <p>Loading users...</p>;

    return (
        <div className="bg-white/80 backdrop-blur-sm p-6 rounded-lg shadow">
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-semibold">User Management</h2>
                <button onClick={() => setAddUserModalOpen(true)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"><UserPlus size={18} />Add User</button>
            </div>
            <input type="text" placeholder="Search by email or name..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full max-w-sm p-2 border rounded mb-4" />
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="text-left bg-gray-100">
                        <tr>
                            <th className="p-3">User</th>
                            <th className="p-3">Balance</th>
                            <th className="p-3">Total Spent</th>
                            <th className="p-3">Referred</th>
                            <th className="p-3">Commission</th>
                            <th className="p-3">Status</th>
                            <th className="p-3">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredUsers.map(user => (
                            <tr key={user.id} className="border-b">
                                <td className="p-3">
                                    <div className="flex items-center gap-3">
                                        <img src={user.photoURL || `https://placehold.co/40x40/e2e8f0/64748b?text=${(user.name || 'U').charAt(0)}`} alt={user.name} className="w-10 h-10 rounded-full object-cover" />
                                        <div>
                                            <p className="font-semibold">{user.name}</p>
                                            <p className="text-xs text-slate-500">{user.email}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="p-3">{CURRENCY_SYMBOL} {(user.balance || 0).toFixed(2)}</td>
                                <td className="p-3">{CURRENCY_SYMBOL} {(user.totalSpent || 0).toFixed(2)}</td>
                                <td className="p-3 text-center">{user.referralCount || 0}</td>
                                <td className="p-3">{CURRENCY_SYMBOL} {(user.commissionBalance || 0).toFixed(2)}</td>
                                <td className="p-3"><span className={`px-2 py-1 text-xs rounded-full ${user.status === 'blocked' ? 'bg-red-200 text-red-800' : 'bg-green-200 text-green-800'}`}>{user.status || 'active'}</span></td>
                                <td className="p-3"><button onClick={() => setEditingUser(user)} className="p-2 bg-gray-200 rounded hover:bg-gray-300"><Edit size={16} /></button></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {editingUser && <UserEditModal user={editingUser} onClose={() => setEditingUser(null)} />}
            {isAddUserModalOpen && <AddUserModal onClose={() => setAddUserModalOpen(false)} />}
        </div>
    );
}

function UserEditModal({ user, onClose }) {
    const [fundAmount, setFundAmount] = useState(0);
    const [commissionAmount, setCommissionAmount] = useState(user.commissionBalance || 0);
    const [userOrders, setUserOrders] = useState([]);
    const [loadingOrders, setLoadingOrders] = useState(true);
    const [referredUsers, setReferredUsers] = useState([]);
    const [loadingReferrals, setLoadingReferrals] = useState(true);

    useEffect(() => {
        const q = query(collection(db, `users/${user.id}/orders`), orderBy('createdAt', 'desc'));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setUserOrders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setLoadingOrders(false);
        });
        return () => unsubscribe();
    }, [user.id]);

    useEffect(() => {
        const fetchReferredUsers = async () => {
            setLoadingReferrals(true);
            const referralsQuery = query(collection(db, "users"), where("referredBy", "==", user.id));
            const commissionsQuery = query(collection(db, `users/${user.id}/commissions`));

            const [referralsSnapshot, commissionsSnapshot] = await Promise.all([
                getDocs(referralsQuery),
                getDocs(commissionsQuery)
            ]);
            
            const commissionsByReferredUser = commissionsSnapshot.docs.reduce((acc, doc) => {
                const data = doc.data();
                acc[data.fromUserId] = (acc[data.fromUserId] || 0) + data.amount;
                return acc;
            }, {});

            const referredUsersData = referralsSnapshot.docs.map(doc => {
                const data = doc.data();
                return {
                    id: doc.id,
                    email: data.email,
                    name: data.name,
                    totalSpent: data.totalSpent || 0,
                    commissionEarned: commissionsByReferredUser[doc.id] || 0
                };
            });

            setReferredUsers(referredUsersData);
            setLoadingReferrals(false);
        };
        fetchReferredUsers();
    }, [user.id]);

    const userStats = useMemo(() => {
        const totalSpent = userOrders.filter(o => o.status === 'Completed').reduce((sum, o) => sum + o.charge, 0);
        return { totalOrders: userOrders.length, totalSpent };
    }, [userOrders]);

    const handleFundUpdate = async (amount) => {
        if (isNaN(amount)) return;
        const userRef = doc(db, 'users', user.id);
        const userSnap = await getDoc(userRef);
        if (userSnap.exists()) {
            const currentBalance = userSnap.data().balance || 0;
            const newBalance = currentBalance + amount;
            await updateDoc(userRef, { balance: newBalance });
            await logAdminAction("BALANCE_MANUAL_UPDATE", { userId: user.id, amount });
        }
        setFundAmount(0);
    };

    const handleCommissionUpdate = async () => {
        const newCommission = parseFloat(commissionAmount);
        if (isNaN(newCommission)) return;
        const userRef = doc(db, 'users', user.id);
        await updateDoc(userRef, { commissionBalance: newCommission });
        await logAdminAction("COMMISSION_MANUAL_UPDATE", { userId: user.id, newCommission });
        alert("Commission balance updated!");
    };

    const handleStatusToggle = async () => {
        const userRef = doc(db, 'users', user.id);
        const newStatus = user.status === 'blocked' ? 'active' : 'blocked';
        await updateDoc(userRef, { status: newStatus });
        await logAdminAction("USER_STATUS_CHANGE", { userId: user.id, newStatus });
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-4xl max-h-[90vh] flex flex-col">
                <div className="p-4 border-b flex justify-between items-center flex-shrink-0"><h3 className="text-lg font-bold">Manage User: {user.email}</h3><button onClick={onClose}><X /></button></div>
                <div className="p-6 overflow-y-auto">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
                        <div className="space-y-2">
                            <p><span className="font-semibold">User ID:</span> <span className="font-mono text-xs">{user.id}</span></p>
                            <p><span className="font-semibold">Current Balance:</span> {CURRENCY_SYMBOL} {(user.balance || 0).toFixed(2)}</p>
                            <p><span className="font-semibold">Total Orders:</span> {loadingOrders ? '...' : userStats.totalOrders}</p>
                            <p><span className="font-semibold">Total Spent:</span> {CURRENCY_SYMBOL} {loadingOrders ? '...' : userStats.totalSpent.toFixed(2)}</p>
                            <p><span className="font-semibold">Users Referred:</span> {loadingReferrals ? '...' : referredUsers.length}</p>
                            <p><span className="font-semibold">Commission Earned:</span> {CURRENCY_SYMBOL} {(user.commissionBalance || 0).toFixed(2)}</p>
                        </div>
                        <div className="space-y-4">
                            <div><h4 className="font-semibold mb-2">Adjust Balance</h4><div className="flex items-center gap-2"><input type="number" value={fundAmount} onChange={(e) => setFundAmount(parseFloat(e.target.value) || 0)} className="w-full p-2 border rounded" placeholder="e.g., 100 or -50" /><button onClick={() => handleFundUpdate(fundAmount)} className="bg-blue-600 text-white px-4 py-2 rounded">Update</button></div><p className="text-xs text-gray-500 mt-1">Positive to add, negative to subtract.</p></div>
                            <div><h4 className="font-semibold mb-2">Adjust Commission</h4><div className="flex items-center gap-2"><input type="number" value={commissionAmount} onChange={(e) => setCommissionAmount(e.target.value)} className="w-full p-2 border rounded" /><button onClick={handleCommissionUpdate} className="bg-green-600 text-white px-4 py-2 rounded">Update</button></div></div>
                            <div><h4 className="font-semibold mb-2">User Status</h4><button onClick={handleStatusToggle} className={`w-full p-2 rounded ${user.status === 'blocked' ? 'bg-green-500 hover:bg-green-600' : 'bg-red-500 hover:bg-red-600'} text-white flex items-center justify-center gap-2`}><Slash size={16} />{user.status === 'blocked' ? 'Unblock User' : 'Block User'}</button></div>
                        </div>
                    </div>

                    <div className="border-t pt-4">
                        <h4 className="font-semibold text-lg mb-2">Referred Users</h4>
                        {loadingReferrals ? <p>Loading referrals...</p> : (
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead className="text-left bg-gray-100">
                                        <tr>
                                            <th className="p-2">User</th>
                                            <th className="p-2">Total Spent</th>
                                            <th className="p-2">Commission Earned</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {referredUsers.length > 0 ? referredUsers.map(refUser => (
                                            <tr key={refUser.id} className="border-b">
                                                <td className="p-2">{refUser.name || refUser.email}</td>
                                                <td className="p-2">{CURRENCY_SYMBOL} {refUser.totalSpent.toFixed(2)}</td>
                                                <td className="p-2">{CURRENCY_SYMBOL} {refUser.commissionEarned.toFixed(2)}</td>
                                            </tr>
                                        )) : (
                                            <tr><td colSpan="3" className="text-center p-4 text-gray-500">This user has not referred anyone.</td></tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        )}
                    </div>
                </div>
                <div className="p-4 bg-gray-50 flex justify-end gap-4 border-t flex-shrink-0"><button onClick={onClose} className="bg-gray-300 px-4 py-2 rounded">Close</button></div>
            </div>
        </div>
    )
}

function AddUserModal({ onClose }) {
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [name, setName] = useState('');
    const [error, setError] = useState('');

    const handleAddUser = async (e) => {
        e.preventDefault();
        setError('');
        try {
            const newUser = {
                email,
                name,
                balance: 0,
                status: 'active',
                createdAt: Timestamp.now(),
                apiKey: crypto.randomUUID(),
                timezone: 'Asia/Karachi',
                totalSpent: 0,
                commissionBalance: 0,
                claimedRankRewards: [],
                photoURL: null,
            };
            const docRef = await addDoc(collection(db, "users"), newUser);
            await logAdminAction("USER_CREATED", { userId: docRef.id, email });
            onClose();
        } catch (err) {
            setError("Failed to create user. Check console for details.");
            console.error(err);
        }
    };
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-md">
                <div className="p-4 border-b flex justify-between items-center"><h3 className="text-lg font-bold">Add New User</h3><button onClick={onClose}><X /></button></div>
                <form onSubmit={handleAddUser} className="p-6 space-y-4">
                    {error && <p className="text-red-500 text-sm">{error}</p>}
                    <input type="email" placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} className="w-full p-2 border rounded" required />
                    <input type="text" placeholder="Full Name" value={name} onChange={e => setName(e.target.value)} className="w-full p-2 border rounded" required />
                    <input type="password" placeholder="Set a temporary password (for reference)" value={password} onChange={e => setPassword(e.target.value)} className="w-full p-2 border rounded" required />
                    <p className="text-xs text-gray-500">Note: This only creates a user record in the database, not a full authentication account. The user will need to sign up properly.</p>
                    <div className="flex justify-end gap-4 pt-4"><button type="button" onClick={onClose} className="bg-gray-200 px-4 py-2 rounded">Cancel</button><button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">Add User</button></div>
                </form>
            </div>
        </div>
    )
}


// --- Fund Requests Page ---
function FundRequestsPage() {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        setLoading(true);
        setError(null);
        const q = query(collectionGroup(db, 'fund_requests'), where('status', '==', 'pending'));
        const unsubscribe = onSnapshot(q, async (snapshot) => {
            try {
                const allRequests = await Promise.all(snapshot.docs.map(async (docSnap) => {
                    const requestData = docSnap.data();
                    const userId = docSnap.ref.parent.parent.id;
                    let userEmail = 'N/A';
                    let userPhotoURL = `https://placehold.co/40x40/e2e8f0/64748b?text=U`;

                    const requestDate = requestData.date && typeof requestData.date.toDate === 'function' 
                                        ? requestData.date.toDate() 
                                        : null;

                    try {
                        if (userId) {
                            const userRef = doc(db, 'users', userId);
                            const userSnap = await getDoc(userRef);
                            if (userSnap.exists()) {
                                const userData = userSnap.data();
                                userEmail = userData.email || 'N/A';
                                userPhotoURL = userData.photoURL || `https://placehold.co/40x40/e2e8f0/64748b?text=${(userData.name || 'U').charAt(0)}`;
                            } else {
                                console.warn(`[FundRequestsPage] User document not found for userId: ${userId} (request ID: ${docSnap.id}).`);
                                userEmail = `User Not Found (${userId.substring(0, 5)}...)`;
                                userPhotoURL = `https://placehold.co/40x40/e2e8f0/64748b?text=NF`;
                            }
                        } else {
                            console.warn(`[FundRequestsPage] Fund request ${docSnap.id} has no associated userId.`);
                            userEmail = 'No User ID';
                            userPhotoURL = `https://placehold.co/40x40/e2e8f0/64748b?text=N/A`;
                        }
                    } catch (userFetchError) {
                        console.error(`[FundRequestsPage] Error fetching user data for request ${docSnap.id} (userId: ${userId}):`, userFetchError);
                        userEmail = `Fetch Error (${userId.substring(0, 5)}...)`;
                        userPhotoURL = `https://placehold.co/40x40/e2e8f0/64748b?text=Err`;
                    }

                    return {
                        id: docSnap.id,
                        userId,
                        userEmail,
                        userPhotoURL,
                        date: requestDate,
                        ...requestData
                    };
                }));

                allRequests.sort((a, b) => {
                    const dateA = a.date ? a.date.getTime() : 0;
                    const dateB = b.date ? b.date.getTime() : 0;
                    return dateB - dateA;
                });

                setRequests(allRequests);
                setLoading(false);
            } catch (processError) {
                console.error("[FundRequestsPage] Error processing snapshot data:", processError);
                setError("An error occurred while processing fund requests. Check console for details.");
                setLoading(false);
            }
        }, (err) => {
            console.error("[FundRequestsPage] Error fetching fund requests from Firestore:", err);
            setError("Could not load data. Ensure Firestore rules allow collectionGroup('fund_requests') read access for admin, and check network connection.");
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const handleApproval = async (request, newStatus) => {
        const requestRef = doc(db, `users/${request.userId}/fund_requests`, request.id);
        const userRef = doc(db, 'users', request.userId);
        
        try {
            await runTransaction(db, async (transaction) => {
                const userSnap = await transaction.get(userRef);
                if (!userSnap.exists()) {
                    throw new Error("User document does not exist!");
                }
                
                const userData = userSnap.data();
                const amountToAdd = parseFloat(request.amount);
                
                if (newStatus === 'completed') {
                    const currentBalance = userData.balance || 0;
                    transaction.update(userRef, { balance: currentBalance + amountToAdd });

                    const userTransactionsCollectionRef = collection(db, `users/${request.userId}/transactions`);
                    const transactionDocRef = doc(userTransactionsCollectionRef);
                    transaction.set(transactionDocRef, {
                        type: 'manual_deposit',
                        amount: amountToAdd,
                        currency: CURRENCY_SYMBOL,
                        status: 'completed',
                        gateway: request.method,
                        gatewayTransactionId: request.trxId || 'N/A',
                        userEmail: userData.email,
                        createdAt: Timestamp.now(),
                        fundRequestId: request.id,
                    });

                    if (userData.referredBy) {
                        const referrerRef = doc(db, "users", userData.referredBy);
                        const commissionAmount = amountToAdd * COMMISSION_RATE;
                        
                        const referrerSnap = await transaction.get(referrerRef);
                        if (referrerSnap.exists()) {
                            const referrerData = referrerSnap.data();
                            const newCommissionBalance = (referrerData.commissionBalance || 0) + commissionAmount;
                            
                            transaction.update(referrerRef, { commissionBalance: newCommissionBalance });
                            
                            const commissionLogRef = doc(collection(referrerRef, "commissions"));
                            transaction.set(commissionLogRef, {
                                amount: commissionAmount,
                                fromUserId: request.userId,
                                fromUserEmail: userData.email,
                                fundRequestId: request.id,
                                createdAt: Timestamp.now()
                            });
                        }
                    }
                }
                
                transaction.update(requestRef, { status: newStatus });
            });
            
            await logAdminAction(`FUND_REQUEST_${newStatus.toUpperCase()}`, { requestId: request.id, userId: request.userId, amount: request.amount, newStatus });
            setRequests(prev => prev.filter(r => r.id !== request.id));
            
        } catch (error) {
            console.error("Fund request transaction failed: ", error);
            alert(`Failed to ${newStatus} fund request. Please check the console and try again.`);
        }
    };

    const filteredRequests = requests.filter(req =>
        (req.userEmail || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (req.trxId || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        (req.method || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    if (loading) return <p>Loading requests...</p>;

    return (
        <div className="bg-white/80 backdrop-blur-sm p-6 rounded-lg shadow">
            <h2 className="text-2xl font-semibold mb-4">Manual Fund Requests</h2>
            <input type="text" placeholder="Search by Email, TRX ID, or Method..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} className="w-full max-w-sm p-2 border rounded mb-4" />
            {error && <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4" role="alert"><p>{error}</p></div>}
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="text-left bg-gray-100">
                        <tr>
                            <th className="p-3">Date</th>
                            <th className="p-3">User</th>
                            <th className="p-3">Method</th>
                            <th className="p-3">Amount</th>
                            <th className="p-3">TRX ID</th>
                            <th className="p-3">Receipt</th>
                            <th className="p-3">Status</th>
                            <th className="p-3">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredRequests.map(req => (
                            <tr key={req.id} className="border-b">
                                <td className="p-3">{req.date ? new Date(req.date).toLocaleString() : 'N/A'}</td>
                                <td className="p-3">
                                    <div className="flex items-center gap-2">
                                        <img src={req.userPhotoURL} alt={req.userEmail} className="w-8 h-8 rounded-full object-cover" />
                                        <p className="text-xs">{req.userEmail}</p>
                                    </div>
                                </td>
                                <td className="p-3">{req.method}</td>
                                <td className="p-3">{CURRENCY_SYMBOL} {req.amount}</td>
                                <td className="p-3 font-mono text-xs">{req.trxId}</td>
                                <td className="p-3">{req.receiptURL ? <a href={req.receiptURL} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">View</a> : 'N/A'}</td>
                                <td className="p-3 capitalize"><StatusBadge status={req.status} /></td>
                                <td className="p-3">
                                    {req.status === 'pending' && (
                                        <div className="flex gap-2">
                                            <button onClick={() => handleApproval(req, 'completed')} className="p-2 bg-green-500 text-white rounded hover:bg-green-600"><Check size={16} /></button>
                                            <button onClick={() => handleApproval(req, 'rejected')} className="p-2 bg-red-500 text-white rounded hover:bg-red-600"><X size={16} /></button>
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {filteredRequests.length === 0 && <p className="text-center py-4 text-gray-500">No pending fund requests found.</p>}
            </div>
        </div>
    );
}

// --- Automatic Transactions Page ---
function AutomaticTransactionsPage() {
    const [transactions, setTransactions] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [viewingUserPaymentMethods, setViewingUserPaymentMethods] = useState(null);


    useEffect(() => {
        setLoading(true);
        setError(null);
        let q = query(collectionGroup(db, 'transactions'), orderBy("createdAt", "desc"), limit(200));
        
        const unsubscribe = onSnapshot(q, async (snapshot) => {
            try {
                const transactionsData = await Promise.all(snapshot.docs.map(async (docSnap) => {
                    const data = docSnap.data();
                    const userId = docSnap.ref.parent.parent.id;
                    let userEmail = data.userEmail || 'N/A';
                    let userPhotoURL = `https://placehold.co/40x40/e2e8f0/64748b?text=U`;

                    try {
                        if (userId) {
                            const userRef = doc(db, 'users', userId);
                            const userSnap = await getDoc(userRef);
                            if (userSnap.exists()) {
                                const userData = userSnap.data();
                                userEmail = userData.email || 'N/A';
                                userPhotoURL = userData.photoURL || `https://placehold.co/40x40/e2e8f0/64748b?text=${(userData.name || 'U').charAt(0)}`;
                            } else {
                                console.warn(`[AutomaticTransactionsPage] User document not found for userId: ${userId} (transaction ID: ${docSnap.id}).`);
                                userEmail = `User Not Found (${userId.substring(0, 5)}...)`;
                                userPhotoURL = `https://placehold.co/40x40/e2e8f0/64748b?text=NF`;
                            }
                        } else {
                            console.warn(`[AutomaticTransactionsPage] Transaction ${docSnap.id} has no associated userId.`);
                            userEmail = 'No User ID';
                            userPhotoURL = `https://placehold.co/40x40/e2e8f0/64748b?text=N/A`;
                        }
                    } catch (userFetchError) {
                        console.error(`[AutomaticTransactionsPage] Error fetching user data for transaction ${docSnap.id} (userId: ${userId}):`, userFetchError);
                        userEmail = `Fetch Error (${userId.substring(0, 5)}...)`;
                        userPhotoURL = `https://placehold.co/40x40/e2e8f0/64748b?text=Err`;
                    }

                    return {
                        id: docSnap.id,
                        userId,
                        userEmail,
                        userPhotoURL,
                        ...data
                    };
                }));

                setTransactions(transactionsData);
                setLoading(false);
            } catch (processError) {
                console.error("[AutomaticTransactionsPage] Error processing snapshot data:", processError);
                setError("An error occurred while processing transactions. Check console for details.");
                setLoading(false);
            }
        }, (err) => {
            console.error("[AutomaticTransactionsPage] Error fetching transactions from Firestore:", err);
            setError("Could not load transaction data. Ensure Firestore rules allow collectionGroup('transactions') read access for admin, and check network connection.");
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const filteredTransactions = transactions
        .filter(tx => statusFilter === 'All' || tx.status === statusFilter.toLowerCase())
        .filter(tx =>
            (tx.userEmail || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (tx.gateway || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (tx.gatewayTransactionId || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
            (tx.type || '').toLowerCase().includes(searchTerm.toLowerCase())
        );

    if (loading) return <p>Loading automatic transactions...</p>;

    return (
        <div className="bg-white/80 backdrop-blur-sm p-6 rounded-lg shadow">
            <h2 className="text-2xl font-semibold mb-4">Transaction Log</h2>
            <div className="flex justify-between items-center mb-4">
                <input
                    type="text"
                    placeholder="Search by User Email, Gateway, TRX ID, or Type..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full max-w-md p-2 border rounded"
                />
                <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className="p-2 border rounded ml-4"
                >
                    <option value="All">All Statuses</option>
                    <option value="completed">Completed</option>
                    <option value="pending">Pending</option>
                    <option value="canceled">Canceled</option>
                    <option value="failed">Failed</option>
                </select>
            </div>
            {error && <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4" role="alert"><p>{error}</p></div>}
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="text-left bg-gray-100">
                        <tr>
                            <th className="p-3">Date</th>
                            <th className="p-3">User</th>
                            <th className="p-3">Type</th>
                            <th className="p-3">Amount</th>
                            <th className="p-3">Gateway</th>
                            <th className="p-3">Gateway TRX ID</th>
                            <th className="p-3">Status</th>
                            <th className="p-3">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredTransactions.map(tx => (
                            <tr key={tx.id} className="border-b">
                                <td className="p-3">{tx.createdAt?.toDate ? tx.createdAt.toDate().toLocaleString() : 'N/A'}</td>
                                <td className="p-3">
                                    <div className="flex items-center gap-2">
                                        <img src={tx.userPhotoURL} alt={tx.userEmail} className="w-8 h-8 rounded-full object-cover" />
                                        <p className="text-xs">{tx.userEmail}</p>
                                    </div>
                                </td>
                                <td className="p-3 capitalize">{tx.type?.replace('_', ' ') || 'N/A'}</td>
                                <td className="p-3">{CURRENCY_SYMBOL} {(tx.amount || 0).toFixed(2)}</td>
                                <td className="p-3">{tx.gateway || 'N/A'}</td>
                                <td className="p-3 font-mono text-xs">{tx.gatewayTransactionId || 'N/A'}</td>
                                <td className="p-3"><StatusBadge status={tx.status} /></td>
                                <td className="p-3">
                                    {tx.userId && (
                                        <button
                                            onClick={() => setViewingUserPaymentMethods({ userId: tx.userId, userEmail: tx.userEmail })}
                                            className="p-2 bg-gray-200 rounded hover:bg-gray-300"
                                            title="Manage User Payment Methods"
                                        >
                                            <CreditCard size={16} />
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {filteredTransactions.length === 0 && <p className="text-center py-4 text-gray-500">No transactions found matching your criteria.</p>}
            </div>
            {viewingUserPaymentMethods && (
                <UserAutoPaymentMethodsModal
                    userId={viewingUserPaymentMethods.userId}
                    userEmail={viewingUserPaymentMethods.userEmail}
                    onClose={() => setViewingUserPaymentMethods(null)}
                />
            )}
        </div>
    );
}

// --- User Auto Payment Methods Modal ---
function UserAutoPaymentMethodsModal({ userId, userEmail, onClose }) {
    const [paymentMethods, setPaymentMethods] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState('');
    const [editingMethod, setEditingMethod] = useState(null);
    const [isAddMethodModalOpen, setIsAddMethodModalOpen] = useState(false);
    const [confirmAction, setConfirmAction] = useState(null);


    useEffect(() => {
        if (!userId) {
            setError("User ID is missing.");
            setLoading(false);
            return;
        }

        const q = query(collection(db, `users/${userId}/paymentMethods`), orderBy("createdAt", "desc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setPaymentMethods(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setLoading(false);
        }, (err) => {
            console.error("Error fetching user payment methods:", err);
            setError("Failed to load user's payment methods.");
            setLoading(false);
        });

        return () => unsubscribe();
    }, [userId]);

    const handleSaveMethod = async (methodData) => {
        if (!userId) {
            setError("Cannot save method: User ID is missing.");
            return;
        }
        try {
            if (editingMethod) {
                const methodRef = doc(db, `users/${userId}/paymentMethods`, editingMethod.id);
                await updateDoc(methodRef, methodData);
                await logAdminAction("USER_PAYMENT_METHOD_UPDATE", { userId, methodId: editingMethod.id, ...methodData });
            } else {
                await addDoc(collection(db, `users/${userId}/paymentMethods`), {
                    ...methodData,
                    createdAt: Timestamp.now(),
                });
                await logAdminAction("USER_PAYMENT_METHOD_ADD", { userId, ...methodData });
            }
            setEditingMethod(null);
            setIsAddMethodModalOpen(false);
        } catch (err) {
            console.error("Error saving user payment method:", err);
            setError("Failed to save payment method.");
        }
    };

    const handleDeleteMethod = async (methodId) => {
        setConfirmAction({
            message: "Are you sure you want to delete this payment method from the user's profile?",
            onConfirm: async () => {
                if (!userId) {
                    setError("Cannot delete method: User ID is missing.");
                    setConfirmAction(null);
                    return;
                }
                try {
                    await deleteDoc(doc(db, `users/${userId}/paymentMethods`, methodId));
                    await logAdminAction("USER_PAYMENT_METHOD_DELETE", { userId, methodId });
                    setConfirmAction(null);
                } catch (err) {
                    console.error("Error deleting user payment method:", err);
                    setError("Failed to delete payment method.");
                    setConfirmAction(null);
                }
            }
        });
    };

    if (loading) return <p>Loading user payment methods...</p>;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
            {confirmAction && <ConfirmationModal message={confirmAction.message} onConfirm={confirmAction.onConfirm} onCancel={() => setConfirmAction(null)} />}
            <div className="bg-white rounded-lg shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
                <div className="p-4 border-b flex justify-between items-center flex-shrink-0">
                    <h3 className="text-lg font-bold">Manage Payment Methods for: {userEmail}</h3>
                    <button onClick={onClose}><X /></button>
                </div>
                <div className="p-6 overflow-y-auto flex-grow">
                    {error && <div className="bg-red-100 text-red-700 p-3 rounded mb-4 text-sm">{error}</div>}
                    <div className="flex justify-end mb-4">
                        <button onClick={() => { setEditingMethod(null); setIsAddMethodModalOpen(true); }} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
                            <PlusCircle size={18} /> Add New Method
                        </button>
                    </div>
                    {paymentMethods.length === 0 ? (
                        <p className="text-center text-gray-500">No payment methods saved by this user.</p>
                    ) : (
                        <div className="overflow-x-auto">
                            <table className="w-full text-sm">
                                <thead className="text-left bg-gray-100">
                                    <tr>
                                        <th className="p-3">Name</th>
                                        <th className="p-3">Details</th>
                                        <th className="p-3">Type</th>
                                        <th className="p-3">Actions</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {paymentMethods.map(method => (
                                        <tr key={method.id} className="border-b">
                                            <td className="p-3 font-semibold">{method.name}</td>
                                            <td className="p-3">{method.details}</td>
                                            <td className="p-3 capitalize">{method.type || 'N/A'}</td>
                                            <td className="p-3 flex gap-2">
                                                <button onClick={() => { setEditingMethod(method); setIsAddMethodModalOpen(true); }} className="p-2 bg-gray-200 rounded hover:bg-gray-300"><Edit size={16} /></button>
                                                <button onClick={() => handleDeleteMethod(method.id)} className="p-2 bg-red-100 text-red-600 rounded hover:bg-red-200"><Trash2 size={16} /></button>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
                <div className="p-4 bg-gray-50 flex justify-end gap-4 border-t flex-shrink-0">
                    <button onClick={onClose} className="bg-gray-300 px-4 py-2 rounded">Close</button>
                </div>
            </div>
            {isAddMethodModalOpen && (
                <UserPaymentMethodFormModal
                    method={editingMethod}
                    onSave={handleSaveMethod}
                    onClose={() => { setIsAddMethodModalOpen(false); setEditingMethod(null); }}
                />
            )}
        </div>
    );
}

// --- User Payment Method Form Modal (for Add/Edit) ---
function UserPaymentMethodFormModal({ method, onSave, onClose }) {
    const [formData, setFormData] = useState({
        name: method ? method.name : '',
        details: method ? method.details : '',
        type: method ? method.type : 'bank',
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-70 flex justify-center items-center z-[100] p-4">
            <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-xl w-full max-w-md">
                <div className="p-4 border-b flex justify-between items-center">
                    <h3 className="text-lg font-bold">{method ? 'Edit' : 'Add New'} User Payment Method</h3>
                    <button type="button" onClick={onClose}><X /></button>
                </div>
                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Method Name</label>
                        <input type="text" name="name" value={formData.name} onChange={handleChange} className="w-full p-2 border rounded" placeholder="e.g., My Bank Account" required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Details (e.g., Account No., Wallet Address)</label>
                        <input type="text" name="details" value={formData.details} onChange={handleChange} className="w-full p-2 border rounded" placeholder="e.g., 1234567890" required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Type</label>
                        <select name="type" value={formData.type} onChange={handleChange} className="w-full p-2 border rounded">
                            <option value="bank">Bank Transfer</option>
                            <option value="easypaisa">Easypaisa</option>
                            <option value="jazzcash">JazzCash</option>
                            <option value="crypto">Cryptocurrency</option>
                            <option value="other">Other</option>
                        </select>
                    </div>
                </div>
                <div className="p-4 bg-gray-50 flex justify-end gap-4">
                    <button type="button" onClick={onClose} className="bg-gray-200 px-4 py-2 rounded">Cancel</button>
                    <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">Save Method</button>
                </div>
            </form>
        </div>
    );
}


// --- Manage Services Page ---
function ManageServicesPage() {
    const [categories, setCategories] = useState([]);
    const [loading, setLoading] = useState(true);
    const [editingCategory, setEditingCategory] = useState(null);
    const [editingService, setEditingService] = useState(null);
    const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
    const [isServiceModalOpen, setIsServiceModalOpen] = useState(false);
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [confirmAction, setConfirmAction] = useState(null);

    useEffect(() => {
        const q = query(collection(db, "categories"), orderBy("order", "asc"));
        const unsubscribe = onSnapshot(q, (categorySnapshot) => {
            const cats = categorySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            setCategories(cats);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const onDragEnd = async (result) => {
        const { destination, source } = result;
        if (!destination || (destination.droppableId === source.droppableId && destination.index === source.index)) {
            return;
        }
    
        const newCategories = Array.from(categories);
        const [reorderedItem] = newCategories.splice(source.index, 1);
        newCategories.splice(destination.index, 0, reorderedItem);
    
        setCategories(newCategories);
    
        const batch = writeBatch(db);
        newCategories.forEach((cat, index) => {
            const catRef = doc(db, "categories", cat.id);
            batch.update(catRef, { order: index });
        });
        await batch.commit();
        await logAdminAction("CATEGORIES_REORDERED", {});
    };

    const handleCategorySave = async (categoryData) => {
        if (editingCategory) {
            const categoryRef = doc(db, "categories", editingCategory.id);
            await updateDoc(categoryRef, { name: categoryData.name });
            await logAdminAction("CATEGORY_UPDATE", { categoryId: editingCategory.id, name: categoryData.name });
        } else {
            const newOrder = categories.length;
            const docRef = await addDoc(collection(db, "categories"), { name: categoryData.name, order: newOrder });
            await logAdminAction("CATEGORY_CREATE", { categoryId: docRef.id, name: categoryData.name });
        }
        setEditingCategory(null);
        setIsCategoryModalOpen(false);
    };

    const handleDeleteCategory = async (categoryId) => {
        setConfirmAction({
            message: "Are you sure? This will delete the category and all services within it.",
            onConfirm: async () => {
                const servicesQuery = query(collection(db, `categories/${categoryId}/services`));
                const servicesSnapshot = await getDocs(servicesQuery);
                const batch = writeBatch(db);
                servicesSnapshot.forEach(doc => batch.delete(doc.ref));
                await batch.commit();

                await deleteDoc(doc(db, "categories", categoryId));
                await logAdminAction("CATEGORY_DELETE", { categoryId });
                setConfirmAction(null);
            }
        });
    };

    if (loading) return <p>Loading services...</p>;

    return (
        <div className="bg-white/80 backdrop-blur-sm p-6 rounded-lg shadow">
            {confirmAction && <ConfirmationModal message={confirmAction.message} onConfirm={confirmAction.onConfirm} onCancel={() => setConfirmAction(null)} />}
            <div className="flex justify-between items-center mb-6">
                <h2 className="text-2xl font-semibold">Manage Services</h2>
                <div className="flex gap-2">
                    <button onClick={() => setIsImportModalOpen(true)} className="flex items-center gap-2 bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700"><Server size={18} />Import Services</button>
                    <button onClick={() => { setEditingCategory(null); setIsCategoryModalOpen(true); }} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"><PlusCircle size={18} />Add Category</button>
                </div>
            </div>
            <DragDropContext onDragEnd={onDragEnd}>
                <Droppable droppableId="categories">
                    {(provided) => (
                        <div {...provided.droppableProps} ref={provided.innerRef} className="space-y-4">
                            {categories.map((cat, index) => (
                                <Draggable key={cat.id} draggableId={cat.id} index={index}>
                                    {(provided) => (
                                        <div ref={provided.innerRef} {...provided.draggableProps} {...provided.dragHandleProps}>
                                            <CategoryItem 
                                                category={cat} 
                                                onEdit={() => { setEditingCategory(cat); setIsCategoryModalOpen(true); }}
                                                onAddService={() => { setEditingCategory(cat); setEditingService(null); setIsServiceModalOpen(true); }}
                                                onDelete={() => handleDeleteCategory(cat.id)}
                                            />
                                        </div>
                                    )}
                                </Draggable>
                            ))}
                            {provided.placeholder}
                        </div>
                    )}
                </Droppable>
            </DragDropContext>

            {isCategoryModalOpen && <CategoryModal category={editingCategory} onSave={handleCategorySave} onClose={() => setIsCategoryModalOpen(false)} />}
            {isServiceModalOpen && <ServiceModal category={editingCategory} service={editingService} onClose={() => setIsServiceModalOpen(false)} />}
            {isImportModalOpen && <ImportServiceModal categories={categories} onClose={() => setIsImportModalOpen(false)} />}
        </div>
    );
}

const CategoryItem = ({ category, onEdit, onAddService, onDelete }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [services, setServices] = useState([]);
    const [isLoading, setIsLoading] = useState(false);

    const toggleExpansion = async () => {
        if (!isExpanded && services.length === 0) {
            setIsLoading(true);
            const servicesQuery = query(collection(db, `categories/${category.id}/services`), orderBy("name"));
            const servicesSnapshot = await getDocs(servicesQuery);
            setServices(servicesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setIsLoading(false);
        }
        setIsExpanded(!isExpanded);
    };

    const handleDeleteService = async (serviceId) => {
        await deleteDoc(doc(db, `categories/${category.id}/services`, serviceId));
        setServices(prev => prev.filter(s => s.id !== serviceId));
        await logAdminAction("SERVICE_DELETE", { serviceId });
    };

    return (
        <div className="border rounded-lg bg-white">
            <div className="p-4 bg-gray-50 flex justify-between items-center cursor-pointer" onClick={toggleExpansion}>
                <h3 className="text-lg font-bold">{category.name}</h3>
                <div className="flex gap-2 items-center">
                    <button onClick={(e) => { e.stopPropagation(); onEdit(); }} className="p-2 text-gray-500 hover:text-blue-600"><Edit size={16} /></button>
                    <button onClick={(e) => { e.stopPropagation(); onAddService(); }} className="p-2 text-gray-500 hover:text-green-600"><PlusCircle size={16} /></button>
                    <button onClick={(e) => { e.stopPropagation(); onDelete(); }} className="p-2 text-gray-500 hover:text-red-600"><Trash2 size={16} /></button>
                    <ChevronRight className={`transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                </div>
            </div>
            {isExpanded && (
                <div className="overflow-x-auto">
                    {isLoading ? <p className="p-4 text-center">Loading services...</p> : (
                        <table className="w-full text-sm">
                            <thead className="text-left bg-gray-100">
                                <tr>
                                    <th className="p-3">ID</th><th className="p-3">Name & Tags</th><th className="p-3">Rate</th><th className="p-3">Cost</th>
                                    <th className="p-3">Min/Max</th><th className="p-3">Actions</th>
                                </tr>
                            </thead>
                            <tbody>
                                {services.map(service => (
                                    <tr key={service.id} className="border-t">
                                        <td className="p-3 font-mono">{service.id_api}</td>
                                        <td className="p-3 font-semibold">
                                            {service.name}
                                            <div className="flex flex-wrap gap-1 mt-1">
                                                {service.tags?.map(tag => <ServiceTag key={tag} tagName={tag} />)}
                                            </div>
                                        </td>
                                        <td className="p-3">{CURRENCY_SYMBOL}{(parseFloat(service.rate)).toFixed(2)}</td>
                                        <td className="p-3">{CURRENCY_SYMBOL}{(parseFloat(service.cost || 0)).toFixed(2)}</td>
                                        <td className="p-3">{service.min} / {service.max}</td>
                                        <td className="p-3">
                                            <div className="flex gap-2">
                                                <button onClick={() => handleDeleteService(service.id)} className="p-2 text-gray-500 hover:text-red-600"><Trash2 size={16} /></button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                                {services.length === 0 && (<tr><td colSpan="6" className="text-center p-4 text-gray-500">No services in this category.</td></tr>)}
                            </tbody>
                        </table>
                    )}
                </div>
            )}
        </div>
    );
}


function CategoryModal({ category, onSave, onClose }) {
    const [name, setName] = useState(category ? category.name : '');
    const handleSubmit = (e) => {
        e.preventDefault();
        onSave({ name });
    };
    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
            <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-xl w-full max-w-md">
                <div className="p-4 border-b"><h3 className="text-lg font-bold">{category ? 'Edit' : 'Add'} Category</h3></div>
                <div className="p-6">
                    <label className="block text-sm font-medium mb-1">Category Name</label>
                    <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="w-full p-2 border rounded" required />
                </div>
                <div className="p-4 bg-gray-50 flex justify-end gap-4">
                    <button type="button" onClick={onClose} className="bg-gray-200 px-4 py-2 rounded">Cancel</button>
                    <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">Save</button>
                </div>
            </form>
        </div>
    );
}

function ServiceModal({ category, service, onClose }) {
    const [providers, setProviders] = useState([]);
    const [isFetching, setIsFetching] = useState(false);
    const [formData, setFormData] = useState({
        name: service ? service.name : '',
        id_api: service ? service.id_api : '',
        rate: service ? service.rate : 0,
        cost: service ? service.cost : 0,
        min: service ? service.min : 0,
        max: service ? service.max : 0,
        providerId: service ? service.providerId : '',
        providerServiceId: service ? service.providerServiceId : '',
        category: category ? category.name : '',
        description: service ? service.description : '',
        tags: service && service.tags ? service.tags.join(', ') : '',
    });

    useEffect(() => {
        const q = query(collection(db, "api_providers"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setProviders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
        });
        return () => unsubscribe();
    }, []);

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleFetchFromProvider = async () => {
        if (!formData.providerId || !formData.providerServiceId) {
            alert("Please select a provider and enter their service ID.");
            return;
        }
        setIsFetching(true);
        const selectedProvider = providers.find(p => p.id === formData.providerId);
        try {
            const allServices = await callProviderApi(selectedProvider, 'services');
            const serviceDetail = allServices.find(s => s.service === formData.providerServiceId);

            if (!serviceDetail) {
                throw new Error("Service ID not found at provider.");
            }

            const convertedPrice = parseFloat(serviceDetail.rate).toFixed(2);
            setFormData(prev => ({
                ...prev,
                name: serviceDetail.name,
                rate: convertedPrice, 
                cost: convertedPrice,
                min: serviceDetail.min,
                max: serviceDetail.max,
                id_api: serviceDetail.service,
                description: serviceDetail.dripfeed || '',
            }));
        } catch (error) {
            alert(`Failed to fetch from provider: ${error.message}`);
        } finally {
            setIsFetching(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        const dataToSave = {
            ...formData,
            rate: parseFloat(formData.rate) || 0,
            cost: parseFloat(formData.cost) || 0,
            min: parseInt(formData.min, 10) || 0,
            max: parseInt(formData.max, 10) || 0,
            tags: formData.tags ? formData.tags.split(',').map(tag => tag.trim()).filter(Boolean) : []
        };
        delete dataToSave.providerServiceId; 

        if (service) {
            const serviceRef = doc(db, `categories/${category.id}/services`, service.id);
            await updateDoc(serviceRef, dataToSave);
            await logAdminAction("SERVICE_UPDATE", { serviceId: service.id, ...dataToSave });
        } else {
            const docRef = await addDoc(collection(db, `categories/${category.id}/services`), dataToSave);
            await logAdminAction("SERVICE_CREATE", { serviceId: docRef.id, categoryId: category.id, ...dataToSave });
        }
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
            <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="p-4 border-b"><h3 className="text-lg font-bold">{service ? 'Edit' : 'Add'} Service in {category.name}</h3></div>
                
                <div className="p-6 border-b">
                    <h4 className="text-md font-semibold mb-2">Fetch from API Provider</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 items-end">
                        <div className="md:col-span-1">
                            <label className="block text-sm font-medium mb-1">Provider</label>
                            <select name="providerId" value={formData.providerId} onChange={handleChange} className="w-full p-2 border rounded">
                                <option value="">Manual Entry</option>
                                {providers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        </div>
                        <div className="md:col-span-1">
                            <label className="block text-sm font-medium mb-1">Provider Service ID</label>
                            <input type="text" name="providerServiceId" value={formData.providerServiceId} onChange={handleChange} className="w-full p-2 border rounded" disabled={!formData.providerId} />
                        </div>
                        <div className="md:col-span-1">
                            <button type="button" onClick={handleFetchFromProvider} disabled={!formData.providerId || isFetching} className="w-full bg-indigo-600 text-white px-4 py-2 rounded hover:bg-indigo-700 disabled:bg-gray-400">
                                {isFetching ? 'Fetching...' : 'Fetch Details'}
                            </button>
                        </div>
                    </div>
                </div>

                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div><label className="block text-sm font-medium mb-1">Service Name</label><input type="text" name="name" value={formData.name} onChange={handleChange} className="w-full p-2 border rounded" required /></div>
                    <div><label className="block text-sm font-medium mb-1">Internal API ID</label><input type="text" name="id_api" value={formData.id_api} onChange={handleChange} className="w-full p-2 border rounded" required /></div>
                    <div><label className="block text-sm font-medium mb-1">Rate (Price per 1000)</label><input type="number" name="rate" step="0.01" value={formData.rate} onChange={handleChange} className="w-full p-2 border rounded" required /></div>
                    <div><label className="block text-sm font-medium mb-1">Cost (per 1000)</label><input type="number" name="cost" step="0.01" value={formData.cost} onChange={handleChange} className="w-full p-2 border rounded" placeholder="Your cost for this service" required /></div>
                    <div><label className="block text-sm font-medium mb-1">Min Order</label><input type="number" name="min" value={formData.min} onChange={handleChange} className="w-full p-2 border rounded" required /></div>
                    <div><label className="block text-sm font-medium mb-1">Max Order</label><input type="number" name="max" value={formData.max} onChange={handleChange} className="w-full p-2 border rounded" required /></div>
                    <div className="md:col-span-2"><label className="block text-sm font-medium mb-1">Description</label><textarea name="description" value={formData.description} onChange={handleChange} rows="3" className="w-full p-2 border rounded" placeholder="Detailed service description for users."></textarea></div>
                    <div className="md:col-span-2"><label className="block text-sm font-medium mb-1">Tags (comma-separated)</label><input type="text" name="tags" value={formData.tags} onChange={handleChange} className="w-full p-2 border rounded" placeholder="e.g., High Quality, Fast Start, Refill Guarantee" /></div>
                </div>
                <div className="p-4 bg-gray-50 flex justify-end gap-4">
                    <button type="button" onClick={onClose} className="bg-gray-200 px-4 py-2 rounded">Cancel</button>
                    <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">Save Service</button>
                </div>
            </form>
        </div>
    );
}
// --- AllOrdersPage and other components start here ---

// --- All Orders Page ---
function AllOrdersPage() {
    const [allData, setAllData] = useState([]);
    const [loading, setLoading] = useState(true);
    const [searchTerm, setSearchTerm] = useState('');
    const [statusFilter, setStatusFilter] = useState('All');
    const [currentPage, setCurrentPage] = useState(1);
    const [viewingOrder, setViewingOrder] = useState(null);
    const ordersPerPage = 20;

    useEffect(() => {
        setLoading(true);
        const ordersQuery = query(collectionGroup(db, 'orders'), orderBy('createdAt', 'desc'));
        const unsubscribeOrders = onSnapshot(ordersQuery, async (ordersSnapshot) => {
            const usersQuery = await getDocs(collection(db, 'users'));
            const usersMap = new Map(usersQuery.docs.map(doc => [doc.id, doc.data()]));

            const servicesQuery = await getDocs(collectionGroup(db, 'services'));
            const servicesMap = new Map();
            servicesQuery.forEach(doc => {
                servicesMap.set(doc.id, doc.data());
            });

            const combinedData = ordersSnapshot.docs.map(doc => {
                const order = {
                    id: doc.id,
                    userId: doc.ref.parent.parent.id,
                    ...doc.data()
                };
                
                const user = usersMap.get(order.userId);
                const service = servicesMap.get(order.firestoreServiceId);
                
                const cost = service?.cost ? (order.quantity / 1000) * service.cost : 0;
                const profit = order.charge - cost;

                return {
                    ...order,
                    userName: user?.name || 'Unknown',
                    userPhotoURL: user?.photoURL,
                    serviceTags: service?.tags || [],
                    profit: profit
                };
            });

            setAllData(combinedData);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching all orders:", error);
            setLoading(false);
        });

        return () => unsubscribeOrders();
    }, []);

    const handleStatusChange = async (order, newStatus, startCount, remains) => {
        const orderRef = doc(db, `users/${order.userId}/orders`, order.id);
        try {
            await updateDoc(orderRef, { 
                status: newStatus,
                start_count: startCount,
                remains: remains
            });
            await logAdminAction("ORDER_STATUS_MANUAL_CHANGE", { orderId: order.id, newStatus, startCount, remains });
            setViewingOrder(null); // Close modal on success
        } catch (error) {
            console.error("Failed to update order status:", error);
            alert("Error: Could not update status.");
        }
    };

    const filteredOrders = useMemo(() => {
        return allData
            .filter(o => statusFilter === 'All' || o.status === statusFilter)
            .filter(o =>
                (o.id || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (o.userEmail || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (o.userName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
                (o.serviceName || '').toLowerCase().includes(searchTerm.toLowerCase())
            );
    }, [allData, statusFilter, searchTerm]);

    const indexOfLastOrder = currentPage * ordersPerPage;
    const indexOfFirstOrder = indexOfLastOrder - ordersPerPage;
    const currentOrders = filteredOrders.slice(indexOfFirstOrder, indexOfLastOrder);
    const totalPages = Math.ceil(filteredOrders.length / ordersPerPage);

    const paginate = (pageNumber) => setCurrentPage(pageNumber);

    if (loading) return <p>Loading all orders...</p>;

    return (
        <div className="bg-white/80 backdrop-blur-sm p-6 rounded-lg shadow">
            <h2 className="text-2xl font-semibold mb-4">All User Orders</h2>
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center mb-4">
                <input type="text" placeholder="Search by Order ID, Email, Name, or Service..." value={searchTerm} onChange={(e) => {setSearchTerm(e.target.value); setCurrentPage(1);}} className="w-full md:w-1/2 p-2 border rounded" />
                <div className="flex items-center gap-4">
                    <label>Status:</label>
                    <select value={statusFilter} onChange={(e) => {setStatusFilter(e.target.value); setCurrentPage(1);}} className="p-2 border rounded">
                        {['All', 'Pending', 'Processing', 'Completed', 'Canceled', 'Partial', 'Error'].map(status => (
                            <option key={status} value={status}>{status}</option>
                        ))}
                    </select>
                </div>
            </div>
            
            <div className="overflow-x-auto">
                <table className="w-full min-w-[1600px] text-sm whitespace-nowrap">
                    <thead className="text-left bg-gray-100">
                        <tr>
                            <th className="p-3">User</th>
                            <th className="p-3">Order Date</th>
                            <th className="p-3">Order ID</th>
                            <th className="p-3">Service</th>
                            <th className="p-3">Start Count</th>
                            <th className="p-3">Remaining</th>
                            <th className="p-3">Final Count</th>
                            <th className="p-3">Amount</th>
                            <th className="p-3">Profit</th>
                            <th className="p-3">Status</th>
                            <th className="p-3">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {currentOrders.map(order => {
                            const finalCount = (order.start_count || 0) + (order.quantity || 0);
                            return (
                            <tr key={order.id} className="border-b">
                                <td className="p-3">
                                    <div className="flex items-center gap-2">
                                        <img src={order.userPhotoURL || `https://placehold.co/40x40/e2e8f0/64748b?text=${(order.userName || 'U').charAt(0)}`} alt={order.userName} className="w-8 h-8 rounded-full object-cover" />
                                        <div>
                                            <p className="font-semibold">{order.userName}</p>
                                            <p className="text-xs text-slate-500">{order.userEmail}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="p-3">{order.createdAt?.toDate ? order.createdAt.toDate().toLocaleDateString() : 'N/A'}</td>
                                <td className="p-3 font-mono text-xs">{order.id}</td>
                                <td className="p-3 max-w-xs truncate">
                                    <p title={order.serviceName}>{order.serviceName}</p>
                                    <div className="flex flex-wrap gap-1 mt-1">
                                        {order.serviceTags?.map(tag => <ServiceTag key={tag} tagName={tag} />)}
                                    </div>
                                </td>
                                <td className="p-3">{order.start_count || 'N/A'}</td>
                                <td className="p-3">{order.remains || 'N/A'}</td>
                                <td className="p-3">{finalCount}</td>
                                <td className="p-3 font-semibold">{CURRENCY_SYMBOL}{(order.charge || 0).toFixed(2)}</td>
                                <td className="p-3 font-semibold text-green-600">{CURRENCY_SYMBOL}{(order.profit || 0).toFixed(2)}</td>
                                <td className="p-3"><StatusBadge status={order.status} /></td>
                                <td className="p-3">
                                    <div className="flex gap-2">
                                        <button onClick={() => setViewingOrder(order)} className="p-2 bg-gray-200 rounded hover:bg-gray-300" title="View & Edit Order"><EyeIcon size={14} /></button>
                                        <button className="p-2 bg-blue-100 text-blue-600 rounded hover:bg-blue-200" title="Refill"><RefreshCw size={14} /></button>
                                        <button className="p-2 bg-red-100 text-red-600 rounded hover:bg-red-200" title="Cancel"><Ban size={14} /></button>
                                    </div>
                                </td>
                            </tr>
                        )})}
                    </tbody>
                </table>
                {filteredOrders.length === 0 && <p className="text-center py-4 text-gray-500">No orders found.</p>}
            </div>
            
            <div className="mt-4 flex justify-between items-center">
                <span className="text-sm text-gray-700">
                    Showing {indexOfFirstOrder + 1} to {Math.min(indexOfLastOrder, filteredOrders.length)} of {filteredOrders.length} orders
                </span>
                <div className="flex gap-2">
                    <button onClick={() => paginate(currentPage - 1)} disabled={currentPage === 1} className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50 flex items-center gap-1"><ChevronLeft size={16}/> Prev</button>
                    <button onClick={() => paginate(currentPage + 1)} disabled={currentPage === totalPages || totalPages === 0} className="px-3 py-1 bg-gray-200 rounded disabled:opacity-50 flex items-center gap-1">Next <ChevronRight size={16}/></button>
                </div>
            </div>
            {viewingOrder && <OrderEditModal order={viewingOrder} onClose={() => setViewingOrder(null)} onUpdate={handleStatusChange} />}
        </div>
    );
}

function OrderEditModal({ order, onClose, onUpdate }) {
    const [status, setStatus] = useState(order.status);
    const [startCount, setStartCount] = useState(order.start_count || 0);
    const [remains, setRemains] = useState(order.remains || 0);

    const handleUpdate = () => {
        onUpdate(order, status, parseInt(startCount, 10), parseInt(remains, 10));
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-lg">
                <div className="p-4 border-b flex justify-between items-center"><h3 className="text-lg font-bold">Manage Order: {order.id}</h3><button onClick={onClose}><X /></button></div>
                <div className="p-6 space-y-4">
                    <p><span className="font-semibold">User:</span> {order.userEmail}</p>
                    <p><span className="font-semibold">Service:</span> {order.serviceName}</p>
                    <p><span className="font-semibold">Link:</span> <a href={order.link} target="_blank" rel="noopener noreferrer" className="text-blue-500 break-all">{order.link}</a></p>
                    <div className="grid grid-cols-2 gap-4">
                        <div><label className="font-semibold block mb-1">Start Count:</label><input type="number" value={startCount} onChange={(e) => setStartCount(e.target.value)} className="w-full p-2 border rounded" /></div>
                        <div><label className="font-semibold block mb-1">Remains:</label><input type="number" value={remains} onChange={(e) => setRemains(e.target.value)} className="w-full p-2 border rounded" /></div>
                    </div>
                    <div>
                        <label className="font-semibold block mb-1">Status:</label>
                        <select value={status} onChange={(e) => setStatus(e.target.value)} className="w-full p-2 border rounded">
                            {['Pending', 'Processing', 'Completed', 'Canceled', 'Partial', 'Error'].map(s => <option key={s} value={s}>{s}</option>)}
                        </select>
                    </div>
                </div>
                <div className="p-4 bg-gray-50 flex justify-end gap-4"><button onClick={onClose} className="bg-gray-300 px-4 py-2 rounded">Cancel</button><button onClick={handleUpdate} className="bg-blue-600 text-white px-4 py-2 rounded">Update Status</button></div>
            </div>
        </div>
    );
}

// --- Support Tickets Page ---
function SupportTicketsPage() {
    const [tickets, setTickets] = useState([]);
    const [viewingTicket, setViewingTicket] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const q = query(collection(db, 'tickets'), orderBy("createdAt", "desc"));
        
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const ticketsData = snapshot.docs
                .filter(doc => doc.data().createdAt && typeof doc.data().createdAt.toDate === 'function')
                .map(doc => ({
                    id: doc.id,
                    ...doc.data()
                }));

            setTickets(ticketsData);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching support tickets: ", error);
            setLoading(false);
        });

        return () => unsubscribe();
    }, []);

    const handleStatusChange = (updatedTicket, newStatus) => {
        setTickets(prev => prev.map(t => (t.id === updatedTicket.id ? { ...t, status: newStatus } : t)));
        if (viewingTicket && viewingTicket.id === updatedTicket.id) {
            setViewingTicket({ ...viewingTicket, status: newStatus });
        }
    };

    if (loading) return <p>Loading tickets...</p>;

    return (
        <div className="bg-white/80 backdrop-blur-sm p-6 rounded-lg shadow">
            <h2 className="text-2xl font-semibold mb-4">Support Tickets</h2>
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="text-left bg-gray-100"><tr><th className="p-3">Date</th><th className="p-3">User</th><th className="p-3">Subject</th><th className="p-3">Status</th><th className="p-3">Actions</th></tr></thead>
                    <tbody>
                        {tickets.map(ticket => (
                            <tr key={ticket.id} className="border-b">
                                <td className="p-3">{ticket.createdAt?.toDate() ? ticket.createdAt.toDate().toLocaleString() : 'N/A'}</td>
                                <td className="p-3">{ticket.userEmail}</td>
                                <td className="p-3 font-semibold">{ticket.subject}</td>
                                <td className="p-3"><StatusBadge status={ticket.status} /></td>
                                <td className="p-3"><button onClick={() => setViewingTicket(ticket)} className="p-2 bg-gray-200 rounded hover:bg-gray-300"><EyeIcon size={16} /></button></td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {tickets.length === 0 && <p className="text-center py-4 text-gray-500">No support tickets.</p>}
            </div>
            {viewingTicket && <TicketViewModal ticket={viewingTicket} onClose={() => setViewingTicket(null)} onStatusChange={handleStatusChange} />}
        </div>
    )
}

// --- Ticket View Modal ---
function TicketViewModal({ ticket, onClose, onStatusChange }) {
    const [reply, setReply] = useState('');

    const handleReply = async () => {
        if (!reply) return;

        const mainTicketRef = doc(db, "tickets", ticket.id);
        const userTicketRef = doc(db, `users/${ticket.userId}/tickets`, ticket.id);

        const newReply = { message: reply, from: 'admin', timestamp: Timestamp.now() };
        const updatedReplies = [...(ticket.replies || []), newReply];

        const batch = writeBatch(db);

        batch.update(mainTicketRef, {
            replies: updatedReplies,
            status: "Answered"
        });

        batch.update(userTicketRef, {
            replies: updatedReplies,
            status: "Answered"
        });

        try {
            await batch.commit();
            await logAdminAction("TICKET_REPLY", { ticketId: ticket.id });
            setReply('');
            onClose();
        } catch (error) {
            console.error("Failed to send reply and update tickets:", error);
            alert("Error: Could not send reply.");
        }
    };

    const handleLocalStatusChange = async (newStatus) => {
        const mainTicketRef = doc(db, 'tickets', ticket.id);
        const userTicketRef = doc(db, `users/${ticket.userId}/tickets`, ticket.id);

        const batch = writeBatch(db);
        batch.update(mainTicketRef, { status: newStatus });
        batch.update(userTicketRef, { status: newStatus });

        try {
            await batch.commit();
            await logAdminAction("TICKET_STATUS_CHANGE", { ticketId: ticket.id, newStatus });
            onStatusChange(ticket, newStatus);
        } catch (error) {
            console.error("Failed to update status on both tickets:", error);
            alert("Error: Could not update ticket status.");
        }
    };


    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl">
                <div className="p-4 border-b flex justify-between items-center"><h3 className="text-lg font-bold">Ticket: {ticket.ticketId}</h3><button onClick={onClose}><X /></button></div>
                <div className="p-6 max-h-[60vh] overflow-y-auto">
                    <p className="text-sm text-gray-500">From: {ticket.userEmail}</p>
                    <p className="font-bold mt-1">Subject: {ticket.subject}</p>
                    <p className="bg-gray-50 p-4 rounded-lg mt-4 whitespace-pre-wrap">{ticket.message}</p>
                    <div className="mt-4 border-t pt-4">
                        <h4 className="font-semibold mb-2">Conversation</h4>
                        {(ticket.replies || []).map((r, i) => (
                            <div key={i} className={`p-3 rounded-lg mb-2 ${r.from === 'admin' ? 'bg-blue-100 text-blue-900' : 'bg-gray-100'}`}>
                                <p className="text-xs font-bold">{r.from === 'admin' ? 'Support' : 'User'}</p>
                                <p className="whitespace-pre-wrap">{r.message}</p>
                            </div>
                        ))}
                    </div>
                </div>
                <div className="p-4 bg-gray-50 border-t">
                    <textarea value={reply} onChange={e => setReply(e.target.value)} placeholder="Write your reply..." rows="3" className="w-full p-2 border rounded"></textarea>
                    <div className="flex justify-between items-center mt-2">
                        <div className="flex gap-2">
                            <button onClick={() => handleLocalStatusChange('Open')} className="bg-yellow-500 text-white px-3 py-1.5 rounded text-sm">Mark Open</button>
                            <button onClick={() => handleLocalStatusChange('Resolved')} className="bg-green-500 text-white px-3 py-1.5 rounded text-sm">Mark Resolved</button>
                        </div>
                        <div className="flex gap-4">
                            <button onClick={onClose} className="bg-gray-300 px-4 py-2 rounded">Cancel</button>
                            <button onClick={handleReply} className="bg-sky-500 text-white px-4 py-2 rounded flex items-center gap-2"><Send size={16} />Reply</button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    )
}

// --- Withdrawal Requests Page ---
function WithdrawalRequestsPage() {
    const [requests, setRequests] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const q = query(collection(db, "withdrawal_requests"), where("status", "==", "pending"), orderBy("date", "desc"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setRequests(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const handleApproval = async (request, newStatus) => {
        const requestRef = doc(db, "withdrawal_requests", request.id);
        const userRef = doc(db, "users", request.userId);

        if (newStatus === 'rejected') {
            const userSnap = await getDoc(userRef);
            if (userSnap.exists()) {
                const currentCommission = userSnap.data().commissionBalance || 0;
                await updateDoc(userRef, { commissionBalance: currentCommission + request.amount });
            }
        }
        await updateDoc(requestRef, { status: newStatus });
        await logAdminAction("WITHDRAWAL_UPDATE", { requestId: request.id, newStatus });
    };

    if (loading) return <p>Loading withdrawal requests...</p>;

    return (
        <div className="bg-white/80 backdrop-blur-sm p-6 rounded-lg shadow">
            <h2 className="text-2xl font-semibold mb-4">Withdrawal Requests</h2>
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="text-left bg-gray-100">
                        <tr>
                            <th className="p-3">Date</th>
                            <th className="p-3">User Email</th>
                            <th className="p-3">Amount</th>
                            <th className="p-3">Method</th>
                            <th className="p-3">Status</th>
                            <th className="p-3">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {requests.map(req => (
                            <tr key={req.id} className="border-b">
                                <td className="p-3">{req.date.toDate().toLocaleString()}</td>
                                <td className="p-3">{req.userEmail}</td>
                                <td className="p-3">{CURRENCY_SYMBOL}{req.amount}</td>
                                <td className="p-3">{req.withdrawalMethod?.name}: {req.withdrawalMethod?.details}</td>
                                <td className="p-3 capitalize"><StatusBadge status={req.status} /></td>
                                <td className="p-3">
                                    {req.status === 'pending' && (
                                        <div className="flex gap-2">
                                            <button onClick={() => handleApproval(req, 'completed')} className="p-2 bg-green-500 text-white rounded hover:bg-green-600"><Check size={16} /></button>
                                            <button onClick={() => handleApproval(req, 'rejected')} className="p-2 bg-red-500 text-white rounded hover:bg-red-600"><X size={16} /></button>
                                        </div>
                                    )}
                                </td>
                            </tr>
                        ))}
                        {requests.length === 0 && <tr><td colSpan="6" className="text-center p-4 text-gray-500">No pending withdrawal requests.</td></tr>}
                    </tbody>
                </table>
            </div>
        </div>
    );
}

// --- Theme Management Page ---
function ChangeThemePage({ onThemeChange, onTemplateChange, currentTemplates }) {
    const [currentTheme, setCurrentTheme] = useState('default');
    const [loading, setLoading] = useState(true);
    const [message, setMessage] = useState('');
    const [landingTemplate, setLandingTemplate] = useState(currentTemplates.landing);
    const [loginTemplate, setLoginTemplate] = useState(currentTemplates.login);

    const themes = [
        { id: 'default', name: 'Default Sky', icon: Sun, colors: ['bg-sky-500', 'bg-slate-800', 'bg-white', 'bg-slate-50'] },
        { id: 'nightsky', name: 'Night Sky', icon: Moon, colors: ['bg-slate-500', 'bg-slate-900', 'bg-slate-800', 'bg-slate-700'] },
        { id: 'ocean', name: 'Oceanic', icon: Droplets, colors: ['bg-blue-500', 'bg-cyan-800', 'bg-white', 'bg-blue-50'] },
        { id: 'volcano', name: 'Volcano', icon: Flame, colors: ['bg-red-600', 'bg-gray-900', 'bg-orange-100', 'bg-red-100'] },
        { id: 'meteor', name: 'Meteor Shower', icon: Star, colors: ['bg-indigo-600', 'bg-black', 'bg-purple-200', 'bg-indigo-100'] },
        { id: 'rising', name: 'Rising Star', icon: Star, colors: ['bg-yellow-500', 'bg-gray-800', 'bg-yellow-50', 'bg-gray-100'] },
        { id: 'forest', name: 'Forest', icon: Leaf, colors: ['bg-green-600', 'bg-gray-800', 'bg-green-50', 'bg-gray-100'] },
        { id: 'electric', name: 'Electric', icon: Zap, colors: ['bg-yellow-400', 'bg-gray-900', 'bg-yellow-100', 'bg-gray-200'] },
        { id: 'mountain', name: 'Mountain', icon: Mountain, colors: ['bg-gray-500', 'bg-gray-800', 'bg-white', 'bg-gray-100'] },
        { id: 'windy', name: 'Windy', icon: Wind, colors: ['bg-teal-500', 'bg-gray-700', 'bg-white', 'bg-gray-50'] },
    ];

    useEffect(() => {
        const themeRef = doc(db, "settings", "theme");
        const unsubscribe = onSnapshot(themeRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setCurrentTheme(data.name || 'default');
                setLandingTemplate(data.landingTemplate || 'default');
                setLoginTemplate(data.loginTemplate || 'default');
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const handleSettingsUpdate = async () => {
        setMessage('');
        const settingsRef = doc(db, "settings", "theme");
        try {
            const newSettings = { 
                name: currentTheme, 
                landingTemplate: landingTemplate, 
                loginTemplate: loginTemplate 
            };
            await setDoc(settingsRef, newSettings, { merge: true });
            await logAdminAction("SETTINGS_UPDATE", newSettings);
            onThemeChange(currentTheme);
            onTemplateChange({ landing: landingTemplate, login: loginTemplate });
            setMessage(`Settings updated successfully!`);
            setTimeout(() => setMessage(''), 3000);
        } catch (error) {
            console.error("Error updating settings:", error);
            setMessage("Failed to update settings.");
        }
    };

    if (loading) return <p>Loading theme settings...</p>;

    return (
        <div className="bg-white/80 backdrop-blur-sm p-6 rounded-lg shadow space-y-8">
            <div>
                <h2 className="text-2xl font-semibold mb-4">Change User Panel Theme</h2>
                {message && <div className="bg-green-100 text-green-800 p-3 rounded-md mb-4">{message}</div>}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                    {themes.map(theme => (
                        <div key={theme.id} className={`border-4 rounded-lg p-4 transition-all cursor-pointer ${currentTheme === theme.id ? 'border-sky-500' : 'border-transparent hover:border-gray-300'}`} onClick={() => setCurrentTheme(theme.id)}>
                            <div className="flex items-center mb-2">
                               <theme.icon className="h-6 w-6 mr-2" />
                               <h3 className="font-bold text-lg">{theme.name}</h3>
                            </div>
                            <div className="flex gap-2 mb-4">
                                {theme.colors.map((color, index) => (
                                    <div key={index} className={`w-10 h-10 rounded-full ${color}`}></div>
                                ))}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            <div className="border-t pt-6">
                <h2 className="text-2xl font-semibold mb-4">Page Templates</h2>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                    <div>
                        <h3 className="text-lg font-medium mb-2">Landing Page Template</h3>
                        <div className="grid grid-cols-1 gap-4">
                            <TemplatePreview type="landing" id="default" selected={landingTemplate} onSelect={setLandingTemplate} />
                            <TemplatePreview type="landing" id="minimal" selected={landingTemplate} onSelect={setLandingTemplate} />
                            <TemplatePreview type="landing" id="corporate" selected={landingTemplate} onSelect={setLandingTemplate} />
                        </div>
                    </div>
                    <div>
                        <h3 className="text-lg font-medium mb-2">Login Page Template</h3>
                        <div className="grid grid-cols-1 gap-4">
                            <TemplatePreview type="login" id="default" selected={loginTemplate} onSelect={setLoginTemplate} />
                            <TemplatePreview type="login" id="minimal" selected={loginTemplate} onSelect={setLoginTemplate} />
                            <TemplatePreview type="login" id="corporate" selected={loginTemplate} onSelect={setLoginTemplate} />
                        </div>
                    </div>
                </div>
            </div>

            <div className="pt-6 border-t">
                <button onClick={handleSettingsUpdate} className="bg-blue-600 text-white px-6 py-2 rounded-lg hover:bg-blue-700">
                    Save All Settings
                </button>
            </div>
        </div>
    );
}

// --- Template Preview Component ---
function TemplatePreview({ type, id, selected, onSelect }) {
    const isSelected = selected === id;

    const landingPreviews = {
        default: <div className="h-full bg-slate-900 p-2 flex flex-col justify-center items-center"><div className="w-4/5 h-2 bg-sky-500 rounded-sm"></div><div className="w-3/5 h-1 bg-slate-400 rounded-sm mt-1"></div><div className="w-1/4 h-2 bg-sky-600 rounded-full mt-2"></div></div>,
        minimal: <div className="h-full bg-gray-100 p-2 flex flex-col justify-center items-center"><div className="w-4/5 h-2 bg-gray-800 rounded-sm"></div><div className="w-3/5 h-1 bg-gray-500 rounded-sm mt-1"></div><div className="w-1/4 h-2 bg-gray-800 rounded mt-2"></div></div>,
        corporate: <div className="h-full bg-white p-2 flex"><div className="w-1/3 bg-blue-800 h-full rounded-l-sm"></div><div className="w-2/3 flex flex-col justify-center p-1"><div className="w-4/5 h-2 bg-blue-800 rounded-sm"></div><div className="w-3/5 h-1 bg-gray-400 rounded-sm mt-1"></div></div></div>,
    };

    const loginPreviews = {
        default: <div className="h-full bg-slate-200 p-2 flex justify-center items-center"><div className="w-3/5 h-4/5 bg-white rounded-sm shadow-inner p-1 flex flex-col items-center"><div className="w-4/5 h-1 bg-gray-400 rounded-sm mt-1"></div><div className="w-4/5 h-1 bg-gray-400 rounded-sm mt-1"></div><div className="w-4/5 h-2 bg-blue-600 rounded-sm mt-1"></div></div></div>,
        minimal: <div className="h-full bg-gray-50 p-2 flex justify-center items-center"><div className="w-3/5 h-4/5 p-1 flex flex-col items-center"><div className="w-full h-1 bg-gray-300 rounded-sm mt-1"></div><div className="w-full h-1 bg-gray-300 rounded-sm mt-1"></div><div className="w-full h-2 bg-gray-800 rounded-sm mt-1"></div></div></div>,
        corporate: <div className="h-full bg-white p-2 flex"><div className="w-1/2 bg-slate-800 h-full rounded-l-sm"></div><div className="w-1/2 flex flex-col justify-center p-1"><div className="w-4/5 h-1 bg-gray-300 rounded-sm mt-1"></div><div className="w-4/5 h-1 bg-gray-300 rounded-sm mt-1"></div><div className="w-4/5 h-2 bg-blue-600 rounded-sm mt-1"></div></div></div>,
    };

    return (
        <div onClick={() => onSelect(id)} className={`border-4 rounded-lg cursor-pointer transition-all ${isSelected ? 'border-sky-500' : 'border-transparent hover:border-gray-300'}`}>
            <div className="h-24 w-full bg-white rounded-md overflow-hidden shadow-md">
                {type === 'landing' ? landingPreviews[id] : loginPreviews[id]}
            </div>
            <p className="text-center font-semibold text-sm mt-2 capitalize">{id}</p>
        </div>
    );
}


// --- Payment Methods Page ---
function PaymentMethodsPage() {
    const [manualMethods, setManualMethods] = useState([]);
    const [loadingManual, setLoadingManual] = useState(true);
    const [isManualModalOpen, setIsManualModalOpen] = useState(false);
    const [editingManualMethod, setEditingManualMethod] = useState(null);
    const [confirmAction, setConfirmAction] = useState(null);

    useEffect(() => {
        const q = query(collection(db, "payment_methods"), orderBy("name"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setManualMethods(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setLoadingManual(false);
        });
        return () => unsubscribe();
    }, []);

    const handleOpenManualModal = (method = null) => {
        setEditingManualMethod(method);
        setIsManualModalOpen(true);
    };

    const handleCloseManualModal = () => {
        setEditingManualMethod(null);
        setIsManualModalOpen(false);
    };

    const handleSaveManualMethod = async (methodData) => {
        if (editingManualMethod) {
            const methodRef = doc(db, "payment_methods", editingManualMethod.id);
            await updateDoc(methodRef, methodData);
            await logAdminAction("MANUAL_PAYMENT_METHOD_UPDATE", { methodId: editingManualMethod.id, ...methodData });
        } else {
            const docRef = await addDoc(collection(db, "payment_methods"), methodData);
            await logAdminAction("MANUAL_PAYMENT_METHOD_CREATE", { methodId: docRef.id, ...methodData });
        }
        handleCloseManualModal();
    };

    const handleDeleteManualMethod = async (methodId) => {
        setConfirmAction({
            message: "Are you sure you want to delete this manual payment method?",
            onConfirm: async () => {
                await deleteDoc(doc(db, "payment_methods", methodId));
                await logAdminAction("MANUAL_PAYMENT_METHOD_DELETE", { methodId });
                setConfirmAction(null);
            }
        });
    };

    if (loadingManual) return <p>Loading payment methods...</p>;

    return (
        <div className="bg-white/80 backdrop-blur-sm p-6 rounded-lg shadow">
            {confirmAction && <ConfirmationModal message={confirmAction.message} onConfirm={confirmAction.onConfirm} onCancel={() => setConfirmAction(null)} />}
            
            <div className="mb-8">
                <div className="flex justify-between items-center mb-4">
                    <h2 className="text-2xl font-semibold">Manual Payment Methods</h2>
                    <button onClick={() => handleOpenManualModal()} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
                        <PlusCircle size={18} /> Add Manual Method
                    </button>
                </div>
                <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                        <thead className="text-left bg-gray-100">
                            <tr>
                                <th className="p-3">Method Name</th>
                                <th className="p-3">Logo</th>
                                <th className="p-3">Account Name</th>
                                <th className="p-3">Account Number</th>
                                <th className="p-3">Status</th>
                                <th className="p-3">Description</th>
                                <th className="p-3">Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {manualMethods.map(method => (
                                <tr key={method.id} className="border-b">
                                    <td className="p-3 font-semibold">{method.name}</td>
                                    <td className="p-3">
                                        {method.logoUrl ? (
                                            <img src={method.logoUrl} alt={method.name} className="w-12 h-auto object-contain rounded" onError={(e) => { e.target.onerror = null; e.target.src="https://placehold.co/48x48/e2e8f0/64748b?text=Logo"; }} />
                                        ) : (
                                            <span className="text-gray-400">No Logo</span>
                                        )}
                                    </td>
                                    <td className="p-3">{method.accountName}</td>
                                    <td className="p-3 font-mono">{method.accountNumber}</td>
                                    <td className="p-3">
                                        <span className={`px-2 py-1 text-xs rounded-full ${method.status === 'active' ? 'bg-green-200 text-green-800' : 'bg-red-200 text-red-800'}`}>
                                            {method.status}
                                        </span>
                                    </td>
                                    <td className="p-3">
                                        <div className="prose prose-sm max-w-none" dangerouslySetInnerHTML={{ __html: formatDescription(method.description) }} />
                                    </td>
                                    <td className="p-3 flex gap-2">
                                        <button onClick={() => handleOpenManualModal(method)} className="p-2 bg-gray-200 rounded hover:bg-gray-300"><Edit size={16} /></button>
                                        <button onClick={() => handleDeleteManualMethod(method.id)} className="p-2 bg-red-100 text-red-600 rounded hover:bg-red-200"><Trash2 size={16} /></button>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                    {manualMethods.length === 0 && <p className="text-center py-4 text-gray-500">No manual payment methods found.</p>}
                </div>
            </div>

            {isManualModalOpen && <PaymentMethodModal method={editingManualMethod} onSave={handleSaveManualMethod} onClose={handleCloseManualModal} />}
        </div>
    );
}

const formatDescription = (text) => {
    if (!text) return '';
    let formattedText = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    formattedText = formattedText.replace(/\*(.*?)\*/g, '<em>$1</em>');
    formattedText = formattedText.replace(/\n/g, '<br>');
    return formattedText;
};

function PaymentMethodModal({ method, onSave, onClose }) {
    const [formData, setFormData] = useState({
        name: method ? method.name : '',
        accountName: method ? method.accountName : '',
        accountNumber: method ? method.accountNumber : '',
        logoUrl: method ? method.logoUrl : '',
        status: method ? method.status : 'active',
        description: method ? method.description : '',
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
            <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-xl w-full max-w-md">
                <div className="p-4 border-b flex justify-between items-center">
                    <h3 className="text-lg font-bold">{method ? 'Edit' : 'Add'} Manual Payment Method</h3>
                    <button type="button" onClick={onClose}><X /></button>
                </div>
                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Method Name</label>
                        <input type="text" name="name" value={formData.name} onChange={handleChange} className="w-full p-2 border rounded" placeholder="e.g., Easypaisa" required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Account Name</label>
                        <input type="text" name="accountName" value={formData.accountName} onChange={handleChange} className="w-full p-2 border rounded" placeholder="e.g., John Doe" required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Account Number</label>
                        <input type="text" name="accountNumber" value={formData.accountNumber} onChange={handleChange} className="w-full p-2 border rounded" placeholder="e.g., 03001234567" required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Logo URL (Optional)</label>
                        <input type="text" name="logoUrl" value={formData.logoUrl} onChange={handleChange} className="w-full p-2 border rounded" placeholder="https://example.com/logo.png" />
                        {formData.logoUrl && <img src={formData.logoUrl} alt="Logo Preview" className="mt-2 w-24 h-auto object-contain rounded" onError={(e) => { e.target.onerror = null; e.target.src="https://placehold.co/96x96/e2e8f0/64748b?text=Error"; }} />}
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Description (supports **bold**, *italics*, newlines)</label>
                        <textarea name="description" value={formData.description} onChange={handleChange} rows="4" className="w-full p-2 border rounded" placeholder="Enter description here. Use **text** for bold, *text* for italics."></textarea>
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">Status</label>
                        <select name="status" value={formData.status} onChange={handleChange} className="w-full p-2 border rounded">
                            <option value="active">Active</option>
                            <option value="inactive">Inactive</option>
                        </select>
                    </div>
                </div>
                <div className="p-4 bg-gray-50 flex justify-end gap-4">
                    <button type="button" onClick={onClose} className="bg-gray-200 px-4 py-2 rounded">Cancel</button>
                    <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">Save</button>
                </div>
            </form>
        </div>
    );
}


// --- Manage Ranks Page ---
function ManageRanksPage() {
    const [ranks, setRanks] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingRank, setEditingRank] = useState(null);
    const [isRefreshing, setIsRefreshing] = useState(false);
    const [confirmAction, setConfirmAction] = useState(null);

    useEffect(() => {
        const q = query(collection(db, "public/data/ranks"), orderBy("minSpend"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setRanks(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const handleRefreshLeaderboard = async () => {
        setIsRefreshing(true);
        const usersQuery = query(collection(db, "users"), orderBy("totalSpent", "desc"), limit(10));
        const usersSnapshot = await getDocs(usersQuery);

        const batch = writeBatch(db);

        const oldLeaderboardQuery = query(collection(db, "public/data/leaderboard"));
        const oldLeaderboardSnapshot = await getDocs(oldLeaderboardQuery);
        oldLeaderboardSnapshot.forEach(doc => batch.delete(doc.ref));

        usersSnapshot.docs.forEach((userDoc, index) => {
            const userData = userDoc.data();
            const leaderboardRef = doc(db, "public/data/leaderboard", userDoc.id);
            batch.set(leaderboardRef, {
                name: userData.name,
                photoURL: userData.photoURL || null,
                totalSpent: userData.totalSpent || 0,
                rank: index + 1
            });
        });

        await batch.commit();
        setIsRefreshing(false);
        alert("Leaderboard refreshed!");
    };

    const handleSaveRank = async (rankData) => {
        const dataToSave = {
            ...rankData,
            minSpend: Number(rankData.minSpend),
            rewardAmount: Number(rankData.rewardAmount),
            perks: rankData.perks.split(',').map(p => p.trim())
        };

        if (editingRank) {
            const rankRef = doc(db, "public/data/ranks", editingRank.id);
            await updateDoc(rankRef, dataToSave);
        } else {
            await addDoc(collection(db, "public/data/ranks"), dataToSave);
        }
        setIsModalOpen(false);
        setEditingRank(null);
    };

    const handleDeleteRank = async (rankId) => {
        setConfirmAction({
            message: "Are you sure you want to delete this rank?",
            onConfirm: async () => {
                await deleteDoc(doc(db, "public/data/ranks", rankId));
                setConfirmAction(null);
            }
        });
    };

    if (loading) return <p>Loading ranks...</p>;

    return (
        <div className="bg-white/80 backdrop-blur-sm p-6 rounded-lg shadow">
            {confirmAction && <ConfirmationModal message={confirmAction.message} onConfirm={confirmAction.onConfirm} onCancel={() => setConfirmAction(null)} />}
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-semibold">Manage Ranks & Rewards</h2>
                <div>
                    <button onClick={handleRefreshLeaderboard} disabled={isRefreshing} className="flex items-center gap-2 bg-yellow-500 text-white px-4 py-2 rounded hover:bg-yellow-600 mr-4 disabled:bg-gray-400">
                        {isRefreshing ? <RefreshCw className="animate-spin" /> : <RefreshCw />} Refresh Leaderboard
                    </button>
                    <button onClick={() => { setEditingRank(null); setIsModalOpen(true); }} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
                        <PlusCircle size={18} /> Add Rank
                    </button>
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="text-left bg-gray-100">
                        <tr>
                            <th className="p-3">Rank Name</th>
                            <th className="p-3">Min Spend</th>
                            <th className="p-3">Reward</th>
                            <th className="p-3">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {ranks.map(rank => (
                            <tr key={rank.id} className="border-b">
                                <td className="p-3 font-semibold">{rank.name}</td>
                                <td className="p-3">Rs {rank.minSpend}</td>
                                <td className="p-3">Rs {rank.rewardAmount}</td>
                                <td className="p-3 flex gap-2">
                                    <button onClick={() => { setEditingRank(rank); setIsModalOpen(true); }} className="p-2 bg-gray-200 rounded hover:bg-gray-300"><Edit size={16} /></button>
                                    <button onClick={() => handleDeleteRank(rank.id)} className="p-2 bg-red-100 text-red-600 rounded hover:bg-red-200"><Trash2 size={16} /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
            {isModalOpen && <RankModal rank={editingRank} onSave={handleSaveRank} onClose={() => setIsModalOpen(false)} />}
        </div>
    );
}

function RankModal({ rank, onSave, onClose }) {
    const [formData, setFormData] = useState({
        name: rank ? rank.name : '',
        minSpend: rank ? rank.minSpend : 0,
        rewardAmount: rank ? rank.rewardAmount : 0,
        icon: rank ? rank.icon : 'Zap',
        color: rank ? rank.color : 'text-orange-400',
        perks: rank ? rank.perks.join(', ') : '',
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
            <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-xl w-full max-w-lg">
                <div className="p-4 border-b flex justify-between items-center">
                    <h3 className="text-lg font-bold">{rank ? 'Edit' : 'Add'} Rank</h3>
                    <button type="button" onClick={onClose}><X /></button>
                </div>
                <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input name="name" value={formData.name} onChange={handleChange} placeholder="Rank Name (e.g., Gold)" className="w-full p-2 border rounded" required />
                    <input name="minSpend" type="number" value={formData.minSpend} onChange={handleChange} placeholder="Minimum Spend" className="w-full p-2 border rounded" required />
                    <input name="rewardAmount" type="number" value={formData.rewardAmount} onChange={handleChange} placeholder="Reward Amount" className="w-full p-2 border rounded" required />
                    <input name="icon" value={formData.icon} onChange={handleChange} placeholder="Icon Name (e.g., Star)" className="w-full p-2 border rounded" required />
                    <input name="color" value={formData.color} onChange={handleChange} placeholder="Tailwind Color (e.g., text-amber-400)" className="w-full p-2 border rounded" required />
                    <textarea name="perks" value={formData.perks} onChange={handleChange} placeholder="Perks (comma-separated)" className="w-full p-2 border rounded md:col-span-2" rows="3" required />
                </div>
                <div className="p-4 bg-gray-50 flex justify-end gap-4">
                    <button type="button" onClick={onClose} className="bg-gray-200 px-4 py-2 rounded">Cancel</button>
                    <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">Save Rank</button>
                </div>
            </form>
        </div>
    );
}


// --- Audit Log Page ---
function AuditLogPage() {
    const [logs, setLogs] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const q = query(collection(db, 'audit_log'), orderBy("timestamp", "desc"), limit(100));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setLogs(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setLoading(false);
        }, (error) => {
            console.error("Error fetching audit logs:", error);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    if (loading) return <p>Loading audit log...</p>;

    return (
        <div className="bg-white/80 backdrop-blur-sm p-6 rounded-lg shadow">
            <h2 className="text-2xl font-semibold mb-4">Admin Audit Log</h2>
            <div className="overflow-x-auto"><table className="w-full text-sm">
                <thead className="text-left bg-gray-100"><tr><th className="p-3">Timestamp</th><th className="p-3">Admin</th><th className="p-3">Action</th><th className="p-3">Details</th></tr></thead>
                <tbody>
                    {logs.map(log => (
                        <tr key={log.id} className="border-b">
                            <td className="p-3">{log.timestamp?.toDate() ? log.timestamp.toDate().toLocaleString() : 'N/A'}</td>
                            <td className="p-3">{log.adminEmail}</td>
                            <td className="p-3 font-semibold">{log.action}</td>
                            <td className="p-3 font-mono text-xs">{JSON.stringify(log.details)}</td>
                        </tr>
                    ))}
                </tbody>
            </table></div>
        </div>
    )
}

// --- API Provider Page ---
function ApiProviderPage() {
    const [providers, setProviders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingProvider, setEditingProvider] = useState(null);
    const [confirmAction, setConfirmAction] = useState(null);


    useEffect(() => {
        const q = query(collection(db, "api_providers"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const providersData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
            providersData.sort((a, b) => a.name.localeCompare(b.name));
            setProviders(providersData);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching API providers:", error);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const handleSave = async (providerData) => {
        if (editingProvider) {
            const providerRef = doc(db, "api_providers", editingProvider.id);
            await updateDoc(providerRef, providerData);
            await logAdminAction("API_PROVIDER_UPDATE", { providerId: editingProvider.id, name: providerData.name });
        } else {
            const docRef = await addDoc(collection(db, "api_providers"), providerData);
            await logAdminAction("API_PROVIDER_CREATE", { providerId: docRef.id, name: providerData.name });
        }
        setIsModalOpen(false);
        setEditingProvider(null);
    };

    const handleDelete = async (providerId) => {
        setConfirmAction({
            message: "Are you sure you want to delete this API provider?",
            onConfirm: async () => {
                await deleteDoc(doc(db, "api_providers", providerId));
                await logAdminAction("API_PROVIDER_DELETE", { providerId });
                setConfirmAction(null);
            }
        });
    };

    if (loading) return <p>Loading API providers...</p>;

    return (
        <div className="bg-white/80 backdrop-blur-sm p-6 rounded-lg shadow">
            {confirmAction && <ConfirmationModal message={confirmAction.message} onConfirm={confirmAction.onConfirm} onCancel={() => setConfirmAction(null)} />}
            <div className="flex justify-between items-center mb-4">
                <h2 className="text-2xl font-semibold">API Providers</h2>
                <button onClick={() => { setEditingProvider(null); setIsModalOpen(true); }} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700">
                    <PlusCircle size={18} /> Add Provider
                </button>
            </div>
            <div className="overflow-x-auto">
                <table className="w-full text-sm">
                    <thead className="text-left bg-gray-100">
                        <tr>
                            <th className="p-3">Provider Name</th>
                            <th className="p-3">API URL</th>
                            <th className="p-3">Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {providers.map(provider => (
                            <tr key={provider.id} className="border-b">
                                <td className="p-3 font-semibold">{provider.name}</td>
                                <td className="p-3 font-mono">{provider.apiUrl}</td>
                                <td className="p-3 flex gap-2">
                                    <button onClick={() => { setEditingProvider(provider); setIsModalOpen(true); }} className="p-2 bg-gray-200 rounded hover:bg-gray-300"><Edit size={16} /></button>
                                    <button onClick={() => handleDelete(provider.id)} className="p-2 bg-red-100 text-red-600 rounded hover:bg-red-200"><Trash2 size={16} /></button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {providers.length === 0 && <p className="text-center py-4 text-gray-500">No API providers found.</p>}
            </div>
            {isModalOpen && <ApiProviderModal provider={editingProvider} onSave={handleSave} onClose={() => setIsModalOpen(false)} />}
        </div>
    );
}

function ApiProviderModal({ provider, onSave, onClose }) {
    const [formData, setFormData] = useState({
        name: provider ? provider.name : '',
        apiUrl: provider ? provider.apiUrl : '',
        apiKey: provider ? provider.apiKey : '',
    });

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
            <form onSubmit={handleSubmit} className="bg-white rounded-lg shadow-xl w-full max-w-md">
                <div className="p-4 border-b flex justify-between items-center">
                    <h3 className="text-lg font-bold">{provider ? 'Edit' : 'Add'} API Provider</h3>
                    <button type="button" onClick={onClose}><X /></button>
                </div>
                <div className="p-6 space-y-4">
                    <div>
                        <label className="block text-sm font-medium mb-1">Provider Name</label>
                        <input type="text" name="name" value={formData.name} onChange={handleChange} className="w-full p-2 border rounded" placeholder="e.g., Main Provider" required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">API URL</label>
                        <input type="text" name="apiUrl" value={formData.apiUrl} onChange={handleChange} className="w-full p-2 border rounded" placeholder="https://provider.com/api/v2" required />
                    </div>
                    <div>
                        <label className="block text-sm font-medium mb-1">API Key</label>
                        <input type="text" name="apiKey" value={formData.apiKey} onChange={handleChange} className="w-full p-2 border rounded" placeholder="Your API key from the provider" required />
                    </div>
                </div>
                <div className="p-4 bg-gray-50 flex justify-end gap-4">
                    <button type="button" onClick={onClose} className="bg-gray-200 px-4 py-2 rounded">Cancel</button>
                    <button type="submit" className="bg-blue-600 text-white px-4 py-2 rounded">Save</button>
                </div>
            </form>
        </div>
    );
}
// --- RE-ENGINEERED Import Service Modal ---
function ImportServiceModal({ categories, onClose }) {
    const [providers, setProviders] = useState([]);
    const [selectedProvider, setSelectedProvider] = useState('');
    const [groupedServices, setGroupedServices] = useState({});
    const [selectedServices, setSelectedServices] = useState({});
    const [rateIncrease, setRateIncrease] = useState(20);
    const [loadingProviders, setLoadingProviders] = useState(true);
    const [fetchingServices, setFetchingServices] = useState(false);
    const [importing, setImporting] = useState(false);
    const [error, setError] = useState('');
    const [searchTerm, setSearchTerm] = useState('');
    const [expandedCategories, setExpandedCategories] = useState({});

    useEffect(() => {
        const q = query(collection(db, "api_providers"));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            setProviders(snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })));
            setLoadingProviders(false);
        });
        return () => unsubscribe();
    }, []);

    const handleFetchServices = async () => {
        if (!selectedProvider) return;
        setFetchingServices(true);
        setError('');
        setGroupedServices({});
        try {
            const provider = providers.find(p => p.id === selectedProvider);
            const services = await callProviderApi(provider, 'services');
            
            const grouped = services.reduce((acc, service) => {
                const category = service.category || 'Uncategorized';
                if (!acc[category]) {
                    acc[category] = [];
                }
                acc[category].push(service);
                return acc;
            }, {});
            setGroupedServices(grouped);

        } catch (err) {
            setError("Failed to fetch services from provider.");
            console.error(err);
        }
        setFetchingServices(false);
    };

    const handleCategorySelection = (categoryName, localCategoryId) => {
        const servicesInCategory = groupedServices[categoryName];
        if (!servicesInCategory) return;

        const updatedSelection = { ...selectedServices };
        for (const service of servicesInCategory) {
            if (localCategoryId) {
                updatedSelection[service.service] = {
                    ...updatedSelection[service.service],
                    categoryId: localCategoryId,
                    selected: true,
                };
            } else {
                if (updatedSelection[service.service]) {
                    updatedSelection[service.service].selected = false;
                }
            }
        }
        setSelectedServices(updatedSelection);
    };
    
    const filteredGroupedServices = useMemo(() => {
        if (!searchTerm) return groupedServices;
        const lowercasedFilter = searchTerm.toLowerCase();
        const filtered = {};
        for (const categoryName in groupedServices) {
            const services = groupedServices[categoryName].filter(service =>
                service.name.toLowerCase().includes(lowercasedFilter)
            );
            if (services.length > 0) {
                filtered[categoryName] = services;
            }
        }
        return filtered;
    }, [groupedServices, searchTerm]);

    const handleImport = async () => {
        const servicesToImport = Object.entries(selectedServices).filter(([, details]) => details.selected && details.categoryId);
        if (servicesToImport.length === 0) {
            setError("No services selected with a valid local category.");
            return;
        }
        setImporting(true);
        setError('');

        const batch = writeBatch(db);
        let count = 0;

        for (const [serviceId, details] of servicesToImport) {
            let serviceData = null;
            for(const category in groupedServices){
                const foundService = groupedServices[category].find(s => s.service === serviceId);
                if(foundService){
                    serviceData = foundService;
                    break;
                }
            }

            if (!serviceData) continue;

            const cost = parseFloat(serviceData.rate);
            const newRate = cost * (1 + rateIncrease / 100);

            const newService = {
                id_api: serviceData.service,
                name: serviceData.name,
                rate: parseFloat(newRate.toFixed(4)),
                cost: cost,
                min: parseInt(serviceData.min, 10) || 0,
                max: parseInt(serviceData.max, 10) || 0,
                providerId: selectedProvider,
                providerServiceId: serviceData.service,
                category: categories.find(c => c.id === details.categoryId)?.name || 'Uncategorized',
                description: serviceData.description || '',
                tags: serviceData.tags || [],
            };

            const serviceRef = doc(collection(db, `categories/${details.categoryId}/services`));
            batch.set(serviceRef, newService);
            count++;
        }

        try {
            await batch.commit();
            await logAdminAction("SERVICES_IMPORTED", { providerId: selectedProvider, count });
            alert(`${count} services imported successfully!`);
            onClose();
        } catch (err) {
            setError("An error occurred during import. Please check console.");
            console.error(err);
        }
        setImporting(false);
    };

    const getSocialLogo = (categoryName) => {
        const lowerCaseCategory = categoryName.toLowerCase();
        if (lowerCaseCategory.includes('instagram')) return 'https://www.instagram.com/static/images/ico/favicon-192.png/68d99ba29cc8.png';
        if (lowerCaseCategory.includes('facebook')) return 'https://www.facebook.com/images/fb_icon_325x325.png';
        if (lowerCaseCategory.includes('youtube')) return 'https://www.youtube.com/s/desktop/064354e2/img/favicon_144.png';
        if (lowerCaseCategory.includes('twitter')) return 'https://abs.twimg.com/responsive-web/web/icon-default.3c3b0954.png';
        if (lowerCaseCategory.includes('tiktok')) return 'https://sf-tb-sg.ibytedtos.com/obj/eden-sg/uhtyfhoh_w/tiktok-icon2.png';
        return null;
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex justify-center items-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-7xl h-[90vh] flex flex-col">
                <div className="p-4 border-b flex justify-between items-center">
                    <h3 className="text-lg font-bold">Import Services by Category</h3>
                    <button onClick={onClose}><X /></button>
                </div>
                <div className="p-6 flex-shrink-0 border-b">
                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4 items-end">
                        <div>
                            <label className="block text-sm font-medium mb-1">Select Provider</label>
                            <select value={selectedProvider} onChange={e => setSelectedProvider(e.target.value)} className="w-full p-2 border rounded" disabled={loadingProviders}>
                                <option value="">{loadingProviders ? 'Loading...' : 'Select a provider'}</option>
                                {providers.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
                            </select>
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium mb-1">Search Services</label>
                            <div className="relative">
                                <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={18} />
                                <input
                                    type="text"
                                    placeholder="Search by name or category..."
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    className="w-full p-2 pl-10 border rounded"
                                    disabled={Object.keys(groupedServices).length === 0}
                                />
                            </div>
                        </div>
                        <button onClick={handleFetchServices} disabled={!selectedProvider || fetchingServices} className="bg-blue-600 text-white px-4 py-2 rounded disabled:bg-gray-400">
                            {fetchingServices ? 'Fetching...' : 'Fetch Services'}
                        </button>
                        <div className="md:col-span-1">
                            {error && <p className="text-red-500 text-sm">{error}</p>}
                        </div>
                    </div>
                </div>
                <div className="flex-grow overflow-auto">
                    {Object.keys(filteredGroupedServices).length > 0 ? (
                        <div className="space-y-2 p-4">
                            {Object.entries(filteredGroupedServices).map(([categoryName, services]) => (
                                <div key={categoryName} className="border rounded-lg">
                                    <div className="p-3 bg-gray-50 flex justify-between items-center cursor-pointer" onClick={() => setExpandedCategories(prev => ({...prev, [categoryName]: !prev[categoryName]}))}>
                                        <div className="flex items-center gap-3">
                                            {getSocialLogo(categoryName) && <img src={getSocialLogo(categoryName)} alt={categoryName} className="w-6 h-6" />}
                                            <h4 className="font-bold">{categoryName} ({services.length})</h4>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className="text-sm">Assign all to:</span>
                                            <select
                                                onChange={(e) => handleCategorySelection(categoryName, e.target.value)}
                                                onClick={(e) => e.stopPropagation()}
                                                className="p-1 border rounded text-xs"
                                            >
                                                <option value="">Select Local Category</option>
                                                {categories.map(cat => <option key={cat.id} value={cat.id}>{cat.name}</option>)}
                                            </select>
                                            <ChevronRight className={`transition-transform ${expandedCategories[categoryName] ? 'rotate-90' : ''}`} />
                                        </div>
                                    </div>
                                    {expandedCategories[categoryName] && (
                                        <div className="overflow-x-auto">
                                            <p className="p-4 text-sm text-gray-600">All {services.length} services in this category will be assigned to the selected local category.</p>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="flex items-center justify-center h-full text-gray-500">
                            <p>{fetchingServices ? 'Loading services...' : 'Select a provider and fetch services.'}</p>
                        </div>
                    )}
                </div>
                <div className="p-4 bg-gray-50 border-t flex justify-between items-center">
                    <div className="flex items-center gap-2">
                        <label className="text-sm font-medium">Rate Increase (%):</label>
                        <input type="number" value={rateIncrease} onChange={e => setRateIncrease(Number(e.target.value))} className="w-20 p-2 border rounded" />
                    </div>
                    <button onClick={handleImport} disabled={importing || Object.values(selectedServices).filter(s => s.selected).length === 0} className="bg-green-600 text-white px-6 py-2 rounded disabled:bg-gray-400">
                        {importing ? 'Importing...' : `Import ${Object.values(selectedServices).filter(s => s.selected).length} Services`}
                    </button>
                </div>
            </div>
        </div>
    );
}

// --- Helper Components ---
const StatusBadge = ({ status }) => {
    const statusMap = {
        Completed: 'bg-green-100 text-green-800', completed: 'bg-green-100 text-green-800',
        Processing: 'bg-blue-100 text-blue-800',
        Pending: 'bg-yellow-100 text-yellow-800', pending: 'bg-yellow-100 text-yellow-800',
        Canceled: 'bg-red-100 text-red-800', canceled: 'bg-red-100 text-red-800',
        Partial: 'bg-purple-100 text-purple-800',
        Open: 'bg-sky-100 text-sky-800',
        Answered: 'bg-indigo-100 text-indigo-800',
        Resolved: 'bg-gray-100 text-gray-800', 'resolved': 'bg-gray-200 text-gray-800',
        rejected: 'bg-red-100 text-red-800',
        failed: 'bg-red-200 text-red-800',
    };
    return (<span className={`px-2.5 py-1 text-xs font-semibold rounded-full capitalize ${statusMap[status] || 'bg-gray-100 text-gray-800'}`}>{status}</span>);
};

const ServiceTag = ({ tagName }) => {
    const tagStyles = {
        'High Quality': 'bg-amber-100 text-amber-800',
        'Fast Start': 'bg-sky-100 text-sky-800',
        'Drip-Feed Available': 'bg-blue-100 text-blue-800',
        'Refill Guarantee': 'bg-green-100 text-green-800',
        'Bot': 'bg-red-100 text-red-800',
        'Real Users': 'bg-teal-100 text-teal-800',
        'New': 'bg-purple-100 text-purple-800',
        'Popular': 'bg-pink-100 text-pink-800',
    };
    return (
        <span className={`inline-block px-2 py-0.5 text-xs font-medium rounded-full ${tagStyles[tagName] || 'bg-gray-100 text-gray-800'}`}>
            {tagName}
        </span>
    );
};

function ConfirmationModal({ message, onConfirm, onCancel }) {
    return (
        <div className="fixed inset-0 bg-black bg-opacity-60 flex justify-center items-center z-[100] p-4">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-sm">
                <div className="p-6 text-center">
                    <AlertTriangle className="mx-auto h-12 w-12 text-yellow-500" />
                    <h3 className="text-lg font-medium text-gray-900 mt-2">Are you sure?</h3>
                    <p className="text-sm text-gray-500 mt-2">{message}</p>
                </div>
                <div className="p-4 bg-gray-50 flex justify-center gap-4">
                    <button onClick={onCancel} className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300">
                        Cancel
                    </button>
                    <button onClick={onConfirm} className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700">
                        Confirm
                    </button>
                </div>
            </div>
        </div>
    );
}

export default App;
