import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link, useSearchParams } from 'react-router-dom';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import TextAlign from '@tiptap/extension-text-align';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { ScrollArea } from '../components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Sheet, SheetContent, SheetTrigger } from '../components/ui/sheet';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Textarea } from '../components/ui/textarea';
import { 
  BookOpen, ArrowLeft, Plus, Sparkles, Trash2, 
  Bold, Italic, UnderlineIcon, AlignLeft, AlignCenter, AlignRight,
  List, ListOrdered, Quote, Heading1, Heading2, RotateCcw, RotateCw,
  FileText, Lightbulb, Loader2, ChevronDown, Menu, Save, Image,
  SplitSquareHorizontal, CheckCircle, Hash, Play, Pause, Square, Volume2,
  History, RotateCcw as Restore, WandSparkles, Minimize2, Maximize2
} from 'lucide-react';
import { Slider } from '../components/ui/slider';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../components/ui/collapsible';
import axios from 'axios';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

// Section types with display order
const SECTION_TYPES = [
  { value: 'title_page', label: 'Title Page', order: 0 },
  { value: 'copyright', label: 'Copyright', order: 1 },
  { value: 'dedication', label: 'Dedication', order: 2 },
  { value: 'table_of_contents', label: 'Table of Contents', order: 3 },
  { value: 'preface', label: 'Preface', order: 4 },
  { value: 'introduction', label: 'Introduction', order: 5 },
  { value: 'prologue', label: 'Prologue', order: 6 },
  { value: 'chapter', label: 'Chapter', order: 7 },
  { value: 'epilogue', label: 'Epilogue', order: 100 },
  { value: 'afterword', label: 'Afterword', order: 101 },
  { value: 'acknowledgments', label: 'Acknowledgments', order: 102 },
  { value: 'about_author', label: 'About the Author', order: 103 },
];

