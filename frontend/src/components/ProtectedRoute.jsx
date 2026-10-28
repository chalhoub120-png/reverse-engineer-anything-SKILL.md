import { Navigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Loader2 } from 'lucide-react';

export function ProtectedRoute({ children, role }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return (
      <div className="flex min-h-[60vh] items-center justify-center">
        <Loader2 className="w-10 h-10 text-toters-600 animate-spin" />
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (role && user.role !== role) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center text-center p-6">
        <h2 className="text-lg font-bold text-gray-900">غير مصرح لك بالدخول لهذه الصفحة</h2>
        <p className="text-gray-500 mt-2">هذه الصفحة مخصصة لدور: {role}</p>
        <nav className="mt-6">
          <Link to={user.role === 'vendor' ? '/vendor' : user.role === 'driver' ? '/driver' : user.role === 'admin' ? '/admin' : '/'}>
            العودة للوحة الرئيسية
          </Link>
        </nav>
      </div>
    );
  }

  return children;
}
