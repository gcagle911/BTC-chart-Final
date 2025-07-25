#!/usr/bin/env python3
import json
import math
from collections import defaultdict

def load_data():
    """Load and clean all data"""
    all_data = []
    
    # Load both files
    for filename in ['recent_data.json', 'historical_data.json']:
        try:
            with open(filename, 'r') as f:
                data = json.load(f)
                all_data.extend(data)
        except Exception as e:
            print(f"Error loading {filename}: {e}")
    
    # Clean data
    clean_data = []
    seen_times = set()
    
    for item in all_data:
        if (item.get('time') and item.get('price') is not None and 
            item.get('spread_avg_L20_pct') is not None and 
            item['time'] not in seen_times):
            
            try:
                clean_item = {
                    'time': item['time'],
                    'price': float(item['price']),
                    'spread': float(item['spread_avg_L20_pct']),
                }
                
                # Add all MA data if available
                if item.get('ma_50') is not None:
                    clean_item['ma_50'] = float(item['ma_50'])
                if item.get('ma_100') is not None:
                    clean_item['ma_100'] = float(item['ma_100'])
                if item.get('ma_200') is not None:
                    clean_item['ma_200'] = float(item['ma_200'])
                
                clean_data.append(clean_item)
                seen_times.add(item['time'])
            except (ValueError, TypeError):
                continue
    
    # Sort by time
    clean_data.sort(key=lambda x: x['time'])
    
    print(f"Loaded {len(clean_data)} clean data points")
    print(f"Time range: {clean_data[0]['time']} to {clean_data[-1]['time']}")
    
    return clean_data

def calculate_all_features(data):
    """Calculate EVERYTHING - price moves, MA relationships, volatility, etc."""
    
    for i in range(len(data)):
        # Basic price changes (multiple timeframes)
        for periods in [1, 2, 3, 5, 10, 15, 30, 60]:
            if i >= periods:
                price_change = (data[i]['price'] - data[i-periods]['price']) / data[i-periods]['price']
                data[i][f'price_change_{periods}m'] = price_change
                data[i][f'abs_price_change_{periods}m'] = abs(price_change)
        
        # Future price changes (predictive)
        for periods in [1, 2, 3, 5, 10, 15, 30]:
            if i < len(data) - periods:
                if f'price_change_{periods}m' in data[i+periods]:
                    data[i][f'future_price_change_{periods}m'] = data[i+periods][f'price_change_{periods}m']
                    data[i][f'future_abs_price_change_{periods}m'] = data[i+periods][f'abs_price_change_{periods}m']
        
        # Spread features
        for periods in [1, 2, 3, 5, 10, 15, 30]:
            if i >= periods:
                data[i][f'spread_change_{periods}m'] = data[i]['spread'] - data[i-periods]['spread']
        
        # Moving Average relationships
        if 'ma_50' in data[i] and 'ma_100' in data[i] and 'ma_200' in data[i]:
            # MA crossovers and relationships
            data[i]['ma50_vs_ma100'] = data[i]['ma_50'] - data[i]['ma_100']
            data[i]['ma50_vs_ma200'] = data[i]['ma_50'] - data[i]['ma_200']
            data[i]['ma100_vs_ma200'] = data[i]['ma_100'] - data[i]['ma_200']
            
            # Price vs MA relationships
            data[i]['price_vs_ma50'] = data[i]['price'] - data[i]['ma_50']
            data[i]['price_vs_ma100'] = data[i]['price'] - data[i]['ma_100']
            data[i]['price_vs_ma200'] = data[i]['price'] - data[i]['ma_200']
            
            # Spread vs MA relationships
            data[i]['spread_vs_ma50'] = data[i]['spread'] - data[i]['ma_50']
            data[i]['spread_vs_ma100'] = data[i]['spread'] - data[i]['ma_100']
            data[i]['spread_vs_ma200'] = data[i]['spread'] - data[i]['ma_200']
        
        # MA changes over time
        for periods in [1, 5, 10, 15, 30]:
            if i >= periods:
                for ma in ['ma_50', 'ma_100', 'ma_200']:
                    if ma in data[i] and ma in data[i-periods]:
                        data[i][f'{ma}_change_{periods}m'] = data[i][ma] - data[i-periods][ma]
        
        # Price volatility (rolling standard deviation approximation)
        for window in [5, 10, 15, 30, 60]:
            if i >= window:
                prices = [data[j]['price'] for j in range(i-window+1, i+1)]
                mean_price = sum(prices) / len(prices)
                variance = sum((p - mean_price)**2 for p in prices) / len(prices)
                data[i][f'price_volatility_{window}m'] = math.sqrt(variance)
        
        # Spread volatility
        for window in [5, 10, 15, 30]:
            if i >= window:
                spreads = [data[j]['spread'] for j in range(i-window+1, i+1)]
                mean_spread = sum(spreads) / len(spreads)
                variance = sum((s - mean_spread)**2 for s in spreads) / len(spreads)
                data[i][f'spread_volatility_{window}m'] = math.sqrt(variance)
        
        # Price momentum
        for short, long in [(5, 15), (10, 30), (15, 60)]:
            if i >= long:
                short_avg = sum(data[j]['price'] for j in range(i-short+1, i+1)) / short
                long_avg = sum(data[j]['price'] for j in range(i-long+1, i+1)) / long
                data[i][f'price_momentum_{short}_{long}'] = (short_avg - long_avg) / long_avg
        
        # MA momentum (MA slope)
        for periods in [5, 10, 15]:
            if i >= periods:
                for ma in ['ma_50', 'ma_100', 'ma_200']:
                    if ma in data[i] and ma in data[i-periods]:
                        slope = (data[i][ma] - data[i-periods][ma]) / periods
                        data[i][f'{ma}_slope_{periods}m'] = slope
        
        # Price stability (low volatility periods)
        for window in [10, 15, 30]:
            if f'price_volatility_{window}m' in data[i]:
                # Get volatility percentile
                recent_vols = []
                for j in range(max(0, i-100), i+1):
                    if f'price_volatility_{window}m' in data[j]:
                        recent_vols.append(data[j][f'price_volatility_{window}m'])
                
                if len(recent_vols) > 50:
                    recent_vols.sort()
                    current_vol = data[i][f'price_volatility_{window}m']
                    percentile = sum(1 for v in recent_vols if v <= current_vol) / len(recent_vols)
                    data[i][f'price_stability_{window}m'] = 1 - percentile  # High = stable
        
        # Regime detection (trending vs ranging)
        if i >= 30:
            price_changes = [abs(data[j].get('price_change_1m', 0)) for j in range(i-29, i+1)]
            avg_change = sum(price_changes) / 30
            data[i]['trending_regime'] = avg_change
    
    return data

