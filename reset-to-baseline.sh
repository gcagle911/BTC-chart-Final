#!/bin/bash

echo "🛡️  BASELINE RESET OPTIONS"
echo "=========================="
echo "1. Reset current branch to baseline (DESTRUCTIVE)"
echo "2. Create new branch from baseline" 
echo "3. Just checkout baseline (safe)"
echo "4. Show current status vs baseline"
echo ""
read -p "Choose option (1-4): " choice

case $choice in
    1)
        echo "⚠️  This will DESTROY any uncommitted changes!"
        read -p "Are you sure? (yes/no): " confirm
        if [ "$confirm" = "yes" ]; then
            git reset --hard v1.0-baseline
            echo "✅ Reset to baseline complete"
        else
            echo "❌ Reset cancelled"
        fi
        ;;
    2)
        read -p "Enter new branch name: " branch_name
        git checkout -b "$branch_name" v1.0-baseline
        echo "✅ Created branch '$branch_name' from baseline"
        ;;
    3)
        git checkout v1.0-baseline
        echo "✅ Checked out baseline (detached HEAD)"
        ;;
    4)
        echo "Current commit: $(git rev-parse HEAD)"
        echo "Baseline commit: $(git rev-parse v1.0-baseline)"
        if [ "$(git rev-parse HEAD)" = "$(git rev-parse v1.0-baseline)" ]; then
            echo "✅ You are AT the baseline"
        else
            echo "⚠️  You are NOT at the baseline"
            echo "Commits ahead of baseline: $(git rev-list --count v1.0-baseline..HEAD)"
        fi
        ;;
    *)
        echo "Invalid option"
        ;;
esac