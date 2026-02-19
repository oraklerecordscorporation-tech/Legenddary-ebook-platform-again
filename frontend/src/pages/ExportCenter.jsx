import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { ScrollArea } from '../components/ui/scroll-area';
import { Label } from '../components/ui/label';
import { Switch } from '../components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { 
  ArrowLeft, Download, FileText, BookOpen, Loader2, Printer, Settings
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
  
  // Print-ready options
  const [printDialogOpen, setPrintDialogOpen] = useState(false);
  const [paperSize, setPaperSize] = useState('6x9');
  const [includeBleed, setIncludeBleed] = useState(false);

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

  const exportBook = async (format, printReady = false) => {
    setExporting(format + (printReady ? '_print' : ''));
    try {
      const res = await axios.post(`${API}/export`, {
        book_id: bookId,
        format,
        print_ready: printReady,
        paper_size: paperSize,
        include_bleed: includeBleed,
      });

      // Download file
      const link = document.createElement('a');
      link.href = `data:${res.data.content_type};base64,${res.data.data}`;
      link.download = res.data.filename;
      link.click();

      if (res.data.print_info) {
        toast.success(`Print-ready PDF exported! ${res.data.print_info.total_pages} pages, ${res.data.print_info.paper_size} size`);
      } else {
        toast.success(`${format.toUpperCase()} exported successfully!`);
      }
      
      setPrintDialogOpen(false);
    } catch (err) {
      toast.error(`Failed to export ${format.toUpperCase()}`);
    } finally {
      setExporting(null);
    }
  };

  const paperSizes = [
    { value: '6x9', label: '6" x 9" (Standard Trade)', desc: 'Most popular for novels' },
    { value: '5.5x8.5', label: '5.5" x 8.5" (Digest)', desc: 'Common for paperbacks' },
    { value: '5x8', label: '5" x 8" (Mass Market)', desc: 'Compact paperback size' },
    { value: '8.5x11', label: '8.5" x 11" (Letter)', desc: 'Good for workbooks' },
    { value: 'a5', label: 'A5 (148mm x 210mm)', desc: 'International standard' },
  ];

  const formats = [
    {
      id: 'pdf',
      name: 'PDF',
      description: 'Universal format, great for reading and sharing',
      icon: FileText,
      color: '#E74C3C',
      platforms: ['Direct sales', 'Review copies', 'Email delivery'],
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
        <div className="max-w-5xl mx-auto px-4 md:px-6 py-4">
          <Link to="/dashboard" className="flex items-center gap-2 text-sm text-[#E5E5E0]/60 hover:text-[#E5E5E0] mb-4" data-testid="back-to-dashboard">
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3" style={{ fontFamily: 'Playfair Display, serif' }}>
            <Download className="w-7 h-7 md:w-8 md:h-8 text-[#D4AF37]" />
            Export Center
          </h1>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 md:px-6 py-6 md:py-8">
        {/* Book Info */}
        <div className="glass rounded-xl p-4 md:p-6 mb-6 md:mb-8" data-testid="book-info">
          <div className="flex items-start gap-4 md:gap-6">
            <div className="w-16 h-24 md:w-20 md:h-28 rounded-lg overflow-hidden bg-gradient-to-br from-[#D4AF37]/20 to-[#D4AF37]/5 flex items-center justify-center shrink-0">
              {book?.cover_data ? (
                <img src={book.cover_data} alt={book.title} className="w-full h-full object-cover" />
              ) : (
                <BookOpen className="w-6 h-6 md:w-8 md:h-8 text-[#D4AF37]/40" />
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h2 className="text-lg md:text-xl font-semibold truncate" style={{ fontFamily: 'Playfair Display, serif' }}>{book?.title}</h2>
              <p className="text-[#E5E5E0]/60 mt-1 text-sm line-clamp-2">{book?.description || 'No description'}</p>
              <div className="flex items-center gap-4 mt-3 text-xs md:text-sm text-[#E5E5E0]/40">
                <span>{chapters.length} chapters</span>
                <span>•</span>
                <span>{book?.word_count?.toLocaleString()} words</span>
              </div>
            </div>
          </div>
        </div>

        {/* Chapters Preview */}
        <div className="glass rounded-xl p-4 md:p-6 mb-6 md:mb-8">
          <h3 className="text-lg font-semibold mb-4" style={{ fontFamily: 'Playfair Display, serif' }}>
            Contents Preview
          </h3>
          <ScrollArea className="h-40 md:h-48">
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
                    <span className="flex-1 truncate text-sm">{chapter.title}</span>
                    <span className="text-xs text-[#E5E5E0]/40">{chapter.word_count} words</span>
                  </div>
                ))}
              </div>
            )}
          </ScrollArea>
        </div>

        {/* Export Formats */}
        <h3 className="text-lg md:text-xl font-semibold mb-4" style={{ fontFamily: 'Playfair Display, serif' }}>
          Digital Export
        </h3>
        <div className="grid md:grid-cols-2 gap-4 md:gap-6 mb-8">
          {formats.map((format) => (
            <div
              key={format.id}
              className="glass rounded-xl p-4 md:p-6 hover:border-[#D4AF37]/30 transition-colors"
              data-testid={`format-${format.id}`}
            >
              <div className="flex items-start gap-4 mb-4">
                <div
                  className="w-10 h-10 md:w-12 md:h-12 rounded-xl flex items-center justify-center shrink-0"
                  style={{ backgroundColor: `${format.color}20` }}
                >
                  <format.icon className="w-5 h-5 md:w-6 md:h-6" style={{ color: format.color }} />
                </div>
                <div>
                  <h4 className="text-base md:text-lg font-semibold">{format.name}</h4>
                  <p className="text-xs md:text-sm text-[#E5E5E0]/60">{format.description}</p>
                </div>
              </div>

              <div className="mb-4">
                <p className="text-xs text-[#E5E5E0]/40 mb-2">Best for:</p>
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
                className="w-full bg-[#D4AF37] hover:bg-[#D4AF37]/80 text-[#0A0A0A] h-12 md:h-14 text-base font-semibold"
                data-testid={`export-${format.id}-btn`}
              >
                {exporting === format.id ? (
                  <>
                    <Loader2 className="w-5 h-5 animate-spin mr-2" />
                    Generating...
                  </>
                ) : (
                  <>
                    <Download className="w-5 h-5 mr-2" />
                    Export {format.name}
                  </>
                )}
              </Button>
            </div>
          ))}
        </div>

        {/* Print-Ready Export */}
        <h3 className="text-lg md:text-xl font-semibold mb-4" style={{ fontFamily: 'Playfair Display, serif' }}>
          <Printer className="w-5 h-5 md:w-6 md:h-6 inline mr-2 text-[#D4AF37]" />
          Print-Ready Export
        </h3>
        <div className="glass rounded-xl p-4 md:p-6">
          <p className="text-sm md:text-base text-[#E5E5E0]/70 mb-4">
            Generate a professional PDF ready for print-on-demand services like Amazon KDP, IngramSpark, or Lulu.
          </p>

          <div className="grid md:grid-cols-2 gap-6 mb-6">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-base">Paper Size</Label>
                <Select value={paperSize} onValueChange={setPaperSize}>
                  <SelectTrigger className="bg-white/5 border-white/10 h-12" data-testid="paper-size-select">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-[#1A1A1A] border-white/10">
                    {paperSizes.map((size) => (
                      <SelectItem key={size.value} value={size.value} className="py-3">
                        <div>
                          <span className="font-medium">{size.label}</span>
                          <span className="text-xs text-[#E5E5E0]/50 ml-2">{size.desc}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center justify-between p-4 rounded-lg bg-white/5">
                <div>
                  <Label className="text-base">Include Bleed Marks</Label>
                  <p className="text-xs text-[#E5E5E0]/50 mt-1">Add 0.125" bleed and trim marks for print shops</p>
                </div>
                <Switch
                  checked={includeBleed}
                  onCheckedChange={setIncludeBleed}
                  data-testid="bleed-switch"
                />
              </div>
            </div>

            <div className="p-4 rounded-lg bg-[#D4AF37]/10 border border-[#D4AF37]/20">
              <h4 className="font-medium text-[#D4AF37] mb-2">Print Settings</h4>
              <ul className="text-sm text-[#E5E5E0]/70 space-y-1">
                <li>• Inside margin: 0.875" (for binding)</li>
                <li>• Outside margin: 0.625"</li>
                <li>• Top/bottom margin: 0.75"</li>
                <li>• Chapters start on right-hand pages</li>
                <li>• Automatic page numbering</li>
                {includeBleed && <li>• Bleed: 0.125" on all sides</li>}
              </ul>
            </div>
          </div>

          <Button
            onClick={() => exportBook('pdf', true)}
            disabled={exporting !== null || chapters.length === 0}
            className="w-full bg-green-600 hover:bg-green-700 text-white h-14 text-lg font-semibold"
            data-testid="export-print-ready-btn"
          >
            {exporting === 'pdf_print' ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin mr-2" />
                Generating Print-Ready PDF...
              </>
            ) : (
              <>
                <Printer className="w-5 h-5 mr-2" />
                EXPORT PRINT-READY PDF
              </>
            )}
          </Button>
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
