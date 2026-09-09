import React, { useState } from 'react';
import { AppSettings } from '../../types.js';
import { X, Save, RefreshCw } from 'lucide-react';

interface Props {
  settings: AppSettings;
  isOpen: boolean;
  onClose: () => void;
  onSave: (newSettings: Partial<AppSettings>) => void;
  onResetData: () => void;
}

export const SettingsModal: React.FC<Props> = ({ settings, isOpen, onClose, onSave, onResetData }) => {
  if (!isOpen) return null;

  const [apiKey, setApiKey] = useState(settings.apiKey);
  const [startingBalance, setStartingBalance] = useState(settings.startingBalance.toString());
  const [stakePerBet, setStakePerBet] = useState(settings.stakePerBet.toString());
  const [selectedBookmaker, setSelectedBookmaker] = useState(settings.selectedBookmaker);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave({
      apiKey,
      startingBalance: parseFloat(startingBalance) || 10000,
      stakePerBet: parseFloat(stakePerBet) || 100,
      selectedBookmaker
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
      <div className="bg-slate-800 border border-slate-700 rounded-xl max-w-lg w-full p-6 shadow-2xl relative text-slate-100">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-700 transition"
        >
          <X size={18} />
        </button>

        <h2 className="text-xl font-bold mb-1">Experiment Settings</h2>
        <p className="text-xs text-slate-400 mb-5">Configure sports odds API credentials & paper trading parameters</p>

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          <div>
            <label className="block font-medium text-slate-300 mb-1">SportsGameOdds API Key</label>
            <input
              type="text"
              value={apiKey}
              onChange={e => setApiKey(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500 font-mono"
              placeholder="Enter API Key"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block font-medium text-slate-300 mb-1">Starting Balance ($)</label>
              <input
                type="number"
                value={startingBalance}
                onChange={e => setStartingBalance(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="block font-medium text-slate-300 mb-1">Stake Per Match ($)</label>
              <input
                type="number"
                value={stakePerBet}
                onChange={e => setStakePerBet(e.target.value)}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block font-medium text-slate-300 mb-1">Preferred Bookmaker Odds</label>
            <select
              value={selectedBookmaker}
              onChange={e => setSelectedBookmaker(e.target.value)}
              className="w-full bg-slate-900 border border-slate-700 rounded-lg px-3 py-2 text-slate-200 focus:outline-none focus:border-emerald-500"
            >
              <option value="fanduel">FanDuel (Recommended)</option>
              <option value="unibet">Unibet (Recommended)</option>
              <option value="draftkings">DraftKings</option>
              <option value="pinnacle">Pinnacle</option>
              <option value="caesars">Caesars</option>
              <option value="williamhill">William Hill</option>
            </select>
          </div>

          <div className="pt-4 border-t border-slate-700 flex items-center justify-between">
            <button
              type="button"
              onClick={onResetData}
              className="flex items-center gap-1.5 px-3 py-2 bg-rose-500/10 text-rose-400 border border-rose-500/30 rounded-lg hover:bg-rose-500/20 font-medium transition"
            >
              <RefreshCw size={14} /> Reset Experiment Data
            </button>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 bg-slate-700 text-slate-300 rounded-lg hover:bg-slate-600 transition"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-500 text-white rounded-lg hover:bg-emerald-600 font-semibold transition"
              >
                <Save size={14} /> Save Settings
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
