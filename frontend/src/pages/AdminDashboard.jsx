import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Shield, Users, Store, DollarSign, Clock, Loader2 } from 'lucide-react';
import api from '../api';

export default function AdminDashboard() {
  const { user } = useAuth();
  const [stats, setStats] = useState({});
  const [users, setUsers] = useState([]);
  const [stores, setStores] = useState([]);
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, [user]);

  async function load() {
    setLoading(true);
    try {
      const [sRes, uRes, stRes, oRes] = await Promise.all([
        api.get('/admin/stats'),
        api.get('/admin/users'),
        api.get('/admin/stores'),
        api.get('/orders'),
      ]);
      setStats(sRes.data.stats);
      setUsers(uRes.data.users);
      setStores(stRes.data.stores);
      setOrders(oRes.data.orders);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-64px)] p-4 flex flex-col items-center justify-center">
        <Loader2 className="w-10 h-10 text-toters-600 animate-spin mb-3" />
        <p className="text-gray-500">جاري تحميل لوحة المشرف...</p>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-64px)] bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        <h1 className="text-xl font-bold text-gray-900 mb-6">لوحة إدارة النظام</h1>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
          <StatCard icon={<Users size={20} className="text-blue-600" />} title="المستخدمون" value={stats.users || 0} />
          <StatCard icon={<Store size={20} className="text-indigo-600" />} title="المتاجر" value={stats.stores || 0} />
          <StatCard icon={<DollarSign size={20} className="text-green-600" />} title="الإيرادات" value={`${(stats.revenue || 0).toLocaleString()} ل.ل`} />
          <StatCard icon={<Clock size={20} className="text-amber-600" />} title="طلبات معلقة" value={stats.pending || 0} />
        </div>

        <div className="grid lg:grid-cols-2 gap-6 mb-8">
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="font-bold text-gray-900">آخر الطلبات</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 font-medium text-gray-600">طلب</th>
                    <th className="px-6 py-3 font-medium text-gray-600">الزبون</th>
                    <th className="px-6 py-3 font-medium text-gray-600">المتجر</th>
                    <th className="px-6 py-3 font-medium text-gray-600">المبلغ</th>
                    <th className="px-6 py-3 font-medium text-gray-600">الحالة</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {orders.slice(0, 10).map((o) => (
                    <tr key={o.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-3 font-medium text-gray-900">#{o.id}</td>
                      <td className="px-6 py-3 text-gray-800">{o.customer_name || '—'}</td>
                      <td className="px-6 py-3 text-gray-800">{o.store?.name || '—'}</td>
                      <td className="px-6 py-3 font-medium text-gray-900">{o.total.toLocaleString()} ل.ل</td>
                      <td className="px-6 py-3">
                        <span className={`inline-block px-2 py-1 rounded text-xs font-bold ${o.status === 'delivered' ? 'bg-green-100 text-green-700' : o.status === 'pending' ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>
                          {o.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="font-bold text-gray-900">المستخدمون</h2>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 font-medium text-gray-600">الاسم</th>
                    <th className="px-6 py-3 font-medium text-gray-600">البريد</th>
                    <th className="px-6 py-3 font-medium text-gray-600">الدور</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {users.map((u) => (
                    <tr key={u.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-3 text-gray-800">{u.name}</td>
                      <td className="px-6 py-3 text-sm text-gray-600">{u.email}</td>
                      <td className="px-6 py-3">
                        <span className={`inline-block px-2 py-1 rounded text-xs font-bold ${u.role === 'admin' ? 'bg-purple-100 text-purple-700' : u.role === 'vendor' ? 'bg-indigo-100 text-indigo-700' : u.role === 'driver' ? 'bg-green-100 text-green-700' : 'bg-blue-100 text-blue-700'}`}>
                          {u.role === 'vendor' ? 'متجر' : u.role === 'driver' ? 'سائق' : u.role === 'admin' ? 'مشرف' : 'زبون'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="font-bold text-gray-900">المتاجر المسجلة</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 font-medium text-gray-600">اسم المتجر</th>
                  <th className="px-6 py-3 font-medium text-gray-600">التصنيف</th>
                  <th className="px-6 py-3 font-medium text-gray-600">صاحب المتجر</th>
                  <th className="px-6 py-3 font-medium text-gray-600">الحالة</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {stores.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50 transition">
                    <td className="px-6 py-3 text-gray-800">{s.name}</td>
                    <td className="px-6 py-3 text-sm text-gray-600">{s.category}</td>
                    <td className="px-6 py-3 text-sm text-gray-600">{s.vendor_name || '—'}</td>
                    <td className="px-6 py-3">
                      <span className={`inline-block px-2 py-1 rounded text-xs font-bold ${s.is_open ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {s.is_open ? 'مفتوح' : 'مغلق'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon, title, value }) {
  return (
    <div className="bg-white p-5 rounded-xl border border-gray-200 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="p-2 rounded-lg bg-gray-100 text-gray-600">{icon}</div>
        <div>
          <p className="text-xs text-gray-500 uppercase">{title}</p>
          <p className="text-lg font-bold text-gray-900">{value}</p>
        </div>
      </div>
    </div>
  );
}
