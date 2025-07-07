import React from 'react';

const InputFields = ({ onInputChange }) => {
    return (
        <div className="card bg-surface-primary p-4 rounded-md">
            <h2 className="text-text-primary text-lg font-bold mb-4">Input Details</h2>
            <div className="mb-4">
                <label className="block text-text-secondary mb-2">Input Tokens / Words / Characters:</label>
                <input
                    type="number"
                    name="inputTokens"
                    onChange={onInputChange}
                    className="w-full p-2 rounded-md bg-surface-elevated text-text-primary"
                />
            </div>
            <div className="mb-4">
                <label className="block text-text-secondary mb-2">Output Tokens / Words / Characters:</label>
                <input
                    type="number"
                    name="outputTokens"
                    onChange={onInputChange}
                    className="w-full p-2 rounded-md bg-surface-elevated text-text-primary"
                />
            </div>
            <div className="mb-4">
                <label className="block text-text-secondary mb-2">Number of API Calls:</label>
                <input
                    type="number"
                    name="apiCalls"
                    onChange={onInputChange}
                    className="w-full p-2 rounded-md bg-surface-elevated text-text-primary"
                />
            </div>
        </div>
    );
};

export default InputFields;