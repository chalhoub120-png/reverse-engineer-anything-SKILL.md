import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Mail, Lock, ArrowRight } from 'lucide-react';

export default function Login() {
  const [form, setForm] = useState({ email: 'customer@test.com', password: '12345678' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await login(form);
      navigate('/');
    } catch (err) {
      setError(err.response?.data?.error || 'فشل تسجيل الدخول');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-[calc(100vh-64px)] flex items-center justify-center bg-gray-50 px-4">
      <div className="max-w-md w-full bg-white p-8 rounded-2xl shadow-sm border border-gray-200">
        <div className="flex items-center gap-2 mb-6">
          <div className="bg-toters-100 p-2 rounded-lg text-toters-700">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-shopping-cart"><path d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17"/><path d="M22 10v1.3c0 .763-.092 1.51-.272 2.228l-.302 1.207a1 1 0 0 1-.908.727H5.4a1 1 0 0 1-1-.196l-.255-1.022A3 3 0 0 1 3 11.3V10"/></svg>
          </div>
          <h1 className="text-xl font-bold text-gray-900">تسجيل الدخول</h1>
        </div>

        {error && (
          <div className="mb-6 p-3 rounded-lg bg-red-50 border border-red-100 text-red-700 text-sm">{error}</div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
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
            <p className="text-xs text-gray-500 mt-1">تجربة: customer@test.com / 12345678</p>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-toters-600 text-white px-4 py-3 rounded-lg font-medium flex items-center justify-center gap-2 hover:bg-toters-700 disabled:opacity-70 transition"
          >
            {loading ? <ArrowRight className="w-4 h-4 animate-spin" /> : <ArrowRight className="w-4 h-4" />} دخول
          </button>
        </form>

        <p className="mt-8 text-center text-sm text-gray-600">
          ليس لديك حساب؟{' '}
          <Link to="/register" className="text-toters-600 font-medium hover:underline">
            إنشاء حساب جديد
          </Link>
        </p>
      </div>
    </div>
  );
}
