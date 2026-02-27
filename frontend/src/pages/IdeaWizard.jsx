import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import axios from 'axios';
import { toast } from 'sonner';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Textarea } from '../components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { ArrowLeft, WandSparkles, BookOpen, Loader2, Sparkles } from 'lucide-react';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const genres = ['Fantasy', 'Sci-Fi', 'Mystery', 'Thriller', 'Romance', 'Historical Fiction', 'Self-Help', 'Business', 'Memoir'];
const tones = ['Cinematic', 'Warm', 'Dark', 'Playful', 'Epic', 'Conversational', 'Academic'];
const audiences = ['Young Adults', 'General Adult Readers', 'Professionals', 'Beginners', 'Writers & Creators', 'Teens'];

export default function IdeaWizard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    title_hint: '',
    idea: '',
    genre: 'Fantasy',
    tone: 'Cinematic',
    audience: 'General Adult Readers',
    chapter_count: 8,
  });

  const updateField = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const launchWizard = async () => {
    if (!form.idea.trim()) {
      toast.error('Please describe your core book idea first.');
      return;
    }

    setLoading(true);
    try {
      const res = await axios.post(`${API}/ideas/wizard-create`, {
        title_hint: form.title_hint,
        idea: form.idea,
        genre: form.genre,
        tone: form.tone,
        audience: form.audience,
        chapter_count: Number(form.chapter_count),
      });

      toast.success(`Draft ready: ${res.data.chapter_count} chapters generated`);
      navigate(`/editor/${res.data.book_id}?focus=1`);
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to generate your draft');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#F5F5F0]">
      <div className="max-w-6xl mx-auto px-4 md:px-8 py-8 md:py-12">
        <Link
          to="/dashboard"
          className="inline-flex items-center gap-2 text-sm text-[#E5E5E0]/70 hover:text-[#E5E5E0] mb-8"
          data-testid="idea-wizard-back-link"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Dashboard
        </Link>

        <div className="grid lg:grid-cols-[1.2fr_0.8fr] gap-6 lg:gap-8 items-start">
          <section className="rounded-2xl border border-[#D4AF37]/20 bg-gradient-to-br from-[#1B1B1B] via-[#101010] to-[#0A0A0A] p-6 md:p-8">
            <div className="flex items-start gap-4 mb-6">
              <div className="w-12 h-12 rounded-xl bg-[#D4AF37]/20 border border-[#D4AF37]/30 flex items-center justify-center">
                <WandSparkles className="w-6 h-6 text-[#D4AF37]" />
              </div>
              <div>
                <h1 className="text-4xl sm:text-5xl font-bold tracking-tight" style={{ fontFamily: 'Playfair Display, serif' }} data-testid="idea-wizard-title">
                  Start from Idea
                </h1>
                <p className="text-sm md:text-base text-[#E5E5E0]/70 mt-2" data-testid="idea-wizard-subtitle">
                  Build a full chapter outline + first chapter draft in one step, then auto-open Focus Mode.
                </p>
              </div>
            </div>

            <div className="space-y-5">
              <div className="space-y-2">
                <Label htmlFor="title_hint">Title hint (optional)</Label>
                <Input
                  id="title_hint"
                  value={form.title_hint}
                  onChange={(e) => updateField('title_hint', e.target.value)}
                  placeholder="e.g. The Last Ember"
                  className="bg-white/5 border-white/10 focus:border-[#D4AF37]"
                  data-testid="idea-wizard-title-hint-input"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="idea">Core idea</Label>
                <Textarea
                  id="idea"
                  value={form.idea}
                  onChange={(e) => updateField('idea', e.target.value)}
                  placeholder="Describe your concept, protagonist, conflict, and setting..."
                  className="min-h-[170px] bg-white/5 border-white/10 focus:border-[#D4AF37]"
                  data-testid="idea-wizard-core-idea-textarea"
                />
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Genre</Label>
                  <Select value={form.genre} onValueChange={(value) => updateField('genre', value)}>
                    <SelectTrigger className="bg-white/5 border-white/10" data-testid="idea-wizard-genre-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#141414] border-[#D4AF37]/30" data-testid="idea-wizard-genre-options">
                      {genres.map((genre) => (
                        <SelectItem key={genre} value={genre} data-testid={`idea-wizard-genre-option-${genre.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}>
                          {genre}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Tone</Label>
                  <Select value={form.tone} onValueChange={(value) => updateField('tone', value)}>
                    <SelectTrigger className="bg-white/5 border-white/10" data-testid="idea-wizard-tone-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#141414] border-[#D4AF37]/30" data-testid="idea-wizard-tone-options">
                      {tones.map((tone) => (
                        <SelectItem key={tone} value={tone} data-testid={`idea-wizard-tone-option-${tone.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}>
                          {tone}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Audience</Label>
                  <Select value={form.audience} onValueChange={(value) => updateField('audience', value)}>
                    <SelectTrigger className="bg-white/5 border-white/10" data-testid="idea-wizard-audience-select">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent className="bg-[#141414] border-[#D4AF37]/30" data-testid="idea-wizard-audience-options">
                      {audiences.map((audience) => (
                        <SelectItem key={audience} value={audience} data-testid={`idea-wizard-audience-option-${audience.toLowerCase().replace(/[^a-z0-9]+/g, '-')}`}>
                          {audience}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="chapter_count">Chapter count</Label>
                  <Input
                    id="chapter_count"
                    type="number"
                    min={3}
                    max={20}
                    value={form.chapter_count}
                    onChange={(e) => updateField('chapter_count', Math.min(20, Math.max(3, Number(e.target.value) || 8)))}
                    className="bg-white/5 border-white/10 focus:border-[#D4AF37]"
                    data-testid="idea-wizard-chapter-count-input"
                  />
                </div>
              </div>

              <Button
                onClick={launchWizard}
                disabled={loading}
                className="w-full h-14 rounded-full gold-shimmer text-[#0A0A0A] text-base font-semibold"
                data-testid="idea-wizard-generate-button"
              >
                {loading ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <Sparkles className="w-5 h-5 mr-2" />}
                Generate Outline & First Draft
              </Button>
            </div>
          </section>

          <aside className="rounded-2xl border border-white/10 bg-[#111111] p-6 md:p-7" data-testid="idea-wizard-value-panel">
            <h2 className="text-base md:text-lg font-semibold mb-4" style={{ fontFamily: 'Playfair Display, serif' }}>
              What you get instantly
            </h2>
            <ul className="space-y-3 text-sm text-[#E5E5E0]/80">
              <li className="flex items-start gap-2" data-testid="idea-wizard-benefit-outline">
                <BookOpen className="w-4 h-4 text-[#D4AF37] mt-0.5" />
                A complete chapter outline tailored to your concept.
              </li>
              <li className="flex items-start gap-2" data-testid="idea-wizard-benefit-draft">
                <BookOpen className="w-4 h-4 text-[#D4AF37] mt-0.5" />
                A strong first chapter draft so you never start from a blank page.
              </li>
              <li className="flex items-start gap-2" data-testid="idea-wizard-benefit-focus-mode">
                <BookOpen className="w-4 h-4 text-[#D4AF37] mt-0.5" />
                Auto-open in Focus Mode for uninterrupted writing momentum.
              </li>
            </ul>
          </aside>
        </div>
      </div>
    </div>
  );
}