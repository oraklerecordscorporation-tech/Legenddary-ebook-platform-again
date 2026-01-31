import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import { Input } from '../components/ui/input';
import { ScrollArea } from '../components/ui/scroll-area';
import { 
  ArrowLeft, TrendingUp, Sparkles, Loader2, 
  Target, Users, Megaphone, Mail, Share2, BarChart
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const MarketingTips = () => {
  const [bookDetails, setBookDetails] = useState('');
  const [targetAudience, setTargetAudience] = useState('');
  const [aiResult, setAiResult] = useState('');
  const [loading, setLoading] = useState(false);

  const strategies = [
    {
      icon: Users,
      title: 'Build Your Author Platform',
      tips: ['Create an author website', 'Build email list', 'Start a blog', 'Engage on social media'],
    },
    {
      icon: Megaphone,
      title: 'Launch Strategy',
      tips: ['Plan pre-orders', 'Organize cover reveal', 'Create launch team', 'Schedule promotional pricing'],
    },
    {
      icon: Mail,
      title: 'Email Marketing',
      tips: ['Offer free content', 'Send regular newsletters', 'Share behind-the-scenes', 'Announce new releases'],
    },
    {
      icon: Share2,
      title: 'Social Media',
      tips: ['Share writing journey', 'Connect with readers', 'Join author communities', 'Use relevant hashtags'],
    },
    {
      icon: Target,
      title: 'Advertising',
      tips: ['Amazon Ads', 'Facebook/Instagram Ads', 'BookBub promotions', 'Newsletter swaps'],
    },
    {
      icon: BarChart,
      title: 'Track & Optimize',
      tips: ['Monitor sales data', 'Test different covers', 'A/B test descriptions', 'Analyze ad performance'],
    },
  ];

  const getMarketingPlan = async () => {
    if (!bookDetails.trim()) {
      toast.error('Please describe your book');
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post(`${API}/ai/suggest`, {
        prompt: bookDetails,
        context: targetAudience,
        type: 'marketing',
      });
      setAiResult(res.data.result);
    } catch (err) {
      toast.error('Failed to generate marketing plan');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#F5F5F0]">
      {/* Header */}
      <header className="border-b border-white/5">
        <div className="max-w-6xl mx-auto px-6 py-4">
          <Link to="/dashboard" className="flex items-center gap-2 text-sm text-[#E5E5E0]/60 hover:text-[#E5E5E0] mb-4" data-testid="back-to-dashboard">
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
          <h1 className="text-2xl font-bold flex items-center gap-3" style={{ fontFamily: 'Playfair Display, serif' }}>
            <TrendingUp className="w-7 h-7 text-[#D4AF37]" />
            Marketing Tips
          </h1>
          <p className="text-[#E5E5E0]/60 mt-1">AI-powered strategies to promote your book</p>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        {/* AI Marketing Plan */}
        <div className="glass rounded-xl p-6 mb-8" data-testid="ai-marketing">
          <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ fontFamily: 'Playfair Display, serif' }}>
            <Sparkles className="w-5 h-5 text-[#D4AF37]" />
            AI Marketing Strategist
          </h2>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Book Details</Label>
                <Textarea
                  placeholder="Describe your book, genre, themes, and unique selling points..."
                  value={bookDetails}
                  onChange={(e) => setBookDetails(e.target.value)}
                  className="bg-white/5 border-white/10 focus:border-[#D4AF37] min-h-[120px]"
                  data-testid="marketing-book-details"
                />
              </div>

              <div className="space-y-2">
                <Label>Target Audience</Label>
                <Input
                  placeholder="e.g., Young adults interested in fantasy, business professionals"
                  value={targetAudience}
                  onChange={(e) => setTargetAudience(e.target.value)}
                  className="bg-white/5 border-white/10 focus:border-[#D4AF37]"
                  data-testid="marketing-audience"
                />
              </div>

              <Button
                onClick={getMarketingPlan}
                disabled={loading}
                className="w-full gold-shimmer text-[#0A0A0A] glow-gold"
                data-testid="get-marketing-plan-btn"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Creating Plan...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Generate Marketing Plan
                  </>
                )}
              </Button>
            </div>

            <div>
              {aiResult ? (
                <div className="p-4 rounded-lg bg-white/5 border border-white/10 h-full">
                  <h4 className="text-sm font-medium text-[#D4AF37] mb-2">Your Marketing Plan</h4>
                  <ScrollArea className="h-[200px]">
                    <p className="text-sm text-[#E5E5E0]/80 whitespace-pre-wrap" data-testid="ai-marketing-result">
                      {aiResult}
                    </p>
                  </ScrollArea>
                </div>
              ) : (
                <div className="h-full flex items-center justify-center text-center p-8 rounded-lg bg-white/5 border border-dashed border-white/10">
                  <div>
                    <Sparkles className="w-12 h-12 mx-auto mb-3 text-[#D4AF37]/30" />
                    <p className="text-sm text-[#E5E5E0]/40">
                      Enter your book details to receive a personalized marketing plan
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Marketing Strategies */}
        <h2 className="text-lg font-semibold mb-4" style={{ fontFamily: 'Playfair Display, serif' }}>
          Marketing Strategies
        </h2>
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
          {strategies.map((strategy, i) => (
            <div
              key={strategy.title}
              className="glass rounded-xl p-6 hover:border-[#D4AF37]/30 transition-colors"
              data-testid={`strategy-${i}`}
            >
              <div className="w-10 h-10 rounded-lg bg-[#D4AF37]/10 flex items-center justify-center mb-4">
                <strategy.icon className="w-5 h-5 text-[#D4AF37]" />
              </div>
              <h3 className="font-semibold mb-3" style={{ fontFamily: 'Playfair Display, serif' }}>
                {strategy.title}
              </h3>
              <ul className="space-y-2">
                {strategy.tips.map((tip, j) => (
                  <li key={j} className="text-sm text-[#E5E5E0]/70 flex items-start gap-2">
                    <span className="text-[#D4AF37]">•</span>
                    {tip}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        {/* Quick Tips */}
        <div className="mt-8 glass rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4" style={{ fontFamily: 'Playfair Display, serif' }}>
            Quick Marketing Tips
          </h2>
          <div className="grid md:grid-cols-2 gap-4">
            <div className="p-4 rounded-lg bg-[#D4AF37]/5 border border-[#D4AF37]/10">
              <h4 className="font-medium text-[#D4AF37] mb-2">Do's</h4>
              <ul className="text-sm text-[#E5E5E0]/70 space-y-1">
                <li>✓ Engage authentically with readers</li>
                <li>✓ Provide value before asking for sales</li>
                <li>✓ Build relationships with other authors</li>
                <li>✓ Collect and showcase reader reviews</li>
              </ul>
            </div>
            <div className="p-4 rounded-lg bg-red-500/5 border border-red-500/10">
              <h4 className="font-medium text-red-400 mb-2">Don'ts</h4>
              <ul className="text-sm text-[#E5E5E0]/70 space-y-1">
                <li>✗ Spam potential readers with promotions</li>
                <li>✗ Buy fake reviews</li>
                <li>✗ Neglect your existing readers</li>
                <li>✗ Compare yourself to other authors</li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default MarketingTips;
