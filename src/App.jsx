import { useState, useEffect } from 'react';
import clsx from 'clsx';
import InputFields from './components/InputFields';
import ModeSelector from './components/ModeSelector';
import ResultsTable from './components/ResultsTable';
import pricingData from './data/pricingData.json';
import './App.css';

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

  const handleInputChange = (e) => {
    const { name, value } = e.target;

    // Prevent invalid characters like '-', 'e', or exceeding max value
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

  const handleModeChange = (e) => {
    setMode(e.target.value);
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
          <div className="mb-4">
            <label className="block text-text-secondary mb-2">Input {mode.charAt(0).toUpperCase() + mode.slice(1)}:</label>
            <input
              type="number"
              name="inputTokens"
              min={0}
              max={1000000}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              value={inputs.inputTokens}
              className="w-full p-2 rounded-md border border-border text-text-primary"
            />
          </div>
          <div className="mb-4">
            <label className="block text-text-secondary mb-2">Output {mode.charAt(0).toUpperCase() + mode.slice(1)}:</label>
            <input
              type="number"
              name="outputTokens"
              min={0}
              max={1000000}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              value={inputs.outputTokens}
              className="w-full p-2 rounded-md border border-border text-text-primary"
            />
          </div>
          <div className="mb-4">
            <label className="block text-text-secondary mb-2">Number of API Calls:</label>
            <input
              type="number"
              name="apiCalls"
              min={0}
              max={1000000}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              value={inputs.apiCalls}
              className="w-full p-2 rounded-md border border-border text-text-primary"
            />
          </div>
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
