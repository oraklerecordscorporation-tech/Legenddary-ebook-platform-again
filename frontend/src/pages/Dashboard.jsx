import { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '../components/ui/dialog';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { ScrollArea } from '../components/ui/scroll-area';
import { 
  BookOpen, Plus, LogOut, FileText, Image, PenTool, 
  Download, Share2, TrendingUp, Settings, Search, MoreVertical,
  Edit, Trash2, Palette, Clock, BarChart3
} from 'lucide-react';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '../components/ui/dropdown-menu';
import axios from 'axios';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const Dashboard = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [books, setBooks] = useState([]);
  const [stats, setStats] = useState({ total_books: 0, total_words: 0, total_chapters: 0 });
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newBook, setNewBook] = useState({ title: '', description: '', genre: '' });

  useEffect(() => {
    fetchBooks();
    fetchStats();
  }, []);

  const fetchBooks = async () => {
    try {
      const res = await axios.get(`${API}/books`);
      setBooks(res.data);
    } catch (err) {
      toast.error('Failed to fetch books');
    } finally {
      setLoading(false);
    }
  };

  const fetchStats = async () => {
    try {
      const res = await axios.get(`${API}/stats`);
      setStats(res.data);
    } catch (err) {
      console.error('Failed to fetch stats');
    }
  };

  const createBook = async () => {
    try {
      const res = await axios.post(`${API}/books`, newBook);
      setBooks([res.data, ...books]);
      setIsCreateOpen(false);
      setNewBook({ title: '', description: '', genre: '' });
      toast.success('Book created successfully!');
      navigate(`/editor/${res.data.id}`);
    } catch (err) {
      toast.error('Failed to create book');
    }
  };

  const deleteBook = async (bookId) => {
    if (!window.confirm('Are you sure you want to delete this book?')) return;
    try {
      await axios.delete(`${API}/books/${bookId}`);
      setBooks(books.filter(b => b.id !== bookId));
      toast.success('Book deleted');
    } catch (err) {
      toast.error('Failed to delete book');
    }
  };

  const filteredBooks = books.filter(book => 
    book.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const genres = ['Fiction', 'Non-Fiction', 'Mystery', 'Romance', 'Sci-Fi', 'Fantasy', 'Biography', 'Self-Help', 'Business', 'Other'];

  const navItems = [
    { icon: FileText, label: 'Dashboard', path: '/dashboard', active: true },
    { icon: Image, label: 'Image Finder', path: '/images' },
    { icon: PenTool, label: 'Signature Studio', path: '/signature' },
    { icon: Share2, label: 'Publishing', path: '/publishing' },
    { icon: TrendingUp, label: 'Marketing', path: '/marketing' },
  ];

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#F5F5F0] flex">
      {/* Sidebar */}
      <aside className="w-64 border-r border-white/5 flex flex-col">
        <div className="p-6">
          <Link to="/" className="flex items-center gap-2" data-testid="dashboard-logo">
            <div className="w-10 h-10 rounded-lg gold-shimmer flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-[#0A0A0A]" />
            </div>
            <span className="text-xl font-bold tracking-tight" style={{ fontFamily: 'Playfair Display, serif' }}>
              Legenddary
            </span>
          </Link>
        </div>

        <ScrollArea className="flex-1 px-3">
          <nav className="space-y-1">
            {navItems.map((item) => (
              <Link
                key={item.path}
                to={item.path}
                className={`flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors ${
                  item.active 
                    ? 'bg-[#D4AF37]/10 text-[#D4AF37]' 
                    : 'text-[#E5E5E0]/60 hover:text-[#E5E5E0] hover:bg-white/5'
                }`}
                data-testid={`nav-${item.label.toLowerCase().replace(' ', '-')}`}
              >
                <item.icon className="w-5 h-5" />
                <span className="text-sm font-medium">{item.label}</span>
              </Link>
            ))}
          </nav>
        </ScrollArea>

        <div className="p-4 border-t border-white/5">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="flex items-center gap-3 w-full p-2 rounded-lg hover:bg-white/5 transition-colors" data-testid="user-menu-trigger">
                <div className="w-9 h-9 rounded-full gold-shimmer flex items-center justify-center text-[#0A0A0A] font-semibold">
                  {user?.name?.charAt(0).toUpperCase()}
                </div>
                <div className="flex-1 text-left">
                  <p className="text-sm font-medium truncate">{user?.name}</p>
                  <p className="text-xs text-[#E5E5E0]/40 truncate">{user?.email}</p>
                </div>
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56 bg-[#1A1A1A] border-white/10">
              <DropdownMenuItem onClick={logout} className="text-red-400 cursor-pointer" data-testid="logout-btn">
                <LogOut className="w-4 h-4 mr-2" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex-1 overflow-hidden">
        <div className="h-full overflow-y-auto p-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <h1 className="text-3xl font-bold tracking-tight" style={{ fontFamily: 'Playfair Display, serif' }}>
                Welcome back, {user?.name?.split(' ')[0]}
              </h1>
              <p className="text-[#E5E5E0]/60 mt-1">Continue your writing journey</p>
            </div>
            
            <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
              <DialogTrigger asChild>
                <Button className="gold-shimmer text-[#0A0A0A] hover:opacity-90 rounded-full px-6 glow-gold" data-testid="create-book-btn">
                  <Plus className="w-4 h-4 mr-2" />
                  New Book
                </Button>
              </DialogTrigger>
              <DialogContent className="bg-[#1A1A1A] border-white/10 text-[#F5F5F0]">
                <DialogHeader>
                  <DialogTitle style={{ fontFamily: 'Playfair Display, serif' }}>Create New Book</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 mt-4">
                  <div className="space-y-2">
                    <Label>Title</Label>
                    <Input
                      placeholder="My Amazing Book"
                      value={newBook.title}
                      onChange={(e) => setNewBook({ ...newBook, title: e.target.value })}
                      className="bg-white/5 border-white/10 focus:border-[#D4AF37]"
                      data-testid="new-book-title"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Description</Label>
                    <Textarea
                      placeholder="A brief description of your book..."
                      value={newBook.description}
                      onChange={(e) => setNewBook({ ...newBook, description: e.target.value })}
                      className="bg-white/5 border-white/10 focus:border-[#D4AF37] min-h-[100px]"
                      data-testid="new-book-description"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Genre</Label>
                    <Select value={newBook.genre} onValueChange={(v) => setNewBook({ ...newBook, genre: v })}>
                      <SelectTrigger className="bg-white/5 border-white/10" data-testid="new-book-genre">
                        <SelectValue placeholder="Select genre" />
                      </SelectTrigger>
                      <SelectContent className="bg-[#1A1A1A] border-white/10">
                        {genres.map((genre) => (
                          <SelectItem key={genre} value={genre}>{genre}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <Button 
                    onClick={createBook} 
                    className="w-full gold-shimmer text-[#0A0A0A] hover:opacity-90 rounded-full"
                    disabled={!newBook.title}
                    data-testid="submit-create-book"
                  >
                    Create Book
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-6 mb-8">
            <div className="glass rounded-xl p-6" data-testid="stat-books">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-[#D4AF37]/10 flex items-center justify-center">
                  <BookOpen className="w-6 h-6 text-[#D4AF37]" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.total_books}</p>
                  <p className="text-sm text-[#E5E5E0]/60">Books</p>
                </div>
              </div>
            </div>
            <div className="glass rounded-xl p-6" data-testid="stat-chapters">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-blue-500/10 flex items-center justify-center">
                  <FileText className="w-6 h-6 text-blue-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.total_chapters}</p>
                  <p className="text-sm text-[#E5E5E0]/60">Chapters</p>
                </div>
              </div>
            </div>
            <div className="glass rounded-xl p-6" data-testid="stat-words">
              <div className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-green-500/10 flex items-center justify-center">
                  <BarChart3 className="w-6 h-6 text-green-400" />
                </div>
                <div>
                  <p className="text-2xl font-bold">{stats.total_words.toLocaleString()}</p>
                  <p className="text-sm text-[#E5E5E0]/60">Words</p>
                </div>
              </div>
            </div>
          </div>

          {/* Search */}
          <div className="relative mb-6">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-[#E5E5E0]/40" />
            <Input
              placeholder="Search books..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 h-12 bg-white/5 border-white/10 focus:border-[#D4AF37] rounded-xl"
              data-testid="search-books-input"
            />
          </div>

          {/* Books Grid */}
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {[1, 2, 3].map((i) => (
                <div key={i} className="glass rounded-xl p-6 animate-pulse">
                  <div className="h-32 bg-white/5 rounded-lg mb-4"></div>
                  <div className="h-6 bg-white/5 rounded w-3/4 mb-2"></div>
                  <div className="h-4 bg-white/5 rounded w-1/2"></div>
                </div>
              ))}
            </div>
          ) : filteredBooks.length === 0 ? (
            <div className="text-center py-20">
              <div className="w-20 h-20 mx-auto mb-6 rounded-full bg-white/5 flex items-center justify-center">
                <BookOpen className="w-10 h-10 text-[#E5E5E0]/30" />
              </div>
              <h3 className="text-xl font-semibold mb-2" style={{ fontFamily: 'Playfair Display, serif' }}>
                {searchQuery ? 'No books found' : 'No books yet'}
              </h3>
              <p className="text-[#E5E5E0]/60 mb-6">
                {searchQuery ? 'Try a different search term' : 'Start writing your first masterpiece'}
              </p>
              {!searchQuery && (
                <Button onClick={() => setIsCreateOpen(true)} className="gold-shimmer text-[#0A0A0A] rounded-full px-6" data-testid="create-first-book-btn">
                  <Plus className="w-4 h-4 mr-2" />
                  Create Your First Book
                </Button>
              )}
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredBooks.map((book) => (
                <div
                  key={book.id}
                  className="group glass rounded-xl overflow-hidden hover:border-[#D4AF37]/30 transition-all hover:-translate-y-1"
                  data-testid={`book-card-${book.id}`}
                >
                  <div className="aspect-[4/3] bg-gradient-to-br from-[#D4AF37]/20 to-[#D4AF37]/5 flex items-center justify-center relative">
                    {book.cover_data ? (
                      <img src={book.cover_data} alt={book.title} className="w-full h-full object-cover" />
                    ) : (
                      <BookOpen className="w-16 h-16 text-[#D4AF37]/40" />
                    )}
                    
                    <div className="absolute top-3 right-3">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button size="icon" variant="ghost" className="h-8 w-8 bg-black/40 hover:bg-black/60" data-testid={`book-menu-${book.id}`}>
                            <MoreVertical className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="bg-[#1A1A1A] border-white/10">
                          <DropdownMenuItem onClick={() => navigate(`/editor/${book.id}`)} className="cursor-pointer">
                            <Edit className="w-4 h-4 mr-2" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => navigate(`/cover/${book.id}`)} className="cursor-pointer">
                            <Palette className="w-4 h-4 mr-2" />
                            Cover
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => navigate(`/export/${book.id}`)} className="cursor-pointer">
                            <Download className="w-4 h-4 mr-2" />
                            Export
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => deleteBook(book.id)} className="text-red-400 cursor-pointer" data-testid={`delete-book-${book.id}`}>
                            <Trash2 className="w-4 h-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                  
                  <div className="p-5">
                    <h3 
                      className="text-lg font-semibold mb-1 truncate cursor-pointer hover:text-[#D4AF37] transition-colors"
                      onClick={() => navigate(`/editor/${book.id}`)}
                      style={{ fontFamily: 'Playfair Display, serif' }}
                    >
                      {book.title}
                    </h3>
                    <p className="text-sm text-[#E5E5E0]/60 line-clamp-2 mb-3">{book.description || 'No description'}</p>
                    
                    <div className="flex items-center gap-4 text-xs text-[#E5E5E0]/40">
                      <span className="flex items-center gap-1">
                        <FileText className="w-3 h-3" />
                        {book.chapter_count} chapters
                      </span>
                      <span className="flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {book.word_count.toLocaleString()} words
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </main>
    </div>
  );
};

export default Dashboard;
