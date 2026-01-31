import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Slider } from '../components/ui/slider';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { ScrollArea } from '../components/ui/scroll-area';
import { 
  ArrowLeft, BookOpen, Type, Palette, Image, Download, 
  AlignLeft, AlignCenter, AlignRight, Loader2, Search
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const CoverDesigner = () => {
  const { bookId } = useParams();
  const navigate = useNavigate();
  const [book, setBook] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searchLoading, setSearchLoading] = useState(false);

  const [cover, setCover] = useState({
    title: '',
    subtitle: '',
    author: '',
    backgroundColor: '#0A0A0A',
    textColor: '#D4AF37',
    titleSize: 48,
    titleAlign: 'center',
    backgroundImage: '',
    overlay: 0.5,
  });

  const colorPresets = [
    { bg: '#0A0A0A', text: '#D4AF37', name: 'Obsidian Gold' },
    { bg: '#1A1A2E', text: '#E94560', name: 'Midnight Rose' },
    { bg: '#F5F5F0', text: '#2A2A2A', name: 'Classic Light' },
    { bg: '#2D3436', text: '#74B9FF', name: 'Dark Ocean' },
    { bg: '#4A4E69', text: '#F2E9E4', name: 'Purple Mist' },
    { bg: '#3D5A80', text: '#E0FBFC', name: 'Navy Frost' },
  ];

  useEffect(() => {
    fetchBook();
  }, [bookId]);

  const fetchBook = async () => {
    try {
      const res = await axios.get(`${API}/books/${bookId}`);
      setBook(res.data);
      setCover(prev => ({
        ...prev,
        title: res.data.title,
        author: 'Author Name',
      }));
    } catch (err) {
      toast.error('Book not found');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const searchImages = async () => {
    if (!searchQuery.trim()) return;
    setSearchLoading(true);
    try {
      const res = await axios.post(`${API}/images/search`, {
        query: searchQuery,
        count: 8,
      });
      setSearchResults(res.data);
    } catch (err) {
      toast.error('Image search failed');
    } finally {
      setSearchLoading(false);
    }
  };

  const saveCover = async () => {
    setSaving(true);
    try {
      // Generate cover as data URL
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      canvas.width = 600;
      canvas.height = 900;

      // Background
      ctx.fillStyle = cover.backgroundColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Background image if present
      if (cover.backgroundImage) {
        const img = new window.Image();
        img.crossOrigin = 'anonymous';
        await new Promise((resolve, reject) => {
          img.onload = resolve;
          img.onerror = reject;
          img.src = cover.backgroundImage;
        });
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        
        // Overlay
        ctx.fillStyle = `rgba(0, 0, 0, ${cover.overlay})`;
        ctx.fillRect(0, 0, canvas.width, canvas.height);
      }

      // Title
      ctx.fillStyle = cover.textColor;
      ctx.font = `bold ${cover.titleSize}px "Playfair Display", serif`;
      ctx.textAlign = cover.titleAlign;
      const titleX = cover.titleAlign === 'left' ? 40 : cover.titleAlign === 'right' ? canvas.width - 40 : canvas.width / 2;
      ctx.fillText(cover.title, titleX, 350);

      // Subtitle
      if (cover.subtitle) {
        ctx.font = `300 24px "Manrope", sans-serif`;
        ctx.fillText(cover.subtitle, titleX, 410);
      }

      // Author
      ctx.font = `500 20px "Manrope", sans-serif`;
      ctx.fillText(cover.author, titleX, canvas.height - 80);

      const coverData = canvas.toDataURL('image/jpeg', 0.9);
      
      await axios.put(`${API}/books/${bookId}`, { cover_data: coverData });
      toast.success('Cover saved!');
    } catch (err) {
      toast.error('Failed to save cover');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#D4AF37]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#F5F5F0] flex">
      {/* Sidebar - Controls */}
      <aside className="w-80 border-r border-white/5 flex flex-col">
        <div className="p-4 border-b border-white/5">
          <Link to="/dashboard" className="flex items-center gap-2 text-sm text-[#E5E5E0]/60 hover:text-[#E5E5E0] mb-4" data-testid="back-to-dashboard">
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
          <h2 className="text-lg font-semibold" style={{ fontFamily: 'Playfair Display, serif' }}>
            Cover Designer
          </h2>
        </div>

        <ScrollArea className="flex-1">
          <Tabs defaultValue="text" className="p-4">
            <TabsList className="w-full bg-white/5">
              <TabsTrigger value="text" className="flex-1 data-[state=active]:bg-[#D4AF37] data-[state=active]:text-[#0A0A0A]">
                <Type className="w-4 h-4 mr-1" />
                Text
              </TabsTrigger>
              <TabsTrigger value="colors" className="flex-1 data-[state=active]:bg-[#D4AF37] data-[state=active]:text-[#0A0A0A]">
                <Palette className="w-4 h-4 mr-1" />
                Colors
              </TabsTrigger>
              <TabsTrigger value="image" className="flex-1 data-[state=active]:bg-[#D4AF37] data-[state=active]:text-[#0A0A0A]">
                <Image className="w-4 h-4 mr-1" />
                Image
              </TabsTrigger>
            </TabsList>

            <TabsContent value="text" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Title</Label>
                <Input
                  value={cover.title}
                  onChange={(e) => setCover({ ...cover, title: e.target.value })}
                  className="bg-white/5 border-white/10 focus:border-[#D4AF37]"
                  data-testid="cover-title-input"
                />
              </div>

              <div className="space-y-2">
                <Label>Subtitle</Label>
                <Input
                  value={cover.subtitle}
                  onChange={(e) => setCover({ ...cover, subtitle: e.target.value })}
                  className="bg-white/5 border-white/10 focus:border-[#D4AF37]"
                  placeholder="Optional subtitle"
                  data-testid="cover-subtitle-input"
                />
              </div>

              <div className="space-y-2">
                <Label>Author</Label>
                <Input
                  value={cover.author}
                  onChange={(e) => setCover({ ...cover, author: e.target.value })}
                  className="bg-white/5 border-white/10 focus:border-[#D4AF37]"
                  data-testid="cover-author-input"
                />
              </div>

              <div className="space-y-2">
                <Label>Title Size: {cover.titleSize}px</Label>
                <Slider
                  value={[cover.titleSize]}
                  onValueChange={([v]) => setCover({ ...cover, titleSize: v })}
                  min={24}
                  max={72}
                  step={2}
                  className="py-2"
                  data-testid="cover-title-size-slider"
                />
              </div>

              <div className="space-y-2">
                <Label>Title Alignment</Label>
                <div className="flex gap-2">
                  {[
                    { value: 'left', icon: AlignLeft },
                    { value: 'center', icon: AlignCenter },
                    { value: 'right', icon: AlignRight },
                  ].map(({ value, icon: Icon }) => (
                    <button
                      key={value}
                      onClick={() => setCover({ ...cover, titleAlign: value })}
                      className={`flex-1 p-2 rounded-lg border transition-colors ${
                        cover.titleAlign === value
                          ? 'border-[#D4AF37] bg-[#D4AF37]/10 text-[#D4AF37]'
                          : 'border-white/10 hover:border-white/20'
                      }`}
                      data-testid={`cover-align-${value}`}
                    >
                      <Icon className="w-4 h-4 mx-auto" />
                    </button>
                  ))}
                </div>
              </div>
            </TabsContent>

            <TabsContent value="colors" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Color Presets</Label>
                <div className="grid grid-cols-2 gap-2">
                  {colorPresets.map((preset, i) => (
                    <button
                      key={i}
                      onClick={() => setCover({ ...cover, backgroundColor: preset.bg, textColor: preset.text })}
                      className="p-3 rounded-lg border border-white/10 hover:border-[#D4AF37]/50 transition-colors text-left"
                      style={{ backgroundColor: preset.bg }}
                      data-testid={`color-preset-${i}`}
                    >
                      <span className="text-xs font-medium" style={{ color: preset.text }}>{preset.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <Label>Background Color</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={cover.backgroundColor}
                    onChange={(e) => setCover({ ...cover, backgroundColor: e.target.value })}
                    className="w-12 h-10 p-1 bg-transparent border-white/10"
                    data-testid="cover-bg-color"
                  />
                  <Input
                    value={cover.backgroundColor}
                    onChange={(e) => setCover({ ...cover, backgroundColor: e.target.value })}
                    className="flex-1 bg-white/5 border-white/10 focus:border-[#D4AF37]"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Text Color</Label>
                <div className="flex gap-2">
                  <Input
                    type="color"
                    value={cover.textColor}
                    onChange={(e) => setCover({ ...cover, textColor: e.target.value })}
                    className="w-12 h-10 p-1 bg-transparent border-white/10"
                    data-testid="cover-text-color"
                  />
                  <Input
                    value={cover.textColor}
                    onChange={(e) => setCover({ ...cover, textColor: e.target.value })}
                    className="flex-1 bg-white/5 border-white/10 focus:border-[#D4AF37]"
                  />
                </div>
              </div>
            </TabsContent>

            <TabsContent value="image" className="space-y-4 mt-4">
              <div className="space-y-2">
                <Label>Search Images</Label>
                <div className="flex gap-2">
                  <Input
                    placeholder="Search Unsplash..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && searchImages()}
                    className="flex-1 bg-white/5 border-white/10 focus:border-[#D4AF37]"
                    data-testid="image-search-input"
                  />
                  <Button onClick={searchImages} disabled={searchLoading} className="gold-shimmer text-[#0A0A0A]" data-testid="image-search-btn">
                    {searchLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
                  </Button>
                </div>
              </div>

              {searchResults.length > 0 && (
                <div className="grid grid-cols-2 gap-2">
                  {searchResults.map((img, i) => (
                    <button
                      key={i}
                      onClick={() => setCover({ ...cover, backgroundImage: img.url })}
                      className={`aspect-[2/3] rounded-lg overflow-hidden border-2 transition-colors ${
                        cover.backgroundImage === img.url ? 'border-[#D4AF37]' : 'border-transparent hover:border-white/20'
                      }`}
                      data-testid={`image-result-${i}`}
                    >
                      <img src={img.thumb_url} alt={img.alt} className="w-full h-full object-cover" />
                    </button>
                  ))}
                </div>
              )}

              {cover.backgroundImage && (
                <>
                  <div className="space-y-2">
                    <Label>Overlay: {Math.round(cover.overlay * 100)}%</Label>
                    <Slider
                      value={[cover.overlay]}
                      onValueChange={([v]) => setCover({ ...cover, overlay: v })}
                      min={0}
                      max={0.9}
                      step={0.1}
                      className="py-2"
                      data-testid="cover-overlay-slider"
                    />
                  </div>

                  <Button
                    variant="outline"
                    onClick={() => setCover({ ...cover, backgroundImage: '' })}
                    className="w-full border-white/10"
                    data-testid="remove-bg-image"
                  >
                    Remove Image
                  </Button>
                </>
              )}
            </TabsContent>
          </Tabs>
        </ScrollArea>

        <div className="p-4 border-t border-white/5">
          <Button 
            onClick={saveCover} 
            disabled={saving}
            className="w-full gold-shimmer text-[#0A0A0A] glow-gold"
            data-testid="save-cover-btn"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Download className="w-4 h-4 mr-2" />}
            Save Cover
          </Button>
        </div>
      </aside>

      {/* Preview */}
      <main className="flex-1 flex items-center justify-center p-8 bg-[#1A1A1A]">
        <div
          className="w-[400px] h-[600px] rounded-lg shadow-2xl overflow-hidden relative"
          style={{ backgroundColor: cover.backgroundColor }}
          data-testid="cover-preview"
        >
          {cover.backgroundImage && (
            <>
              <img
                src={cover.backgroundImage}
                alt="Cover background"
                className="absolute inset-0 w-full h-full object-cover"
              />
              <div
                className="absolute inset-0"
                style={{ backgroundColor: `rgba(0, 0, 0, ${cover.overlay})` }}
              />
            </>
          )}

          <div className="relative z-10 h-full flex flex-col justify-center items-center px-8 text-center">
            <h1
              className="font-bold leading-tight mb-4"
              style={{
                color: cover.textColor,
                fontSize: `${cover.titleSize * 0.8}px`,
                fontFamily: 'Playfair Display, serif',
                textAlign: cover.titleAlign,
                width: '100%',
              }}
            >
              {cover.title}
            </h1>

            {cover.subtitle && (
              <p
                className="text-lg mb-4"
                style={{
                  color: cover.textColor,
                  fontFamily: 'Manrope, sans-serif',
                  opacity: 0.8,
                }}
              >
                {cover.subtitle}
              </p>
            )}

            <p
              className="absolute bottom-12 left-0 right-0 text-base"
              style={{
                color: cover.textColor,
                fontFamily: 'Manrope, sans-serif',
              }}
            >
              {cover.author}
            </p>
          </div>
        </div>
      </main>
    </div>
  );
};

export default CoverDesigner;
