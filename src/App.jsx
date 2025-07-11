import { useState, useEffect, useRef } from 'react';
import clsx from 'clsx';
import InputFields from './components/InputFields';
import ModeSelector from './components/ModeSelector';
import ResultsTable from './components/ResultsTable';
import pricingData from './data/pricingData.json';
import './App.css';
import { countOpenAITokens } from './utils/tokenCount';

function App() {
  const [inputs, setInputs] = useState(() => {
    const savedInputs = localStorage.getItem('inputs');
    if (savedInputs) {
      try {
        return JSON.parse(savedInputs);
      } catch (error) {
        console.error('Failed to parse inputs from localStorage:', error);
      }
    }
    return {
      inputTokens: 100,
      outputTokens: 100,
      apiCalls: 1,
    };
  });
  const [mode, setMode] = useState('tokens');
  const [results, setResults] = useState([]);
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending', clicks: 0 });
  const [showInputTokenModal, setShowInputTokenModal] = useState(false);
  const [showOutputTokenModal, setShowOutputTokenModal] = useState(false);
  const [inputTokenText, setInputTokenText] = useState(() => {
    return localStorage.getItem('inputTokenText') || '';
  });
  const [outputTokenText, setOutputTokenText] = useState(() => {
    return localStorage.getItem('outputTokenText') || '';
  });
  const [inputTokenCount, setInputTokenCount] = useState(0);
  const [outputTokenCount, setOutputTokenCount] = useState(0);
  const [inputTokenLoading, setInputTokenLoading] = useState(false);
  const [outputTokenLoading, setOutputTokenLoading] = useState(false);
  const [apiKey, setApiKey] = useState(() => {
    const saved = localStorage.getItem('openaiApiKey');
    return saved ? atob(saved) : '';
  });
  const [aiGenerating, setAiGenerating] = useState(false);
  const [inputModalPos, setInputModalPos] = useState({ top: 0, left: 0 });
  const [outputModalPos, setOutputModalPos] = useState({ top: 0, left: 0 });
  const inputBtnRef = useRef(null);
  const outputBtnRef = useRef(null);
  const inputDebounceRef = useRef();
  const outputDebounceRef = useRef();
  const [inputPopupVisible, setInputPopupVisible] = useState(false);
  const [outputPopupVisible, setOutputPopupVisible] = useState(false);

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    // For API calls, handle comma formatting
    if (name === 'apiCalls') {
      // Remove all non-digit characters
      const numericValue = value.replace(/[^\d]/g, '');

      // Prevent exceeding max value
      if (numericValue && parseFloat(numericValue) > 1000000) {
        return;
      }

      setInputs((prev) => ({ ...prev, [name]: numericValue === '' ? '' : parseFloat(numericValue) || '' }));
      return;
    }

    // For other inputs, prevent invalid characters like '-', 'e', or exceeding max value
    if (/^-|e/.test(value) || parseFloat(value) > 1000000) {
      return;
    }

    setInputs((prev) => ({ ...prev, [name]: value === '' ? '' : parseFloat(value) || 0 }));
  };

  const handleKeyDown = (e) => {
    const invalidKeys = ['e', 'E', '-', '+'];
    if (invalidKeys.includes(e.key)) {
      e.preventDefault();
    }
  };

  useEffect(() => {
    // Save inputs to localStorage whenever they change
    localStorage.setItem('inputs', JSON.stringify(inputs));
  }, [inputs]);

  // Save token text to localStorage
  useEffect(() => {
    localStorage.setItem('inputTokenText', inputTokenText);
  }, [inputTokenText]);

  useEffect(() => {
    localStorage.setItem('outputTokenText', outputTokenText);
  }, [outputTokenText]);

  // Save API key to localStorage (base64 encoded)
  useEffect(() => {
    if (apiKey) {
      localStorage.setItem('openaiApiKey', btoa(apiKey));
    }
  }, [apiKey]);

  const handleAiGenerate = async () => {
    if (!apiKey.trim()) {
      alert('Please enter your OpenAI API key first');
      return;
    }

    if (!inputTokenText.trim()) {
      alert('Please enter some input text first');
      return;
    }

    setAiGenerating(true);
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          model: 'gpt-4.1-nano',
          messages: [
            {
              role: 'user',
              content: inputTokenText
            }
          ],
          max_tokens: 2000,
        }),
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.status}`);
      }

      const data = await response.json();
      const aiOutput = data.choices[0].message.content;
      setOutputTokenText(aiOutput);

      // Open the output token modal
      setShowOutputTokenModal(true);

      // Wait a moment for the modal to open and token count to update, then auto-update
      setTimeout(() => {
        const tokenCount = countOpenAITokens(aiOutput);
        setInputs(prev => ({ ...prev, outputTokens: tokenCount }));
      }, 300);

    } catch (error) {
      console.error('AI generation error:', error);
      alert('Error generating AI response. Please check your API key and try again.');
    } finally {
      setAiGenerating(false);
    }
  };

  const formatInputValue = (name, value) => {
    if (name === 'apiCalls' && value && value !== '') {
      return value.toLocaleString();
    }
    return value;
  };

  const formatNumber = (num) => {
    if (!num) return num
    if (num >= 1000000) {
      return `${(num / 1000000).toFixed(1)}m`;
    } else if (num >= 10000) {
      return `${(num / 1000).toFixed(1)}k`;
    } else {
      return num.toLocaleString();
    }
  };

  useEffect(() => {
    const conversionRates = {
      words: 1.33,
      characters: 0.25,
      tokens: 1,
    };

    const conversionRate = conversionRates[mode];
    const inputTokens = inputs.inputTokens * conversionRate / 1000;
    const outputTokens = inputs.outputTokens * conversionRate / 1000;

    const calculatedResults = pricingData.map((model) => {
      const inputCost = inputTokens * model.inputTokenCost;
      const outputCost = outputTokens * model.outputTokenCost;
      const perCallCost = inputTokens * model.inputTokenCost + outputTokens * model.outputTokenCost;
      const totalCost = perCallCost * (inputs.apiCalls || 1);

      return {
        model: model.model,
        intelligence: model.intelligence,
        inputCost,
        outputCost,
        perCallCost,
        totalCost,
      };
    });

    setResults(calculatedResults);
  }, [inputs, mode]);

  const sortedResults = [...results].sort((a, b) => {
    if (sortConfig.key && sortConfig.clicks < 3) {
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];
      if (aValue < bValue) {
        return sortConfig.direction === 'ascending' ? -1 : 1;
      }
      if (aValue > bValue) {
        return sortConfig.direction === 'ascending' ? 1 : -1;
      }
    }
    return 0;
  });

  const handleSort = (key) => {
    setSortConfig((prev) => {
      if (prev.key === key) {
        const newClicks = prev.clicks + 1;
        if (newClicks >= 3) {
          return { key: null, direction: 'ascending', clicks: 0 };
        }
        return { key, direction: prev.direction === 'ascending' ? 'descending' : 'ascending', clicks: newClicks };
      }
      return { key, direction: 'ascending', clicks: 1 };
    });
  };

  const getSortArrow = (key) => {
    if (sortConfig.key === key) {
      if (sortConfig.direction === 'ascending') {
        return '▲';
      } else if (sortConfig.direction === 'descending') {
        return '▼';
      }
    }
    return '';
  };

  // Position modal next to button
  useEffect(() => {
    if (showInputTokenModal && inputBtnRef.current) {
      const rect = inputBtnRef.current.getBoundingClientRect();
      setInputModalPos({ top: rect.bottom + window.scrollY + 8, left: rect.left + window.scrollX });
    }
  }, [showInputTokenModal]);
  useEffect(() => {
    if (showOutputTokenModal && outputBtnRef.current) {
      const rect = outputBtnRef.current.getBoundingClientRect();
      setOutputModalPos({ top: rect.bottom + window.scrollY + 8, left: rect.left + window.scrollX });
    }
  }, [showOutputTokenModal]);

  // Debounced tokenization for input
  useEffect(() => {
    if (!showInputTokenModal) return;
    setInputTokenLoading(true);
    if (inputDebounceRef.current) clearTimeout(inputDebounceRef.current);
    inputDebounceRef.current = setTimeout(() => {
      if (inputTokenText) {
        let count = countOpenAITokens(inputTokenText);
        setInputTokenCount(count);
        setInputTokenLoading(false);
      } else {
        setInputTokenCount(0);
        setInputTokenLoading(false);
      }
    }, 200);
    return () => clearTimeout(inputDebounceRef.current);
  }, [inputTokenText, showInputTokenModal]);

  // Debounced tokenization for output
  useEffect(() => {
    if (!showOutputTokenModal) return;
    setOutputTokenLoading(true);
    if (outputDebounceRef.current) clearTimeout(outputDebounceRef.current);
    outputDebounceRef.current = setTimeout(() => {
      if (outputTokenText) {
        let count = countOpenAITokens(outputTokenText);
        setOutputTokenCount(count);
        setOutputTokenLoading(false);
      } else {
        setOutputTokenCount(0);
        setOutputTokenLoading(false);
      }
    }, 200);
    return () => clearTimeout(outputDebounceRef.current);
  }, [outputTokenText, showOutputTokenModal]);

  // Escape closes modals
  useEffect(() => {
    const handler = (e) => {
      if (e.key === 'Escape') {
        setShowInputTokenModal(false);
        setShowOutputTokenModal(false);
      }
    };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, []);

  // Handle click outside to close modals
  const inputModalRef = useRef();
  const outputModalRef = useRef();
  useEffect(() => {
    function handleClick(e) {
      if (showInputTokenModal && inputModalRef.current && !inputModalRef.current.contains(e.target) && !inputBtnRef.current.contains(e.target)) {
        setShowInputTokenModal(false);
      }
      if (showOutputTokenModal && outputModalRef.current && !outputModalRef.current.contains(e.target) && !outputBtnRef.current.contains(e.target)) {
        setShowOutputTokenModal(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [showInputTokenModal, showOutputTokenModal]);

  // Animate in/out for input popup
  useEffect(() => {
    if (showInputTokenModal) {
      setInputPopupVisible(true);
    } else if (inputPopupVisible) {
      const timeout = setTimeout(() => setInputPopupVisible(false), 180);
      return () => clearTimeout(timeout);
    }
  }, [showInputTokenModal]);
  // Animate in/out for output popup
  useEffect(() => {
    if (showOutputTokenModal) {
      setOutputPopupVisible(true);
    } else if (outputPopupVisible) {
      const timeout = setTimeout(() => setOutputPopupVisible(false), 180);
      return () => clearTimeout(timeout);
    }
  }, [showOutputTokenModal]);

  return (
    <div className="bg-app-bg min-h-screen text-text-primary flex flex-col p-8 gap-6">
      <header className="p-4 border-b border-border pt-0">
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <span>Open</span>
          <span className="bg-surface-primary border border-border text-[#00bfa5] px-2 py-1 rounded-lg">AI</span>
          <span>Cost Calculator</span>
        </h1>
      </header>
      <main className="flex flex-1 justify-between gap-6">
        <section className="border border-border bg-surface-primary  rounded-lg flex-1 p-4 h-fit">
          <div className="flex flex-row mb-3 rounded-xl">
            {['Tokens', 'Words', 'Characters'].map((option) => (
              <button
                key={option}
                onClick={() => setMode(option.toLowerCase())}
                className={clsx(
                  'flex-1 px-3 py-1 text-xl cursor-pointer transition-all ease',
                  mode === option.toLowerCase()
                    ? 'border-accent-primary border text-accent-primary font-bold'
                    : 'border border-border',
                  option === "Tokens"
                    ? 'rounded-l-xl '
                    : option === 'Characters'
                      ? 'rounded-r-xl'
                      : ''
                )}
              >
                {option}
              </button>
            ))}
          </div>
          <div className="mb-4 relative">
            <label className="block text-text-secondary">Input {mode.charAt(0).toUpperCase() + mode.slice(1)}:
              <input
                type="number"
                name="inputTokens"
                min={0}
                max={1000000}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                value={inputs.inputTokens}
                className="w-full mt-2 p-2 rounded-md border border-border text-text-primary pr-10"
              />
              <button
                type="button"
                ref={inputBtnRef}
                className="absolute right-2 bottom-2 bg-accent-primary text-white px-2 py-1 rounded text-base shadow cursor-pointer flex items-center justify-center"
                onClick={() => setShowInputTokenModal(true)}
                title="Open token calculator for input"
                style={{ zIndex: 10, height: '28px', width: '32px' }}
              >
                {/* Calculator icon */}
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24">
                  <rect x="3" y="3" width="18" height="18" rx="2" fill="currentColor" opacity=".2" />
                  <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" />
                  <rect x="7" y="7" width="10" height="3" rx="1" fill="currentColor" />
                  <rect x="7" y="12" width="3" height="3" rx="1" fill="currentColor" />
                  <rect x="11" y="12" width="3" height="3" rx="1" fill="currentColor" />
                  <rect x="15" y="12" width="3" height="3" rx="1" fill="currentColor" />
                  <rect x="7" y="16" width="3" height="3" rx="1" fill="currentColor" />
                  <rect x="11" y="16" width="3" height="3" rx="1" fill="currentColor" />
                  <rect x="15" y="16" width="3" height="3" rx="1" fill="currentColor" />
                </svg>
              </button>
            </label>
          </div>
          <div className="mb-4 relative">
            <label className="block text-text-secondary ">Output {mode.charAt(0).toUpperCase() + mode.slice(1)}:
              <input
                type="number"
                name="outputTokens"
                min={0}
                max={1000000}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                value={inputs.outputTokens}
                className="mt-2 w-full p-2 rounded-md border border-border text-text-primary pr-20"
              />
              <button
                type="button"
                ref={outputBtnRef}
                className="absolute right-12 bottom-2 bg-accent-primary text-white px-2 py-1 rounded text-base shadow cursor-pointer flex items-center justify-center"
                onClick={() => setShowOutputTokenModal(true)}
                title="Open token calculator for output"
                style={{ zIndex: 10, height: '28px', width: '32px' }}
              >
                {/* Calculator icon */}
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24">
                  <rect x="3" y="3" width="18" height="18" rx="2" fill="currentColor" opacity=".2" />
                  <rect x="3" y="3" width="18" height="18" rx="2" stroke="currentColor" strokeWidth="2" />
                  <rect x="7" y="7" width="10" height="3" rx="1" fill="currentColor" />
                  <rect x="7" y="12" width="3" height="3" rx="1" fill="currentColor" />
                  <rect x="11" y="12" width="3" height="3" rx="1" fill="currentColor" />
                  <rect x="15" y="12" width="3" height="3" rx="1" fill="currentColor" />
                  <rect x="7" y="16" width="3" height="3" rx="1" fill="currentColor" />
                  <rect x="11" y="16" width="3" height="3" rx="1" fill="currentColor" />
                  <rect x="15" y="16" width="3" height="3" rx="1" fill="currentColor" />
                </svg>
              </button>
              <button
                type="button"
                className="absolute right-2 bottom-2 bg-green-600 text-white px-2 py-1 rounded text-base shadow cursor-pointer flex items-center justify-center disabled:opacity-50"
                onClick={handleAiGenerate}
                disabled={aiGenerating}
                title="Generate AI response"
                style={{ zIndex: 10, height: '28px', width: '32px' }}
              >
                {aiGenerating ? (
                  <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24">
                    <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
                  </svg>
                )}
              </button>
            </label>
          </div>
          <div className="mb-4">
            <label className="block text-text-secondary">API Calls:
              <input
                type="text"
                name="apiCalls"
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                value={formatInputValue('apiCalls', inputs.apiCalls)}
                className="mt-2 w-full p-2 rounded-md border border-border text-text-primary"
                placeholder="1"
              />
            </label>
          </div>
          <div className="mb-4 relative">
            <label className="block text-text-secondary">OpenAI API Key:
              <input
                type="password"
                value={apiKey}
                onChange={(e) => setApiKey(e.target.value)}
                placeholder="Enter your OpenAI API key"
                className="mt-2 w-full p-2 rounded-md border border-border text-text-primary pr-10"
              />
              <button
                type="button"
                className="absolute right-2 bottom-2 bg-blue-600 text-white px-2 py-1 rounded text-base shadow cursor-pointer flex items-center justify-center"
                onClick={() => window.open('https://platform.openai.com/api-keys', '_blank')}
                title="Get OpenAI API Key"
                style={{ zIndex: 10, height: '28px', width: '32px' }}
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24">
                  <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                </svg>
              </button>
            </label>
          </div>
          {/* Floating modal for input tokenization */}
          {(showInputTokenModal || inputPopupVisible) && (
            <div
              className={`fixed z-50 ${showInputTokenModal ? 'animate-popupin' : 'animate-popupout'}`}
              style={{ top: inputModalPos.top, left: inputModalPos.left + 10, minWidth: 320, maxWidth: 400 }}
            >
              <div ref={inputModalRef} className="bg-surface-primary border border-border text-text-primary rounded-lg p-5 shadow-xl relative transition-all duration-200 scale-100">
                <button
                  className="absolute top-2 right-2 text-lg font-bold text-gray-400 hover:text-accent-primary transition-colors cursor-pointer"
                  onClick={() => setShowInputTokenModal(false)}
                  aria-label="Close"
                >
                  ×
                </button>
                <h2 className="text-lg font-bold mb-2">Text Token Calculator</h2>
                <textarea
                  className="w-full border border-border rounded p-2 mb-2 min-h-[80px] bg-surface-secondary text-text-primary focus:ring-accent-primary focus:border-accent-primary transition-all resize-x"
                  placeholder="Paste or type your input text here..."
                  value={inputTokenText}
                  onChange={e => setInputTokenText(e.target.value)}
                  autoFocus
                />
                <div className="flex items-center justify-between gap-2 mt-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">Token count:</span>
                    <span className="text-accent-primary font-bold">{inputTokenCount}</span>
                  </div>
                  <button
                    className="bg-accent-primary text-white px-3 py-1 rounded text-sm cursor-pointer hover:bg-accent-secondary transition-all"
                    onClick={() => {
                      setInputs(prev => ({ ...prev, inputTokens: inputTokenCount }));
                      setShowInputTokenModal(false);
                    }}
                  >
                    Update
                  </button>
                </div>
              </div>
            </div>
          )}
          {/* Floating modal for output tokenization */}
          {(showOutputTokenModal || outputPopupVisible) && (
            <div
              className={`fixed z-50 ${showOutputTokenModal ? 'animate-popupin' : 'animate-popupout'}`}
              style={{ top: outputModalPos.top, left: outputModalPos.left + 10, minWidth: 320, maxWidth: 400 }}
            >
              <div ref={outputModalRef} className="bg-surface-primary border border-border text-text-primary rounded-lg p-5 shadow-xl relative transition-all duration-200 scale-100">
                <button
                  className="absolute top-2 right-2 text-lg font-bold text-gray-400 hover:text-accent-primary transition-colors cursor-pointer"
                  onClick={() => setShowOutputTokenModal(false)}
                  aria-label="Close"
                >
                  ×
                </button>
                <h2 className="text-lg font-bold mb-2">Text Token Calculator</h2>
                <textarea
                  className="w-full border border-border rounded p-2 mb-2 min-h-[80px] bg-surface-secondary text-text-primary focus:ring-accent-primary focus:border-accent-primary transition-all resize-x"
                  placeholder="Paste or type your output text here..."
                  value={outputTokenText}
                  onChange={e => setOutputTokenText(e.target.value)}
                  autoFocus
                />
                <div className="flex items-center justify-between gap-2 mt-2">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold">Token count:</span>
                    <span className="text-accent-primary font-bold">{outputTokenCount}</span>
                  </div>
                  <button
                    className="bg-accent-primary text-white px-3 py-1 rounded text-sm cursor-pointer hover:bg-accent-secondary transition-all"
                    onClick={() => {
                      setInputs(prev => ({ ...prev, outputTokens: outputTokenCount }));
                      setShowOutputTokenModal(false);
                    }}
                  >
                    Update
                  </button>
                </div>
              </div>
            </div>
          )}
          {/* <InputFields onInputChange={handleInputChange} /> */}
          {/* <ModeSelector mode={mode} onModeChange={handleModeChange} /> */}
        </section >
        <section className="border border-border bg-surface-primary  rounded-lg flex-2 p-4">
          <table className="w-full text-text-primary">
            <thead>
              <tr className='text-sm'>
                <th className="border-b border-border p-2 text-left cursor-pointer" onClick={() => handleSort('model')}>
                  Model {getSortArrow('model')}
                </th>
                <th className="border-b border-border p-2 text-right cursor-pointer" onClick={() => handleSort('intelligence')}>
                  Intelligence {getSortArrow('intelligence')}
                </th>
                <th className="border-b border-border p-2 text-right cursor-pointer" onClick={() => handleSort('inputCost')}>
                  Input Cost {getSortArrow('inputCost')}
                </th>
                <th className="border-b border-border p-2 text-right cursor-pointer" onClick={() => handleSort('outputCost')}>
                  Output Cost {getSortArrow('outputCost')}
                </th>
                <th className="border-b border-border p-2 text-right cursor-pointer" onClick={() => handleSort('perCallCost')}>
                  Per Call Cost {getSortArrow('perCallCost')}
                </th>
                <th className="border-b border-border p-2 text-right cursor-pointer" onClick={() => handleSort('totalCost')}>
                  Total Cost {getSortArrow('totalCost')}
                </th>
              </tr>
            </thead>
            <tbody className='max-h-10 h-10 overflow-y-scroll'>
              {sortedResults.map((result, index) => (
                <tr key={index}>
                  <td className="border-b border-border p-2 font-bold">{result.model}</td>
                  <td className="border-b border-border p-2 text-right">{formatNumber(result.intelligence?.toFixed(0))}</td>
                  <td className="border-b border-border p-2 text-right">${formatNumber(result.inputCost)}</td>
                  <td className="border-b border-border p-2 text-right">${formatNumber(result.outputCost)}</td>
                  <td className="border-b border-border p-2 text-right">${formatNumber(result.perCallCost)}</td>
                  <td className="border-b border-border p-2 text-right text-accent-primary">${formatNumber(result.totalCost)}</td>
                </tr>
              ))}
            </tbody>
          </table>
          {/* <ResultsTable results={results} /> */}
        </section>
      </main >
    </div >
  );
}

export default App;
