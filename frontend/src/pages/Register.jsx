import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Mail, Lock, User, MapPin, ArrowRight } from 'lucide-react';

const ROLES = [
  { value: 'customer', label: 'زبون (طلب طعام/منتجات)' },
  { value: 'vendor', label: 'صاحب متجر/مطعم' },
  { value: 'driver', label: 'سائق توصيل' },
];

export default function Register() {
  const [form, setForm] = useState({
    name: '',
    email: '',
    password: '',
    role: 'customer',
    phone: '',
    address: '',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { register } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await register(form);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'فشل إنشاء الحساب');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-sm border border-gray-200">
        <div className="flex items-center gap-2 mb-6">
          <div className="bg-toters-100 p-2 rounded-lg text-toters-700">
            <User className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold text-gray-900">إنشاء حساب جديد</h1>
        </div>

        {error && (
          <div className="mb-6 p-3 rounded-lg bg-red-50 border border-red-100 text-red-700 text-sm">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">الاسم الكامل</label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-toters-500 focus:border-toters-500 outline-none transition"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="أحمد السيد"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">البريد الإلكتروني</label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="email"
                className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-toters-500 focus:border-toters-500 outline-none transition"
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
                placeholder="example@mail.com"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">كلمة المرور</label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
              <input
                type="password"
                className="w-full pl-9 pr-4 py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-toters-500 focus:border-toters-500 outline-none transition"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">نوع الحساب</label>
            <select
              className="w-full py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-toters-500 focus:border-toters-500 outline-none transition bg-white"
              value={form.role}
              onChange={(e) => setForm({ ...form, role: e.target.value })}
            >
              {ROLES.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">رقم الهاتف</label>
            <input
              className="w-full py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-toters-500 focus:border-toters-500 outline-none transition"
              value={form.phone}
              onChange={(e) => setForm({ ...form, phone: e.target.value })}
              placeholder="+961 70 123 456"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">العنوان للتوصيل</label>
            <input
              className="w-full py-2.5 border border-gray-300 rounded-lg focus:ring-2 focus:ring-toters-500 focus:border-toters-500 outline-none transition"
              value={form.address}
              onChange={(e) => setForm({ ...form, address: e.target.value })}
              placeholder="بيروت، المنطقة،街名، رقم البناء"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-toters-600 text-white px-4 py-3 rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-toters-700 disabled:opacity-70 transition"
          >
            {loading ? <ArrowRight className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />} إنشاء الحساب
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-gray-600">
          لديك حساب بالفعل؟{' '}
          <Link to="/login" className="text-toters-600 font-medium hover:underline">
            تسجيل الدخول
          </Link>
        </p>
      </div>
    </div>
  );
}
