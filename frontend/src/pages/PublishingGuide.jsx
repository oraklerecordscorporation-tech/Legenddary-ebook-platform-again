import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Textarea } from '../components/ui/textarea';
import { Label } from '../components/ui/label';
import { ScrollArea } from '../components/ui/scroll-area';
import { 
  ArrowLeft, Share2, Sparkles, Loader2, ExternalLink,
  ShoppingCart, Apple, Book, Store, Globe, Package
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const PublishingGuide = () => {
  const [bookDetails, setBookDetails] = useState('');
  const [genre, setGenre] = useState('');
  const [aiResult, setAiResult] = useState('');
  const [loading, setLoading] = useState(false);

  const platforms = [
    {
      name: 'Amazon KDP',
      icon: ShoppingCart,
      color: '#FF9900',
      description: 'Largest eBook marketplace with global reach',
      formats: ['EPUB', 'PDF'],
      link: 'https://kdp.amazon.com',
    },
    {
      name: 'Apple Books',
      icon: Apple,
      color: '#999999',
      description: 'Premium platform for Apple device users',
      formats: ['EPUB'],
      link: 'https://authors.apple.com',
    },
    {
      name: 'Kobo',
      icon: Book,
      color: '#BF0A2B',
      description: 'Popular in Canada and international markets',
      formats: ['EPUB'],
      link: 'https://writinglife.kobo.com',
    },
    {
      name: 'Barnes & Noble',
      icon: Store,
      color: '#2E8B57',
      description: 'Major US book retailer with Nook platform',
      formats: ['EPUB'],
      link: 'https://press.barnesandnoble.com',
    },
    {
      name: 'Google Play Books',
      icon: Globe,
      color: '#4285F4',
      description: 'Access to Android users worldwide',
      formats: ['EPUB', 'PDF'],
      link: 'https://play.google.com/books/publish',
    },
    {
      name: 'Draft2Digital',
      icon: Package,
      color: '#6B4CE6',
      description: 'Distribute to multiple platforms at once',
      formats: ['EPUB', 'PDF'],
      link: 'https://draft2digital.com',
    },
  ];

  const getRecommendations = async () => {
    if (!bookDetails.trim()) {
      toast.error('Please describe your book');
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post(`${API}/ai/suggest`, {
        prompt: bookDetails,
        context: genre,
        type: 'publishing',
      });
      setAiResult(res.data.result);
    } catch (err) {
      toast.error('Failed to get recommendations');
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
            <Share2 className="w-7 h-7 text-[#D4AF37]" />
            Publishing Guide
          </h1>
          <p className="text-[#E5E5E0]/60 mt-1">Get recommendations for the best publishing platforms</p>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid lg:grid-cols-2 gap-8">
          {/* AI Recommendations */}
          <div className="glass rounded-xl p-6" data-testid="ai-recommendations">
            <h2 className="text-lg font-semibold mb-4 flex items-center gap-2" style={{ fontFamily: 'Playfair Display, serif' }}>
              <Sparkles className="w-5 h-5 text-[#D4AF37]" />
              AI Publishing Advisor
            </h2>

            <div className="space-y-4">
              <div className="space-y-2">
                <Label>Describe Your Book</Label>
                <Textarea
                  placeholder="A thriller novel set in 1920s New York about a detective solving a series of art heists..."
                  value={bookDetails}
                  onChange={(e) => setBookDetails(e.target.value)}
                  className="bg-white/5 border-white/10 focus:border-[#D4AF37] min-h-[120px]"
                  data-testid="book-details-input"
                />
              </div>

              <div className="space-y-2">
                <Label>Genre</Label>
                <Input
                  placeholder="e.g., Mystery, Romance, Self-Help"
                  value={genre}
                  onChange={(e) => setGenre(e.target.value)}
                  className="bg-white/5 border-white/10 focus:border-[#D4AF37]"
                  data-testid="genre-input"
                />
              </div>

              <Button
                onClick={getRecommendations}
                disabled={loading}
                className="w-full gold-shimmer text-[#0A0A0A] glow-gold"
                data-testid="get-recommendations-btn"
              >
                {loading ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Analyzing...
                  </>
                ) : (
                  <>
                    <Sparkles className="w-4 h-4 mr-2" />
                    Get Recommendations
                  </>
                )}
              </Button>

              {aiResult && (
                <div className="mt-4 p-4 rounded-lg bg-white/5 border border-white/10">
                  <h4 className="text-sm font-medium text-[#D4AF37] mb-2">AI Recommendations</h4>
                  <ScrollArea className="h-[200px]">
                    <p className="text-sm text-[#E5E5E0]/80 whitespace-pre-wrap" data-testid="ai-publishing-result">
                      {aiResult}
                    </p>
                  </ScrollArea>
                </div>
              )}
            </div>
          </div>

          {/* Platforms */}
          <div>
            <h2 className="text-lg font-semibold mb-4" style={{ fontFamily: 'Playfair Display, serif' }}>
              Publishing Platforms
            </h2>

            <div className="space-y-4">
              {platforms.map((platform) => (
                <div
                  key={platform.name}
                  className="glass rounded-xl p-4 hover:border-[#D4AF37]/30 transition-colors"
                  data-testid={`platform-${platform.name.toLowerCase().replace(' ', '-')}`}
                >
                  <div className="flex items-start gap-4">
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
                      style={{ backgroundColor: `${platform.color}20` }}
                    >
                      <platform.icon className="w-5 h-5" style={{ color: platform.color }} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold">{platform.name}</h3>
                        <a
                          href={platform.link}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[#D4AF37] hover:text-[#D4AF37]/80"
                          data-testid={`visit-${platform.name.toLowerCase().replace(' ', '-')}`}
                        >
                          <ExternalLink className="w-4 h-4" />
                        </a>
                      </div>
                      <p className="text-sm text-[#E5E5E0]/60 mt-1">{platform.description}</p>
                      <div className="flex gap-1 mt-2">
                        {platform.formats.map((format) => (
                          <span
                            key={format}
                            className="px-2 py-0.5 text-xs rounded bg-white/10"
                          >
                            {format}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Tips Section */}
        <div className="mt-8 glass rounded-xl p-6">
          <h2 className="text-lg font-semibold mb-4" style={{ fontFamily: 'Playfair Display, serif' }}>
            Publishing Tips
          </h2>
          <div className="grid md:grid-cols-3 gap-6">
            <div className="p-4 rounded-lg bg-white/5">
              <h3 className="font-medium mb-2 text-[#D4AF37]">Before Publishing</h3>
              <ul className="text-sm text-[#E5E5E0]/70 space-y-1">
                <li>• Hire a professional editor</li>
                <li>• Get beta readers feedback</li>
                <li>• Design an eye-catching cover</li>
                <li>• Write a compelling description</li>
              </ul>
            </div>
            <div className="p-4 rounded-lg bg-white/5">
              <h3 className="font-medium mb-2 text-[#D4AF37]">Pricing Strategy</h3>
              <ul className="text-sm text-[#E5E5E0]/70 space-y-1">
                <li>• Research competitor prices</li>
                <li>• Consider launch promotions</li>
                <li>• Factor in platform fees</li>
                <li>• Test different price points</li>
              </ul>
            </div>
            <div className="p-4 rounded-lg bg-white/5">
              <h3 className="font-medium mb-2 text-[#D4AF37]">After Publishing</h3>
              <ul className="text-sm text-[#E5E5E0]/70 space-y-1">
                <li>• Request reviews from readers</li>
                <li>• Monitor sales analytics</li>
                <li>• Engage with your audience</li>
                <li>• Plan your next release</li>
              </ul>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default PublishingGuide;
