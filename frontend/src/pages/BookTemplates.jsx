import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { ScrollArea } from '../components/ui/scroll-area';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../components/ui/dialog';
import { 
  ArrowLeft, BookOpen, Sparkles, FileText, Heart, Briefcase,
  GraduationCap, Utensils, Baby, Feather, Loader2, Check,
  BookMarked, Scroll, PenTool
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const TEMPLATES = [
  {
    id: 'fiction_novel',
    name: 'Fiction Novel',
    icon: BookOpen,
    color: '#D4AF37',
    description: 'Classic novel structure with front matter, chapters, and back matter',
    sections: [
      { title: 'Title Page', type: 'title_page' },
      { title: 'Copyright', type: 'copyright' },
      { title: 'Dedication', type: 'dedication' },
      { title: 'Prologue', type: 'prologue' },
      { title: 'Chapter 1', type: 'chapter' },
      { title: 'Chapter 2', type: 'chapter' },
      { title: 'Chapter 3', type: 'chapter' },
      { title: 'Epilogue', type: 'epilogue' },
      { title: 'Acknowledgments', type: 'acknowledgments' },
      { title: 'About the Author', type: 'about_author' },
    ],
    sampleContent: {
      'Dedication': '<p><em>For everyone who believed in this story...</em></p>',
      'Prologue': '<p>The night it all began was darker than any other...</p>',
      'Chapter 1': '<h2>The Beginning</h2><p>Start your story here. Set the scene, introduce your protagonist, and hook your reader from the first line.</p>',
    }
  },
  {
    id: 'memoir',
    name: 'Memoir / Biography',
    icon: Feather,
    color: '#9B59B6',
    description: 'Personal narrative structure for life stories',
    sections: [
      { title: 'Title Page', type: 'title_page' },
      { title: 'Copyright', type: 'copyright' },
      { title: 'Dedication', type: 'dedication' },
      { title: 'Author\'s Note', type: 'preface' },
      { title: 'Introduction', type: 'introduction' },
      { title: 'Part One: Early Years', type: 'chapter' },
      { title: 'Part Two: Coming of Age', type: 'chapter' },
      { title: 'Part Three: The Journey', type: 'chapter' },
      { title: 'Part Four: Lessons Learned', type: 'chapter' },
      { title: 'Epilogue', type: 'epilogue' },
      { title: 'Acknowledgments', type: 'acknowledgments' },
    ],
    sampleContent: {
      'Author\'s Note': '<p>This is my story, told as honestly as memory allows...</p>',
      'Part One: Early Years': '<h2>Where It All Started</h2><p>I was born on a [day] that would shape everything that came after...</p>',
    }
  },
  {
    id: 'self_help',
    name: 'Self-Help / Non-Fiction',
    icon: Sparkles,
    color: '#3498DB',
    description: 'Educational structure with actionable chapters',
    sections: [
      { title: 'Title Page', type: 'title_page' },
      { title: 'Copyright', type: 'copyright' },
      { title: 'Table of Contents', type: 'table_of_contents' },
      { title: 'Introduction', type: 'introduction' },
      { title: 'Chapter 1: The Problem', type: 'chapter' },
      { title: 'Chapter 2: Understanding Why', type: 'chapter' },
      { title: 'Chapter 3: The Solution', type: 'chapter' },
      { title: 'Chapter 4: Taking Action', type: 'chapter' },
      { title: 'Chapter 5: Maintaining Progress', type: 'chapter' },
      { title: 'Conclusion', type: 'epilogue' },
      { title: 'Resources', type: 'afterword' },
      { title: 'About the Author', type: 'about_author' },
    ],
    sampleContent: {
      'Introduction': '<p>If you\'ve picked up this book, you\'re ready for change. In the following pages, you\'ll discover...</p>',
      'Chapter 1: The Problem': '<h2>Recognizing the Challenge</h2><p>Before we can solve any problem, we must first understand it fully...</p><h3>Key Takeaways:</h3><ul><li>Point one</li><li>Point two</li></ul>',
    }
  },
  {
    id: 'business',
    name: 'Business Book',
    icon: Briefcase,
    color: '#2ECC71',
    description: 'Professional structure for business and leadership topics',
    sections: [
      { title: 'Title Page', type: 'title_page' },
      { title: 'Copyright', type: 'copyright' },
      { title: 'Foreword', type: 'preface' },
      { title: 'Introduction', type: 'introduction' },
      { title: 'Part I: The Foundation', type: 'chapter' },
      { title: 'Part II: Strategy', type: 'chapter' },
      { title: 'Part III: Execution', type: 'chapter' },
      { title: 'Part IV: Scaling', type: 'chapter' },
      { title: 'Part V: Case Studies', type: 'chapter' },
      { title: 'Conclusion', type: 'epilogue' },
      { title: 'Appendix', type: 'afterword' },
      { title: 'About the Author', type: 'about_author' },
    ],
    sampleContent: {
      'Introduction': '<p>In today\'s rapidly evolving business landscape, success requires...</p>',
      'Part I: The Foundation': '<h2>Building Your Base</h2><p>Every successful venture starts with a solid foundation...</p><blockquote>"The best time to plant a tree was 20 years ago. The second best time is now."</blockquote>',
    }
  },
  {
    id: 'romance',
    name: 'Romance Novel',
    icon: Heart,
    color: '#E74C3C',
    description: 'Romantic fiction with emotional arc structure',
    sections: [
      { title: 'Title Page', type: 'title_page' },
      { title: 'Copyright', type: 'copyright' },
      { title: 'Dedication', type: 'dedication' },
      { title: 'Chapter 1: The Meeting', type: 'chapter' },
      { title: 'Chapter 2: The Spark', type: 'chapter' },
      { title: 'Chapter 3: Growing Closer', type: 'chapter' },
      { title: 'Chapter 4: The Conflict', type: 'chapter' },
      { title: 'Chapter 5: The Choice', type: 'chapter' },
      { title: 'Chapter 6: Resolution', type: 'chapter' },
      { title: 'Epilogue', type: 'epilogue' },
      { title: 'Acknowledgments', type: 'acknowledgments' },
    ],
    sampleContent: {
      'Chapter 1: The Meeting': '<p>She never expected that a simple trip to the coffee shop would change everything...</p>',
    }
  },
  {
    id: 'childrens',
    name: 'Children\'s Book',
    icon: Baby,
    color: '#F39C12',
    description: 'Simple structure for picture books and early readers',
    sections: [
      { title: 'Title Page', type: 'title_page' },
      { title: 'Copyright', type: 'copyright' },
      { title: 'Dedication', type: 'dedication' },
      { title: 'Page 1', type: 'chapter' },
      { title: 'Page 2', type: 'chapter' },
      { title: 'Page 3', type: 'chapter' },
      { title: 'Page 4', type: 'chapter' },
      { title: 'Page 5', type: 'chapter' },
      { title: 'Page 6', type: 'chapter' },
      { title: 'The End', type: 'epilogue' },
      { title: 'About the Author', type: 'about_author' },
    ],
    sampleContent: {
      'Page 1': '<p style="text-align: center; font-size: 1.5em;">Once upon a time, in a land far away...</p><p style="text-align: center; color: #888;">[Illustration placeholder]</p>',
    }
  },
  {
    id: 'cookbook',
    name: 'Cookbook',
    icon: Utensils,
    color: '#E67E22',
    description: 'Recipe book with organized categories',
    sections: [
      { title: 'Title Page', type: 'title_page' },
      { title: 'Copyright', type: 'copyright' },
      { title: 'Introduction', type: 'introduction' },
      { title: 'Kitchen Essentials', type: 'preface' },
      { title: 'Breakfast Recipes', type: 'chapter' },
      { title: 'Lunch Recipes', type: 'chapter' },
      { title: 'Dinner Recipes', type: 'chapter' },
      { title: 'Desserts', type: 'chapter' },
      { title: 'Index', type: 'afterword' },
      { title: 'About the Author', type: 'about_author' },
    ],
    sampleContent: {
      'Breakfast Recipes': '<h2>Morning Delights</h2><h3>Recipe Name</h3><p><strong>Prep Time:</strong> X mins | <strong>Cook Time:</strong> X mins | <strong>Serves:</strong> X</p><h4>Ingredients:</h4><ul><li>Ingredient 1</li><li>Ingredient 2</li></ul><h4>Instructions:</h4><ol><li>Step one</li><li>Step two</li></ol>',
    }
  },
  {
    id: 'poetry',
    name: 'Poetry Collection',
    icon: Scroll,
    color: '#8E44AD',
    description: 'Organized structure for poetry anthologies',
    sections: [
      { title: 'Title Page', type: 'title_page' },
      { title: 'Copyright', type: 'copyright' },
      { title: 'Dedication', type: 'dedication' },
      { title: 'Preface', type: 'preface' },
      { title: 'Part I: Beginnings', type: 'chapter' },
      { title: 'Part II: Journey', type: 'chapter' },
      { title: 'Part III: Reflections', type: 'chapter' },
      { title: 'Part IV: Endings', type: 'chapter' },
      { title: 'Notes on the Poems', type: 'afterword' },
      { title: 'About the Poet', type: 'about_author' },
    ],
    sampleContent: {
      'Part I: Beginnings': '<h2 style="text-align: center;">First Light</h2><p style="text-align: center; line-height: 2;"><em>The morning breaks<br/>soft as whispers<br/>on sleeping eyelids...</em></p>',
    }
  },
  {
    id: 'academic',
    name: 'Academic / Textbook',
    icon: GraduationCap,
    color: '#1ABC9C',
    description: 'Educational structure with learning objectives',
    sections: [
      { title: 'Title Page', type: 'title_page' },
      { title: 'Copyright', type: 'copyright' },
      { title: 'Preface', type: 'preface' },
      { title: 'How to Use This Book', type: 'introduction' },
      { title: 'Chapter 1: Fundamentals', type: 'chapter' },
      { title: 'Chapter 2: Core Concepts', type: 'chapter' },
      { title: 'Chapter 3: Advanced Topics', type: 'chapter' },
      { title: 'Chapter 4: Practical Applications', type: 'chapter' },
      { title: 'Glossary', type: 'afterword' },
      { title: 'Bibliography', type: 'afterword' },
      { title: 'Index', type: 'afterword' },
    ],
    sampleContent: {
      'Chapter 1: Fundamentals': '<h2>Learning Objectives</h2><p>By the end of this chapter, you will be able to:</p><ul><li>Understand key concept 1</li><li>Apply principle 2</li><li>Analyze situation 3</li></ul><h2>Introduction</h2><p>In this chapter, we explore the foundational concepts that underpin...</p><h3>Key Terms</h3><p><strong>Term 1:</strong> Definition here</p>',
    }
  },
  {
    id: 'blank',
    name: 'Blank Book',
    icon: PenTool,
    color: '#95A5A6',
    description: 'Start fresh with no pre-defined structure',
    sections: [
      { title: 'Chapter 1', type: 'chapter' },
    ],
    sampleContent: {}
  },
];

const BookTemplates = () => {
  const navigate = useNavigate();
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [bookTitle, setBookTitle] = useState('');
  const [bookDescription, setBookDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [dialogOpen, setDialogOpen] = useState(false);

  const selectTemplate = (template) => {
    setSelectedTemplate(template);
    setBookTitle('');
    setBookDescription('');
    setDialogOpen(true);
  };

  const createBookFromTemplate = async () => {
    if (!bookTitle.trim()) {
      toast.error('Please enter a book title');
      return;
    }

    setCreating(true);
    try {
      // Create the book
      const bookRes = await axios.post(`${API}/books`, {
        title: bookTitle,
        description: bookDescription,
        genre: selectedTemplate.name,
      });

      const bookId = bookRes.data.id;

      // Create all sections from template
      for (let i = 0; i < selectedTemplate.sections.length; i++) {
        const section = selectedTemplate.sections[i];
        const sampleContent = selectedTemplate.sampleContent[section.title] || '';
        
        await axios.post(`${API}/books/${bookId}/chapters`, {
          title: section.title,
          type: section.type,
          order: i * 10,
        });

        // If there's sample content, update the chapter
        if (sampleContent) {
          const chaptersRes = await axios.get(`${API}/books/${bookId}/chapters`);
          const chapter = chaptersRes.data.find(c => c.title === section.title);
          if (chapter) {
            await axios.put(`${API}/chapters/${chapter.id}`, {
              content: sampleContent,
            });
          }
        }
      }

      toast.success('Book created from template!');
      setDialogOpen(false);
      navigate(`/editor/${bookId}`);
    } catch (err) {
      toast.error('Failed to create book');
    } finally {
      setCreating(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#F5F5F0]">
      {/* Header */}
      <header className="border-b border-white/5">
        <div className="max-w-6xl mx-auto px-4 md:px-6 py-4">
          <Link to="/dashboard" className="flex items-center gap-2 text-sm text-[#E5E5E0]/60 hover:text-[#E5E5E0] mb-4" data-testid="back-to-dashboard">
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
          <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-3" style={{ fontFamily: 'Playfair Display, serif' }}>
            <BookMarked className="w-7 h-7 md:w-8 md:h-8 text-[#D4AF37]" />
            Book Templates
          </h1>
          <p className="text-[#E5E5E0]/60 mt-1 text-sm md:text-base">Start with a professional structure for your book type</p>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 md:px-6 py-6 md:py-8">
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {TEMPLATES.map((template) => (
            <button
              key={template.id}
              onClick={() => selectTemplate(template)}
              className="glass rounded-xl p-5 md:p-6 text-left hover:border-[#D4AF37]/50 transition-all hover:-translate-y-1 group"
              data-testid={`template-${template.id}`}
            >
              <div className="flex items-start gap-4 mb-4">
                <div
                  className="w-12 h-12 md:w-14 md:h-14 rounded-xl flex items-center justify-center shrink-0 group-hover:scale-110 transition-transform"
                  style={{ backgroundColor: `${template.color}20` }}
                >
                  <template.icon className="w-6 h-6 md:w-7 md:h-7" style={{ color: template.color }} />
                </div>
                <div>
                  <h3 className="text-lg md:text-xl font-semibold mb-1" style={{ fontFamily: 'Playfair Display, serif' }}>
                    {template.name}
                  </h3>
                  <p className="text-xs md:text-sm text-[#E5E5E0]/60">{template.description}</p>
                </div>
              </div>

              <div className="space-y-1">
                <p className="text-xs text-[#E5E5E0]/40 mb-2">Includes {template.sections.length} sections:</p>
                <div className="flex flex-wrap gap-1">
                  {template.sections.slice(0, 5).map((section, i) => (
                    <span key={i} className="px-2 py-1 text-xs rounded bg-white/5 text-[#E5E5E0]/70">
                      {section.title}
                    </span>
                  ))}
                  {template.sections.length > 5 && (
                    <span className="px-2 py-1 text-xs rounded bg-white/5 text-[#D4AF37]">
                      +{template.sections.length - 5} more
                    </span>
                  )}
                </div>
              </div>
            </button>
          ))}
        </div>

        {/* Create Book Dialog */}
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="bg-[#1A1A1A] border-white/10 text-[#F5F5F0] max-w-lg mx-4">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-3" style={{ fontFamily: 'Playfair Display, serif' }}>
                {selectedTemplate && (
                  <>
                    <div
                      className="w-10 h-10 rounded-lg flex items-center justify-center"
                      style={{ backgroundColor: `${selectedTemplate.color}20` }}
                    >
                      <selectedTemplate.icon className="w-5 h-5" style={{ color: selectedTemplate.color }} />
                    </div>
                    Create {selectedTemplate.name}
                  </>
                )}
              </DialogTitle>
            </DialogHeader>

            {selectedTemplate && (
              <div className="space-y-6 mt-4">
                <div className="space-y-2">
                  <Label className="text-base">Book Title</Label>
                  <Input
                    placeholder="Enter your book title"
                    value={bookTitle}
                    onChange={(e) => setBookTitle(e.target.value)}
                    className="bg-white/5 border-white/10 focus:border-[#D4AF37] h-12 text-base"
                    data-testid="template-book-title"
                  />
                </div>

                <div className="space-y-2">
                  <Label className="text-base">Description (optional)</Label>
                  <Input
                    placeholder="Brief description of your book"
                    value={bookDescription}
                    onChange={(e) => setBookDescription(e.target.value)}
                    className="bg-white/5 border-white/10 focus:border-[#D4AF37] h-12 text-base"
                    data-testid="template-book-description"
                  />
                </div>

                <div className="p-4 rounded-lg bg-white/5 border border-white/10">
                  <p className="text-sm text-[#E5E5E0]/60 mb-3">This template will create:</p>
                  <ScrollArea className="h-32">
                    <div className="space-y-1">
                      {selectedTemplate.sections.map((section, i) => (
                        <div key={i} className="flex items-center gap-2 text-sm">
                          <Check className="w-4 h-4 text-green-500 shrink-0" />
                          <span>{section.title}</span>
                        </div>
                      ))}
                    </div>
                  </ScrollArea>
                </div>

                <Button
                  onClick={createBookFromTemplate}
                  disabled={creating || !bookTitle.trim()}
                  className="w-full bg-[#D4AF37] hover:bg-[#D4AF37]/80 text-[#0A0A0A] h-14 text-lg font-semibold"
                  data-testid="create-from-template-btn"
                >
                  {creating ? (
                    <>
                      <Loader2 className="w-5 h-5 animate-spin mr-2" />
                      Creating Book...
                    </>
                  ) : (
                    <>
                      <BookOpen className="w-5 h-5 mr-2" />
                      CREATE BOOK
                    </>
                  )}
                </Button>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </main>
    </div>
  );
};

export default BookTemplates;
