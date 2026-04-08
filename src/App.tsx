import { useState, useEffect } from 'react';
import html2canvas from 'html2canvas';
import { quotes } from './quotes';
import type { DestinyResult } from './quotes';

interface UserData {
  handle: string;
}

interface CookieState {
  lastCrackTime: number | null;
  currentResult: DestinyResult | null;
}

const renderRing = (count: number, distance: number) => {
  const colors = ['#f43f5e', '#eab308', '#22c55e', '#3b82f6', '#a855f7'];
  return Array.from({ length: count }).map((_, i) => {
    const color = colors[i % colors.length];
    return (
      <div 
        key={`${distance}-${i}`} 
        className="bulb" 
        style={{ 
          '--i': i, 
          '--count': count, 
          '--dist': `${distance}px`,
          '--color': color,
          backgroundColor: color,
        } as React.CSSProperties} 
      />
    );
  });
};

function App() {
  const [user, setUser] = useState<UserData | null>(null);
  const [cookieState, setCookieState] = useState<CookieState>({
    lastCrackTime: null,
    currentResult: null
  });
  
  const [timeLeft, setTimeLeft] = useState<{ hours: string; mins: string; secs: string } | null>(null);
  const [baseMetric, setBaseMetric] = useState(14024);
  const [handleInput, setHandleInput] = useState<string>('');
  
  // Machine States
  const [isLoggingIn, setIsLoggingIn] = useState<boolean>(false);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);
  const [ticketReady, setTicketReady] = useState<boolean>(false);
  const [showModal, setShowModal] = useState<boolean>(false);

  useEffect(() => {
    const savedUser = localStorage.getItem('twitter_user');
    if (savedUser) setUser(JSON.parse(savedUser));

    const savedCookie = localStorage.getItem('cookie_state');
    if (savedCookie) setCookieState(JSON.parse(savedCookie));

    const metricInterval = setInterval(() => {
      if (Math.random() > 0.5) setBaseMetric(prev => prev + 1);
    }, 4000);
    return () => clearInterval(metricInterval);
  }, []);

  useEffect(() => {
    if (!cookieState.lastCrackTime) return;

    const interval = setInterval(() => {
      const now = Date.now();
      const nextAvailableTime = cookieState.lastCrackTime! + 24 * 60 * 60 * 1000;
      const difference = nextAvailableTime - now;

      if (difference <= 0) {
        setTimeLeft(null);
      } else {
        const hours = Math.floor((difference / (1000 * 60 * 60)) % 24).toString().padStart(2, '0');
        const mins = Math.floor((difference / 1000 / 60) % 60).toString().padStart(2, '0');
        const secs = Math.floor((difference / 1000) % 60).toString().padStart(2, '0');
        setTimeLeft({ hours, mins, secs });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [cookieState.lastCrackTime]);

  const handleLogin = (e: React.FormEvent) => {
    e.preventDefault();
    if (!handleInput.trim()) return;
    
    setIsLoggingIn(true);
    // Simulate a secure redirect and callback
    setTimeout(() => {
      const handle = handleInput.startsWith('@') ? handleInput : `@${handleInput}`;
      const mockUser = { handle };
      setUser(mockUser);
      localStorage.setItem('twitter_user', JSON.stringify(mockUser));
      setIsLoggingIn(false);
      setHandleInput('');
    }, 1200);
  };

  const handleLogout = () => {
    localStorage.removeItem('twitter_user');
    setUser(null);
    // We keep cookieState so they can't log out to "cheat" the 24h limit
  };

  const insertCoin = async () => {
    if (isAnalyzing || ticketReady || showModal) return;
    
    setIsAnalyzing(true);
    setTicketReady(false);

    // Make the lights chase for 4 seconds!
    await new Promise(r => setTimeout(r, 4000));
    
    const randomResult = quotes[Math.floor(Math.random() * quotes.length)];

    const newState: CookieState = {
      lastCrackTime: Date.now(),
      currentResult: randomResult
    };

    setCookieState(newState);
    localStorage.setItem('cookie_state', JSON.stringify(newState));
    
    setIsAnalyzing(false);
    setTicketReady(true);

    // Zoom into the ticket 1.5 seconds later
    setTimeout(() => {
      setShowModal(true);
    }, 1500);
  };

  const canCrack = !cookieState.lastCrackTime || (Date.now() - cookieState.lastCrackTime >= 24 * 60 * 60 * 1000);

  const shareToX = async () => {
    if (!cookieState.currentResult) return;

    const ticketElement = document.getElementById('print-ticket');
    if (ticketElement) {
        try {
            const canvas = await html2canvas(ticketElement, { scale: 2, backgroundColor: null });
            const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, 'image/png'));
            
            if (blob) {
                try {
                    await navigator.clipboard.write([
                        new ClipboardItem({ 'image/png': blob })
                    ]);
                    alert("Ticket image copied to your clipboard! Just hit Paste (Ctrl+V) when X opens to attach it.");
                } catch (e) {
                    const dlUrl = URL.createObjectURL(blob);
                    const a = document.createElement('a');
                    a.href = dlUrl;
                    a.download = 'destiny-ticket.png';
                    a.click();
                    alert("Ticket image downloaded! You can attach it to your post.");
                }
            }
        } catch (error) {
            console.error("Screenshot failed:", error);
        }
    }

    const text = `I just weighed my timeline's aura on the Destiny Scale.\n\n"${cookieState.currentResult.quote}"\n\n`;
    const shareUrl = `https://twitter.com/intent/tweet?text=${encodeURIComponent(text)}&url=${encodeURIComponent("https://destiny-scale.app")}`;
    window.open(shareUrl, '_blank');
  };

  return (
    <div className="app-container">
      
      {/* LEFT CONTENT PANEL */}
      <div className="left-hero-panel">
        <h2 className="hero-brand">destiny.</h2>
        <h1 className="hero-headline">What does your timeline weigh?</h1>
        <p className="hero-desc">
          Like the mechanical fortune tellers of the penny arcades, this vintage scale weighs the aura of your daily profile. Let the machine reveal what the fates have written.
        </p>
        <div className="hero-badge">Only 1 coin admitted every 24 hours.</div>
        
        <div className="stats-box">
          <div className="stats-label">Destinies Checked Today</div>
          <div className="stats-number">{baseMetric.toLocaleString()}</div>
        </div>
      </div>

      {/* THE CSS ART MACHINE */}
      <div className={`machine-container ${isAnalyzing ? 'analyzing' : ''} ${ticketReady ? 'ticket-ready' : ''}`}>
        <div className="machine-dome-frame">
          <div className="machine-dome">
            <div className="hypno-wheel"></div>
            <div className="led-layer">
              {renderRing(8, 40)}
              {renderRing(16, 85)}
              {renderRing(24, 130)}
            </div>
          </div>
        </div>
        
        <div className="machine-body">
          <div className="coin-plate">
            <div className="coin-slot-text">Insert Coin</div>
            <div className="coin-slot"></div>
          </div>
          
          <div className="ticket-dispenser">
            <div className="ticket-slot"></div>
            <div className="ticket-chute">
              <div className="mini-ticket"></div>
            </div>
          </div>
        </div>
        <div className="machine-base"></div>
      </div>

      {/* USER INTERACTION PANEL */}
      <div className="controls-panel">
        {!user ? (
          <>
            <h1 className="panel-title">Destiny Scale</h1>
            <p className="panel-sub">
              Connect your X account to power the machine. Find out what your timeline weighs in fate.
            </p>
            <form className="login-form" onSubmit={handleLogin}>
              <input 
                type="text" 
                className="handle-input" 
                placeholder="Enter your X handle..." 
                value={handleInput}
                onChange={(e) => setHandleInput(e.target.value)}
                disabled={isLoggingIn}
              />
              <button type="submit" className="btn" disabled={isLoggingIn || !handleInput.trim()}>
                {isLoggingIn ? "Verifying..." : "Analyze Profile"}
              </button>
            </form>
          </>
        ) : (
          <>
            <div className="user-indicator">
              <span>Connected as <strong className="user-handle-text">{user.handle}</strong></span>
              <button onClick={handleLogout} className="logout-btn">Change Account</button>
            </div>
            {canCrack ? (
              <>
                <h1 className="panel-title">Ready.</h1>
                <p className="panel-sub">
                  Profile {user.handle} connected.<br/>Insert coin to scan your aura and dispense your daily reading.
                </p>
                <button 
                  className="btn" 
                  onClick={insertCoin}
                  disabled={isAnalyzing || ticketReady}
                >
                  {isAnalyzing ? "Scanning Aura..." : "Check Now"}
                </button>
              </>
            ) : (
              <>
                <h1 className="panel-title">Scale Locked.</h1>
                <p className="panel-sub">
                  Your destiny has already been weighed today.<br/><br/>
                  Next coin allowed in:<br/>
                  <strong style={{ fontSize: '1.2rem', marginTop: '5px', display: 'block' }}>
                    {timeLeft ? `${timeLeft.hours}:${timeLeft.mins}:${timeLeft.secs}` : '00:00:00'}
                  </strong>
                </p>
                
                {cookieState.currentResult && (
                  <button className="btn" onClick={() => setShowModal(true)} style={{ marginBottom: '1rem', background: '#e0e0e0', color: '#111' }}>
                    View Today's Ticket
                  </button>
                )}
              </>
            )}
          </>
        )}
      </div>

      {/* THE TICKET MODAL OVERLAY */}
      <div className={`modal-overlay ${showModal ? 'active' : ''}`}>
        {cookieState.currentResult && (
          <div id="print-ticket" className="reading-ticket-large">
            <div className="ticket-header">
              destiny. • {new Date().toLocaleDateString()}
            </div>
            
            <div className="ticket-quote">
              "{cookieState.currentResult.quote}"
            </div>
            
            <div className="ticket-forecast">
              {cookieState.currentResult.reading}
            </div>
            
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button className="close-btn" onClick={() => setShowModal(false)} style={{ flex: 1 }}>
                Close
              </button>
              <button className="btn" onClick={shareToX} style={{ flex: 2 }}>
                Share to X
              </button>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}

export default App;
