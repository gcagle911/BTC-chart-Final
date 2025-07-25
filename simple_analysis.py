#!/usr/bin/env python3
import json
import math
from collections import defaultdict
from datetime import datetime

def load_data():
    """Load and combine data from both files"""
    all_data = []
    
    # Load recent data
    try:
        with open('recent_data.json', 'r') as f:
            recent = json.load(f)
            all_data.extend(recent)
    except Exception as e:
        print(f"Error loading recent data: {e}")
    
    # Load historical data  
    try:
        with open('historical_data.json', 'r') as f:
            historical = json.load(f)
            all_data.extend(historical)
    except Exception as e:
        print(f"Error loading historical data: {e}")
    
    # Clean and sort data
    clean_data = []
    seen_times = set()
    
    for item in all_data:
        if (item.get('time') and item.get('price') is not None and 
            item.get('spread_avg_L20_pct') is not None and 
            item['time'] not in seen_times):
            
            try:
                clean_data.append({
                    'time': item['time'],
                    'price': float(item['price']),
                    'spread': float(item['spread_avg_L20_pct']),
                    'ma_50': float(item.get('ma_50', 0)) if item.get('ma_50') else None,
                    'ma_100': float(item.get('ma_100', 0)) if item.get('ma_100') else None,
                    'ma_200': float(item.get('ma_200', 0)) if item.get('ma_200') else None,
                })
                seen_times.add(item['time'])
            except (ValueError, TypeError):
                continue
    
    # Sort by time
    clean_data.sort(key=lambda x: x['time'])
    
    print(f"Loaded {len(clean_data)} clean data points")
    if clean_data:
        print(f"Time range: {clean_data[0]['time']} to {clean_data[-1]['time']}")
        prices = [d['price'] for d in clean_data]
        spreads = [d['spread'] for d in clean_data]
        print(f"Price range: ${min(prices):.2f} - ${max(prices):.2f}")
        print(f"Spread range: {min(spreads):.4f} - {max(spreads):.4f}")
    
    return clean_data

def calculate_price_changes(data):
    """Calculate price changes over different timeframes"""
    for i in range(len(data)):
        # 5-minute changes (5 periods)
        if i >= 5:
            price_change_5m = (data[i]['price'] - data[i-5]['price']) / data[i-5]['price']
            data[i]['price_change_5m'] = price_change_5m
            data[i]['abs_price_change_5m'] = abs(price_change_5m)
        
        # 15-minute changes (15 periods)
        if i >= 15:
            price_change_15m = (data[i]['price'] - data[i-15]['price']) / data[i-15]['price']
            data[i]['price_change_15m'] = price_change_15m
            data[i]['abs_price_change_15m'] = abs(price_change_15m)
        
        # 30-minute changes (30 periods)
        if i >= 30:
            price_change_30m = (data[i]['price'] - data[i-30]['price']) / data[i-30]['price']
            data[i]['price_change_30m'] = price_change_30m
        
        # 1-minute change
        if i >= 1:
            price_change_1m = (data[i]['price'] - data[i-1]['price']) / data[i-1]['price']
            data[i]['price_change_1m'] = price_change_1m
            data[i]['abs_price_change_1m'] = abs(price_change_1m)
    
    # Calculate future changes (for prediction analysis)
    for i in range(len(data) - 30):
        if 'price_change_5m' in data[i+5]:
            data[i]['future_price_change_5m'] = data[i+5]['price_change_5m']
        if 'price_change_15m' in data[i+15]:
            data[i]['future_price_change_15m'] = data[i+15]['price_change_15m']
    
    return data

def calculate_spread_features(data):
    """Calculate spread-based features"""
    for i in range(len(data)):
        # Spread changes
        if i >= 1:
            data[i]['spread_change_1m'] = data[i]['spread'] - data[i-1]['spread']
        if i >= 5:
            data[i]['spread_change_5m'] = data[i]['spread'] - data[i-5]['spread']
        
        # Spread velocity (change per minute)
        if i >= 1:
            data[i]['spread_velocity'] = data[i]['spread'] - data[i-1]['spread']
        
        # Spread vs MAs
        if data[i]['ma_50']:
            data[i]['spread_vs_ma50'] = data[i]['spread'] - data[i]['ma_50']
        if data[i]['ma_100']:
            data[i]['spread_vs_ma100'] = data[i]['spread'] - data[i]['ma_100']
        if data[i]['ma_200']:
            data[i]['spread_vs_ma200'] = data[i]['spread'] - data[i]['ma_200']
    
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