def correlation(x_values, y_values):
    """Calculate correlation coefficient"""
    if len(x_values) != len(y_values) or len(x_values) < 2:
        return None
    
    n = len(x_values)
    sum_x = sum(x_values)
    sum_y = sum(y_values)
    sum_xy = sum(x_values[i] * y_values[i] for i in range(n))
    sum_x2 = sum(x * x for x in x_values)
    sum_y2 = sum(y * y for y in y_values)
    
    denominator = math.sqrt((n * sum_x2 - sum_x * sum_x) * (n * sum_y2 - sum_y * sum_y))
    if denominator == 0:
        return None
    
    return (n * sum_xy - sum_x * sum_y) / denominator

def analyze_all_correlations(data):
    """Find ALL possible correlations"""
    print("\n" + "="*80)
    print("COMPREHENSIVE CORRELATION ANALYSIS")
    print("="*80)
    
    # Get all possible features
    all_features = set()
    for item in data:
        all_features.update(item.keys())
    
    # Remove non-numeric keys
    exclude = {'time'}
    all_features = [f for f in all_features if f not in exclude]
    
    print(f"Analyzing {len(all_features)} features...")
    
    # Define targets (what we want to predict)
    targets = [f for f in all_features if 'future_' in f or 'price_change_' in f or 'volatility' in f]
    
    # Define predictors (everything else)
    predictors = [f for f in all_features if f not in targets]
    
    correlations = []
    
    # Calculate all correlations
    for target in targets:
        for predictor in predictors:
            pairs = []
            for item in data:
                if target in item and predictor in item and item[target] is not None and item[predictor] is not None:
                    pairs.append((item[predictor], item[target]))
            
            if len(pairs) > 100:  # Need enough data
                x_vals = [p[0] for p in pairs]
                y_vals = [p[1] for p in pairs]
                corr = correlation(x_vals, y_vals)
                
                if corr is not None and abs(corr) > 0.01:  # Filter very weak correlations
                    correlations.append({
                        'predictor': predictor,
                        'target': target,
                        'correlation': corr,
                        'abs_correlation': abs(corr),
                        'sample_size': len(pairs)
                    })
    
    # Sort by absolute correlation
    correlations.sort(key=lambda x: x['abs_correlation'], reverse=True)
    
    return correlations

