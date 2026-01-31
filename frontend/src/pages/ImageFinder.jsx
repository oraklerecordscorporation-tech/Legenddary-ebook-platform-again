import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { ScrollArea } from '../components/ui/scroll-area';
import { 
  ArrowLeft, Image, Search, Download, ExternalLink, Loader2, Copy, Check
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const ImageFinder = () => {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState('');

  const searchImages = async () => {
    if (!searchQuery.trim()) {
      toast.error('Please enter a search term');
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post(`${API}/images/search`, {
        query: searchQuery,
        count: 12,
      });
      setResults(res.data);
      if (res.data.length === 0) {
        toast.info('No images found');
      }
    } catch (err) {
      toast.error('Search failed');
    } finally {
      setLoading(false);
    }
  };

  const copyUrl = async (url) => {
    try {
      await navigator.clipboard.writeText(url);
      setCopiedUrl(url);
      setTimeout(() => setCopiedUrl(''), 2000);
      toast.success('URL copied!');
    } catch (err) {
      toast.error('Failed to copy');
    }
  };

  const suggestions = [
    'book cover abstract',
    'library aesthetic',
    'writing desk',
    'vintage paper',
    'landscape scenic',
    'cityscape night',
    'nature forest',
    'ocean waves',
  ];

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#F5F5F0]">
      {/* Header */}
      <header className="border-b border-white/5">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <Link to="/dashboard" className="flex items-center gap-2 text-sm text-[#E5E5E0]/60 hover:text-[#E5E5E0] mb-4" data-testid="back-to-dashboard">
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
          <h1 className="text-2xl font-bold flex items-center gap-3" style={{ fontFamily: 'Playfair Display, serif' }}>
            <Image className="w-7 h-7 text-[#D4AF37]" />
            Image Finder
          </h1>
          <p className="text-[#E5E5E0]/60 mt-1">Find free high-quality images from Unsplash & Pexels</p>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 py-8">
        {/* Search */}
        <div className="flex gap-4 mb-6">
          <div className="relative flex-1">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#E5E5E0]/40" />
            <Input
              placeholder="Search for images..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && searchImages()}
              className="pl-12 h-14 bg-white/5 border-white/10 focus:border-[#D4AF37] rounded-xl text-lg"
              data-testid="image-search-input"
            />
          </div>
          <Button 
            onClick={searchImages} 
            disabled={loading}
            className="gold-shimmer text-[#0A0A0A] rounded-xl px-8 h-14 text-lg glow-gold"
            data-testid="search-btn"
          >
            {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : 'Search'}
          </Button>
        </div>

        {/* Suggestions */}
        <div className="flex flex-wrap gap-2 mb-8">
          <span className="text-sm text-[#E5E5E0]/40">Try:</span>
          {suggestions.map((suggestion) => (
            <button
              key={suggestion}
              onClick={() => {
                setSearchQuery(suggestion);
                setTimeout(() => searchImages(), 100);
              }}
              className="px-3 py-1 text-sm rounded-full bg-white/5 border border-white/10 hover:border-[#D4AF37]/50 hover:bg-[#D4AF37]/10 transition-colors"
              data-testid={`suggestion-${suggestion.replace(' ', '-')}`}
            >
              {suggestion}
            </button>
          ))}
        </div>

        {/* Results */}
        {results.length > 0 ? (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
            {results.map((img, i) => (
              <div
                key={i}
                className="group relative rounded-xl overflow-hidden bg-white/5 border border-white/5 hover:border-[#D4AF37]/30 transition-all"
                data-testid={`image-result-${i}`}
              >
                <div className="aspect-[4/3]">
                  <img
                    src={img.thumb_url}
                    alt={img.alt}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
                    loading="lazy"
                  />
                </div>
                
                {/* Overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                  <p className="text-sm text-white/80 truncate mb-1">{img.alt || 'Untitled'}</p>
                  <p className="text-xs text-white/50 mb-3">by {img.photographer} • {img.source}</p>
                  
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => copyUrl(img.url)}
                      className="flex-1 bg-white/10 hover:bg-white/20 backdrop-blur-sm"
                      data-testid={`copy-url-${i}`}
                    >
                      {copiedUrl === img.url ? <Check className="w-4 h-4 mr-1" /> : <Copy className="w-4 h-4 mr-1" />}
                      {copiedUrl === img.url ? 'Copied!' : 'Copy URL'}
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => window.open(img.url, '_blank')}
                      className="hover:bg-white/20"
                      data-testid={`open-url-${i}`}
                    >
                      <ExternalLink className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-20">
            <div className="w-24 h-24 mx-auto mb-6 rounded-full bg-white/5 flex items-center justify-center">
              <Image className="w-12 h-12 text-[#E5E5E0]/20" />
            </div>
            <h3 className="text-xl font-semibold mb-2" style={{ fontFamily: 'Playfair Display, serif' }}>
              {loading ? 'Searching...' : 'Search for Images'}
            </h3>
            <p className="text-[#E5E5E0]/50">
              {loading ? 'Finding the best images for you' : 'Enter a search term to find free images for your book'}
            </p>
          </div>
        )}
      </main>
    </div>
  );
};

export default ImageFinder;
