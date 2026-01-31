import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { BookOpen, Sparkles, FileText, Palette, PenTool, Download, Share2, TrendingUp } from 'lucide-react';

const LandingPage = () => {
  const features = [
    { icon: BookOpen, title: 'Rich Text Editor', desc: 'Professional writing experience with multiple fonts and premium styling' },
    { icon: Sparkles, title: 'AI Writing Assistant', desc: 'Get intelligent suggestions for content, footnotes, and style improvements' },
    { icon: Palette, title: 'Cover Designer', desc: 'Create stunning book covers with customizable templates' },
    { icon: PenTool, title: 'Signature Studio', desc: 'Add authentic hand-drawn signatures to your books' },
    { icon: FileText, title: 'Multiple Formats', desc: 'Export to PDF, EPUB for all major platforms' },
    { icon: Share2, title: 'Publishing Ready', desc: 'Direct compatibility with Amazon KDP, Apple Books, and more' },
    { icon: TrendingUp, title: 'Marketing Guidance', desc: 'AI-powered strategies to promote your book effectively' },
    { icon: Download, title: 'Easy Export', desc: 'One-click export to all major eBook formats' },
  ];

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#F5F5F0] overflow-hidden grain">
      {/* Navigation */}
      <nav className="fixed top-0 left-0 right-0 z-50 glass">
        <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-24 py-4 flex items-center justify-between">
          <Link to="/" className="flex items-center gap-2" data-testid="nav-logo">
            <div className="w-10 h-10 rounded-lg gold-shimmer flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-[#0A0A0A]" />
            </div>
            <span className="text-2xl font-bold tracking-tight" style={{ fontFamily: 'Playfair Display, serif' }}>
              Legend<span className="gold-shimmer-text">d</span>ary
            </span>
          </Link>
          
          <div className="flex items-center gap-4">
            <Link to="/auth" data-testid="nav-login-btn">
              <Button variant="ghost" className="text-[#F5F5F0] hover:text-[#D4AF37] hover:bg-white/5">
                Log In
              </Button>
            </Link>
            <Link to="/auth?mode=register" data-testid="nav-signup-btn">
              <Button className="gold-shimmer text-[#0A0A0A] hover:opacity-90 rounded-full px-6 glow-gold">
                Get Started
              </Button>
            </Link>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative min-h-screen flex items-center pt-20">
        <div className="absolute inset-0 overflow-hidden">
          <div className="absolute top-1/4 -left-32 w-96 h-96 rounded-full bg-[#D4AF37]/10 blur-3xl"></div>
          <div className="absolute bottom-1/4 -right-32 w-96 h-96 rounded-full bg-[#D4AF37]/5 blur-3xl"></div>
        </div>
        
        <div className="relative max-w-7xl mx-auto px-6 md:px-12 lg:px-24 py-24">
          <div className="grid lg:grid-cols-2 gap-16 items-center">
            <div className="space-y-8 animate-fade-in-up">
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-white/5 border border-white/10 text-sm">
                <Sparkles className="w-4 h-4 text-[#D4AF37]" />
                <span>AI-Powered eBook Creation</span>
              </div>
              
              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-bold leading-tight tracking-tight" style={{ fontFamily: 'Playfair Display, serif' }}>
                Write Your
                <span className="block gold-shimmer-text">Legenddary</span>
                Story
              </h1>
              
              <p className="text-lg text-[#E5E5E0]/70 max-w-lg leading-relaxed">
                The all-in-one platform to write, design, and publish your eBook. 
                From first draft to bestseller—guided by AI every step of the way.
              </p>
              
              <div className="flex flex-wrap gap-4">
                <Link to="/auth?mode=register" data-testid="hero-cta-btn">
                  <Button className="gold-shimmer text-[#0A0A0A] hover:opacity-90 rounded-full px-8 py-6 text-lg font-semibold glow-gold-strong transition-transform hover:scale-105">
                    Start Writing Free
                  </Button>
                </Link>
                <Link to="#features" data-testid="hero-learn-more-btn">
                  <Button variant="outline" className="rounded-full px-8 py-6 text-lg border-white/20 hover:bg-white/5 hover:border-[#D4AF37]/50">
                    Learn More
                  </Button>
                </Link>
              </div>
              
              <div className="flex items-center gap-8 pt-4 text-sm text-[#E5E5E0]/60">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-green-500"></div>
                  <span>Free to start</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-[#D4AF37]"></div>
                  <span>AI-powered</span>
                </div>
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                  <span>Export anywhere</span>
                </div>
              </div>
            </div>
            
            <div className="relative animate-fade-in-up stagger-2">
              <div className="relative rounded-2xl overflow-hidden border border-white/10 glow-gold">
                <img 
                  src="https://images.unsplash.com/photo-1751200065687-a126e7c304da?crop=entropy&cs=srgb&fm=jpg&ixid=M3w4NjA3MDB8MHwxfHNlYXJjaHwyfHxhdXRob3IlMjB3cml0aW5nJTIwbWluaW1hbGlzdCUyMHdvcmtzcGFjZXxlbnwwfHx8fDE3Njk4NTA4Mzl8MA&ixlib=rb-4.1.0&q=85"
                  alt="Author workspace"
                  className="w-full h-auto object-cover opacity-80"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#0A0A0A] via-transparent to-transparent"></div>
              </div>
              
              {/* Floating cards */}
              <div className="absolute -bottom-6 -left-6 glass rounded-xl p-4 animate-fade-in-up stagger-3">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg gold-shimmer flex items-center justify-center">
                    <Sparkles className="w-5 h-5 text-[#0A0A0A]" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">AI Suggestion</p>
                    <p className="text-xs text-[#E5E5E0]/60">Ready to enhance</p>
                  </div>
                </div>
              </div>
              
              <div className="absolute -top-4 -right-4 glass rounded-xl p-4 animate-fade-in-up stagger-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-green-500/20 flex items-center justify-center">
                    <FileText className="w-5 h-5 text-green-400" />
                  </div>
                  <div>
                    <p className="text-sm font-medium">EPUB Ready</p>
                    <p className="text-xs text-[#E5E5E0]/60">Export now</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="py-32 relative">
        <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-24">
          <div className="text-center mb-16 animate-fade-in-up">
            <h2 className="text-4xl sm:text-5xl font-bold tracking-tight mb-4" style={{ fontFamily: 'Playfair Display, serif' }}>
              Everything You Need to
              <span className="gold-shimmer-text"> Publish</span>
            </h2>
            <p className="text-lg text-[#E5E5E0]/60 max-w-2xl mx-auto">
              Professional tools designed for authors who want to create legendary books
            </p>
          </div>
          
          <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, i) => (
              <div 
                key={feature.title}
                className={`group p-6 rounded-2xl bg-white/[0.02] border border-white/5 hover:border-[#D4AF37]/30 transition-all hover:-translate-y-1 animate-fade-in-up stagger-${(i % 5) + 1}`}
                data-testid={`feature-card-${i}`}
              >
                <div className="w-12 h-12 rounded-xl bg-[#D4AF37]/10 flex items-center justify-center mb-4 group-hover:bg-[#D4AF37]/20 transition-colors">
                  <feature.icon className="w-6 h-6 text-[#D4AF37]" />
                </div>
                <h3 className="text-lg font-semibold mb-2" style={{ fontFamily: 'Playfair Display, serif' }}>{feature.title}</h3>
                <p className="text-sm text-[#E5E5E0]/60 leading-relaxed">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-32 relative">
        <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-24">
          <div className="relative rounded-3xl overflow-hidden">
            <div className="absolute inset-0 gold-shimmer opacity-10"></div>
            <div className="relative p-12 md:p-20 text-center">
              <h2 className="text-4xl sm:text-5xl font-bold tracking-tight mb-6" style={{ fontFamily: 'Playfair Display, serif' }}>
                Ready to Write Your Masterpiece?
              </h2>
              <p className="text-lg text-[#E5E5E0]/70 max-w-2xl mx-auto mb-8">
                Join thousands of authors who trust Legenddary to bring their stories to life
              </p>
              <Link to="/auth?mode=register" data-testid="cta-signup-btn">
                <Button className="gold-shimmer text-[#0A0A0A] hover:opacity-90 rounded-full px-10 py-6 text-lg font-semibold glow-gold-strong transition-transform hover:scale-105">
                  Start Your Journey
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="py-12 border-t border-white/5">
        <div className="max-w-7xl mx-auto px-6 md:px-12 lg:px-24">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg gold-shimmer flex items-center justify-center">
                <BookOpen className="w-4 h-4 text-[#0A0A0A]" />
              </div>
              <span className="text-lg font-semibold" style={{ fontFamily: 'Playfair Display, serif' }}>Legenddary</span>
            </div>
            <p className="text-sm text-[#E5E5E0]/40">
              © 2025 Legenddary. All rights reserved.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default LandingPage;
