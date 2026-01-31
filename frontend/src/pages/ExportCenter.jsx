import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { ScrollArea } from '../components/ui/scroll-area';
import { 
  ArrowLeft, Download, FileText, BookOpen, Loader2, CheckCircle2
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const ExportCenter = () => {
  const { bookId } = useParams();
  const navigate = useNavigate();
  const [book, setBook] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exporting, setExporting] = useState(null);

  useEffect(() => {
    fetchData();
  }, [bookId]);

  const fetchData = async () => {
    try {
      const [bookRes, chaptersRes] = await Promise.all([
        axios.get(`${API}/books/${bookId}`),
        axios.get(`${API}/books/${bookId}/chapters`),
      ]);
      setBook(bookRes.data);
      setChapters(chaptersRes.data);
    } catch (err) {
      toast.error('Failed to load book');
      navigate('/dashboard');
    } finally {
      setLoading(false);
    }
  };

  const exportBook = async (format) => {
    setExporting(format);
    try {
      const res = await axios.post(`${API}/export`, {
        book_id: bookId,
        format,
      });

      // Download file
      const link = document.createElement('a');
      link.href = `data:${res.data.content_type};base64,${res.data.data}`;
      link.download = res.data.filename;
      link.click();

      toast.success(`${format.toUpperCase()} exported successfully!`);
    } catch (err) {
      toast.error(`Failed to export ${format.toUpperCase()}`);
    } finally {
      setExporting(null);
    }
  };

  const formats = [
    {
      id: 'pdf',
      name: 'PDF',
      description: 'Universal format, great for printing and sharing',
      icon: FileText,
      color: '#E74C3C',
      platforms: ['Print-on-demand', 'Direct sales', 'Review copies'],
    },
    {
      id: 'epub',
      name: 'EPUB',
      description: 'Standard eBook format for most platforms',
      icon: BookOpen,
      color: '#3498DB',
      platforms: ['Apple Books', 'Kobo', 'Barnes & Noble', 'Google Play'],
    },
  ];

  if (loading) {
    return (
      <div className="min-h-screen bg-[#0A0A0A] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#D4AF37]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#F5F5F0]">
      {/* Header */}
      <header className="border-b border-white/5">
        <div className="max-w-5xl mx-auto px-6 py-4">
          <Link to="/dashboard" className="flex items-center gap-2 text-sm text-[#E5E5E0]/60 hover:text-[#E5E5E0] mb-4" data-testid="back-to-dashboard">
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
          <h1 className="text-2xl font-bold flex items-center gap-3" style={{ fontFamily: 'Playfair Display, serif' }}>
            <Download className="w-7 h-7 text-[#D4AF37]" />
            Export Center
          </h1>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-8">
        {/* Book Info */}
        <div className="glass rounded-xl p-6 mb-8" data-testid="book-info">
          <div className="flex items-start gap-6">
            <div className="w-20 h-28 rounded-lg overflow-hidden bg-gradient-to-br from-[#D4AF37]/20 to-[#D4AF37]/5 flex items-center justify-center">
              {book?.cover_data ? (
                <img src={book.cover_data} alt={book.title} className="w-full h-full object-cover" />
              ) : (
                <BookOpen className="w-8 h-8 text-[#D4AF37]/40" />
              )}
            </div>
            <div className="flex-1">
              <h2 className="text-xl font-semibold" style={{ fontFamily: 'Playfair Display, serif' }}>{book?.title}</h2>
              <p className="text-[#E5E5E0]/60 mt-1">{book?.description || 'No description'}</p>
              <div className="flex items-center gap-4 mt-3 text-sm text-[#E5E5E0]/40">
                <span>{chapters.length} chapters</span>
                <span>•</span>
                <span>{book?.word_count.toLocaleString()} words</span>
              </div>
            </div>
          </div>
        </div>

        {/* Chapters Preview */}
        <div className="glass rounded-xl p-6 mb-8">
          <h3 className="text-lg font-semibold mb-4" style={{ fontFamily: 'Playfair Display, serif' }}>
            Contents Preview
          </h3>
          <ScrollArea className="h-48">
            {chapters.length === 0 ? (
              <p className="text-[#E5E5E0]/40 text-center py-8">No chapters yet</p>
            ) : (
              <div className="space-y-2">
                {chapters.map((chapter, i) => (
                  <div
                    key={chapter.id}
                    className="flex items-center gap-3 px-3 py-2 rounded-lg bg-white/5"
                    data-testid={`preview-chapter-${i}`}
                  >
                    <span className="text-xs text-[#E5E5E0]/40 w-6">{i + 1}.</span>
                    <span className="flex-1 truncate">{chapter.title}</span>
                    <span className="text-xs text-[#E5E5E0]/40">{chapter.word_count} words</span>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Export Formats */}
        <h3 className="text-lg font-semibold mb-4" style={{ fontFamily: 'Playfair Display, serif' }}>
          Choose Export Format
        </h3>
        <div className="grid md:grid-cols-2 gap-6">
          {formats.map((format) => (
            <div
              key={format.id}
              className="glass rounded-xl p-6 hover:border-[#D4AF37]/30 transition-colors"
              data-testid={`format-${format.id}`}
            >
              <div className="flex items-start gap-4 mb-4">
                <div
                  className="w-12 h-12 rounded-xl flex items-center justify-center"
                  style={{ backgroundColor: `${format.color}20` }}
                >
                  <format.icon className="w-6 h-6" style={{ color: format.color }} />
                </div>
                <div>
                  <h4 className="text-lg font-semibold">{format.name}</h4>
                  <p className="text-sm text-[#E5E5E0]/60">{format.description}</p>
                </div>
              </div>

              <div className="mb-4">
                <p className="text-xs text-[#E5E5E0]/40 mb-2">Compatible with:</p>
                <div className="flex flex-wrap gap-1">
                  {format.platforms.map((platform) => (
                    <span
                      key={platform}
                      className="px-2 py-1 text-xs rounded bg-white/5"
                    >
                      {platform}
                    </span>
                  ))}
                </div>
              </div>

              <Button
                onClick={() => exportBook(format.id)}
                disabled={exporting !== null || chapters.length === 0}
                className="w-full gold-shimmer text-[#0A0A0A] glow-gold"
                data-testid={`export-${format.id}-btn`}
              >
                {exporting === format.id ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Download className="w-4 h-4 mr-2" />
                    Export as {format.name}
                  </>
                )}
              </Button>
            </div>
          ))}
        </div>

        {chapters.length === 0 && (
          <div className="text-center mt-8 p-6 rounded-xl bg-yellow-500/10 border border-yellow-500/20">
            <p className="text-yellow-500">
              Add chapters to your book before exporting
            </p>
            <Button
              onClick={() => navigate(`/editor/${bookId}`)}
              variant="link"
              className="text-[#D4AF37] mt-2"
            >
              Go to Editor →
            </Button>
          </div>
        )}
      </main>
    </div>
  );
};

export default ExportCenter;