const BookEditor = () => {
  const { bookId } = useParams();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const [book, setBook] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [activeChapter, setActiveChapter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [lastSaved, setLastSaved] = useState(null);
  const [isCreateChapterOpen, setIsCreateChapterOpen] = useState(false);
  const [newChapter, setNewChapter] = useState({ title: '', type: 'chapter', chapterNumber: 1 });
  const [aiPanelOpen, setAiPanelOpen] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiHistory, setAiHistory] = useState([]);
  const [aiPrompt, setAiPrompt] = useState('');
  const [chapterSidebarOpen, setChapterSidebarOpen] = useState(false);
  const [imageResults, setImageResults] = useState([]);
  const [imageLoading, setImageLoading] = useState(false);
  const [splitDialogOpen, setSplitDialogOpen] = useState(false);
  const [splitMarker, setSplitMarker] = useState('Chapter');
  
  // Text-to-Speech state
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [speechRate, setSpeechRate] = useState(1);
  const [selectedVoice, setSelectedVoice] = useState(null);
  const [voices, setVoices] = useState([]);
  const [ttsDialogOpen, setTtsDialogOpen] = useState(false);
  
  // Version History state
  const [versions, setVersions] = useState([]);
  const [versionsLoading, setVersionsLoading] = useState(false);
  const [historyDialogOpen, setHistoryDialogOpen] = useState(false);
  const [isFocusMode, setIsFocusMode] = useState(false);

  useEffect(() => {
    const shouldEnableFocus = ['1', 'true'].includes((searchParams.get('focus') || '').toLowerCase());
    if (shouldEnableFocus) {
      setIsFocusMode(true);
      setAiPanelOpen(false);
      setChapterSidebarOpen(false);
    }
  }, [searchParams]);

  // Load available voices
  useEffect(() => {
    const loadVoices = () => {
      const availableVoices = window.speechSynthesis.getVoices();
      if (availableVoices.length > 0) {
        setVoices(availableVoices);
        // Default to first English voice
        const englishVoice = availableVoices.find(v => v.lang.startsWith('en')) || availableVoices[0];
        setSelectedVoice(englishVoice);
      }
    };
    
    loadVoices();
    window.speechSynthesis.onvoiceschanged = loadVoices;
    
    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  const editor = useEditor({
    extensions: [
      StarterKit,
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Placeholder.configure({
        placeholder: 'Start writing your story...',
      }),
    ],
    content: '',
    editorProps: {
      attributes: {
        class: 'editor-content prose prose-invert max-w-none focus:outline-none min-h-[300px] md:min-h-[500px] px-4 md:px-8 py-4 md:py-6',
      },
    },
  });

  useEffect(() => {
    fetchBook();
    fetchChapters();
  }, [bookId]);

  useEffect(() => {
    if (activeChapter && editor) {
      editor.commands.setContent(activeChapter.content || '');
    }
  }, [activeChapter?.id]);

  const fetchBook = async () => {
    try {
      const res = await axios.get(`${API}/books/${bookId}`);
      setBook(res.data);
    } catch (err) {
      toast.error('Book not found');
      navigate('/dashboard');
    }
  };

  const fetchChapters = async () => {
    try {
      const res = await axios.get(`${API}/books/${bookId}/chapters`);
      setChapters(res.data);
      if (res.data.length > 0 && !activeChapter) {
        setActiveChapter(res.data[0]);
      }
    } catch (err) {
      toast.error('Failed to fetch chapters');
    } finally {
      setLoading(false);
    }
  };

  const getNextChapterNumber = () => {
    const chapterSections = chapters.filter(c => c.type === 'chapter');
    return chapterSections.length + 1;
  };

  const createChapter = async () => {
    try {
      let title = newChapter.title;
      if (newChapter.type === 'chapter' && !title) {
        title = `Chapter ${newChapter.chapterNumber || getNextChapterNumber()}`;
      }
      
      const sectionType = SECTION_TYPES.find(s => s.value === newChapter.type);
      const baseOrder = sectionType ? sectionType.order * 100 : 700;
      const subOrder = newChapter.type === 'chapter' ? (newChapter.chapterNumber || getNextChapterNumber()) : 0;
      
      const res = await axios.post(`${API}/books/${bookId}/chapters`, {
        title: title || sectionType?.label || 'Untitled',
        type: newChapter.type,
        order: baseOrder + subOrder,
      });
      
      const updatedChapters = [...chapters, res.data].sort((a, b) => a.order - b.order);
      setChapters(updatedChapters);
      setActiveChapter(res.data);
      setIsCreateChapterOpen(false);
      setNewChapter({ title: '', type: 'chapter', chapterNumber: getNextChapterNumber() + 1 });
      setChapterSidebarOpen(false);
      toast.success('Section created!');
    } catch (err) {
      toast.error('Failed to create section');
    }
  };

  const saveChapter = async () => {
    if (!activeChapter || !editor) return;
    setSaving(true);
    try {
      const content = editor.getHTML();
      const res = await axios.put(`${API}/chapters/${activeChapter.id}`, {
        content,
      });
      setActiveChapter(res.data);
      setChapters(chapters.map(c => c.id === res.data.id ? res.data : c));
      setLastSaved(new Date().toLocaleTimeString());
      toast.success('Saved successfully!');
    } catch (err) {
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const deleteChapter = async (chapterId) => {
    if (!window.confirm('Delete this section?')) return;
    try {
      await axios.delete(`${API}/chapters/${chapterId}`);
      const newChapters = chapters.filter(c => c.id !== chapterId);
      setChapters(newChapters);
      if (activeChapter?.id === chapterId) {
        setActiveChapter(newChapters[0] || null);
      }
      toast.success('Section deleted');
    } catch (err) {
      toast.error('Failed to delete');
    }
  };

  // ==================== TEXT-TO-SPEECH FUNCTIONS ====================
  
  const speakText = () => {
    const text = editor?.getText() || '';
    if (!text.trim()) {
      toast.error('No content to read');
      return;
    }
    
    // Cancel any ongoing speech
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.rate = speechRate;
    utterance.voice = selectedVoice;
    
    utterance.onstart = () => {
      setIsSpeaking(true);
      setIsPaused(false);
    };
    
    utterance.onend = () => {
      setIsSpeaking(false);
      setIsPaused(false);
    };
    
    utterance.onerror = () => {
      setIsSpeaking(false);
      setIsPaused(false);
      toast.error('Speech synthesis error');
    };
    
    window.speechSynthesis.speak(utterance);
    toast.success('Reading your content...');
  };
  
  const pauseSpeech = () => {
    if (isSpeaking && !isPaused) {
      window.speechSynthesis.pause();
      setIsPaused(true);
    }
  };
  
  const resumeSpeech = () => {
    if (isPaused) {
      window.speechSynthesis.resume();
      setIsPaused(false);
    }
  };
  
  const stopSpeech = () => {
    window.speechSynthesis.cancel();
    setIsSpeaking(false);
    setIsPaused(false);
  };

  // ==================== VERSION HISTORY FUNCTIONS ====================
  
  const saveVersion = async () => {
    if (!activeChapter) return;
    try {
      await axios.post(`${API}/chapters/${activeChapter.id}/versions`);
      toast.success('Version saved!');
      fetchVersions();
    } catch (err) {
      toast.error('Failed to save version');
    }
  };
  
  const fetchVersions = async () => {
    if (!activeChapter) return;
    setVersionsLoading(true);
    try {
      const res = await axios.get(`${API}/chapters/${activeChapter.id}/versions`);
      setVersions(res.data);
    } catch (err) {
      console.error('Failed to fetch versions');
    } finally {
      setVersionsLoading(false);
    }
  };
  
  const restoreVersion = async (versionId) => {
    if (!window.confirm('Restore this version? Your current content will be saved first.')) return;
    try {
      const res = await axios.post(`${API}/chapters/${activeChapter.id}/versions/${versionId}/restore`);
      setActiveChapter(res.data);
      editor?.commands.setContent(res.data.content || '');
      setHistoryDialogOpen(false);
      toast.success('Version restored!');
      fetchVersions();
    } catch (err) {
      toast.error('Failed to restore version');
    }
  };

  // Auto-save version every 5 minutes
  useEffect(() => {
    if (!activeChapter) return;
    
    const interval = setInterval(() => {
      if (editor?.getText()?.trim()) {
        saveVersion();
      }
    }, 5 * 60 * 1000); // 5 minutes
    
    return () => clearInterval(interval);
  }, [activeChapter?.id]);

  // Fetch versions when chapter changes
  useEffect(() => {
    if (activeChapter) {
      fetchVersions();
    }
  }, [activeChapter?.id]);

  const requestAI = async (type) => {
    setAiLoading(true);
    try {
      const context = editor?.getText() || '';
      const res = await axios.post(`${API}/ai/suggest`, {
        prompt: aiPrompt || `Help me with ${type}`,
        context: context.slice(0, 2000),
        type,
      });
      
      const newEntry = {
        id: Date.now(),
        type,
        prompt: aiPrompt || `Help me with ${type}`,
        response: res.data.result,
        timestamp: new Date().toLocaleTimeString(),
      };
      setAiHistory(prev => [newEntry, ...prev]);
      setAiPrompt('');
      toast.success('AI suggestion ready!');
    } catch (err) {
      toast.error('AI request failed');
    } finally {
      setAiLoading(false);
    }
  };

  const searchImages = async () => {
    const text = editor?.getText() || '';
    if (!text.trim()) {
      toast.error('Write some content first for image suggestions');
      return;
    }
    
    setImageLoading(true);
    try {
      // Extract key themes from content
      const words = text.split(' ').slice(0, 50).join(' ');
      const res = await axios.post(`${API}/images/search`, {
        query: words.substring(0, 100),
        count: 6,
      });
      setImageResults(res.data);
      toast.success('Found relevant images!');
    } catch (err) {
      toast.error('Image search failed');
    } finally {
      setImageLoading(false);
    }
  };

  const splitIntoChapters = async () => {
    const content = editor?.getHTML() || '';
    if (!content.trim()) {
      toast.error('No content to split');
      return;
    }

    // Split by the marker (e.g., "Chapter")
    const regex = new RegExp(`(${splitMarker}\\s*\\d*)`, 'gi');
    const parts = content.split(regex).filter(p => p.trim());
    
    if (parts.length <= 1) {
      toast.error(`No "${splitMarker}" markers found to split by`);
      return;
    }

    let chapterNum = getNextChapterNumber();
    for (let i = 0; i < parts.length; i += 2) {
      const title = parts[i]?.trim() || `Chapter ${chapterNum}`;
      const chapterContent = parts[i + 1]?.trim() || '';
      
      if (chapterContent) {
        try {
          await axios.post(`${API}/books/${bookId}/chapters`, {
            title: title,
            type: 'chapter',
            order: 700 + chapterNum,
          });
          chapterNum++;
        } catch (err) {
          console.error('Failed to create chapter', err);
        }
      }
    }
    
    await fetchChapters();
    setSplitDialogOpen(false);
    toast.success(`Created ${chapterNum - getNextChapterNumber()} chapters!`);
  };

  const clearAiHistory = () => {
    setAiHistory([]);
  };

  const toggleFocusMode = () => {
    const nextFocusState = !isFocusMode;
    setIsFocusMode(nextFocusState);

    if (nextFocusState) {
      setAiPanelOpen(false);
      setChapterSidebarOpen(false);
    }

    const updated = new URLSearchParams(searchParams.toString());
    if (nextFocusState) {
      updated.set('focus', '1');
    } else {
      updated.delete('focus');
    }
    setSearchParams(updated, { replace: true });
  };

  const getPageNumber = (chapter) => {
    if (!chapter) return null;
    const chapterSections = chapters.filter(c => c.type === 'chapter').sort((a, b) => a.order - b.order);
    const index = chapterSections.findIndex(c => c.id === chapter.id);
    if (index === -1 || chapter.type !== 'chapter') return null;
    return index + 1;
  };

  // Group chapters by type for sidebar
  const groupedSections = SECTION_TYPES.reduce((acc, type) => {
    const items = chapters.filter(c => c.type === type.value).sort((a, b) => a.order - b.order);
    if (items.length > 0) {
      acc.push({ type: type.value, label: type.label, items });
    }
    return acc;
  }, []);

  const SectionSelector = () => (
    <div className="p-4 border-b border-white/5">
      <Label className="text-xs text-[#E5E5E0]/60 mb-2 block">QUICK ADD SECTION</Label>
      <div className="grid grid-cols-2 gap-2">
        {SECTION_TYPES.slice(0, 8).map((type) => (
          <Button
            key={type.value}
            variant="outline"
            size="sm"
            onClick={() => {
              setNewChapter({ title: '', type: type.value, chapterNumber: type.value === 'chapter' ? getNextChapterNumber() : 1 });
              setIsCreateChapterOpen(true);
            }}
            className="text-xs border-white/10 hover:bg-[#D4AF37]/20 hover:border-[#D4AF37]/50 hover:text-[#D4AF37] justify-start"
            data-testid={`quick-add-${type.value}`}
          >
            <Plus className="w-3 h-3 mr-1" />
            {type.label}
          </Button>
        ))}
      </div>
    </div>
  );

  const ChapterList = () => (
    <>
      {groupedSections.map(({ type, label, items }) => (
        <Collapsible key={type} defaultOpen className="mb-2">
          <CollapsibleTrigger className="flex items-center gap-2 w-full px-2 py-1.5 text-xs uppercase tracking-wider text-[#D4AF37] hover:text-[#D4AF37]/80 font-semibold">
            <ChevronDown className="w-3 h-3" />
            {label}s ({items.length})
          </CollapsibleTrigger>
          <CollapsibleContent className="space-y-1 mt-1">
            {items.map((chapter) => (
              <button
                key={chapter.id}
                onClick={() => {
                  setActiveChapter(chapter);
                  setChapterSidebarOpen(false);
                }}
                className={`group flex items-center gap-2 w-full px-3 py-3 rounded-lg text-left transition-colors ${
                  activeChapter?.id === chapter.id
                    ? 'bg-[#D4AF37] text-[#0A0A0A] font-semibold'
                    : 'text-[#E5E5E0]/70 hover:bg-white/10 hover:text-[#E5E5E0]'
                }`}
                data-testid={`chapter-${chapter.id}`}
              >
                {chapter.type === 'chapter' && (
                  <span className="w-6 h-6 rounded bg-white/10 flex items-center justify-center text-xs font-bold">
                    {getPageNumber(chapter)}
                  </span>
                )}
                <FileText className="w-4 h-4 shrink-0" />
                <span className="truncate flex-1">{chapter.title}</span>
                <button
                  onClick={(e) => { e.stopPropagation(); deleteChapter(chapter.id); }}
                  className={`opacity-0 group-hover:opacity-100 p-1 rounded ${
                    activeChapter?.id === chapter.id ? 'text-[#0A0A0A]/60 hover:text-[#0A0A0A]' : 'text-red-400 hover:text-red-300'
                  }`}
                  data-testid={`delete-chapter-${chapter.id}`}
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </button>
            ))}
          </CollapsibleContent>
        </Collapsible>
      ))}
    </>
  );

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F9F9F7] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#D4AF37]" />
      </div>
    );
  }

  return (
    <div className={`min-h-screen text-[#1A1A1A] flex flex-col md:flex-row ${isFocusMode ? 'bg-[#EFEDE6]' : 'bg-[#F9F9F7]'}`}>
      {/* Mobile Header */}
      {!isFocusMode && (
      <div className="md:hidden fixed top-0 left-0 right-0 z-50 bg-[#0A0A0A] text-white px-3 py-2 flex items-center justify-between">
        <Sheet open={chapterSidebarOpen} onOpenChange={setChapterSidebarOpen}>
          <SheetTrigger asChild>
            <Button variant="ghost" size="icon" className="text-white" data-testid="mobile-chapters-btn">
              <Menu className="w-6 h-6" />
            </Button>
          </SheetTrigger>
          <SheetContent side="left" className="w-80 p-0 bg-[#0A0A0A] text-[#F5F5F0] border-white/5">
            <div className="flex flex-col h-full">
              <div className="p-4 border-b border-white/5">
                <Link to="/dashboard" className="flex items-center gap-2 text-sm text-[#E5E5E0]/60 hover:text-[#E5E5E0] mb-3">
                  <ArrowLeft className="w-4 h-4" />
                  Dashboard
                </Link>
                <h2 className="text-base font-semibold truncate" style={{ fontFamily: 'Playfair Display, serif' }}>
                  {book?.title}
                </h2>
              </div>
              <SectionSelector />
              <ScrollArea className="flex-1 p-3">
                <ChapterList />
              </ScrollArea>
            </div>
          </SheetContent>
        </Sheet>

        <span className="text-sm font-medium truncate max-w-[120px]">
          {activeChapter?.title || book?.title}
        </span>

        <div className="flex items-center gap-1">
          {/* SAVE BUTTON - Mobile */}
          <Button 
            onClick={saveChapter}
            disabled={saving || !activeChapter}
            size="icon"
            className="bg-green-600 hover:bg-green-700 text-white h-10 w-10"
            data-testid="mobile-save-btn"
          >
            {saving ? <Loader2 className="w-5 h-5 animate-spin" /> : <Save className="w-5 h-5" />}
          </Button>

          <Sheet open={aiPanelOpen} onOpenChange={setAiPanelOpen}>
            <SheetTrigger asChild>
              <Button size="icon" className="bg-[#D4AF37] hover:bg-[#D4AF37]/80 text-[#0A0A0A] h-10 w-10" data-testid="mobile-ai-btn">
                <Sparkles className="w-5 h-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-80 p-0 bg-[#0A0A0A] text-[#F5F5F0] border-white/5">
              <AIPanel 
                aiPrompt={aiPrompt}
                setAiPrompt={setAiPrompt}
                aiLoading={aiLoading}
                requestAI={requestAI}
                aiHistory={aiHistory}
                clearAiHistory={clearAiHistory}
                imageResults={imageResults}
                imageLoading={imageLoading}
                searchImages={searchImages}
              />
            </SheetContent>
          </Sheet>
        </div>
      </div>
      )}

      {/* Desktop Sidebar */}
      {!isFocusMode && (
      <aside className="hidden md:flex w-80 bg-[#0A0A0A] text-[#F5F5F0] border-r border-white/5 flex-col fixed left-0 top-0 bottom-0">
        <div className="p-4 border-b border-white/5">
          <Link to="/dashboard" className="flex items-center gap-2 text-sm text-[#E5E5E0]/60 hover:text-[#E5E5E0] mb-4" data-testid="back-to-dashboard">
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
          <h2 className="text-lg font-semibold truncate" style={{ fontFamily: 'Playfair Display, serif' }}>
            {book?.title}
          </h2>
        </div>

        <SectionSelector />

        <ScrollArea className="flex-1 p-3">
          <ChapterList />
        </ScrollArea>

        {/* Split Content Button */}
        <div className="p-3 border-t border-white/5">
          <Dialog open={splitDialogOpen} onOpenChange={setSplitDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full border-white/10 hover:bg-white/5 mb-2 text-sm h-12" data-testid="split-content-btn">
                <SplitSquareHorizontal className="w-4 h-4 mr-2" />
                Split Pasted Content
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-[#1A1A1A] border-white/10 text-[#F5F5F0]">
              <DialogHeader>
                <DialogTitle style={{ fontFamily: 'Playfair Display, serif' }}>Split Content into Chapters</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <p className="text-sm text-[#E5E5E0]/60">
                  If you pasted a whole book, this will split it into separate chapters based on a marker word.
                </p>
                <div className="space-y-2">
                  <Label>Split by marker (e.g., "Chapter")</Label>
                  <Input
                    value={splitMarker}
                    onChange={(e) => setSplitMarker(e.target.value)}
                    placeholder="Chapter"
                    className="bg-white/5 border-white/10 focus:border-[#D4AF37]"
                  />
                </div>
                <Button onClick={splitIntoChapters} className="w-full bg-[#D4AF37] hover:bg-[#D4AF37]/80 text-[#0A0A0A] h-12 text-base font-semibold">
                  <SplitSquareHorizontal className="w-5 h-5 mr-2" />
                  Split into Chapters
                </Button>
              </div>
            </DialogContent>
          </Dialog>

          <Dialog open={isCreateChapterOpen} onOpenChange={setIsCreateChapterOpen}>
            <DialogTrigger asChild>
              <Button className="w-full bg-[#D4AF37] hover:bg-[#D4AF37]/80 text-[#0A0A0A] h-12 text-base font-semibold" data-testid="add-section-btn">
                <Plus className="w-5 h-5 mr-2" />
                Add New Section
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-[#1A1A1A] border-white/10 text-[#F5F5F0]">
              <DialogHeader>
                <DialogTitle style={{ fontFamily: 'Playfair Display, serif' }}>Add New Section</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Section Type</Label>
                  <Select value={newChapter.type} onValueChange={(v) => setNewChapter({ ...newChapter, type: v, chapterNumber: v === 'chapter' ? getNextChapterNumber() : 1 })}>
                    <SelectTrigger className="bg-white/5 border-white/10 h-12 text-base" data-testid="new-section-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1A1A1A] border-white/10">
                      {SECTION_TYPES.map((type) => (
                        <SelectItem key={type.value} value={type.value} className="text-base py-3">{type.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                {newChapter.type === 'chapter' && (
                  <div className="space-y-2">
                    <Label>Chapter Number</Label>
                    <Input
                      type="number"
                      value={newChapter.chapterNumber}
                      onChange={(e) => setNewChapter({ ...newChapter, chapterNumber: parseInt(e.target.value) || 1 })}
                      className="bg-white/5 border-white/10 focus:border-[#D4AF37] h-12 text-base"
                      min={1}
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <Label>Title (optional for chapters)</Label>
                  <Input
                    placeholder={newChapter.type === 'chapter' ? `Chapter ${newChapter.chapterNumber}` : 'Section title'}
                    value={newChapter.title}
                    onChange={(e) => setNewChapter({ ...newChapter, title: e.target.value })}
                    className="bg-white/5 border-white/10 focus:border-[#D4AF37] h-12 text-base"
                    data-testid="new-section-title"
                  />
                </div>
                
                <Button 
                  onClick={createChapter} 
                  className="w-full bg-[#D4AF37] hover:bg-[#D4AF37]/80 text-[#0A0A0A] h-14 text-lg font-semibold"
                  data-testid="submit-new-section"
                >
                  <Plus className="w-5 h-5 mr-2" />
                  Create Section
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </aside>
      )}

      {/* Main Editor */}
      <main className={`flex-1 flex flex-col overflow-hidden ${isFocusMode ? 'md:ml-0 pt-0' : 'md:ml-80 pt-14 md:pt-0'}`}>
        {/* Toolbar */}
        <div className={`bg-white border-b border-[#E5E5E0] flex items-center gap-1 md:gap-2 overflow-x-auto ${isFocusMode ? 'px-3 md:px-6 py-3' : 'px-2 md:px-4 py-2'}`}>
          {!isFocusMode && (
            <>
              <div className="flex items-center gap-0.5 md:gap-1 border-r border-[#E5E5E0] pr-1 md:pr-2 mr-1 md:mr-2">
                <ToolbarButton icon={Heading1} active={editor?.isActive('heading', { level: 1 })} onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()} tooltip="H1" />
                <ToolbarButton icon={Heading2} active={editor?.isActive('heading', { level: 2 })} onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()} tooltip="H2" />
              </div>

              <div className="flex items-center gap-0.5 md:gap-1 border-r border-[#E5E5E0] pr-1 md:pr-2 mr-1 md:mr-2">
                <ToolbarButton icon={Bold} active={editor?.isActive('bold')} onClick={() => editor?.chain().focus().toggleBold().run()} tooltip="Bold" />
                <ToolbarButton icon={Italic} active={editor?.isActive('italic')} onClick={() => editor?.chain().focus().toggleItalic().run()} tooltip="Italic" />
                <ToolbarButton icon={UnderlineIcon} active={editor?.isActive('underline')} onClick={() => editor?.chain().focus().toggleUnderline().run()} tooltip="Underline" />
              </div>

              <div className="hidden sm:flex items-center gap-0.5 md:gap-1 border-r border-[#E5E5E0] pr-1 md:pr-2 mr-1 md:mr-2">
                <ToolbarButton icon={AlignLeft} active={editor?.isActive({ textAlign: 'left' })} onClick={() => editor?.chain().focus().setTextAlign('left').run()} tooltip="Left" />
                <ToolbarButton icon={AlignCenter} active={editor?.isActive({ textAlign: 'center' })} onClick={() => editor?.chain().focus().setTextAlign('center').run()} tooltip="Center" />
                <ToolbarButton icon={AlignRight} active={editor?.isActive({ textAlign: 'right' })} onClick={() => editor?.chain().focus().setTextAlign('right').run()} tooltip="Right" />
              </div>

              <div className="hidden sm:flex items-center gap-0.5 md:gap-1 border-r border-[#E5E5E0] pr-1 md:pr-2 mr-1 md:mr-2">
                <ToolbarButton icon={List} active={editor?.isActive('bulletList')} onClick={() => editor?.chain().focus().toggleBulletList().run()} tooltip="Bullets" />
                <ToolbarButton icon={ListOrdered} active={editor?.isActive('orderedList')} onClick={() => editor?.chain().focus().toggleOrderedList().run()} tooltip="Numbers" />
                <ToolbarButton icon={Quote} active={editor?.isActive('blockquote')} onClick={() => editor?.chain().focus().toggleBlockquote().run()} tooltip="Quote" />
              </div>

              <div className="flex items-center gap-0.5 md:gap-1">
                <ToolbarButton icon={RotateCcw} onClick={() => editor?.chain().focus().undo().run()} tooltip="Undo" />
                <ToolbarButton icon={RotateCw} onClick={() => editor?.chain().focus().redo().run()} tooltip="Redo" />
              </div>
            </>
          )}

          <div className="flex-1" />

          {isFocusMode && (
            <div className="hidden md:flex items-center gap-2 px-3 py-1 rounded-full bg-[#D4AF37]/15 text-[#8D6A10] mr-2" data-testid="focus-mode-indicator">
              <WandSparkles className="w-4 h-4" />
              <span className="text-sm font-semibold">Focus Mode</span>
            </div>
          )}

          {/* Page Number Display */}
          {activeChapter && activeChapter.type === 'chapter' && (
            <div className="hidden md:flex items-center gap-2 px-3 py-1 bg-[#D4AF37]/10 rounded-lg mr-2">
              <Hash className="w-4 h-4 text-[#D4AF37]" />
              <span className="text-sm font-semibold text-[#D4AF37]">Page {getPageNumber(activeChapter)}</span>
            </div>
          )}

          {/* Word Count */}
          <div className="flex items-center gap-2 text-sm text-[#1A1A1A]/50 mr-2" data-testid="editor-word-count">
            {activeChapter && <span>{activeChapter.word_count?.toLocaleString() || 0} words</span>}
          </div>

          {/* Last Saved */}
          {lastSaved && (
            <div className="hidden md:flex items-center gap-1 text-xs text-green-600 mr-2" data-testid="editor-last-saved-indicator">
              <CheckCircle className="w-3 h-3" />
              Saved {lastSaved}
            </div>
          )}

          <Button
            onClick={toggleFocusMode}
            variant="outline"
            className={`h-10 px-4 font-semibold mr-2 ${isFocusMode ? 'border-[#8D6A10]/40 text-[#8D6A10] hover:bg-[#D4AF37]/10' : 'border-[#1A1A1A]/20 text-[#1A1A1A]/80'}`}
            data-testid="toggle-focus-mode-btn"
          >
            {isFocusMode ? <Minimize2 className="w-4 h-4 mr-2" /> : <Maximize2 className="w-4 h-4 mr-2" />}
            {isFocusMode ? 'Exit Focus' : 'Focus Mode'}
          </Button>

          {/* SAVE BUTTON - Desktop & Focus */}
          <Button
            onClick={saveChapter}
            disabled={saving || !activeChapter}
            className={`${isFocusMode ? 'flex' : 'hidden md:flex'} bg-green-600 hover:bg-green-700 text-white h-10 px-6 text-base font-semibold`}
            data-testid="save-btn"
          >
            {saving ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Save className="w-5 h-5 mr-2" />}
            SAVE
          </Button>

          {/* Text-to-Speech Button */}
          {!isFocusMode && (
          <Dialog open={ttsDialogOpen} onOpenChange={setTtsDialogOpen}>
            <DialogTrigger asChild>
              <Button
                className={`hidden md:flex h-10 px-4 text-base font-semibold ${isSpeaking ? 'bg-blue-600 text-white' : 'bg-blue-600/20 text-blue-600 hover:bg-blue-600/30'}`}
                data-testid="tts-btn"
              >
                <Volume2 className="w-5 h-5 mr-2" />
                {isSpeaking ? (isPaused ? 'Paused' : 'Playing') : 'Listen'}
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-[#1A1A1A] border-white/10 text-[#F5F5F0]">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2" style={{ fontFamily: 'Playfair Display, serif' }}>
                  <Volume2 className="w-6 h-6 text-blue-400" />
                  Text-to-Speech
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-6 mt-4">
                {/* Playback Controls */}
                <div className="flex items-center justify-center gap-4">
                  {!isSpeaking ? (
                    <Button onClick={speakText} className="bg-blue-600 hover:bg-blue-700 text-white h-14 px-8 text-lg font-semibold" data-testid="tts-play">
                      <Play className="w-6 h-6 mr-2" />
                      PLAY
                    </Button>
                  ) : (
                    <>
                      <Button onClick={isPaused ? resumeSpeech : pauseSpeech} className="bg-yellow-600 hover:bg-yellow-700 text-white h-14 px-6" data-testid="tts-pause">
                        {isPaused ? <Play className="w-6 h-6" /> : <Pause className="w-6 h-6" />}
                      </Button>
                      <Button onClick={stopSpeech} className="bg-red-600 hover:bg-red-700 text-white h-14 px-6" data-testid="tts-stop">
                        <Square className="w-6 h-6" />
                      </Button>
                    </>
                  )}
                </div>

                {/* Speed Control */}
                <div className="space-y-2">
                  <Label className="text-base">Speed: {speechRate}x</Label>
                  <Slider
                    value={[speechRate]}
                    onValueChange={([v]) => setSpeechRate(v)}
                    min={0.5}
                    max={2}
                    step={0.25}
                    className="py-4"
                    disabled={isSpeaking}
                  />
                  <div className="flex justify-between text-xs text-[#E5E5E0]/40">
                    <span>0.5x (Slow)</span>
                    <span>1x (Normal)</span>
                    <span>2x (Fast)</span>
                  </div>
                </div>

                {/* Voice Selection */}
                <div className="space-y-2">
                  <Label className="text-base">Voice</Label>
                  <Select 
                    value={selectedVoice?.name || ''} 
                    onValueChange={(name) => setSelectedVoice(voices.find(v => v.name === name))}
                    disabled={isSpeaking}
                  >
                    <SelectTrigger className="bg-white/5 border-white/10 h-12">
                      <SelectValue placeholder="Select a voice" />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1A1A1A] border-white/10 max-h-[200px]">
                      {voices.map((voice) => (
                        <SelectItem key={voice.name} value={voice.name}>
                          {voice.name} ({voice.lang})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <p className="text-sm text-[#E5E5E0]/50 text-center">
                  Tip: Listening to your writing helps catch awkward sentences
                </p>
              </div>
            </DialogContent>
          </Dialog>
          )}

          {/* Version History Button */}
          {!isFocusMode && (
          <Dialog open={historyDialogOpen} onOpenChange={(open) => { setHistoryDialogOpen(open); if (open) fetchVersions(); }}>
            <DialogTrigger asChild>
              <Button
                className="hidden md:flex h-10 px-4 text-base font-semibold bg-purple-600/20 text-purple-400 hover:bg-purple-600/30"
                disabled={!activeChapter}
                data-testid="history-btn"
              >
                <History className="w-5 h-5 mr-2" />
                History
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-[#1A1A1A] border-white/10 text-[#F5F5F0] max-w-lg">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2" style={{ fontFamily: 'Playfair Display, serif' }}>
                  <History className="w-6 h-6 text-purple-400" />
                  Version History
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-[#E5E5E0]/60">Auto-saved every 5 minutes</p>
                  <Button onClick={saveVersion} variant="outline" size="sm" className="border-white/10">
                    <Save className="w-4 h-4 mr-1" />
                    Save Now
                  </Button>
                </div>
                
                <ScrollArea className="h-[300px]">
                  {versionsLoading ? (
                    <div className="flex justify-center py-8">
                      <Loader2 className="w-6 h-6 animate-spin text-purple-400" />
                    </div>
                  ) : versions.length === 0 ? (
                    <div className="text-center py-8">
                      <History className="w-10 h-10 mx-auto mb-3 text-[#E5E5E0]/20" />
                      <p className="text-[#E5E5E0]/40">No saved versions yet</p>
                      <p className="text-xs text-[#E5E5E0]/30 mt-1">Versions are auto-saved every 5 minutes</p>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {versions.map((version, i) => (
                        <div key={version.id} className="p-3 rounded-lg bg-white/5 border border-white/10 flex items-center justify-between">
                          <div>
                            <p className="text-sm font-medium">
                              {i === 0 ? 'Latest Version' : `Version ${versions.length - i}`}
                            </p>
                            <p className="text-xs text-[#E5E5E0]/50">
                              {new Date(version.created_at).toLocaleString()} • {version.word_count} words
                            </p>
                          </div>
                          <Button 
                            onClick={() => restoreVersion(version.id)}
                            variant="outline"
                            size="sm"
                            className="border-purple-500/30 text-purple-400 hover:bg-purple-500/10"
                          >
                            <Restore className="w-4 h-4 mr-1" />
                            Restore
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </div>
            </DialogContent>
          </Dialog>
          )}

          {/* AI Button */}
          {!isFocusMode && (
            <Button
              onClick={() => setAiPanelOpen(!aiPanelOpen)}
              className={`hidden md:flex h-10 px-4 text-base font-semibold ${aiPanelOpen ? 'bg-[#D4AF37] text-[#0A0A0A]' : 'bg-[#D4AF37]/20 text-[#D4AF37] hover:bg-[#D4AF37]/30'}`}
              data-testid="toggle-ai-panel"
            >
              <Sparkles className="w-5 h-5 mr-2" />
              AI
            </Button>
          )}
        </div>

        {/* Editor Content */}
        <div className="flex-1 flex overflow-hidden">
          <div className={`flex-1 overflow-y-auto ${isFocusMode ? 'bg-[#EFEDE6]' : 'bg-[#F9F9F7]'}`}>
            {activeChapter ? (
              <div className={`${isFocusMode ? 'max-w-4xl mx-auto py-8 md:py-12' : 'max-w-3xl mx-auto py-4 md:py-8'}`}>
                {/* Section Header */}
                <div className={`${isFocusMode ? 'px-5 md:px-10 mb-3' : 'px-4 md:px-8 mb-4'}`}>
                  <div className="flex items-center gap-2 text-sm text-[#1A1A1A]/50 mb-2">
                    <span className="uppercase tracking-wider">{SECTION_TYPES.find(s => s.value === activeChapter.type)?.label || activeChapter.type}</span>
                    {activeChapter.type === 'chapter' && (
                      <span className="bg-[#D4AF37] text-[#0A0A0A] px-2 py-0.5 rounded text-xs font-bold">
                        Page {getPageNumber(activeChapter)}
                      </span>
                    )}
                  </div>
                  <h1 className="text-2xl md:text-3xl font-bold" style={{ fontFamily: 'Playfair Display, serif' }}>
                    {activeChapter.title}
                  </h1>
                </div>
                <EditorContent editor={editor} data-testid="editor-content" />
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-center p-4">
                <div>
                  <FileText className="w-16 h-16 mx-auto mb-4 text-[#1A1A1A]/20" />
                  <h3 className="text-xl font-semibold mb-2" style={{ fontFamily: 'Playfair Display, serif' }}>
                    No section selected
                  </h3>
                  <p className="text-[#1A1A1A]/50 mb-4">Create a section to start writing</p>
                  <Button onClick={() => setIsCreateChapterOpen(true)} className="bg-[#D4AF37] hover:bg-[#D4AF37]/80 text-[#0A0A0A] h-14 px-8 text-lg font-semibold" data-testid="create-first-section-btn">
                    <Plus className="w-5 h-5 mr-2" />
                    Add First Section
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* Desktop AI Panel */}
          {aiPanelOpen && !isFocusMode && (
            <aside className="hidden md:flex w-96 bg-[#0A0A0A] text-[#F5F5F0] border-l border-white/5 flex-col" data-testid="ai-panel">
              <AIPanel 
                aiPrompt={aiPrompt}
                setAiPrompt={setAiPrompt}
                aiLoading={aiLoading}
                requestAI={requestAI}
                aiHistory={aiHistory}
                clearAiHistory={clearAiHistory}
                imageResults={imageResults}
                imageLoading={imageLoading}
                searchImages={searchImages}
              />
            </aside>
          )}
        </div>
      </main>
    </div>
  );
};

const AIPanel = ({ aiPrompt, setAiPrompt, aiLoading, requestAI, aiHistory, clearAiHistory, imageResults, imageLoading, searchImages }) => {
  const typeLabels = {
    content: { label: '💡 Content Suggestion', color: 'text-blue-400' },
    footnote: { label: '📝 Footnote Suggestion', color: 'text-green-400' },
    style: { label: '✨ Style Improvement', color: 'text-purple-400' },
  };

  return (
    <div className="flex flex-col h-full">
      <div className="p-4 border-b border-white/5">
        <h3 className="text-xl font-bold flex items-center gap-2" style={{ fontFamily: 'Playfair Display, serif' }}>
          <Sparkles className="w-6 h-6 text-[#D4AF37]" />
          AI Assistant
        </h3>
        <p className="text-xs text-[#E5E5E0]/50 mt-1">Powered by GPT-5.2</p>
      </div>

      <Tabs defaultValue="content" className="flex-1 flex flex-col overflow-hidden">
        <TabsList className="mx-4 mt-4 bg-white/5 shrink-0 h-12">
          <TabsTrigger value="content" className="flex-1 text-sm h-10 data-[state=active]:bg-[#D4AF37] data-[state=active]:text-[#0A0A0A] font-semibold">Content</TabsTrigger>
          <TabsTrigger value="footnote" className="flex-1 text-sm h-10 data-[state=active]:bg-[#D4AF37] data-[state=active]:text-[#0A0A0A] font-semibold">Footnotes</TabsTrigger>
          <TabsTrigger value="images" className="flex-1 text-sm h-10 data-[state=active]:bg-[#D4AF37] data-[state=active]:text-[#0A0A0A] font-semibold">Images</TabsTrigger>
        </TabsList>

        <TabsContent value="content" className="flex flex-col p-4 space-y-3 shrink-0">
          <Textarea
            placeholder="What would you like help with?"
            value={aiPrompt}
            onChange={(e) => setAiPrompt(e.target.value)}
            className="bg-white/5 border-white/10 min-h-[80px] text-base resize-none"
            data-testid="ai-prompt-input"
          />
          <Button onClick={() => requestAI('content')} disabled={aiLoading} className="bg-[#D4AF37] hover:bg-[#D4AF37]/80 text-[#0A0A0A] h-14 text-base font-semibold w-full" data-testid="ai-suggest-content">
            {aiLoading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Lightbulb className="w-5 h-5 mr-2" />}
            GET CONTENT IDEAS
          </Button>
          <Button onClick={() => requestAI('style')} disabled={aiLoading} variant="outline" className="border-white/20 hover:bg-white/10 h-12 text-base font-semibold w-full" data-testid="ai-suggest-style">
            {aiLoading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Sparkles className="w-5 h-5 mr-2" />}
            IMPROVE MY WRITING
          </Button>
        </TabsContent>

        <TabsContent value="footnote" className="flex flex-col p-4 space-y-3 shrink-0">
          <p className="text-base text-[#E5E5E0]/70">Analyzes your text and suggests relevant footnotes and citations.</p>
          <Button onClick={() => requestAI('footnote')} disabled={aiLoading} className="bg-[#D4AF37] hover:bg-[#D4AF37]/80 text-[#0A0A0A] h-14 text-base font-semibold w-full" data-testid="ai-suggest-footnote">
            {aiLoading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <FileText className="w-5 h-5 mr-2" />}
            GENERATE FOOTNOTES
          </Button>
        </TabsContent>

        <TabsContent value="images" className="flex flex-col p-4 space-y-3 shrink-0">
          <p className="text-base text-[#E5E5E0]/70">Find relevant images based on your content.</p>
          <Button onClick={searchImages} disabled={imageLoading} className="bg-[#D4AF37] hover:bg-[#D4AF37]/80 text-[#0A0A0A] h-14 text-base font-semibold w-full" data-testid="ai-find-images">
            {imageLoading ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <Image className="w-5 h-5 mr-2" />}
            FIND IMAGES FOR MY CONTENT
          </Button>
          
          {imageResults.length > 0 && (
            <div className="grid grid-cols-2 gap-2 mt-4">
              {imageResults.map((img, i) => (
                <a 
                  key={i} 
                  href={img.url} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="aspect-video rounded-lg overflow-hidden border border-white/10 hover:border-[#D4AF37] transition-colors"
                >
                  <img src={img.thumb_url} alt={img.alt} className="w-full h-full object-cover" />
                </a>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* AI Response History */}
      <div className="flex-1 border-t border-white/5 flex flex-col min-h-0 overflow-hidden">
        <div className="flex items-center justify-between px-4 py-2 bg-white/[0.02] shrink-0">
          <span className="text-sm font-medium text-[#E5E5E0]/60">
            {aiHistory.length > 0 ? `${aiHistory.length} Response${aiHistory.length > 1 ? 's' : ''}` : 'AI Responses'}
          </span>
          {aiHistory.length > 0 && (
            <button onClick={clearAiHistory} className="text-sm text-[#D4AF37] hover:text-[#D4AF37]/80 font-medium">
              Clear All
            </button>
          )}
        </div>
        
        <ScrollArea className="flex-1">
          <div className="p-4 space-y-4">
            {aiHistory.length === 0 ? (
              <div className="text-center py-8">
                <Sparkles className="w-10 h-10 mx-auto mb-3 text-[#D4AF37]/30" />
                <p className="text-base text-[#E5E5E0]/40">
                  AI suggestions will appear here
                </p>
              </div>
            ) : (
              aiHistory.map((entry, index) => (
                <div 
                  key={entry.id}
                  className="rounded-xl bg-white/[0.03] border border-white/10 overflow-hidden"
                  data-testid={`ai-response-${index}`}
                >
                  <div className="px-4 py-3 bg-white/[0.02] border-b border-white/5 flex items-center justify-between">
                    <span className={`text-sm font-bold ${typeLabels[entry.type]?.color || 'text-[#D4AF37]'}`}>
                      {typeLabels[entry.type]?.label || 'AI Response'}
                    </span>
                    <span className="text-xs text-[#E5E5E0]/30">{entry.timestamp}</span>
                  </div>
                  
                  {entry.prompt && !entry.prompt.startsWith('Help me with') && (
                    <div className="px-4 py-3 bg-[#D4AF37]/5 border-b border-white/5">
                      <p className="text-xs text-[#E5E5E0]/50 mb-1">You asked:</p>
                      <p className="text-sm text-[#E5E5E0]/80 italic">"{entry.prompt}"</p>
                    </div>
                  )}
                  
                  <div className="p-4">
                    <p className="text-base text-[#E5E5E0]/90 whitespace-pre-wrap leading-relaxed">
                      {entry.response}
                    </p>
                  </div>
                </div>
              ))
            )}
          </div>
        </ScrollArea>
      </div>
    </div>
  );
};

const ToolbarButton = ({ icon: Icon, active, onClick, tooltip }) => (
  <button
    onClick={onClick}
    className={`p-2 md:p-2.5 rounded-lg hover:bg-[#E5E5E0] transition-colors ${active ? 'bg-[#D4AF37]/20 text-[#D4AF37]' : 'text-[#1A1A1A]/60'}`}
    title={tooltip}
  >
    <Icon className="w-5 h-5" />
  </button>
);

export default BookEditor;
