import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { ScrollArea } from '../components/ui/scroll-area';
import { Slider } from '../components/ui/slider';
import { 
  ArrowLeft, PenTool, Trash2, Download, Upload, Save, 
  Undo, Palette, Loader2
} from 'lucide-react';
import axios from 'axios';
import { toast } from 'sonner';

const API = `${process.env.REACT_APP_BACKEND_URL}/api`;

const SignatureStudio = () => {
  const canvasRef = useRef(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [strokeColor, setStrokeColor] = useState('#0A0A0A');
  const [strokeWidth, setStrokeWidth] = useState(3);
  const [signatures, setSignatures] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [signatureName, setSignatureName] = useState('');
  const fileInputRef = useRef(null);

  const colorPresets = ['#0A0A0A', '#1A1A2E', '#2D3436', '#D4AF37', '#4A4E69', '#C44536'];

  useEffect(() => {
    initCanvas();
    fetchSignatures();
  }, []);

  const initCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
  };

  const fetchSignatures = async () => {
    try {
      const res = await axios.get(`${API}/signatures`);
      setSignatures(res.data);
    } catch (err) {
      console.error('Failed to fetch signatures');
    } finally {
      setLoading(false);
    }
  };

  const startDrawing = (e) => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches?.[0]?.clientX) - rect.left;
    const y = (e.clientY || e.touches?.[0]?.clientY) - rect.top;
    
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.strokeStyle = strokeColor;
    ctx.lineWidth = strokeWidth;
    setIsDrawing(true);
  };

  const draw = (e) => {
    if (!isDrawing) return;
    
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    const rect = canvas.getBoundingClientRect();
    const x = (e.clientX || e.touches?.[0]?.clientX) - rect.left;
    const y = (e.clientY || e.touches?.[0]?.clientY) - rect.top;
    
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const clearCanvas = () => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    ctx.fillStyle = '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);
  };

  const saveSignature = async () => {
    if (!signatureName.trim()) {
      toast.error('Please enter a name for your signature');
      return;
    }

    setSaving(true);
    try {
      const canvas = canvasRef.current;
      const data = canvas.toDataURL('image/png');
      
      const res = await axios.post(`${API}/signatures`, {
        name: signatureName,
        data,
      });
      
      setSignatures([res.data, ...signatures]);
      setSignatureName('');
      clearCanvas();
      toast.success('Signature saved!');
    } catch (err) {
      toast.error('Failed to save signature');
    } finally {
      setSaving(false);
    }
  };

  const deleteSignature = async (sigId) => {
    if (!window.confirm('Delete this signature?')) return;
    try {
      await axios.delete(`${API}/signatures/${sigId}`);
      setSignatures(signatures.filter(s => s.id !== sigId));
      toast.success('Signature deleted');
    } catch (err) {
      toast.error('Failed to delete signature');
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        ctx.fillStyle = '#FFFFFF';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Scale image to fit canvas while maintaining aspect ratio
        const scale = Math.min(canvas.width / img.width, canvas.height / img.height) * 0.8;
        const x = (canvas.width - img.width * scale) / 2;
        const y = (canvas.height - img.height * scale) / 2;
        ctx.drawImage(img, x, y, img.width * scale, img.height * scale);
      };
      img.src = event.target.result;
    };
    reader.readAsDataURL(file);
  };

  const downloadSignature = (sigData, name) => {
    const link = document.createElement('a');
    link.download = `${name}.png`;
    link.href = sigData;
    link.click();
  };

  return (
    <div className="min-h-screen bg-[#0A0A0A] text-[#F5F5F0] flex">
      {/* Sidebar - Controls */}
      <aside className="w-72 border-r border-white/5 flex flex-col">
        <div className="p-4 border-b border-white/5">
          <Link to="/dashboard" className="flex items-center gap-2 text-sm text-[#E5E5E0]/60 hover:text-[#E5E5E0] mb-4" data-testid="back-to-dashboard">
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </Link>
          <h2 className="text-lg font-semibold flex items-center gap-2" style={{ fontFamily: 'Playfair Display, serif' }}>
            <PenTool className="w-5 h-5 text-[#D4AF37]" />
            Signature Studio
          </h2>
        </div>

        <div className="p-4 space-y-6">
          <div className="space-y-2">
            <Label>Stroke Color</Label>
            <div className="flex flex-wrap gap-2">
              {colorPresets.map((color) => (
                <button
                  key={color}
                  onClick={() => setStrokeColor(color)}
                  className={`w-8 h-8 rounded-lg border-2 transition-all ${
                    strokeColor === color ? 'border-[#D4AF37] scale-110' : 'border-transparent'
                  }`}
                  style={{ backgroundColor: color }}
                  data-testid={`color-${color.replace('#', '')}`}
                />
              ))}
              <Input
                type="color"
                value={strokeColor}
                onChange={(e) => setStrokeColor(e.target.value)}
                className="w-8 h-8 p-0 border-0 cursor-pointer"
                data-testid="custom-color-picker"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label>Stroke Width: {strokeWidth}px</Label>
            <Slider
              value={[strokeWidth]}
              onValueChange={([v]) => setStrokeWidth(v)}
              min={1}
              max={10}
              step={1}
              className="py-2"
              data-testid="stroke-width-slider"
            />
          </div>

          <div className="space-y-2">
            <Label>Signature Name</Label>
            <Input
              placeholder="My Signature"
              value={signatureName}
              onChange={(e) => setSignatureName(e.target.value)}
              className="bg-white/5 border-white/10 focus:border-[#D4AF37]"
              data-testid="signature-name-input"
            />
          </div>

          <div className="flex gap-2">
            <Button onClick={clearCanvas} variant="outline" className="flex-1 border-white/10" data-testid="clear-canvas-btn">
              <Undo className="w-4 h-4 mr-1" />
              Clear
            </Button>
            <Button onClick={() => fileInputRef.current?.click()} variant="outline" className="flex-1 border-white/10" data-testid="upload-btn">
              <Upload className="w-4 h-4 mr-1" />
              Upload
            </Button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              onChange={handleFileUpload}
              className="hidden"
            />
          </div>

          <Button 
            onClick={saveSignature} 
            disabled={saving || !signatureName.trim()}
            className="w-full gold-shimmer text-[#0A0A0A] glow-gold"
            data-testid="save-signature-btn"
          >
            {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
            Save Signature
          </Button>
        </div>

        {/* Saved Signatures */}
        <div className="flex-1 border-t border-white/5 mt-4">
          <div className="p-4">
            <h3 className="text-sm font-medium text-[#E5E5E0]/60 mb-3">Saved Signatures</h3>
            <ScrollArea className="h-[300px]">
              {loading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="w-6 h-6 animate-spin text-[#D4AF37]" />
                </div>
              ) : signatures.length === 0 ? (
                <p className="text-sm text-[#E5E5E0]/40 text-center py-8">No signatures yet</p>
              ) : (
                <div className="space-y-3">
                  {signatures.map((sig) => (
                    <div
                      key={sig.id}
                      className="group p-2 rounded-lg bg-white/5 border border-white/5 hover:border-[#D4AF37]/30 transition-colors"
                      data-testid={`signature-${sig.id}`}
                    >
                      <div className="aspect-[3/1] rounded bg-white mb-2 overflow-hidden">
                        <img src={sig.data} alt={sig.name} className="w-full h-full object-contain" />
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm truncate">{sig.name}</span>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button
                            onClick={() => downloadSignature(sig.data, sig.name)}
                            className="p-1 hover:text-[#D4AF37]"
                            data-testid={`download-sig-${sig.id}`}
                          >
                            <Download className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deleteSignature(sig.id)}
                            className="p-1 text-red-400 hover:text-red-300"
                            data-testid={`delete-sig-${sig.id}`}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </ScrollArea>
          </div>
        </div>
      </aside>

      {/* Canvas Area */}
      <main className="flex-1 flex items-center justify-center p-8 bg-[#1A1A1A]">
        <div className="bg-[#0A0A0A] rounded-2xl p-8 shadow-2xl">
          <p className="text-sm text-[#E5E5E0]/40 mb-4 text-center">Draw your signature below</p>
          <canvas
            ref={canvasRef}
            width={600}
            height={200}
            className="signature-canvas rounded-xl bg-white"
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
            data-testid="signature-canvas"
          />
          <p className="text-xs text-[#E5E5E0]/30 mt-4 text-center">
            Tip: Use a stylus or finger on touch devices for best results
          </p>
        </div>
      </main>
    </div>
  );
};

export default SignatureStudio;
