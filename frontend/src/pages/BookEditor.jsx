import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Placeholder from '@tiptap/extension-placeholder';
import TextAlign from '@tiptap/extension-text-align';
import Underline from '@tiptap/extension-underline';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { ScrollArea } from '../components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { Textarea } from '../components/ui/textarea';
import { 
  BookOpen, ArrowLeft, Plus, Sparkles, Save, Trash2, 
  Bold, Italic, UnderlineIcon, AlignLeft, AlignCenter, AlignRight,
  List, ListOrdered, Quote, Heading1, Heading2, RotateCcw, RotateCw,
  FileText, Lightbulb, Loader2, ChevronDown, ChevronRight, GripVertical
} from 'lucide-react';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '../components/ui/collapsible';
import axios from 'axios';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const BookEditor = () => {
  const { bookId } = useParams();
  const navigate = useNavigate();
  const [book, setBook] = useState(null);
  const [chapters, setChapters] = useState([]);
  const [activeChapter, setActiveChapter] = useState(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isCreateChapterOpen, setIsCreateChapterOpen] = useState(false);
  const [newChapter, setNewChapter] = useState({ title: '', type: 'chapter' });
  const [aiPanelOpen, setAiPanelOpen] = useState(true);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiResult, setAiResult] = useState('');
  const [aiPrompt, setAiPrompt] = useState('');

  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
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
        class: 'editor-content prose prose-invert max-w-none focus:outline-none min-h-[500px] px-8 py-6',
      },
    },
    onUpdate: ({ editor }) => {
      // Auto-save after changes
      if (activeChapter) {
        debouncedSave(editor.getHTML());
      }
    },
  });

  const debouncedSave = useCallback(
    debounce((content) => {
      saveChapter(content);
    }, 2000),
    [activeChapter]
  );

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

  const createChapter = async () => {
    try {
      const res = await axios.post(`${API}/books/${bookId}/chapters`, {
        ...newChapter,
        order: chapters.length,
      });
      setChapters([...chapters, res.data]);
      setActiveChapter(res.data);
      setIsCreateChapterOpen(false);
      setNewChapter({ title: '', type: 'chapter' });
      toast.success('Chapter created');
    } catch (err) {
      toast.error('Failed to create chapter');
    }
  };

  const saveChapter = async (content) => {
    if (!activeChapter) return;
    setSaving(true);
    try {
      const res = await axios.put(`${API}/chapters/${activeChapter.id}`, {
        content,
      });
      setActiveChapter(res.data);
      setChapters(chapters.map(c => c.id === res.data.id ? res.data : c));
    } catch (err) {
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const deleteChapter = async (chapterId) => {
    if (!window.confirm('Delete this chapter?')) return;
    try {
      await axios.delete(`${API}/chapters/${chapterId}`);
      const newChapters = chapters.filter(c => c.id !== chapterId);
      setChapters(newChapters);
      if (activeChapter?.id === chapterId) {
        setActiveChapter(newChapters[0] || null);
      }
      toast.success('Chapter deleted');
    } catch (err) {
      toast.error('Failed to delete chapter');
    }
  };

  const requestAI = async (type) => {
    setAiLoading(true);
    try {
      const context = editor?.getText() || '';
      const res = await axios.post(`${API}/ai/suggest`, {
        prompt: aiPrompt || `Help me with ${type}`,
        context: context.slice(0, 2000),
        type,
      });
      setAiResult(res.data.result);
    } catch (err) {
      toast.error('AI request failed');
    } finally {
      setAiLoading(false);
    }
  };

  const chapterTypes = [
    { value: 'preface', label: 'Preface' },
    { value: 'chapter', label: 'Chapter' },
    { value: 'epilogue', label: 'Epilogue' },
  ];

  const groupedChapters = {
    preface: chapters.filter(c => c.type === 'preface'),
    chapter: chapters.filter(c => c.type === 'chapter'),
    epilogue: chapters.filter(c => c.type === 'epilogue'),
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F9F9F7] flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-[#D4AF37]" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F9F9F7] text-[#1A1A1A] flex">
      {/* Sidebar - Chapters */}
      <aside className="w-72 bg-[#0A0A0A] text-[#F5F5F0] border-r border-white/5 flex flex-col">
        <div className="p-4 border-b border-white/5">
          <Link to="/dashboard" className="flex items-center gap-2 text-sm text-[#E5E5E0]/60 hover:text-[#E5E5E0] mb-4" data-testid="back-to-dashboard">
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
          <h2 className="text-lg font-semibold truncate" style={{ fontFamily: 'Playfair Display, serif' }}>
            {book?.title}
          </h2>
        </div>

        <ScrollArea className="flex-1 p-3">
          {Object.entries(groupedChapters).map(([type, items]) => (
            items.length > 0 && (
              <Collapsible key={type} defaultOpen className="mb-2">
                <CollapsibleTrigger className="flex items-center gap-2 w-full px-2 py-1.5 text-xs uppercase tracking-wider text-[#E5E5E0]/40 hover:text-[#E5E5E0]/60">
                  <ChevronDown className="w-3 h-3" />
                  {type}s
                </CollapsibleTrigger>
                <CollapsibleContent className="space-y-1 mt-1">
                  {items.map((chapter) => (
                    <button
                      key={chapter.id}
                      onClick={() => setActiveChapter(chapter)}
                      className={`group flex items-center gap-2 w-full px-3 py-2 rounded-lg text-left text-sm transition-colors ${
                        activeChapter?.id === chapter.id
                          ? 'bg-[#D4AF37]/10 text-[#D4AF37]'
                          : 'text-[#E5E5E0]/70 hover:bg-white/5 hover:text-[#E5E5E0]'
                      }`}
                      data-testid={`chapter-${chapter.id}`}
                    >
                      <FileText className="w-4 h-4 shrink-0" />
                      <span className="truncate flex-1">{chapter.title}</span>
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteChapter(chapter.id); }}
                        className="opacity-0 group-hover:opacity-100 text-red-400 hover:text-red-300 p-1"
                        data-testid={`delete-chapter-${chapter.id}`}
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    </button>
                  ))}
                </CollapsibleContent>
              </Collapsible>
            )
          ))}
        </ScrollArea>

        <div className="p-3 border-t border-white/5">
          <Dialog open={isCreateChapterOpen} onOpenChange={setIsCreateChapterOpen}>
            <DialogTrigger asChild>
              <Button variant="outline" className="w-full border-white/10 hover:bg-white/5" data-testid="add-chapter-btn">
                <Plus className="w-4 h-4 mr-2" />
                Add Chapter
              </Button>
            </DialogTrigger>
            <DialogContent className="bg-[#1A1A1A] border-white/10 text-[#F5F5F0]">
              <DialogHeader>
                <DialogTitle style={{ fontFamily: 'Playfair Display, serif' }}>Add New Chapter</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 mt-4">
                <div className="space-y-2">
                  <Label>Title</Label>
                  <Input
                    placeholder="Chapter title"
                    value={newChapter.title}
                    onChange={(e) => setNewChapter({ ...newChapter, title: e.target.value })}
                    className="bg-white/5 border-white/10 focus:border-[#D4AF37]"
                    data-testid="new-chapter-title"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Type</Label>
                  <Select value={newChapter.type} onValueChange={(v) => setNewChapter({ ...newChapter, type: v })}>
                    <SelectTrigger className="bg-white/5 border-white/10" data-testid="new-chapter-type">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#1A1A1A] border-white/10">
                      {chapterTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>{type.label}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <Button 
                  onClick={createChapter} 
                  className="w-full gold-shimmer text-[#0A0A0A]"
                  disabled={!newChapter.title}
                  data-testid="submit-new-chapter"
                >
                  Create Chapter
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </aside>

      {/* Main Editor */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Toolbar */}
        <div className="bg-white border-b border-[#E5E5E0] px-4 py-2 flex items-center gap-2">
          <div className="flex items-center gap-1 border-r border-[#E5E5E0] pr-2 mr-2">
            <ToolbarButton
              icon={Heading1}
              active={editor?.isActive('heading', { level: 1 })}
              onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
              tooltip="Heading 1"
            />
            <ToolbarButton
              icon={Heading2}
              active={editor?.isActive('heading', { level: 2 })}
              onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
              tooltip="Heading 2"
            />
          </div>
          
          <div className="flex items-center gap-1 border-r border-[#E5E5E0] pr-2 mr-2">
            <ToolbarButton
              icon={Bold}
              active={editor?.isActive('bold')}
              onClick={() => editor?.chain().focus().toggleBold().run()}
              tooltip="Bold"
            />
            <ToolbarButton
              icon={Italic}
              active={editor?.isActive('italic')}
              onClick={() => editor?.chain().focus().toggleItalic().run()}
              tooltip="Italic"
            />
            <ToolbarButton
              icon={UnderlineIcon}
              active={editor?.isActive('underline')}
              onClick={() => editor?.chain().focus().toggleUnderline().run()}
              tooltip="Underline"
            />
          </div>

          <div className="flex items-center gap-1 border-r border-[#E5E5E0] pr-2 mr-2">
            <ToolbarButton
              icon={AlignLeft}
              active={editor?.isActive({ textAlign: 'left' })}
              onClick={() => editor?.chain().focus().setTextAlign('left').run()}
              tooltip="Align Left"
            />
            <ToolbarButton
              icon={AlignCenter}
              active={editor?.isActive({ textAlign: 'center' })}
              onClick={() => editor?.chain().focus().setTextAlign('center').run()}
              tooltip="Align Center"
            />
            <ToolbarButton
              icon={AlignRight}
              active={editor?.isActive({ textAlign: 'right' })}
              onClick={() => editor?.chain().focus().setTextAlign('right').run()}
              tooltip="Align Right"
            />
          </div>

          <div className="flex items-center gap-1 border-r border-[#E5E5E0] pr-2 mr-2">
            <ToolbarButton
              icon={List}
              active={editor?.isActive('bulletList')}
              onClick={() => editor?.chain().focus().toggleBulletList().run()}
              tooltip="Bullet List"
            />
            <ToolbarButton
              icon={ListOrdered}
              active={editor?.isActive('orderedList')}
              onClick={() => editor?.chain().focus().toggleOrderedList().run()}
              tooltip="Numbered List"
            />
            <ToolbarButton
              icon={Quote}
              active={editor?.isActive('blockquote')}
              onClick={() => editor?.chain().focus().toggleBlockquote().run()}
              tooltip="Quote"
            />
          </div>

          <div className="flex items-center gap-1">
            <ToolbarButton
              icon={RotateCcw}
              onClick={() => editor?.chain().focus().undo().run()}
              tooltip="Undo"
            />
            <ToolbarButton
              icon={RotateCw}
              onClick={() => editor?.chain().focus().redo().run()}
              tooltip="Redo"
            />
          </div>

          <div className="flex-1" />

          <div className="flex items-center gap-2 text-sm text-[#1A1A1A]/50">
            {saving && <span className="flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin" /> Saving...</span>}
            {activeChapter && <span>{activeChapter.word_count.toLocaleString()} words</span>}
          </div>

          <Button
            variant="ghost"
            size="sm"
            onClick={() => setAiPanelOpen(!aiPanelOpen)}
            className={`${aiPanelOpen ? 'bg-[#D4AF37]/10 text-[#D4AF37]' : ''}`}
            data-testid="toggle-ai-panel"
          >
            <Sparkles className="w-4 h-4 mr-1" />
            AI Assistant
          </Button>
        </div>

        {/* Editor Content */}
        <div className="flex-1 flex overflow-hidden">
          <div className="flex-1 overflow-y-auto bg-[#F9F9F7]">
            {activeChapter ? (
              <div className="max-w-3xl mx-auto py-8">
                <EditorContent editor={editor} data-testid="editor-content" />
              </div>
            ) : (
              <div className="flex items-center justify-center h-full text-center">
                <div>
                  <FileText className="w-16 h-16 mx-auto mb-4 text-[#1A1A1A]/20" />
                  <h3 className="text-xl font-semibold mb-2" style={{ fontFamily: 'Playfair Display, serif' }}>
                    No chapter selected
                  </h3>
                  <p className="text-[#1A1A1A]/50 mb-4">Create a chapter to start writing</p>
                  <Button onClick={() => setIsCreateChapterOpen(true)} className="gold-shimmer text-[#0A0A0A]" data-testid="create-first-chapter-btn">
                    <Plus className="w-4 h-4 mr-2" />
                    Add First Chapter
                  </Button>
                </div>
              </div>
            )}
          </div>

          {/* AI Panel */}
          {aiPanelOpen && (
            <aside className="w-80 bg-[#0A0A0A] text-[#F5F5F0] border-l border-white/5 flex flex-col" data-testid="ai-panel">
              <div className="p-4 border-b border-white/5">
                <h3 className="text-lg font-semibold flex items-center gap-2" style={{ fontFamily: 'Playfair Display, serif' }}>
                  <Sparkles className="w-5 h-5 text-[#D4AF37]" />
                  AI Assistant
                </h3>
              </div>

              <Tabs defaultValue="content" className="flex-1 flex flex-col">
                <TabsList className="mx-4 mt-4 bg-white/5">
                  <TabsTrigger value="content" className="flex-1 data-[state=active]:bg-[#D4AF37] data-[state=active]:text-[#0A0A0A]">Content</TabsTrigger>
                  <TabsTrigger value="footnote" className="flex-1 data-[state=active]:bg-[#D4AF37] data-[state=active]:text-[#0A0A0A]">Footnotes</TabsTrigger>
                  <TabsTrigger value="style" className="flex-1 data-[state=active]:bg-[#D4AF37] data-[state=active]:text-[#0A0A0A]">Style</TabsTrigger>
                </TabsList>

                <TabsContent value="content" className="flex-1 flex flex-col p-4 space-y-4">
                  <Textarea
                    placeholder="Ask for content suggestions..."
                    value={aiPrompt}
                    onChange={(e) => setAiPrompt(e.target.value)}
                    className="bg-white/5 border-white/10 min-h-[100px]"
                    data-testid="ai-prompt-input"
                  />
                  <Button onClick={() => requestAI('content')} disabled={aiLoading} className="gold-shimmer text-[#0A0A0A]" data-testid="ai-suggest-content">
                    {aiLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Lightbulb className="w-4 h-4 mr-2" />}
                    Get Suggestions
                  </Button>
                </TabsContent>

                <TabsContent value="footnote" className="flex-1 flex flex-col p-4 space-y-4">
                  <p className="text-sm text-[#E5E5E0]/60">Get footnote suggestions based on your current content.</p>
                  <Button onClick={() => requestAI('footnote')} disabled={aiLoading} className="gold-shimmer text-[#0A0A0A]" data-testid="ai-suggest-footnote">
                    {aiLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Lightbulb className="w-4 h-4 mr-2" />}
                    Suggest Footnotes
                  </Button>
                </TabsContent>

                <TabsContent value="style" className="flex-1 flex flex-col p-4 space-y-4">
                  <p className="text-sm text-[#E5E5E0]/60">Get style, grammar, and flow improvements.</p>
                  <Button onClick={() => requestAI('style')} disabled={aiLoading} className="gold-shimmer text-[#0A0A0A]" data-testid="ai-suggest-style">
                    {aiLoading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Lightbulb className="w-4 h-4 mr-2" />}
                    Improve Style
                  </Button>
                </TabsContent>
              </Tabs>

              {aiResult && (
                <div className="p-4 border-t border-white/5">
                  <h4 className="text-sm font-medium mb-2 text-[#D4AF37]">AI Response</h4>
                  <ScrollArea className="h-48">
                    <p className="text-sm text-[#E5E5E0]/80 whitespace-pre-wrap" data-testid="ai-result">{aiResult}</p>
                  </ScrollArea>
                </div>
              )}
            </aside>
          )}
        </div>
      </main>
    </div>
  );
};

const ToolbarButton = ({ icon: Icon, active, onClick, tooltip }) => (
  <button
    onClick={onClick}
    className={`p-2 rounded hover:bg-[#E5E5E0] transition-colors ${active ? 'bg-[#D4AF37]/10 text-[#D4AF37]' : 'text-[#1A1A1A]/60'}`}
    title={tooltip}
  >
    <Icon className="w-4 h-4" />
  </button>
);

function debounce(func, wait) {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
}

export default BookEditor;
