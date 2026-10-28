import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { MapPin, Phone, CreditCard, Banknote, ChevronRight, Loader2, CheckCircle } from 'lucide-react';
import api from '../api';

export default function Checkout() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ address: user?.address || '', phone: user?.phone || '', paymentMethod: 'cash', notes: '' });
  const [items, setItems] = useState([]);
  const [subtotal, setSubtotal] = useState(0);
  const [loading, setLoading] = useState(false);
  const [placed, setPlaced] = useState(null);

  useEffect(() => {
    loadCart();
  }, [user]);

  async function loadCart() {
    try {
      const r = await api.get('/cart', { params: { userId: user.id } });
      const cart = r.data.cart;
      setItems(cart);
      setSubtotal(cart.reduce((s, it) => s + Number(it.price) * it.quantity, 0));
    } catch (err) {
      console.error(err);
    }
  }

  const deliveryFee = 2000;
  const total = subtotal + deliveryFee;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const r = await api.post('/orders', {
        storeId: items[0]?.store_id,
        address: form.address,
        phone: form.phone,
        paymentMethod: form.paymentMethod,
        notes: form.notes,
        items: items.map((it) => ({ productId: it.product_id, quantity: it.quantity })),
      });
      setPlaced(r.data.order);
      navigate(`/order/${r.data.order.id}/tracking`);
    } catch (err) {
      alert(err.response?.data?.error || 'فشل إنشاء الطلب');
    } finally {
      setLoading(false);
    }
  };

  if (placed) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex flex-col items-center justify-center py-20 text-center">
        <div className="w-16 h-16 rounded-full bg-green-100 flex items-center justify-center text-green-600 mb-6">
          <CheckCircle size={32} />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">تم إنشاء الطلب بنجاح ✅</h2>
        <p className="text-gray-600 mb-6">رقم طلبك: <span className="font-bold text-toters-600">#{placed.id}</span></p>
        <p className="text-sm text-gray-500 mb-8">المجموع: {placed.total.toLocaleString()} ل.ل — الدفع: {form.paymentMethod === 'cash' ? 'نقداً عند الاستلام' : 'بطاقة'}</p>
        <button onClick={() => navigate('/my-orders')} className="bg-toters-600 text-white px-6 py-2.5 rounded-xl font-medium hover:bg-toters-700 transition">
          عرض تفاصيل الطلب
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-64px)] bg-gray-50 p-4">
      <div className="max-w-3xl mx-auto grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-5">
          <h2 className="text-lg font-bold text-gray-900">بيانات التوصيل</h2>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">العنوان</label>
                <input
                  className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-toters-500 focus:border-toters-500 outline-none transition"
                  value={form.address}
                  onChange={(e) => setForm({ ...form, address: e.target.value })}
                  placeholder="بيروت، المنطقة،街名، رقم البناء"
                />
                <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">رقم الهاتف</label>
                <input
                  type="tel"
                  className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-toters-500 focus:border-toters-500 outline-none transition"
                  value={form.phone}
                  onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  placeholder="+961 70 123 456"
                />
                <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">ملاحظات للطلب (اختياري)</label>
              <textarea
                rows={3}
                className="w-full pl-4 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-toters-500 focus:border-toters-500 outline-none transition"
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                placeholder="مثل: من دون بصل، 부탁 ترك الطلب عند الباب"
              />
            </div>
            <div className="space-y-3">
              <label className="block text-sm font-medium text-gray-700">طريقة الدفع</label>
              <div className="grid grid-cols-2 gap-3">
                {[['cash', 'نقداً عند الاستلام', Banknote], ['card', 'بطاقة بنكية', CreditCard]].map(([value, label, Icon]) => (
                  <label key={value} className="flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition hover:bg-gray-50">
                    <input type="radio" name="paymentMethod" value={value} checked={form.paymentMethod === value} onChange={(e) => setForm({ ...form, paymentMethod: e.target.value })} className="w-4 h-4 text-toters-600" />
                    <div className="flex flex-col">
                      <span className="text-sm font-medium text-gray-800">{label}</span>
                      <span className="text-xs text-gray-500">{value === 'cash' ? 'تدفع عند استلام الطلب' : 'يتم الدفع إلكترونياً'}</span>
                    </div>
                    <div className={`ml-auto w-5 h-5 rounded-full border-2 ${form.paymentMethod === value ? 'border-toters-600 bg-toters-600' : 'border-gray-300'}`} />
                  </label>
                ))}
              </div>
            </div>
            <button type="submit" disabled={loading} className="w-full bg-toters-600 text-white px-4 py-3.5 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-toters-700 disabled:opacity-70 transition">
              {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ChevronRight size={20} />} تأكيد الطلب
            </button>
          </form>
        </div>

        <div className="lg:col-span-1 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm sticky top-24 space-y-5">
          <h3 className="text-sm font-bold text-gray-700 uppercase tracking-wider">ملخص الطلب</h3>
          {items.map((it) => (
            <div key={it.id} className="flex items-start gap-3 pb-3 border-b border-gray-50 last:border-b-0 last:pb-0">
              <img src={it.image || 'https://placehold.co/120x120?text=Item'} alt={it.name} className="w-14 h-14 rounded-lg object-cover bg-gray-100 flex-shrink-0" />
              <div className="flex-1">
                <h4 className="text-sm font-bold text-gray-900">{it.name}</h4>
                <p className="text-xs text-gray-500">×{it.quantity}</p>
              </div>
              <span className="text-sm font-medium text-gray-800">{Number(it.price * it.quantity).toLocaleString()} ل.ل</span>
            </div>
          ))}
          <div className="space-y-2 pt-3 border-t border-gray-100">
            <div className="flex justify-between text-sm text-gray-600"><span>المجموع الفرعي</span><span>{subtotal.toLocaleString()} ل.ل</span></div>
            <div className="flex justify-between text-sm text-gray-600"><span>رسوم التوصيل</span><span>{deliveryFee.toLocaleString()} ل.ل</span></div>
            <div className="flex justify-between text-base font-bold text-gray-900 border-t pt-2"><span>المجموع الكلي</span><span>{total.toLocaleString()} ل.ل</span></div>
          </div>
        </div>
      </div>
    </div>
  );
}
