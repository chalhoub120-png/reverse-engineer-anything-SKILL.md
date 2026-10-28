import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ShoppingCart, ChevronRight, Minus, Plus, Clock, MapPin, AlertCircle } from 'lucide-react';
import api from '../api';

export default function StoreDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [store, setStore] = useState(null);
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addedQty, setAddedQty] = useState({});
  const [toast, setToast] = useState(null);

  useEffect(() => {
    load();
  }, [id]);

  async function load() {
    setLoading(true);
    try {
      const r = await api.get(`/stores/${id}`);
      setStore(r.data.store);
      setProducts(r.data.products);
      if (user) {
        const cr = await api.get('/cart', { params: { userId: user.id } });
        const map = {};
        for (const it of cr.data.cart) map[it.product_id] = it.quantity;
        setAddedQty(map);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  function addToCart(product) {
    if (!user) {
      navigate('/login');
      return;
    }
    setAddedQty((prev) => ({ ...prev, [product.id]: (prev[product.id] || 0) + 1 }));
    api.post('/cart', { productId: product.id, quantity: 1 }).catch((err) => {
      console.error(err);
      setAddedQty((prev) => ({ ...prev, [product.id]: Math.max(0, (prev[product.id] || 1) - 1) }));
    });
    setToast(product.name);
    setTimeout(() => setToast(null), 2000);
  }

  function changeQty(product, delta) {
    if (!user) return;
    const next = Math.max(0, (addedQty[product.id] || 0) + delta);
    setAddedQty((prev) => ({ ...prev, [product.id]: next }));
    if (next === 0) {
      api.delete(`/cart/${product.id}`);
    } else {
      api.patch(`/cart/${product.id}`, { quantity: next });
    }
  }

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-64px)] p-4 flex flex-col items-center justify-center">
        <div className="skeleton h-10 w-1/3" /><div className="skeleton h-60 w-full mt-4" />
      </div>
    );
  }
  if (!store) {
    return <div className="min-h-[calc(100vh-64px)] p-4 text-center text-gray-500">المتجر غير موجود</div>;
  }

  return (
    <div className="min-h-[calc(100vh-64px)] bg-gray-50 p-4">
      {toast && (
        <div className="fixed top-6 left-4 right-4 md:left-auto md:right-4 z-50 flex items-center gap-3 px-4 py-3 rounded-2xl bg-white border border-toters-100 shadow-lg">
          <ShoppingCart className="w-5 h-5 text-toters-600" />
          <div className="text-sm font-medium text-gray-900">تمت الإضافة</div>
          <div className="text-xs text-toters-600 font-medium">{toast}</div>
        </div>
      )}

      <div className="max-w-5xl mx-auto">
        <Link to="/" className="inline-flex items-center gap-2 text-sm text-gray-600 mb-5 hover:underline">
          <ChevronRight size={16} /> العودة للرئيسية
        </Link>

        <div className="grid md:grid-cols-2 gap-6">
          <div className="relative rounded-2xl overflow-hidden border border-gray-200 bg-white">
            <img src={store.image || 'https://placehold.co/600x400?text=Store'} alt={store.name} className="w-full h-56 object-cover" />
            <div className="absolute right-4 bottom-4 flex items-center gap-2 bg-black/60 px-3 py-1.5 rounded-lg text-white">
              <span className="text-xs font-bold">مفتوح</span>
              <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse" />
            </div>
          </div>

          <div className="flex flex-col gap-3">
            <div className="flex items-baseline gap-2">
              <h1 className="text-2xl font-bold text-gray-900">{store.name}</h1>
              <span className="text-toters-600 font-bold text-sm">{'★'} {store.rating || 5}</span>
            </div>
            <p className="text-gray-500 text-sm">{store.description || ''}</p>
            <div className="flex items-center gap-3 text-sm text-gray-600 mb-1">
              <Clock className="w-4 h-4" />
              <span>التوصيل: {store.delivery_time || '40-60 دقيقة'}</span>
            </div>
            <div className="flex items-center gap-3 text-sm text-gray-600">
              <MapPin className="w-4 h-4" />
              <span>رسوم التوصيل: {Number(store.delivery_fee || 0).toLocaleString()} ل.ل</span>
            </div>
          </div>
        </div>

        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900">القائمة ({products.length})</h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {products.map((p) => (
              <ProductCard key={p.id} product={p} addedQty={addedQty[p.id] || 0} onAdd={() => addToCart(p)} onChange={(q) => changeQty(p, q)} />
            ))}
          </div>
          {products.length === 0 && (
            <div className="text-center py-12 text-gray-500">
              <AlertCircle className="w-10 h-10 mx-auto mb-3 text-gray-300" />
              <p>لا توجد منتجات متاحة حالياً</p>
            </div>
          )}
        </div>

        <div className="mt-10 pt-6 border-t border-gray-200 text-sm text-gray-500">
          الأسعار تشمل الضرائب. يتم الدفع عند الاستلام (نقداً) أو via بطاقة عند الدفع.
        </div>
      </div>
    </div>
  );
}

function ProductCard({ product, addedQty, onAdd, onChange }) {
  return (
    <div className="bg-white rounded-xl border border-gray-200 p-4 flex flex-col">
      <div className="h-32 rounded-lg overflow-center relative mb-3">
        <img src={product.image || 'https://placehold.co/400x400?text=Product'} alt={product.name} className="w-full h-full object-cover" />
      </div>
      <h3 className="font-bold text-gray-900 text-sm mb-1">{product.name}</h3>
      <p className="text-xs text-gray-500 mb-2 line-clamp-2">{product.description || ''}</p>
      <div className="mt-auto pt-2 border-t border-gray-100 flex items-baseline gap-2">
        <span className="font-bold text-gray-900">{Number(product.price).toLocaleString()} ل.ل</span>
      </div>
      <div className="mt-3 flex items-center justify-between">
        <div className="flex items-center gap-2 border border-gray-200 rounded-lg overflow-hidden">
          <button
            onClick={() => onChange(-1)}
            disabled={addedQty === 0}
            className="w-8 h-8 flex items-center justify-center bg-gray-50 hover:bg-gray-100 text-gray-600 disabled:opacity-50"
          >
            <Minus size={14} />
          </button>
          <span className="w-8 text-center text-sm font-medium text-gray-900">{addedQty}</span>
          <button
            onClick={onAdd}
            className="w-8 h-8 flex items-center justify-center bg-toters-600 text-white"
          >
            <Plus size={14} />
          </button>
        </div>
        {addedQty > 0 && (
          <span className="text-xs text-toters-600 font-medium">
            {Number(addedQty * product.price).toLocaleString()} ل.ل
          </span>
        )}
      </div>
    </div>
  );
}
