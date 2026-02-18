import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { ScrollArea } from '../components/ui/scroll-area';
import { Slider } from '../components/ui/slider';
import { 
  ArrowLeft, Calculator, DollarSign, BookOpen, Loader2,
  TrendingUp, Info, CheckCircle
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const RoyaltyCalculator = () => {
  const [bookPrice, setBookPrice] = useState(9.99);
  const [pageCount, setPageCount] = useState(200);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);

  const calculateRoyalties = async () => {
    setLoading(true);
    try {
      const res = await axios.post(`${API}/calculator/royalties`, {
        book_price: bookPrice,
        page_count: pageCount,
      });
      setResults(res.data);
      toast.success('Royalties calculated!');
    } catch (err) {
      toast.error('Calculation failed');
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(amount);
  };

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
            <Calculator className="w-7 h-7 md:w-8 md:h-8 text-[#D4AF37]" />
            Royalty Calculator
          </h1>
          <p className="text-[#E5E5E0]/60 mt-1 text-sm md:text-base">Calculate your earnings across all major publishing platforms</p>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-4 md:px-6 py-6 md:py-8">
        {/* Input Section */}
        <div className="glass rounded-xl p-4 md:p-6 mb-6 md:mb-8">
          <h2 className="text-lg md:text-xl font-semibold mb-4 md:mb-6" style={{ fontFamily: 'Playfair Display, serif' }}>
            Enter Your Book Details
          </h2>
          
          <div className="grid md:grid-cols-2 gap-6 md:gap-8">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-base">Book Price: {formatCurrency(bookPrice)}</Label>
                <Slider
                  value={[bookPrice]}
                  onValueChange={([v]) => setBookPrice(v)}
                  min={0.99}
                  max={29.99}
                  step={0.50}
                  className="py-4"
                  data-testid="price-slider"
                />
                <div className="flex justify-between text-xs text-[#E5E5E0]/40">
                  <span>$0.99</span>
                  <span className="text-[#D4AF37]">Sweet spot: $2.99 - $9.99</span>
                  <span>$29.99</span>
                </div>
              </div>
              
              <div className="space-y-2">
                <Label className="text-base">Page Count: {pageCount} pages</Label>
                <Slider
                  value={[pageCount]}
                  onValueChange={([v]) => setPageCount(v)}
                  min={24}
                  max={800}
                  step={10}
                  className="py-4"
                  data-testid="pages-slider"
                />
                <div className="flex justify-between text-xs text-[#E5E5E0]/40">
                  <span>24 pages</span>
                  <span>800 pages</span>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-[#D4AF37]/10 border border-[#D4AF37]/20">
                <div className="flex items-start gap-3">
                  <Info className="w-5 h-5 text-[#D4AF37] shrink-0 mt-0.5" />
                  <div>
                    <h4 className="font-medium text-[#D4AF37] mb-1">Pricing Tips</h4>
                    <ul className="text-sm text-[#E5E5E0]/70 space-y-1">
                      <li>• $2.99-$9.99 = 70% royalty on Amazon</li>
                      <li>• Below $2.99 = 35% royalty</li>
                      <li>• Print costs increase with page count</li>
                      <li>• Compare across platforms before deciding</li>
                    </ul>
                  </div>
                </div>
              </div>

              <Button 
                onClick={calculateRoyalties}
                disabled={loading}
                className="w-full bg-[#D4AF37] hover:bg-[#D4AF37]/80 text-[#0A0A0A] h-14 text-lg font-semibold"
                data-testid="calculate-btn"
              >
                {loading ? (
                  <><Loader2 className="w-5 h-5 animate-spin mr-2" /> Calculating...</>
                ) : (
                  <><Calculator className="w-5 h-5 mr-2" /> CALCULATE ROYALTIES</>
                )}
              </Button>
            </div>
          </div>
        </div>

        {/* Results Section */}
        {results && (
          <>
            {/* Summary */}
            <div className="glass rounded-xl p-4 md:p-6 mb-6">
              <div className="flex items-center gap-2 mb-4">
                <CheckCircle className="w-5 h-5 text-green-500" />
                <h3 className="text-lg font-semibold" style={{ fontFamily: 'Playfair Display, serif' }}>
                  Recommendation
                </h3>
              </div>
              <p className="text-[#E5E5E0]/80 text-sm md:text-base leading-relaxed">{results.recommendation}</p>
              
              <div className="mt-4 p-3 rounded-lg bg-white/5">
                <p className="text-sm text-[#E5E5E0]/60">
                  Estimated print cost: <span className="text-[#D4AF37] font-semibold">{formatCurrency(results.input.estimated_print_cost)}</span> per book
                </p>
              </div>
            </div>

            {/* Platform Comparison */}
            <h3 className="text-lg md:text-xl font-semibold mb-4" style={{ fontFamily: 'Playfair Display, serif' }}>
              Royalty per Sale by Platform
            </h3>
            
            <div className="grid gap-3 md:gap-4 mb-8">
              {Object.entries(results.platforms).map(([key, platform]) => (
                <div 
                  key={key}
                  className="glass rounded-xl p-4 flex flex-col md:flex-row md:items-center justify-between gap-3"
                  data-testid={`platform-${key}`}
                >
                  <div className="flex-1">
                    <h4 className="font-semibold text-base md:text-lg">{platform.name}</h4>
                    <p className="text-xs md:text-sm text-[#E5E5E0]/50">{platform.notes}</p>
                  </div>
                  
                  <div className="flex items-center gap-4">
                    {platform.print_cost && (
                      <div className="text-right">
                        <p className="text-xs text-[#E5E5E0]/40">Print Cost</p>
                        <p className="text-sm text-[#E5E5E0]/70">{formatCurrency(platform.print_cost)}</p>
                      </div>
                    )}
                    <div className="text-right min-w-[80px]">
                      <p className="text-xs text-[#E5E5E0]/40">Royalty</p>
                      <p className="text-xl md:text-2xl font-bold text-[#D4AF37]">{formatCurrency(platform.royalty)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Projections */}
            <h3 className="text-lg md:text-xl font-semibold mb-4" style={{ fontFamily: 'Playfair Display, serif' }}>
              <TrendingUp className="w-5 h-5 inline mr-2 text-[#D4AF37]" />
              Income Projections
            </h3>
            
            <div className="grid md:grid-cols-3 gap-4 mb-8">
              <div className="glass rounded-xl p-4 md:p-6 text-center">
                <p className="text-sm text-[#E5E5E0]/50 mb-2">100 Sales/Month</p>
                <p className="text-2xl md:text-3xl font-bold text-[#D4AF37]">
                  {formatCurrency(results.projections.monthly_100_sales.amazon_kdp_ebook)}
                </p>
                <p className="text-xs text-[#E5E5E0]/40 mt-1">Amazon eBook</p>
              </div>
              <div className="glass rounded-xl p-4 md:p-6 text-center">
                <p className="text-sm text-[#E5E5E0]/50 mb-2">500 Sales/Month</p>
                <p className="text-2xl md:text-3xl font-bold text-[#D4AF37]">
                  {formatCurrency(results.projections.monthly_500_sales.amazon_kdp_ebook)}
                </p>
                <p className="text-xs text-[#E5E5E0]/40 mt-1">Amazon eBook</p>
              </div>
              <div className="glass rounded-xl p-4 md:p-6 text-center">
                <p className="text-sm text-[#E5E5E0]/50 mb-2">1,000 Sales/Year</p>
                <p className="text-2xl md:text-3xl font-bold text-[#D4AF37]">
                  {formatCurrency(results.projections.yearly_1000_sales.amazon_kdp_ebook)}
                </p>
                <p className="text-xs text-[#E5E5E0]/40 mt-1">Amazon eBook</p>
              </div>
            </div>

            {/* Comparison Table */}
            <h3 className="text-lg md:text-xl font-semibold mb-4" style={{ fontFamily: 'Playfair Display, serif' }}>
              Multi-Platform Earnings (100 sales/month)
            </h3>
            
            <ScrollArea className="w-full">
              <div className="glass rounded-xl overflow-hidden min-w-[600px]">
                <table className="w-full">
                  <thead className="bg-white/5">
                    <tr>
                      <th className="text-left p-3 md:p-4 text-sm font-medium">Platform</th>
                      <th className="text-right p-3 md:p-4 text-sm font-medium">Per Sale</th>
                      <th className="text-right p-3 md:p-4 text-sm font-medium">100/month</th>
                      <th className="text-right p-3 md:p-4 text-sm font-medium">500/month</th>
                      <th className="text-right p-3 md:p-4 text-sm font-medium">1000/year</th>
                    </tr>
                  </thead>
                  <tbody>
                    {Object.entries(results.platforms).map(([key, platform], i) => (
                      <tr key={key} className={i % 2 === 0 ? 'bg-white/[0.02]' : ''}>
                        <td className="p-3 md:p-4 text-sm">{platform.name}</td>
                        <td className="p-3 md:p-4 text-sm text-right text-[#D4AF37]">{formatCurrency(platform.royalty)}</td>
                        <td className="p-3 md:p-4 text-sm text-right">{formatCurrency(results.projections.monthly_100_sales[key])}</td>
                        <td className="p-3 md:p-4 text-sm text-right">{formatCurrency(results.projections.monthly_500_sales[key])}</td>
                        <td className="p-3 md:p-4 text-sm text-right">{formatCurrency(results.projections.yearly_1000_sales[key])}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </ScrollArea>
          </>
        )}
      </main>
    </div>
  );
};

export default RoyaltyCalculator;
