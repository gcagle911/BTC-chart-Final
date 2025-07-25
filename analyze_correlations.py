#!/usr/bin/env python3
import json
import pandas as pd
import numpy as np
from datetime import datetime, timedelta
import os

def load_and_clean_data():
    """Load and clean the JSON data"""
    data_files = ['recent_data.json', 'historical_data.json']
    all_data = []
    
    for file in data_files:
        if os.path.exists(file):
            try:
                with open(file, 'r') as f:
                    data = json.load(f)
                    if isinstance(data, list):
                        all_data.extend(data)
                    else:
                        print(f"Unexpected data format in {file}")
            except Exception as e:
                print(f"Error loading {file}: {e}")
    
    if not all_data:
        print("No data loaded")
        return None
    
    # Convert to DataFrame
    df = pd.DataFrame(all_data)
    
    # Clean and convert data types
    df['time'] = pd.to_datetime(df['time'])
    df['price'] = pd.to_numeric(df['price'], errors='coerce')
    df['spread_avg_L20_pct'] = pd.to_numeric(df['spread_avg_L20_pct'], errors='coerce')
    df['ma_50'] = pd.to_numeric(df['ma_50'], errors='coerce')
    df['ma_100'] = pd.to_numeric(df['ma_100'], errors='coerce')
    df['ma_200'] = pd.to_numeric(df['ma_200'], errors='coerce')
    
    # Remove duplicates and sort by time
    df = df.drop_duplicates(subset=['time']).sort_values('time').reset_index(drop=True)
    
    # Remove rows with missing critical data
    df = df.dropna(subset=['price', 'spread_avg_L20_pct'])
    
    print(f"Loaded {len(df)} data points from {df['time'].min()} to {df['time'].max()}")
    print(f"Price range: ${df['price'].min():.2f} - ${df['price'].max():.2f}")
    print(f"Spread range: {df['spread_avg_L20_pct'].min():.4f} - {df['spread_avg_L20_pct'].max():.4f}")
    
    return df

def calculate_price_movements(df):
    """Calculate various price movement metrics"""
    # Price changes over different timeframes
    df['price_change_1m'] = df['price'].pct_change(1)
    df['price_change_5m'] = df['price'].pct_change(5)
    df['price_change_15m'] = df['price'].pct_change(15)
    df['price_change_30m'] = df['price'].pct_change(30)
    df['price_change_60m'] = df['price'].pct_change(60)
    
    # Price volatility (rolling standard deviation)
    df['volatility_10m'] = df['price'].rolling(10).std()
    df['volatility_30m'] = df['price'].rolling(30).std()
    df['volatility_60m'] = df['price'].rolling(60).std()
    
    # Absolute price movements
    df['abs_price_change_1m'] = abs(df['price_change_1m'])
    df['abs_price_change_5m'] = abs(df['price_change_5m'])
    df['abs_price_change_15m'] = abs(df['price_change_15m'])
    
    # Future price movements (for predictive analysis)
    df['future_price_change_5m'] = df['price_change_5m'].shift(-5)
    df['future_price_change_15m'] = df['price_change_15m'].shift(-15)
    df['future_price_change_30m'] = df['price_change_30m'].shift(-30)
    
    # Big moves (>0.5% in 5 minutes)
    df['big_move_5m'] = abs(df['price_change_5m']) > 0.005
    df['future_big_move_5m'] = df['big_move_5m'].shift(-5)
    df['future_big_move_15m'] = abs(df['future_price_change_15m']) > 0.01
    
    return df

def calculate_spread_features(df):
    """Calculate spread-based features"""
    # Spread changes and velocity
    df['spread_change_1m'] = df['spread_avg_L20_pct'].diff()
    df['spread_change_5m'] = df['spread_avg_L20_pct'].diff(5)
    df['spread_velocity'] = df['spread_avg_L20_pct'].diff() / df['time'].diff().dt.total_seconds() * 60
    
    # Spread relative to moving averages
    df['spread_vs_ma50'] = df['spread_avg_L20_pct'] - df['ma_50']
    df['spread_vs_ma100'] = df['spread_avg_L20_pct'] - df['ma_100']
    df['spread_vs_ma200'] = df['spread_avg_L20_pct'] - df['ma_200']
    
    # Spread percentiles (rolling)
    df['spread_percentile_100'] = df['spread_avg_L20_pct'].rolling(100).rank(pct=True)
    df['spread_percentile_500'] = df['spread_avg_L20_pct'].rolling(500).rank(pct=True)
    
    # Spread acceleration (second derivative)
    df['spread_acceleration'] = df['spread_velocity'].diff()
    
    # High/low spread conditions
    df['high_spread'] = df['spread_avg_L20_pct'] > df['spread_avg_L20_pct'].quantile(0.8)
    df['low_spread'] = df['spread_avg_L20_pct'] < df['spread_avg_L20_pct'].quantile(0.2)
    
    # Spread expanding/contracting
    df['spread_expanding'] = df['spread_change_5m'] > 0.001
    df['spread_contracting'] = df['spread_change_5m'] < -0.001
    
    return df

