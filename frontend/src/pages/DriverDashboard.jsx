import { useEffect, useState } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Truck, MapPin, CheckCircle, Clock, DollarSign, Loader2, Package } from 'lucide-react';
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

export default function DriverDashboard() {
  const { user } = useAuth();
  const [available, setAvailable] = useState([]);
  const [mine, setMine] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, [user]);

  async function load() {
    setLoading(true);
    try {
      const r = await api.get('/orders');
      const allOrders = r.data.orders;
      setAvailable(
        allOrders.filter((o) => o.status === 'ready' && !o.driver_id).sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      );
      setMine(
        allOrders
          .filter((o) => o.driver_id === user.id && (o.status === 'out_for_delivery' || o.status === 'delivered'))
          .sort((a, b) => new Date(b.created_at) - new Date(a.created_at))
      );
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function accept(orderId) {
    await api.patch(`/driver/orders/${orderId}/accept`);
    load();
  }

  async function deliver(orderId) {
    await api.patch(`/driver/orders/${orderId}/deliver`);
    load();
  }

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-64px)] p-4 flex flex-col items-center justify-center">
        <Loader2 className="w-10 h-10 text-toters-600 animate-spin mb-3" />
        <p className="text-gray-500">جاري تحميل التوصيلات...</p>
      </div>
    );
  }

  const revenue = mine.reduce((s, o) => (o.status === 'delivered' ? s + Number(o.total) : s), 0);

  return (
    <div className="min-h-[calc(100vh-64px)] bg-gray-50 p-4">
      <div className="max-w-5xl mx-auto">
        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-xl font-bold text-gray-900">لوحة السائق</h1>
            <p className="text-gray-500 text-sm">قبول طلبات التوصيل وتحديث حالة التوصيل</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
          <StatCard icon={<Package size={20} className="text-blue-600" />} title="طلبات متاحة" value={available.length} />
          <StatCard icon={<Truck size={20} className="text-indigo-600" />} title="تحت التوصيل" value={mine.filter((o) => o.status === 'out_for_delivery').length} />
          <StatCard icon={<DollarSign size={20} className="text-green-600" />} title="إيراداتك" value={`${revenue.toLocaleString()} ل.ل`} />
        </div>

        <div className="grid lg:grid-cols-2 gap-6">
          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <h2 className="font-bold text-gray-900">طلبات جاهزة للتسليم</h2>
            </div>
            <div className="divide-y divide-gray-100">
              {available.length === 0 ? (
                <div className="px-6 py-8 text-center text-gray-500">لا توجد طلبات جاهزة حالياً</div>
              ) : (
                available.map((o) => (
                  <div key={o.id} className="px-6 py-4 flex items-center justify-between hover:bg-gray-50 transition">
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">#{o.id}</div>
                      <div className="text-sm text-gray-600">{o.store?.name}</div>
                      <div className="text-xs text-gray-500 mt-1">{o.address}</div>
                    </div>
                    <div className="text-right">
                      <div className="text-sm font-bold text-gray-800">{o.total.toLocaleString()} ل.ل</div>
                      <button
                        onClick={() => accept(o.id)}
                        disabled={loading}
                        className="mt-2 bg-toters-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-toters-700 disabled:opacity-70 transition"
                      >
                        قبول التوصيل
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-gray-200 overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200">
              <h2 className="font-bold text-gray-900">توصيلاتي الجارية والمنجزة</h2>
            </div>
            <div className="divide-y divide-gray-100">
              {mine.length === 0 ? (
                <div className="px-6 py-8 text-center text-gray-500">لا توجد توصيلات تحت مسؤوليتك حالياً</div>
              ) : (
                mine.map((o) => (
                  <div key={o.id} className="px-6 py-4 flex items-center justify-between">
                    <div className="flex-1">
                      <div className="font-medium text-gray-900">#{o.id}</div>
                      <div className="text-sm text-gray-600">{o.customer_name || 'الزبون'}</div>
                      <div className="text-xs text-gray-500 mt-1">{o.address}</div>
                    </div>
                    <div className="text-right">
                      <span className={`inline-block px-2 py-1 rounded text-xs font-bold mb-1 block ${
                        o.status === 'out_for_delivery' ? 'bg-indigo-100 text-indigo-700' : 'bg-green-100 text-green-700'
                      }`}>
                        {STATUS_LABELS[o.status]}
                      </span>
                      {o.status === 'out_for_delivery' ? (
                        <button
                          onClick={() => deliver(o.id)}
                          disabled={loading}
                          className="mt-2 bg-green-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-green-700 disabled:opacity-70 transition"
                        >
                          تم التسليم ✅
                        </button>
                      ) : (
                        <span className="text-xs text-green-600 font-medium mt-2 block">تم إكمال التوصيل</span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
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
