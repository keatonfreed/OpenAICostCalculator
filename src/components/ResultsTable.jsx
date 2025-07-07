import React from 'react';

const ResultsTable = ({ results }) => {
    return (
        <div className="card bg-surface-primary p-4 rounded-md">
            <h2 className="text-text-primary text-lg font-bold mb-4">Results</h2>
            <table className="w-full text-text-primary">
                <thead>
                    <tr>
                        <th className="border-b border-border p-2">Model</th>
                        <th className="border-b border-border p-2">Provider</th>
                        <th className="border-b border-border p-2">Input Cost</th>
                        <th className="border-b border-border p-2">Output Cost</th>
                        <th className="border-b border-border p-2">Per Call Cost</th>
                        <th className="border-b border-border p-2">Total Cost</th>
                    </tr>
                </thead>
                <tbody>
                    {results.map((result, index) => (
                        <tr key={index}>
                            <td className="border-b border-border p-2">{result.model}</td>
                            <td className="border-b border-border p-2">{result.provider}</td>
                            <td className="border-b border-border p-2">${result.inputCost.toFixed(2)}</td>
                            <td className="border-b border-border p-2">${result.outputCost.toFixed(2)}</td>
                            <td className="border-b border-border p-2">${result.perCallCost.toFixed(2)}</td>
                            <td className="border-b border-border p-2">${result.totalCost.toFixed(2)}</td>
                        </tr>
                    ))}
                </tbody>
            </table>
        </div>
    );
};

export default ResultsTable;