def analyze_correlations(df):
    """Find the strongest correlations"""
    print("\n" + "="*60)
    print("CORRELATION ANALYSIS RESULTS")
    print("="*60)
    
    # Define price movement targets
    price_targets = [
        'price_change_1m', 'price_change_5m', 'price_change_15m', 'price_change_30m',
        'abs_price_change_1m', 'abs_price_change_5m', 'abs_price_change_15m',
        'volatility_10m', 'volatility_30m', 'volatility_60m',
        'future_price_change_5m', 'future_price_change_15m', 'future_price_change_30m'
    ]
    
    # Define spread features
    spread_features = [
        'spread_avg_L20_pct', 'spread_change_1m', 'spread_change_5m', 'spread_velocity',
        'spread_vs_ma50', 'spread_vs_ma100', 'spread_vs_ma200',
        'spread_percentile_100', 'spread_percentile_500', 'spread_acceleration'
    ]
    
    correlations = []
    
    for target in price_targets:
        if target in df.columns:
            for feature in spread_features:
                if feature in df.columns:
                    # Remove NaN values for correlation calculation
                    temp_df = df[[target, feature]].dropna()
                    if len(temp_df) > 100:  # Need enough data points
                        corr = temp_df[target].corr(temp_df[feature])
                        if not np.isnan(corr):
                            correlations.append({
                                'target': target,
                                'feature': feature,
                                'correlation': corr,
                                'abs_correlation': abs(corr),
                                'data_points': len(temp_df)
                            })
    
    # Sort by absolute correlation strength
    correlations = sorted(correlations, key=lambda x: x['abs_correlation'], reverse=True)
    
    print(f"\nTOP 10 STRONGEST CORRELATIONS:")
    print("-" * 80)
    for i, corr in enumerate(correlations[:10]):
        direction = "📈 POSITIVE" if corr['correlation'] > 0 else "📉 NEGATIVE"
        print(f"{i+1:2d}. {corr['feature']:20s} → {corr['target']:20s}")
        print(f"    Correlation: {corr['correlation']:+.4f} ({direction})")
        print(f"    Data points: {corr['data_points']:,}")
        print()
    
    return correlations

def analyze_predictive_power(df):
    """Analyze predictive relationships"""
    print("\n" + "="*60)
    print("PREDICTIVE ANALYSIS")
    print("="*60)
    
    # Look at spread conditions that predict future moves
    future_targets = ['future_big_move_5m', 'future_big_move_15m']
    
    for target in future_targets:
        if target in df.columns:
            print(f"\nPREDICTING {target}:")
            print("-" * 40)
            
            # High spread predicting future moves
            if 'high_spread' in df.columns:
                high_spread_data = df[df['high_spread'] == True]
                if len(high_spread_data) > 50:
                    prob = high_spread_data[target].mean()
                    baseline = df[target].mean()
                    lift = prob / baseline if baseline > 0 else 0
                    print(f"High Spread → Future Big Move: {prob:.3f} (baseline: {baseline:.3f}, lift: {lift:.2f}x)")
            
            # Spread expanding predicting future moves
            if 'spread_expanding' in df.columns:
                expanding_data = df[df['spread_expanding'] == True]
                if len(expanding_data) > 50:
                    prob = expanding_data[target].mean()
                    baseline = df[target].mean()
                    lift = prob / baseline if baseline > 0 else 0
                    print(f"Spread Expanding → Future Big Move: {prob:.3f} (baseline: {baseline:.3f}, lift: {lift:.2f}x)")
            
            # Spread velocity predicting future moves
            if 'spread_velocity' in df.columns:
                high_velocity = df[abs(df['spread_velocity']) > df['spread_velocity'].quantile(0.9)]
                if len(high_velocity) > 50:
                    prob = high_velocity[target].mean()
                    baseline = df[target].mean()
                    lift = prob / baseline if baseline > 0 else 0
                    print(f"High Spread Velocity → Future Big Move: {prob:.3f} (baseline: {baseline:.3f}, lift: {lift:.2f}x)")

def main():
    print("ANALYZING BTC SPREAD vs PRICE MOVEMENT CORRELATIONS")
    print("=" * 60)
    
    # Load data
    df = load_and_clean_data()
    if df is None:
        return
    
    # Calculate features
    print("\nCalculating price movement features...")
    df = calculate_price_movements(df)
    
    print("Calculating spread features...")
    df = calculate_spread_features(df)
    
    # Analyze correlations
    correlations = analyze_correlations(df)
    
    # Analyze predictive power
    analyze_predictive_power(df)
    
    print("\n" + "="*60)
    print("KEY INSIGHTS:")
    print("="*60)
    
    if correlations:
        top_corr = correlations[0]
        print(f"🏆 STRONGEST CORRELATION:")
        print(f"   {top_corr['feature']} → {top_corr['target']}")
        print(f"   Correlation: {top_corr['correlation']:+.4f}")
        
        print(f"\n📊 SPREAD DATA SUMMARY:")
        print(f"   Current spread range: {df['spread_avg_L20_pct'].min():.4f} - {df['spread_avg_L20_pct'].max():.4f}")
        print(f"   Average spread: {df['spread_avg_L20_pct'].mean():.4f}")
        print(f"   Spread std dev: {df['spread_avg_L20_pct'].std():.4f}")

if __name__ == "__main__":
    main()