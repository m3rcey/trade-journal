import { useState, useEffect } from 'react'
import './index.css'
import {
  TrendingUp,
  Plus,
  Trash2,
  Target,
  AlertTriangle,
  BarChart3,
  Calendar,
  Percent
} from 'lucide-react'

// Qullamaggie setup types
const SETUP_TYPES = [
  { id: 'breakout', name: 'Setup 1: Breakout', color: 'bg-blue-500' },
  { id: 'episodic', name: 'Setup 2: Episodic Pivot', color: 'bg-green-500' },
  { id: 'parabolic', name: 'Setup 3: Parabolic Short', color: 'bg-red-500' },
  { id: 'mean-reversion', name: 'Setup 4: Mean Reversion', color: 'bg-purple-500' },
]

const STAR_RATINGS = [5, 4, 3]

interface Trade {
  id: string
  ticker: string
  setupType: string
  starRating: number
  entryPrice: number
  exitPrice: number
  stopPrice: number
  shares: number
  entryDate: string
  exitDate: string
  notes: string
  status: 'open' | 'closed'
}

function App() {
  const [trades, setTrades] = useState<Trade[]>([])
  const [showAddModal, setShowAddModal] = useState(false)
  const [activeTab, setActiveTab] = useState('journal')

  // Load from localStorage
  useEffect(() => {
    const saved = localStorage.getItem('qulla_trades')
    if (saved) setTrades(JSON.parse(saved))
  }, [])

  // Save to localStorage
  useEffect(() => {
    localStorage.setItem('qulla_trades', JSON.stringify(trades))
  }, [trades])

  const addTrade = (trade: Omit<Trade, 'id'>) => {
    const newTrade: Trade = { ...trade, id: Date.now().toString() }
    setTrades([newTrade, ...trades])
  }

  const deleteTrade = (id: string) => {
    if (confirm('Delete this trade?')) {
      setTrades(trades.filter(t => t.id !== id))
    }
  }

  // Calculate R-multiple
  const calculateR = (trade: Trade) => {
    if (trade.status === 'open') return null
    const risk = Math.abs(trade.entryPrice - trade.stopPrice)
    const reward = trade.exitPrice - trade.entryPrice
    if (trade.setupType === 'parabolic') {
      // Short: profit when price goes down
      return risk > 0 ? (trade.entryPrice - trade.exitPrice) / risk : 0
    }
    return risk > 0 ? reward / risk : 0
  }

  // Calculate P&L
  const calculatePL = (trade: Trade) => {
    if (trade.status === 'open') return null
    const pl = (trade.exitPrice - trade.entryPrice) * trade.shares
    if (trade.setupType === 'parabolic') {
      return (trade.entryPrice - trade.exitPrice) * trade.shares
    }
    return pl
  }

  // Stats
  const closedTrades = trades.filter(t => t.status === 'closed')
  const totalTrades = closedTrades.length
  const winningTrades = closedTrades.filter(t => (calculatePL(t) || 0) > 0)
  const winRate = totalTrades > 0 ? (winningTrades.length / totalTrades) * 100 : 0
  const totalPL = closedTrades.reduce((sum, t) => sum + (calculatePL(t) || 0), 0)
  const avgR = totalTrades > 0 
    ? closedTrades.reduce((sum, t) => sum + (calculateR(t) || 0), 0) / totalTrades 
    : 0

  // Setup performance
  const setupStats = SETUP_TYPES.map(setup => {
    const setupTrades = closedTrades.filter(t => t.setupType === setup.id)
    const wins = setupTrades.filter(t => (calculatePL(t) || 0) > 0).length
    return {
      ...setup,
      count: setupTrades.length,
      winRate: setupTrades.length > 0 ? (wins / setupTrades.length) * 100 : 0,
      totalPL: setupTrades.reduce((sum, t) => sum + (calculatePL(t) || 0), 0)
    }
  })

  // Pattern alerts
  const getAlerts = () => {
    const alerts: string[] = []
    
    // Check for consecutive losses by setup
    SETUP_TYPES.forEach(setup => {
      const recent = closedTrades
        .filter(t => t.setupType === setup.id)
        .slice(0, 3)
      if (recent.length === 3 && recent.every(t => (calculatePL(t) || 0) <= 0)) {
        alerts.push(`Lost last 3 ${setup.name} trades - review required`)
      }
    })

    // Check win rate below 40%
    if (totalTrades >= 10 && winRate < 40) {
      alerts.push(`Win rate ${winRate.toFixed(1)}% - tighten entry criteria`)
    }

    // Check for big R losses
    const bigLosses = closedTrades.filter(t => {
      const r = calculateR(t)
      return r !== null && r < -2
    })
    if (bigLosses.length > 0) {
      alerts.push(`${bigLosses.length} trades exceeded -2R - respect your stops`)
    }

    return alerts
  }

  const alerts = getAlerts()

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700 sticky top-0 z-50">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-primary-600 rounded-xl flex items-center justify-center">
                <TrendingUp className="w-5 h-5 text-white" />
              </div>
              <div>
                <h1 className="font-bold text-lg">QullaBot Journal</h1>
                <p className="text-xs text-gray-400">Trade. Log. Learn.</p>
              </div>
            </div>
            <button 
              onClick={() => setShowAddModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-primary-600 hover:bg-primary-500 rounded-lg text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              Log Trade
            </button>
          </div>
        </div>
      </header>

      {/* Navigation */}
      <div className="max-w-4xl mx-auto px-4 py-4">
        <div className="flex gap-2">
          {[
            { id: 'journal', label: 'Journal', icon: Calendar },
            { id: 'stats', label: 'Stats', icon: BarChart3 },
          ].map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                activeTab === tab.id
                  ? 'bg-primary-600 text-white'
                  : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
              }`}
            >
              <tab.icon className="w-4 h-4" />
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 pb-6">
        {activeTab === 'journal' && (
          <div className="space-y-6">
            {/* Alerts */}
            {alerts.length > 0 && (
              <div className="space-y-2">
                {alerts.map((alert, i) => (
                  <div key={i} className="flex items-center gap-3 p-4 bg-red-900/30 border border-red-500/50 rounded-lg">
                    <AlertTriangle className="w-5 h-5 text-red-400" />
                    <p className="text-red-200">{alert}</p>
                  </div>
                ))}
              </div>
            )}

            {/* Quick Stats */}
            <div className="grid grid-cols-4 gap-4">
              <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                <p className="text-xs text-gray-400">Total Trades</p>
                <p className="text-2xl font-bold">{totalTrades}</p>
              </div>
              <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                <p className="text-xs text-gray-400">Win Rate</p>
                <p className={`text-2xl font-bold ${winRate >= 50 ? 'text-green-400' : 'text-yellow-400'}`}>
                  {winRate.toFixed(1)}%
                </p>
              </div>
              <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                <p className="text-xs text-gray-400">Avg R</p>
                <p className={`text-2xl font-bold ${avgR >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  {avgR.toFixed(2)}R
                </p>
              </div>
              <div className="bg-gray-800 rounded-xl p-4 border border-gray-700">
                <p className="text-xs text-gray-400">P&L</p>
                <p className={`text-2xl font-bold ${totalPL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                  ${totalPL.toFixed(0)}
                </p>
              </div>
            </div>

            {/* Trades List */}
            <div className="space-y-3">
              {trades.length === 0 ? (
                <div className="text-center py-12 bg-gray-800 rounded-xl border border-gray-700">
                  <TrendingUp className="w-12 h-12 mx-auto text-gray-600 mb-4" />
                  <p className="text-gray-400">No trades logged yet</p>
                  <p className="text-sm text-gray-500 mt-2">Start logging your trades to see patterns</p>
                </div>
              ) : (
                trades.map(trade => {
                  const pl = calculatePL(trade)
                  const r = calculateR(trade)
                  const setup = SETUP_TYPES.find(s => s.id === trade.setupType)
                  
                  return (
                    <div key={trade.id} className="bg-gray-800 rounded-xl border border-gray-700 p-4">
                      <div className="flex justify-between items-start">
                        <div className="flex items-center gap-3">
                          <div className={`w-3 h-3 rounded-full ${setup?.color || 'bg-gray-500'}`} />
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-bold text-lg">{trade.ticker}</span>
                              <span className="text-xs bg-gray-700 px-2 py-0.5 rounded">{setup?.name}</span>
                              <span className="text-xs text-yellow-400">{'★'.repeat(trade.starRating)}</span>
                            </div>
                            <p className="text-sm text-gray-400">
                              {trade.shares} shares @ ${trade.entryPrice}
                              {trade.status === 'closed' && ` → $${trade.exitPrice}`}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          {trade.status === 'closed' && pl !== null ? (
                            <>
                              <p className={`text-xl font-bold ${pl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {pl >= 0 ? '+' : ''}${pl.toFixed(0)}
                              </p>
                              <p className={`text-sm ${(r || 0) >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                                {r?.toFixed(2)}R
                              </p>
                            </>
                          ) : (
                            <span className="px-2 py-1 bg-blue-900/50 text-blue-400 text-sm rounded">Open</span>
                          )}
                        </div>
                      </div>
                      
                      {trade.notes && (
                        <p className="mt-3 text-sm text-gray-400 border-t border-gray-700 pt-3">
                          {trade.notes}
                        </p>
                      )}
                      
                      <div className="mt-3 flex justify-end">
                        <button
                          onClick={() => deleteTrade(trade.id)}
                          className="p-2 text-gray-500 hover:text-red-400 transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  )
                })
              )}
            </div>
          </div>
        )}

        {activeTab === 'stats' && (
          <div className="space-y-6">
            {/* Setup Performance */}
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Target className="w-5 h-5 text-primary-400" />
                Setup Performance
              </h2>
              
              <div className="space-y-4">
                {setupStats.map(stat => (
                  <div key={stat.id} className="flex items-center justify-between p-4 bg-gray-700 rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className={`w-3 h-3 rounded-full ${stat.color}`} />
                      <div>
                        <p className="font-medium">{stat.name}</p>
                        <p className="text-sm text-gray-400">{stat.count} trades</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className={`font-semibold ${stat.winRate >= 50 ? 'text-green-400' : 'text-yellow-400'}`}>
                        {stat.winRate.toFixed(0)}% win
                      </p>
                      <p className={`text-sm ${stat.totalPL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                        ${stat.totalPL.toFixed(0)}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Star Rating Performance */}
            <div className="bg-gray-800 rounded-xl border border-gray-700 p-6">
              <h2 className="text-lg font-semibold mb-4 flex items-center gap-2">
                <Percent className="w-5 h-5 text-yellow-400" />
                Star Rating Performance
              </h2>
              
              <div className="space-y-3">
                {STAR_RATINGS.map(stars => {
                  const starTrades = closedTrades.filter(t => t.starRating === stars)
                  const wins = starTrades.filter(t => (calculatePL(t) || 0) > 0).length
                  const winRate = starTrades.length > 0 ? (wins / starTrades.length) * 100 : 0
                  const totalPL = starTrades.reduce((sum, t) => sum + (calculatePL(t) || 0), 0)
                  
                  return (
                    <div key={stars} className="flex items-center justify-between p-3 bg-gray-700 rounded-lg">
                      <div className="flex items-center gap-2">
                        <span className="text-yellow-400">{'★'.repeat(stars)}</span>
                        <span className="text-gray-400">({starTrades.length})</span>
                      </div>
                      <div className="text-right">
                        <p className={`font-semibold ${winRate >= 50 ? 'text-green-400' : 'text-yellow-400'}`}>
                          {winRate.toFixed(0)}%
                        </p>
                        <p className={`text-sm ${totalPL >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                          ${totalPL.toFixed(0)}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Add Trade Modal */}
      {showAddModal && (
        <AddTradeModal 
          onClose={() => setShowAddModal(false)}
          onAdd={addTrade}
        />
      )}
    </div>
  )
}

// Add Trade Modal Component
function AddTradeModal({ onClose, onAdd }: { onClose: () => void, onAdd: (trade: any) => void }) {
  const [formData, setFormData] = useState({
    ticker: '',
    setupType: 'breakout',
    starRating: 4,
    entryPrice: '',
    exitPrice: '',
    stopPrice: '',
    shares: '',
    entryDate: new Date().toISOString().split('T')[0],
    exitDate: '',
    notes: '',
    status: 'open' as 'open' | 'closed',
  })

  const handleSubmit = () => {
    onAdd({
      ...formData,
      entryPrice: Number(formData.entryPrice),
      exitPrice: formData.exitPrice ? Number(formData.exitPrice) : 0,
      stopPrice: Number(formData.stopPrice),
      shares: Number(formData.shares),
    })
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
      <div className="bg-gray-800 rounded-xl border border-gray-700 p-6 w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <h3 className="text-xl font-bold mb-4">Log New Trade</h3>
        
        <div className="space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Ticker</label>
            <input
              type="text"
              value={formData.ticker}
              onChange={(e) => setFormData({ ...formData, ticker: e.target.value.toUpperCase() })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-primary-500 focus:outline-none"
              placeholder="NVDA"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Setup Type</label>
            <select
              value={formData.setupType}
              onChange={(e) => setFormData({ ...formData, setupType: e.target.value })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-primary-500 focus:outline-none"
            >
              {SETUP_TYPES.map(s => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Star Rating</label>
            <div className="flex gap-2">
              {STAR_RATINGS.map(stars => (
                <button
                  key={stars}
                  onClick={() => setFormData({ ...formData, starRating: stars })}
                  className={`px-3 py-2 rounded-lg border transition-colors ${
                    formData.starRating === stars
                      ? 'bg-primary-600 border-primary-500'
                      : 'bg-gray-700 border-gray-600 hover:bg-gray-600'
                  }`}
                >
                  {'★'.repeat(stars)}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Entry Price</label>
              <input
                type="number"
                step="0.01"
                value={formData.entryPrice}
                onChange={(e) => setFormData({ ...formData, entryPrice: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-primary-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Stop Price</label>
              <input
                type="number"
                step="0.01"
                value={formData.stopPrice}
                onChange={(e) => setFormData({ ...formData, stopPrice: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-primary-500 focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Exit Price</label>
              <input
                type="number"
                step="0.01"
                value={formData.exitPrice}
                onChange={(e) => setFormData({ ...formData, exitPrice: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-primary-500 focus:outline-none"
                placeholder="Leave blank if open"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Shares</label>
              <input
                type="number"
                value={formData.shares}
                onChange={(e) => setFormData({ ...formData, shares: e.target.value })}
                className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-primary-500 focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Entry Date</label>
            <input
              type="date"
              value={formData.entryDate}
              onChange={(e) => setFormData({ ...formData, entryDate: e.target.value })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-primary-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Exit Date</label>
            <input
              type="date"
              value={formData.exitDate}
              onChange={(e) => setFormData({ ...formData, exitDate: e.target.value, status: e.target.value ? 'closed' : 'open' })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-primary-500 focus:outline-none"
              placeholder="Leave blank if open"
            />
          </div>

          <div>
            <label className="block text-sm text-gray-400 mb-1">Notes</label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 bg-gray-700 border border-gray-600 rounded-lg text-white focus:border-primary-500 focus:outline-none"
              rows={3}
              placeholder="What worked? What didn't?"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3 mt-6">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={!formData.ticker || !formData.entryPrice || !formData.stopPrice || !formData.shares}
            className="px-4 py-2 bg-primary-600 hover:bg-primary-500 disabled:bg-gray-700 disabled:cursor-not-allowed rounded-lg font-medium transition-colors"
          >
            Log Trade
          </button>
        </div>
      </div>
    </div>
  )
}

export default App
