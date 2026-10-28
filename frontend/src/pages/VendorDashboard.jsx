import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Store, ShoppingBag, DollarSign, Clock, Truck, CheckCircle, Loader2 } from 'lucide-react';
import api from '../api';

const STATUS_LABELS = {
  pending: 'قيد الانتظار',
  confirmed: 'مؤكد',
  preparing: 'قيد التحضير',
  ready: 'جاهز للتسليم',
  out_for_delivery: 'في الطريق',
  delivered: 'تم التوصيل',
  cancelled: 'ملغي',
};

export default function VendorDashboard() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, delivered: 0, revenue: 0 });
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, [user]);

  async function load() {
    setLoading(true);
    try {
      const [oRes] = await Promise.all([api.get('/orders')]);
      const vendorOrders = oRes.data.orders.filter((o) => o.store?.vendor_id === user.id);
      setOrders(vendorOrders);
      const delivered = vendorOrders.filter((o) => o.status === 'delivered');
      setStats({
        total: vendorOrders.length,
        pending: vendorOrders.filter((o) => o.status === 'pending').length,
        delivered: delivered.length,
        revenue: delivered.reduce((s, o) => s + Number(o.total), 0),
      });
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function updateStatus(orderId, status) {
    await api.patch(`/orders/${orderId}/status`, { status, note: `تم التحديث من لوحة المتجر` });
    load();
  }

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-64px)] p-4 flex flex-col items-center justify-center">
        <Loader2 className="w-10 h-10 text-toters-600 animate-spin mb-3" />
        <p className="text-gray-500">جاري تحميل لوحة المتجر...</p>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-64px)] bg-gray-50 p-4">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-gray-900">لوحة المتجر</h1>
            <p className="text-gray-500 text-sm">إدارة طلبات متاجرك وتحديث حالاتها</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
          <StatCard icon={<Store size={20} className="text-gray-600" />} title="إجمالي الطلبات" value={stats.total} />
          <StatCard icon={<Clock size={20} className="text-blue-600" />} title="قيد الانتظار" value={stats.pending} />
          <StatCard icon={<CheckCircle size={20} className="text-green-600" />} title="تم التوصيل" value={stats.delivered} />
          <StatCard icon={<DollarSign size={20} className="text-indigo-600" />} title="إيرادات التوصيل" value={`${stats.revenue.toLocaleString()} ل.ل`} />
        </div>

        <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200">
            <h2 className="font-bold text-gray-900">طلبات متاجرك</h2>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 font-medium text-gray-600">الطلب</th>
                  <th className="px-6 py-3 font-medium text-gray-600">الزبون</th>
                  <th className="px-6 py-3 font-medium text-gray-600">المتجر</th>
                  <th className="px-6 py-3 font-medium text-gray-600">المبلغ</th>
                  <th className="px-6 py-3 font-medium text-gray-600">الحالة</th>
                  <th className="px-6 py-3 font-medium text-gray-600">الإجراء</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {orders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-6 py-8 text-center text-gray-500">لا توجد طلبات بعد</td>
                  </tr>
                ) : (
                  orders.map((o) => (
                    <tr key={o.id} className="hover:bg-gray-50 transition">
                      <td className="px-6 py-4">
                        <span className="font-medium text-gray-900">#{o.id}</span>
                        <p className="text-xs text-gray-500">{new Date(o.created_at).toLocaleDateString('ar-SA')}</p>
                      </td>
                      <td className="px-6 py-4 text-gray-800">{o.customer_name || 'زبون'}</td>
                      <td className="px-6 py-4 text-gray-800">{o.store?.name || '—'}</td>
                      <td className="px-6 py-4 font-medium text-gray-800">{o.total.toLocaleString()} ل.ل</td>
                      <td className="px-6 py-4">
                        <select
                          value={o.status}
                          onChange={(e) => updateStatus(o.id, e.target.value)}
                          className="border border-gray-200 rounded-lg px-2 py-1.5 text-sm bg-white focus:ring-2 focus:ring-toters-500 outline-none"
                        >
                          {['pending', 'confirmed', 'preparing', 'ready', 'out_for_delivery', 'delivered', 'cancelled'].map((s) => (
                            <option key={s} value={s}>
                              {STATUS_LABELS[s]}
                            </option>
                          ))}
                        </select>
                      </td>
                      <td className="px-6 py-4">
                        <span className={`inline-block px-2 py-1 rounded text-xs font-bold ${{
                          pending: 'bg-blue-100 text-blue-700',
                          confirmed: 'bg-purple-100 text-purple-700',
                          preparing: 'bg-amber-100 text-amber-700',
                          ready: 'bg-blue-100 text-blue-700',
                          out_for_delivery: 'bg-indigo-100 text-indigo-700',
                          delivered: 'bg-green-100 text-green-700',
                          cancelled: 'bg-red-100 text-red-700',
                        }[o.status]}`}>
                          {STATUS_LABELS[o.status]}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
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
