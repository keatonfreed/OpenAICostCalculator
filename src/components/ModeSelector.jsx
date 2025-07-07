import React from 'react';

const ModeSelector = ({ mode, onModeChange }) => {
    return (
        <div className="card bg-surface-primary p-4 rounded-md">
            <h2 className="text-text-primary text-lg font-bold mb-4">Mode Selector</h2>
            <select
                value={mode}
                onChange={onModeChange}
                className="w-full p-2 rounded-md bg-surface-elevated text-text-primary"
            >
                <option value="tokens">Tokens</option>
                <option value="words">Words</option>
                <option value="characters">Characters</option>
            </select>
        </div>
    );
};

export default ModeSelector;