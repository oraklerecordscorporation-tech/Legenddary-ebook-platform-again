import { useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { BookOpen, Eye, EyeOff, Mail, Lock, User } from 'lucide-react';
import { toast } from 'sonner';

const AuthPage = () => {
  const [searchParams] = useSearchParams();
  const [isLogin, setIsLogin] = useState(searchParams.get('mode') !== 'register');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const { login, register } = useAuth();

  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (isLogin) {
        await login(formData.email, formData.password);
        toast.success('Welcome back!');
      } else {
        await register(formData.name, formData.email, formData.password);
        toast.success('Account created successfully!');
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#F5F5F0] flex grain">
      {/* Left Panel - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-8 animate-fade-in-up">
          <Link to="/" className="flex items-center gap-2 mb-8" data-testid="auth-logo">
            <div className="w-10 h-10 rounded-lg gold-shimmer flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-[#0A0A0A]" />
            </div>
            <span className="text-2xl font-bold tracking-tight" style={{ fontFamily: 'Playfair Display, serif' }}>
              Legend<span className="gold-shimmer-text">d</span>ary
            </span>
          </Link>

          <div>
            <h1 className="text-3xl font-bold tracking-tight" style={{ fontFamily: 'Playfair Display, serif' }}>
              {isLogin ? 'Welcome Back' : 'Create Account'}
            </h1>
            <p className="mt-2 text-[#E5E5E0]/60">
              {isLogin 
                ? 'Sign in to continue your writing journey' 
                : 'Start writing your legendary story today'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="name" className="text-sm font-medium text-[#E5E5E0]/80">
                  Full Name
                </Label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#E5E5E0]/40" />
                  <Input
                    id="name"
                    type="text"
                    placeholder="Your name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="pl-10 h-12 bg-white/5 border-white/10 focus:border-[#D4AF37] focus:ring-[#D4AF37]/20 rounded-lg"
                    required={!isLogin}
                    data-testid="auth-name-input"
                  />
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="email" className="text-sm font-medium text-[#E5E5E0]/80">
                Email
              </Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#E5E5E0]/40" />
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="pl-10 h-12 bg-white/5 border-white/10 focus:border-[#D4AF37] focus:ring-[#D4AF37]/20 rounded-lg"
                  required
                  data-testid="auth-email-input"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-[#E5E5E0]/80">
                Password
              </Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#E5E5E0]/40" />
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                  className="pl-10 pr-10 h-12 bg-white/5 border-white/10 focus:border-[#D4AF37] focus:ring-[#D4AF37]/20 rounded-lg"
                  required
                  data-testid="auth-password-input"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-[#E5E5E0]/40 hover:text-[#E5E5E0]/60"
                  data-testid="auth-toggle-password"
                >
                  {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full h-12 gold-shimmer text-[#0A0A0A] hover:opacity-90 rounded-full font-semibold glow-gold transition-transform hover:scale-[1.02]"
              data-testid="auth-submit-btn"
            >
              {loading ? 'Please wait...' : (isLogin ? 'Sign In' : 'Create Account')}
            </Button>
          </form>

          <div className="text-center">
            <p className="text-sm text-[#E5E5E0]/60">
              {isLogin ? "Don't have an account?" : 'Already have an account?'}
              <button
                type="button"
                onClick={() => setIsLogin(!isLogin)}
                className="ml-1 text-[#D4AF37] hover:underline font-medium"
                data-testid="auth-toggle-mode"
              >
                {isLogin ? 'Sign up' : 'Sign in'}
              </button>
            </p>
          </div>
        </div>
      </div>

      {/* Right Panel - Image */}
      <div className="hidden lg:flex w-1/2 relative">
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1613191413904-b4386c99f47a?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjAzMzJ8MHwxfHNlYXJjaHwzfHxsdXh1cnklMjBsaWJyYXJ5JTIwYm9vayUyMGNvbGxlY3Rpb24lMjBnb2xkfGVufDB8fHx8MTc2OTg1MDg0Mnww&ixlib=rb-4.1.0&q=85"
            alt="Library"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#0A0A0A] via-[#0A0A0A]/50 to-transparent"></div>
        </div>
        
        <div className="relative z-10 p-12 flex flex-col justify-end">
          <blockquote className="max-w-md">
            <p className="text-2xl font-medium leading-relaxed mb-4" style={{ fontFamily: 'Playfair Display, serif' }}>
              "Every great book starts with a single word. Start yours today."
            </p>
            <footer className="text-sm text-[#E5E5E0]/60">
              — The Legenddary Team
            </footer>
          </blockquote>
        </div>
      </div>
    </div>
  );
};

export default AuthPage;