def print_top_correlations(correlations, n=25):
    """Print top N correlations with better formatting"""
    print(f"\n🏆 TOP {n} STRONGEST CORRELATIONS:")
    print("-" * 120)
    print(f"{'RANK':<4} {'PREDICTOR':<35} {'→ TARGET':<35} {'CORRELATION':<12} {'SAMPLES':<10}")
    print("-" * 120)
    
    for i, corr in enumerate(correlations[:n]):
        direction = "📈" if corr['correlation'] > 0 else "📉"
        print(f"{i+1:<4} {corr['predictor']:<35} → {corr['target']:<35} {corr['correlation']:+8.4f} {direction} {corr['sample_size']:<10,}")

def analyze_ma_specific_patterns(data):
    """Analyze specific MA patterns you mentioned"""
    print("\n" + "="*80)
    print("MOVING AVERAGE SPECIFIC ANALYSIS")
    print("="*80)
    
    # MA convergence/divergence patterns
    ma_patterns = []
    
    # Look for MA50 vs MA100 changes predicting price moves
    pairs = []
    for item in data:
        if ('ma50_vs_ma100' in item and 'future_price_change_15m' in item and 
            item['ma50_vs_ma100'] is not None and item['future_price_change_15m'] is not None):
            pairs.append((item['ma50_vs_ma100'], item['future_price_change_15m']))
    
    if len(pairs) > 100:
        x_vals = [p[0] for p in pairs]
        y_vals = [p[1] for p in pairs]
        corr = correlation(x_vals, y_vals)
        if corr:
            ma_patterns.append(f"MA50 vs MA100 spread → Future 15m price change: {corr:+.4f}")
    
    # MA200 acting as support/resistance
    pairs = []
    for item in data:
        if ('price_vs_ma200' in item and 'future_price_change_30m' in item and 
            item['price_vs_ma200'] is not None and item['future_price_change_30m'] is not None):
            pairs.append((item['price_vs_ma200'], item['future_price_change_30m']))
    
    if len(pairs) > 100:
        x_vals = [p[0] for p in pairs]
        y_vals = [p[1] for p in pairs]
        corr = correlation(x_vals, y_vals)
        if corr:
            ma_patterns.append(f"Price distance from MA200 → Future 30m price change: {corr:+.4f}")
    
    # MA slope changes
    for ma in ['ma_50', 'ma_100', 'ma_200']:
        for slope_period in [5, 10, 15]:
            slope_key = f'{ma}_slope_{slope_period}m'
            pairs = []
            for item in data:
                if (slope_key in item and 'future_price_change_15m' in item and 
                    item[slope_key] is not None and item['future_price_change_15m'] is not None):
                    pairs.append((item[slope_key], item['future_price_change_15m']))
            
            if len(pairs) > 100:
                x_vals = [p[0] for p in pairs]
                y_vals = [p[1] for p in pairs]
                corr = correlation(x_vals, y_vals)
                if corr and abs(corr) > 0.05:
                    ma_patterns.append(f"{ma} slope ({slope_period}m) → Future 15m price change: {corr:+.4f}")
    
    print("\n📈 MA-SPECIFIC PATTERNS:")
    for pattern in sorted(ma_patterns, key=lambda x: abs(float(x.split(':')[1])), reverse=True):
        print(f"  {pattern}")

def main():
    print("COMPREHENSIVE DEEP ANALYSIS - ALL CORRELATIONS")
    print("=" * 80)
    
    # Load data
    data = load_data()
    if not data:
        return
    
    # Calculate all features
    print("\nCalculating ALL possible features...")
    data = calculate_all_features(data)
    
    # Analyze all correlations
    correlations = analyze_all_correlations(data)
    
    # Print results
    print_top_correlations(correlations, 30)
    
    # MA-specific analysis
    analyze_ma_specific_patterns(data)
    
    # Summary of highest correlations by category
    print("\n" + "="*80)
    print("🎯 HIGHEST CORRELATIONS BY CATEGORY:")
    print("="*80)
    
    categories = {
        'Spread Predictions': [c for c in correlations if 'spread' in c['predictor'] and 'future' in c['target']],
        'MA Predictions': [c for c in correlations if 'ma_' in c['predictor'] and 'future' in c['target']],
        'Price Momentum': [c for c in correlations if 'momentum' in c['predictor']],
        'Volatility Predictions': [c for c in correlations if 'volatility' in c['target']],
        'Immediate Reactions': [c for c in correlations if 'future' not in c['target'] and 'price_change' in c['target']],
    }
    
    for category, cat_corrs in categories.items():
        if cat_corrs:
            top = cat_corrs[0]
            print(f"\n{category}:")
            print(f"  🏆 {top['predictor']} → {top['target']}")
            print(f"     Correlation: {top['correlation']:+.4f} ({top['sample_size']:,} samples)")

if __name__ == "__main__":
    main()