def analyze_correlations(data):
    """Find correlations between spread features and price movements"""
    print("\n" + "="*70)
    print("CORRELATION ANALYSIS: SPREAD vs PRICE MOVEMENTS")
    print("="*70)
    
    # Define what we want to predict
    targets = [
        'price_change_1m', 'price_change_5m', 'price_change_15m', 'price_change_30m',
        'abs_price_change_1m', 'abs_price_change_5m', 'abs_price_change_15m',
        'future_price_change_5m', 'future_price_change_15m'
    ]
    
    # Define spread features to test
    features = [
        'spread', 'spread_change_1m', 'spread_change_5m', 'spread_velocity',
        'spread_vs_ma50', 'spread_vs_ma100', 'spread_vs_ma200'
    ]
    
    correlations = []
    
    for target in targets:
        for feature in features:
            # Get values where both exist
            pairs = []
            for item in data:
                if target in item and feature in item and item[target] is not None and item[feature] is not None:
                    pairs.append((item[feature], item[target]))
            
            if len(pairs) > 100:  # Need enough data
                x_vals = [p[0] for p in pairs]
                y_vals = [p[1] for p in pairs]
                corr = correlation(x_vals, y_vals)
                
                if corr is not None:
                    correlations.append({
                        'feature': feature,
                        'target': target,
                        'correlation': corr,
                        'abs_correlation': abs(corr),
                        'sample_size': len(pairs)
                    })
    
    # Sort by absolute correlation
    correlations.sort(key=lambda x: x['abs_correlation'], reverse=True)
    
    print(f"\nTOP 15 STRONGEST CORRELATIONS:")
    print("-" * 90)
    print(f"{'RANK':<4} {'SPREAD FEATURE':<20} {'PRICE TARGET':<20} {'CORRELATION':<12} {'SAMPLES':<8}")
    print("-" * 90)
    
    for i, corr in enumerate(correlations[:15]):
        direction = "📈" if corr['correlation'] > 0 else "📉"
        print(f"{i+1:<4} {corr['feature']:<20} {corr['target']:<20} {corr['correlation']:+8.4f} {direction:<4} {corr['sample_size']:<8,}")
    
    return correlations

def analyze_predictive_patterns(data):
    """Analyze specific predictive patterns"""
    print("\n" + "="*70)
    print("PREDICTIVE PATTERN ANALYSIS")
    print("="*70)
    
    # Calculate spread percentiles
    spreads = [item['spread'] for item in data if 'spread' in item]
    spreads.sort()
    p80 = spreads[int(len(spreads) * 0.8)]
    p20 = spreads[int(len(spreads) * 0.2)]
    
    print(f"\nSpread Thresholds:")
    print(f"  High Spread (>80th percentile): {p80:.4f}")
    print(f"  Low Spread (<20th percentile): {p20:.4f}")
    
    # Analyze high spread situations
    high_spread_future_moves = []
    low_spread_future_moves = []
    normal_spread_future_moves = []
    
    for item in data:
        if 'future_price_change_15m' in item and item['future_price_change_15m'] is not None:
            future_move = abs(item['future_price_change_15m'])
            
            if item['spread'] > p80:
                high_spread_future_moves.append(future_move)
            elif item['spread'] < p20:
                low_spread_future_moves.append(future_move)
            else:
                normal_spread_future_moves.append(future_move)
    
    print(f"\nFUTURE VOLATILITY PREDICTION (15-minute ahead):")
    print("-" * 50)
    
    if high_spread_future_moves:
        avg_high = sum(high_spread_future_moves) / len(high_spread_future_moves)
        print(f"High Spread → Avg Future Move: {avg_high:.4f} ({len(high_spread_future_moves):,} samples)")
    
    if low_spread_future_moves:
        avg_low = sum(low_spread_future_moves) / len(low_spread_future_moves)
        print(f"Low Spread → Avg Future Move:  {avg_low:.4f} ({len(low_spread_future_moves):,} samples)")
    
    if normal_spread_future_moves:
        avg_normal = sum(normal_spread_future_moves) / len(normal_spread_future_moves)
        print(f"Normal Spread → Avg Future Move: {avg_normal:.4f} ({len(normal_spread_future_moves):,} samples)")
    
    # Spread velocity analysis
    velocities = [item.get('spread_velocity', 0) for item in data if 'spread_velocity' in item]
    if velocities:
        velocities.sort()
        v90 = velocities[int(len(velocities) * 0.9)]
        v10 = velocities[int(len(velocities) * 0.1)]
        
        print(f"\nSPREAD VELOCITY ANALYSIS:")
        print("-" * 30)
        print(f"High velocity threshold: {v90:.6f}")
        print(f"Low velocity threshold: {v10:.6f}")
        
        high_vel_moves = []
        for item in data:
            if ('spread_velocity' in item and 'future_price_change_5m' in item and 
                item['future_price_change_5m'] is not None):
                if abs(item['spread_velocity']) > abs(v90):
                    high_vel_moves.append(abs(item['future_price_change_5m']))
        
        if high_vel_moves:
            avg_high_vel = sum(high_vel_moves) / len(high_vel_moves)
            print(f"High Spread Velocity → Avg Future Move: {avg_high_vel:.4f} ({len(high_vel_moves):,} samples)")

def main():
    print("DEEP ANALYSIS: BTC SPREAD vs PRICE MOVEMENT CORRELATIONS")
    print("=" * 70)
    
    # Load data
    data = load_data()
    if not data:
        print("No data to analyze")
        return
    
    # Calculate features
    print("\nCalculating price movements...")
    data = calculate_price_changes(data)
    
    print("Calculating spread features...")
    data = calculate_spread_features(data)
    
    # Analyze correlations
    correlations = analyze_correlations(data)
    
    # Analyze predictive patterns
    analyze_predictive_patterns(data)
    
    # Summary
    print("\n" + "="*70)
    print("🏆 KEY FINDINGS:")
    print("="*70)
    
    if correlations:
        top = correlations[0]
        print(f"STRONGEST CORRELATION:")
        print(f"  {top['feature']} → {top['target']}")
        print(f"  Correlation: {top['correlation']:+.4f}")
        print(f"  Sample size: {top['sample_size']:,} data points")
        
        print(f"\nTOP 3 PREDICTIVE FEATURES:")
        predictive = [c for c in correlations if 'future' in c['target']][:3]
        for i, p in enumerate(predictive):
            print(f"  {i+1}. {p['feature']} → {p['target']} (r={p['correlation']:+.4f})")

if __name__ == "__main__":
    main()