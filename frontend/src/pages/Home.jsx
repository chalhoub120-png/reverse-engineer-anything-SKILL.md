import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Search, ChevronRight, Clock, MapPin, Store } from 'lucide-react';
import api from '../api';

const STARS = '★★★★★';

export default function Home() {
  const [stores, setStores] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState('');
  const [cat, setCat] = useState('');

  useEffect(() => {
    load();
  }, [query, cat]);

  async function load() {
    setLoading(true);
    try {
      const [sRes, cRes] = await Promise.all([
        api.get('/stores', { params: { category: cat || undefined, q: query || undefined } }),
        api.get('/categories'),
      ]);
      setStores(sRes.data.stores);
      setCategories(cRes.data.categories);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
    return (
      <div className="min-h-[calc(100vh-64px)] p-4">
        <div className="flex flex-col gap-6">
          <div className="skeleton h-12 w-3/4" />
          {[1, 2, 3, 4, 5, 6].map((i) => (
            <div key={i} className="skeleton h-64 w-full" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[calc(100vh-64px)] bg-gray-50 py-6 px-4">
      <section className="mb-8">
        <div className="flex flex-col md:flex-row md:items-end gap-4 mb-4">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input
              type="text"
              className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-xl focus:ring-2 focus:ring-toters-500 focus:border-toters-500 outline-none transition"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="ابحث عن متجر أو منتج..."
            />
          </div>
          <button
            onClick={() => setCat('')}
            className={`px-5 py-2.5 rounded-xl font-medium transition ${!cat ? 'bg-toters-600 text-white' : 'bg-white text-gray-700 border border-gray-300'}`}
          >
            الكل
          </button>
        </div>
        <div className="flex flex-wrap gap-2">
          {categories.map((c) => (
            <button
              key={c.id}
              onClick={() => setCat(c.name)}
              className={`px-4 py-2 rounded-xl text-sm font-medium border transition ${cat === c.name ? 'bg-toters-600 border-toters-600 text-white' : 'bg-white border-gray-300 text-gray-700 hover:border-toters-300'}`}
            >
              {c.name}
            </button>
          ))}
        </div>
      </section>

      <section className="mb-10">
        <h2 className="text-lg font-bold text-gray-900 mb-4">المتاجر القريبة منك</h2>
        {stores.length === 0 ? (
          <p className="text-gray-500 text-center py-10">لا توجد متاجر مطابقة للبحث</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {stores.map((s) => (
              <StoreCard key={s.id} store={s} />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function StoreCard({ store }) {
  return (
    <Link to={`/store/${store.id}`} className="block bg-white rounded-2xl border border-gray-200 overflow-hidden hover:shadow-lg transition">
      <div className="relative h-44">
        <img src={store.image || 'https://placehold.co/600x400?text=Store'} alt={store.name} className="w-full h-full object-cover" />
        {store.category && (
          <span className="absolute left-3 top-3 px-2 py-1 rounded-full bg-white/90 backdrop-blur text-xs font-bold text-gray-700 border border-gray-200">
            {store.category}
          </span>
        )}
        <span className="absolute right-3 top-3 px-2 py-1 rounded-full bg-green-100 text-green-700 text-xs font-bold">
          متاح
        </span>
      </div>
      <div className="p-4">
        <div className="flex items-baseline gap-2 mb-1">
          <h3 className="font-bold text-gray-900 text-lg">{store.name}</h3>
          <span className="text-toters-600 font-bold text-xs">{'★'} {store.rating || 5}</span>
        </div>
        <p className="text-sm text-gray-500 mb-3 line-clamp-2">{store.description || ''}</p>
        <div className="flex flex-wrap items-center gap-2 text-sm text-gray-600">
          <Clock className="w-4 h-4" />
          <span>التوصيل: {store.delivery_time || '40-60 دقيقة'}</span>
          <MapPin className="w-4 h-4 ml-3" />
          <span>رسوم التوصيل: {Number(store.delivery_fee || 0).toLocaleString()} ل.ل</span>
        </div>
        <div className="mt-4 pt-3 border-t border-gray-100">
          <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-toters-50 text-toters-700 text-sm font-medium">
            <ChevronRight size={14} /> عرض القائمة
          </span>
        </div>
      </div>
    </Link>
  );
}
