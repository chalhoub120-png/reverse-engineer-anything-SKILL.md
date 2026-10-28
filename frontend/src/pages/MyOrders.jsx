import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ShoppingBag, Clock, Truck, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
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
const STATUS_COLORS = {
  pending: 'bg-blue-100 text-blue-700',
  confirmed: 'bg-purple-100 text-purple-700',
  preparing: 'bg-amber-100 text-amber-700',
  ready: 'bg-blue-100 text-blue-700',
  out_for_delivery: 'bg-indigo-100 text-indigo-700',
  delivered: 'bg-green-100 text-green-700',
  cancelled: 'bg-red-100 text-red-700',
};

export default function MyOrders() {
  const { user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, [user]);

  async function load() {
    setLoading(true);
    try {
      const r = await api.get('/orders');
      setOrders(r.data.orders);
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
        <p className="text-gray-500">جاري تحميل طلباتك...</p>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-64px)] bg-gray-50 p-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-xl font-bold text-gray-900 mb-5">طلباتي</h1>
        {orders.length === 0 ? (
          <div className="text-center py-20 text-gray-500">
            <ShoppingBag className="w-16 h-16 mx-auto mb-4 opacity-30" />
            <p>لا توجد طلبات بعد. ابدأ طلبك الأول من المتاجر!</p>
          </div>
        ) : (
          <div className="space-y-4">
            {orders.map((o) => (
              <Link key={o.id} to={`/order/${o.id}/tracking`} className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col md:flex-row md:items-center gap-4 hover:shadow-md transition">
                <div className="flex items-center gap-3 md:min-w-[220px]">
                  <img src={o.store?.image || 'https://placehold.co/100x100?text=Store'} alt={o.store?.name} className="w-14 h-14 rounded-lg object-cover bg-gray-100" />
                  <div>
                    <div className="font-bold text-gray-900">{o.store?.name || 'طلب'}</div>
                    <div className="text-xs text-gray-500">#{o.id} • {new Date(o.created_at).toLocaleDateString('ar-SA')}</div>
                  </div>
                </div>
                <div className="flex-1">
                  <div className="flex items-baseline gap-1 mb-2">
                    <span className={`inline-block px-2 py-1 rounded text-xs font-bold ${STATUS_COLORS[o.status]}`}>
                      {STATUS_LABELS[o.status]}
                    </span>
                    <span className="ml-auto font-bold text-gray-900">{o.total.toLocaleString()} ل.ل</span>
                  </div>
                  <p className="text-xs text-gray-500">
                    {o.items.length} صنف{Number(o.items.length) > 1 ? 'ات' : ''} •
                    {o.payment_method === 'cash' ? 'نقداً عند الاستلام' : 'بطاقة'}
                  </p>
                </div>
                <span className="text-xs text-toters-600 font-medium">عرض التفاصيل <span aria-hidden="true">→</span></span>
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
