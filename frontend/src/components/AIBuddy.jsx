import { useState, useEffect } from 'react';
import { Sparkles, X, MessageCircle, Lightbulb, HelpCircle } from 'lucide-react';
import { Button } from './ui/button';
import axios from 'axios';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const AIBuddy = ({ content, onSuggestion, enabled = true }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(true);
  const [suggestion, setSuggestion] = useState(null);
  const [loading, setLoading] = useState(false);
  const [lastAnalyzed, setLastAnalyzed] = useState('');

  useEffect(() => {
    if (!enabled || !content || content === lastAnalyzed) return;
    
    const timer = setTimeout(() => {
      if (content.length > 200 && content !== lastAnalyzed) {
        analyzeContent();
        setLastAnalyzed(content);
      }
    }, 10000);

    return () => clearTimeout(timer);
  }, [content, enabled]);

  const analyzeContent = async () => {
    if (loading) return;
    setLoading(true);
    try {
      const res = await axios.post(`${API}/ai/analyze`, { content: content.slice(0, 3000) });
      if (res.data.suggestion) {
        setSuggestion(res.data);
        setIsMinimized(false);
      }
    } catch (err) {
      console.log('AI analysis skipped');
    } finally {
      setLoading(false);
    }
  };

  const askQuestion = async (question) => {
    setLoading(true);
    try {
      const res = await axios.post(`${API}/ai/suggest`, {
        prompt: question,
        context: content?.slice(0, 2000) || '',
        type: 'content'
      });
      setSuggestion({ type: 'answer', message: res.data.result });
      setIsMinimized(false);
    } catch (err) {
      setSuggestion({ type: 'error', message: 'Could not get answer' });
    } finally {
      setLoading(false);
    }
  };

  const quickQuestions = [
    "How can I improve this paragraph?",
    "Suggest a better opening line",
    "What's missing from this chapter?",
    "Help me with dialogue"
  ];

  if (!enabled) return null;

  return (
    <div className="fixed bottom-6 right-6 z-50">
      {!isMinimized && (
        <div className="mb-3 w-80 bg-[#1A1A1A] border border-[#D4AF37]/30 rounded-2xl shadow-2xl overflow-hidden animate-fade-in-up">
          <div className="p-3 bg-[#D4AF37]/10 border-b border-white/10 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Sparkles className="w-5 h-5 text-[#D4AF37]" />
              <span className="font-semibold text-[#F5F5F0]">AI Writing Buddy</span>
            </div>
            <button onClick={() => setIsMinimized(true)} className="text-[#E5E5E0]/60 hover:text-white">
              <X className="w-4 h-4" />
            </button>
          </div>
          
          <div className="p-4 max-h-64 overflow-y-auto">
            {suggestion ? (
              <div className="space-y-3">
                <div className={`p-3 rounded-lg ${
                  suggestion.type === 'structure' ? 'bg-blue-500/10 border border-blue-500/20' :
                  suggestion.type === 'improvement' ? 'bg-green-500/10 border border-green-500/20' :
                  suggestion.type === 'question' ? 'bg-purple-500/10 border border-purple-500/20' :
                  'bg-white/5 border border-white/10'
                }`}>
                  <p className="text-sm text-[#E5E5E0]/90">{suggestion.message}</p>
                </div>
                {suggestion.action && (
                  <Button 
                    onClick={() => onSuggestion?.(suggestion.action)}
                    size="sm"
                    className="w-full bg-[#D4AF37] hover:bg-[#D4AF37]/80 text-[#0A0A0A]"
                  >
                    Apply Suggestion
                  </Button>
                )}
                <button 
                  onClick={() => setSuggestion(null)}
                  className="text-xs text-[#E5E5E0]/50 hover:text-[#E5E5E0] w-full text-center"
                >
                  Dismiss
                </button>
              </div>
            ) : (
              <div className="space-y-3">
                <p className="text-sm text-[#E5E5E0]/70">Quick questions:</p>
                {quickQuestions.map((q, i) => (
                  <button
                    key={i}
                    onClick={() => askQuestion(q)}
                    disabled={loading}
                    className="w-full text-left p-2 rounded-lg bg-white/5 hover:bg-white/10 text-sm text-[#E5E5E0]/80 transition-colors"
                  >
                    <HelpCircle className="w-3 h-3 inline mr-2 text-[#D4AF37]" />
                    {q}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      <button
        onClick={() => setIsMinimized(!isMinimized)}
        className={`w-14 h-14 rounded-full flex items-center justify-center shadow-lg transition-all hover:scale-110 ${
          loading ? 'bg-[#D4AF37] animate-pulse' : 
          suggestion ? 'bg-[#D4AF37] glow-gold-strong' : 
          'bg-[#1A1A1A] border-2 border-[#D4AF37]/50 hover:border-[#D4AF37]'
        }`}
      >
        {loading ? (
          <div className="w-6 h-6 border-2 border-[#0A0A0A] border-t-transparent rounded-full animate-spin" />
        ) : suggestion ? (
          <Lightbulb className="w-6 h-6 text-[#0A0A0A]" />
        ) : (
          <MessageCircle className="w-6 h-6 text-[#D4AF37]" />
        )}
      </button>
    </div>
  );
};

export default AIBuddy;
