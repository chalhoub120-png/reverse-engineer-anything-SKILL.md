import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Trash2, Minus, Plus, Clock, CreditCard, AlertTriangle, ChevronRight } from 'lucide-react';
import api from '../api';

export default function Cart() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, [user]);

  async function load() {
    setLoading(true);
    try {
      const r = await api.get('/cart', { params: { userId: user.id } });
      setItems(r.data.cart);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  async function updateQty(it, delta) {
    const next = Math.max(0, it.quantity + delta);
    if (next === 0) {
      await api.delete(`/cart/${it.product_id}`);
    } else {
      await api.patch(`/cart/${it.product_id}`, { quantity: next });
    }
    load();
  }

  async function remove(it) {
    await api.delete(`/cart/${it.product_id}`);
    load();
  }

  const subtotal = items.reduce((s, it) => s + Number(it.price) * it.quantity, 0);
  const deliveryFee = items.length ? 2000 : 0;
  const total = subtotal + deliveryFee;

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-64px)] p-4 flex flex-col items-center justify-center">
        <div className="skeleton h-8 w-1/3" /><div className="skeleton h-60 w-full mt-4" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <div className="min-h-[calc(100vh-64px)] flex flex-col items-center justify-center py-20 text-center">
        <AlertTriangle className="w-16 h-16 text-gray-300 mb-4" />
        <h2 className="text-lg font-bold text-gray-900">سلة التسوق فارغة</h2>
        <p className="text-gray-500 mb-6">أضف بعض الأصناف من المتاجر لتبدأ طلبك</p>
        <Link to="/" className="bg-toters-600 text-white px-6 py-2.5 rounded-xl font-medium hover:bg-toters-700 transition">
          <ChevronRight size={18} /> التوجه للمتاجر
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-64px)] bg-gray-50 p-4">
      <div className="max-w-3xl mx-auto grid lg:grid-cols-4 gap-6">
        <div className="lg:col-span-3 space-y-4">
          {items.map((it) => (
            <div key={it.id} className="bg-white rounded-xl border border-gray-200 p-4 flex gap-3 items-center">
              <img src={it.image || 'https://placehold.co/200x200?text=Item'} alt={it.name} className="w-16 h-16 rounded-lg object-cover bg-gray-100" />
              <div className="flex-1">
                <div className="flex items-baseline gap-2 mb-1">
                  <h4 className="font-bold text-gray-900 text-sm">{it.name}</h4>
                  <span className="text-sm text-gray-600">{Number(it.price).toLocaleString()} ل.ل</span>
                </div>
                <p className="text-xs text-gray-500 mb-3">{it.store_name}</p>
                <div className="flex items-center gap-2">
                  <button onClick={() => updateQty(it, -1)} className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50">
                    <Minus size={16} />
                  </button>
                  <span className="w-8 text-center text-sm font-medium">{it.quantity}</span>
                  <button onClick={() => updateQty(it, 1)} className="w-8 h-8 rounded-lg border border-gray-200 flex items-center justify-center text-gray-600 hover:bg-gray-50">
                    <Plus size={16} />
                  </button>
                  <button onClick={() => remove(it)} className="ml-2 text-red-500 hover:text-red-700">
                    <Trash2 size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="lg:col-span-1 bg-white p-6 rounded-2xl border border-gray-200 shadow-sm space-y-5">
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>المجموع الفرعي</span>
              <span className="font-medium">{subtotal.toLocaleString()} ل.ل</span>
            </div>
            <div className="flex justify-between text-sm text-gray-600">
              <span>رسوم التوصيل</span>
              <span className="font-medium">{deliveryFee.toLocaleString()} ل.ل</span>
            </div>
            <div className="flex justify-between text-base font-bold text-gray-900 border-t pt-2">
              <span>المجموع الكلي</span>
              <span>{total.toLocaleString()} ل.ل</span>
            </div>
          </div>
          <div className="p-3 rounded-lg bg-blue-50 border border-blue-100 text-xs text-blue-800 leading-relaxed">
            <Clock className="w-4 h-4 inline mr-1.5" /> الموعد المتوقع للتوصيل خلال 30-60 دقيقة حسب المتجر
          </div>
          <div className="grid grid-cols-2 gap-3">
            <button
              disabled={loading}
              onClick={() => navigate('/checkout')}
              className="bg-toters-600 text-white px-4 py-3 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-toters-700 transition disabled:opacity-70"
            >
              <CreditCard size={18} /> إتمام الطلب
            </button>
            <button
              onClick={() => navigate('/')}
              className="border border-gray-200 text-gray-700 px-4 py-3 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-gray-50 transition"
            >
                            <ChevronRight size={18} /> استمرار التسوق
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
