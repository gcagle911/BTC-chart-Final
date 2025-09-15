# Signal System Backup - Pre-Extraction State

**Backup Date**: September 15, 2025  
**Branch**: `backup/pre-signal-extraction-20250915-182537`  
**Commit**: Current HEAD before modular extraction

## Restoration Instructions

To restore the signals system to its current integrated state:

```bash
# Switch to backup branch
git checkout backup/pre-signal-extraction-20250915-182537

# Or create new branch from backup
git checkout -b restore/integrated-signals backup/pre-signal-extraction-20250915-182537

# Or reset current branch to backup state (destructive)
git reset --hard backup/pre-signal-extraction-20250915-182537
```

## Current Implementation State

### Location
All signals logic is embedded within `ChartManager` class in `chart.js`:
- Lines ~1896-1974: Skull signals implementation
- Lines ~2154-2233: Gold X signals implementation  
- Lines ~2645-2795: Signal orchestration and display

### Skull Signals (`💀`)
- **Trigger**: Dual conditions (spread + slope) sustained >70% of candle
- **Cooloff**: 1 hour between signals
- **Thresholds**: Top 15% spread layers (≥2 of 3), Top 5% slope acceleration
- **Display**: Red skull emoji above bars

### Gold X Signals (`✖️`)
- **Trigger**: Price drop ≥1.75% in 2h + All L50 MAs below cumulative average
- **Duration**: Sustained >50% of candle
- **Display**: Gold X emoji below bars

### Key Methods
- `calculateAllSignals()` - Main orchestrator
- `calculateSkullSignals()` - Skull logic
- `calculateGoldXSignals()` - Gold X logic
- `updateSignalDisplay()` - Chart marker rendering
- `triggerSignal()` - Real-time signal activation

### Dependencies
- `this.rawData` - Historical price/spread data
- `this.currentSymbol` - Active trading pair
- `this.currentTimeframe` - Chart timeframe
- `this.skullSignals/goldXSignals` - Signal storage Maps
- `this.signalSystemEnabled` - Master enable flag

## Working Features
- ✅ Real-time signal detection
- ✅ Historical signal backtesting  
- ✅ Timeframe-aware calculations
- ✅ Multi-asset support
- ✅ Visual chart markers
- ✅ Signal lifecycle management
- ✅ Cooloff periods
- ✅ Duration-based validation

## Notes
This backup preserves the fully functional integrated signals system before extraction to modular files. All current functionality is working and tested.