import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { ScrollArea } from '../components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { 
  ArrowLeft, Upload, FileText, Link as LinkIcon, Clipboard, 
  Loader2, GripVertical, Trash2, Plus,
  FolderOpen, CloudDownload, FileUp
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const ImportCenter = () => {
  const navigate = useNavigate();
  const [activeTab, setActiveTab] = useState('batch');
  const [loading, setLoading] = useState(false);
  const [importedSections, setImportedSections] = useState([]);
  const [url, setUrl] = useState('');
  const [driveUrl, setDriveUrl] = useState('');
  const [pasteContent, setPasteContent] = useState('');
  const [books, setBooks] = useState([]);
  const [showBookDialog, setShowBookDialog] = useState(false);
  const [draggedIndex, setDraggedIndex] = useState(null);

  useEffect(() => {
    axios.get(`${API}/books`).then((res) => setBooks(res.data)).catch(() => {});
  }, []);

  const mapSectionsForPreview = (sections, sourceFile) =>
    sections.map((section, index) => ({
      ...section,
      id: `${sourceFile}-${index}`,
      sourceFile,
      order: index,
    }));

  // Batch file upload
  const handleBatchUpload = async (e) => {
    const files = Array.from(e.target.files);
    if (files.length === 0) return;

    setLoading(true);
    const formData = new FormData();
    files.forEach(file => formData.append('files', file));

    try {
      const res = await axios.post(`${API}/import/batch`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      
      const allSections = [];
      res.data.results.forEach((result, fileIdx) => {
        if (result.status === 'success') {
          result.sections.forEach((section, secIdx) => {
            allSections.push({
              ...section,
              id: `${fileIdx}-${secIdx}`,
              sourceFile: result.filename,
              order: allSections.length
            });
          });
        }
      });
      
      setImportedSections(allSections);
      toast.success(`Imported ${allSections.length} sections from ${files.length} files`);
    } catch (err) {
      toast.error('Batch import failed');
    } finally {
      setLoading(false);
    }
  };

  // URL import
  const handleUrlImport = async () => {
    if (!url.trim()) {
      toast.error('Please enter a URL');
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post(`${API}/import/url`, { url });
      const sections = mapSectionsForPreview(res.data.sections, 'URL Import');
      setImportedSections(sections);
      toast.success(`Imported ${sections.length} sections from URL`);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'URL import failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDriveImport = async () => {
    if (!driveUrl.trim()) {
      toast.error('Please paste a Google Drive or Google Docs URL');
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post(`${API}/import/url`, { url: driveUrl });
      const sections = mapSectionsForPreview(res.data.sections, 'Google Drive');
      setImportedSections(sections);
      toast.success(`Imported ${sections.length} sections from Google Drive`);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Google Drive import failed');
    } finally {
      setLoading(false);
    }
  };

  // Smart paste
  const handleSmartPaste = async () => {
    if (!pasteContent.trim()) {
      toast.error('Please paste some content');
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post(`${API}/import/smart-paste`, { content: pasteContent });
      
      // Split into sections if headers detected
      const detectRes = await axios.post(`${API}/ai/detect-structure`, { 
        content: res.data.cleaned,
        split_by: 'chapter'
      });
      
      const sections = detectRes.data.chapters.map((s, i) => ({
        title: s.title || `Section ${i + 1}`,
        content: s.content,
        type: 'chapter',
        id: `paste-${i}`,
        sourceFile: 'Pasted Content',
        order: i
      }));
      
      setImportedSections(sections);
      toast.success(`Cleaned and split into ${sections.length} sections`);
    } catch (err) {
      toast.error('Smart paste failed');
    } finally {
      setLoading(false);
    }
  };

  // Drag and drop reorder
  const handleDragStart = (index) => {
    setDraggedIndex(index);
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    
    const newSections = [...importedSections];
    const draggedItem = newSections[draggedIndex];
    newSections.splice(draggedIndex, 1);
    newSections.splice(index, 0, draggedItem);
    
    // Update order
    newSections.forEach((s, i) => s.order = i);
    
    setImportedSections(newSections);
    setDraggedIndex(index);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
  };

  const removeSection = (index) => {
    const newSections = importedSections.filter((_, i) => i !== index);
    newSections.forEach((s, i) => s.order = i);
    setImportedSections(newSections);
  };

  const updateSectionTitle = (index, title) => {
    const newSections = [...importedSections];
    newSections[index].title = title;
    setImportedSections(newSections);
  };

  // Create book with imported content
  const createBookWithContent = async (bookTitle) => {
    setLoading(true);
    try {
      // Create new book
      const bookRes = await axios.post(`${API}/books`, {
        title: bookTitle,
        description: `Imported ${importedSections.length} sections`,
        genre: ''
      });
      
      const bookId = bookRes.data.id;
      
      // Create chapters
      for (const section of importedSections) {
        await axios.post(`${API}/books/${bookId}/chapters`, {
          title: section.title,
          type: section.type || 'chapter',
          order: section.order * 10
        });
      }
      
      // Get created chapters and update content
      const chaptersRes = await axios.get(`${API}/books/${bookId}/chapters`);
      for (let i = 0; i < chaptersRes.data.length && i < importedSections.length; i++) {
        await axios.put(`${API}/chapters/${chaptersRes.data[i].id}`, {
          content: importedSections[i].content
        });
      }
      
      toast.success('Book created successfully!');
      navigate(`/editor/${bookId}`);
    } catch (err) {
      toast.error('Failed to create book');
    } finally {
      setLoading(false);
    }
  };

  // Add to existing book
  const addToExistingBook = async (bookId) => {
    if (!bookId) return;
    
    setLoading(true);
    try {
      for (const section of importedSections) {
        await axios.post(`${API}/books/${bookId}/chapters`, {
          title: section.title,
          type: section.type || 'chapter',
          order: section.order * 10 + 1000
        });
      }
      
      const chaptersRes = await axios.get(`${API}/books/${bookId}/chapters`);
      const newChapters = chaptersRes.data.slice(-importedSections.length);
      
      for (let i = 0; i < newChapters.length && i < importedSections.length; i++) {
        await axios.put(`${API}/chapters/${newChapters[i].id}`, {
          content: importedSections[i].content
        });
      }
      
      toast.success('Content added to book!');
      navigate(`/editor/${bookId}`);
    } catch (err) {
      toast.error('Failed to add content');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#F5F5F0]">
      <header className="border-b border-white/5">
        <div className="max-w-5xl mx-auto px-4 md:px-6 py-4">
          <Link to="/dashboard" className="flex items-center gap-2 text-sm text-[#E5E5E0]/60 hover:text-[#E5E5E0] mb-4" data-testid="import-center-back-link">
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3" style={{ fontFamily: 'Playfair Display, serif' }} data-testid="import-center-title">
            <Upload className="w-7 h-7 md:w-8 md:h-8 text-[#D4AF37]" />
            Import Center
          </h1>
          <p className="text-[#E5E5E0]/60 mt-1">Import content from files, URLs, or paste directly</p>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 md:px-6 py-6 md:py-8">
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="w-full bg-white/5 mb-6 h-14" data-testid="import-center-tabs-list">
            <TabsTrigger value="batch" className="flex-1 h-12 text-base data-[state=active]:bg-[#D4AF37] data-[state=active]:text-[#0A0A0A]" data-testid="import-tab-batch">
              <FileUp className="w-5 h-5 mr-2" />
              Batch Upload
            </TabsTrigger>
            <TabsTrigger value="url" className="flex-1 h-12 text-base data-[state=active]:bg-[#D4AF37] data-[state=active]:text-[#0A0A0A]" data-testid="import-tab-url">
              <LinkIcon className="w-5 h-5 mr-2" />
              From URL
            </TabsTrigger>
            <TabsTrigger value="drive" className="flex-1 h-12 text-base data-[state=active]:bg-[#D4AF37] data-[state=active]:text-[#0A0A0A]" data-testid="import-tab-drive">
              <CloudDownload className="w-5 h-5 mr-2" />
              Google Drive
            </TabsTrigger>
            <TabsTrigger value="paste" className="flex-1 h-12 text-base data-[state=active]:bg-[#D4AF37] data-[state=active]:text-[#0A0A0A]" data-testid="import-tab-paste">
              <Clipboard className="w-5 h-5 mr-2" />
              Smart Paste
            </TabsTrigger>
          </TabsList>

          {/* Batch Upload */}
          <TabsContent value="batch" className="space-y-6">
            <div className="glass rounded-xl p-6 md:p-8">
              <div 
                className="border-2 border-dashed border-white/20 rounded-xl p-8 md:p-12 text-center hover:border-[#D4AF37]/50 transition-colors cursor-pointer"
                onClick={() => document.getElementById('batch-input').click()}
                data-testid="batch-upload-dropzone"
              >
                <FolderOpen className="w-16 h-16 mx-auto mb-4 text-[#D4AF37]/50" />
                <h3 className="text-xl font-semibold mb-2">Drop multiple .docx files here</h3>
                <p className="text-[#E5E5E0]/60 mb-4">or click to browse</p>
                <input
                  id="batch-input"
                  type="file"
                  multiple
                  accept=".docx"
                  onChange={handleBatchUpload}
                  className="hidden"
                  data-testid="batch-file-input"
                />
                <Button className="bg-[#D4AF37] hover:bg-[#D4AF37]/80 text-[#0A0A0A]" data-testid="batch-select-files-button">
                  <Upload className="w-5 h-5 mr-2" />
                  Select Files
                </Button>
              </div>
            </div>
          </TabsContent>

          {/* URL Import */}
          <TabsContent value="url" className="space-y-6">
            <div className="glass rounded-xl p-6 md:p-8">
              <Label className="text-base mb-2 block">Import from URL</Label>
              <p className="text-sm text-[#E5E5E0]/60 mb-4">
                Paste a Google Docs link, web page URL, or any public document link
              </p>
              <div className="flex gap-3">
                <Input
                  placeholder="https://docs.google.com/document/d/... or any URL"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  className="flex-1 h-14 bg-white/5 border-white/10 text-base"
                  data-testid="import-url-input"
                />
                <Button 
                  onClick={handleUrlImport}
                  disabled={loading}
                  className="h-14 px-8 bg-[#D4AF37] hover:bg-[#D4AF37]/80 text-[#0A0A0A] text-base font-semibold"
                  data-testid="import-url-submit-button"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CloudDownload className="w-5 h-5 mr-2" />}
                  Import
                </Button>
              </div>
              <div className="mt-4 p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
                <p className="text-sm text-blue-400">
                  <strong>Tip:</strong> For Google Docs, make sure the document is set to "Anyone with the link can view"
                </p>
              </div>
            </div>
          </TabsContent>

          <TabsContent value="drive" className="space-y-6">
            <div className="glass rounded-xl p-6 md:p-8">
              <Label className="text-base mb-2 block">Import from Google Drive</Label>
              <p className="text-sm text-[#E5E5E0]/60 mb-4">
                Paste a public Google Drive file link or Google Docs share link to import content instantly.
              </p>
              <div className="flex gap-3">
                <Input
                  placeholder="https://drive.google.com/file/d/... or docs.google.com/document/d/..."
                  value={driveUrl}
                  onChange={(e) => setDriveUrl(e.target.value)}
                  className="flex-1 h-14 bg-white/5 border-white/10 text-base"
                  data-testid="import-drive-url-input"
                />
                <Button
                  onClick={handleDriveImport}
                  disabled={loading}
                  className="h-14 px-8 bg-[#D4AF37] hover:bg-[#D4AF37]/80 text-[#0A0A0A] text-base font-semibold"
                  data-testid="import-drive-submit-button"
                >
                  {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <CloudDownload className="w-5 h-5 mr-2" />}
                  Import
                </Button>
              </div>
              <div className="mt-4 p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/20" data-testid="import-drive-help-box">
                <p className="text-sm text-emerald-300">
                  Share setting must be <strong>Anyone with the link can view</strong>. OAuth-based private Drive access can be enabled later.
                </p>
              </div>
            </div>
          </TabsContent>

          {/* Smart Paste */}
          <TabsContent value="paste" className="space-y-6">
            <div className="glass rounded-xl p-6 md:p-8">
              <Label className="text-base mb-2 block">Smart Paste</Label>
              <p className="text-sm text-[#E5E5E0]/60 mb-4">
                Paste content from Word, Google Docs, or web pages. We'll clean up formatting automatically.
              </p>
              <Textarea
                placeholder="Paste your content here... (Ctrl+V or Cmd+V)"
                value={pasteContent}
                onChange={(e) => setPasteContent(e.target.value)}
                className="min-h-[200px] bg-white/5 border-white/10 text-base mb-4"
                data-testid="import-smart-paste-textarea"
              />
              <Button 
                onClick={handleSmartPaste}
                disabled={loading}
                className="w-full h-14 bg-[#D4AF37] hover:bg-[#D4AF37]/80 text-[#0A0A0A] text-base font-semibold"
                data-testid="import-smart-paste-submit-button"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Clipboard className="w-5 h-5 mr-2" />}
                Clean & Import
              </Button>
            </div>
          </TabsContent>
        </Tabs>

        {/* Imported Sections - Reorderable */}
        {importedSections.length > 0 && (
          <div className="mt-8">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-semibold" style={{ fontFamily: 'Playfair Display, serif' }} data-testid="imported-sections-heading">
                Imported Sections ({importedSections.length})
              </h2>
              <p className="text-sm text-[#E5E5E0]/60">Drag to reorder</p>
            </div>

            <ScrollArea className="h-[400px] glass rounded-xl p-4" data-testid="imported-sections-scrollarea">
              <div className="space-y-2">
                {importedSections.map((section, index) => (
                  <div
                    key={section.id}
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={(e) => handleDragOver(e, index)}
                    onDragEnd={handleDragEnd}
                    className={`flex items-center gap-3 p-4 rounded-lg bg-white/5 border border-white/10 cursor-move transition-all ${
                      draggedIndex === index ? 'opacity-50 border-[#D4AF37]' : 'hover:border-white/20'
                    }`}
                    data-testid={`imported-section-row-${index}`}
                  >
                    <GripVertical className="w-5 h-5 text-[#E5E5E0]/40 shrink-0" />
                    <span className="w-8 h-8 rounded bg-[#D4AF37]/20 flex items-center justify-center text-sm font-bold text-[#D4AF37]">
                      {index + 1}
                    </span>
                    <Input
                      value={section.title}
                      onChange={(e) => updateSectionTitle(index, e.target.value)}
                      className="flex-1 bg-transparent border-0 focus:ring-0 text-base"
                      data-testid={`imported-section-title-input-${index}`}
                    />
                    <span className="text-xs text-[#E5E5E0]/40 px-2">{section.sourceFile}</span>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeSection(index)}
                      className="text-red-400 hover:text-red-300 hover:bg-red-500/10"
                      data-testid={`remove-imported-section-button-${index}`}
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </ScrollArea>

            {/* Actions */}
            <div className="mt-6 grid md:grid-cols-2 gap-4">
              <Button
                onClick={() => {
                  const title = prompt('Enter book title:');
                  if (title) createBookWithContent(title);
                }}
                disabled={loading}
                className="h-14 bg-[#D4AF37] hover:bg-[#D4AF37]/80 text-[#0A0A0A] text-base font-semibold"
                data-testid="create-book-from-imported-sections-button"
              >
                <Plus className="w-5 h-5 mr-2" />
                Create New Book
              </Button>
              <Button
                onClick={() => setShowBookDialog(true)}
                disabled={loading}
                variant="outline"
                className="h-14 border-white/20 text-base font-semibold"
                data-testid="add-imported-sections-to-existing-book-button"
              >
                <FileText className="w-5 h-5 mr-2" />
                Add to Existing Book
              </Button>
            </div>
          </div>
        )}

        {/* Book Selection Dialog */}
        <Dialog open={showBookDialog} onOpenChange={setShowBookDialog}>
          <DialogContent className="bg-[#1A1A1A] border-white/10 text-[#F5F5F0]" data-testid="book-selection-dialog">
            <DialogHeader>
              <DialogTitle>Select a Book</DialogTitle>
            </DialogHeader>
            <ScrollArea className="h-[300px] mt-4">
              {books.length === 0 ? (
                <p className="text-center text-[#E5E5E0]/60 py-8" data-testid="book-selection-empty-state">No books yet</p>
              ) : (
                <div className="space-y-2">
                  {books.map((book) => (
                    <button
                      key={book.id}
                      onClick={() => {
                        setShowBookDialog(false);
                        addToExistingBook(book.id);
                      }}
                      className="w-full p-4 rounded-lg bg-white/5 hover:bg-white/10 text-left transition-colors"
                      data-testid={`book-selection-item-${book.id}`}
                    >
                      <p className="font-semibold">{book.title}</p>
                      <p className="text-sm text-[#E5E5E0]/60">{book.chapter_count} chapters</p>
                    </button>
                  ))}
                </div>
              )}
            </ScrollArea>
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default ImportCenter;
