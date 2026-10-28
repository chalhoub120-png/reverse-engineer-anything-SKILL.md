import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Truck, CheckCircle, Clock, Phone, MapPin, ShoppingBag, Loader2, AlertCircle } from 'lucide-react';
import api from '../api';

const STEPS = [
  { key: 'pending', label: 'استلام الطلب', icon: <CheckCircle size={16} className="text-toters-600" /> },
  { key: 'confirmed', label: 'تأكيد المتجر', icon: <CheckCircle size={16} className="text-toters-600" /> },
  { key: 'preparing', label: 'جارٍ التحضير', icon: <Clock size={16} className="text-amber-600" /> },
  { key: 'ready', label: 'جاهز للتسليم', icon: <ShoppingBag size={16} className="text-blue-600" /> },
  { key: 'out_for_delivery', label: 'في الطريق', icon: <Truck size={16} className="text-indigo-600" /> },
  { key: 'delivered', label: 'تم التوصيل', icon: <CheckCircle size={16} className="text-green-600" /> },
];

const STEP_LABELS = {
  pending: 'قيد الانتظار',
  confirmed: 'مؤكد',
  preparing: 'قيد التحضير',
  ready: 'جاهز للتسليم',
  out_for_delivery: 'في الطريق',
  delivered: 'تم التوصيل',
  cancelled: 'ملغي',
};

export default function OrderTracking() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, [id]);

  async function load() {
    setLoading(true);
    try {
      const r = await api.get(`/orders/${id}`);
      setOrder(r.data.order);
    } catch (err) {
      navigate('/my-orders');
    } finally {
      setLoading(false);
    }
  }

  const currentIndex = STEPS.findIndex((s) => s.key === order?.status);
  const completed = currentIndex >= 0 ? currentIndex + 1 : 0;

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-64px)] p-4 flex flex-col items-center justify-center">
        <Loader2 className="w-10 h-10 text-toters-600 animate-spin mb-3" />
        <p className="text-gray-500">جاري تحميل الطلب...</p>
      </div>
    );
  }
  if (!order) return <div className="min-h-[calc(100vh-64px)] p-4 text-center">الطلب غير موجود</div>;

  return (
    <div className="min-h-[calc(100vh-64px)] bg-gray-50 p-4">
      <div className="max-w-3xl mx-auto">
        <div className="flex items-center gap-3 mb-6">
          <span className="text-sm font-medium text-gray-600">طلب رقم</span>
          <span className="text-lg font-bold text-gray-900">#{order.id}</span>
          <span className="ml-auto px-3 py-1 rounded-full text-xs font-bold bg-gray-100 text-gray-700">
            {STEP_LABELS[order.status]}
          </span>
        </div>

        {/* Timeline */}
        <div className="relative mb-10">
          <div className="absolute left-10 top-8 bottom-8 w-0.5 bg-gray-200" />
          {STEPS.map((step, i) => {
            const done = i < completed;
            const active = i === completed - 1 && completed > 0;
            return (
              <div key={step.key} className="flex items-start gap-3 mb-8 last:mb-0 relative z-10">
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 border-2 ${
                  done ? 'bg-green-600 border-green-600 text-white' : active ? 'bg-toters-600 border-toters-600 text-white' : 'bg-white border-gray-300 text-gray-400'
                }`}>
                  {done || active ? step.icon : <div className="w-4 h-4" />}
                </div>
                <div>
                  <h4 className={`font-bold text-sm ${done || active ? 'text-gray-900' : 'text-gray-400'}`}>{step.label}</h4>
                  <p className="text-xs text-gray-500 mt-0.5">
                    {done ? (order.history?.find((h) => h.status === step.key)?.note || '') : 'لا يزال في انتظار'}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        {/* Order card */}
        <div className="bg-white rounded-2xl border border-gray-200 p-6 shadow-sm">
          <div className="flex flex-col md:flex-row md:items-center gap-4 mb-6 border-b border-gray-100 pb-4">
            <div className="flex items-center gap-3">
              <img src={order.store?.image || 'https://placehold.co/120x120?text=Store'} alt={order.store?.name} className="w-16 h-16 rounded-lg object-cover bg-gray-100" />
              <div>
                <h3 className="font-bold text-gray-900">{order.store?.name || 'المتجر'}</h3>
                <p className="text-xs text-gray-500">{
                  order.driver ? `السائق: ${order.driver.name}` : 'لم يتم تعيين سائق بعد'
                }</p>
              </div>
            </div>
            <div className="ml-auto text-right">
              <div className="text-lg font-bold text-gray-900">{order.total.toLocaleString()} ل.ل</div>
              <div className="text-xs text-gray-500">{order.payment_method === 'cash' ? 'الدفع: نقداً عند الاستلام' : 'الدفع: بطاقة بنكية'}</div>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
            <InfoRow label="العنوان" value={order.address} icon={<MapPin size={16} className="text-gray-400" />} />
            <InfoRow label="الهاتف" value={order.phone} icon={<Phone size={16} className="text-gray-400" />} />
          </div>

          <div className="mb-6">
            <h4 className="text-sm font-bold text-gray-700 mb-3">أصناف الطلب</h4>
            <div className="space-y-3">
              {order.items.map((it) => (
                <div key={it.id} className="flex items-center gap-3 border-b border-gray-50 pb-3 last:border-b-0 last:pb-0">
                  <span className="w-6 text-center text-xs text-gray-400">{it.quantity}×</span>
                  <span className="text-sm text-gray-800">{it.name}</span>
                  <span className="ml-auto text-sm font-medium text-gray-600">{Number(it.price * it.quantity).toLocaleString()} ل.ل</span>
                </div>
              ))}
            </div>
          </div>

          {order.notes && (
            <div className="p-3 rounded-lg bg-amber-50 border border-amber-100 text-xs text-amber-800">
              <span className="font-bold">ملاحظة الزبون:</span> {order.notes}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function InfoRow({ label, value, icon }) {
  return (
    <div className="flex items-center gap-2 text-sm">
      {icon}
      <span className="text-gray-500 font-medium">{label}:</span>
      <span className="ml-1 text-gray-800">{value}</span>
    </div>
  );
}
